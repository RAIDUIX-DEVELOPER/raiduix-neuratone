import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "What are binaural beats? | NeuraTone",
  description:
    "A concise guide to binaural beats: how they work, differences vs isochronic tones, safety, and how to try them in NeuraTone.",
  alternates: { canonical: "/learn/what-are-binaural-beats" },
};

export default function LearnBinauralBeats() {
  return (
    <main className="px-6 py-16 max-w-3xl mx-auto">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: "What are binaural beats?",
            description:
              "A concise guide to binaural beats: how they work, differences vs isochronic tones, safety, and how to try them in NeuraTone.",
            dateModified: new Date().toISOString(),
            author: { "@type": "Organization", name: "NeuraTone" },
          }),
        }}
      />
      <h1 className="text-3xl font-semibold text-slate-100 mb-4">
        What are binaural beats?
      </h1>
      <p className="text-slate-300/85 mb-6">
        Binaural beats occur when two slightly different pure tones are played
        to each ear via headphones. Your brain perceives the difference in
        frequency as a gentle rhythmic pulse.
      </p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-200 mb-2">
          How it works
        </h2>
        <p className="text-slate-300/80 text-sm">
          If one ear receives 200 Hz and the other 203 Hz, you may perceive a ~3
          Hz throbbing rhythm. Some listeners use this as a focusing or
          relaxation aid.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-200 mb-2">
          Binaural vs Isochronic
        </h2>
        <p className="text-slate-300/80 text-sm">
          Isochronic tones are a single tone pulsed on and off at a set rate.
          They can feel more pronounced than binaurals and work over speakers.
          Binaurals require headphones and can feel subtler.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-200 mb-2">Safety</h2>
        <p className="text-slate-300/80 text-sm">
          Responses vary and this is not a medical treatment. If you have a
          neurological or auditory condition, consult a professional before
          extended use.
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
          href="/presets/sleep"
          prefetch
        >
          Explore Sleep preset
        </Link>
      </div>

      <div className="text-[11px] text-slate-400/70">
        Last updated: {new Date().toISOString().slice(0, 10)}
      </div>
    </main>
  );
}
