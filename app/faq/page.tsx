import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQ — NeuraTone",
  description:
    "Quick answers about binaural beats, isochronic tones, headphones, sessions and safety.",
  alternates: { canonical: "/faq" },
};

export default function FAQPage() {
  const faqs = [
    {
      q: "Do I need headphones?",
      a: "Headphones are recommended for binaural beats so each ear can receive a slightly different tone. Isochronic pulses can be used over speakers.",
    },
    {
      q: "Are binaural beats safe?",
      a: "Responses vary. Use modest volumes and stop if you feel discomfort. Not medical or therapeutic advice.",
    },
    {
      q: "Which frequency for sleep/calm/focus?",
      a: "Sleep: delta (~1–4 Hz, e.g., 3 Hz). Calm: alpha/theta (~6–10 Hz). Focus: beta/SMR (~14–20 Hz).",
    },
    {
      q: "How long should I listen?",
      a: "10–20 minutes for quick resets, 25–40 minutes for deeper sessions. Adjust to comfort.",
    },
    {
      q: "Does it work on mobile?",
      a: "Yes, NeuraTone runs in the browser. Headphones improve binaural layers.",
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
      <h1 className="text-3xl font-semibold text-slate-100 mb-8">FAQ</h1>
      {faqs.map((f) => (
        <details key={f.q} className="mb-3">
          <summary className="cursor-pointer text-slate-200 text-sm">
            {f.q}
          </summary>
          <p className="text-slate-300/80 text-sm mt-2">{f.a}</p>
        </details>
      ))}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
    </main>
  );
}
