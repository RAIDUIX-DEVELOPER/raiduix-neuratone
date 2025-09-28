import { env } from "node:process";
import { __localUpsert, __localDelete } from "./edgeConfig";
import { normalizeEdgeKey } from "./edgeKeys";

// REST API for Edge Config batch updates
// Endpoint: PATCH /v1/edge-config/{edgeConfigId}/items
// Docs: https://vercel.com/docs/rest-api/reference/endpoints/edge-config/update-edge-config-items-in-batch

export type EdgeConfigPatchItem =
  | { operation: "upsert"; key: string; value: unknown }
  | { operation: "delete"; key: string };

export async function ecBatchUpdate(items: EdgeConfigPatchItem[]) {
  // Normalize keys to Edge Config constraints: /^[A-Za-z0-9_-]+$/ and <= 256 chars
  const normalized = items.map((op) =>
    op.operation === "upsert"
      ? {
          operation: op.operation,
          key: normalizeEdgeKey(op.key),
          value: op.value,
        }
      : { operation: op.operation, key: normalizeEdgeKey(op.key) }
  );

  const id = env.EDGE_CONFIG_ID;
  const token = env.VERCEL_API_TOKEN;
  const teamId = env.VERCEL_TEAM_ID;
  // Dev fallback: if write credentials are missing, apply changes to local in-memory store
  if (!id || !token) {
    for (const op of normalized) {
      if (op.operation === "upsert") {
        __localUpsert(op.key, op.value);
      } else if (op.operation === "delete") {
        __localDelete(op.key);
      }
    }
    return { ok: true, devFallback: true } as const;
  }
  const url = new URL(`https://api.vercel.com/v1/edge-config/${id}/items`);
  if (teamId) url.searchParams.set("teamId", teamId);
  const res = await fetch(url.toString(), {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ items: normalized }),
    // node runtime; do not cache
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Edge Config write failed: ${res.status} ${res.statusText} - ${text}`
    );
  }
  return (await res.json()) as { status: string };
}
