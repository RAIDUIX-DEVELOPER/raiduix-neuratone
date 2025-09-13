"use client";
import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import HeroButtons from "@/app/ui/HeroButtons";
export default function MinimalCinematicHero() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const visualRef = useRef<HTMLDivElement | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const smoothMousePos = useRef({ x: 0, y: 0 });

  // Visual background tuning (internal only; removed UI controls)
  const prefersReducedMotion = useMemo(
    () =>
      typeof window !== "undefined"
        ? window.matchMedia &&
          window.matchMedia("(prefers-reduced-motion: reduce)").matches
        : false,
    []
  );
  const [starCount, setStarCount] = useState(80);
  const [connectionDensity, setConnectionDensity] = useState(0.5);
  const [connectionsEnabled, setConnectionsEnabled] = useState(true);
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

  // Global mouse tracking (normalized -1..1)
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

  // Note: GIF tilt animations removed; we still track the mouse for background parallax.

  // Quick-start presets (links to /app?preset=...)
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
  // Continue session visibility: only when a valid lastPresetId exists in persisted store
  const [hasSession, setHasSession] = useState(false);
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

  // Spotlight coordinate tracker for buttons/links in this component
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

    // Adjust for reduced motion (apply once)
    if (prefersReducedMotion && !reducedAppliedRef.current) {
      reducedAppliedRef.current = true;
      setStarCount((n) => Math.max(40, Math.round(n * 0.6)));
      setConnectionsEnabled(false);
    }

    // Create animated starfield (respect dynamic star count)
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

    // Ephemeral sine-wave connections between nearby stars
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
    const starInUse = new Set<number>(); // ensure at most one connection per star

    const startTime = performance.now();

    function animate(currentTime: number) {
      if (!ctx) return;
      const elapsed = (currentTime - startTime) / 1000;

      // Smooth mouse position for starfield parallax
      smoothMousePos.current.x +=
        (mousePos.x - smoothMousePos.current.x) * 0.12;
      smoothMousePos.current.y +=
        (mousePos.y - smoothMousePos.current.y) * 0.12;

      ctx.clearRect(0, 0, w, h);

      stars.forEach((star) => {
        // Update position
        star.x += star.vx;
        star.y += star.vy;

        // Wrap around edges
        if (star.x < 0) star.x = w;
        if (star.x > w) star.x = 0;
        if (star.y < 0) star.y = h;
        if (star.y > h) star.y = 0;

        // Twinkling effect
        const twinkle = 0.6 + 0.4 * Math.sin(elapsed * 2 + star.twinkle);
        // Slightly brighter stars
        const finalAlpha = star.alpha * twinkle * 0.78;

        // Parallax effect based on mouse - stronger effect
        const parallaxStrength = 1 - star.size / 2; // Smaller stars move more
        const parallaxX =
          star.x + smoothMousePos.current.x * (parallaxStrength * 15);
        const parallaxY =
          star.y + smoothMousePos.current.y * (parallaxStrength * 15);

        // Draw star with glow
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

      // Randomly spawn new connections between close stars (dynamic density)
      const maxConnections = Math.round(14 * connectionDensityRef.current);
      const baseSpawnChance = 0.0035;
      const spawnChancePerPair = baseSpawnChance * connectionDensityRef.current;
      const minDist = 42; // avoid very tiny flickers
      const maxDist = 170; // slightly shorter reach
      const edgeMargin = 50; // px: exclude stars too close to viewport edge from forming links

      // If no connections active for a while, force-spawn one
      const idleSeconds = 4.5; // wait longer before forcing a link
      const anyActive = connections.length > 0;
      if (
        connectionsEnabledRef.current &&
        !anyActive &&
        Math.random() < 0.02 &&
        elapsed > idleSeconds
      ) {
        // pick nearest reasonable pair
        let bestI = -1,
          bestJ = -1,
          bestD = Infinity;
        for (let i = 0; i < stars.length; i++) {
          const si = stars[i];
          if (
            si.x < edgeMargin ||
            si.x > w - edgeMargin ||
            si.y < edgeMargin ||
            si.y > h - edgeMargin
          )
            continue;
          if (starInUse.has(i)) continue;
          for (let j = i + 1; j < stars.length; j++) {
            const dx = stars[i].x - stars[j].x;
            const dy = stars[i].y - stars[j].y;
            const distSq = dx * dx + dy * dy;
            if (distSq < maxDist * maxDist && distSq > minDist * minDist) {
              if (distSq < bestD) {
                bestD = distSq;
                bestI = i;
                bestJ = j;
              }
            }
          }
        }
        if (bestI !== -1) {
          const key = bestI + "-" + bestJ;
          if (
            !activePairKeys.has(key) &&
            !starInUse.has(bestI) &&
            !starInUse.has(bestJ)
          ) {
            const dist = Math.sqrt(bestD);
            // Waveform selection from enabled set
            let enabledList = Object.entries(waveformsRef.current)
              .filter(([, v]) => v)
              .map(([k]) => k as WaveKind);
            if (!enabledList.length) enabledList = ["sine"];
            const wave =
              enabledList[Math.floor(Math.random() * enabledList.length)];
            connections.push({
              a: bestI,
              b: bestJ,
              start: elapsed,
              duration: 2.8 + Math.random() * 2.4,
              amp:
                (2 + Math.min(6, dist / 28) * (0.3 + Math.random() * 0.4)) *
                waveIntensityRef.current,
              freq: 1.4 + Math.random() * 1.6,
              phase: Math.random() * Math.PI * 2,
              wave,
            });
            activePairKeys.add(key);
            starInUse.add(bestI);
            starInUse.add(bestJ);
          }
        }
      }
      if (
        connectionsEnabledRef.current &&
        connections.length < maxConnections
      ) {
        for (let i = 0; i < stars.length; i++) {
          const si = stars[i];
          if (
            si.x < edgeMargin ||
            si.x > w - edgeMargin ||
            si.y < edgeMargin ||
            si.y > h - edgeMargin
          )
            continue;
          if (starInUse.has(i)) continue;
          for (let j = i + 1; j < stars.length; j++) {
            const dx = stars[i].x - stars[j].x;
            const dy = stars[i].y - stars[j].y;
            const sj = stars[j];
            if (
              sj.x < edgeMargin ||
              sj.x > w - edgeMargin ||
              sj.y < edgeMargin ||
              sj.y > h - edgeMargin
            )
              continue;
            if (starInUse.has(j)) continue;
            const distSq = dx * dx + dy * dy;
            if (distSq < maxDist * maxDist && distSq > minDist * minDist) {
              if (Math.random() < spawnChancePerPair) {
                const key = i + "-" + j;
                if (!activePairKeys.has(key)) {
                  const dist = Math.sqrt(distSq);
                  let enabledList = Object.entries(waveformsRef.current)
                    .filter(([, v]) => v)
                    .map(([k]) => k as WaveKind);
                  if (!enabledList.length) enabledList = ["sine"];
                  const wave =
                    enabledList[Math.floor(Math.random() * enabledList.length)];
                  connections.push({
                    a: i,
                    b: j,
                    start: elapsed,
                    duration: 2.4 + Math.random() * 2.2, // shorter life
                    amp:
                      (2 +
                        Math.min(6, dist / 26) * (0.35 + Math.random() * 0.4)) *
                      waveIntensityRef.current,
                    freq: 1.3 + Math.random() * 1.8,
                    phase: Math.random() * Math.PI * 2,
                    wave,
                  });
                  activePairKeys.add(key);
                  starInUse.add(i);
                  starInUse.add(j);
                  if (connections.length >= maxConnections) break;
                }
              }
            }
          }
          if (connections.length >= maxConnections) break;
        }
      }

      // Draw & retire connections
      if (connectionsEnabledRef.current) {
        ctx.save();
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.globalCompositeOperation = "lighter";
        const now = elapsed;
        for (let k = connections.length - 1; k >= 0; k--) {
          const c = connections[k];
          const life = now - c.start;
          if (life > c.duration) {
            // remove
            const key = c.a + "-" + c.b;
            activePairKeys.delete(key);
            starInUse.delete(c.a);
            starInUse.delete(c.b);
            connections.splice(k, 1);
            continue;
          }
          const tNorm = life / c.duration;
          // Ease in/out alpha envelope
          let envelope = 1;
          if (tNorm < 0.25) envelope = tNorm / 0.25;
          else if (tNorm > 0.75) envelope = (1 - tNorm) / 0.25;
          envelope = Math.max(0, Math.min(1, envelope));

          const aStar = stars[c.a];
          const bStar = stars[c.b];
          if (!aStar || !bStar) continue;
          // If either star drifted near edge, retire early
          if (
            aStar.x < edgeMargin ||
            aStar.x > w - edgeMargin ||
            aStar.y < edgeMargin ||
            aStar.y > h - edgeMargin ||
            bStar.x < edgeMargin ||
            bStar.x > w - edgeMargin ||
            bStar.y < edgeMargin ||
            bStar.y > h - edgeMargin
          ) {
            const key = c.a + "-" + c.b;
            activePairKeys.delete(key);
            starInUse.delete(c.a);
            starInUse.delete(c.b);
            connections.splice(k, 1);
            continue;
          }
          // Current (possibly parallax-shifted) positions (reuse smoothing like stars)
          const parallaxStrengthA = 1 - aStar.size / 2;
          const parallaxStrengthB = 1 - bStar.size / 2;
          const ax =
            aStar.x + smoothMousePos.current.x * (parallaxStrengthA * 15);
          const ay =
            aStar.y + smoothMousePos.current.y * (parallaxStrengthA * 15);
          const bx =
            bStar.x + smoothMousePos.current.x * (parallaxStrengthB * 15);
          const by =
            bStar.y + smoothMousePos.current.y * (parallaxStrengthB * 15);

          const dx = bx - ax;
          const dy = by - ay;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 1) continue;
          const ux = dx / dist;
          const uy = dy / dist;
          const px = -uy; // perpendicular unit
          const py = ux;

          const segments = Math.min(28, Math.max(10, Math.round(dist / 12)));
          const waveAmp = c.amp * envelope;
          ctx.beginPath();
          for (let s = 0; s <= segments; s++) {
            const t = s / segments;
            const baseX = ax + ux * dist * t;
            const baseY = ay + uy * dist * t;
            // Taper amplitude toward ends with sin(pi*t)
            const taper = Math.sin(Math.PI * t);
            const arg = t * Math.PI * c.freq + now * 1.6 + c.phase;
            let waveVal: number;
            switch (c.wave) {
              case "saw": {
                const twoPi = Math.PI * 2;
                waveVal = ((arg % twoPi) / twoPi) * 2 - 1; // -1..1 ramp
                break;
              }
              case "square": {
                waveVal = Math.sin(arg) >= 0 ? 1 : -1;
                break;
              }
              case "triangle": {
                const twoPi = Math.PI * 2;
                const norm = (arg % twoPi) / twoPi; // 0..1
                waveVal =
                  1 - 4 * Math.abs(Math.round(norm - 0.25) - (norm - 0.25));
                break;
              }
              default:
                waveVal = Math.sin(arg); // sine
            }
            if (c.wave === "square" || c.wave === "saw") waveVal *= 0.7; // soften harsh waves
            const offset = waveVal * waveAmp * taper;
            const x = baseX + px * offset;
            const y = baseY + py * offset;
            if (s === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          // Slightly stronger link visibility
          const alpha =
            0.18 *
            envelope *
            Math.min(1.15, 0.6 + waveIntensityRef.current * 0.55);
          ctx.strokeStyle = `rgba(80, 230, 220, ${alpha})`;
          ctx.lineWidth = 0.55 + 0.35 * envelope; // thinner
          ctx.stroke();
        }
        ctx.restore();
      }

      animationId = requestAnimationFrame(animate);
    }
    animationId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", resize);
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [starCount, prefersReducedMotion]);

  return (
    <>
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#0A0F1C] via-[#0D1420] to-[#111827]">
        {/* Subtle starfield background */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 opacity-40"
          style={{ width: "100%", height: "100%" }}
        />

        {/* Ambient glow */}
        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-[rgba(56,189,179,0.05)] to-transparent" />
        {/* Content */}
        <div className="relative z-10 px-6 w-full max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            {/* Left: Title + copy + CTAs */}
            <div className="text-center md:text-left">
              {/* Top: Trust strip + Social buttons */}
              <div className="mb-6 flex flex-col gap-3">
                {/* Trust strip */}
                <div>
                  <div className="btn-shape inline-flex items-center gap-4 px-3 py-2 bg-[#0f172a]/50 text-[11px] text-slate-300/80">
                    <div className="flex items-center gap-1.5">
                      {/* Open-source icon */}
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        className="opacity-80"
                      >
                        <path d="M12 3a9 9 0 100 18 9 9 0 000-18z" />
                        <path d="M12 3v9l6 6" />
                      </svg>
                      <span>Open‑source</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {/* No sign-up icon */}
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        className="opacity-80"
                      >
                        <path d="M12 12a5 5 0 100-10 5 5 0 000 10z" />
                        <path d="M3 21a9 9 0 0118 0" />
                        <path d="M4 4l16 16" />
                      </svg>
                      <span>No sign‑up</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {/* Free icon */}
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        className="opacity-80"
                      >
                        <path d="M20 7l-8 10-4-4" />
                        <circle cx="12" cy="12" r="9" />
                      </svg>
                      <span>100% Free</span>
                    </div>
                  </div>
                </div>

                {/* Social buttons */}
                <div className="flex flex-row items-center gap-3 flex-wrap justify-start">
                  <a
                    href="https://github.com/RAIDUIX-DEVELOPER/raiduix-neuratone"
                    target="_blank"
                    rel="noopener noreferrer"
                    onMouseMove={handleSpotlightMouseMove}
                    className="spotlight btn-accent btn-shape inline-flex items-center justify-center gap-2 cursor-pointer w-40 h-11 text-[11px] font-medium tracking-wide text-teal-300/80 ring-1 ring-white/5 hover:text-teal-200 hover:ring-teal-400/30 transition-colors backdrop-blur-[15px] bg-[#121826]/50"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
                    </svg>
                    <span>GitHub</span>
                  </a>
                  <a
                    href="https://x.com/neuratone"
                    target="_blank"
                    rel="noopener noreferrer"
                    onMouseMove={handleSpotlightMouseMove}
                    className="spotlight spotlight-x btn-shape inline-flex items-center justify-center gap-2 cursor-pointer w-40 h-11 text-[11px] font-medium tracking-wide text-slate-300/70 ring-1 ring-white/5 hover:text-white hover:ring-slate-400/30 transition-colors backdrop-blur-[15px] bg-[#121826]/50"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M4 4l8 10.5L19 4l1 1.2L13.5 16H13L5 5.2 4 4z" />
                      <path d="M10 16l-3.5 4H4l4.5-6M14 16l3.5 4H20l-4.5-6" />
                    </svg>
                    <span>Follow on X</span>
                  </a>
                </div>
              </div>

              {/* Main title with light parallax */}
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.5, ease: [0.19, 0.82, 0.25, 1] }}
                style={{
                  transform: `perspective(1000px) rotateY(${
                    mousePos.x * 1.2
                  }deg) rotateX(${mousePos.y * -1.2}deg)`,
                }}
                className="text-6xl md:text-7xl lg:text-8xl font-bold mb-5 bg-gradient-to-br from-slate-200 via-teal-200 to-slate-400 bg-clip-text text-transparent leading-tight"
              >
                NeuraTone
              </motion.h1>

              {/* Description */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 0.8, y: 0 }}
                transition={{ duration: 1.2, delay: 0.8 }}
                className="text-base md:text-lg text-slate-300/80 mb-8 max-w-xl md:mx-0 mx-auto leading-relaxed"
              >
                Create calming, layered binaural & isochronic soundscapes in
                seconds. Free. No sign-up.
              </motion.p>

              {/* Action buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.2, delay: 1.0 }}
              >
                <HeroButtons showContinue={hasSession} />
              </motion.div>

              {/* Quick-start preset chips */}
              <div
                className="mt-6"
                role="group"
                aria-label="Quick start presets"
              >
                <div className="flex flex-wrap gap-2 justify-start">
                  {quickPresets.map((p) => (
                    <Link
                      key={p.key}
                      href={{ pathname: "/app", query: { preset: p.key } }}
                      prefetch
                      onMouseMove={handleSpotlightMouseMove}
                      className={`spotlight btn-shape cursor-pointer px-3 py-1.5 text-[11px] tracking-wide transition-colors border ${chipClasses(
                        p.key
                      )}`}
                      aria-label={`Start ${p.label} preset`}
                    >
                      {p.label}
                    </Link>
                  ))}
                </div>
              </div>

              {/* (Trust strip moved to the top block) */}
            </div>

            {/* Right: Product visual (larger, angled, overlaps behind text) */}
            <div className="relative">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{
                  duration: 1.2,
                  delay: 0.6,
                  ease: [0.19, 0.82, 0.25, 1],
                }}
                className="relative md:-mr-16 lg:-mr-24"
              >
                <div
                  ref={visualRef}
                  className="relative mx-auto w-[95%] md:w-[115%] lg:w-[125%] -z-10"
                  style={{
                    transformOrigin: "center left",
                    willChange: "transform",
                    transform: "translateX(-150px)",
                  }}
                >
                  <Image
                    src="/intro-visual.gif"
                    alt="Preview of the NeuraTone mixer interface"
                    width={1600}
                    height={900}
                    unoptimized
                    priority
                    className="w-full h-auto rounded-xl border border-white/10 shadow-[0_30px_90px_-20px_rgba(0,0,0,0.65)]"
                  />
                  {/* Soft glow */}
                  <div
                    className="pointer-events-none absolute inset-0 rounded-xl"
                    style={{
                      boxShadow:
                        "inset 0 1px 0 rgba(255,255,255,0.05), 0 0 100px rgba(56,189,179,0.10)",
                    }}
                  />
                </div>
              </motion.div>
            </div>
          </div>

          {/* Scroll indicator (absolute at bottom) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.55 }}
            transition={{ duration: 1, delay: 2 }}
            className="pointer-events-none"
          />
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
