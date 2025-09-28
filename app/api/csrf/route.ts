import { ensureCsrfToken } from "@/lib/security/csrf";

export async function GET() {
  const t = await ensureCsrfToken();
  // Note: Token is set in HttpOnly cookie; we also return it so client can echo in header.
  return Response.json({ token: t });
}
