import type { Metadata } from "next";
import AppClient from "./AppClient";

export const metadata: Metadata = {
  title: "NeuraTone App — Mix Binaural & Isochronic Layers",
  description:
    "Build custom soundscapes with layered binaural beats, isochronic pulses, and noise. Free, no account.",
  alternates: { canonical: "/app" },
  openGraph: {
    type: "website",
    url: "/app",
    title: "NeuraTone App — Mix Binaural & Isochronic Layers",
    description:
      "Build custom soundscapes with layered binaural beats, isochronic pulses, and noise. Free, no account.",
    images: [
      { url: "/og-image.jpg", width: 1200, height: 630, alt: "NeuraTone" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "NeuraTone App — Mix Binaural & Isochronic Layers",
    description:
      "Build custom soundscapes with layered binaural beats, isochronic pulses, and noise. Free, no account.",
    images: [{ url: "/og-image.jpg", alt: "NeuraTone" }],
  },
};
export default function AppDashboard() {
  return (
    <>
      {/* Visually hidden content for accessibility and crawlability */}
      <section
        style={{
          position: "absolute",
          width: "1px",
          height: "1px",
          padding: 0,
          margin: "-1px",
          overflow: "hidden",
          clip: "rect(0, 0, 0, 0)",
          clipPath: "inset(50%)",
          border: 0,
          whiteSpace: "nowrap",
          pointerEvents: "none",
        }}
      >
        <h1>NeuraTone Mixer — Build Your Soundscape</h1>
        <p>
          Layer binaural beats, isochronic pulses, and ambience with
          professional audio effects. Use presets to start quickly, then tweak
          frequency, carriers, and modulation depth live in your browser.
        </p>
        <nav>
          <a href="/presets/calm">Calm preset</a>,
          <a href="/presets/focus"> Focus preset</a>,
          <a href="/presets/sleep"> Sleep preset</a>
        </nav>
      </section>
      <AppClient />
    </>
  );
}
