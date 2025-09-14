import { NextResponse } from "next/server";

// This API has been retired. Respond with 410 Gone to prevent usage.
export async function GET() {
  return NextResponse.json(
    { error: "Pixabay audio API endpoint has been removed" },
    { status: 410 }
  );
}
