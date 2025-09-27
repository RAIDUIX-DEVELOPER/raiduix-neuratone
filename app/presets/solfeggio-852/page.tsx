import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Solfeggio 852 — Awake Clarity | NeuraTone",
  description:
    "Solfeggio 852 preset: 852 Hz with light phasing, harmonic exciter, subtle reverb, and ~18 Hz drive.",
  alternates: { canonical: "/presets/solfeggio-852" },
};

export default function Solfeggio852Page() {
  const faqs = [
    {
      q: "Will this feel too bright?",
      a: "Levels are conservative. If it feels sharp, lower volume or reduce exciter/reverb in the mixer.",
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
            headline: "Solfeggio 852 — Awake Clarity",
            dateModified: new Date().toISOString(),
            author: { "@type": "Organization", name: "NeuraTone" },
          }),
        }}
      />
      <h1 className="text-3xl font-semibold text-slate-100 mb-4">
        Solfeggio 852 — Awake Clarity
      </h1>
      <p className="text-slate-300/85 mb-6">
        A higher carrier with a hint of phasing and presence enhancement. Subtle
        ambience keeps it natural and spacious.
      </p>

      <div className="flex gap-3 mb-10">
        <Link
          className="btn-shape px-4 py-2 text-[12px] ring-1 ring-white/10 hover:ring-teal-400/30 bg-[#121826]/60"
          href={{ pathname: "/app", query: { preset: "preset-solfeggio-852" } }}
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
        Disclaimer: Not medical advice.
      </p>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
    </main>
  );
}
