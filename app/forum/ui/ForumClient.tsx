"use client";
import React, { useEffect, useMemo, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import sanitizeSchema from "@/lib/markdown/sanitizeSchema";
import { upload } from "@vercel/blob/client";
import { validatePassword as serverValidatePassword } from "@/lib/forum/passwordPolicy";
import { validateUsernamePolicy } from "@/lib/forum/usernamePolicy";

let csrfToken: string | null = null;
async function getCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken;
  try {
    const r = await fetch("/api/csrf", { cache: "no-store" });
    const j = await r.json();
    csrfToken = j?.token || null;
  } catch {}
  return csrfToken || "";
}

class ApiError extends Error {
  status?: number;
  url?: string;
  method?: string;
  raw?: string;
  data?: any;
  constructor(
    message: string,
    opts?: {
      status?: number;
      url?: string;
      method?: string;
      raw?: string;
      data?: any;
    }
  ) {
    super(message);
    this.name = "ApiError";
    this.status = opts?.status;
    this.url = opts?.url;
    this.method = opts?.method;
    this.raw = opts?.raw;
    this.data = opts?.data;
  }
}

function logApiError(context: string, err: unknown) {
  if (err instanceof ApiError) {
    // Detailed diagnostic logging for developers only
    // Includes method, URL, status, parsed data, and raw text.
    console.error(`[${context}] API error`, {
      status: err.status,
      method: err.method,
      url: err.url,
      message: err.message,
      data: err.data,
      raw: err.raw,
    });
  } else {
    console.error(`[${context}]`, err);
  }
}

function friendlyMessage(
  err: unknown,
  fallback: string,
  overrides?: Partial<Record<number, string>>
): string {
  const map = overrides || {};
  if (err instanceof ApiError) {
    const s = err.status;
    if (s && map[s]) return map[s]!;
    // Handle common classes
    if (s === 400) return map[400] || "Please check your input and try again.";
    if (s === 401)
      return map[401] || "Unauthorized. Please log in and try again.";
    if (s === 403)
      return (
        map[403] || "Session validation failed. Please reload and try again."
      );
    if (s === 404) return map[404] || "Not found. Please try again.";
    if (s === 409)
      return (
        map[409] || "Conflict. The resource may already exist or is in use."
      );
    if (s === 413)
      return map[413] || "Payload too large. Try a smaller file or message.";
    if (s === 415) return map[415] || "Unsupported media type.";
    if (s === 429)
      return map[429] || "Too many attempts. Please wait and try again.";
    if (s && s >= 500)
      return map[500] || "A server error occurred. Please try again later.";
  }
  // Network errors or unknown
  return fallback;
}

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const method = (init?.method || "GET").toUpperCase();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as any),
  };
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    const t = await getCsrfToken();
    if (t) headers["x-csrf-token"] = t;
  }
  let res: Response;
  try {
    res = await fetch(url, { ...init, headers });
  } catch (networkErr: any) {
    const ae = new ApiError("Network error. Please check your connection.", {
      url,
      method,
    });
    logApiError(`fetch ${method} ${url}`, ae);
    throw ae;
  }
  const text = await res.text();
  if (!res.ok) {
    let data: any = undefined;
    try {
      data = text ? JSON.parse(text) : undefined;
    } catch {}
    const msg = (
      data?.error ||
      data?.message ||
      text ||
      "Request failed"
    ).toString();
    const ae = new ApiError(msg, {
      status: res.status,
      url,
      method,
      raw: text,
      data,
    });
    logApiError(`fetch ${method} ${url}`, ae);
    throw ae;
  }
  return text ? (JSON.parse(text) as T) : ({} as T);
}

interface MeResponse {
  id?: string;
  username?: string;
  email?: string;
  role?: "user" | "moderator" | "admin";
}
interface Post {
  id: string;
  authorUsername: string;
  title: string;
  body: string;
  createdAt: number;
  likes?: number;
  attachments?: string[];
}

