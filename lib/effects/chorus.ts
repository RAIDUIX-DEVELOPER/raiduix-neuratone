export interface ChorusNodeHandle {
  inputGain: GainNode;
  outputGain: GainNode;
  wetGain: GainNode;
  dryGain: GainNode;
  leftDelays: DelayNode[];
  rightDelays: DelayNode[];
  leftLfoOscillators: OscillatorNode[];
  rightLfoOscillators: OscillatorNode[];
  lfoGains: GainNode[];
  feedbackGains: GainNode[];
  dampingFilters: BiquadFilterNode[];
  stereoSplitter: ChannelSplitterNode;
  stereoMerger: ChannelMergerNode;
  rate: number;
  depth: number;
  mix: number;
  feedback: number;
  stereoWidth: number;
  damping: number;
  started: boolean;

  start(): void;
  stop(): void;
  dispose(): void;
  setRate(rate: number): void;
  setDepth(depth: number): void;
  setMix(mix: number): void;
  setFeedback(feedback: number): void;
  setStereoWidth(width: number): void;
  setDamping(damping: number): void;
}

export function createChorusNode(
  context: AudioContext,
  rate: number = 0.5,
  depth: number = 10,
  mix: number = 50,
  feedback: number = 20,
  stereoWidth: number = 100,
  damping: number = 8000
): ChorusNodeHandle {
  const numVoices = 3; // 3 voices per channel for stereo chorus

  // Create main routing nodes
  const inputGain = context.createGain();
  const outputGain = context.createGain();
  const wetGain = context.createGain();
  const dryGain = context.createGain();

  // Create stereo processing nodes
  const stereoSplitter = context.createChannelSplitter(2);
  const stereoMerger = context.createChannelMerger(2);
  const leftWetGain = context.createGain();
  const rightWetGain = context.createGain();

  // Create separate delay lines for left and right channels
  const leftDelays: DelayNode[] = [];
  const rightDelays: DelayNode[] = [];
  const leftLfoOscillators: OscillatorNode[] = [];
  const rightLfoOscillators: OscillatorNode[] = [];
  const lfoGains: GainNode[] = [];
  const feedbackGains: GainNode[] = [];
  const dampingFilters: BiquadFilterNode[] = [];

  // Set initial parameters
  inputGain.gain.value = 1;
  outputGain.gain.value = 1;

  // Mix control: 0 = dry, 100 = wet
  const wetLevel = mix / 100;
  const dryLevel = 1 - wetLevel;
  wetGain.gain.value = wetLevel;
  dryGain.gain.value = dryLevel;

  // Setup stereo routing
  inputGain.connect(stereoSplitter);
  inputGain.connect(dryGain); // Direct dry signal

  // Create chorus voices for both channels
  for (let i = 0; i < numVoices; i++) {
    // LEFT CHANNEL
    const leftDelay = context.createDelay(0.1);
    const leftBaseDelay = 0.008 + i * 0.004; // 8ms, 12ms, 16ms
    leftDelay.delayTime.value = leftBaseDelay;
    leftDelays.push(leftDelay);

    // Left channel LFO with slight phase offset
    const leftLfo = context.createOscillator();
    leftLfo.frequency.value = rate * (0.85 + i * 0.1);
    leftLfo.type = "sine";
    leftLfoOscillators.push(leftLfo);

    // RIGHT CHANNEL (mirrored with different delays and phase)
    const rightDelay = context.createDelay(0.1);
    const rightBaseDelay = 0.006 + i * 0.003; // 6ms, 9ms, 12ms (different from left)
    rightDelay.delayTime.value = rightBaseDelay;
    rightDelays.push(rightDelay);

    // Right channel LFO with 90 degree phase shift
    const rightLfo = context.createOscillator();
    rightLfo.frequency.value = rate * (0.75 + i * 0.15); // Different rate variations
    rightLfo.type = "sine";
    rightLfoOscillators.push(rightLfo);

    // Shared LFO gain for both channels
    const lfoGain = context.createGain();
    lfoGain.gain.value = depth / 1000;
    lfoGains.push(lfoGain);

    // Feedback gain for warmth
    const feedbackGain = context.createGain();
    feedbackGain.gain.value = (feedback / 100) * 0.7; // Limit feedback to prevent instability
    feedbackGains.push(feedbackGain);

    // High-frequency damping filter
    const dampingFilter = context.createBiquadFilter();
    dampingFilter.type = "lowpass";
    dampingFilter.frequency.value = damping;
    dampingFilter.Q.value = 0.7;
    dampingFilters.push(dampingFilter);

    // Connect LFOs to delay time modulation
    leftLfo.connect(lfoGain);
    rightLfo.connect(lfoGain);
    lfoGain.connect(leftDelay.delayTime);
    lfoGain.connect(rightDelay.delayTime);

    // Connect stereo routing for left channel
    stereoSplitter.connect(leftDelay, 0); // Left input to left delay
    leftDelay.connect(dampingFilter);
    dampingFilter.connect(feedbackGain);
    feedbackGain.connect(leftDelay); // Feedback loop
    dampingFilter.connect(leftWetGain);

    // Connect stereo routing for right channel
    stereoSplitter.connect(rightDelay, 1); // Right input to right delay
    rightDelay.connect(rightWetGain);
  }

  // Apply stereo width control
  const widthFactor = stereoWidth / 100;
  leftWetGain.gain.value = widthFactor;
  rightWetGain.gain.value = widthFactor;

  // Merge stereo channels
  leftWetGain.connect(stereoMerger, 0, 0);
  rightWetGain.connect(stereoMerger, 0, 1);
  stereoMerger.connect(wetGain);

  // Mix wet and dry signals
  wetGain.connect(outputGain);
  dryGain.connect(outputGain);

  let started = false;

  const handle: ChorusNodeHandle = {
    inputGain,
    outputGain,
    wetGain,
    dryGain,
    leftDelays,
    rightDelays,
    leftLfoOscillators,
    rightLfoOscillators,
    lfoGains,
    feedbackGains,
    dampingFilters,
    stereoSplitter,
    stereoMerger,
    rate,
    depth,
    mix,
    feedback,
    stereoWidth,
    damping,
    started: false,

    start() {
      if (!started) {
        [...leftLfoOscillators, ...rightLfoOscillators].forEach((lfo) => {
          lfo.start();
        });
        started = true;
        handle.started = true;
      }
    },

    stop() {
      if (started) {
        [...leftLfoOscillators, ...rightLfoOscillators].forEach((lfo) => {
          lfo.stop();
        });
        started = false;
        handle.started = false;
      }
    },

    dispose() {
      try {
        if (started) {
          [...leftLfoOscillators, ...rightLfoOscillators].forEach((lfo) =>
            lfo.stop()
          );
        }
        [...leftLfoOscillators, ...rightLfoOscillators].forEach((lfo) =>
          lfo.disconnect()
        );
        lfoGains.forEach((gain) => gain.disconnect());
        feedbackGains.forEach((gain) => gain.disconnect());
        dampingFilters.forEach((filter) => filter.disconnect());
        [...leftDelays, ...rightDelays].forEach((delay) => delay.disconnect());
        inputGain.disconnect();
        outputGain.disconnect();
        wetGain.disconnect();
        dryGain.disconnect();
        stereoSplitter.disconnect();
        stereoMerger.disconnect();
      } catch (error) {
        // Ignore errors during disposal
      }
    },

    setRate(newRate: number) {
      // Validate and clamp the rate value
      const validRate =
        typeof newRate === "number" && isFinite(newRate) ? newRate : 1;
      const clampedRate = Math.max(0.1, Math.min(20, validRate));

      handle.rate = clampedRate;
      leftLfoOscillators.forEach((lfo, i) => {
        const variedRate = clampedRate * (0.85 + i * 0.1);
        lfo.frequency.setValueAtTime(variedRate, context.currentTime);
      });
      rightLfoOscillators.forEach((lfo, i) => {
        const variedRate = clampedRate * (0.75 + i * 0.15);
        lfo.frequency.setValueAtTime(variedRate, context.currentTime);
      });
    },

    setDepth(newDepth: number) {
      // Validate and clamp the depth value
      const validDepth =
        typeof newDepth === "number" && isFinite(newDepth) ? newDepth : 50;
      const clampedDepth = Math.max(0, Math.min(100, validDepth));

      handle.depth = clampedDepth;
      lfoGains.forEach((lfoGain) => {
        lfoGain.gain.setValueAtTime(clampedDepth / 1000, context.currentTime);
      });
    },

    setMix(newMix: number) {
      // Validate and clamp the mix value
      const validMix =
        typeof newMix === "number" && isFinite(newMix) ? newMix : 50;
      const clampedMix = Math.max(0, Math.min(100, validMix));

      handle.mix = clampedMix;
      const wetLevel = clampedMix / 100;
      const dryLevel = 1 - wetLevel;
      wetGain.gain.setValueAtTime(wetLevel, context.currentTime);
      dryGain.gain.setValueAtTime(dryLevel, context.currentTime);
    },

    setFeedback(newFeedback: number) {
      // Validate and clamp the feedback value
      const validFeedback =
        typeof newFeedback === "number" && isFinite(newFeedback)
          ? newFeedback
          : 0;
      const clampedFeedback = Math.max(0, Math.min(100, validFeedback));

      handle.feedback = clampedFeedback;
      const feedbackLevel = (clampedFeedback / 100) * 0.7; // Limit to prevent instability
      feedbackGains.forEach((gain) => {
        gain.gain.setValueAtTime(feedbackLevel, context.currentTime);
      });
    },

    setStereoWidth(newWidth: number) {
      // Validate and clamp the stereo width value
      const validWidth =
        typeof newWidth === "number" && isFinite(newWidth) ? newWidth : 100;
      const clampedWidth = Math.max(0, Math.min(100, validWidth));

      handle.stereoWidth = clampedWidth;
      const widthFactor = clampedWidth / 100;
      // Update the stereo width by adjusting the wet gains
      wetGain.gain.setValueAtTime(
        widthFactor * (handle.mix / 100),
        context.currentTime
      );
    },

    setDamping(newDamping: number) {
      // Validate and clamp the damping value
      const validDamping =
        typeof newDamping === "number" && isFinite(newDamping) ? newDamping : 0;
      const clampedDamping = Math.max(0, Math.min(100, validDamping));

      handle.damping = clampedDamping;
      const dampingFreq = Math.max(1000, Math.min(20000, clampedDamping));
      dampingFilters.forEach((filter) => {
        filter.frequency.setValueAtTime(dampingFreq, context.currentTime);
      });
    },
  };

  return handle;
}
