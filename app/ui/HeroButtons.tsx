"use client";

import Link from "next/link";
export default function HeroButtons() {
  return (
    <div className="mt-10 flex flex-row items-center gap-3 flex-wrap justify-center">
      <Link
        href="/app"
        className="spotlight btn-accent focus-ring inline-flex items-center justify-center rounded-md border border-slate-800/80 bg-[#121826]/70 w-40 h-11 text-sm font-medium text-slate-300 shadow-[0_2px_6px_-1px_rgba(0,0,0,0.5)] transition hover:bg-[#1b2331] hover:text-slate-200"
      >
        Launch App
      </Link>
      <a
        href="https://github.com/RAIDUIX-DEVELOPER/raiduix-neuratone"
        target="_blank"
        rel="noopener noreferrer"
        className="spotlight btn-accent inline-flex items-center justify-center gap-2 rounded-md w-40 h-11 text-[11px] font-medium tracking-wide text-teal-300/80 ring-1 ring-white/5 hover:text-teal-200 hover:ring-teal-400/30 transition-colors backdrop-blur-[15px] bg-[#121826]/50"
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
        href="https://x.com/raiduix"
        target="_blank"
        rel="noopener noreferrer"
        className="spotlight btn-accent inline-flex items-center justify-center gap-2 rounded-md w-40 h-11 text-[11px] font-medium tracking-wide text-slate-300/70 ring-1 ring-white/5 hover:text-white hover:ring-slate-400/30 transition-colors backdrop-blur-[15px] bg-[#121826]/50"
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
  );
}
