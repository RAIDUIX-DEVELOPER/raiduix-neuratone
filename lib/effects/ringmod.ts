"use client";

export interface RingModNodeHandle {
  inputGain: GainNode;
  outputGain: GainNode;
  modulator: OscillatorNode;
  modulatorGain: GainNode;
  ringModGain: GainNode;
  dryGain: GainNode;
  wetGain: GainNode;
  originalPan?: number;
  isRunning?: boolean;
  setFrequency: (frequency: number) => void;
  setIntensity: (intensity: number) => void; // 0..1
  start: () => void;
  stop: () => void;
  connect: (dest: AudioNode) => void;
  disconnect: () => void;
  dispose: () => void;
}

export async function createRingModNode(
  ctx: AudioContext,
  opts?: {
    frequency?: number; // Hz - modulator frequency
    intensity?: number; // 0..1 - ring modulation intensity
  }
): Promise<RingModNodeHandle> {
  // Create audio processing nodes
  const inputGain = ctx.createGain();
  const outputGain = ctx.createGain();
  const dryGain = ctx.createGain();
  const wetGain = ctx.createGain();
  const ringModGain = ctx.createGain();

  // Create ring modulator oscillator
  const modulator = ctx.createOscillator();
  const modulatorGain = ctx.createGain();

  // Configure audio processing
  inputGain.gain.value = 1;
  outputGain.gain.value = 1;
  ringModGain.gain.value = 1; // This will be modulated by the LFO

  // Configure ring modulator
  modulator.type = "sine"; // Classic ring mod uses sine wave
  modulator.frequency.value = opts?.frequency ?? 30; // Default 30 Hz modulation

  // Configure modulation intensity (wet/dry mix)
  const intensity = opts?.intensity ?? 0.5;
  wetGain.gain.value = intensity;
  dryGain.gain.value = 1 - intensity;

  // Configure modulation depth
  modulatorGain.gain.value = 0.5; // 50% modulation depth

  // Connect dry signal path
  inputGain.connect(dryGain);
  dryGain.connect(outputGain);

  // Connect wet (ring modulated) signal path
  // Audio signal through gain node that's modulated by oscillator
  inputGain.connect(ringModGain);
  ringModGain.connect(wetGain);
  wetGain.connect(outputGain);

  // Connect modulator to control the ring mod gain
  // Modulator needs to be offset to avoid negative values
  const dcOffset = ctx.createConstantSource();
  dcOffset.offset.value = 1; // 1 + oscillator (-1 to +1) = 0 to 2
  dcOffset.start();

  modulator.connect(modulatorGain);
  modulatorGain.connect(ringModGain.gain);
  dcOffset.connect(ringModGain.gain);

  const setFrequency = (frequency: number) => {
    const fv = Number.isFinite(frequency) ? frequency : opts?.frequency ?? 30;
    const freq = Math.max(0.1, Math.min(1000, fv)); // Limit 0.1Hz-1000Hz
    modulator.frequency.setValueAtTime(freq, ctx.currentTime);
  };

  const setIntensity = (intensity: number) => {
    const iv = Number.isFinite(intensity) ? intensity : opts?.intensity ?? 0.5;
    const intens = Math.max(0, Math.min(1, iv)); // Clamp 0-1
    wetGain.gain.setValueAtTime(intens, ctx.currentTime);
    dryGain.gain.setValueAtTime(1 - intens, ctx.currentTime);
  };

  return {
    inputGain,
    outputGain,
    modulator,
    modulatorGain,
    ringModGain,
    dryGain,
    wetGain,
    isRunning: false,
    setFrequency,
    setIntensity,
    start: () => {
      try {
        modulator.start();
      } catch {}
    },
    stop: () => {
      try {
        modulator.stop();
      } catch {}
    },
    connect: (dest: AudioNode) => {
      outputGain.connect(dest);
    },
    disconnect: () => {
      // Chain manages audio I/O; only disconnect control signals here
      try {
        modulator.disconnect();
      } catch {}
      try {
        modulatorGain.disconnect();
      } catch {}
      try {
        dcOffset.disconnect();
      } catch {}
    },
    dispose: () => {
      try {
        modulator.stop();
      } catch {}
      try {
        dcOffset.stop();
      } catch {}
      try {
        modulator.disconnect();
      } catch {}
      try {
        modulatorGain.disconnect();
      } catch {}
      try {
        dcOffset.disconnect();
      } catch {}
    },
  };
}
