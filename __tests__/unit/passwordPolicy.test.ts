import { validatePassword } from "@/lib/forum/passwordPolicy";

describe("password policy", () => {
  it("rejects short passwords", () => {
    const r = validatePassword("short", { username: "user", email: "u@e.com" });
    expect(r.ok).toBe(false);
  });
  it("requires variety of character classes", () => {
    const r = validatePassword("alllowercasepassword", {
      username: "user",
      email: "u@e.com",
    });
    expect(r.ok).toBe(false);
  });
  it("rejects containing username or email local part", () => {
    const r1 = validatePassword("userPASSWORD1!", {
      username: "user",
      email: "x@y.com",
    });
    expect(r1.ok).toBe(false);
    const r2 = validatePassword("john123!A", {
      username: "abc",
      email: "john@example.com",
    });
    expect(r2.ok).toBe(false);
  });
  it("accepts a strong password", () => {
    const r = validatePassword("S7rong-P@ssword", {
      username: "user",
      email: "u@e.com",
    });
    expect(r.ok).toBe(true);
  });
});
