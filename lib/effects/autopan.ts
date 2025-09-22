"use client";

export interface AutoPanNodeHandle {
  inputGain: GainNode;
  outputGain: GainNode;
  lfo: OscillatorNode;
  lfoGain: GainNode;
  panNode: StereoPannerNode;
  originalPan?: number;
  isRunning?: boolean;
  setRate: (rateHz: number) => void;
  setDepth: (depth: number) => void; // 0..1
  start: () => void;
  stop: () => void;
  connect: (dest: AudioNode) => void;
  disconnect: () => void;
  dispose: () => void;
}

export async function createAutoPanNode(
  ctx: AudioContext,
  opts?: {
    rate?: number; // Hz - how fast the pan cycles (360 degrees per second)
    depth?: number; // 0..1 - pan range multiplier
  }
): Promise<AutoPanNodeHandle> {
  // Create audio processing nodes
  const inputGain = ctx.createGain();
  const outputGain = ctx.createGain();
  const panNode = ctx.createStereoPanner();

  // Create LFO (Low Frequency Oscillator) for automation
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();

  // Configure audio path
  inputGain.gain.value = 1;
  outputGain.gain.value = 1;
  panNode.pan.value = 0; // Start at center

  // Configure LFO for 360-degree panning cycle
  lfo.type = "sine"; // Smooth sine wave for natural panning motion
  lfo.frequency.value = opts?.rate ?? 1; // Default 1 Hz = 1 full cycle per second

  // Configure LFO depth (pan range)
  lfoGain.gain.value = (opts?.depth ?? 1) * 0.8; // Scale to reasonable range

  // Connect audio signal path: input -> pan -> output
  inputGain.connect(panNode);
  panNode.connect(outputGain);

  // Connect LFO to pan control: lfo -> lfoGain -> panNode.pan
  lfo.connect(lfoGain);
  lfoGain.connect(panNode.pan);

  const setRate = (rateHz: number) => {
    const r = Number.isFinite(rateHz) ? rateHz : opts?.rate ?? 1;
    const rate = Math.max(0.01, Math.min(10, r)); // Limit between 0.01-10 Hz
    lfo.frequency.setValueAtTime(rate, ctx.currentTime);
  };

  const setDepth = (depth: number) => {
    const dv = Number.isFinite(depth) ? depth : opts?.depth ?? 1;
    const d = Math.max(0, Math.min(1, dv)); // Clamp 0-1
    lfoGain.gain.setValueAtTime(d * 0.8, ctx.currentTime); // Scale to reasonable range
  };

  return {
    inputGain,
    outputGain,
    panNode,
    lfo,
    lfoGain,
    isRunning: false,
    setRate,
    setDepth,
    start: () => {
      try {
        lfo.start();
      } catch {}
    },
    stop: () => {
      try {
        lfo.stop();
      } catch {}
    },
    connect: (dest: AudioNode) => {
      outputGain.connect(dest);
    },
    disconnect: () => {
      // Disconnect control side only. Chain manages audio I/O connections.
      try {
        lfo.disconnect();
      } catch {}
      try {
        lfoGain.disconnect();
      } catch {}
      // Note: do not disconnect inputGain/panNode/outputGain here
    },
    dispose: () => {
      try {
        lfo.stop();
      } catch {}
      try {
        lfo.disconnect();
      } catch {}
      try {
        lfoGain.disconnect();
      } catch {}
      // Keep audio path intact; chain will handle I/O connections
    },
  };
}
