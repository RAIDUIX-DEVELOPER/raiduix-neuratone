import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/forum/auth";
import { verifyCsrf } from "@/lib/security/csrf";

// Server upload route: forwards request body to Vercel Blob.
// Suitable for files <= 4.5MB on Vercel Functions. For larger files, use client uploads.

export async function POST(request: Request) {
  try {
    await verifyCsrf();
  } catch {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }
  // Require authentication
  const sess = await getSession();
  if (!sess) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const filename = searchParams.get("filename") ?? `upload-${Date.now()}`;
  const contentType = request.headers.get("content-type") ?? undefined;

  // Enforce safe MIME types and max ~4.5MB (Function body limit). Prefer client uploads for larger files
  const allowed = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "audio/mpeg",
    "audio/wav",
    "audio/ogg",
    "video/mp4",
    "video/webm",
    "video/ogg",
  ]);
  if (!contentType || !allowed.has(contentType)) {
    return NextResponse.json(
      { error: "Unsupported content type" },
      { status: 400 }
    );
  }

  const blob = await put(filename, request.body!, {
    access: "public",
    addRandomSuffix: true,
    contentType,
  });

  return NextResponse.json(blob);
}
