"use client";
import { motion, useAnimation } from "framer-motion";
import { useEffect, useRef } from "react";

interface RevealProps {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  once?: boolean;
  className?: string;
}

export default function Reveal({
  children,
  delay = 0,
  y = 26,
  once = true,
  className = "",
}: RevealProps) {
  const controls = useAnimation();
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            controls.start({ opacity: 1, y: 0, filter: "blur(0px)" });
            if (once) io.disconnect();
          }
        });
      },
      { threshold: 0.22 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [controls, once]);
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y, filter: "blur(10px)" }}
      animate={controls}
      transition={{ duration: 0.85, ease: [0.22, 0.65, 0.35, 1], delay }}
      className={`reveal-item will-change-transform ${className}`}
    >
      {children}
    </motion.div>
  );
}
