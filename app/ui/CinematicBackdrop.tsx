"use client";
import { useEffect, useRef } from "react";

/**
 * CinematicBackdrop
 * Layered visual atmosphere behind the hero: starfield + color bloom + film grain.
 * - Respects prefers-reduced-motion
 * - GPU-friendly (single canvas + lightweight CSS layers)
 */
export default function CinematicBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const starsRef = useRef<Star[]>([]);
  const mouse = useRef({ x: 0, y: 0 });
  const smooth = useRef({ x: 0, y: 0 });

  interface Star {
    x: number; // 0..1
    y: number; // 0..1
    z: number; // depth 0 (near) .. 1 (far)
    r: number; // radius px
    tw: number; // twinkle phase offset
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    let w = canvas.clientWidth;
    let h = canvas.clientHeight;
    function resize() {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    }
    resize();
    window.addEventListener("resize", resize);

    function seed() {
      const lowFx = document.documentElement.dataset.fx === "low";
      const count = lowFx ? 80 : reduce ? 120 : 240;
      starsRef.current = Array.from({ length: count }, () => ({
        x: Math.random(),
        y: Math.random(),
        z: Math.random(),
        r: Math.random() * 1.2 + 0.2,
        tw: Math.random() * Math.PI * 2,
      }));
    }
    seed();

    function onPointer(e: PointerEvent) {
      mouse.current.x = (e.clientX / window.innerWidth - 0.5) * 2; // -1..1
      mouse.current.y = (e.clientY / window.innerHeight - 0.5) * 2; // -1..1
    }
    window.addEventListener("pointermove", onPointer);

    const start = performance.now();
    function frame(t: number) {
      if (!ctx) return; // type guard
      const elapsed = (t - start) / 1000;
      smooth.current.x += (mouse.current.x - smooth.current.x) * 0.04;
      smooth.current.y += (mouse.current.y - smooth.current.y) * 0.04;
      ctx.clearRect(0, 0, w, h);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (const s of starsRef.current) {
        const depth = s.z * 0.85 + 0.15;
        const px = s.x - 0.5 + smooth.current.x * (0.018 * (1 - depth));
        const py = s.y - 0.5 + smooth.current.y * (0.012 * (1 - depth));
        const x = px * w + w / 2;
        const y = py * h + h / 2;
        const twinkle =
          0.55 + 0.45 * Math.sin(elapsed * (reduce ? 0.5 : 1.4) + s.tw);
        const r = s.r * (1 + (1 - depth) * 0.9) * twinkle;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r * 4);
        g.addColorStop(0, `rgba(180,255,250,${0.55 * twinkle})`);
        g.addColorStop(0.4, `rgba(56,189,179,${0.15 * twinkle})`);
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r * 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      frameRef.current = requestAnimationFrame(frame);
    }
    frameRef.current = requestAnimationFrame(frame);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointer);
    };
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_35%,rgba(18,230,200,0.22),rgba(10,15,28,0)_40%),radial-gradient(circle_at_72%_60%,rgba(99,102,241,0.18),rgba(10,15,28,0)_55%)] mix-blend-screen opacity-70" />
      <canvas
        ref={canvasRef}
        className="w-full h-full opacity-70 animate-[fadeIn_2s_ease] starfield-canvas"
        style={{ filter: "blur(0.5px) brightness(0.95)" }}
      />
      {/* Subtle vertical light sweep */}
      <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.04)_40%,rgba(255,255,255,0)_75%)] animate-lightSweep" />
      {/* Film grain */}
      <div className="absolute inset-0 mix-blend-overlay opacity-45 grain-layer" />
    </div>
  );
}
