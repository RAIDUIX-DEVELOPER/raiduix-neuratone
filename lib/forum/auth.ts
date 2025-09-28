import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { ForumSessionClaims, UserId, ForumIndex } from "./types";
import { getForumIndex } from "./store";
import { ecBatchUpdate } from "../storage/edgeConfigWrite";

const alg = "HS256";

function getJwtSecret(): Uint8Array {
  const secret = process.env.AUTH_JWT_SECRET;
  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV !== "production") {
      // Dev-safe fallback to avoid 500s. Strongly recommend setting AUTH_JWT_SECRET locally.
      return new TextEncoder().encode(
        "dev-secret-change-me-please-32chars-minimum-0001"
      );
    }
    throw new Error("AUTH_JWT_SECRET missing or too short");
  }
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionCookie(userId: UserId, username: string) {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 60 * 60 * 24 * 7; // absolute lifetime fallback 7 days
  const token = await new SignJWT({ username } as any)
    .setProtectedHeader({ alg })
    .setSubject(userId)
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .sign(getJwtSecret());

  const store = await cookies();
  store.set("forum_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  // Track session in index for inactivity and absolute expiration
  const idx = await getForumIndex();
  const msNow = Date.now();
  const absoluteExp = msNow + 7 * 24 * 60 * 60 * 1000;
  const updated: ForumIndex = {
    ...idx,
    sessions: {
      ...(idx as any).sessions,
      [userId]: { createdAt: msNow, lastSeen: msNow, absoluteExp },
    },
  } as any;
  await ecBatchUpdate([
    { operation: "upsert", key: "forum:index", value: updated },
  ]);
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete("forum_session");
}

export async function getSession(): Promise<ForumSessionClaims | null> {
  const store = await cookies();
  const token = store.get("forum_session")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), {
      algorithms: [alg],
    });
    // Inactivity and absolute expiry enforcement
    const idx = await getForumIndex();
    const sess = (idx as any).sessions?.[payload.sub as string] as
      | { createdAt: number; lastSeen: number; absoluteExp: number }
      | undefined;
    const now = Date.now();
    const maxIdleMs = 30 * 60 * 1000; // 30 minutes inactivity
    if (!sess || sess.absoluteExp < now || sess.lastSeen + maxIdleMs < now) {
      // Expired - clear cookie
      const c = await cookies();
      c.delete("forum_session");
      return null;
    }
    // Update lastSeen to implement sliding inactivity window
    const updated: ForumIndex = {
      ...idx,
      sessions: {
        ...(idx as any).sessions,
        [payload.sub as string]: { ...sess, lastSeen: now },
      },
    } as any;
    await ecBatchUpdate([
      { operation: "upsert", key: "forum:index", value: updated },
    ]);
    return {
      sub: payload.sub as UserId,
      username: (payload as any).username,
      iat: payload.iat as number,
      exp: payload.exp as number,
    };
  } catch {
    return null;
  }
}

// Rotate token after successful login to prevent fixation (re-issue JWT and cookie)
export async function rotateSession(userId: UserId, username: string) {
  await createSessionCookie(userId, username);
}
