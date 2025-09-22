export interface TremoloNodeHandle {
  inputGain: GainNode;
  outputGain: GainNode;
  lfoOscillator: OscillatorNode;
  lfoGain: GainNode;
  tremoloGain: GainNode;
  rate: number;
  depth: number;
  started: boolean;

  start(): void;
  stop(): void;
  dispose(): void;
  setRate(rate: number): void;
  setDepth(depth: number): void;
}

export function createTremoloNode(
  context: AudioContext,
  rate: number = 4,
  depth: number = 50
): TremoloNodeHandle {
  // Create nodes
  const inputGain = context.createGain();
  const outputGain = context.createGain();
  const lfoOscillator = context.createOscillator();
  const lfoGain = context.createGain();
  const tremoloGain = context.createGain();

  // Set initial parameters
  lfoOscillator.frequency.value = rate;
  lfoOscillator.type = "sine";

  // LFO depth control (0 to depth/100)
  lfoGain.gain.value = depth / 100;

  // Tremolo gain starts at 1 (no attenuation)
  tremoloGain.gain.value = 1;

  // Input/output gains
  inputGain.gain.value = 1;
  outputGain.gain.value = 1;

  // Connect LFO to tremolo gain modulation
  // LFO oscillates between -1 and +1, we want 0 to depth
  // So we use the LFO to modulate around the base gain level
  lfoOscillator.connect(lfoGain);
  lfoGain.connect(tremoloGain.gain);

  // Connect audio path
  inputGain.connect(tremoloGain);
  tremoloGain.connect(outputGain);

  let started = false;

  const handle: TremoloNodeHandle = {
    inputGain,
    outputGain,
    lfoOscillator,
    lfoGain,
    tremoloGain,
    rate,
    depth,
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
        tremoloGain.disconnect();
        inputGain.disconnect();
        outputGain.disconnect();
      } catch (error) {
        // Ignore errors during disposal
      }
    },

    setRate(newRate: number) {
      // Validate and clamp the rate value
      const validRate =
        typeof newRate === "number" && isFinite(newRate) ? newRate : 4;
      const clampedRate = Math.max(0.1, Math.min(20, validRate));

      handle.rate = clampedRate;
      lfoOscillator.frequency.setValueAtTime(clampedRate, context.currentTime);
    },

    setDepth(newDepth: number) {
      // Validate and clamp the depth value
      const validDepth =
        typeof newDepth === "number" && isFinite(newDepth) ? newDepth : 50;
      const clampedDepth = Math.max(0, Math.min(100, validDepth));

      handle.depth = clampedDepth;
      // Update LFO gain to control tremolo depth
      lfoGain.gain.setValueAtTime(clampedDepth / 100, context.currentTime);
    },
  };

  return handle;
}