export default function ForumClient() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [tab, setTab] = useState<"feed" | "compose" | "login" | "signup">(
    "feed"
  );
  const [query, setQuery] = useState("");
  const [trending, setTrending] = useState<{ tag: string; count: number }[]>(
    []
  );

  useEffect(() => {
    fetchJSON<{
      id?: string;
      username?: string;
      email?: string;
      role?: "user" | "moderator" | "admin";
    }>("/api/forum/auth/me")
      .then((r) => {
        if (r && r.id) setMe(r);
      })
      .catch(() => {});
    fetchJSON<{ posts: Post[] }>("/api/forum/posts")
      .then((r) => setPosts(r.posts))
      .catch(() => {});
    fetchJSON<{ tags: { tag: string; count: number }[] }>("/api/forum/trending")
      .then((r) => setTrending(r.tags))
      .catch(() => {});
  }, []);

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) {
      const r = await fetchJSON<{ posts: Post[] }>("/api/forum/posts");
      setPosts(r.posts);
      return;
    }
    const r = await fetchJSON<{ posts: Post[] }>(
      `/api/forum/search?q=${encodeURIComponent(query)}`
    );
    setPosts(r.posts);
  };

  const logout = async () => {
    try {
      await fetchJSON("/api/forum/auth/logout", { method: "POST" });
    } catch {}
    setMe(null);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-[260px_1fr_300px] gap-6">
      {/* Left nav */}
      <aside className="hidden md:block">
        <div className="sticky top-6 space-y-3">
          <div className="card rounded-lg p-4">
            <h2 className="text-base font-semibold text-teal-300 mb-3">
              Forum
            </h2>
            <form onSubmit={search} className="flex items-center gap-2">
              <input
                className="w-full bg-transparent border border-white/10 rounded px-3 py-1.5 text-sm placeholder:text-slate-400/70"
                placeholder="Search posts..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button
                className="btn-shape px-3 py-1.5 text-[12px] ring-1 ring-white/5 hover:ring-teal-400/30 text-slate-200/80 hover:text-teal-100 bg-[#0b1220]/70"
                type="submit"
              >
                Go
              </button>
            </form>
          </div>
          <nav className="space-y-2">
            <button
              className={`block w-full text-left px-3 py-2 rounded border border-white/10 ${
                tab === "feed" ? "bg-white/10" : "hover:bg-white/5"
              }`}
              onClick={() => setTab("feed")}
            >
              Feed
            </button>
            <button
              className={`block w-full text-left px-3 py-2 rounded border border-white/10 ${
                tab === "compose" ? "bg-white/10" : "hover:bg-white/5"
              }`}
              onClick={() => setTab("compose")}
            >
              Compose
            </button>
          </nav>
          {!me && (
            <div className="pt-4 space-x-2">
              <button
                className="px-3 py-2 rounded bg-white text-black"
                onClick={() => setTab("signup")}
              >
                Sign up
              </button>
              <button
                className="px-3 py-2 rounded border border-white/30"
                onClick={() => setTab("login")}
              >
                Log in
              </button>
            </div>
          )}
          {me && (
            <div className="pt-4 space-y-2 text-sm text-slate-300/85">
              <div>
                Signed in as{" "}
                <span className="font-semibold">@{me.username}</span>
              </div>
              <button
                className="px-3 py-2 rounded border border-white/30"
                onClick={logout}
              >
                Log out
              </button>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!confirm("Delete your account? This cannot be undone."))
                    return;
                  try {
                    await fetchJSON("/api/forum/auth/delete-account", {
                      method: "POST",
                    });
                    setMe(null);
                    setTab("feed");
                  } catch (err: any) {
                    logApiError("delete-account", err);
                    alert(
                      friendlyMessage(
                        err,
                        "Couldn't delete your account. Please try again.",
                        {
                          401: "You're not logged in. Please log in and try again.",
                          403: "Session validation failed. Please reload and try again.",
                          429: "Too many attempts. Please wait and try again.",
                          500: "We couldn't delete your account right now. Please try later.",
                        }
                      )
                    );
                  }
                }}
              >
                <button className="px-3 py-2 rounded border border-red-400/50 text-red-300 mt-2">
                  Delete account
                </button>
              </form>
            </div>
          )}
        </div>
      </aside>

      {/* Middle content */}
      <main className="space-y-6">
        {tab === "compose" ? (
          <Composer
            me={me}
            onPosted={(p) => setPosts((prev) => [p, ...prev])}
          />
        ) : tab === "login" ? (
          <AuthForm
            mode="login"
            onDone={(u) => {
              setMe(u);
              setTab("feed");
            }}
          />
        ) : tab === "signup" ? (
          <AuthForm
            mode="signup"
            onDone={(u) => {
              setMe(u);
              setTab("feed");
            }}
          />
        ) : (
          <Feed posts={posts} />
        )}
      </main>

      {/* Right sidebar */}
      <aside className="hidden md:block">
        <div className="sticky top-6 space-y-4">
          <div className="card rounded-lg p-4">
            <h3 className="text-base font-semibold text-teal-300 mb-2">
              Trending
            </h3>
            <ul className="text-sm text-slate-300/85 list-disc list-inside space-y-2">
              {trending.length ? (
                trending.map((t) => (
                  <li key={t.tag}>
                    #{t.tag} <span className="text-white/50">({t.count})</span>
                  </li>
                ))
              ) : (
                <li>No trends yet</li>
              )}
            </ul>
          </div>
          <div className="card rounded-lg p-4">
            <h3 className="text-base font-semibold text-teal-300 mb-2">
              Rules & Guidelines
            </h3>
            <ul className="text-sm text-slate-300/85 list-disc list-inside space-y-2">
              <li>
                Be respectful. Harassment, hate speech, and personal attacks are
                not allowed.
              </li>
              <li>
                No medical claims. Content is for general wellness and
                discussion only.
              </li>
              <li>
                Stay on-topic. Spam and excessive self-promotion will be
                removed.
              </li>
              <li>
                Use clear titles and tags. Mark sensitive topics appropriately.
              </li>
              <li>
                Media must follow the law and community standards; no explicit
                or illegal content.
              </li>
              <li>
                Keep uploads lightweight; optimize images/audio/video before
                posting.
              </li>
              <li>
                Moderators may edit or remove content that violates these rules.
              </li>
            </ul>
          </div>
        </div>
      </aside>
    </div>
  );
}

