import { NextRequest } from "next/server";
import { getSession } from "@/lib/forum/auth";
import { getUserById, deletePost, getPostById } from "@/lib/forum/store";
import { verifyCsrf } from "@/lib/security/csrf";

export async function POST(req: NextRequest) {
  try {
    await verifyCsrf();
  } catch {
    return Response.json({ error: "Invalid CSRF token" }, { status: 403 });
  }
  const sess = await getSession();
  if (!sess) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const me = await getUserById(sess.sub);
  if (!me) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (me.role !== "moderator" && me.role !== "admin")
    return Response.json({ error: "Forbidden" }, { status: 403 });

  const { id } = (await req.json()) as { id?: string };
  const postId = (id || "").trim();
  if (!postId) return Response.json({ error: "Missing id" }, { status: 400 });
  const post = await getPostById(postId as any);
  if (!post) return Response.json({ error: "Not found" }, { status: 404 });
  const ok = await deletePost(postId as any);
  if (!ok) return Response.json({ error: "Delete failed" }, { status: 500 });
  return Response.json({ ok: true });
}
