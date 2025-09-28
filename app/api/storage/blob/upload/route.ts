import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/forum/auth";
import { verifyCsrf } from "@/lib/security/csrf";

// Client uploads helper route. Use with @vercel/blob/client upload() on the browser.
// IMPORTANT: Authenticate and authorize users before issuing tokens.

export async function POST(request: Request): Promise<NextResponse> {
  try {
    await verifyCsrf();
  } catch {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }
  // Require authentication (forum session). Prevent anonymous uploads.
  const sess = await getSession();
  if (!sess) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await request.json()) as HandleUploadBody;
  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname, _clientPayload, _multipart) => {
        // TODO: authorize the current user and validate clientPayload before issuing a token
        return {
          allowedContentTypes: [
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
          ],
          addRandomSuffix: true,
          maximumSizeInBytes: 25 * 1024 * 1024, // 25MB
        };
      },
      onUploadCompleted: async ({ blob /*, tokenPayload */ }) => {
        // TODO: persist blob.url to your database tied to the current user or entity
        // Note: This callback won't fire on localhost without tunneling (see docs)
        console.log("blob upload completed", blob.url);
      },
    });
    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 }
    );
  }
}
