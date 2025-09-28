import { clearSessionCookie } from "@/lib/forum/auth";
import { getForumIndex } from "@/lib/forum/store";
import { ecBatchUpdate } from "@/lib/storage/edgeConfigWrite";
import { getSession } from "@/lib/forum/auth";
import { verifyCsrf } from "@/lib/security/csrf";

export async function POST() {
  try {
    await verifyCsrf();
  } catch {
    return Response.json({ error: "Invalid CSRF token" }, { status: 403 });
  }
  const sess = await getSession();
  if (sess) {
    const idx = await getForumIndex();
    const updated: any = { ...idx };
    if (updated.sessions) delete updated.sessions[sess.sub];
    await ecBatchUpdate([
      { operation: "upsert", key: "forum:index", value: updated },
    ]);
  }
  await clearSessionCookie();
  return Response.json({ ok: true });
}
