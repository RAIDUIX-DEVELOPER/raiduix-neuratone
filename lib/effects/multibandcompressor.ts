import type {
  AudioContext,
  IAudioContext,
  IGainNode,
  IBiquadFilterNode,
  IDynamicsCompressorNode,
  IAudioNode,
} from "standardized-audio-context";

export interface MultiBandCompressorNodeHandle {
  inputGain: IGainNode<IAudioContext>;
  outputGain: IGainNode<IAudioContext>;
  lowBandCompressor: IDynamicsCompressorNode<IAudioContext> | null;
  midBandCompressor: IDynamicsCompressorNode<IAudioContext> | null;
  highBandCompressor: IDynamicsCompressorNode<IAudioContext> | null;
  lowBandGain: IGainNode<IAudioContext>;
  midBandGain: IGainNode<IAudioContext>;
  highBandGain: IGainNode<IAudioContext>;
  lowPassFilter: IBiquadFilterNode<IAudioContext>;
  highPassFilter: IBiquadFilterNode<IAudioContext>;
  bandPassFilter: IBiquadFilterNode<IAudioContext>;
  crossoverLow: number;
  crossoverHigh: number;

  connect(destination: IAudioNode<IAudioContext>): void;
  disconnect(): void;
  dispose(): void;

  // Band controls
  setLowBandRatio(ratio: number): void;
  setMidBandRatio(ratio: number): void;
  setHighBandRatio(ratio: number): void;
  setLowBandThreshold(threshold: number): void;
  setMidBandThreshold(threshold: number): void;
  setHighBandThreshold(threshold: number): void;
  setLowBandAttack(attack: number): void;
  setMidBandAttack(attack: number): void;
  setHighBandAttack(attack: number): void;
  setLowBandRelease(release: number): void;
  setMidBandRelease(release: number): void;
  setHighBandRelease(release: number): void;
  setLowBandGain(gain: number): void;
  setMidBandGain(gain: number): void;
  setHighBandGain(gain: number): void;

  // Crossover controls
  setCrossoverLow(frequency: number): void;
  setCrossoverHigh(frequency: number): void;

  // Global controls
  setMix(mix: number): void;
}

