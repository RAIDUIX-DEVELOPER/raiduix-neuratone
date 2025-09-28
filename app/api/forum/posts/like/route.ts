import { NextRequest } from "next/server";
import { getSession } from "@/lib/forum/auth";
import { incrementPostLikes } from "@/lib/forum/store";
import { verifyCsrf } from "@/lib/security/csrf";
import { ecGet } from "@/lib/storage/edgeConfig";
import { ecBatchUpdate } from "@/lib/storage/edgeConfigWrite";
import { EC_KEYS } from "@/lib/forum/types";

export async function POST(req: NextRequest) {
  try {
    await verifyCsrf();
  } catch {
    return Response.json({ error: "Invalid CSRF token" }, { status: 403 });
  }
  const sess = await getSession();
  if (!sess) return Response.json({ error: "Unauthorized" }, { status: 401 });

  // Basic per-user like rate limit: 30 likes per 1 minute window
  const now = Date.now();
  const rlKey = `rl:${sess.sub}:like1m` as const;
  const idx = (await ecGet<any>(EC_KEYS.forumIndex)) || {};
  const rl = idx[rlKey] as { count: number; resetAt: number } | undefined;
  const windowMs = 60 * 1000;
  let updatedIdx: any;
  if (!rl || rl.resetAt < now) {
    updatedIdx = { ...idx, [rlKey]: { count: 1, resetAt: now + windowMs } };
  } else if (rl.count >= 30) {
    return Response.json(
      { error: "Rate limit exceeded. Please wait." },
      { status: 429 }
    );
  } else {
    updatedIdx = {
      ...idx,
      [rlKey]: { count: rl.count + 1, resetAt: rl.resetAt },
    };
  }
  const { id } = (await req.json()) as { id: string };
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });
  const post = await incrementPostLikes(id as any);
  if (!post) return Response.json({ error: "Not found" }, { status: 404 });
  // persist updated rate limit counter
  await ecBatchUpdate([
    { operation: "upsert", key: EC_KEYS.forumIndex, value: updatedIdx },
  ]);
  return Response.json({ ok: true, likes: post.likes });
}
