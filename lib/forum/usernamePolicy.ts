export interface UsernamePolicyResult {
  ok: boolean;
  reasons: string[];
  normalized?: string;
}

const RESERVED = new Set([
  "admin",
  "root",
  "system",
  "support",
  "moderator",
  "mod",
  "staff",
  "owner",
  "security",
  "help",
  "null",
  "undefined",
  "api",
  "www",
]);

// Minimal profanity list; can be extended or swapped for a service later
const BANNED_SUBSTRINGS = [
  "fuck",
  "shit",
  "bitch",
  "asshole",
  "nigger",
  "nigga",
  "fag",
  "cunt",
  "chink",
  "spic",
  "retard",
];

export function validateUsernamePolicy(
  usernameRaw: string
): UsernamePolicyResult {
  const reasons: string[] = [];
  const username = (usernameRaw || "").trim();
  const normalized = username.toLowerCase();

  // Length
  if (normalized.length < 3 || normalized.length > 20) {
    reasons.push("Username must be between 3 and 20 characters.");
  }

  // Allowed characters and no leading/trailing underscore/period
  const allowedRe = /^(?![._])[a-z0-9._]{3,20}(?<![._])$/;
  if (!allowedRe.test(normalized)) {
    reasons.push(
      "Only lowercase letters, numbers, underscores, and periods are allowed; cannot start or end with _ or ."
    );
  }

  // No spaces
  if (/\s/.test(username)) {
    reasons.push("No spaces are allowed.");
  }

  // Reserved words (exact or exact plus trailing digits)
  const base = normalized.replace(/\d+$/, "");
  if (RESERVED.has(normalized) || (base && RESERVED.has(base))) {
    reasons.push("Username is reserved.");
  }

  // Offensive language (substring match, case-insensitive via normalized)
  for (const b of BANNED_SUBSTRINGS) {
    if (normalized.includes(b)) {
      reasons.push("Username contains inappropriate language.");
      break;
    }
  }

  return { ok: reasons.length === 0, reasons, normalized };
}
