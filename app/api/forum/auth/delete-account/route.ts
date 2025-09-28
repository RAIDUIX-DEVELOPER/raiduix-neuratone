import { getSession } from "@/lib/forum/auth";
import { getForumIndex, getUserById } from "@/lib/forum/store";
import { ecBatchUpdate } from "@/lib/storage/edgeConfigWrite";
import { EC_KEYS, type ForumIndex } from "@/lib/forum/types";
import { ecGetAll } from "@/lib/storage/edgeConfig";
import { verifyCsrf } from "@/lib/security/csrf";

export async function POST() {
  try {
    await verifyCsrf();
  } catch {
    return Response.json({ error: "Invalid CSRF token" }, { status: 403 });
  }
  const sess = await getSession();
  if (!sess) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const user = await getUserById(sess.sub);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const idx = await getForumIndex();
  // Remove from username/email indexes
  const updatedIdx: ForumIndex = { ...idx } as any;
  delete updatedIdx.usersByUsername[user.username.toLowerCase()];
  delete updatedIdx.usersByEmail[user.email.toLowerCase()];
  if ((updatedIdx as any).sessions)
    delete (updatedIdx as any).sessions![user.id];

  // Redact user record
  const redacted = {
    ...user,
    email: "deleted@example.com",
    passwordHash: "",
    bio: undefined,
    avatarUrl: undefined,
    username: `deleted_${user.id.slice(-6)}`,
  } as any;

  // Optionally anonymize posts authored by user (keep content, replace author fields)
  const allKeys = idx.posts.map((id) => EC_KEYS.post(id));
  const all = await ecGetAll(allKeys);
  const postUpdates: { operation: "upsert"; key: string; value: unknown }[] =
    [];
  for (const key of allKeys) {
    const p = all[key] as any;
    if (p && p.authorId === user.id) {
      postUpdates.push({
        operation: "upsert",
        key,
        value: { ...p, authorUsername: redacted.username },
      });
    }
  }

  await ecBatchUpdate([
    { operation: "upsert", key: EC_KEYS.user(user.id), value: redacted },
    { operation: "upsert", key: EC_KEYS.forumIndex, value: updatedIdx },
    ...postUpdates,
  ]);

  return Response.json({ ok: true });
}
