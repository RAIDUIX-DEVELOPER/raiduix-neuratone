"use client";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import HeroButtons from "@/app/ui/HeroButtons";

export default function MinimalCinematicHero() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const smoothMousePos = useRef({ x: 0, y: 0 });

  // User-adjustable particle controls
  const [starCount, setStarCount] = useState(80);
  const [connectionDensity, setConnectionDensity] = useState(0.5); // multiplier (default lowered)
  const [connectionsEnabled, setConnectionsEnabled] = useState(true);
  const connectionDensityRef = useRef(connectionDensity);
  const connectionsEnabledRef = useRef(connectionsEnabled);
  useEffect(() => {
    connectionDensityRef.current = connectionDensity;
  }, [connectionDensity]);
  useEffect(() => {
    connectionsEnabledRef.current = connectionsEnabled;
  }, [connectionsEnabled]);
  const [controlsOpen, setControlsOpen] = useState(false);
  // Waveform + intensity controls
  type WaveKind = "sine" | "triangle" | "saw" | "square";
  const [waveforms, setWaveforms] = useState<Record<WaveKind, boolean>>({
    sine: true,
    triangle: true,
    saw: false,
    square: false,
  });
  const [waveIntensity, setWaveIntensity] = useState(1); // scales amplitude
  const waveformsRef = useRef(waveforms);
  const waveIntensityRef = useRef(waveIntensity);
  useEffect(() => {
    waveformsRef.current = waveforms;
  }, [waveforms]);
  useEffect(() => {
    waveIntensityRef.current = waveIntensity;
  }, [waveIntensity]);

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

      // Smooth mouse movement
      smoothMousePos.current.x += (mousePos.x - smoothMousePos.current.x) * 0.1;
      smoothMousePos.current.y += (mousePos.y - smoothMousePos.current.y) * 0.1;

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
        const finalAlpha = star.alpha * twinkle * 0.7;

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
          star.size * 3
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
          const alpha =
            0.16 *
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

    function handleMouseMove(e: MouseEvent) {
      setMousePos({
        x: (e.clientX / window.innerWidth - 0.5) * 2,
        y: (e.clientY / window.innerHeight - 0.5) * 2,
      });
    }
    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [starCount]);

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
        <div className="relative z-10 text-center px-6 max-w-4xl">
          {/* Subtitle */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 0.7, y: 0 }}
            transition={{ duration: 1.2, delay: 0.3 }}
            className="mb-8"
          >
            <span className="text-xs uppercase tracking-[0.3em] text-teal-300/60 font-medium">
              by Raiduix
            </span>
          </motion.div>

          {/* Main title with parallax */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.5, ease: [0.19, 0.82, 0.25, 1] }}
            style={{
              transform: `perspective(1000px) rotateY(${
                mousePos.x * 2
              }deg) rotateX(${mousePos.y * -2}deg)`,
            }}
            className="text-6xl md:text-8xl font-bold mb-6 bg-gradient-to-br from-slate-200 via-teal-200 to-slate-400 bg-clip-text text-transparent leading-tight"
          >
            NeuraTone
          </motion.h1>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 0.8, y: 0 }}
            transition={{ duration: 1.2, delay: 0.8 }}
            className="text-lg md:text-xl text-slate-300/70 mb-12 max-w-2xl mx-auto leading-relaxed"
          >
            Open‑source, 100% free layered binaural & isochronic soundscapes
          </motion.p>

          {/* Action buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 1.2 }}
          >
            <HeroButtons />
          </motion.div>

          {/* Scroll indicator (relocated absolute at bottom) */}
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
      {/* Collapsible Particle Controls */}
      <div className="pointer-events-none">
        <div
          className={`fixed top-4 right-4 z-40 w-64 text-[11px] font-medium ${
            controlsOpen ? "pointer-events-auto" : "pointer-events-auto"
          }`}
        >
          <button
            onClick={() => setControlsOpen((o) => !o)}
            className="w-full flex items-center justify-between rounded-md bg-[#16202e]/70 border border-white/10 px-3 py-2 text-slate-300 hover:bg-[#1d2936]/80 backdrop-blur-sm transition"
          >
            <span className="tracking-wide">Particle Controls</span>
            <span className="text-teal-300 text-xs">
              {controlsOpen ? "−" : "+"}
            </span>
          </button>
          {controlsOpen && (
            <div className="mt-2 space-y-4 rounded-md bg-[#101823]/90 border border-white/10 p-3 backdrop-blur-md shadow-lg">
              <div>
                <label className="flex items-center justify-between mb-1">
                  <span className="text-slate-400">Stars</span>
                  <span className="text-teal-300 tabular-nums">
                    {starCount}
                  </span>
                </label>
                <input
                  type="range"
                  min={40}
                  max={160}
                  value={starCount}
                  onChange={(e) => setStarCount(parseInt(e.target.value))}
                  className="w-full accent-teal-400"
                />
              </div>
              <div>
                <label className="flex items-center justify-between mb-1">
                  <span className="text-slate-400">Connection Density</span>
                  <span className="text-teal-300 tabular-nums">
                    {connectionDensity.toFixed(1)}
                  </span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={2}
                  step={0.1}
                  value={connectionDensity}
                  onChange={(e) =>
                    setConnectionDensity(parseFloat(e.target.value))
                  }
                  className="w-full accent-teal-400"
                />
              </div>
              <div className="flex items-center justify-between">
                <label htmlFor="toggle-connections" className="text-slate-400">
                  Connections
                </label>
                <input
                  id="toggle-connections"
                  type="checkbox"
                  checked={connectionsEnabled}
                  onChange={(e) => setConnectionsEnabled(e.target.checked)}
                  className="accent-teal-400 h-4 w-4"
                />
              </div>
              <div>
                <span className="block mb-1 text-slate-400">Waveforms</span>
                <div className="flex flex-wrap gap-2">
                  {(["sine", "triangle", "saw", "square"] as WaveKind[]).map(
                    (w) => (
                      <button
                        key={w}
                        onClick={() =>
                          setWaveforms((prev) => ({ ...prev, [w]: !prev[w] }))
                        }
                        className={`px-2 py-1 rounded text-[10px] border transition ${
                          waveforms[w]
                            ? "bg-teal-500/20 border-teal-400/40 text-teal-200"
                            : "bg-slate-600/10 border-white/10 text-slate-400 hover:border-white/20"
                        }`}
                      >
                        {w}
                      </button>
                    )
                  )}
                </div>
              </div>
              <div>
                <label className="flex items-center justify-between mb-1">
                  <span className="text-slate-400">Wave Intensity</span>
                  <span className="text-teal-300 tabular-nums">
                    {waveIntensity.toFixed(1)}
                  </span>
                </label>
                <input
                  type="range"
                  min={0.3}
                  max={2}
                  step={0.1}
                  value={waveIntensity}
                  onChange={(e) => setWaveIntensity(parseFloat(e.target.value))}
                  className="w-full accent-teal-400"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => {
                    setStarCount(80);
                    setConnectionDensity(0.5);
                    setConnectionsEnabled(true);
                    setWaveforms({
                      sine: true,
                      triangle: true,
                      saw: false,
                      square: false,
                    });
                    setWaveIntensity(1);
                  }}
                  className="flex-1 rounded bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 py-1 transition border border-teal-400/20"
                >
                  Reset
                </button>
                <button
                  onClick={() => setControlsOpen(false)}
                  className="flex-1 rounded bg-slate-500/10 hover:bg-slate-500/20 text-slate-300 py-1 transition border border-white/10"
                >
                  Close
                </button>
              </div>
              <p className="text-[10px] leading-snug text-slate-500 pt-1">
                Adjust visual intensity. Values persist until page refresh.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
