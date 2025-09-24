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
    { path: "/", priority: 1.0, changeFrequency: "weekly" as const },
    { path: "/app", priority: 0.9, changeFrequency: "weekly" as const },
    { path: "/presets", priority: 0.8, changeFrequency: "monthly" as const },
    { path: "/presets/sleep", priority: 0.8, changeFrequency: "monthly" as const },
    { path: "/presets/calm", priority: 0.8, changeFrequency: "monthly" as const },
    { path: "/presets/focus", priority: 0.8, changeFrequency: "monthly" as const },
    { path: "/learn/what-are-binaural-beats", priority: 0.7, changeFrequency: "monthly" as const },
    { path: "/learn/isochronic-tones", priority: 0.7, changeFrequency: "monthly" as const },
    { path: "/learn/frequencies", priority: 0.7, changeFrequency: "monthly" as const },
    { path: "/learn/safety", priority: 0.7, changeFrequency: "monthly" as const },
    { path: "/faq", priority: 0.6, changeFrequency: "monthly" as const },
  ];
  
  const now = new Date();
  
  return routes.map((route) => ({
    url: new URL(route.path, SITE_URL).toString(),
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
