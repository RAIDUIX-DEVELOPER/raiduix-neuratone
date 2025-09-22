export interface FlangerNodeHandle {
  inputGain: GainNode;
  outputGain: GainNode;
  wetGain: GainNode;
  dryGain: GainNode;
  delay: DelayNode;
  feedback: GainNode;
  lfoOscillator: OscillatorNode;
  lfoGain: GainNode;
  // Stereo processing nodes
  splitter: ChannelSplitterNode;
  merger: ChannelMergerNode;
  leftDelay: DelayNode;
  rightDelay: DelayNode;
  leftFeedback: GainNode;
  rightFeedback: GainNode;
  // Envelope follower nodes
  envelopeFollower: GainNode;
  envelopeAnalyzer: AnalyserNode;
  envelopeModGain: GainNode;
  // Parameters
  rate: number;
  depth: number;
  feedbackAmount: number;
  mix: number;
  stereoWidth: number;
  envelopeAmount: number;
  started: boolean;

  start(): void;
  stop(): void;
  dispose(): void;
  setRate(rate: number): void;
  setDepth(depth: number): void;
  setFeedback(feedback: number): void;
  setMix(mix: number): void;
  setStereoWidth(width: number): void;
  setEnvelopeAmount(amount: number): void;
}

export function createFlangerNode(
  context: AudioContext,
  rate: number = 0.5,
  depth: number = 2,
  feedbackAmount: number = 50,
  mix: number = 50,
  stereoWidth: number = 70,
  envelopeAmount: number = 30
): FlangerNodeHandle {
  // Create basic nodes
  const inputGain = context.createGain();
  const outputGain = context.createGain();
  const wetGain = context.createGain();
  const dryGain = context.createGain();
  const delay = context.createDelay(0.02); // Max delay of 20ms for flanger (mono fallback)
  const feedback = context.createGain();
  const lfoOscillator = context.createOscillator();
  const lfoGain = context.createGain();

  // Create stereo processing nodes
  const splitter = context.createChannelSplitter(2);
  const merger = context.createChannelMerger(2);
  const leftDelay = context.createDelay(0.02);
  const rightDelay = context.createDelay(0.02);
  const leftFeedback = context.createGain();
  const rightFeedback = context.createGain();

  // Create envelope follower nodes
  const envelopeFollower = context.createGain();
  const envelopeAnalyzer = context.createAnalyser();
  const envelopeModGain = context.createGain();

  // Set initial parameters
  inputGain.gain.value = 1;
  outputGain.gain.value = 1;

  // Mix control: 50% = equal wet/dry by default
  const wetLevel = mix / 100;
  const dryLevel = 1 - wetLevel;
  wetGain.gain.value = wetLevel;
  dryGain.gain.value = dryLevel;

  // Delay parameters - flanger uses very short delays (1-10ms)
  const baseDelay = 0.003; // 3ms base delay
  delay.delayTime.value = baseDelay;

  // Feedback amount (0-95% to avoid runaway feedback)
  feedback.gain.value = feedbackAmount / 100;

  // LFO setup
  lfoOscillator.frequency.value = rate;
  lfoOscillator.type = "sine";

  // LFO depth control - modulates delay time
  lfoGain.gain.value = depth / 1000; // Convert ms to seconds

  // Envelope follower setup
  envelopeAnalyzer.fftSize = 512;
  envelopeAnalyzer.smoothingTimeConstant = 0.9;
  envelopeModGain.gain.value = envelopeAmount / 100;

  // Stereo delay setup with width control
  const leftDelayTime = 0.003; // Base delay for left channel
  const rightDelayTime = 0.003 + (stereoWidth / 100) * 0.002; // Offset for stereo width
  leftDelay.delayTime.value = leftDelayTime;
  rightDelay.delayTime.value = rightDelayTime;

  // Feedback setup for stereo channels
  leftFeedback.gain.value = feedbackAmount / 100;
  rightFeedback.gain.value = feedbackAmount / 100;

  // Connect LFO to delay time modulation (both channels with slight offset for stereo)
  lfoOscillator.connect(lfoGain);

  // Connect LFO to left delay (direct)
  lfoGain.connect(leftDelay.delayTime);

  // Create inverted LFO connection for right delay (stereo effect)
  const rightLfoGain = context.createGain();
  rightLfoGain.gain.value = -1 * (stereoWidth / 100); // Invert and scale by stereo width
  lfoGain.connect(rightLfoGain);
  rightLfoGain.connect(rightDelay.delayTime);

  // Connect envelope follower
  inputGain.connect(envelopeAnalyzer);
  inputGain.connect(envelopeFollower);

  // Connect stereo audio path
  inputGain.connect(dryGain); // Dry signal (mono)
  inputGain.connect(splitter); // Split to stereo channels

  // Left channel processing
  splitter.connect(leftDelay, 0); // Left input to left delay
  leftDelay.connect(leftFeedback);
  leftFeedback.connect(leftDelay); // Left feedback loop
  leftDelay.connect(merger, 0, 0); // Left delay to left output

  // Right channel processing
  splitter.connect(rightDelay, 1); // Right input to right delay
  rightDelay.connect(rightFeedback);
  rightFeedback.connect(rightDelay); // Right feedback loop
  rightDelay.connect(merger, 0, 1); // Right delay to right output

  // Connect processed stereo signal to wet gain
  merger.connect(wetGain);

  // Mix wet and dry signals
  wetGain.connect(outputGain);
  dryGain.connect(outputGain);

  let started = false;

  // Create envelope follower processing using AnalyserNode
  const envelopeProcessor = () => {
    const bufferLength = envelopeAnalyzer.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const updateEnvelope = () => {
      envelopeAnalyzer.getByteFrequencyData(dataArray);

      // Calculate RMS (Root Mean Square) for envelope following
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sum / bufferLength) / 255; // Normalize to 0-1

      // Apply envelope modulation to LFO depth
      const modulationAmount = rms * (envelopeAmount / 100);
      const totalDepth = depth / 1000 + modulationAmount * 0.001; // Add envelope modulation

      // Update LFO gain with envelope modulation
      lfoGain.gain.setValueAtTime(totalDepth, context.currentTime);

      if (started) {
        requestAnimationFrame(updateEnvelope);
      }
    };

    return updateEnvelope;
  };

  let envelopeUpdate: () => void;

  const handle: FlangerNodeHandle = {
    inputGain,
    outputGain,
    wetGain,
    dryGain,
    delay,
    feedback,
    lfoOscillator,
    lfoGain,
    splitter,
    merger,
    leftDelay,
    rightDelay,
    leftFeedback,
    rightFeedback,
    envelopeFollower,
    envelopeAnalyzer,
    envelopeModGain,
    rate,
    depth,
    feedbackAmount,
    mix,
    stereoWidth,
    envelopeAmount,
    started,

    start() {
      if (!started) {
        lfoOscillator.start();
        envelopeUpdate = envelopeProcessor();
        envelopeUpdate(); // Start envelope following
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
        // Disconnect basic nodes
        lfoOscillator.disconnect();
        lfoGain.disconnect();
        delay.disconnect();
        feedback.disconnect();
        inputGain.disconnect();
        outputGain.disconnect();
        wetGain.disconnect();
        dryGain.disconnect();

        // Disconnect stereo processing nodes
        splitter.disconnect();
        merger.disconnect();
        leftDelay.disconnect();
        rightDelay.disconnect();
        leftFeedback.disconnect();
        rightFeedback.disconnect();

        // Disconnect envelope follower nodes
        envelopeFollower.disconnect();
        envelopeAnalyzer.disconnect();
        envelopeModGain.disconnect();

        started = false;
        handle.started = false;
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
      // Update LFO gain to control flanger depth (delay time modulation)
      lfoGain.gain.setValueAtTime(newDepth / 1000, context.currentTime);
    },

    setFeedback(newFeedback: number) {
      handle.feedbackAmount = newFeedback;
      // Limit feedback to prevent runaway oscillation
      const safeLevel = Math.min(0.95, newFeedback / 100);
      feedback.gain.setValueAtTime(safeLevel, context.currentTime);
    },

    setMix(newMix: number) {
      handle.mix = newMix;
      const wetLevel = newMix / 100;
      const dryLevel = 1 - wetLevel;
      wetGain.gain.setValueAtTime(wetLevel, context.currentTime);
      dryGain.gain.setValueAtTime(dryLevel, context.currentTime);
    },

    setStereoWidth(newWidth: number) {
      handle.stereoWidth = newWidth;
      // Update right delay time based on stereo width
      const rightDelayTime = 0.003 + (newWidth / 100) * 0.002;
      rightDelay.delayTime.setValueAtTime(rightDelayTime, context.currentTime);

      // Update right LFO inversion amount based on stereo width
      const rightLfoGain = context.createGain();
      rightLfoGain.gain.value = -1 * (newWidth / 100);

      // Reconnect with new width settings
      lfoGain.disconnect(rightDelay.delayTime);
      lfoGain.connect(rightLfoGain);
      rightLfoGain.connect(rightDelay.delayTime);
    },

    setEnvelopeAmount(newAmount: number) {
      handle.envelopeAmount = newAmount;
      // Envelope amount is handled in the envelope processor function
      // The new value will be used in the next envelope update cycle
    },
  };

  return handle;
}
