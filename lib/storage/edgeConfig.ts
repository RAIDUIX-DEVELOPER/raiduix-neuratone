// Edge Config read helpers
// Docs: https://vercel.com/docs/storage/edge-config and SDK usage
// This module centralizes reads so we can swap strategies or add tracing later.

import { createClient, get, getAll, has, digest } from "@vercel/edge-config";
import { normalizeEdgeKey } from "./edgeKeys";

// Local in-memory store for development when no EDGE_CONFIG is configured
const localStore: Map<string, unknown> = new Map();
function useLocal(): boolean {
  return !process.env.EDGE_CONFIG; // connection string missing => dev fallback
}

// If EDGE_CONFIG connection string is present (project-level), SDK get/has/getAll use it implicitly.
// createClient allows targeting another Edge Config via connection string when needed.

export type EdgeConfigClient = ReturnType<typeof createClient>;

// Optional secondary client by connection string (e.g., for cross-project reads)
export function getEdgeConfigClient(
  connectionString?: string
): EdgeConfigClient | null {
  if (!connectionString) return null;
  try {
    return createClient(connectionString);
  } catch {
    return null;
  }
}

// Read a single key from the default Edge Config attached to this project via EDGE_CONFIG env.
export async function ecGet<T = unknown>(key: string): Promise<T | null> {
  const k = normalizeEdgeKey(key);
  if (useLocal()) {
    return (localStore.has(k) ? (localStore.get(k) as T) : null) as T | null;
  }
  try {
    // The SDK returns undefined for missing keys; normalize to null for ergonomics
    let value: unknown = await get(k);
    if (value == null && k !== key) {
      // Fallback: attempt original key in case of pre-existing data stored without normalization
      value = await get(key);
    }
    return (value as T | undefined) ?? null;
  } catch {
    // Fallback to local in case SDK errors in dev
    return (localStore.has(k) ? (localStore.get(k) as T) : null) as T | null;
  }
}

// Read multiple keys efficiently
export async function ecGetAll(
  keys?: readonly string[]
): Promise<Record<string, unknown>> {
  const ks = keys?.map((k) => normalizeEdgeKey(k));
  const backMap: Map<string, string> | null =
    keys && ks ? new Map(ks.map((nk, i) => [nk, keys[i] as string])) : null;
  if (useLocal()) {
    if (ks && ks.length && backMap) {
      const out: Record<string, unknown> = {};
      for (const k of ks)
        if (localStore.has(k)) out[backMap.get(k)!] = localStore.get(k);
      return out;
    }
    const out: Record<string, unknown> = {};
    for (const [k, v] of localStore.entries()) out[k] = v;
    return out;
  }
  try {
    // Without args, returns the entire store object (fast from Edge endpoint)
    // With args, returns only those keys.
    // Note: Returned object is immutable; clone before mutation if needed.
    if (ks && ks.length) {
      // cast to any to avoid complex generics; SDK narrows at runtime
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = (await (getAll as any)(...ks)) as Record<string, unknown>;
      if (backMap) {
        const out: Record<string, unknown> = {};
        for (const [nk, v] of Object.entries(res)) {
          const orig = backMap.get(nk) || nk;
          out[orig] = v;
        }
        return out;
      }
      return res;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (await (getAll as any)()) as Record<string, unknown>;
  } catch {
    // Fallback to local in case SDK errors in dev
    if (ks && ks.length && backMap) {
      const out: Record<string, unknown> = {};
      for (const k of ks)
        if (localStore.has(k)) out[backMap.get(k)!] = localStore.get(k);
      return out;
    }
    const out: Record<string, unknown> = {};
    for (const [k, v] of localStore.entries()) out[k] = v;
    return out;
  }
}

export async function ecHas(key: string): Promise<boolean> {
  const k = normalizeEdgeKey(key);
  if (useLocal()) return localStore.has(k);
  try {
    return has(k);
  } catch {
    return localStore.has(k);
  }
}

export async function ecDigest(): Promise<string> {
  if (useLocal()) return `local-dev-${localStore.size}`;
  try {
    return digest();
  } catch {
    return `local-dev-${localStore.size}`;
  }
}

// Local write helpers for dev fallback
export function __localUpsert(key: string, value: unknown) {
  localStore.set(normalizeEdgeKey(key), value);
}
export function __localDelete(key: string) {
  localStore.delete(normalizeEdgeKey(key));
}

// Example shape suggestions (to guide future callers)
export interface FeatureFlags {
  [flagName: string]: boolean;
}

export interface RemoteConfig {
  flags?: FeatureFlags;
  // add more namespaces as needed
}
