import { NextRequest } from "next/server";
import { searchPosts } from "@/lib/forum/store";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") || "";
  const posts = await searchPosts(q);
  return Response.json({ posts });
}
