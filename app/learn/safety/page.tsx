import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Safety notes for entrainment | NeuraTone",
  description:
    "Important notes about safe listening practices for binaural and isochronic sessions.",
  alternates: { canonical: "/learn/safety" },
};

export default function LearnSafety() {
  return (
    <main className="px-6 py-16 max-w-3xl mx-auto">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: "Safety notes",
            description:
              "Important notes about safe listening practices for binaural and isochronic sessions.",
            dateModified: new Date().toISOString(),
            author: { "@type": "Organization", name: "NeuraTone" },
          }),
        }}
      />
      <h1 className="text-3xl font-semibold text-slate-100 mb-4">
        Safety notes
      </h1>
      <p className="text-slate-300/85 mb-6">
        Listening comfort varies. Keep levels modest and stop if you feel
        discomfort. This is not medical or therapeutic advice.
      </p>
      <ul className="list-disc list-inside text-slate-300/80 space-y-2 text-sm">
        <li>Do not use while driving or operating machinery.</li>
        <li>Use comfortable volumes; avoid pressure or fatigue.</li>
        <li>
          If you have neurological or auditory concerns, consult a professional
          before extended use.
        </li>
      </ul>
    </main>
  );
}