function Feed({ posts }: { posts: Post[] }) {
  if (!posts.length)
    return (
      <div className="card rounded-lg p-4 text-slate-300/80">No posts yet.</div>
    );
  return (
    <div className="space-y-4">
      {posts.map((p) => (
        <article key={p.id} className="card rounded-lg p-4">
          <div className="text-xs text-slate-300/70">
            @{p.authorUsername} · {new Date(p.createdAt).toLocaleString()}
          </div>
          <h4 className="text-lg font-semibold mt-1 text-slate-200/95">
            {p.title}
          </h4>
          <div className="prose prose-invert max-w-none mt-2">
            <Markdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[[rehypeSanitize, sanitizeSchema]]}
            >
              {p.body}
            </Markdown>
          </div>
          {!!(p.attachments && p.attachments.length) && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {p.attachments!.map((url, i) => (
                <AttachmentPreview key={i} url={url} />
              ))}
            </div>
          )}
          <PostActions id={p.id} initialLikes={p.likes || 0} />
        </article>
      ))}
    </div>
  );
}

function PostActions({
  id,
  initialLikes,
}: {
  id: string;
  initialLikes: number;
}) {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [removed, setRemoved] = useState(false);
  const [likes, setLikes] = useState(initialLikes);
  useEffect(() => {
    fetchJSON<MeResponse>("/api/forum/auth/me")
      .then((u) => setMe(u))
      .catch(() => {});
  }, []);
  if (removed) return null;
  const canModerate = me && (me.role === "moderator" || me.role === "admin");
  const like = async () => {
    try {
      const r = await fetchJSON<{ ok: boolean; likes: number }>(
        `/api/forum/posts/like`,
        { method: "POST", body: JSON.stringify({ id }) }
      );
      setLikes(r.likes);
    } catch (err) {
      logApiError("like-post", err);
    }
  };
  const del = async () => {
    if (!canModerate) return;
    if (!confirm("Delete this post?")) return;
    try {
      await fetchJSON<{ ok: boolean }>("/api/forum/posts/delete", {
        method: "POST",
        body: JSON.stringify({ id }),
      });
      setRemoved(true);
    } catch (e: any) {
      logApiError("delete-post", e);
      alert(
        friendlyMessage(e, "Couldn't delete the post. Please try again.", {
          401: "You need to be logged in to delete posts.",
          403: "Only moderators or admins can delete posts.",
          429: "Too many requests. Please slow down and try again.",
          500: "We couldn't delete this post right now. Please try later.",
        })
      );
    }
  };
  return (
    <div className="mt-3 text-sm text-slate-300/80 flex items-center gap-3">
      <button
        className="px-2 py-1 rounded border border-white/20 hover:bg-white/10"
        onClick={like}
      >
        ❤ {likes}
      </button>
      <ReportButton postId={id} />
      {canModerate && (
        <button
          className="px-2 py-1 rounded border border-red-400/50 text-red-300 hover:bg-red-500/10"
          onClick={del}
        >
          Delete
        </button>
      )}
    </div>
  );
}

