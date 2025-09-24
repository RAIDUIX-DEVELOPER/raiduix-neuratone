// Removed incorrect import - using native Web Audio API AudioContext

export interface GateEffectNodeHandle {
  inputGain: any;
  outputGain: any;
  dispose: () => void;
  start: () => void;
  stop: () => void;
  setRate: (rate: number) => void;
  setThreshold: (threshold: number) => void;
  setAttack: (attack: number) => void;
  setRelease: (release: number) => void;
  setMix: (mix: number) => void;
}

export function createGateEffectNode(
  context: AudioContext,
  rate: number = 4,
  threshold: number = 50,
  attack: number = 10,
  release: number = 100,
  mix: number = 100
): GateEffectNodeHandle {
  // Input and output nodes
  const inputGain = context.createGain();
  const outputGain = context.createGain();
  const wetGain = context.createGain();
  const dryGain = context.createGain();

  // Gate control oscillator - generates rhythmic pulse
  const gateOsc = context.createOscillator();
  gateOsc.type = "square"; // Square wave for clean on/off gating
  gateOsc.frequency.value = rate;

  // Envelope follower using rectifier and smoothing filter
  const rectifier = context.createWaveShaper();
  const smoothingFilter = context.createBiquadFilter();

  // Rectifier curve - converts square wave to unipolar signal
  const rectifierCurve = new Float32Array(65536);
  for (let i = 0; i < 65536; i++) {
    const x = i / 32768 - 1; // -1 to 1
    rectifierCurve[i] = x >= 0 ? 1 : 0; // Rectify: keep positive, zero negative
  }
  rectifier.curve = rectifierCurve;

  // Smoothing filter for envelope shaping (lowpass)
  smoothingFilter.type = "lowpass";
  smoothingFilter.frequency.value = 1000 / (attack + release); // Faster filter for faster envelopes

  // VCA (Voltage Controlled Amplifier) for gating
  const vca = context.createGain();

  // Connect the gate signal path: oscillator -> rectifier -> smoothing -> VCA gain
  gateOsc.connect(rectifier);
  rectifier.connect(smoothingFilter);
  smoothingFilter.connect(vca.gain);

  // Connect audio signal path
  inputGain.connect(dryGain); // Dry signal
  inputGain.connect(vca); // Input to VCA
  vca.connect(wetGain); // Gated signal

  // Mix wet and dry signals
  dryGain.connect(outputGain);
  wetGain.connect(outputGain);

  let isStarted = false;

  const updateMix = () => {
    const wetLevel = mix / 100;
    const dryLevel = 1 - wetLevel;
    wetGain.gain.value = wetLevel;
    dryGain.gain.value = dryLevel;
  };

  const updateThreshold = () => {
    // Threshold controls the baseline gate level
    const baseLevel = (100 - threshold) / 100;
    vca.gain.value = baseLevel;
  };

  const updateEnvelope = () => {
    // Update smoothing filter based on attack/release times
    const envelopeSpeed = 1000 / Math.max(attack + release, 20);
    smoothingFilter.frequency.value = Math.min(envelopeSpeed, 20000);
  };

  // Initialize parameters
  updateMix();
  updateThreshold();
  updateEnvelope();

  return {
    inputGain,
    outputGain,
    dispose() {
      try {
        if (isStarted) {
          gateOsc.stop();
        }
        gateOsc.disconnect();
        rectifier.disconnect();
        smoothingFilter.disconnect();
        vca.disconnect();
        inputGain.disconnect();
        outputGain.disconnect();
        wetGain.disconnect();
        dryGain.disconnect();
      } catch {
        // Ignore errors during cleanup
      }
    },
    start() {
      if (!isStarted) {
        try {
          gateOsc.start();
          isStarted = true;
        } catch {
          // Oscillator might already be started
        }
      }
    },
    stop() {
      if (isStarted) {
        try {
          gateOsc.stop();
          isStarted = false;
        } catch {
          // Oscillator might already be stopped
        }
      }
    },
    setRate(newRate: number) {
      rate = Math.max(0.1, Math.min(20, newRate));
      if (isStarted) {
        gateOsc.frequency.setValueAtTime(rate, context.currentTime);
      } else {
        gateOsc.frequency.value = rate;
      }
    },
    setThreshold(newThreshold: number) {
      threshold = Math.max(0, Math.min(100, newThreshold));
      updateThreshold();
    },
    setAttack(newAttack: number) {
      attack = Math.max(1, Math.min(100, newAttack));
      updateEnvelope();
    },
    setRelease(newRelease: number) {
      release = Math.max(10, Math.min(1000, newRelease));
      updateEnvelope();
    },
    setMix(newMix: number) {
      mix = Math.max(0, Math.min(100, newMix));
      updateMix();
    },
  };
}
