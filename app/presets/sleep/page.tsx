import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sleep — Binaural & Isochronic Guide | NeuraTone",
  description:
    "Sleep preset guide: gentle delta (~3 Hz) entrainment with soothing carriers. Learn ranges, safety, and try it in the mixer.",
  alternates: { canonical: "/presets/sleep" },
};

export default function SleepPresetPage() {
  const faqs = [
    {
      q: "Do I need headphones for sleep presets?",
      a: "For binaural beats, yes—each ear must receive a slightly different tone to perceive the beat. Isochronic pulses can be audible over speakers, but the combined approach favors headphones.",
    },
    {
      q: "What delta frequency should I choose?",
      a: "Many users find ~3 Hz comfortable. Ranges between 1–4 Hz are common for deep sleep support; pick what feels gentle and sustainable.",
    },
    {
      q: "How long should I listen?",
      a: "Try 20–40 minutes. Some prefer having ambience continue as they drift off while keeping modulation subtle.",
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
        Sleep — Binaural & Isochronic Guide
      </h1>
      <p className="text-slate-300/85 mb-6">
        For many listeners, deep sleep support aligns with delta brainwave
        ranges. A common entrainment target is around <strong>~3 Hz</strong>,
        layered softly under a calm ambient bed.
      </p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-200 mb-2">
          Recommended frequency range
        </h2>
        <ul className="list-disc list-inside text-slate-300/80 space-y-1 text-sm">
          <li>Delta: ~1–4 Hz (example target: 3 Hz)</li>
          <li>Carrier: ~100–250 Hz (keep comfortable and smooth)</li>
          <li>Volume: keep entrainment quieter than ambience</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-200 mb-2">
          How NeuraTone builds Sleep
        </h2>
        <p className="text-slate-300/80 text-sm">
          The default Sleep preset blends a low‑frequency binaural layer with
          optional soft isochronic pulsing and a gentle ambient bed. Levels are
          conservative to avoid fatigue.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-200 mb-2">Tips</h2>
        <ul className="list-disc list-inside text-slate-300/80 space-y-1 text-sm">
          <li>Use comfortable stereo headphones for binaural layers.</li>
          <li>Give it 15–20 minutes before judging the effect.</li>
          <li>Lower intensity if you feel pressure; it should stay subtle.</li>
        </ul>
      </section>

      <div className="flex gap-3 mb-10">
        <Link
          className="btn-shape px-4 py-2 text-[12px] ring-1 ring-white/10 hover:ring-teal-400/30 bg-[#121826]/60"
          href={{ pathname: "/app", query: { preset: "sleep" } }}
          prefetch
        >
          Load Sleep in Mixer
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
