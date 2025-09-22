export interface AcidFilterNodeHandle {
  inputGain: GainNode;
  outputGain: GainNode;
  wetGain: GainNode;
  dryGain: GainNode;
  lowpass: BiquadFilterNode;
  lfoOscillator: OscillatorNode;
  lfoGain: GainNode;
  cutoff: number;
  resonance: number;
  lfoRate: number;
  lfoDepth: number;
  mix: number;
  started: boolean;

  start(): void;
  stop(): void;
  dispose(): void;
  setCutoff(cutoff: number): void;
  setResonance(resonance: number): void;
  setLfoRate(rate: number): void;
  setLfoDepth(depth: number): void;
  setMix(mix: number): void;
}

export function createAcidFilterNode(
  context: AudioContext,
  cutoff: number = 1000,
  resonance: number = 15,
  lfoRate: number = 0.5,
  lfoDepth: number = 500,
  mix: number = 100
): AcidFilterNodeHandle {
  // Create nodes
  const inputGain = context.createGain();
  const outputGain = context.createGain();
  const wetGain = context.createGain();
  const dryGain = context.createGain();

  // Create the lowpass filter for acid sound
  const lowpass = context.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = cutoff;
  lowpass.Q.value = resonance; // High Q for that classic acid resonance

  // Create LFO for filter modulation
  const lfoOscillator = context.createOscillator();
  const lfoGain = context.createGain();

  // Set initial parameters
  inputGain.gain.value = 1;
  outputGain.gain.value = 1;

  // LFO setup
  lfoOscillator.frequency.value = lfoRate;
  lfoOscillator.type = "triangle"; // Triangle wave for smooth filter sweeps

  // LFO depth controls how much the filter frequency is modulated
  lfoGain.gain.value = lfoDepth;

  // Connect LFO to filter frequency
  lfoOscillator.connect(lfoGain);
  lfoGain.connect(lowpass.frequency);

  // Mix control
  const wetLevel = mix / 100;
  const dryLevel = 1 - wetLevel;
  wetGain.gain.value = wetLevel;
  dryGain.gain.value = dryLevel;

  // Connect dry signal
  inputGain.connect(dryGain);
  dryGain.connect(outputGain);

  // Connect wet signal through acid filter
  inputGain.connect(lowpass);
  lowpass.connect(wetGain);
  wetGain.connect(outputGain);

  let started = false;

  const handle: AcidFilterNodeHandle = {
    inputGain,
    outputGain,
    wetGain,
    dryGain,
    lowpass,
    lfoOscillator,
    lfoGain,
    cutoff,
    resonance,
    lfoRate,
    lfoDepth,
    mix,
    started,

    start() {
      if (!started) {
        lfoOscillator.start();
        started = true;
        handle.started = true;
      }
    },

    stop() {
      if (started) {
        lfoOscillator.stop();
        started = false;
        handle.started = false;
      }
    },

    dispose() {
      try {
        if (started) {
          lfoOscillator.stop();
        }
        lfoOscillator.disconnect();
        lfoGain.disconnect();
        lowpass.disconnect();
        inputGain.disconnect();
        outputGain.disconnect();
        wetGain.disconnect();
        dryGain.disconnect();
      } catch (error) {
        // Ignore errors during disposal
      }
    },

    setCutoff(newCutoff: number) {
      handle.cutoff = newCutoff;
      lowpass.frequency.setValueAtTime(newCutoff, context.currentTime);
    },

    setResonance(newResonance: number) {
      handle.resonance = newResonance;
      lowpass.Q.setValueAtTime(newResonance, context.currentTime);
    },

    setLfoRate(newRate: number) {
      handle.lfoRate = newRate;
      lfoOscillator.frequency.setValueAtTime(newRate, context.currentTime);
    },

    setLfoDepth(newDepth: number) {
      handle.lfoDepth = newDepth;
      lfoGain.gain.setValueAtTime(newDepth, context.currentTime);
    },

    setMix(newMix: number) {
      handle.mix = newMix;
      const wetLevel = newMix / 100;
      const dryLevel = 1 - wetLevel;
      wetGain.gain.setValueAtTime(wetLevel, context.currentTime);
      dryGain.gain.setValueAtTime(dryLevel, context.currentTime);
    },
  };

  return handle;
}
