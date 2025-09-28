// Password policy enforcement for server-side validation
// - Min length 8
// - Complexity: at least 3 of 4 classes (upper, lower, digit, symbol)
// - Prohibit containing username or email local part
// - Prohibit common passwords and simple patterns

export interface PasswordPolicyResult {
  ok: boolean;
  reasons: string[];
}

const COMMON_PASSWORDS = new Set([
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

function hasUpper(s: string) {
  return /[A-Z]/.test(s);
}
function hasLower(s: string) {
  return /[a-z]/.test(s);
}
function hasDigit(s: string) {
  return /\d/.test(s);
}
function hasSymbol(s: string) {
  return /[^A-Za-z0-9]/.test(s);
}

function containsSequentialChars(s: string): boolean {
  // Detect ascending sequences of length >= 3 (letters or digits)
  const lower = s.toLowerCase();
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
}

function containsRepetition(s: string): boolean {
  // Repeated same char 3+ or simple repeated groups like aaa111
  if (/(.)\1\1/.test(s)) return true;
  return false;
}

export function validatePassword(
  password: string,
  opts: { username?: string; email?: string; previousHashes?: string[] }
): PasswordPolicyResult {
  const reasons: string[] = [];
  const pwd = password || "";
  if (pwd.length < 8)
    reasons.push("Password must be at least 8 characters long.");

  const classes = [hasUpper(pwd), hasLower(pwd), hasDigit(pwd), hasSymbol(pwd)];
  const variety = classes.filter(Boolean).length;
  if (variety < 3)
    reasons.push(
      "Use at least 3 of: uppercase, lowercase, numbers, special characters."
    );

  const lpwd = pwd.toLowerCase();
  const uname = (opts.username || "").toLowerCase();
  if (uname && lpwd.includes(uname))
    reasons.push("Password may not contain the username.");
  const emailLocal = (opts.email || "").split("@")[0]?.toLowerCase?.() || "";
  if (emailLocal && emailLocal.length >= 3 && lpwd.includes(emailLocal))
    reasons.push("Password may not contain parts of your email.");

  if (COMMON_PASSWORDS.has(lpwd)) reasons.push("Password is too common.");
  if (containsSequentialChars(pwd))
    reasons.push("Avoid sequential characters like abc or 123.");
  if (containsRepetition(pwd))
    reasons.push("Avoid repetitive characters like aaa or 111.");

  if (opts.previousHashes && opts.previousHashes.length > 0) {
    // Cannot verify against previous hashes here without plaintexts; this check belongs in change-password flow.
    // Kept for interface completeness.
  }

  return { ok: reasons.length === 0, reasons };
}
