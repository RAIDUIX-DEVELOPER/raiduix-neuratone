import type { AudioContext } from "standardized-audio-context";

export interface HarmonicExciterNodeHandle {
  inputGain: any;
  outputGain: any;
  dispose: () => void;
  start: () => void;
  stop: () => void;
  setDrive: (drive: number) => void;
  setHarmonics: (harmonics: number) => void;
  setTone: (tone: number) => void;
  setMix: (mix: number) => void;
}

export function createHarmonicExciterNode(
  context: AudioContext,
  drive: number = 30,
  harmonics: number = 50,
  tone: number = 50,
  mix: number = 50
): HarmonicExciterNodeHandle {
  // Input and output nodes
  const inputGain = context.createGain();
  const outputGain = context.createGain();
  const wetGain = context.createGain();
  const dryGain = context.createGain();

  // High-pass filter to isolate frequencies for excitation
  const highPassFilter = context.createBiquadFilter();
  highPassFilter.type = "highpass";
  highPassFilter.frequency.value = 2000; // Start exciting from 2kHz
  highPassFilter.Q.value = 0.7;

  // Wave shaper for harmonic distortion
  const waveShaper = context.createWaveShaper();
  waveShaper.oversample = "4x"; // High quality oversampling

  // Pre-gain for wave shaper drive
  const preGain = context.createGain();

  // Post-filter to shape the harmonic content
  const toneFilter = context.createBiquadFilter();
  toneFilter.type = "peaking";
  toneFilter.frequency.value = 4000; // Enhance presence frequencies
  toneFilter.Q.value = 1.0;

  // Output gain for harmonic level control
  const harmonicsGain = context.createGain();

  // Create wave shaping curve for harmonic generation
  const createWaveShaperCurve = (driveAmount: number) => {
    const samples = 65536;
    const curve = new Float32Array(samples);

    for (let i = 0; i < samples; i++) {
      const x = i / (samples / 2) - 1; // -1 to 1

      // Asymmetric wave shaping for even harmonics
      const driveScale = 1 + (driveAmount / 100) * 4; // 1 to 5x drive
      let shaped;

      if (x >= 0) {
        // Positive half - soft saturation with harmonic generation
        shaped = Math.tanh(x * driveScale) * (1 + (driveAmount / 100) * 0.3);
      } else {
        // Negative half - different curve for asymmetry (creates even harmonics)
        shaped =
          Math.tanh(x * driveScale * 0.8) * (1 + (driveAmount / 100) * 0.2);
      }

      curve[i] = Math.max(-1, Math.min(1, shaped));
    }

    return curve;
  };

  // Connect the signal chain
  // Main path: input -> highpass -> pregain -> waveshaper -> tone filter -> harmonics gain -> wet gain
  inputGain.connect(dryGain); // Dry signal
  inputGain.connect(highPassFilter);
  highPassFilter.connect(preGain);
  preGain.connect(waveShaper);
  waveShaper.connect(toneFilter);
  toneFilter.connect(harmonicsGain);
  harmonicsGain.connect(wetGain);

  // Mix wet and dry signals
  dryGain.connect(outputGain);
  wetGain.connect(outputGain);

  let isStarted = false;

  const updateDrive = () => {
    // Update wave shaper curve
    waveShaper.curve = createWaveShaperCurve(drive);

    // Adjust pre-gain
    const preGainValue = 1 + (drive / 100) * 2; // 1 to 3x gain
    preGain.gain.value = preGainValue;
  };

  const updateHarmonics = () => {
    // Control the level of generated harmonics
    const harmonicsLevel = harmonics / 100;
    harmonicsGain.gain.value = harmonicsLevel * 2; // 0 to 2x gain
  };

  const updateTone = () => {
    // Tone control affects the frequency response of the harmonic content
    const toneValue = tone / 100; // 0 to 1

    // Adjust tone filter frequency (2kHz to 8kHz)
    toneFilter.frequency.value = 2000 + toneValue * 6000;

    // Adjust gain (-12dB to +12dB)
    const gainDb = (toneValue - 0.5) * 24; // -12 to +12 dB
    toneFilter.gain.value = gainDb;
  };

  const updateMix = () => {
    const wetLevel = mix / 100;
    const dryLevel = 1 - wetLevel;
    wetGain.gain.value = wetLevel;
    dryGain.gain.value = dryLevel;
  };

  // Initialize parameters
  updateDrive();
  updateHarmonics();
  updateTone();
  updateMix();

  return {
    inputGain,
    outputGain,
    dispose() {
      try {
        inputGain.disconnect();
        outputGain.disconnect();
        wetGain.disconnect();
        dryGain.disconnect();
        highPassFilter.disconnect();
        waveShaper.disconnect();
        preGain.disconnect();
        toneFilter.disconnect();
        harmonicsGain.disconnect();
      } catch {
        // Ignore errors during cleanup
      }
    },
    start() {
      if (!isStarted) {
        isStarted = true;
        // No oscillators to start in this effect
      }
    },
    stop() {
      if (isStarted) {
        isStarted = false;
        // No oscillators to stop in this effect
      }
    },
    setDrive(newDrive: number) {
      drive = Math.max(0, Math.min(100, newDrive));
      updateDrive();
    },
    setHarmonics(newHarmonics: number) {
      harmonics = Math.max(0, Math.min(100, newHarmonics));
      updateHarmonics();
    },
    setTone(newTone: number) {
      tone = Math.max(0, Math.min(100, newTone));
      updateTone();
    },
    setMix(newMix: number) {
      mix = Math.max(0, Math.min(100, newMix));
      updateMix();
    },
  };
}
