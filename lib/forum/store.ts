import { ecGet, ecGetAll } from "../storage/edgeConfig";
import { ecBatchUpdate } from "../storage/edgeConfigWrite";
import type { ForumIndex, ForumPost, ForumUser, PostId, UserId } from "./types";
import { EC_KEYS } from "./types";

function genId(prefix: "usr" | "pst"): `${typeof prefix}_${string}` {
  const rnd = Math.random().toString(36).slice(2, 10);
  const ts = Date.now().toString(36);
  return `${prefix}_${ts}${rnd}` as `${typeof prefix}_${string}`;
}

export async function getForumIndex(): Promise<ForumIndex> {
  const idx = await ecGet<ForumIndex>(EC_KEYS.forumIndex);
  return idx ?? { usersByUsername: {}, usersByEmail: {}, posts: [] };
}

export async function getUserById(id: UserId): Promise<ForumUser | null> {
  return (await ecGet<ForumUser>(EC_KEYS.user(id))) ?? null;
}

export async function getUserByUsername(
  username: string
): Promise<ForumUser | null> {
  const index = await getForumIndex();
  const id = index.usersByUsername[username.toLowerCase()];
  if (!id) return null;
  return getUserById(id);
}

export async function getUserByEmail(email: string): Promise<ForumUser | null> {
  const index = await getForumIndex();
  const id = index.usersByEmail[email.toLowerCase()];
  if (!id) return null;
  return getUserById(id);
}

export async function createUser(
  u: Omit<ForumUser, "id" | "createdAt">
): Promise<ForumUser> {
  const index = await getForumIndex();
  const uname = u.username.toLowerCase();
  const mail = u.email.toLowerCase();
  if (index.usersByUsername[uname]) throw new Error("Username already exists");
  if (index.usersByEmail[mail]) throw new Error("Email already exists");

  const id = genId("usr") as UserId;
  const user: ForumUser = { ...u, id, createdAt: Date.now() };

  index.usersByUsername[uname] = id;
  index.usersByEmail[mail] = id;

  await ecBatchUpdate([
    { operation: "upsert", key: EC_KEYS.user(id), value: user },
    { operation: "upsert", key: EC_KEYS.forumIndex, value: index },
  ]);

  return user;
}

export async function getPostById(id: PostId): Promise<ForumPost | null> {
  return (await ecGet<ForumPost>(EC_KEYS.post(id))) ?? null;
}

export async function listPosts(limit = 20, offset = 0): Promise<ForumPost[]> {
  const index = await getForumIndex();
  const ids = index.posts.slice(offset, offset + limit);
  if (!ids.length) return [];
  // Read in parallel
  const keys = ids.map((id) => EC_KEYS.post(id));
  const all = await ecGetAll(keys);
  const posts: ForumPost[] = [];
  for (const key of keys) {
    const p = all[key] as ForumPost | undefined;
    if (p) posts.push(p);
  }
  return posts;
}

export async function createPost(
  author: ForumUser,
  input: { title: string; body: string; attachments?: string[] }
): Promise<ForumPost> {
  const id = genId("pst") as PostId;
  const tags = extractTags(input.body);
  const post: ForumPost = {
    id,
    authorId: author.id,
    authorUsername: author.username,
    title: input.title.trim().slice(0, 200),
    body: input.body,
    tags,
    attachments: input.attachments ?? [],
    likes: 0,
    replies: 0,
    reposts: 0,
    createdAt: Date.now(),
  };
  const index = await getForumIndex();
  index.posts.unshift(id);

  await ecBatchUpdate([
    { operation: "upsert", key: EC_KEYS.post(id), value: post },
    { operation: "upsert", key: EC_KEYS.forumIndex, value: index },
  ]);

  return post;
}

function extractTags(body: string): string[] {
  const set = new Set<string>();
  const re = /(^|\s)#([a-z0-9_]{2,32})/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    set.add(m[2].toLowerCase());
  }
  return Array.from(set);
}

export async function incrementPostLikes(
  id: PostId
): Promise<ForumPost | null> {
  const post = await getPostById(id);
  if (!post) return null;
  post.likes += 1;
  post.updatedAt = Date.now();
  await ecBatchUpdate([
    { operation: "upsert", key: EC_KEYS.post(id), value: post },
  ]);
  return post;
}

export async function searchPosts(
  query: string,
  limit = 20
): Promise<ForumPost[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const index = await getForumIndex();
  const sample = index.posts.slice(0, 300); // scan most recent 300
  const keys = sample.map((id) => EC_KEYS.post(id));
  const all = await ecGetAll(keys);
  const hits: ForumPost[] = [];
  for (const key of keys) {
    const p = all[key] as ForumPost | undefined;
    if (!p) continue;
    if (
      p.title.toLowerCase().includes(q) ||
      p.body.toLowerCase().includes(q) ||
      (p.tags || []).some((t) => t.includes(q))
    ) {
      hits.push(p);
      if (hits.length >= limit) break;
    }
  }
  return hits;
}

export async function trendingTags(
  limit = 10
): Promise<{ tag: string; count: number }[]> {
  const index = await getForumIndex();
  const sample = index.posts.slice(0, 500);
  const keys = sample.map((id) => EC_KEYS.post(id));
  const all = await ecGetAll(keys);
  const counts = new Map<string, number>();
  for (const key of keys) {
    const p = all[key] as ForumPost | undefined;
    if (!p || !p.tags) continue;
    for (const t of p.tags) counts.set(t, (counts.get(t) || 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tag, count]) => ({ tag, count }));
}

export async function deletePost(id: PostId): Promise<boolean> {
  const post = await getPostById(id);
  if (!post) return false;
  const index = await getForumIndex();
  const newPosts = index.posts.filter((p) => p !== id);
  await ecBatchUpdate([
    { operation: "delete", key: EC_KEYS.post(id) },
    {
      operation: "upsert",
      key: EC_KEYS.forumIndex,
      value: { ...index, posts: newPosts },
    },
  ]);
  return true;
}
