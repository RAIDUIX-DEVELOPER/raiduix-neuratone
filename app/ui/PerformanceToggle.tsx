"use client";
import { useEffect, useState } from "react";

export default function PerformanceToggle() {
  const [low, setLow] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem("nt-fx-mode");
    if (saved === "low") {
      setLow(true);
      document.documentElement.dataset.fx = "low";
    }
  }, []);
  function toggle() {
    const next = !low;
    setLow(next);
    if (next) {
      document.documentElement.dataset.fx = "low";
      localStorage.setItem("nt-fx-mode", "low");
    } else {
      delete document.documentElement.dataset.fx;
      localStorage.removeItem("nt-fx-mode");
    }
  }
  return (
    <button
      onClick={toggle}
      aria-pressed={low}
      className="group fixed z-40 bottom-4 right-4 h-9 px-3 rounded-md text-[11px] font-medium tracking-wide flex items-center gap-2 bg-[#121826]/70 backdrop-blur-md border border-slate-600/40 text-slate-300 hover:border-teal-400/40 hover:text-teal-200 transition shadow-[0_4px_14px_-4px_rgba(0,0,0,0.6)]"
    >
      <span className="w-2.5 h-2.5 rounded-sm border border-slate-400/40 flex items-center justify-center group-aria-pressed:bg-teal-400/70 group-aria-pressed:border-teal-300/60">
        {low && (
          <span className="w-1.5 h-1.5 rounded-[2px] bg-teal-300 shadow-[0_0_6px_2px_rgba(45,255,230,0.6)]" />
        )}
      </span>
      {low ? "Low FX" : "Full FX"}
    </button>
  );
}
