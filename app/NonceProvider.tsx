import { headers } from "next/headers";

export async function getNonce(): Promise<string | null> {
  const h = await headers();
  return h.get("x-nonce");
}
