"use client";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { useCallback } from "react";
import { Play, RotateCcw } from "lucide-react";

export default function HeroButtons({
  showContinue = false,
}: {
  showContinue?: boolean;
}) {
  const router = useRouter();
  const setRouteLoading = useAppStore((s) => s.setRouteLoading);

  const handleHoverPrefetch = useCallback(() => {
    try {
      router.prefetch?.("/app");
    } catch {}
  }, [router]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
      const t = e.currentTarget as HTMLElement;
      const rect = t.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      t.style.setProperty("--x", `${x}%`);
      t.style.setProperty("--y", `${y}%`);
    },
    []
  );

  return (
    <div className="mt-10 flex flex-row items-center gap-3 flex-wrap justify-start">
      {/* Launch Mixer */}
      <button
        data-analytics-event="launch_mixer_click"
        onMouseEnter={handleHoverPrefetch}
        onMouseMove={handleMouseMove}
        onClick={() => {
          setRouteLoading(true);
          // small delay to display animation before navigation
          setTimeout(() => router.push("/app"), 50);
        }}
        className="group relative spotlight spotlight-launch focus-ring btn-shape inline-flex items-center justify-center cursor-pointer bg-[#121826]/70 w-40 h-11 text-sm font-medium text-orange-300 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.55),0_0_0_1px_rgba(251,191,36,0.25)] transition transform hover:scale-[1.02] hover:bg-[#1b2331] hover:text-amber-200 hover:border-amber-400/80 pl-6"
      >
        <Play
          aria-hidden="true"
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-90 group-hover:opacity-100 transition-opacity duration-200 text-amber-300/90"
        />
        Launch Mixer
      </button>
      {/* Continue last session (if available) */}
      {showContinue && (
        <button
          data-analytics-event="continue_click"
          onMouseEnter={handleHoverPrefetch}
          onMouseMove={handleMouseMove}
          onClick={() => {
            setRouteLoading(true);
            setTimeout(() => router.push("/app?continue=1"), 50);
          }}
          className="group relative spotlight btn-shape focus-ring inline-flex items-center justify-center cursor-pointer bg-[#102023]/70 w-48 h-11 text-sm font-medium text-teal-200/90 ring-1 ring-white/5 hover:text-teal-100 transition transform hover:scale-[1.02] hover:bg-[#113135] pl-7"
        >
          <RotateCcw
            aria-hidden="true"
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-90 group-hover:opacity-100 transition-opacity duration-200 text-teal-200/90"
          />
          Continue last session
        </button>
      )}
    </div>
  );
}
