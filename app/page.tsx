import MinimalCinematicHero from "@/app/ui/MinimalCinematicHero";
import Reveal from "@/app/ui/Reveal";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0A0F1C] text-slate-300">
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
    </main>
  );
}
