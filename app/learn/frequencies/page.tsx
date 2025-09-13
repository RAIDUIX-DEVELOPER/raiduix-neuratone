import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Brainwave frequency ranges | NeuraTone",
  description:
    "Overview of common brainwave ranges used in binaural and isochronic sessions: delta, theta, alpha, beta, and more.",
  alternates: { canonical: "/learn/frequencies" },
};

export default function LearnFrequencies() {
  return (
    <main className="px-6 py-16 max-w-3xl mx-auto">
      <h1 className="text-3xl font-semibold text-slate-100 mb-4">
        Brainwave frequency ranges
      </h1>
      <p className="text-slate-300/85 mb-6">
        These broad ranges are commonly referenced in entrainment contexts. They
        aren’t medical categories and experiences vary.
      </p>

      <section className="mb-8 text-sm text-slate-300/85">
        <ul className="space-y-2">
          <li>
            <strong>Delta (≈1–4 Hz)</strong> – deep sleep range; often used for
            wind‑down and sleep support.
          </li>
          <li>
            <strong>Theta (≈4–8 Hz)</strong> – drowsy, hypnagogic; meditation,
            creativity, calm.
          </li>
          <li>
            <strong>Alpha (≈8–12 Hz)</strong> – relaxed, reflective; calm
            alertness.
          </li>
          <li>
            <strong>Beta/SMR (≈14–20 Hz)</strong> – engaged, task‑oriented
            focus.
          </li>
        </ul>
      </section>

      <div className="flex gap-3 mb-10">
        <Link
          className="btn-shape px-4 py-2 text-[12px] ring-1 ring-white/10 hover:ring-teal-400/30 bg-[#121826]/60"
          href="/app"
          prefetch
        >
          Try NeuraTone now
        </Link>
        <Link
          className="btn-shape px-4 py-2 text-[12px] ring-1 ring-white/10 hover:ring-slate-400/30 bg-[#121826]/60"
          href="/presets/calm"
          prefetch
        >
          Explore Calm preset
        </Link>
      </div>

      <div className="text-[11px] text-slate-400/70">
        Last updated: {new Date().toISOString().slice(0, 10)}
      </div>
    </main>
  );
}
