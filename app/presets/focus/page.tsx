import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Focus — Binaural & Isochronic Guide | NeuraTone",
  description:
    "Focus preset guide: beta/SMR (~14–20 Hz) entrainment for concentration. Learn ranges, safety, and try it in the mixer.",
  alternates: { canonical: "/presets/focus" },
};

export default function FocusPresetPage() {
  const faqs = [
    {
      q: "Can I use this while studying?",
      a: "Yes. Keep modulation moderate and avoid densely layered ambience if it competes with reading or problem solving.",
    },
    {
      q: "Do I need headphones?",
      a: "Recommended for binaural layers. Isochronic pulses can carry over speakers but the blend works best on headphones.",
    },
    {
      q: "What if I feel tense?",
      a: "Reduce overall volume and consider shifting toward 12–14 Hz or take a short break. Subtlety helps with endurance.",
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
      <h1 className="text-3xl font-semibold text-slate-100 mb-4">
        Focus — Binaural & Isochronic Guide
      </h1>
      <p className="text-slate-300/85 mb-6">
        For sustained concentration, listeners often choose
        <strong> ~14–20 Hz</strong> beta/SMR ranges. Keep modulation moderate so
        it supports attention rather than competing with it.
      </p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-200 mb-2">
          Recommended frequency range
        </h2>
        <ul className="list-disc list-inside text-slate-300/80 space-y-1 text-sm">
          <li>Beta/SMR: ~14–20 Hz (consider 14–16 Hz to start)</li>
          <li>Carrier: ~150–300 Hz (balanced, not harsh)</li>
          <li>Optional pulse layer for extra drive</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-200 mb-2">
          How NeuraTone builds Focus
        </h2>
        <p className="text-slate-300/80 text-sm">
          Focus pairs a clear but not overbearing binaural layer with a light
          isochronic pulse and minimal ambience, keeping the mix crisp.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-200 mb-2">Tips</h2>
        <ul className="list-disc list-inside text-slate-300/80 space-y-1 text-sm">
          <li>Use for timeboxed blocks (25–50 minutes).</li>
          <li>Lower volume if you feel tension; clarity beats intensity.</li>
          <li>Combine with simple ambient if silence distracts you.</li>
        </ul>
      </section>

      <div className="flex gap-3 mb-10">
        <Link
          className="btn-shape px-4 py-2 text-[12px] ring-1 ring-white/10 hover:ring-teal-400/30 bg-[#121826]/60"
          href={{ pathname: "/app", query: { preset: "focus" } }}
          prefetch
        >
          Load Focus in Mixer
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
