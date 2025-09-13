"use client";
import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import Link from "next/link";
import HeroButtons from "@/app/ui/HeroButtons";
import HeroVisual from "@/app/ui/HeroVisual";
import { Play } from "lucide-react";
import { useAppStore } from "@/lib/store";

export default function MinimalCinematicHero() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const visualRef = useRef<HTMLDivElement | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const smoothMousePos = useRef({ x: 0, y: 0 });

  const prefersReducedMotion = useMemo(
    () =>
      typeof window !== "undefined"
        ? window.matchMedia &&
          window.matchMedia("(prefers-reduced-motion: reduce)").matches
        : false,
    []
  );
  const [starCount, setStarCount] = useState(70);
  const [connectionDensity] = useState(0.4);
  const [connectionsEnabled, setConnectionsEnabled] = useState(false);
  const connectionDensityRef = useRef(connectionDensity);
  const connectionsEnabledRef = useRef(connectionsEnabled);
  const reducedAppliedRef = useRef(false);
  useEffect(() => {
    connectionDensityRef.current = connectionDensity;
  }, [connectionDensity]);
  useEffect(() => {
    connectionsEnabledRef.current = connectionsEnabled;
  }, [connectionsEnabled]);
  type WaveKind = "sine" | "triangle" | "saw" | "square";
  const [waveforms, setWaveforms] = useState<Record<WaveKind, boolean>>({
    sine: true,
    triangle: true,
    saw: false,
    square: false,
  });
  const [waveIntensity, setWaveIntensity] = useState(1);
  const waveformsRef = useRef(waveforms);
  const waveIntensityRef = useRef(waveIntensity);
  useEffect(() => {
    waveformsRef.current = waveforms;
  }, [waveforms]);
  useEffect(() => {
    waveIntensityRef.current = waveIntensity;
  }, [waveIntensity]);

  // Enable connections by default when motion is allowed
  useEffect(() => {
    if (!prefersReducedMotion) setConnectionsEnabled(true);
  }, [prefersReducedMotion]);

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      setMousePos({
        x: (e.clientX / window.innerWidth - 0.5) * 2,
        y: (e.clientY / window.innerHeight - 0.5) * 2,
      });
    }
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const quickPresets = useMemo(
    () => [
      { key: "sleep", label: "Sleep" },
      { key: "calm", label: "Calm" },
      { key: "focus", label: "Focus" },
    ],
    []
  );
  const chipClasses = (key: string) => {
    switch (key) {
      case "sleep":
        return "bg-violet-500/15 hover:bg-violet-500/25 text-violet-200/90 hover:text-violet-100 border-violet-400/25";
      case "calm":
        return "bg-teal-500/15 hover:bg-teal-500/25 text-teal-200/90 hover:text-teal-100 border-teal-400/25";
      case "focus":
        return "bg-sky-500/15 hover:bg-sky-500/25 text-sky-200/90 hover:text-sky-100 border-sky-400/25";
      default:
        return "bg-[#121826]/60 hover:bg-[#1b2331] text-slate-200/90 border-white/10";
    }
  };

  const [hasSession, setHasSession] = useState(false);
  const setRouteLoading = useAppStore((s) => s.setRouteLoading);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem("neuratone-store");
      if (!raw) return;
      let parsed: any;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return;
      }
      const state = parsed?.state ?? parsed;
      const lastId: string | null | undefined = state?.lastPresetId;
      const presets: any[] = Array.isArray(state?.presets) ? state.presets : [];
      const hasValid = !!lastId && presets.some((p) => p?.id === lastId);
      setHasSession(hasValid);
    } catch {}
  }, []);

  const handleSpotlightMouseMove = useCallback(
    (e: ReactMouseEvent<HTMLElement>) => {
      const t = e.currentTarget as HTMLElement;
      const rect = t.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      t.style.setProperty("--x", `${x}%`);
      t.style.setProperty("--y", `${y}%`);
    },
    []
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = canvas.clientWidth;
    let h = canvas.clientHeight;
    const stars: Array<{
      x: number;
      y: number;
      size: number;
      alpha: number;
      vx: number;
      vy: number;
      twinkle: number;
    }> = [];
    let animationId: number;

    function resize() {
      if (!canvas || !ctx) return;
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

    if (prefersReducedMotion && !reducedAppliedRef.current) {
      reducedAppliedRef.current = true;
      setStarCount((n) => Math.max(40, Math.round(n * 0.6)));
      setConnectionsEnabled(false);
    }

    for (let i = 0; i < starCount; i++) {
      stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        size: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.8 + 0.2,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        twinkle: Math.random() * Math.PI * 2,
      });
    }

    interface Connection {
      a: number;
      b: number;
      start: number;
      duration: number;
      amp: number;
      freq: number;
      phase: number;
      wave: WaveKind;
    }
    const connections: Connection[] = [];
    const activePairKeys = new Set<string>();
    const starInUse = new Set<number>();

    const startTime = performance.now();

    function animate(currentTime: number) {
      if (!ctx) return;
      const elapsed = (currentTime - startTime) / 1000;

      smoothMousePos.current.x +=
        (mousePos.x - smoothMousePos.current.x) * 0.12;
      smoothMousePos.current.y +=
        (mousePos.y - smoothMousePos.current.y) * 0.12;

      ctx.clearRect(0, 0, w, h);

      stars.forEach((star) => {
        star.x += star.vx;
        star.y += star.vy;
        if (star.x < 0) star.x = w;
        if (star.x > w) star.x = 0;
        if (star.y < 0) star.y = h;
        if (star.y > h) star.y = 0;

        const twinkle = 0.6 + 0.4 * Math.sin(elapsed * 2 + star.twinkle);
        // Increase star glow visibility by ~10%
        const finalAlpha = star.alpha * twinkle * 0.858; // 0.78 * 1.1

        const parallaxStrength = 1 - star.size / 2;
        const parallaxX =
          star.x + smoothMousePos.current.x * (parallaxStrength * 15);
        const parallaxY =
          star.y + smoothMousePos.current.y * (parallaxStrength * 15);

        const gradient = ctx.createRadialGradient(
          parallaxX,
          parallaxY,
          0,
          parallaxX,
          parallaxY,
          star.size * 3.2
        );
        gradient.addColorStop(0, `rgba(180, 255, 250, ${finalAlpha})`);
        gradient.addColorStop(0.4, `rgba(56, 189, 179, ${finalAlpha * 0.5})`);
        gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(parallaxX, parallaxY, star.size * 2, 0, Math.PI * 2);
        ctx.fill();
      });

      // Animated connections between nearby stars (sine/triangle/saw/square)
      if (connectionsEnabledRef.current) {
        const maxConnections = Math.max(
          6,
          Math.round(12 * connectionDensityRef.current)
        );
        const spawnChance = 0.0025 * connectionDensityRef.current;
        const minDist = 48;
        const maxDist = 180;
        const edgeMargin = 75; // block connections near viewport edges

        // Try to spawn a few connections per frame (bounded by maxConnections)
        if (connections.length < maxConnections) {
          outer: for (let i = 0; i < stars.length; i++) {
            if (connections.length >= maxConnections) break;
            for (let j = i + 1; j < stars.length; j++) {
              const a = stars[i];
              const b = stars[j];
              // Skip if either star is within the edge exclusion zone
              if (
                a.x < edgeMargin ||
                a.x > w - edgeMargin ||
                a.y < edgeMargin ||
                a.y > h - edgeMargin ||
                b.x < edgeMargin ||
                b.x > w - edgeMargin ||
                b.y < edgeMargin ||
                b.y > h - edgeMargin
              ) {
                continue;
              }
              const dx = a.x - b.x;
              const dy = a.y - b.y;
              const d2 = dx * dx + dy * dy;
              if (d2 < maxDist * maxDist && d2 > minDist * minDist) {
                if (Math.random() < spawnChance) {
                  const key = i + "-" + j;
                  if (
                    activePairKeys.has(key) ||
                    starInUse.has(i) ||
                    starInUse.has(j)
                  )
                    continue;
                  // Choose waveform
                  let enabled = Object.entries(waveformsRef.current)
                    .filter(([, v]) => v)
                    .map(([k]) => k as WaveKind);
                  if (!enabled.length) enabled = ["sine"];
                  const wave =
                    enabled[Math.floor(Math.random() * enabled.length)];
                  const dist = Math.sqrt(d2);
                  connections.push({
                    a: i,
                    b: j,
                    start: elapsed,
                    duration: 2.4 + Math.random() * 2.6,
                    amp:
                      (2 + Math.min(6, dist / 30)) *
                      (0.35 + Math.random() * 0.4) *
                      waveIntensityRef.current,
                    freq: 1.2 + Math.random() * 1.6,
                    phase: Math.random() * Math.PI * 2,
                    wave,
                  });
                  activePairKeys.add(key);
                  starInUse.add(i);
                  starInUse.add(j);
                }
              }
            }
          }
        }

        // Draw and retire connections
        ctx.save();
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.globalCompositeOperation = "lighter";
        for (let k = connections.length - 1; k >= 0; k--) {
          const c = connections[k];
          const life = elapsed - c.start;
          if (life > c.duration) {
            const key = c.a + "-" + c.b;
            activePairKeys.delete(key);
            starInUse.delete(c.a);
            starInUse.delete(c.b);
            connections.splice(k, 1);
            continue;
          }
          const tNorm = Math.max(0, Math.min(1, life / c.duration));
          // ease in/out envelope
          const env =
            tNorm < 0.25 ? tNorm / 0.25 : tNorm > 0.75 ? (1 - tNorm) / 0.25 : 1;

          const a = stars[c.a];
          const b = stars[c.b];
          if (!a || !b) continue;

          // If either star drifted near the edge, retire this connection early
          const edgeMargin = 75;
          if (
            a.x < edgeMargin ||
            a.x > w - edgeMargin ||
            a.y < edgeMargin ||
            a.y > h - edgeMargin ||
            b.x < edgeMargin ||
            b.x > w - edgeMargin ||
            b.y < edgeMargin ||
            b.y > h - edgeMargin
          ) {
            const key = c.a + "-" + c.b;
            activePairKeys.delete(key);
            starInUse.delete(c.a);
            starInUse.delete(c.b);
            connections.splice(k, 1);
            continue;
          }

          // Parallax-adjusted endpoints
          const strA = 1 - a.size / 2;
          const strB = 1 - b.size / 2;
          const ax = a.x + smoothMousePos.current.x * (strA * 15);
          const ay = a.y + smoothMousePos.current.y * (strA * 15);
          const bx = b.x + smoothMousePos.current.x * (strB * 15);
          const by = b.y + smoothMousePos.current.y * (strB * 15);

          const dx = bx - ax;
          const dy = by - ay;
          const dist = Math.hypot(dx, dy);
          if (dist < 1) continue;
          const ux = dx / dist;
          const uy = dy / dist;
          const px = -uy;
          const py = ux;

          const segs = Math.min(28, Math.max(12, Math.round(dist / 14)));
          ctx.beginPath();
          for (let s = 0; s <= segs; s++) {
            const t = s / segs;
            const baseX = ax + ux * dist * t;
            const baseY = ay + uy * dist * t;
            const taper = Math.sin(Math.PI * t);
            const arg = t * Math.PI * c.freq + elapsed * 1.6 + c.phase;
            let waveVal: number;
            switch (c.wave) {
              case "saw": {
                const twoPi = Math.PI * 2;
                waveVal = ((arg % twoPi) / twoPi) * 2 - 1;
                break;
              }
              case "square":
                waveVal = Math.sin(arg) >= 0 ? 1 : -1;
                break;
              case "triangle": {
                const twoPi = Math.PI * 2;
                const norm = (arg % twoPi) / twoPi;
                waveVal =
                  1 - 4 * Math.abs(Math.round(norm - 0.25) - (norm - 0.25));
                break;
              }
              default:
                waveVal = Math.sin(arg);
            }
            if (c.wave === "square" || c.wave === "saw") waveVal *= 0.7; // soften
            const offset = waveVal * c.amp * env * taper;
            const x = baseX + px * offset;
            const y = baseY + py * offset;
            if (s === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          // Slightly stronger link visibility (~10%)
          const alpha =
            0.198 * env * Math.min(1.15, 0.6 + waveIntensityRef.current * 0.55);
          ctx.strokeStyle = `rgba(80, 230, 220, ${alpha})`;
          ctx.lineWidth = 0.6 + 0.4 * env;
          ctx.stroke();
        }
        ctx.restore();
      }

      animationId = requestAnimationFrame(animate);
    }
    animationId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", resize);
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [starCount, prefersReducedMotion]);

  // Intro animation variants for quick preset chips
  const chipsContainerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.07, delayChildren: 1.1 },
    },
  } as const;
  const chipItemVariants = {
    hidden: { opacity: 0, y: 6 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.2, 0.8, 0.2, 1] },
    },
  } as const;

  return (
    <>
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#0A0F1C] via-[#0D1420] to-[#111827] pt-28 md:pt-32 pb-28 md:pb-40">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 opacity-30"
          style={{ width: "100%", height: "100%" }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(60%_40%_at_50%_0%,rgba(56,189,179,0.08),rgba(0,0,0,0))]" />
        <div className="relative z-10 px-6 w-full max-w-5xl">
          <div className="flex flex-col items-center text-center gap-6">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2, delay: 0.4 }}
              className="text-3xl md:text-5xl lg:text-6xl font-semibold tracking-tight text-slate-200/95 max-w-4xl mx-auto leading-tight"
            >
              Create calming, layered binaural & isochronic soundscapes in
              seconds. Free. No sign‑up.
            </motion.h1>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2, delay: 0.8 }}
            >
              <HeroButtons showContinue={hasSession} />
            </motion.div>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 0.7, y: 0 }}
              transition={{ duration: 1, delay: 1.0 }}
              className="text-[12px] text-slate-300/70"
            >
              Open‑source · No sign‑up · 100% Free
            </motion.p>

            {/* Helper line for presets */}
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 0.7, y: 0 }}
              transition={{ duration: 0.8, delay: 1.0 }}
              className="text-[12px] text-slate-300/70 mt-1"
            >
              Try one of our presets to get started
            </motion.p>

            {/* Quick-start preset chips with intro animation */}
            <div className="mt-0" role="group" aria-label="Quick start presets">
              <motion.div
                className="flex flex-wrap gap-3 md:gap-4 justify-center"
                variants={chipsContainerVariants}
                initial="hidden"
                animate="show"
              >
                {quickPresets.map((p) => (
                  <motion.div key={p.key} variants={chipItemVariants}>
                    <Link
                      href={{ pathname: "/app", query: { preset: p.key } }}
                      prefetch
                      data-analytics-event="preset_chip_click"
                      data-analytics-label={p.key}
                      onMouseMove={handleSpotlightMouseMove}
                      onClick={() => {
                        try {
                          setRouteLoading(true);
                        } catch {}
                      }}
                      className={`group spotlight btn-shape inline-flex items-center gap-1.5 cursor-pointer px-3 py-1.5 text-[11px] tracking-wide transition-colors border opacity-90 ${chipClasses(
                        p.key
                      )}`}
                      aria-label={`Start ${p.label} preset`}
                    >
                      <Play
                        aria-hidden="true"
                        className="h-3.5 w-3.5 opacity-90 group-hover:opacity-100 transition-opacity duration-200"
                      />
                      <span>{p.label}</span>
                    </Link>
                  </motion.div>
                ))}
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2, delay: 0.6 }}
              className="relative w-full max-w-5xl mx-auto pt-4"
            >
              <div ref={visualRef} className="relative mx-auto w-full z-0">
                <HeroVisual className="w-full h-auto rounded-xl border border-white/10 shadow-[0_30px_90px_-20px_rgba(0,0,0,0.65)]" />
                <div
                  className="pointer-events-none absolute inset-0 rounded-xl"
                  style={{
                    boxShadow:
                      "inset 0 1px 0 rgba(255,255,255,0.05), 0 0 120px rgba(56,189,179,0.12)",
                  }}
                />
              </div>
            </motion.div>
          </div>
        </div>

        <motion.div
          aria-hidden="true"
          initial={{ y: 4 }}
          animate={{ y: [4, -6, 4] }}
          transition={{
            duration: 3.2,
            delay: 2.2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{ opacity: 0.55 }}
          className="absolute bottom-[50px] left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-10"
        >
          <div className="w-px h-12 bg-gradient-to-t from-teal-400/50 via-teal-400/20 to-transparent" />
          <span className="text-[11px] tracking-[0.25em] text-teal-300/50 uppercase font-medium">
            Learn More
          </span>
        </motion.div>
      </section>
    </>
  );
}
