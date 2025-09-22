export interface CombFilterNodeHandle {
  inputGain: GainNode;
  outputGain: GainNode;
  wetGain: GainNode;
  dryGain: GainNode;
  delay: DelayNode;
  feedback: GainNode;
  lowpass: BiquadFilterNode;
  frequency: number;
  resonance: number;
  mix: number;
  started: boolean;

  start(): void;
  stop(): void;
  dispose(): void;
  setFrequency(frequency: number): void;
  setResonance(resonance: number): void;
  setMix(mix: number): void;
}

export function createCombFilterNode(
  context: AudioContext,
  frequency: number = 440,
  resonance: number = 50,
  mix: number = 50
): CombFilterNodeHandle {
  // Create nodes
  const inputGain = context.createGain();
  const outputGain = context.createGain();
  const wetGain = context.createGain();
  const dryGain = context.createGain();

  // Create delay line for comb filtering
  const delay = context.createDelay(0.1); // Max 100ms delay for audio frequencies
  const feedback = context.createGain();

  // Add a lowpass filter to tame high frequency feedback
  const lowpass = context.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = 8000; // Cut harsh high frequencies
  lowpass.Q.value = 1;

  // Set initial parameters
  inputGain.gain.value = 1;
  outputGain.gain.value = 1;

  // Calculate delay time from frequency
  // For comb filter: delayTime = 1 / frequency
  const delayTime = Math.max(0.001, Math.min(0.1, 1 / frequency)); // Clamp between 1ms and 100ms
  delay.delayTime.value = delayTime;

  // Set feedback amount (resonance)
  const feedbackAmount = (resonance / 100) * 0.95; // Scale to 0-0.95 to prevent runaway feedback
  feedback.gain.value = feedbackAmount;

  // Mix control
  const wetLevel = mix / 100;
  const dryLevel = 1 - wetLevel;
  wetGain.gain.value = wetLevel;
  dryGain.gain.value = dryLevel;

  // Connect dry signal
  inputGain.connect(dryGain);
  dryGain.connect(outputGain);

  // Connect wet signal through comb filter
  // Input -> delay -> feedback -> lowpass -> back to delay (creates comb filtering)
  inputGain.connect(delay);
  delay.connect(feedback);
  feedback.connect(lowpass);
  lowpass.connect(delay); // Feedback loop

  // Output the delayed signal
  delay.connect(wetGain);
  wetGain.connect(outputGain);

  let started = false;

  const handle: CombFilterNodeHandle = {
    inputGain,
    outputGain,
    wetGain,
    dryGain,
    delay,
    feedback,
    lowpass,
    frequency,
    resonance,
    mix,
    started,

    start() {
      // Comb filter doesn't need explicit start like oscillators
      started = true;
      handle.started = true;
    },

    stop() {
      // Comb filter doesn't need explicit stop
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
        delay.disconnect();
        feedback.disconnect();
        lowpass.disconnect();
      } catch (error) {
        // Ignore errors during disposal
      }
    },

    setFrequency(newFrequency: number) {
      handle.frequency = newFrequency;
      // Recalculate delay time from frequency
      const delayTime = Math.max(0.001, Math.min(0.1, 1 / newFrequency));
      delay.delayTime.setValueAtTime(delayTime, context.currentTime);
    },

    setResonance(newResonance: number) {
      handle.resonance = newResonance;
      // Convert resonance to feedback amount
      const feedbackAmount = (newResonance / 100) * 0.95;
      feedback.gain.setValueAtTime(feedbackAmount, context.currentTime);
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
