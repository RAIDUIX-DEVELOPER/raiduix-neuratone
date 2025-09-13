"use client";
import React from "react";
import { Analytics } from "@vercel/analytics/react";
import { useAppStore } from "@/lib/store";
import dynamic from "next/dynamic";

const Mixer = dynamic(() => import("@/app/app/ui/MixerNew"), { ssr: false });

export default function AppDashboard() {
  const layers = useAppStore((s) => s.layers);
  const setAppReady = useAppStore((s) => s.setAppReady);
  // when this page mounts, give the browser a tick to settle then mark ready
  // also when Mixer is dynamically loaded it triggers paint shortly after
  // we rely on a short timeout to ensure hydration is complete
  React.useEffect(() => {
    const t = setTimeout(() => setAppReady(true), 250);
    return () => clearTimeout(t);
  }, [setAppReady]);
  return (
    <div className="h-dvh relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Cinematic backdrop */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(20,184,166,0.1)_0%,transparent_50%)]" />
        <div className="absolute inset-0 bg-[conic-gradient(from_180deg_at_50%_50%,transparent_0deg,rgba(20,184,166,0.05)_120deg,transparent_240deg)]" />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(20,184,166,0.15) 1px, transparent 0)`,
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
