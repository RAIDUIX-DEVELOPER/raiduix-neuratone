import { NextRequest } from "next/server";
import { getUserByEmail, getUserByUsername } from "@/lib/forum/store";
import {
  verifyPassword,
  createSessionCookie,
  rotateSession,
} from "@/lib/forum/auth";
import { ecBatchUpdate } from "@/lib/storage/edgeConfigWrite";
import { getForumIndex } from "@/lib/forum/store";
import type { ForumIndex } from "@/lib/forum/types";
import { verifyCsrf } from "@/lib/security/csrf";

export async function POST(req: NextRequest) {
  try {
    await verifyCsrf();
  } catch {
    return Response.json({ error: "Invalid CSRF token" }, { status: 403 });
  }
  // Per-IP rate limit: 10 login attempts per 1 minute window
  const fwdFor = req.headers.get("x-forwarded-for") || "";
  const ip = (
    fwdFor.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  ).toString();
  const idx0 = await getForumIndex();
  const now0 = Date.now();
  const rlKey0 = `rl:ip:${ip}:login1m` as const;
  const rl0 = (idx0 as any)[rlKey0] as
    | { count: number; resetAt: number }
    | undefined;
  const windowMs0 = 60 * 1000;
  let updatedIdx0: ForumIndex | undefined;
  if (!rl0 || rl0.resetAt < now0) {
    updatedIdx0 = {
      ...(idx0 as any),
      [rlKey0]: { count: 1, resetAt: now0 + windowMs0 },
    } as ForumIndex;
  } else if (rl0.count >= 10) {
    return Response.json(
      { error: "Too many attempts. Try again soon." },
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

  const { usernameOrEmail, password } = (await req.json()) as {
    usernameOrEmail: string;
    password: string;
  };
  if (!usernameOrEmail || !password)
    return Response.json({ error: "Missing credentials" }, { status: 400 });

  const isEmail = usernameOrEmail.includes("@");
  const user = isEmail
    ? await getUserByEmail(usernameOrEmail)
    : await getUserByUsername(usernameOrEmail);
  if (!user)
    return Response.json({ error: "Invalid credentials" }, { status: 401 });

  // Account lockout: after 5 failed attempts within 15 minutes, lock for 15 minutes
  const idx = await getForumIndex();
  const lockKey = `forum:locks:${user.id}`;
  const lock = (idx as any).locks?.[user.id] as
    | { fails: number; lockedUntil?: number }
    | undefined;
  const now = Date.now();
  if (lock?.lockedUntil && lock.lockedUntil > now) {
    return Response.json(
      { error: "Account temporarily locked. Try again later." },
      { status: 423 }
    );
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    const fails = (lock?.fails || 0) + 1;
    const updated: ForumIndex = {
      ...idx,
      locks: {
        ...(idx as any).locks,
        [user.id]:
          fails >= 5 ? { fails, lockedUntil: now + 15 * 60 * 1000 } : { fails },
      } as any,
    };
    await ecBatchUpdate([
      { operation: "upsert", key: "forum:index", value: updated },
    ]);
    return Response.json({ error: "Invalid credentials" }, { status: 401 });
  }

  // Reset lock on success
  if ((idx as any).locks?.[user.id]) {
    const updated: ForumIndex = { ...idx } as any;
    delete (updated as any).locks[user.id];
    await ecBatchUpdate([
      { operation: "upsert", key: "forum:index", value: updated },
    ]);
  }
  // Rotate session token after login to prevent fixation
  await rotateSession(user.id, user.username);
  return Response.json({
    id: user.id,
    username: user.username,
    email: user.email,
  });
}
