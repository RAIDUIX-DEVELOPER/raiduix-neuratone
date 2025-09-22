import type { MetadataRoute } from "next";

function getSiteUrl() {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (envUrl) return envUrl;
  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) return `https://${vercelUrl}`;
  return "http://localhost:3000";
}

const SITE_URL = getSiteUrl();

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    "/",
    "/app",
    "/presets",
    "/presets/sleep",
    "/presets/calm",
    "/presets/focus",
    "/learn/what-are-binaural-beats",
    "/learn/isochronic-tones",
    "/learn/frequencies",
    "/learn/safety",
    "/faq",
  ];
  const now = new Date();
  return routes.map((path) => ({
    url: new URL(path, SITE_URL).toString(),
    lastModified: now,
    changeFrequency: "weekly",
    priority: path === "/" ? 1 : 0.6,
  }));
}
