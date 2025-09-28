import { cookies, headers as nextHeaders } from "next/headers";

const CSRF_COOKIE = "csrf_token";
const CSRF_HEADER = "x-csrf-token";

function randomToken() {
  return (
    Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
  );
}

export async function ensureCsrfToken(): Promise<string> {
  const store = await cookies();
  let token = store.get(CSRF_COOKIE)?.value;
  if (!token) {
    token = randomToken();
    store.set(CSRF_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24,
    });
  }
  return token;
}

export async function verifyCsrf() {
  const store = await cookies();
  const hdrs = await nextHeaders();
  const cookieToken = store.get(CSRF_COOKIE)?.value;
  const headerToken = hdrs.get(CSRF_HEADER);
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    throw new Error("CSRF token mismatch");
  }
}

export const CSRF = { COOKIE: CSRF_COOKIE, HEADER: CSRF_HEADER };