function Composer({
  me,
  onPosted,
}: {
  me: MeResponse | null;
  onPosted: (p: Post) => void;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [preview, setPreview] = useState(false);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | undefined>();
  const [submitError, setSubmitError] = useState<string | undefined>();

  if (!me)
    return (
      <div className="card rounded-lg p-4 text-slate-300/85">
        Please log in or sign up to post.
      </div>
    );

  const submit = async () => {
    setSubmitError(undefined);
    try {
      const r = await fetchJSON<{ post: Post }>("/api/forum/posts", {
        method: "POST",
        body: JSON.stringify({ title, body, attachments }),
      });
      setTitle("");
      setBody("");
      setPreview(false);
      setAttachments([]);
      onPosted(r.post);
    } catch (err) {
      logApiError("create-post", err);
      setSubmitError(
        friendlyMessage(
          err,
          "Couldn't publish your post. Please review your content and try again.",
          {
            401: "Please log in to post.",
            403: "Session validation failed. Please reload and try again.",
            413: "The post is too large. Please shorten it or remove attachments.",
            415: "One or more attachments have an unsupported type.",
            429: "You're posting too fast. Please wait and try again.",
            500: "We couldn't publish your post right now. Please try later.",
          }
        )
      );
    }
  };

  const onSelectFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files.length) return;
    setUploadError(undefined);
    setUploading(true);
    try {
      const newUrls: string[] = [];
      for (const file of Array.from(files)) {
        // Upload with client token. The server route will authenticate and restrict types/size.
        const res = await upload(`forum/${file.name}`, file, {
          access: "public",
          handleUploadUrl: "/api/storage/blob/upload",
          contentType: file.type || undefined,
          multipart: file.size > 5 * 1024 * 1024,
        });
        newUrls.push(res.url);
      }
      setAttachments((prev) => [...prev, ...newUrls].slice(0, 6));
    } catch (err: any) {
      logApiError("upload-attachment", err);
      setUploadError(
        friendlyMessage(err, "Upload failed. Please try again.", {
          401: "Please log in to upload attachments.",
          403: "Session validation failed. Please reload and try again.",
          413: "File too large. Please upload a smaller file.",
          415: "Unsupported file type.",
          429: "Too many uploads. Please wait and try again.",
          500: "We couldn't upload your file right now. Please try later.",
        })
      );
    } finally {
      setUploading(false);
      // reset input value so selecting the same file again triggers change
      e.currentTarget.value = "";
    }
  };

  const removeAttachment = (u: string) =>
    setAttachments((prev) => prev.filter((x) => x !== u));

  return (
    <div className="card rounded-lg p-4 space-y-3">
      <input
        className="w-full bg-transparent border border-white/10 rounded px-3 py-2"
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={200}
      />
      <textarea
        className="w-full bg-transparent border border-white/10 rounded px-3 py-2 h-40"
        placeholder="Write in Markdown..."
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <div className="flex items-center gap-3 flex-wrap">
        <label className="px-3 py-2 rounded border border-white/30 cursor-pointer">
          <input
            type="file"
            multiple
            className="hidden"
            onChange={onSelectFiles}
          />
          {uploading ? "Uploading…" : "Add attachments"}
        </label>
        {uploadError && (
          <span className="text-red-400 text-sm">{uploadError}</span>
        )}
      </div>
      {!!attachments.length && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {attachments.map((u) => (
            <div
              key={u}
              className="relative group border border-white/10 rounded p-2"
            >
              <AttachmentPreview url={u} />
              <button
                className="absolute top-1 right-1 text-xs px-2 py-1 rounded bg-black/60 border border-white/30 opacity-0 group-hover:opacity-100"
                onClick={() => removeAttachment(u)}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center gap-3">
        <button
          className="px-3 py-2 rounded bg-white text-black"
          onClick={submit}
          disabled={!title || !body}
        >
          Post
        </button>
        <button
          className="px-3 py-2 rounded border border-white/30"
          onClick={() => setPreview((p) => !p)}
        >
          {preview ? "Hide Preview" : "Preview"}
        </button>
      </div>
      {submitError && (
        <div className="text-red-400 text-sm" role="alert">
          {submitError}
        </div>
      )}
      {preview && (
        <div className="prose prose-invert max-w-none border-t border-white/10 pt-3">
          <Markdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[[rehypeSanitize, sanitizeSchema]]}
          >
            {body}
          </Markdown>
        </div>
      )}
    </div>
  );
}

function ReportButton({ postId }: { postId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const submit = async () => {
    setMsg(null);
    try {
      const r = await fetchJSON<{ ok: boolean }>("/api/forum/reports", {
        method: "POST",
        body: JSON.stringify({ postId, reason }),
      });
      if (r.ok) {
        setMsg("Reported. Thank you.");
        setOpen(false);
        setReason("");
      }
    } catch (e: any) {
      logApiError("report-post", e);
      setMsg(
        friendlyMessage(e, "Couldn't submit your report. Please try again.", {
          400: "Please provide a reason for the report.",
          401: "Please log in to report posts.",
          403: "Session validation failed. Please reload and try again.",
          429: "You're reporting too frequently. Please wait and try again.",
          500: "We couldn't submit your report right now. Please try later.",
        })
      );
    }
  };
  return (
    <div>
      <button
        className="px-2 py-1 rounded border border-white/20 hover:bg-white/10"
        onClick={() => setOpen((v) => !v)}
      >
        Report
      </button>
      {open && (
        <div className="mt-2 p-2 border border-white/10 rounded bg-black/40 max-w-sm">
          <div className="text-xs mb-1">Why are you reporting this post?</div>
          <textarea
            className="w-full bg-transparent border border-white/20 rounded px-2 py-1 text-sm"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
          />
          <div className="mt-2 flex gap-2">
            <button
              className="px-2 py-1 rounded bg-white text-black text-sm"
              onClick={submit}
            >
              Submit
            </button>
            <button
              className="px-2 py-1 rounded border border-white/30 text-sm"
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
          </div>
          {msg && <div className="text-xs mt-1 text-slate-300/80">{msg}</div>}
        </div>
      )}
    </div>
  );
}

function AuthForm({
  mode,
  onDone,
}: {
  mode: "login" | "signup";
  onDone: (u: MeResponse) => void;
}) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | undefined>();
  const unamePolicy = useMemo(
    () => validateUsernamePolicy(username),
    [username]
  );

  // Local helpers to mirror server-side password policy for real-time feedback
  const hasUpper = (s: string) => /[A-Z]/.test(s);
  const hasLower = (s: string) => /[a-z]/.test(s);
  const hasDigit = (s: string) => /\d/.test(s);
  const hasSymbol = (s: string) => /[^A-Za-z0-9]/.test(s);
  const containsSequentialChars = (s: string): boolean => {
    const lower = (s || "").toLowerCase();
    const run = (chars: string) => {
      for (let i = 0; i < chars.length - 2; i++) {
        const a = chars.charCodeAt(i);
        const b = chars.charCodeAt(i + 1);
        const c = chars.charCodeAt(i + 2);
        if (b === a + 1 && c === b + 1) return true;
      }
      return false;
    };
    const lettersOnly = lower.replace(/[^a-z]/g, "");
    const digitsOnly = lower.replace(/[^0-9]/g, "");
    return run(lettersOnly) || run(digitsOnly);
  };
  const containsRepetition = (s: string): boolean => /(.)\1\1/.test(s || "");

  const emailLocal = useMemo(
    () => (email || "").split("@")[0]?.toLowerCase?.() || "",
    [email]
  );

  const pwdChecks = useMemo(() => {
    const pwd = password || "";
    const lpwd = pwd.toLowerCase();
    const uname = (username || "").toLowerCase();
    const lenOk = pwd.length >= 8;
    const classes = [
      hasUpper(pwd),
      hasLower(pwd),
      hasDigit(pwd),
      hasSymbol(pwd),
    ];
    const variety = classes.filter(Boolean).length;
    const varietyOk = variety >= 3;
    const noNameOrEmail = !(
      (uname && lpwd.includes(uname)) ||
      (emailLocal && emailLocal.length >= 3 && lpwd.includes(emailLocal))
    );
    const commonList = new Set([
      "password",
      "123456",
      "12345678",
      "123456789",
      "qwerty",
      "abc123",
      "111111",
      "letmein",
      "welcome",
      "admin",
      "iloveyou",
      "monkey",
      "dragon",
    ]);
    const notCommon = !commonList.has(lpwd);
    const noSeqRepeat =
      !containsSequentialChars(pwd) && !containsRepetition(pwd);

    // Compute a simple strength score 0-4
    let score = 0;
    if (lenOk) score += 1;
    if (pwd.length >= 12) score += 1;
    if (varietyOk) score += 1;
    if (variety === 4) score += 1;
    if (!notCommon) score = Math.max(0, score - 2);
    if (!noSeqRepeat) score = Math.max(0, score - 1);
    if (!noNameOrEmail) score = Math.max(0, score - 1);
    score = Math.max(0, Math.min(4, score));

    return {
      lenOk,
      varietyOk,
      variety,
      noNameOrEmail,
      notCommon,
      noSeqRepeat,
      score,
    };
  }, [password, username, emailLocal]);

  const strengthLabel = useMemo(() => {
    switch (pwdChecks.score) {
      case 0:
        return "Very weak";
      case 1:
        return "Weak";
      case 2:
        return "Fair";
      case 3:
        return "Strong";
      case 4:
        return "Very strong";
      default:
        return "";
    }
  }, [pwdChecks.score]);

  const canSubmit = useMemo(() => {
    if (mode !== "signup") return true;
    const policy = serverValidatePassword(password, { username, email });
    return policy.ok;
  }, [mode, password, username, email]);

  const submit = async () => {
    try {
      setError(undefined);
      if (mode === "signup") {
        if (!unamePolicy.ok)
          throw new Error(unamePolicy.reasons[0] || "Invalid username");
        if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
          throw new Error("Enter a valid email address");
        if (!password || password.length < 8)
          throw new Error("Password must be at least 8 characters");
        // Mirror server validation to surface the first reason early
        const policy = serverValidatePassword(password, { username, email });
        if (!policy.ok)
          throw new Error(policy.reasons[0] || "Password does not meet policy");
        const u = await fetchJSON<MeResponse>("/api/forum/auth/signup", {
          method: "POST",
          body: JSON.stringify({
            username: unamePolicy.normalized || username.toLowerCase(),
            email,
            password,
          }),
        });
        onDone(u);
      } else {
        const u = await fetchJSON<MeResponse>("/api/forum/auth/login", {
          method: "POST",
          body: JSON.stringify({
            usernameOrEmail: username || email,
            password,
          }),
        });
        onDone(u);
      }
    } catch (e: any) {
      logApiError(mode === "signup" ? "signup" : "login", e);
      if (mode === "signup") {
        setError(
          friendlyMessage(
            e,
            "Could not create account. Please try again later.",
            {
              400: "Please check your details and try again.",
              403: "Session validation failed. Please reload and try again.",
              409: "That username or email is already in use.",
              429: "Too many attempts. Please wait and try again.",
              500: "We couldn't create your account right now. Please try later.",
            }
          )
        );
      } else {
        setError(
          friendlyMessage(e, "Could not log in. Please try again.", {
            400: "Invalid credentials. Please try again.",
            401: "Invalid credentials. Please try again.",
            403: "Session validation failed. Please reload and try again.",
            429: "Too many attempts. Please wait and try again.",
            500: "We couldn't log you in right now. Please try later.",
          })
        );
      }
    }
  };

  return (
    <div className="rounded border border-white/10 p-4 space-y-3 max-w-md">
      <h3 className="text-lg font-semibold capitalize">{mode}</h3>
      <div className="space-y-1">
        <label className="block text-sm text-slate-300/90">
          {mode === "signup" ? "Username:" : "Username or Email:"}
        </label>
        <input
          className="w-full bg-transparent border border-white/20 rounded px-3 py-2"
          placeholder={
            mode === "signup" ? "e.g. neurofan_123" : "your username or email"
          }
          value={username}
          onChange={(e) =>
            setUsername(
              mode === "signup" ? e.target.value.toLowerCase() : e.target.value
            )
          }
        />
        {mode === "signup" && !unamePolicy.ok && username && (
          <div className="text-xs text-amber-300/90 mt-1">
            {unamePolicy.reasons[0]}
          </div>
        )}
      </div>
      {mode === "signup" && (
        <div className="space-y-1">
          <label className="block text-sm text-slate-300/90">Email:</label>
          <input
            type="email"
            className="w-full bg-transparent border border-white/20 rounded px-3 py-2"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
      )}
      <div className="space-y-1">
        <label className="block text-sm text-slate-300/90">Password:</label>
        <input
          type="password"
          className="w-full bg-transparent border border-white/20 rounded px-3 py-2"
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-describedby={mode === "signup" ? "password-help" : undefined}
        />
        {mode === "signup" && (
          <div id="password-help" className="space-y-2" aria-live="polite">
            <div className="mt-1">
              <div className="h-1.5 w-full bg-white/10 rounded">
                <div
                  className={`h-1.5 rounded transition-all ${
                    pwdChecks.score <= 1
                      ? "bg-red-400"
                      : pwdChecks.score === 2
                      ? "bg-yellow-400"
                      : pwdChecks.score === 3
                      ? "bg-lime-400"
                      : "bg-emerald-400"
                  }`}
                  style={{ width: `${(pwdChecks.score / 4) * 100}%` }}
                />
              </div>
              <div className="mt-1 text-xs text-slate-300/80">
                Strength: {strengthLabel}
              </div>
            </div>
            <ul className="text-xs text-slate-300/85 space-y-1">
              <li
                className={
                  pwdChecks.lenOk ? "text-emerald-300" : "text-slate-300/80"
                }
              >
                {pwdChecks.lenOk ? "✓" : "•"} At least 8 characters
              </li>
              <li
                className={
                  pwdChecks.varietyOk ? "text-emerald-300" : "text-slate-300/80"
                }
              >
                {pwdChecks.varietyOk ? "✓" : "•"} Use at least 3 of: uppercase,
                lowercase, numbers, special characters
              </li>
              <li
                className={
                  pwdChecks.noNameOrEmail
                    ? "text-emerald-300"
                    : "text-slate-300/80"
                }
              >
                {pwdChecks.noNameOrEmail ? "✓" : "•"} Does not contain your
                username or email
              </li>
              <li
                className={
                  pwdChecks.notCommon ? "text-emerald-300" : "text-slate-300/80"
                }
              >
                {pwdChecks.notCommon ? "✓" : "•"} Not a common password
              </li>
              <li
                className={
                  pwdChecks.noSeqRepeat
                    ? "text-emerald-300"
                    : "text-slate-300/80"
                }
              >
                {pwdChecks.noSeqRepeat ? "✓" : "•"} Avoid sequences or repeats
                like abc or 111
              </li>
            </ul>
          </div>
        )}
      </div>
      {error && (
        <div className="text-red-400 text-sm" role="alert">
          {error}
        </div>
      )}
      <button
        className="px-3 py-2 rounded bg-white text-black"
        onClick={submit}
        disabled={mode === "signup" && !canSubmit}
      >
        {mode === "signup" ? "Create account" : "Log in"}
      </button>
    </div>
  );
}

function AttachmentPreview({ url }: { url: string }) {
  const lower = url.toLowerCase();
  const isImage = /\.(png|jpg|jpeg|gif|webp|avif)$/.test(lower);
  const isAudio = /\.(mp3|wav|ogg|m4a|aac|flac)$/.test(lower);
  const isVideo = /\.(mp4|webm|ogg|mov|mkv)$/.test(lower);
  if (isImage) {
    return (
      <img
        src={url}
        alt="attachment"
        className="rounded max-h-64 w-full object-cover"
      />
    );
  }
  if (isAudio) {
    return (
      <audio controls className="w-full">
        <source src={url} />
      </audio>
    );
  }
  if (isVideo) {
    return (
      <video controls className="w-full max-h-64 rounded">
        <source src={url} />
      </video>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="underline break-all"
    >
      {url}
    </a>
  );
}
