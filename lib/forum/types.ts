export type UserId = `usr_${string}`;
export type PostId = `pst_${string}`;

export interface ForumUser {
  id: UserId;
  username: string; // unique, stored lowercase; 3-20 chars; [a-z0-9._], no leading/trailing . or _
  email: string; // unique
  passwordHash: string; // bcrypt hash
  role?: "user" | "moderator" | "admin"; // RBAC role; default 'user'
  bio?: string;
  avatarUrl?: string;
  createdAt: number; // ms epoch
}

export interface ForumSessionClaims {
  sub: UserId;
  username: string;
  iat: number;
  exp: number;
}

export interface ForumPost {
  id: PostId;
  authorId: UserId;
  authorUsername: string;
  title: string;
  body: string; // markdown
  tags?: string[]; // #tags extracted
  attachments?: string[]; // blob URLs
  likes: number;
  replies: number;
  reposts: number;
  createdAt: number;
  updatedAt?: number;
}

export interface CreatePostInput {
  title: string;
  body: string;
  attachments?: string[];
}

export interface SignupInput {
  username: string;
  email: string;
  password: string;
}

export interface LoginInput {
  usernameOrEmail: string;
  password: string;
}

export interface ForumIndex {
  usersByUsername: Record<string, UserId>;
  usersByEmail: Record<string, UserId>;
  posts: PostId[]; // newest first
  // Account lock state: failed attempts and lockouts keyed by userId (optional field)
  locks?: Record<UserId, { fails: number; lockedUntil?: number }>;
  // Session tracking per user for inactivity/absolute lifetime
  sessions?: Record<
    UserId,
    {
      createdAt: number;
      lastSeen: number;
      absoluteExp: number;
    }
  >;
}

export interface ForumReport {
  id: `rpt_${string}`;
  postId: PostId;
  reporterId: UserId;
  reason: string;
  createdAt: number;
}

// Logical keys for Edge Config. Actual storage keys are normalized by storage helpers
// to conform to Edge Config REST constraints (replace disallowed chars with '-' and truncate to 256).
export const EC_KEYS = {
  forumIndex: "forum:index",
  user: (id: UserId) => `forum:users:${id}`,
  post: (id: PostId) => `forum:posts:${id}`,
  reports: "forum:reports",
} as const;
