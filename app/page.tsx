import MinimalCinematicHero from "@/app/ui/MinimalCinematicHero";
import Reveal from "@/app/ui/Reveal";
import Script from "next/script";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0A0F1C] text-slate-300">
      <Script
        id="softwareapplication-jsonld"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "NeuraTone",
            applicationCategory: "MultimediaApplication",
            operatingSystem: "Web",
            offers: { "@type": "Offer", price: 0, priceCurrency: "USD" },
            url: "/",
            publisher: { "@type": "Organization", name: "NeuraTone" },
          }),
        }}
      />
      <MinimalCinematicHero />

      {/* Content Section */}
      <section className="content-section px-6 min-h-screen flex items-center relative z-20">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <h2 className="text-center text-2xl font-semibold tracking-tight text-slate-200 mb-16">
              Why Layer Binaural & Isochronic Tones?
            </h2>
          </Reveal>

          <div className="grid gap-8 md:grid-cols-2">
            <Reveal>
              <div className="card spotlight rounded-lg p-6">
                <h3 className="text-base font-semibold text-teal-300 mb-3">
                  Binaural Beats
                </h3>
                <p className="text-sm leading-relaxed text-slate-300/80 mb-4">
                  Binaural beats occur when two slightly different pure tones
                  are played to each ear—your brain perceives the frequency
                  difference as a gentle rhythmic pulse. Many listeners use them
                  to help ease into focused, relaxed, or meditative states.
                </p>
                <ul className="text-xs space-y-1 text-slate-300/70 list-disc list-inside">
                  <li>
                    <span className="text-slate-300/90">May support</span>{" "}
                    sustained focus & flow states
                  </li>
                  <li>
                    <span className="text-slate-300/90">Often used for</span>{" "}
                    gentle relaxation prep before sleep or study
                  </li>
                  <li>
                    <span className="text-slate-300/90">Encourages</span>{" "}
                    brainwave entrainment for some users
                  </li>
                </ul>
              </div>
            </Reveal>

            <Reveal delay={0.2}>
              <div className="card spotlight rounded-lg p-6">
                <h3 className="text-base font-semibold text-teal-300 mb-3">
                  Isochronic Tones
                </h3>
                <p className="text-sm leading-relaxed text-slate-300/80 mb-4">
                  Isochronic tones are single tones pulsed on and off at precise
                  intervals. Their sharp, regular modulation can produce a more
                  pronounced rhythmic stimulation compared to binaural beats for
                  some listeners.
                </p>
                <ul className="text-xs space-y-1 text-slate-300/70 list-disc list-inside">
                  <li>
                    <span className="text-slate-300/90">
                      Clear rhythmic gating
                    </span>{" "}
                    can feel more energizing
                  </li>
                  <li>
                    <span className="text-slate-300/90">Useful for</span> focus
                    blocks or structured cognitive sessions
                  </li>
                  <li>
                    <span className="text-slate-300/90">Pairs well with</span>{" "}
                    ambient layers for atmosphere
                  </li>
                </ul>
              </div>
            </Reveal>
          </div>

          {/* How To Use Guide (full width) */}
          <div className="grid gap-8 md:grid-cols-2 mt-14">
            <Reveal className="md:col-span-2">
              <div className="card spotlight rounded-lg p-6">
                <h3 className="text-base font-semibold text-teal-300 mb-4">
                  How to Use
                </h3>
                <p className="text-sm leading-relaxed text-slate-300/80 mb-4">
                  A simple layering approach to get the most out of binaural and
                  isochronic tones without overwhelming your ears or focus.
                </p>
                <ol className="list-decimal list-inside space-y-2 text-xs text-slate-300/75">
                  <li>
                    Choose your desired state (focus, calm, wind‑down). Keep
                    expectations light—responses vary.
                  </li>
                  <li>
                    Start playback at a comfortable master volume. Keep
                    entrainment layers slightly lower than any ambient bed or
                    music.
                  </li>
                  <li>
                    Make small adjustments. Increase only if you still feel
                    neutral after a few minutes; reduce if you feel pressure or
                    fatigue.
                  </li>
                  <li>
                    Use good stereo headphones for binaural beats. Isochronic
                    tones still function over speakers, but combined use favors
                    headphones.
                  </li>
                  <li>
                    Allow 10–15 minutes for gentle settling. 25–40 minute
                    sessions often work well for deeper focus or relaxation
                    blocks.
                  </li>
                  <li>
                    Stop or dial back immediately if you feel discomfort,
                    agitation, or headache—entrainment should remain subtle.
                  </li>
                </ol>
                <p className="mt-5 text-[11px] text-slate-400/70">
                  Tip: Less intensity usually sustains longer, smoother
                  sessions.
                </p>
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.4}>
            <div className="mt-10 rounded-md bg-amber-900/5 px-5 py-4 text-[11px] leading-relaxed text-amber-200/75 backdrop-blur-sm border border-amber-200/15">
              <strong className="font-semibold text-amber-300">
                Disclaimer:
              </strong>{" "}
              Responses to auditory entrainment vary. Not medical or therapeutic
              advice. Do{" "}
              <span className="font-semibold text-amber-200">not</span> drive,
              operate heavy machinery, or engage in tasks requiring full
              alertness while actively listening to entrainment layers. If you
              have a neurological or auditory condition, consult a qualified
              professional before extended use.
            </div>
          </Reveal>
        </div>
      </section>

      {/* Learn Section (anchors for header) */}
      <section id="learn" className="px-6 py-20 scroll-mt-28 relative z-20">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <h2 className="text-center text-2xl font-semibold tracking-tight text-slate-200 mb-12">
              Learn the Basics
            </h2>
          </Reveal>
          <div className="grid gap-6 md:grid-cols-2 items-stretch">
            <Reveal className="h-full">
              <div className="card spotlight rounded-lg p-6 h-full flex flex-col">
                <h3 className="text-base font-semibold text-teal-300 mb-2">
                  What are binaural beats?
                </h3>
                <p className="text-sm text-slate-300/80 mb-4">
                  Two slightly different tones presented to each ear create a
                  perceived beat equal to the difference. Some listeners find
                  this helps them gently settle into focus, calm, or sleep
                  routines.
                </p>
                <div className="flex gap-2 mt-auto">
                  <Link
                    href={{ pathname: "/app", query: { preset: "calm" } }}
                    prefetch
                    className="spotlight btn-shape text-[12px] px-3 py-1.5 ring-1 ring-white/5 hover:ring-teal-400/30 text-slate-200/85 hover:text-teal-100 bg-[#0b1220]/70"
                    data-analytics-event="learn_cta_click"
                    data-analytics-label="binaural_start_calm"
                  >
                    Try Calm preset
                  </Link>
                </div>
              </div>
            </Reveal>
            <Reveal delay={0.1} className="h-full">
              <div className="card spotlight rounded-lg p-6 h-full flex flex-col">
                <h3 className="text-base font-semibold text-teal-300 mb-2">
                  What are isochronic tones?
                </h3>
                <p className="text-sm text-slate-300/80 mb-4">
                  A single tone pulsed on and off at a set rate. The crisp
                  rhythmic gating can feel more pronounced and works over
                  speakers—headphones still recommended when layering with
                  binaurals.
                </p>
                <div className="flex gap-2 mt-auto">
                  <Link
                    href={{ pathname: "/app", query: { preset: "focus" } }}
                    prefetch
                    className="spotlight btn-shape text-[12px] px-3 py-1.5 ring-1 ring-white/5 hover:ring-teal-400/30 text-slate-200/85 hover:text-teal-100 bg-[#0b1220]/70"
                    data-analytics-event="learn_cta_click"
                    data-analytics-label="isochronic_start_focus"
                  >
                    Try Focus preset
                  </Link>
                </div>
              </div>
            </Reveal>
            <Reveal delay={0.2} className="h-full">
              <div className="card spotlight rounded-lg p-6 h-full flex flex-col">
                <h3 className="text-base font-semibold text-teal-300 mb-2">
                  Brainwave ranges
                </h3>
                <p className="text-sm text-slate-300/80 mb-3">
                  Common guides: Delta (0.5–4 Hz, deep sleep), Theta (4–8 Hz,
                  calm/creative), Alpha (8–12 Hz, relaxed focus), Beta (12–20
                  Hz, active focus). Use as gentle starting points—not strict
                  rules.
                </p>
                <ul className="text-xs space-y-1 text-slate-300/70 list-disc list-inside">
                  <li>Sleep: Delta emphasis with low volume layers</li>
                  <li>Calm: Theta with soft ambient bed</li>
                  <li>Focus: Low Alpha to low Beta with subtle pulses</li>
                </ul>
              </div>
            </Reveal>
            <Reveal delay={0.3} className="h-full">
              <div className="card spotlight rounded-lg p-6 h-full flex flex-col">
                <h3 className="text-base font-semibold text-teal-300 mb-2">
                  Safety & best practices
                </h3>
                <p className="text-sm text-slate-300/80 mb-3">
                  Keep volumes comfortable, take breaks, and listen for signs of
                  fatigue. If you have auditory or neurological concerns,
                  consult a qualified professional before extended use.
                </p>
                <Link
                  href="#faq"
                  className="spotlight btn-shape inline-block text-[12px] px-3 py-1.5 ring-1 ring-white/5 hover:ring-teal-400/30 text-slate-200/85 hover:text-teal-100 bg-[#0b1220]/70 mt-auto"
                  data-analytics-event="learn_cta_click"
                  data-analytics-label="safety_read_faq"
                >
                  Read FAQs
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* FAQ Section with JSON-LD */}
      <section id="faq" className="px-6 py-20 scroll-mt-28 relative z-20">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <h2 className="text-center text-2xl font-semibold tracking-tight text-slate-200 mb-10">
              Frequently Asked Questions
            </h2>
          </Reveal>

          <div className="grid gap-5 md:grid-cols-2 items-stretch">
            <Reveal className="h-full">
              <div className="card spotlight rounded-lg p-5 h-full flex flex-col">
                <h3 className="text-sm font-semibold text-teal-300 mb-2">
                  Do I need headphones?
                </h3>
                <p className="text-sm text-slate-300/80">
                  Headphones are recommended for binaural beats (left/right
                  separation). Isochronic tones can work over speakers, but
                  layering both is best through headphones.
                </p>
              </div>
            </Reveal>
            <Reveal delay={0.1} className="h-full">
              <div className="card spotlight rounded-lg p-5 h-full flex flex-col">
                <h3 className="text-sm font-semibold text-teal-300 mb-2">
                  How long should I listen?
                </h3>
                <p className="text-sm text-slate-300/80">
                  Start with 10–15 minutes and extend to 25–40 minutes if it
                  feels good. Keep intensity modest to avoid fatigue.
                </p>
              </div>
            </Reveal>
            <Reveal delay={0.2} className="h-full">
              <div className="card spotlight rounded-lg p-5 h-full flex flex-col">
                <h3 className="text-sm font-semibold text-teal-300 mb-2">
                  Is this medical treatment?
                </h3>
                <p className="text-sm text-slate-300/80">
                  No. This is not medical or therapeutic advice. If you have
                  health concerns, consult a qualified professional.
                </p>
              </div>
            </Reveal>
            <Reveal delay={0.3} className="h-full">
              <div className="card spotlight rounded-lg p-5 h-full flex flex-col">
                <h3 className="text-sm font-semibold text-teal-300 mb-2">
                  Why layer binaural with isochronic?
                </h3>
                <p className="text-sm text-slate-300/80">
                  The gentle ear‑based beat plus a clear rhythmic pulse can feel
                  more immersive for some listeners—keep both at comfortable
                  levels.
                </p>
              </div>
            </Reveal>
            <Reveal delay={0.4} className="h-full">
              <div className="card spotlight rounded-lg p-5 h-full flex flex-col">
                <h3 className="text-sm font-semibold text-teal-300 mb-2">
                  Will it work for everyone?
                </h3>
                <p className="text-sm text-slate-300/80">
                  Responses vary. Treat it like a light aid for mood and
                  focus—not a guarantee. Adjust gently and stop if
                  uncomfortable.
                </p>
              </div>
            </Reveal>
            <Reveal delay={0.5} className="h-full">
              <div className="card spotlight rounded-lg p-5 h-full flex flex-col">
                <h3 className="text-sm font-semibold text-teal-300 mb-2">
                  What presets should I try first?
                </h3>
                <p className="text-sm text-slate-300/80">
                  Try Calm for a balanced start, Focus for structured work, and
                  Sleep for wind‑down. Fine‑tune volumes in the mixer.
                </p>
                <div className="flex flex-wrap gap-2 mt-auto">
                  <Link
                    href={{ pathname: "/app", query: { preset: "calm" } }}
                    prefetch
                    className="spotlight btn-shape text-[12px] px-3 py-1.5 ring-1 ring-white/5 hover:ring-teal-400/30 text-slate-200/85 hover:text-teal-100 bg-[#0b1220]/70"
                    data-analytics-event="faq_cta_click"
                    data-analytics-label="preset_calm"
                  >
                    Calm
                  </Link>
                  <Link
                    href={{ pathname: "/app", query: { preset: "focus" } }}
                    prefetch
                    className="spotlight btn-shape text-[12px] px-3 py-1.5 ring-1 ring-white/5 hover:ring-teal-400/30 text-slate-200/85 hover:text-teal-100 bg-[#0b1220]/70"
                    data-analytics-event="faq_cta_click"
                    data-analytics-label="preset_focus"
                  >
                    Focus
                  </Link>
                  <Link
                    href={{ pathname: "/app", query: { preset: "sleep" } }}
                    prefetch
                    className="spotlight btn-shape text-[12px] px-3 py-1.5 ring-1 ring-white/5 hover:ring-teal-400/30 text-slate-200/85 hover:text-teal-100 bg-[#0b1220]/70"
                    data-analytics-event="faq_cta_click"
                    data-analytics-label="preset_sleep"
                  >
                    Sleep
                  </Link>
                </div>
              </div>
            </Reveal>
          </div>
        </div>

        {/* FAQPage JSON-LD for Home */}
        <Script
          id="faqpage-jsonld-home"
          type="application/ld+json"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: [
                {
                  "@type": "Question",
                  name: "Do I need headphones?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "Headphones are recommended for binaural beats (left/right separation). Isochronic tones can work over speakers, but layering both is best through headphones.",
                  },
                },
                {
                  "@type": "Question",
                  name: "How long should I listen?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "Start with 10–15 minutes and extend to 25–40 minutes if it feels good. Keep intensity modest to avoid fatigue.",
                  },
                },
                {
                  "@type": "Question",
                  name: "Is this medical treatment?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "No. This is not medical or therapeutic advice. If you have health concerns, consult a qualified professional.",
                  },
                },
                {
                  "@type": "Question",
                  name: "Why layer binaural with isochronic?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "The gentle ear-based beat plus a clear rhythmic pulse can feel more immersive for some listeners—keep both at comfortable levels.",
                  },
                },
                {
                  "@type": "Question",
                  name: "Will it work for everyone?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "Responses vary. Treat it like a light aid for mood and focus—not a guarantee. Adjust gently and stop if uncomfortable.",
                  },
                },
                {
                  "@type": "Question",
                  name: "What presets should I try first?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "Try Calm for a balanced start, Focus for structured work, and Sleep for wind-down. Fine-tune volumes in the mixer.",
                  },
                },
              ],
            }),
          }}
        />
      </section>
    </main>
  );
}
