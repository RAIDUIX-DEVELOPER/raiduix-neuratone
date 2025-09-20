import { NextResponse } from "next/server";

// A compact, AI-friendly facts endpoint with stable keys
export async function GET() {
  const data = {
    name: "NeuraTone",
    category: "Web audio application",
    features: [
      "Binaural beats mixer",
      "Isochronic pulse generator",
      "Noise effects (white, pink, brown)",
      "Master bus compression & soft clip",
      "Presets: Sleep, Calm, Focus",
      "Mobile-friendly sticky controls",
    ],
    pricing: "Free",
    url: "/",
    appUrl: "/app",
    safety: [
      "Use comfortable volume",
      "Headphones recommended for binaurals",
      "Not medical advice",
    ],
  } as const;
  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
