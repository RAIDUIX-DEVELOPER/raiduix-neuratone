// Vercel Blob helpers (server-side)
// Docs: https://vercel.com/docs/storage/vercel-blob/using-blob-sdk

import {
  put,
  del,
  list,
  head,
  copy,
  type PutBlobResult,
  type ListBlobResult,
} from "@vercel/blob";

export type UploadOptions = {
  access?: "public";
  addRandomSuffix?: boolean;
  allowOverwrite?: boolean;
  contentType?: string;
  cacheControlMaxAge?: number;
};

export async function uploadBlob(
  pathname: string,
  body: ReadableStream | Blob | ArrayBuffer | string,
  options: UploadOptions = { access: "public", addRandomSuffix: true }
): Promise<PutBlobResult> {
  return put(pathname, body as any, {
    access: options.access ?? "public",
    addRandomSuffix: options.addRandomSuffix ?? true,
    allowOverwrite: options.allowOverwrite,
    contentType: options.contentType,
    cacheControlMaxAge: options.cacheControlMaxAge,
  });
}

export async function deleteBlob(urlOrPath: string | string[]): Promise<void> {
  await del(urlOrPath as any);
}

export async function getBlobMeta(urlOrPath: string) {
  return head(urlOrPath);
}

export async function listBlobs(prefix?: string) {
  const res: ListBlobResult = await list({ prefix });
  return res;
}

export async function copyBlob(fromUrlOrPath: string, toPathname: string) {
  return copy(fromUrlOrPath, toPathname, { access: "public" });
}
