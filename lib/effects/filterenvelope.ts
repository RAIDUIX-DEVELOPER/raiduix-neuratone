import type { AudioContext } from "standardized-audio-context";

export interface FilterEnvelopeNodeHandle {
  inputGain: any;
  outputGain: any;
  dispose: () => void;
  start: () => void;
  stop: () => void;
  setCutoff: (cutoff: number) => void;
  setResonance: (resonance: number) => void;
  setAttack: (attack: number) => void;
  setDecay: (decay: number) => void;
  setSustain: (sustain: number) => void;
  setRelease: (release: number) => void;
  setAmount: (amount: number) => void;
  setMix: (mix: number) => void;
  trigger: () => void; // Manual envelope trigger
  release: () => void; // Manual envelope release
}

export function createFilterEnvelopeNode(
  context: AudioContext,
  cutoff: number = 1000,
  resonance: number = 5,
  attack: number = 500,
  decay: number = 1000,
  sustain: number = 70,
  release: number = 2000,
  amount: number = 80,
  mix: number = 100
): FilterEnvelopeNodeHandle {
  // Input and output nodes
  const inputGain = context.createGain();
  const outputGain = context.createGain();
  const wetGain = context.createGain();
  const dryGain = context.createGain();

  // Main filter for envelope control
  const filter = context.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = cutoff;
  filter.Q.value = resonance;

  // Envelope generator using gain node automation
  const envelopeGain = context.createGain();
  envelopeGain.gain.value = 0;

  // Frequency modulation amount control
  const modulationGain = context.createGain();

  // Connect the signal chain
  inputGain.connect(dryGain); // Dry signal
  inputGain.connect(filter); // Wet signal through filter
  filter.connect(wetGain);

  // Envelope modulation chain
  // We'll use the envelope gain to control filter frequency
  envelopeGain.connect(modulationGain);
  // Connect modulation to filter frequency (using a constant source + gain)
  const constantSource = context.createConstantSource();
  constantSource.offset.value = 1;
  constantSource.start();

  // Mix wet and dry signals
  dryGain.connect(outputGain);
  wetGain.connect(outputGain);

  let isStarted = false;
  let currentEnvelopeState = "idle"; // idle, attack, decay, sustain, release
  let envelopeStartTime = 0;
  let sustainLevel = 0.7;
  let baseFrequency = cutoff;

  // Envelope automation functions
  const triggerEnvelope = () => {
    const now = context.currentTime;
    envelopeStartTime = now;
    currentEnvelopeState = "attack";

    // Clear any existing automation
    filter.frequency.cancelScheduledValues(now);

    // Calculate envelope stages
    const attackTime = attack / 1000; // Convert to seconds
    const decayTime = decay / 1000;
    const sustainValue = sustain / 100;
    const envelopeAmount = (amount / 100) * baseFrequency * 2; // Up to 2x base frequency

    // Attack phase: sweep from base frequency to peak
    filter.frequency.setValueAtTime(baseFrequency, now);
    filter.frequency.linearRampToValueAtTime(
      baseFrequency + envelopeAmount,
      now + attackTime
    );

    // Decay phase: sweep down to sustain level
    const sustainFreq = baseFrequency + envelopeAmount * sustainValue;
    filter.frequency.linearRampToValueAtTime(
      sustainFreq,
      now + attackTime + decayTime
    );

    currentEnvelopeState = "sustain";
  };

  const releaseEnvelope = () => {
    if (currentEnvelopeState === "idle") return;

    const now = context.currentTime;
    const releaseTime = release / 1000;

    // Clear existing automation and start release from current value
    filter.frequency.cancelScheduledValues(now);
    filter.frequency.linearRampToValueAtTime(baseFrequency, now + releaseTime);

    currentEnvelopeState = "release";

    // Set state back to idle after release
    setTimeout(() => {
      if (currentEnvelopeState === "release") {
        currentEnvelopeState = "idle";
      }
    }, releaseTime * 1000);
  };

  // Auto-trigger envelope periodically for demo purposes
  let autoTriggerInterval: number | null = null;

  const startAutoTrigger = () => {
    if (autoTriggerInterval) return;

    const triggerRate = 0.5; // Trigger every 2 seconds for demo
    autoTriggerInterval = window.setInterval(() => {
      if (
        currentEnvelopeState === "idle" ||
        currentEnvelopeState === "release"
      ) {
        triggerEnvelope();
        // Auto-release after attack + decay + 1 second of sustain
        setTimeout(() => {
          releaseEnvelope();
        }, attack + decay + 1000);
      }
    }, 1000 / triggerRate);
  };

  const stopAutoTrigger = () => {
    if (autoTriggerInterval) {
      clearInterval(autoTriggerInterval);
      autoTriggerInterval = null;
    }
  };

  const updateMix = () => {
    const wetLevel = mix / 100;
    const dryLevel = 1 - wetLevel;
    wetGain.gain.value = wetLevel;
    dryGain.gain.value = dryLevel;
  };

  const updateFilterBase = () => {
    baseFrequency = cutoff;
    filter.frequency.value = baseFrequency;
    filter.Q.value = resonance;
  };

  // Initialize parameters
  updateMix();
  updateFilterBase();

  return {
    inputGain,
    outputGain,
    dispose() {
      try {
        stopAutoTrigger();
        constantSource.stop();
        constantSource.disconnect();
        inputGain.disconnect();
        outputGain.disconnect();
        wetGain.disconnect();
        dryGain.disconnect();
        filter.disconnect();
        envelopeGain.disconnect();
        modulationGain.disconnect();
      } catch {
        // Ignore errors during cleanup
      }
    },
    start() {
      if (!isStarted) {
        isStarted = true;
        startAutoTrigger();
      }
    },
    stop() {
      if (isStarted) {
        isStarted = false;
        stopAutoTrigger();
        releaseEnvelope();
      }
    },
    setCutoff(newCutoff: number) {
      cutoff = Math.max(20, Math.min(20000, newCutoff));
      updateFilterBase();
    },
    setResonance(newResonance: number) {
      resonance = Math.max(0, Math.min(30, newResonance));
      updateFilterBase();
    },
    setAttack(newAttack: number) {
      attack = Math.max(10, Math.min(5000, newAttack));
    },
    setDecay(newDecay: number) {
      decay = Math.max(10, Math.min(5000, newDecay));
    },
    setSustain(newSustain: number) {
      sustain = Math.max(0, Math.min(100, newSustain));
      sustainLevel = sustain / 100;
    },
    setRelease(newRelease: number) {
      release = Math.max(10, Math.min(5000, newRelease));
    },
    setAmount(newAmount: number) {
      amount = Math.max(0, Math.min(100, newAmount));
    },
    setMix(newMix: number) {
      mix = Math.max(0, Math.min(100, newMix));
      updateMix();
    },
    trigger() {
      triggerEnvelope();
    },
    release() {
      releaseEnvelope();
    },
  };
}
