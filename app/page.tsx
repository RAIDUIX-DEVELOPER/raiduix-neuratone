import Link from "next/link";
import HeroWaves from "@/app/ui/HeroWaves";
import HeroButtons from "@/app/ui/HeroButtons";

export default function Home() {
  return (
    <main className="bg-[#0A0F1C] text-slate-300 flex flex-col">
      {/* Hero */}
      <section className="flex min-h-dvh flex-col items-center justify-center px-6 py-20 relative overflow-hidden">
        <HeroWaves />
        <div className="relative flex flex-col items-center z-10">
          <div className="hero-wordmark select-none">NeuraTone</div>
          <sup className="sup-branding">by Raiduix</sup>
          <HeroButtons />
        </div>
      </section>

      {/* Benefits Section */}
      <section className="px-6 pb-24 -mt-12 z-1">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-center text-xl font-semibold tracking-tight text-slate-200 mb-10">
            Why Layer Binaural & Isochronic Tones?
          </h2>
          <div className="grid gap-8 md:grid-cols-2">
            <div className="card spotlight rounded-lg p-6 bg-[#121826]/70 border border-slate-700/40">
              <h3 className="text-base font-semibold text-teal-300 mb-3">
                Binaural Beats
              </h3>
              <p className="text-sm leading-relaxed text-slate-300/80 mb-4">
                Binaural beats occur when two slightly different pure tones are
                played to each ear—your brain perceives the frequency difference
                as a gentle rhythmic pulse. Many listeners use them to help ease
                into focused, relaxed, or meditative states.
              </p>
              <ul className="text-xs space-y-1 text-slate-300/70 list-disc list-inside">
                <li>
                  <span className="text-slate-300/90">May support</span>{" "}
                  sustained focus & flow.
                </li>
                <li>
                  <span className="text-slate-300/90">Often used for</span>{" "}
                  gentle relaxation prep before sleep or study.
                </li>
                <li>
                  <span className="text-slate-300/90">Encourages</span>{" "}
                  brainwave entrainment (alpha / theta targeting) for some
                  users.
                </li>
              </ul>
            </div>
            <div className="card spotlight rounded-lg p-6 bg-[#121826]/70 border border-slate-700/40">
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
                  can feel more energizing.
                </li>
                <li>
                  <span className="text-slate-300/90">Useful for</span> focus
                  blocks or structured cognitive sessions.
                </li>
                <li>
                  <span className="text-slate-300/90">Pairs well with</span>{" "}
                  ambient layers for atmosphere.
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-10 rounded-md border border-amber-500/20 bg-amber-900/10 px-5 py-4 text-[11px] leading-relaxed text-amber-200/80 backdrop-blur-sm">
            <strong className="font-semibold text-amber-300">
              Disclaimer:
            </strong>{" "}
            Responses to auditory entrainment vary. Not medical or therapeutic
            advice. Do <span className="font-semibold text-amber-200">not</span>{" "}
            drive, operate heavy machinery, or engage in tasks requiring full
            alertness while actively listening to entrainment layers. If you
            have a neurological or auditory condition, consult a qualified
            professional before extended use.
          </div>
        </div>
      </section>
    </main>
  );
}
