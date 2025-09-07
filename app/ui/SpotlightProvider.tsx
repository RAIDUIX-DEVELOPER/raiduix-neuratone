"use client";
import { useEffect } from "react";

// Global spotlight pointer tracking for any element with class "spotlight"
export default function SpotlightProvider() {
  useEffect(() => {
    let raf = 0;
    const handler = (e: PointerEvent) => {
      // throttle with rAF
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const el = (e.target as HTMLElement)?.closest?.(
          ".spotlight"
        ) as HTMLElement | null;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        el.style.setProperty("--x", x + "%");
        el.style.setProperty("--y", y + "%");
      });
    };
    window.addEventListener("pointermove", handler, { passive: true });
    return () => {
      window.removeEventListener("pointermove", handler);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
  return null;
}
