import type { AudioContext } from "standardized-audio-context";

export interface SupersawNodeHandle {
  inputGain: any;
  outputGain: any;
  dispose: () => void;
  start: () => void;
  stop: () => void;
  setVoices: (voices: number) => void;
  setDetune: (detune: number) => void;
  setStereoWidth: (width: number) => void;
  setMix: (mix: number) => void;
}

export function createSupersawNode(
  context: AudioContext,
  voices: number = 7,
  detune: number = 25,
  stereoWidth: number = 100,
  mix: number = 100
): SupersawNodeHandle {
  // Input and output nodes
  const inputGain = context.createGain();
  const outputGain = context.createGain();
  const wetGain = context.createGain();
  const dryGain = context.createGain();

  // Oscillator bank for unison voices
  let oscillators: any[] = [];
  let oscillatorGains: any[] = [];
  let panNodes: any[] = [];
  let isStarted = false;
  let baseFrequency = 220; // Default frequency

  // Low-pass filter to tame harshness
  const lowPassFilter = context.createBiquadFilter();
  lowPassFilter.type = "lowpass";
  lowPassFilter.frequency.value = 12000;
  lowPassFilter.Q.value = 0.7;

  // High-pass filter to remove muddiness
  const highPassFilter = context.createBiquadFilter();
  highPassFilter.type = "highpass";
  highPassFilter.frequency.value = 40;
  highPassFilter.Q.value = 0.5;

  // Compressor to control dynamics
  const compressor = (context as any).createDynamicsCompressor?.();
  if (compressor) {
    compressor.threshold.value = -12;
    compressor.knee.value = 3;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.1;
  }

  // Setup audio routing
  inputGain.connect(dryGain);
  inputGain.connect(highPassFilter);

  if (compressor) {
    highPassFilter.connect(lowPassFilter);
    lowPassFilter.connect(compressor);
    compressor.connect(wetGain);
  } else {
    highPassFilter.connect(lowPassFilter);
    lowPassFilter.connect(wetGain);
  }

  wetGain.connect(outputGain);
  dryGain.connect(outputGain);

  // Create unison oscillator bank
  function createOscillatorBank(
    voiceCount: number,
    detuneAmount: number,
    stereoSpread: number
  ) {
    // Stop and dispose existing oscillators
    stopOscillators();

    oscillators = [];
    oscillatorGains = [];
    panNodes = [];

    const gainPerVoice = 1 / Math.sqrt(voiceCount); // Prevent volume buildup

    for (let i = 0; i < voiceCount; i++) {
      const osc = context.createOscillator();
      const gain = context.createGain();
      const pan = context.createStereoPanner();

      // Configure oscillator
      osc.type = "sawtooth";
      osc.frequency.value = baseFrequency;

      // Calculate detune for this voice
      let detuneValue = 0;
      if (i > 0) {
        const spread = detuneAmount / 100; // Convert percentage to cents factor
        const position = (i - 1) / Math.max(1, voiceCount - 1); // Normalize position 0-1
        detuneValue = (position - 0.5) * spread * 100; // Convert to cents
      }
      osc.detune.value = detuneValue;

      // Configure gain
      gain.gain.value = gainPerVoice;

      // Configure stereo panning
      let panValue = 0;
      if (voiceCount > 1) {
        const panSpread = stereoSpread / 100; // Convert percentage to pan range
        const position = i / Math.max(1, voiceCount - 1); // Normalize position 0-1
        panValue = (position - 0.5) * 2 * panSpread; // Convert to -1 to +1 range
        panValue = Math.max(-1, Math.min(1, panValue)); // Clamp to valid range
      }
      pan.pan.value = panValue;

      // Connect audio chain
      osc.connect(gain);
      gain.connect(pan);
      pan.connect(highPassFilter);

      oscillators.push(osc);
      oscillatorGains.push(gain);
      panNodes.push(pan);

      // Start oscillator if we're already started
      if (isStarted) {
        osc.start();
      }
    }
  }

  function stopOscillators() {
    oscillators.forEach((osc) => {
      try {
        osc.stop();
      } catch {}
      try {
        osc.disconnect();
      } catch {}
    });
    oscillatorGains.forEach((gain) => {
      try {
        gain.disconnect();
      } catch {}
    });
    panNodes.forEach((pan) => {
      try {
        pan.disconnect();
      } catch {}
    });
    oscillators = [];
    oscillatorGains = [];
    panNodes = [];
  }

  // Initialize oscillator bank
  createOscillatorBank(voices, detune, stereoWidth);

  // Set mix levels
  function updateMix(mixValue: number) {
    const mixNorm = Math.max(0, Math.min(100, mixValue)) / 100;
    wetGain.gain.value = mixNorm;
    dryGain.gain.value = 1 - mixNorm;
  }
  updateMix(mix);

  return {
    inputGain,
    outputGain,

    start: () => {
      if (!isStarted) {
        isStarted = true;
        oscillators.forEach((osc) => {
          try {
            osc.start();
          } catch {}
        });
      }
    },

    stop: () => {
      if (isStarted) {
        isStarted = false;
        stopOscillators();
      }
    },

    dispose: () => {
      stopOscillators();

      try {
        inputGain.disconnect();
        outputGain.disconnect();
        wetGain.disconnect();
        dryGain.disconnect();
        lowPassFilter.disconnect();
        highPassFilter.disconnect();
        if (compressor) compressor.disconnect();
      } catch {}
    },

    setVoices: (voiceCount: number) => {
      const clampedVoices = Math.max(1, Math.min(16, Math.round(voiceCount)));
      if (clampedVoices !== oscillators.length) {
        const wasStarted = isStarted;
        if (isStarted) {
          isStarted = false;
          stopOscillators();
        }
        createOscillatorBank(clampedVoices, detune, stereoWidth);
        if (wasStarted) {
          isStarted = true;
          oscillators.forEach((osc) => {
            try {
              osc.start();
            } catch {}
          });
        }
      }
    },

    setDetune: (detuneAmount: number) => {
      detune = Math.max(0, Math.min(100, detuneAmount));

      // Update detune for existing oscillators
      oscillators.forEach((osc, i) => {
        let detuneValue = 0;
        if (i > 0) {
          const spread = detune / 100;
          const position = (i - 1) / Math.max(1, oscillators.length - 1);
          detuneValue = (position - 0.5) * spread * 100;
        }
        osc.detune.value = detuneValue;
      });
    },

    setStereoWidth: (width: number) => {
      stereoWidth = Math.max(0, Math.min(100, width));

      // Update panning for existing oscillators
      panNodes.forEach((pan, i) => {
        let panValue = 0;
        if (oscillators.length > 1) {
          const panSpread = stereoWidth / 100;
          const position = i / Math.max(1, oscillators.length - 1);
          panValue = (position - 0.5) * 2 * panSpread;
          panValue = Math.max(-1, Math.min(1, panValue));
        }
        pan.pan.value = panValue;
      });
    },

    setMix: (mixValue: number) => {
      mix = mixValue;
      updateMix(mixValue);
    },
  };
}
