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
  return <AppClient />;
}
