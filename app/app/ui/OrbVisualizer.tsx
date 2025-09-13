"use client";

import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";

export interface OrbVisualizerProps {
  // Return engines (with getWaveformData/getFrequencyData) in display order
  getEngines: () => (any | null | undefined)[];
  size?: number; // CSS size in px
  fit?: boolean; // if true, fills parent width (square)
}

// A cinematic orb visualizer: radial frequency arcs + glossy highlight, with 3+3 waveform tentacles
export default function OrbVisualizer({
  getEngines,
  size = 480,
  fit = false,
}: OrbVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const currentSizeRef = useRef<number>(size);
  // Spectrogram history and animation phase
  const frameRef = useRef(0);
  const phaseRef = useRef(0);
  // Offscreen scrolling spectrogram texture
  const specTexRef = useRef<HTMLCanvasElement | null>(null);
  const specCtxRef = useRef<CanvasRenderingContext2D | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

    const doResize = (cssW: number, cssH: number) => {
      canvas.style.width = cssW + "px";
      canvas.style.height = cssH + "px";
      canvas.width = Math.floor(cssW * dpr);
      canvas.height = Math.floor(cssH * dpr);
    };
    const resize = () => {
      if (fit && hostRef.current) {
        const cssW = hostRef.current.clientWidth;
        const cssH = hostRef.current.clientHeight;
        currentSizeRef.current = Math.min(cssW, cssH);
        doResize(cssW, cssH); // fill full container so tentacles can reach edge
      } else {
        currentSizeRef.current = size;
        doResize(size, size);
      }
    };
    resize();

    let ro: ResizeObserver | undefined;
    if (fit && hostRef.current) {
      ro = new ResizeObserver(() => resize());
      ro.observe(hostRef.current);
    }

    const N = 1024;
    const tempWave = new Uint8Array(N);
    const mixWave = new Float32Array(N);
    const tempFreq = new Uint8Array(1024);
    const mixFreq = new Float32Array(1024);

    const SPEC_HEIGHT = 128; // vertical frequency bins for scrolling texture
    const SPEC_WIDTH = 512; // offscreen texture width (time axis)
    // Spectrogram sensitivity shaping
    const SPEC_LOG_K = 8; // higher -> more boost for quieter bins
    const SPEC_GAIN = 1.2; // gentle overall gain
    const SPEC_GAMMA = 0.8; // <1 boosts mid/lows slightly

    const compressBins = (src: Float32Array | Uint8Array, bins: number) => {
      const out = new Float32Array(bins);
      const step = src.length / bins;
      for (let b = 0; b < bins; b++) {
        const start = Math.floor(b * step);
        const end = Math.min(src.length, Math.floor((b + 1) * step));
        let sum = 0;
        for (let i = start; i < end; i++) sum += (src as any)[i];
        const avg = sum / Math.max(1, end - start);
        // Normalize 0..1
        const n = Math.max(0, Math.min(1, avg / 255));
        // Log boost to increase sensitivity to quiet content
        let v = Math.log1p(n * SPEC_LOG_K) / Math.log1p(SPEC_LOG_K);
        // Gentle gamma to emphasize mid/lower energy
        v = Math.pow(v, SPEC_GAMMA);
        // Gentle overall gain, clamp to 0..1
        out[b] = Math.max(0, Math.min(1, v * SPEC_GAIN));
      }
      return out;
    };

    const draw = () => {
      const { width: W, height: H } = canvas;
      // Use the smaller dimension to define the orb, but center in the actual canvas
      const R = Math.min(W, H) * 0.28; // orb radius (20% smaller)
      const cx = W / 2;
      const cy = H / 2;

      // Clear
      ctx.clearRect(0, 0, W, H);

      // Aggregate audio data
      mixWave.fill(0);
      mixFreq.fill(0);
      let wc = 0,
        fc = 0;
      const engines = getEngines().filter(Boolean) as any[];
      const engineWaves: Float32Array[] = [];
      for (const e of engines) {
        if (e.getWaveformData) {
          e.getWaveformData(tempWave);
          for (let i = 0; i < N; i++) mixWave[i] += (tempWave[i] - 128) / 128;
          // Capture per-layer waveform for ALL engines (not just first 3)
          const arr = new Float32Array(N);
          for (let i = 0; i < N; i++) arr[i] = (tempWave[i] - 128) / 128;
          engineWaves.push(arr);
          wc++;
        }
        if (e.getFrequencyData) {
          e.getFrequencyData(tempFreq);
          for (let i = 0; i < tempFreq.length; i++) mixFreq[i] += tempFreq[i];
          fc++;
        }
      }
      if (wc) for (let i = 0; i < N; i++) mixWave[i] /= wc;
      if (fc) for (let i = 0; i < mixFreq.length; i++) mixFreq[i] /= fc;

      // Prepare offscreen spectrogram texture if needed
      if (!specTexRef.current) {
        specTexRef.current = document.createElement("canvas");
        specTexRef.current.width = SPEC_WIDTH;
        specTexRef.current.height = SPEC_HEIGHT;
        specCtxRef.current = specTexRef.current.getContext("2d");
      }
      const sctx = specCtxRef.current!;
      if (sctx) {
        // Scroll left by 1px
        sctx.drawImage(
          specTexRef.current as HTMLCanvasElement,
          1,
          0,
          SPEC_WIDTH - 1,
          SPEC_HEIGHT,
          0,
          0,
          SPEC_WIDTH - 1,
          SPEC_HEIGHT
        );
        // Render new column at right using compressed bins
        // Mirror the spectrum from the center outwards (center -> top & center -> bottom)
        const HALF = Math.floor(SPEC_HEIGHT / 2);
        const row = compressBins(mixFreq, HALF);
        const imgData = sctx.getImageData(SPEC_WIDTH - 1, 0, 1, SPEC_HEIGHT);
        const data = imgData.data;
        for (let y = 0; y < HALF; y++) {
          const amp = row[y]; // lowest freqs at center (y=0), highest near edges (y=HALF-1)
          const alpha = 120 + Math.floor(amp * 135); // 0..255
          // Simple teal->purple gradient approximation
          const r = Math.floor(80 + amp * 120);
          const g = Math.floor(200 - amp * 100);
          const b = Math.floor(200 - amp * 50 + amp * 80);

          // Top half index (from center up)
          const topY = HALF - 1 - y;
          const topIdx = topY * 4;
          data[topIdx] = r;
          data[topIdx + 1] = g;
          data[topIdx + 2] = b;
          data[topIdx + 3] = alpha;

          // Bottom half index (from center down)
          const botY = HALF + y;
          const botIdx = botY * 4;
          data[botIdx] = r;
          data[botIdx + 1] = g;
          data[botIdx + 2] = b;
          data[botIdx + 3] = alpha;
        }
        sctx.putImageData(imgData, SPEC_WIDTH - 1, 0);
      }

      // Orb base (radial gradient inside clipped circle)
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.clip();
      const grad = ctx.createRadialGradient(cx, cy, R * 0.1, cx, cy, R);
      grad.addColorStop(0, "rgba(20,184,166,0.35)");
      grad.addColorStop(0.6, "rgba(99,102,241,0.25)");
      grad.addColorStop(1, "rgba(2,6,23,0.6)");
      ctx.fillStyle = grad;
      ctx.fillRect(cx - R, cy - R, R * 2, R * 2);

      // Draw scrolling spectrogram texture to fully fill the orb
      if (specTexRef.current) {
        const tex = specTexRef.current;
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, Math.PI * 2);
        ctx.clip();
        const dx = cx - R;
        const dy = cy - R;
        // Lower base alpha so the orb gradient/gloss remain visible
        ctx.globalAlpha = 0.6;
        ctx.globalCompositeOperation = "screen";
        ctx.drawImage(tex, dx, dy, R * 2, R * 2);
        // Apply a gentle radial mask (strongest mid-radius, softer at center and rim)
        ctx.globalCompositeOperation = "destination-in";
        const mask = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
        mask.addColorStop(0.0, "rgba(255,255,255,0.4)");
        mask.addColorStop(0.5, "rgba(255,255,255,0.85)");
        mask.addColorStop(0.9, "rgba(255,255,255,0.45)");
        mask.addColorStop(1.0, "rgba(255,255,255,0.25)");
        ctx.fillStyle = mask;
        ctx.fillRect(dx, dy, R * 2, R * 2);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
        ctx.restore();
      }

      // Subtle rim activity (kept minimal)
      const bins = 48;
      for (let b = 0; b < bins; b++) {
        const tAng = b / bins;
        const a0 = tAng * Math.PI * 2;
        const a1 = (tAng + 1 / bins) * Math.PI * 2;
        const bin = Math.min(
          mixFreq.length - 1,
          Math.floor(tAng * mixFreq.length)
        );
        const val = mixFreq[bin] || 0;
        const amp = (val / 255) * 0.6;
        const rr = R * (0.92 + 0.04 * amp);
        const hue = 170 + amp * 100;
        ctx.beginPath();
        ctx.strokeStyle = `hsla(${hue},70%,${38 + amp * 28}%,${
          0.25 + amp * 0.35
        })`;
        ctx.lineWidth = Math.max(1, 1.5 * dpr);
        ctx.arc(cx, cy, rr, a0, a1);
        ctx.stroke();
      }

      // Gloss highlight overlay (top-left sweep)
      const gloss = ctx.createRadialGradient(
        cx - R * 0.4,
        cy - R * 0.6,
        R * 0.05,
        cx - R * 0.4,
        cy - R * 0.6,
        R * 0.9
      );
      gloss.addColorStop(0, "rgba(255,255,255,0.25)");
      gloss.addColorStop(0.25, "rgba(255,255,255,0.10)");
      gloss.addColorStop(0.6, "rgba(255,255,255,0.03)");
      gloss.addColorStop(1, "rgba(255,255,255,0)");
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = gloss;
      ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
      ctx.globalCompositeOperation = "source-over";
      ctx.restore();

      // Orb outline
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.lineWidth = 1 * dpr;
      ctx.stroke();

      // Tentacles (3 left, 3 right) driven per-layer when available
      const tentacleCount = 3;
      const offsets = [-0.5, 0, 0.5]; // vertical offsets in R units
      phaseRef.current += 0.001; // user-specified global phase

      const drawTentacle = (side: -1 | 1, idx: number, color: string) => {
        const yOff = offsets[idx] * R * 0.6;
        // Compute circle intersection for this vertical offset so the line starts on the rim
        const rEdge = Math.sqrt(Math.max(0, R * R - yOff * yOff));
        const eps = 1.5 * dpr; // tiny inward bias to avoid subpixel gap
        const startX = cx + side * (rEdge - eps);
        const startY = cy + yOff;
        const length = R * 5.0; // keep spec; end will clamp to canvas edge
        const padOut = 2 * dpr; // extend slightly beyond edge so stroke reaches boundary
        const endX = side === -1 ? -padOut : W + padOut; // reach past container edge
        const endY = startY; // keep base perfectly horizontal

        // Motion from waveform samples (with scrolling phase)
        const ampBase = R * 0.3; // user-specified amplitude base
        const segments = 8;
        const phase = phaseRef.current;

        // Draw as a poly-bezier by sampling along
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        for (let s = 1; s <= segments; s++) {
          const t = s / segments;
          const x = startX + (endX - startX) * t;
          const baseY = startY + (endY - startY) * t;
          // sample waveform with phase scroll
          const idxFloat = (t * N + phase * 10) % N; // user-specified sample scroll (fractional)
          // Unified driver: all tentacles sample the same mixed waveform; use fractional index with linear interpolation
          const i0 = Math.floor(idxFloat);
          const i1 = (i0 + 1) % N;
          const frac = idxFloat - i0;
          const s0 = mixWave[i0] || 0;
          const s1 = mixWave[i1] || 0;
          const sample = s0 * (1 - frac) + s1 * frac;
          const falloff = 1 - Math.abs(0.5 - t) * 1.6;
          const y = baseY + sample * ampBase * falloff;
          ctx.lineTo(x, y);
        }
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(1, 2 * dpr);
        ctx.stroke();
      };

      const tentacleColor = "rgba(147,197,253,0.9)"; // unified color
      for (let i = 0; i < tentacleCount; i++) {
        drawTentacle(-1 as -1, i, tentacleColor);
        drawTentacle(+1 as 1, i, tentacleColor);
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      if (ro && hostRef.current) ro.disconnect();
    };
  }, [getEngines, size, fit]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative"
      style={{
        width: fit ? "100%" : size,
        height: fit ? "100%" : size,
        maxWidth: "100%",
      }}
      ref={hostRef}
    >
      <div className="relative mx-auto w-full h-full grid place-items-center">
        <canvas ref={canvasRef} className="block" />
      </div>
    </motion.div>
  );
}
