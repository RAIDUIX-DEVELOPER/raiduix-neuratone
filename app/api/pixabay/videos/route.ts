import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const key = process.env.PIXABAY_KEY;
  if (!key)
    return NextResponse.json({ error: "PIXABAY_KEY missing" }, { status: 500 });

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").toString();
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const per = Math.min(
    50,
    Math.max(3, parseInt(searchParams.get("per_page") || "24", 10) || 24)
  );
  const order = (searchParams.get("order") || "popular").toString();

  const upstream = new URL("https://pixabay.com/api/videos/");
  upstream.searchParams.set("key", key);
  if (q) upstream.searchParams.set("q", q);
  upstream.searchParams.set("video_type", "film");
  upstream.searchParams.set("safesearch", "true");
  upstream.searchParams.set("order", order);
  upstream.searchParams.set("page", String(page));
  upstream.searchParams.set("per_page", String(per));

  const r = await fetch(upstream.toString(), {
    headers: { Accept: "application/json" },
    next: { revalidate: 86400 },
  });
  if (!r.ok) {
    const text = await r.text();
    return NextResponse.json(
      { error: `Pixabay error ${r.status}`, details: text?.slice(0, 400) },
      { status: r.status }
    );
  }
  const data = await r.json();
  const res = NextResponse.json(data);
  res.headers.set(
    "Cache-Control",
    "public, max-age=0, s-maxage=86400, stale-while-revalidate=86400"
  );
  return res;
}
