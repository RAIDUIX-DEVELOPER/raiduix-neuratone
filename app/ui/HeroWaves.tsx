"use client";
import { useEffect, useRef } from "react";

/**
 * HeroWaves renders a very soft animated multi-line waveform background.
 * Subtle by design: low opacity, slow phase drift, respects prefers-reduced-motion.
 */
export function HeroWaves() {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const mouseX = useRef(0); // -0.5 .. 0.5
  const mouseY = useRef(0); // 0 .. 1
  const smoothX = useRef(0);
  const smoothY = useRef(0);
  // Interaction state for elastic + ripple effect
  const pointerXNorm = useRef(0.5); // 0..1
  const grabbing = useRef(false);
  const stickProgress = useRef(0); // 0..1 ease-in when sticking
  const lastMoveTime = useRef(0);
  interface Ripple {
    startX: number;
    startTime: number;
    amp: number;
  }
  const ripples = useRef<Ripple[]>([]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    let w = canvas.clientWidth;
    let h = canvas.clientHeight;

    function resize() {
      if (!canvas || !ctx) return;
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    }
    resize();
    window.addEventListener("resize", resize);
    function onPointerMove(e: PointerEvent) {
      mouseX.current = e.clientX / window.innerWidth - 0.5;
      mouseY.current = e.clientY / window.innerHeight; // 0 top -> 1 bottom
      pointerXNorm.current = e.clientX / window.innerWidth;
      grabbing.current = true;
      lastMoveTime.current = performance.now();
    }
    window.addEventListener("pointermove", onPointerMove);

    // Parameters
    const LINES = 5;
    // Slightly larger amplitude for clearer (still soft) movement
    const baseAmplitude = reduceMotion ? 18 : 36; // px (slightly higher for more motion)
    const baseFreq = reduceMotion ? 0.0034 : 0.0052; // slight increase in spatial frequency
    const gradient = ctx.createLinearGradient(0, 0, w, 0);
    gradient.addColorStop(0, "rgba(20,184,166,0.32)");
    gradient.addColorStop(0.5, "rgba(99,102,241,0.24)");
    gradient.addColorStop(1, "rgba(20,184,166,0.32)");

    const start = performance.now();

    function draw(t: number) {
      if (!ctx) return;
      const elapsed = (t - start) / 1000; // seconds
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      // Update interaction state
      const nowMs = performance.now();
      const inactiveFor = nowMs - lastMoveTime.current;
      const releaseDelay = 180; // ms before releasing stick
      if (grabbing.current) {
        stickProgress.current += (1 - stickProgress.current) * 0.2; // faster ramp for stronger stick
        if (inactiveFor > releaseDelay && stickProgress.current > 0.18) {
          // Release -> spawn ripple
          ripples.current.push({
            startX: pointerXNorm.current,
            startTime: elapsed,
            amp: 0.35 * stickProgress.current,
          });
          grabbing.current = false;
        }
      } else if (stickProgress.current > 0.0001) {
        stickProgress.current *= 0.9; // decay
      }
      // Trim old ripples
      ripples.current = ripples.current.filter(
        (r) => elapsed - r.startTime < 6
      );

      for (let i = 0; i < LINES; i++) {
        // Amplitude modulation over time for organic feel
        const ampMod = 0.75 + 0.35 * Math.sin(elapsed * 0.42 + i * 0.85); // stronger modulation
        const intensityBoost = i === 0 || i === 2 ? 1.28 : 1.0; // make two lines more intense
        // Smooth mouse values (lerp) for gentle response
        smoothX.current += (mouseX.current - smoothX.current) * 0.06;
        smoothY.current += (mouseY.current - smoothY.current) * 0.06;
        const userAmpFactor = 1 + smoothY.current * 0.25; // more amplitude lower on screen
        const lineAmp =
          baseAmplitude *
          (0.38 - i * 0.052) *
          ampMod *
          intensityBoost *
          userAmpFactor; // selective intensity
        const verticalPos = h * 0.25 + i * (h * 0.11); // removed horizontal-based vertical shift
        const phase = elapsed * (reduceMotion ? 0.2 : 0.48) + i * 0.45; // faster drift
        const slowPhase = elapsed * (reduceMotion ? 0.055 : 0.095);
        ctx.lineWidth = i === 0 || i === 2 ? 1.45 : 1.15;
        const prevAlpha = ctx.globalAlpha;
        ctx.globalAlpha = i === 0 || i === 2 ? 0.9 : 0.7;
        ctx.strokeStyle = gradient;
        ctx.beginPath();
        const segments = 120; // coarse for performance
        for (let s = 0; s <= segments; s++) {
          const xNorm = s / segments; // 0..1
          const x = xNorm * w;
          // Layered sines for organic feel
          const y =
            verticalPos +
            Math.sin(x * baseFreq * (1 + i * 0.15) + phase) * lineAmp * 0.58 +
            Math.sin(x * baseFreq * 0.52 + slowPhase * (1.25 + i * 0.2)) *
              lineAmp *
              0.34 +
            Math.sin(x * baseFreq * 2.8 + phase * 0.5) * lineAmp * 0.14;
          // Stick displacement (elastic towards pointer)
          let y2 = y;
          if (stickProgress.current > 0.002) {
            const dx = xNorm - pointerXNorm.current;
            const stickSigma = 0.06; // narrower for focused pull
            const gauss = Math.exp(-(dx * dx) / (2 * stickSigma * stickSigma));
            const stickPull =
              (pointerXNorm.current - xNorm) *
              36 *
              gauss *
              stickProgress.current; // stronger elastic skew
            y2 += stickPull;
            // Extra vertical tug centered at pointer (stronger)
            y2 += gauss * lineAmp * 0.38 * stickProgress.current; // increased vertical stretch
          }
          // Ripple contributions
          if (ripples.current.length) {
            for (const r of ripples.current) {
              const dt = elapsed - r.startTime;
              if (dt < 0) continue;
              const speed = 0.32; // normalized units per second
              const decay = Math.exp(-dt * 1.4);
              const spread = 0.02 + dt * 0.18; // gaussian widening over time
              const dx = xNorm - r.startX;
              const outwardPhase = (Math.abs(dx) - speed * dt) * 18; // outward traveling ridge
              const envelope = Math.exp(-(dx * dx) / (2 * spread * spread));
              const wave = Math.sin(outwardPhase);
              y2 += lineAmp * 0.3 * r.amp * wave * envelope * decay; // stronger ripple feedback
            }
          }
          if (s === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y2);
        }
        ctx.stroke();
        ctx.globalAlpha = prevAlpha;
      }
      ctx.globalCompositeOperation = "source-over";
      frameRef.current = requestAnimationFrame(draw);
    }
    // Always animate; reduced motion path simply uses gentler params above.
    frameRef.current = requestAnimationFrame(draw);

    return () => {
      if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
    };
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
      <canvas
        ref={ref}
        className="w-full h-full opacity-[0.32]"
        style={{ filter: "blur(2px)" }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(10,15,28,0)_0%,rgba(10,15,28,0.75)_75%)]" />
    </div>
  );
}

export default HeroWaves;
