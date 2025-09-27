import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Presets — Sleep, Calm, Focus | NeuraTone",
  description:
    "Browse NeuraTone presets. Start with Sleep, Calm, or Focus, then fine‑tune frequencies, carriers, and effects in the mixer.",
  alternates: { canonical: "/presets" },
};

export default function PresetsHub() {
  const items = [
    {
      href: "/presets/sleep",
      title: "Sleep",
      desc: "Gentle delta (~3 Hz) entrainment under a soft ambient bed. Comfortable, low‑intensity mix.",
    },
    {
      href: "/presets/calm",
      title: "Calm",
      desc: "Alpha/theta (~6–10 Hz) for relaxed awareness. Smooth carriers and subtle modulation.",
    },
    {
      href: "/presets/focus",
      title: "Focus",
      desc: "Beta/SMR (~14–20 Hz) for concentration. Clear but moderate modulation with minimal ambience.",
    },
    {
      href: "/presets/solfeggio-528",
      title: "Solfeggio 528",
      desc: "Gentle bloom: 528 Hz carrier with light ambience and ~8 Hz modulation.",
    },
    {
      href: "/presets/solfeggio-396",
      title: "Solfeggio 396",
      desc: "Deep ground: low delta (~3 Hz) under a 396 Hz carrier with warm brown noise.",
    },
    {
      href: "/presets/solfeggio-639",
      title: "Solfeggio 639",
      desc: "Heart coherence: 639 Hz with soft chorus and pink noise for width.",
    },
    {
      href: "/presets/solfeggio-741",
      title: "Solfeggio 741",
      desc: "Clear focus: 741 Hz with ~15–18 Hz drive and tidy multiband shaping.",
    },
    {
      href: "/presets/solfeggio-852",
      title: "Solfeggio 852",
      desc: "Awake clarity: 852 Hz with light phasing, exciter, and subtle space.",
    },
  ];
  const listJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: it.href,
      name: it.title,
    })),
  };
  return (
    <main className="px-6 py-16 max-w-4xl mx-auto">
      <h1 className="text-3xl font-semibold text-slate-100 mb-6">Presets</h1>
      <p className="text-slate-300/85 text-sm mb-8">
        Pick a starting point and load it in the mixer. Adjust frequency,
        carrier, and effects to taste. Keep overall volume comfortable.
      </p>
      <div className="grid gap-4 md:grid-cols-3">
        {items.map((it) => (
          <Link
            key={it.href}
            href={it.href}
            prefetch
            className="card spotlight rounded-lg p-5 ring-1 ring-white/5 hover:ring-teal-400/30 bg-[#121826]/60"
          >
            <div className="text-base font-semibold text-teal-300 mb-1">
              {it.title}
            </div>
            <p className="text-[13px] text-slate-300/80">{it.desc}</p>
          </Link>
        ))}
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(listJsonLd) }}
      />
    </main>
  );
}
