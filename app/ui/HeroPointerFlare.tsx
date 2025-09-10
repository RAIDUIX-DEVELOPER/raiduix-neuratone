"use client";
import { useEffect, useRef } from "react";

/**
 * HeroPointerFlare
 * Soft lens flare / volumetric aura that trails pointer subtly.
 */
export default function HeroPointerFlare() {
  const ref = useRef<HTMLDivElement | null>(null);
  const pos = useRef({ x: 50, y: 50 });
  const smooth = useRef({ x: 50, y: 50 });
  const frame = useRef<number | null>(null);

  useEffect(() => {
    function move(e: PointerEvent) {
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      pos.current.x = x;
      pos.current.y = y;
    }
    window.addEventListener("pointermove", move);
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    function loop() {
      smooth.current.x += (pos.current.x - smooth.current.x) * 0.06;
      smooth.current.y += (pos.current.y - smooth.current.y) * 0.06;
      if (ref.current) {
        ref.current.style.setProperty("--flare-x", smooth.current.x + "%");
        ref.current.style.setProperty("--flare-y", smooth.current.y + "%");
      }
      frame.current = requestAnimationFrame(loop);
    }
    if (!reduce) frame.current = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener("pointermove", move);
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, []);
  return (
    <div
      ref={ref}
      className="pointer-events-none absolute inset-0 hero-pointer-flare"
      aria-hidden
    />
  );
}
