"use client";
import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";

export default function RouteLoadingOverlay() {
  const routeLoading = useAppStore((s) => s.routeLoading);
  const appReady = useAppStore((s) => s.appReady);
  const setRouteLoading = useAppStore((s) => s.setRouteLoading);
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (routeLoading && !visible) {
      setVisible(true);
      setExiting(false);
    }
  }, [routeLoading, visible]);

  useEffect(() => {
    if (visible && appReady) {
      // smooth exit
      setExiting(true);
      const t = setTimeout(() => {
        setVisible(false);
        setRouteLoading(false);
        setExiting(false);
      }, 400);
      return () => clearTimeout(t);
    }
  }, [appReady, visible, setRouteLoading]);

  if (!visible) return null;

  return (
    <div
      aria-hidden
      className={`fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#0A0F1C] transition-opacity duration-400 ${
        exiting ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* Subtle moving background sine-waves */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.08]">
        <div className="w-full h-full animate-[float_8s_ease-in-out_infinite] bg-[radial-gradient(ellipse_at_center,rgba(20,184,166,0.25),transparent_60%)]" />
      </div>

      {/* Logo/Wordmark */}
      <div
        className={`relative flex flex-col items-center text-center transform transition-all duration-400 ${
          exiting ? "scale-95" : "scale-100"
        }`}
      >
        <div className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-100 select-none">
          NeuraTone
        </div>
        <div className="mt-2 h-6 flex items-center justify-center">
          {/* loader: pulsing N or sine loop */}
          <div className="w-20 h-2 relative overflow-hidden">
            <div className="absolute inset-0 opacity-60 bg-gradient-to-r from-transparent via-teal-400 to-transparent animate-[shine_1.4s_linear_infinite]" />
          </div>
        </div>
        <div className="mt-3 text-xs text-slate-400">
          Loading your soundscape...
        </div>
      </div>

      <style jsx global>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-6px);
          }
        }
        @keyframes shine {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
}
