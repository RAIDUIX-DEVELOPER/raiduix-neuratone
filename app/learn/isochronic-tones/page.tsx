import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "What are isochronic tones? | NeuraTone",
  description:
    "A concise guide to isochronic tones: how they work, when to use, safety, and how to try them in NeuraTone.",
  alternates: { canonical: "/learn/isochronic-tones" },
};

export default function LearnIsochronicTones() {
  return (
    <main className="px-6 py-16 max-w-3xl mx-auto">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: "What are isochronic tones?",
            description:
              "A concise guide to isochronic tones: how they work, when to use, safety, and how to try them in NeuraTone.",
            dateModified: new Date().toISOString(),
            author: { "@type": "Organization", name: "NeuraTone" },
          }),
        }}
      />
      <h1 className="text-3xl font-semibold text-slate-100 mb-4">
        What are isochronic tones?
      </h1>
      <p className="text-slate-300/85 mb-6">
        Isochronic tones are single tones pulsed on and off at a precise rate.
        Compared to binaural beats, they can feel more pronounced and work over
        speakers as well as headphones.
      </p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-200 mb-2">
          How it works
        </h2>
        <p className="text-slate-300/80 text-sm">
          A tone—say 200 Hz—is gated rhythmically at a target rate (e.g., 10 Hz)
          to create a clear pulsing sensation.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-200 mb-2">Use cases</h2>
        <p className="text-slate-300/80 text-sm">
          Some prefer isochronic pulses for alert focus blocks; others find them
          a bit intense and lower volume or choose binaural layers.
        </p>
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
          href="/presets/focus"
          prefetch
        >
          Explore Focus preset
        </Link>
      </div>

      <div className="text-[11px] text-slate-400/70">
        Last updated: {new Date().toISOString().slice(0, 10)}
      </div>
    </main>
  );
}
