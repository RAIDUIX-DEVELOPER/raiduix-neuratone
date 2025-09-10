"use client";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useEffect } from "react";

interface CinematicTitleProps {
  title?: string;
  subtitle?: string;
  kicker?: string;
}

export default function CinematicTitle({
  title = "NeuraTone",
  subtitle = "Layered Binaural & Isochronic Soundscapes",
  kicker = "by Raiduix",
}: CinematicTitleProps) {
  const letters = title.split("");
  // Parallax motion values
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 55, damping: 18, mass: 0.7 });
  const sy = useSpring(my, { stiffness: 55, damping: 18, mass: 0.7 });
  const rotateY = useTransform(sx, (v) => v * 6);
  const rotateX = useTransform(sy, (v) => v * -6);
  const translateY = useTransform(sy, (v) => v * 6);
  useEffect(() => {
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduce) return;
    function move(e: PointerEvent) {
      const nx = e.clientX / window.innerWidth - 0.5; // -0.5..0.5
      const ny = e.clientY / window.innerHeight - 0.5;
      mx.set(nx * 2); // -1..1
      my.set(ny * 2);
    }
    window.addEventListener("pointermove", move);
    return () => window.removeEventListener("pointermove", move);
  }, [mx, my]);
  return (
    <div className="relative flex flex-col items-center text-center">
      <motion.span
        initial={{ opacity: 0, y: 16, filter: "blur(8px)" }}
        animate={{ opacity: 0.9, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 1.6, ease: "easeOut" }}
        className="mb-6 text-[0.65rem] tracking-[0.45em] uppercase font-semibold text-teal-300/70 cinematic-kicker"
      >
        {kicker}
      </motion.span>
      <motion.div
        className="relative"
        style={{ perspective: 1200, rotateY, rotateX, y: translateY }}
      >
        <motion.h1
          aria-label={title}
          className="hero-wordmark cinematic-title select-none relative"
        >
          {letters.map((l, i) => (
            <motion.span
              key={i + l}
              initial={{ opacity: 0, y: 55, rotateX: 65 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              transition={{
                delay: 0.12 + i * 0.05,
                duration: 0.85,
                ease: [0.19, 0.82, 0.25, 1],
              }}
              className="inline-block will-change-transform"
              style={{ perspective: 900 }}
            >
              {l === " " ? "\u00A0" : l}
            </motion.span>
          ))}
          <span
            className="absolute inset-0 pointer-events-none shimmer-mask"
            aria-hidden
          />
        </motion.h1>
        <span
          className="absolute inset-0 cinematic-title-outline pointer-events-none"
          aria-hidden
        >
          {title}
        </span>
      </motion.div>
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 0.8, y: 0 }}
        transition={{ delay: 1.2, duration: 1.1, ease: "easeOut" }}
        className="max-w-xl text-sm md:text-base leading-relaxed text-slate-300/70 tracking-tight px-3 cinematic-subtitle"
      >
        {subtitle}
      </motion.p>
    </div>
  );
}
