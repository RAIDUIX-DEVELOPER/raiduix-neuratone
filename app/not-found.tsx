import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page Not Found | NeuraTone",
  description: "The page you're looking for doesn't exist. Explore NeuraTone's binaural beats and isochronic tones generator.",
  robots: {
    index: false,
    follow: true,
  },
};

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#0A0F1C] text-slate-300 flex items-center justify-center px-6">
      <div className="max-w-md mx-auto text-center">
        <h1 className="text-6xl font-bold text-teal-400 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-slate-200 mb-4">
          Page Not Found
        </h2>
        <p className="text-slate-300/85 mb-8">
          The page you're looking for doesn't exist. But don't worry, you can explore our binaural beats and isochronic tones generator.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="spotlight btn-shape px-6 py-3 text-sm ring-1 ring-white/10 hover:ring-teal-400/30 text-slate-200/85 hover:text-teal-100 bg-[#121826]/60"
          >
            Go Home
          </Link>
          <Link
            href="/app"
            className="spotlight btn-shape px-6 py-3 text-sm ring-1 ring-white/10 hover:ring-teal-400/30 text-slate-200/85 hover:text-teal-100 bg-[#121826]/60"
          >
            Launch Mixer
          </Link>
          <Link
            href="/presets"
            className="spotlight btn-shape px-6 py-3 text-sm ring-1 ring-white/10 hover:ring-teal-400/30 text-slate-200/85 hover:text-teal-100 bg-[#121826]/60"
          >
            Browse Presets
          </Link>
        </div>
        <div className="mt-8 text-xs text-slate-400/70">
          <p>Popular pages:</p>
          <nav className="flex flex-wrap justify-center gap-4 mt-2">
            <Link href="/learn/what-are-binaural-beats" className="hover:text-teal-400">
              Binaural Beats Guide
            </Link>
            <Link href="/learn/isochronic-tones" className="hover:text-teal-400">
              Isochronic Tones
            </Link>
            <Link href="/faq" className="hover:text-teal-400">
              FAQ
            </Link>
          </nav>
        </div>
      </div>
    </main>
  );
}