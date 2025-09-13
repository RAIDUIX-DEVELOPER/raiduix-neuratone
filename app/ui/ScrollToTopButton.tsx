"use client";
import { useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";

export default function ScrollToTopButton() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const isMixer = pathname?.startsWith("/app");

  useEffect(() => {
    if (isMixer) {
      // Ensure hidden on mixer and avoid attaching listeners
      setVisible(false);
      return;
    }
    const onScroll = () => {
      const y = window.scrollY || document.documentElement.scrollTop;
      setVisible(y > 380);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isMixer]);

  const handleClick = useCallback(() => {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    try {
      window.scrollTo({
        top: 0,
        behavior: prefersReducedMotion ? "auto" : "smooth",
      });
    } catch {
      // Fallback for older browsers
      window.scrollTo(0, 0);
    }
  }, []);

  if (isMixer || !visible) return null;

  return (
    <button
      type="button"
      aria-label="Scroll to top"
      title="Back to top"
      onClick={handleClick}
      data-analytics-event="scroll_to_top_click"
      className="spotlight btn-shape fixed z-40 m-0 px-3 py-2 text-[12px] font-medium tracking-wide ring-1 ring-white/10 hover:ring-teal-400/30 text-slate-200/85 hover:text-teal-100 bg-[#0b1220]/75 backdrop-blur-md transition-colors right-4 md:right-6 bottom-4 md:bottom-6"
      style={{
        right: "max(1rem, env(safe-area-inset-right))",
        bottom: "max(1rem, env(safe-area-inset-bottom))",
        position: "fixed",
      }}
    >
      <span className="inline-flex items-center gap-2">
        {/* Up arrow icon */}
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
          className="opacity-85"
        >
          <path d="M12 19V6" />
          <path d="M5 12l7-7 7 7" />
        </svg>
        Top
      </span>
    </button>
  );
}
