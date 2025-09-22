export interface PingPongDelayNodeHandle {
  inputGain: GainNode;
  outputGain: GainNode;
  wetGain: GainNode;
  dryGain: GainNode;
  leftDelay: DelayNode;
  rightDelay: DelayNode;
  leftFeedback: GainNode;
  rightFeedback: GainNode;
  leftPan: StereoPannerNode;
  rightPan: StereoPannerNode;
  crossFeedback: GainNode;
  time: number;
  feedback: number;
  mix: number;
  started: boolean;

  start(): void;
  stop(): void;
  dispose(): void;
  setTime(time: number): void;
  setFeedback(feedback: number): void;
  setMix(mix: number): void;
}

export function createPingPongDelayNode(
  context: AudioContext,
  time: number = 250,
  feedback: number = 30,
  mix: number = 30
): PingPongDelayNodeHandle {
  // Create nodes
  const inputGain = context.createGain();
  const outputGain = context.createGain();
  const wetGain = context.createGain();
  const dryGain = context.createGain();

  // Create delay lines for left and right channels
  const leftDelay = context.createDelay(2); // Max 2 seconds delay
  const rightDelay = context.createDelay(2);

  // Create feedback gain nodes
  const leftFeedback = context.createGain();
  const rightFeedback = context.createGain();
  const crossFeedback = context.createGain();

  // Create pan nodes for stereo positioning
  const leftPan = context.createStereoPanner();
  const rightPan = context.createStereoPanner();

  // Set initial parameters
  inputGain.gain.value = 1;
  outputGain.gain.value = 1;

  // Convert time from milliseconds to seconds
  const delayTimeSeconds = time / 1000;
  leftDelay.delayTime.value = delayTimeSeconds;
  rightDelay.delayTime.value = delayTimeSeconds;

  // Set feedback amount (converted from percentage)
  const feedbackAmount = feedback / 100;
  leftFeedback.gain.value = feedbackAmount;
  rightFeedback.gain.value = feedbackAmount;
  crossFeedback.gain.value = feedbackAmount * 0.7; // Slightly less cross-feedback

  // Pan the delays hard left and right for ping-pong effect
  leftPan.pan.value = -1; // Hard left
  rightPan.pan.value = 1; // Hard right

  // Mix control
  const wetLevel = mix / 100;
  const dryLevel = 1 - wetLevel;
  wetGain.gain.value = wetLevel;
  dryGain.gain.value = dryLevel;

  // Connect dry signal
  inputGain.connect(dryGain);
  dryGain.connect(outputGain);

  // Connect wet signal through delays
  // Input splits to both delay lines
  inputGain.connect(leftDelay);
  inputGain.connect(rightDelay);

  // Left delay chain: delay -> feedback -> pan -> wet output
  leftDelay.connect(leftFeedback);
  leftFeedback.connect(leftPan);
  leftPan.connect(wetGain);

  // Right delay chain: delay -> feedback -> pan -> wet output
  rightDelay.connect(rightFeedback);
  rightFeedback.connect(rightPan);
  rightPan.connect(wetGain);

  // Cross-feedback: left delay feeds into right delay and vice versa
  // This creates the classic ping-pong bouncing effect
  leftDelay.connect(crossFeedback);
  crossFeedback.connect(rightDelay);

  rightDelay.connect(crossFeedback);
  // Note: We don't connect right back to left to avoid feedback loop
  // Instead, the cross-feedback creates the alternating effect

  // Self-feedback for sustain
  leftFeedback.connect(leftDelay);
  rightFeedback.connect(rightDelay);

  // Connect wet to output
  wetGain.connect(outputGain);

  let started = false;

  const handle: PingPongDelayNodeHandle = {
    inputGain,
    outputGain,
    wetGain,
    dryGain,
    leftDelay,
    rightDelay,
    leftFeedback,
    rightFeedback,
    leftPan,
    rightPan,
    crossFeedback,
    time,
    feedback,
    mix,
    started,

    start() {
      // Ping pong delay doesn't need explicit start like oscillators
      started = true;
      handle.started = true;
    },

    stop() {
      // Ping pong delay doesn't need explicit stop
      started = false;
      handle.started = false;
    },

    dispose() {
      try {
        // Disconnect all nodes
        inputGain.disconnect();
        outputGain.disconnect();
        wetGain.disconnect();
        dryGain.disconnect();
        leftDelay.disconnect();
        rightDelay.disconnect();
        leftFeedback.disconnect();
        rightFeedback.disconnect();
        leftPan.disconnect();
        rightPan.disconnect();
        crossFeedback.disconnect();
      } catch (error) {
        // Ignore errors during disposal
      }
    },

    setTime(newTime: number) {
      handle.time = newTime;
      const delayTimeSeconds = newTime / 1000;
      // Use smooth value changes to avoid audio glitches
      leftDelay.delayTime.setValueAtTime(delayTimeSeconds, context.currentTime);
      rightDelay.delayTime.setValueAtTime(
        delayTimeSeconds,
        context.currentTime
      );
    },

    setFeedback(newFeedback: number) {
      handle.feedback = newFeedback;
      const feedbackAmount = newFeedback / 100;
      leftFeedback.gain.setValueAtTime(feedbackAmount, context.currentTime);
      rightFeedback.gain.setValueAtTime(feedbackAmount, context.currentTime);
      // Adjust cross-feedback proportionally
      const crossAmount = feedbackAmount * 0.7;
      crossFeedback.gain.setValueAtTime(crossAmount, context.currentTime);
    },

    setMix(newMix: number) {
      handle.mix = newMix;
      const wetLevel = newMix / 100;
      const dryLevel = 1 - wetLevel;
      wetGain.gain.setValueAtTime(wetLevel, context.currentTime);
      dryGain.gain.setValueAtTime(dryLevel, context.currentTime);
    },
  };

  return handle;
}
