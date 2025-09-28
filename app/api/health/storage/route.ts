import { NextResponse } from "next/server";
import { ecDigest } from "@/lib/storage/edgeConfig";
import { ecBatchUpdate } from "@/lib/storage/edgeConfigWrite";
import { list } from "@vercel/blob";

export async function GET() {
  const edgeConfigEnvPresent = !!process.env.EDGE_CONFIG;
  const writeEnvPresent =
    !!process.env.EDGE_CONFIG_ID && !!process.env.VERCEL_API_TOKEN;

  let ecReadOk = false;
  let ecWriteOk = false;
  let ecDigestStr: string | undefined;
  let ecLastTestKey: string | undefined;
  let ecWriteError: string | undefined;

  try {
    ecDigestStr = await ecDigest();
    ecReadOk = !!ecDigestStr;
  } catch {
    ecReadOk = false;
  }

  // Attempt a write (upsert then delete) to validate Edge Config write capability
  if (writeEnvPresent) {
    try {
      const key = `health:test:${Date.now()}`;
      await ecBatchUpdate([
        { operation: "upsert", key, value: { ts: Date.now() } },
      ]);
      await ecBatchUpdate([{ operation: "delete", key }]);
      ecWriteOk = true;
      ecLastTestKey = key;
    } catch (e: any) {
      ecWriteOk = false;
      ecWriteError = e?.message || String(e);
    }
  }

  // Blob check: ensure token present and that list works
  const blobTokenPresent = !!process.env.BLOB_READ_WRITE_TOKEN;
  let blobListOk = false;
  try {
    // A lightweight call that does not require existing blobs
    await list({ prefix: "health/", limit: 1 } as any);
    blobListOk = true;
  } catch {
    blobListOk = false;
  }

  return NextResponse.json({
    edgeConfig: {
      edgeConfigEnvPresent,
      readOk: ecReadOk,
      digest: ecDigestStr,
      writeEnvPresent,
      writeOk: ecWriteOk,
      lastTestKey: ecLastTestKey,
      writeError: ecWriteError,
    },
    blob: {
      tokenPresent: blobTokenPresent,
      listOk: blobListOk,
    },
  });
}
