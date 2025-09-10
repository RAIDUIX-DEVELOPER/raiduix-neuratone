"use client";
import { useEffect, useState } from "react";

/**
 * LetterboxIntro
 * Brief cinematic letterbox bars that fade/slide away after intro.
 * Reduced motion: bars hidden instantly.
 */
export default function LetterboxIntro() {
  const [hide, setHide] = useState(false);
  useEffect(() => {
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduce) {
      setHide(true);
      return;
    }
    const t = setTimeout(() => setHide(true), 2200);
    return () => clearTimeout(t);
  }, []);
  if (hide) return null;
  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col justify-between letterbox-intro"
      aria-hidden
    >
      <div className="h-[17vh] w-full bg-[#05070c] origin-top animate-letterboxTop" />
      <button
        type="button"
        onClick={() => setHide(true)}
        className="absolute top-4 right-4 text-[11px] tracking-wide uppercase font-semibold px-3 h-8 rounded-md bg-black/60 backdrop-blur-sm text-slate-300 hover:text-white border border-slate-600/40 focus:outline-none focus:ring-2 focus:ring-teal-400/50"
      >
        Skip Intro
      </button>
      <div className="h-[17vh] w-full bg-[#05070c] origin-bottom animate-letterboxBottom" />
    </div>
  );
}
