import { validateUsernamePolicy } from "@/lib/forum/usernamePolicy";

describe("username policy", () => {
  it("accepts valid lowercase usernames", () => {
    const r = validateUsernamePolicy("valid.name_123");
    expect(r.ok).toBe(true);
    expect(r.normalized).toBe("valid.name_123");
  });
  it("rejects too short and invalid chars", () => {
    expect(validateUsernamePolicy("ab").ok).toBe(false);
    expect(validateUsernamePolicy("Bad-Name").ok).toBe(false);
  });
  it("rejects leading or trailing punctuation", () => {
    expect(validateUsernamePolicy(".abc").ok).toBe(false);
    expect(validateUsernamePolicy("abc_").ok).toBe(false);
  });
  it("rejects reserved words and banned substrings", () => {
    expect(validateUsernamePolicy("admin").ok).toBe(false);
    expect(validateUsernamePolicy("myfuckname").ok).toBe(false);
  });
});
