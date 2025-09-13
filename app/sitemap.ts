import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

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
