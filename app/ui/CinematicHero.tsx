"use client";
import CinematicBackdrop from "@/app/ui/CinematicBackdrop";
import CinematicTitle from "@/app/ui/CinematicTitle";
import HeroButtons from "@/app/ui/HeroButtons";
import HeroPointerFlare from "@/app/ui/HeroPointerFlare";
import HeroWaves from "@/app/ui/HeroWaves";
import PerformanceToggle from "@/app/ui/PerformanceToggle";

export default function CinematicHero() {
  return (
    <section className="flex min-h-dvh flex-col items-center justify-center px-6 py-20 relative overflow-hidden cinematic-hero">
      {/* Background layers */}
      <div className="absolute inset-0 z-0">
        <CinematicBackdrop />
        <HeroWaves />
        <HeroPointerFlare />
      </div>

      {/* Foreground content */}
      <div className="relative z-10 flex flex-col items-center w-full">
        <CinematicTitle />
        <div className="mt-10" aria-label="Primary actions">
          <HeroButtons />
        </div>
        <div className="mt-16 flex flex-col items-center gap-4 text-[10px] tracking-wide font-medium text-slate-400/70 uppercase">
          <div className="h-px w-40 bg-gradient-to-r from-transparent via-slate-600/50 to-transparent" />
          <span className="animate-pulse">Scroll to Explore</span>
        </div>
      </div>

      {/* Performance toggle */}
      <PerformanceToggle />
    </section>
  );
}
