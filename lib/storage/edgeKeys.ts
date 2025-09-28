// Normalization for Edge Config keys to satisfy REST API constraints
// Allowed chars: A-Z, a-z, 0-9, underscore, hyphen. Max length 256.
// Any disallowed character is replaced with '-'.

export function normalizeEdgeKey(key: string): string {
  return key.replace(/[^A-Za-z0-9_-]/g, "-").slice(0, 256);
}
