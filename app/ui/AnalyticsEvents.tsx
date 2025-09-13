"use client";
import { useEffect } from "react";

export default function AnalyticsEvents() {
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const el = target.closest<HTMLElement>("[data-analytics-event]");
      if (!el) return;
      const event = el.getAttribute("data-analytics-event") || "click";
      const label = el.getAttribute("data-analytics-label") || undefined;
      const props = label ? { label } : undefined;
      // Vercel Analytics runtime
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const va: any = (window as unknown as { va?: unknown }).va;
      if (va && typeof va.track === "function") {
        va.track(event, props);
      }
    }
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, []);
  return null;
}
