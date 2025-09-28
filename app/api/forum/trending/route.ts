import { trendingTags } from "@/lib/forum/store";

export async function GET() {
  const tags = await trendingTags();
  return Response.json({ tags });
}
