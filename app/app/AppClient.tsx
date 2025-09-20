"use client";
import React from "react";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/react";
import { useAppStore } from "@/lib/store";
import dynamic from "next/dynamic";

const Mixer = dynamic(() => import("@/app/app/ui/MixerNew"), { ssr: false });

export default function AppClient() {
  const setAppReady = useAppStore((s) => s.setAppReady);
  React.useEffect(() => {
    const t = setTimeout(() => setAppReady(true), 250);
    return () => clearTimeout(t);
  }, [setAppReady]);
  return (
    <div className="h-dvh relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <Script
        id="webapp-jsonld"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: "NeuraTone Mixer",
            applicationCategory: "MultimediaApplication",
            operatingSystem: "Web",
            offers: { "@type": "Offer", price: 0, priceCurrency: "USD" },
            url: "/app",
            description:
              "Build custom soundscapes with layered binaural beats, isochronic pulses, and noise.",
            publisher: { "@type": "Organization", name: "NeuraTone" },
          }),
        }}
      />
      {/* Cinematic backdrop */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(20,184,166,0.1)_0%,transparent_50%)]" />
        <div className="absolute inset-0 bg-[conic-gradient(from_180deg_at_50%_50%,transparent_0deg,rgba(20,184,166,0.05)_120deg,transparent_240deg)]" />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(20,184,166,0.15) 1px, transparent 0)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      {/* Main content */}
      <div className="relative z-10 h-full">
        <Mixer />
      </div>

      <Analytics />
    </div>
  );
}
