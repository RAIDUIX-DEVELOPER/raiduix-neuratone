import { getSession } from "@/lib/forum/auth";
import { getUserById } from "@/lib/forum/store";

export async function GET() {
  const sess = await getSession();
  if (!sess) return Response.json({ user: null });
  const user = await getUserById(sess.sub);
  if (!user) return Response.json({ user: null });
  return Response.json({
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role || "user",
  });
}
