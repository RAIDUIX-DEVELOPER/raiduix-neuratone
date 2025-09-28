import { NextRequest } from "next/server";
import { getSession } from "@/lib/forum/auth";
import { ecBatchUpdate } from "@/lib/storage/edgeConfigWrite";
import { ecGet } from "@/lib/storage/edgeConfig";
import { EC_KEYS, type ForumReport } from "@/lib/forum/types";
import { verifyCsrf } from "@/lib/security/csrf";

function genId() {
  const rnd = Math.random().toString(36).slice(2, 8);
  const ts = Date.now().toString(36);
  return `rpt_${ts}${rnd}` as const;
}

export async function POST(req: NextRequest) {
  try {
    await verifyCsrf();
  } catch {
    return Response.json({ error: "Invalid CSRF token" }, { status: 403 });
  }
  const sess = await getSession();
  if (!sess) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { postId, reason } = (await req.json()) as {
    postId: string;
    reason: string;
  };
  const reasonText = String(reason || "").trim();
  if (!postId || reasonText.length < 3 || reasonText.length > 500) {
    return Response.json({ error: "Invalid report" }, { status: 400 });
  }
  // Per-user rate limit: 5 reports per 10 minutes
  const rlKey = `rl:${sess.sub}:report10m` as const;
  const now = Date.now();
  const idx = (await ecGet<any>(EC_KEYS.forumIndex)) || {};
  const rl = idx[rlKey] as { count: number; resetAt: number } | undefined;
  const windowMs = 10 * 60 * 1000;
  let updatedIdx: any;
  if (!rl || rl.resetAt < now) {
    updatedIdx = { ...idx, [rlKey]: { count: 1, resetAt: now + windowMs } };
  } else if (rl.count >= 5) {
    return Response.json({ error: "Rate limit exceeded" }, { status: 429 });
  } else {
    updatedIdx = {
      ...idx,
      [rlKey]: { count: rl.count + 1, resetAt: rl.resetAt },
    };
  }

  const reports = ((await ecGet<ForumReport[]>(EC_KEYS.reports)) || []).slice(
    -999
  );
  const report: ForumReport = {
    id: genId(),
    postId: postId as any,
    reporterId: sess.sub as any,
    reason: reasonText,
    createdAt: Date.now(),
  };

  await ecBatchUpdate([
    { operation: "upsert", key: EC_KEYS.reports, value: [...reports, report] },
    { operation: "upsert", key: EC_KEYS.forumIndex, value: updatedIdx },
  ]);
  return Response.json({ ok: true });
}
