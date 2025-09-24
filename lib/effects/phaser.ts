// Helper function to create wave shaping curves for custom LFO shapes
function createWaveShapeCurve(
  shape: "sine" | "triangle" | "sawtooth"
): Float32Array {
  const length = 1024;
  const values: number[] = [];

  for (let i = 0; i < length; i++) {
    const x = (i / (length - 1)) * 2 - 1; // Range -1 to 1

    switch (shape) {
      case "triangle":
        // Triangle wave: -1 to 1 to -1
        values[i] = x < 0 ? 2 * x + 1 : 1 - 2 * x;
        break;
      case "sawtooth":
        // Sawtooth wave: linear ramp from -1 to 1
        values[i] = x;
        break;
      default: // sine
        // Sine wave approximation through wave shaping
        values[i] = Math.sin(x * Math.PI);
        break;
    }
  }

  return Float32Array.from(values);
}

export interface PhaserNodeHandle {
  inputGain: GainNode;
  outputGain: GainNode;
  wetGain: GainNode;
  dryGain: GainNode;
  allPassFilters: BiquadFilterNode[];
  notchFilters: BiquadFilterNode[];
  feedbackGain: GainNode;
  feedbackDelay: DelayNode;
  lfoOscillator: OscillatorNode;
  lfoGain: GainNode;
  shaperNode: WaveShaperNode | null;
  rate: number;
  depth: number;
  stages: number;
  mix: number;
  notchDepth: number;
  resonance: number;
  feedback: number;
  lfoShape: "sine" | "triangle" | "sawtooth";
  started: boolean;

  start(): void;
  stop(): void;
  dispose(): void;
  setRate(rate: number): void;
  setDepth(depth: number): void;
  setStages(stages: number): void;
  setMix(mix: number): void;
  setNotchDepth(depth: number): void;
  setResonance(resonance: number): void;
  setFeedback(feedback: number): void;
  setLfoShape(shape: "sine" | "triangle" | "sawtooth"): void;
}

