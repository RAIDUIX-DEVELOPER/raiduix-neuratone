import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Calm — Binaural & Isochronic Guide | NeuraTone",
  description:
    "Calm preset guide: theta/alpha (~6–10 Hz) entrainment for gentle relaxation. Learn ranges, safety, and try it in the mixer.",
  alternates: { canonical: "/presets/calm" },
};

export default function CalmPresetPage() {
  const faqs = [
    {
      q: "Do I need headphones for calm presets?",
      a: "Headphones are recommended for binaural layers. Isochronic pulses can work on speakers, but the combination is best over headphones.",
    },
    {
      q: "What frequency should I start with?",
      a: "Try ~6–8 Hz for deeper relaxation; move toward ~10 Hz for a calmer but alert state. Adjust based on comfort.",
    },
    {
      q: "Can I use this while reading?",
      a: "Yes, keep modulation subtle and avoid harsh carriers so it doesn’t compete with comprehension.",
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
            headline: "Calm — Binaural & Isochronic Guide",
            dateModified: new Date().toISOString(),
            author: { "@type": "Organization", name: "NeuraTone" },
          }),
        }}
      />
      <h1 className="text-3xl font-semibold text-slate-100 mb-4">
        Calm — Binaural & Isochronic Guide
      </h1>
      <p className="text-slate-300/85 mb-6">
        Relaxed awareness often sits in the alpha/theta neighborhood. A
        comfortable working range is <strong>~6–10 Hz</strong>, paired with a
        smooth carrier and a light ambient bed.
      </p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-200 mb-2">
          Recommended frequency range
        </h2>
        <ul className="list-disc list-inside text-slate-300/80 space-y-1 text-sm">
          <li>Alpha/Theta: ~6–10 Hz</li>
          <li>Carrier: ~150–300 Hz (soft, non‑intrusive)</li>
          <li>Keep modulation subtle and breathable</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-200 mb-2">
          How NeuraTone builds Calm
        </h2>
        <p className="text-slate-300/80 text-sm">
          Calm blends a mild binaural beat with optional gentle isochronic
          pulsing and airy ambience. Intensity is conservative to avoid fatigue
          or agitation.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-200 mb-2">Tips</h2>
        <ul className="list-disc list-inside text-slate-300/80 space-y-1 text-sm">
          <li>Keep volumes lower than usual—let it sit in the background.</li>
          <li>Short 10–20 minute breaks can reset mood and attention.</li>
          <li>Pair with breathing exercises for added effect.</li>
        </ul>
      </section>

      <div className="flex gap-3 mb-10">
        <Link
          className="btn-shape px-4 py-2 text-[12px] ring-1 ring-white/10 hover:ring-teal-400/30 bg-[#121826]/60"
          href={{ pathname: "/app", query: { preset: "calm" } }}
          prefetch
        >
          Load Calm in Mixer
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
        Disclaimer: Not medical or therapeutic advice. If you have a
        neurological or auditory condition, consult a professional before
        extended use.
      </p>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
    </main>
  );
}
