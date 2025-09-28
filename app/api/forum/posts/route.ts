import { NextRequest } from "next/server";
import { getSession } from "@/lib/forum/auth";
import {
  createPost,
  listPosts,
  getUserById,
  getForumIndex,
} from "@/lib/forum/store";
import { ecBatchUpdate } from "@/lib/storage/edgeConfigWrite";
import type { ForumIndex } from "@/lib/forum/types";
import { verifyCsrf } from "@/lib/security/csrf";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const limit = Math.min(50, Math.max(1, Number(sp.get("limit") ?? 20)));
  const offset = Math.max(0, Number(sp.get("offset") ?? 0));
  const posts = await listPosts(limit, offset);
  return Response.json({ posts });
}

export async function POST(req: NextRequest) {
  try {
    await verifyCsrf();
  } catch {
    return Response.json({ error: "Invalid CSRF token" }, { status: 403 });
  }
  const sess = await getSession();
  if (!sess) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const user = await getUserById(sess.sub);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { title, body, attachments } = (await req.json()) as {
    title: string;
    body: string;
    attachments?: string[];
  };
  if (!title || !body)
    return Response.json({ error: "Missing fields" }, { status: 400 });

  // Length checks
  const titleTrim = String(title).trim();
  const bodyText = String(body);
  if (titleTrim.length < 3 || titleTrim.length > 200) {
    return Response.json(
      { error: "Title must be 3-200 characters" },
      { status: 400 }
    );
  }
  if (bodyText.length < 3 || bodyText.length > 20000) {
    return Response.json(
      { error: "Body must be 3-20000 characters" },
      { status: 400 }
    );
  }

  // Reject script tags and javascript: URLs in raw content
  const hasScriptTag = /<\s*script\b/i.test(bodyText);
  const hasJsProtocol = /javascript:\s*/i.test(bodyText);
  if (hasScriptTag || hasJsProtocol) {
    console.warn("Rejected post content for security: script/js detected", {
      userId: user.id,
    });
    return Response.json({ error: "Invalid content" }, { status: 400 });
  }

  // Attachment validation: only trusted blob domain and known extensions; cap count
  const safeBlob =
    /^https:\/\/[a-z0-9.-]+\.public\.blob\.vercel-storage\.com\//i;
  const safeExt = /\.(png|jpg|jpeg|gif|webp|mp3|wav|ogg|mp4|webm)$/i;
  if (attachments && attachments.length > 6) {
    return Response.json({ error: "Too many attachments" }, { status: 400 });
  }
  if (
    attachments &&
    attachments.some((u) => !safeBlob.test(u) || !safeExt.test(u))
  ) {
    return Response.json({ error: "Invalid attachment URL" }, { status: 400 });
  }

  // Basic per-user rate limit: 10 posts per 10 minutes
  const idx = await getForumIndex();
  const rlKey = `rl:${user.id}:post10m` as const;
  const now = Date.now();
  const rl = (idx as any)[rlKey] as
    | { count: number; resetAt: number }
    | undefined;
  const windowMs = 10 * 60 * 1000;
  let updatedIdx: ForumIndex | undefined;
  if (!rl || rl.resetAt < now) {
    updatedIdx = {
      ...(idx as any),
      [rlKey]: { count: 1, resetAt: now + windowMs },
    } as ForumIndex;
  } else if (rl.count >= 10) {
    return Response.json(
      { error: "Rate limit exceeded. Please wait." },
      { status: 429 }
    );
  } else {
    updatedIdx = {
      ...(idx as any),
      [rlKey]: { count: rl.count + 1, resetAt: rl.resetAt },
    } as ForumIndex;
  }
  if (updatedIdx) {
    await ecBatchUpdate([
      { operation: "upsert", key: "forum:index", value: updatedIdx },
    ]);
  }

  // Store plain text; rendering is sanitized in the client
  const post = await createPost(user, {
    title: titleTrim,
    body: bodyText,
    attachments,
  });
  return Response.json({ post });
}
