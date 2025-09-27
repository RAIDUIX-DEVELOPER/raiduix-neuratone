import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Solfeggio 528 — Gentle Bloom | NeuraTone",
  description:
    "Solfeggio 528 preset: a gentle 528 Hz carrier with soft ambience and ~8 Hz modulation. Load it in the mixer and fine‑tune.",
  alternates: { canonical: "/presets/solfeggio-528" },
};

export default function Solfeggio528Page() {
  const faqs = [
    {
      q: "Do I need headphones?",
      a: "Headphones are recommended for binaural layers. Isochronic accents can work on speakers, but the blend is best over headphones.",
    },
    {
      q: "Why 528 Hz?",
      a: "Some listeners enjoy 528 Hz as a pleasant carrier pitch. It’s an aesthetic choice, not a medical claim.",
    },
  ];
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  return (
    <main className="px-6 py-16 max-w-3xl mx-auto">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: "Solfeggio 528 — Gentle Bloom",
            dateModified: new Date().toISOString(),
            author: { "@type": "Organization", name: "NeuraTone" },
          }),
        }}
      />
      <h1 className="text-3xl font-semibold text-slate-100 mb-4">
        Solfeggio 528 — Gentle Bloom
      </h1>
      <p className="text-slate-300/85 mb-6">
        A calm 528 Hz carrier with a subtle ~8 Hz modulation and airy ambience.
        Keep levels comfortable and let it sit in the background.
      </p>

      <div className="flex gap-3 mb-10">
        <Link
          className="btn-shape px-4 py-2 text-[12px] ring-1 ring-white/10 hover:ring-teal-400/30 bg-[#121826]/60"
          href={{ pathname: "/app", query: { preset: "preset-solfeggio-528" } }}
          prefetch
        >
          Load in Mixer
        </Link>
        <Link
          className="btn-shape px-4 py-2 text-[12px] ring-1 ring-white/10 hover:ring-slate-400/30 bg-[#121826]/60"
          href="/presets"
          prefetch
        >
          Explore other presets
        </Link>
      </div>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-200 mb-3">FAQ</h2>
        {faqs.map((f) => (
          <details key={f.q} className="mb-2">
            <summary className="cursor-pointer text-slate-200 text-sm">
              {f.q}
            </summary>
            <p className="text-slate-300/80 text-sm mt-2">{f.a}</p>
          </details>
        ))}
      </section>

      <p className="text-[11px] text-slate-400/70">
        Disclaimer: Not medical or therapeutic advice.
      </p>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
    </main>
  );
}