export function createMultiBandCompressorNode(
  context: AudioContext,
  crossoverLow: number = 200,
  crossoverHigh: number = 2000,
  lowThreshold: number = -12,
  midThreshold: number = -10,
  highThreshold: number = -8,
  lowRatio: number = 4,
  midRatio: number = 3,
  highRatio: number = 2,
  mix: number = 100
): MultiBandCompressorNodeHandle {
  // Input and output nodes
  const inputGain = context.createGain();
  const outputGain = context.createGain();
  const wetGain = context.createGain();
  const dryGain = context.createGain();

  // Crossover filters for frequency separation
  const lowPassFilter = context.createBiquadFilter();
  const bandPassFilter = context.createBiquadFilter();
  const highPassFilter = context.createBiquadFilter();

  // Additional filters for band isolation
  const lowBandHighPass = context.createBiquadFilter();
  const highBandLowPass = context.createBiquadFilter();

  // Configure crossover filters
  lowPassFilter.type = "lowpass";
  lowPassFilter.frequency.value = crossoverLow;
  lowPassFilter.Q.value = 0.7;

  bandPassFilter.type = "bandpass";
  bandPassFilter.frequency.value = Math.sqrt(crossoverLow * crossoverHigh);
  bandPassFilter.Q.value = 0.7;

  highPassFilter.type = "highpass";
  highPassFilter.frequency.value = crossoverHigh;
  highPassFilter.Q.value = 0.7;

  // Additional isolation filters
  lowBandHighPass.type = "highpass";
  lowBandHighPass.frequency.value = 20; // Remove DC and sub-bass
  lowBandHighPass.Q.value = 0.5;

  highBandLowPass.type = "lowpass";
  highBandLowPass.frequency.value = 20000; // Anti-aliasing
  highBandLowPass.Q.value = 0.5;

  // Create compressors for each band
  const lowBandCompressor = (context as any).createDynamicsCompressor();
  const midBandCompressor = (context as any).createDynamicsCompressor();
  const highBandCompressor = (context as any).createDynamicsCompressor();

  // Configure low band compressor (typically for bass/sub-bass)
  if (lowBandCompressor) {
    lowBandCompressor.threshold.value = lowThreshold;
    lowBandCompressor.knee.value = 2;
    lowBandCompressor.ratio.value = lowRatio;
    lowBandCompressor.attack.value = 0.005; // Fast attack for transients
    lowBandCompressor.release.value = 0.1; // Quick release
  }

  // Configure mid band compressor (typically for mids/vocals)
  if (midBandCompressor) {
    midBandCompressor.threshold.value = midThreshold;
    midBandCompressor.knee.value = 3;
    midBandCompressor.ratio.value = midRatio;
    midBandCompressor.attack.value = 0.003; // Very fast for vocal clarity
    midBandCompressor.release.value = 0.05; // Moderate release
  }

  // Configure high band compressor (typically for treble/presence)
  if (highBandCompressor) {
    highBandCompressor.threshold.value = highThreshold;
    highBandCompressor.knee.value = 4;
    highBandCompressor.ratio.value = highRatio;
    highBandCompressor.attack.value = 0.001; // Ultra-fast for sibilance control
    highBandCompressor.release.value = 0.03; // Fast release for transparency
  }

  // Individual band gain controls (for makeup gain)
  const lowBandGain = context.createGain();
  const midBandGain = context.createGain();
  const highBandGain = context.createGain();

  lowBandGain.gain.value = 1.0;
  midBandGain.gain.value = 1.0;
  highBandGain.gain.value = 1.0;

  // Band mixing node
  const bandMixer = context.createGain();
  bandMixer.gain.value = 1.0;

  // Setup audio routing
  inputGain.connect(dryGain);
  inputGain.connect(lowPassFilter);
  inputGain.connect(bandPassFilter);
  inputGain.connect(highPassFilter);

  // Low band processing chain
  if (lowBandCompressor) {
    lowPassFilter.connect(lowBandHighPass);
    lowBandHighPass.connect(lowBandCompressor);
    lowBandCompressor.connect(lowBandGain);
    lowBandGain.connect(bandMixer);
  } else {
    lowPassFilter.connect(lowBandGain);
    lowBandGain.connect(bandMixer);
  }

  // Mid band processing chain
  if (midBandCompressor) {
    bandPassFilter.connect(midBandCompressor);
    midBandCompressor.connect(midBandGain);
    midBandGain.connect(bandMixer);
  } else {
    bandPassFilter.connect(midBandGain);
    midBandGain.connect(bandMixer);
  }

  // High band processing chain
  if (highBandCompressor) {
    highPassFilter.connect(highBandLowPass);
    highBandLowPass.connect(highBandCompressor);
    highBandCompressor.connect(highBandGain);
    highBandGain.connect(bandMixer);
  } else {
    highPassFilter.connect(highBandGain);
    highBandGain.connect(bandMixer);
  }

  // Final mixing
  bandMixer.connect(wetGain);
  wetGain.connect(outputGain);
  dryGain.connect(outputGain);

  // Set initial mix levels
  function updateMix(mixValue: number) {
    const mixRatio = Math.max(0, Math.min(100, mixValue)) / 100;
    wetGain.gain.value = mixRatio;
    dryGain.gain.value = 1 - mixRatio;
  }
  updateMix(mix);

  // Control functions
  function setLowBandRatio(ratio: number) {
    if (lowBandCompressor) {
      lowBandCompressor.ratio.value = Math.max(1, Math.min(20, ratio));
    }
  }

  function setMidBandRatio(ratio: number) {
    if (midBandCompressor) {
      midBandCompressor.ratio.value = Math.max(1, Math.min(20, ratio));
    }
  }

  function setHighBandRatio(ratio: number) {
    if (highBandCompressor) {
      highBandCompressor.ratio.value = Math.max(1, Math.min(20, ratio));
    }
  }

  function setLowBandThreshold(threshold: number) {
    if (lowBandCompressor) {
      lowBandCompressor.threshold.value = Math.max(-50, Math.min(0, threshold));
    }
  }

  function setMidBandThreshold(threshold: number) {
    if (midBandCompressor) {
      midBandCompressor.threshold.value = Math.max(-50, Math.min(0, threshold));
    }
  }

  function setHighBandThreshold(threshold: number) {
    if (highBandCompressor) {
      highBandCompressor.threshold.value = Math.max(
        -50,
        Math.min(0, threshold)
      );
    }
  }

  function setLowBandAttack(attack: number) {
    if (lowBandCompressor) {
      lowBandCompressor.attack.value = Math.max(0, Math.min(1, attack / 1000)); // Convert ms to seconds
    }
  }

  function setMidBandAttack(attack: number) {
    if (midBandCompressor) {
      midBandCompressor.attack.value = Math.max(0, Math.min(1, attack / 1000));
    }
  }

  function setHighBandAttack(attack: number) {
    if (highBandCompressor) {
      highBandCompressor.attack.value = Math.max(0, Math.min(1, attack / 1000));
    }
  }

  function setLowBandRelease(release: number) {
    if (lowBandCompressor) {
      lowBandCompressor.release.value = Math.max(
        0,
        Math.min(1, release / 1000)
      ); // Convert ms to seconds
    }
  }

  function setMidBandRelease(release: number) {
    if (midBandCompressor) {
      midBandCompressor.release.value = Math.max(
        0,
        Math.min(1, release / 1000)
      );
    }
  }

  function setHighBandRelease(release: number) {
    if (highBandCompressor) {
      highBandCompressor.release.value = Math.max(
        0,
        Math.min(1, release / 1000)
      );
    }
  }

  function setLowBandGain(gain: number) {
    lowBandGain.gain.value = Math.max(
      0.1,
      Math.min(10, Math.pow(10, gain / 20))
    ); // Convert dB to linear
  }

  function setMidBandGain(gain: number) {
    midBandGain.gain.value = Math.max(
      0.1,
      Math.min(10, Math.pow(10, gain / 20))
    );
  }

  function setHighBandGain(gain: number) {
    highBandGain.gain.value = Math.max(
      0.1,
      Math.min(10, Math.pow(10, gain / 20))
    );
  }

  function setCrossoverLow(frequency: number) {
    const freq = Math.max(50, Math.min(1000, frequency));
    lowPassFilter.frequency.value = freq;
    lowBandHighPass.frequency.value = Math.max(20, freq - 50);
    // Update bandpass filter center frequency
    bandPassFilter.frequency.value = Math.sqrt(
      freq * highPassFilter.frequency.value
    );
  }

  function setCrossoverHigh(frequency: number) {
    const freq = Math.max(1000, Math.min(10000, frequency));
    highPassFilter.frequency.value = freq;
    highBandLowPass.frequency.value = Math.min(20000, freq + 1000);
    // Update bandpass filter center frequency
    bandPassFilter.frequency.value = Math.sqrt(
      lowPassFilter.frequency.value * freq
    );
  }

  return {
    inputGain,
    outputGain,
    lowBandCompressor,
    midBandCompressor,
    highBandCompressor,
    lowBandGain,
    midBandGain,
    highBandGain,
    lowPassFilter,
    highPassFilter,
    bandPassFilter,
    crossoverLow,
    crossoverHigh,

    connect: (destination: IAudioNode<IAudioContext>) => {
      outputGain.connect(destination as any);
    },

    disconnect: () => {
      try {
        outputGain.disconnect();
      } catch {}
    },

    dispose: () => {
      try {
        inputGain.disconnect();
        outputGain.disconnect();
        lowPassFilter.disconnect();
        bandPassFilter.disconnect();
        highPassFilter.disconnect();
        lowBandHighPass.disconnect();
        highBandLowPass.disconnect();

        if (lowBandCompressor) lowBandCompressor.disconnect();
        if (midBandCompressor) midBandCompressor.disconnect();
        if (highBandCompressor) highBandCompressor.disconnect();

        lowBandGain.disconnect();
        midBandGain.disconnect();
        highBandGain.disconnect();
        bandMixer.disconnect();
        wetGain.disconnect();
        dryGain.disconnect();
      } catch {}
    },

    // Band control methods
    setLowBandRatio,
    setMidBandRatio,
    setHighBandRatio,
    setLowBandThreshold,
    setMidBandThreshold,
    setHighBandThreshold,
    setLowBandAttack,
    setMidBandAttack,
    setHighBandAttack,
    setLowBandRelease,
    setMidBandRelease,
    setHighBandRelease,
    setLowBandGain,
    setMidBandGain,
    setHighBandGain,

    // Crossover control methods
    setCrossoverLow,
    setCrossoverHigh,

    // Global control methods
    setMix: updateMix,
  };
}