export function createPhaserNode(
  context: AudioContext,
  rate: number = 0.5,
  depth: number = 100,
  stages: number = 4,
  mix: number = 50,
  notchDepth: number = 70,
  resonance: number = 8,
  feedback: number = 20,
  lfoShape: "sine" | "triangle" | "sawtooth" = "sine"
): PhaserNodeHandle {
  // Create main routing nodes
  const inputGain = context.createGain();
  const outputGain = context.createGain();
  const wetGain = context.createGain();
  const dryGain = context.createGain();

  // Create feedback system
  const feedbackGain = context.createGain();
  const feedbackDelay = context.createDelay(0.01); // Small delay to prevent instability
  feedbackDelay.delayTime.value = 0.001; // 1ms delay
  feedbackGain.gain.value = (feedback / 100) * 0.8; // Limit feedback to prevent runaway

  // Create LFO system
  const lfoOscillator = context.createOscillator();
  const lfoGain = context.createGain();

  // Set initial parameters
  inputGain.gain.value = 1;
  outputGain.gain.value = 1;

  // Mix control
  const wetLevel = mix / 100;
  const dryLevel = 1 - wetLevel;
  wetGain.gain.value = wetLevel;
  dryGain.gain.value = dryLevel;

  // LFO setup with shape selection
  lfoOscillator.frequency.value = rate;
  lfoOscillator.type = lfoShape;

  // Wave shaper for custom LFO shapes
  let shaperNode: WaveShaperNode | null = null;
  if (lfoShape === "triangle" || lfoShape === "sawtooth") {
    shaperNode = context.createWaveShaper();
    // Create wave shaping curve for enhanced LFO shapes
    const samples = 1024;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i - samples / 2) / (samples / 2);
      if (lfoShape === "triangle") {
        curve[i] = 1 - 2 * Math.abs(x); // Triangle wave enhancement
      } else if (lfoShape === "sawtooth") {
        curve[i] = x; // Sawtooth wave enhancement
      }
    }
    shaperNode.curve = curve;
    shaperNode.oversample = "4x";
  }

  // LFO depth control - modulates filter frequencies
  // Phaser typically sweeps from ~100Hz to ~10kHz
  lfoGain.gain.value = (depth / 100) * 5000; // Scale to frequency range

  // Connect LFO
  lfoOscillator.connect(lfoGain);

  // Create filter arrays
  const allPassFilters: BiquadFilterNode[] = [];
  const notchFilters: BiquadFilterNode[] = [];

  function createFilterChain(numStages: number) {
    // Clear existing filters
    allPassFilters.forEach((filter) => {
      try {
        filter.disconnect();
      } catch {}
    });
    notchFilters.forEach((filter) => {
      try {
        filter.disconnect();
      } catch {}
    });
    allPassFilters.length = 0;
    notchFilters.length = 0;

    // Create new filter chain
    for (let i = 0; i < numStages; i++) {
      // All-pass filter for phase shifting
      const allPassFilter = context.createBiquadFilter();
      allPassFilter.type = "allpass";

      // Set base frequency with slight variations for each stage
      const baseFreq = 800 + i * 300; // Spread filters across frequency range
      allPassFilter.frequency.value = baseFreq;
      allPassFilter.Q.value = resonance / 10; // Use resonance parameter

      // Notch filter for enhanced depth control
      const notchFilter = context.createBiquadFilter();
      notchFilter.type = "notch";
      notchFilter.frequency.value = baseFreq + 100; // Slightly offset from all-pass
      notchFilter.Q.value = notchDepth / 10; // Use notch depth parameter
      notchFilter.gain.value = -(notchDepth / 10); // Negative gain for notching

      // Connect LFO to filter frequency modulation
      if (shaperNode) {
        lfoOscillator.connect(shaperNode);
        shaperNode.connect(lfoGain);
      } else {
        lfoOscillator.connect(lfoGain);
      }

      lfoGain.connect(allPassFilter.frequency);
      lfoGain.connect(notchFilter.frequency);

      allPassFilters.push(allPassFilter);
      notchFilters.push(notchFilter);
    }

    // Chain the filters together with feedback
    let currentNode: AudioNode = inputGain;

    // Alternate between all-pass and notch filters for richer phasing
    for (let i = 0; i < numStages; i++) {
      currentNode.connect(allPassFilters[i]);
      allPassFilters[i].connect(notchFilters[i]);
      currentNode = notchFilters[i];

      // Add feedback from this stage back to input
      if (i === numStages - 1) {
        currentNode.connect(feedbackDelay);
        feedbackDelay.connect(feedbackGain);
        feedbackGain.connect(inputGain);
      }
    }

    // Connect final filter to wet output
    if (notchFilters.length > 0) {
      notchFilters[notchFilters.length - 1].connect(wetGain);
    } else {
      inputGain.connect(wetGain);
    }
  }

  // Create initial filter chain
  createFilterChain(stages);

  // Connect dry signal
  inputGain.connect(dryGain);

  // Mix wet and dry signals
  wetGain.connect(outputGain);
  dryGain.connect(outputGain);

  let started = false;

  const handle: PhaserNodeHandle = {
    inputGain,
    outputGain,
    wetGain,
    dryGain,
    allPassFilters,
    notchFilters,
    feedbackGain,
    feedbackDelay,
    shaperNode,
    lfoOscillator,
    lfoGain,
    rate,
    depth,
    stages,
    mix,
    notchDepth,
    resonance,
    feedback,
    lfoShape,
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
        allPassFilters.forEach((filter) => filter.disconnect());
        inputGain.disconnect();
        outputGain.disconnect();
        wetGain.disconnect();
        dryGain.disconnect();
      } catch (error) {
        // Ignore errors during disposal
      }
    },

    setRate(newRate: number) {
      handle.rate = newRate;
      lfoOscillator.frequency.setValueAtTime(newRate, context.currentTime);
    },

    setDepth(newDepth: number) {
      handle.depth = newDepth;
      // Update LFO gain to control phaser depth
      const scaledDepth = (newDepth / 100) * 5000;
      lfoGain.gain.setValueAtTime(scaledDepth, context.currentTime);
    },

    setStages(newStages: number) {
      handle.stages = newStages;
      // Recreate filter chain with new number of stages
      createFilterChain(newStages);
    },

    setMix(newMix: number) {
      handle.mix = newMix;
      const wetLevel = newMix / 100;
      const dryLevel = 1 - wetLevel;
      wetGain.gain.setValueAtTime(wetLevel, context.currentTime);
      dryGain.gain.setValueAtTime(dryLevel, context.currentTime);
    },

    setNotchDepth(newNotchDepth: number) {
      handle.notchDepth = newNotchDepth;
      // Update notch filter Q values and gains
      notchFilters.forEach((filter) => {
        filter.Q.setValueAtTime(newNotchDepth / 10, context.currentTime);
        filter.gain.setValueAtTime(-(newNotchDepth / 10), context.currentTime);
      });
    },

    setResonance(newResonance: number) {
      handle.resonance = newResonance;
      // Update all-pass filter Q values
      allPassFilters.forEach((filter) => {
        filter.Q.setValueAtTime(newResonance / 10, context.currentTime);
      });
    },

    setFeedback(newFeedback: number) {
      handle.feedback = newFeedback;
      // Update feedback gain with safety limiting
      const safeGain = Math.min((newFeedback / 100) * 0.8, 0.95); // Max 95% to prevent instability
      feedbackGain.gain.setValueAtTime(safeGain, context.currentTime);
    },

    setLfoShape(newShape: "sine" | "triangle" | "sawtooth") {
      handle.lfoShape = newShape;

      // Disconnect existing connections first
      if (shaperNode) {
        lfoOscillator.disconnect(shaperNode);
        shaperNode.disconnect(lfoGain);
      } else {
        lfoOscillator.disconnect(lfoGain);
      }

      if (newShape !== "sine") {
        // Create or update wave shaper for non-sine shapes
        if (!shaperNode) {
          shaperNode = context.createWaveShaper();
          handle.shaperNode = shaperNode;
        }
        
        const curve = createWaveShapeCurve(newShape);
        shaperNode.curve = curve;

        // Connect through shaper
        lfoOscillator.connect(shaperNode);
        shaperNode.connect(lfoGain);
      } else {
        // Direct connection for sine wave
        lfoOscillator.connect(lfoGain);
        if (shaperNode) {
          shaperNode = null;
          handle.shaperNode = null;
        }
      }
    },
        }
      }
    },
  };

  return handle;
}
