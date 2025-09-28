import { NextRequest } from "next/server";
import {
  createUser,
  getUserByEmail,
  getUserByUsername,
} from "@/lib/forum/store";
import { hashPassword, createSessionCookie } from "@/lib/forum/auth";
import { validatePassword } from "@/lib/forum/passwordPolicy";
import { validateUsernamePolicy } from "@/lib/forum/usernamePolicy";
import { getForumIndex } from "@/lib/forum/store";
import { ecBatchUpdate } from "@/lib/storage/edgeConfigWrite";
import type { ForumIndex } from "@/lib/forum/types";
import { verifyCsrf } from "@/lib/security/csrf";

export async function POST(req: NextRequest) {
  try {
    await verifyCsrf();
  } catch {
    return Response.json({ error: "Invalid CSRF token" }, { status: 403 });
  }
  try {
    // Per-IP rate limit: 5 signups per 1 hour window
    const fwdFor = req.headers.get("x-forwarded-for") || "";
    const ip = (
      fwdFor.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown"
    ).toString();
    const idx0 = await getForumIndex();
    const now0 = Date.now();
    const rlKey0 = `rl:ip:${ip}:signup1h` as const;
    const rl0 = (idx0 as any)[rlKey0] as
      | { count: number; resetAt: number }
      | undefined;
    const windowMs0 = 60 * 60 * 1000;
    let updatedIdx0: ForumIndex | undefined;
    if (!rl0 || rl0.resetAt < now0) {
      updatedIdx0 = {
        ...(idx0 as any),
        [rlKey0]: { count: 1, resetAt: now0 + windowMs0 },
      } as ForumIndex;
    } else if (rl0.count >= 5) {
      return Response.json(
        { error: "Rate limit exceeded. Try again later." },
        { status: 429 }
      );
    } else {
      updatedIdx0 = {
        ...(idx0 as any),
        [rlKey0]: { count: rl0.count + 1, resetAt: rl0.resetAt },
      } as ForumIndex;
    }
    if (updatedIdx0) {
      await ecBatchUpdate([
        { operation: "upsert", key: "forum:index", value: updatedIdx0 },
      ]);
    }

    const { username, email, password } = (await req.json()) as {
      username: string;
      email: string;
      password: string;
    };
    const unameCheck = validateUsernamePolicy(username);
    if (!unameCheck.ok) {
      return Response.json(
        { error: unameCheck.reasons[0] || "Invalid username" },
        { status: 400 }
      );
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
      return Response.json({ error: "Invalid email" }, { status: 400 });
    if (!password || password.length < 8)
      return Response.json({ error: "Password too short" }, { status: 400 });

    const policy = validatePassword(password, { username, email });
    if (!policy.ok) {
      return Response.json(
        { error: policy.reasons[0] || "Password does not meet policy" },
        { status: 400 }
      );
    }

    if (await getUserByUsername(username))
      return Response.json({ error: "Username taken" }, { status: 409 });
    if (await getUserByEmail(email))
      return Response.json({ error: "Email taken" }, { status: 409 });

    const passwordHash = await hashPassword(password);
    const user = await createUser({
      username: unameCheck.normalized!,
      email,
      passwordHash,
    });
    await createSessionCookie(user.id, user.username);
    return Response.json({
      id: user.id,
      username: user.username,
      email: user.email,
    });
  } catch (err) {
    const msg =
      process.env.NODE_ENV !== "production"
        ? (err as Error)?.message || "Internal Server Error"
        : "Internal Server Error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
