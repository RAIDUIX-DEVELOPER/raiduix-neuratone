"use client";
export type NoiseType = "white" | "pink" | "brown";

export interface NoiseNodeHandle {
  node: AudioWorkletNode;
  panner: StereoPannerNode;
  setType: (t: NoiseType) => void;
  setGain: (linear: number) => void; // 0..1
  setPan: (pan: number) => void; // -1..1
  connect: (dest: AudioNode) => void;
  disconnect: () => void;
  dispose: () => void;
}

// AudioWorklet modules must be loaded per-AudioContext. Cache by context.
const workletLoadedByCtx = new WeakMap<AudioContext, Promise<void>>();

async function ensureWorklet(ctx: AudioContext) {
  let p = workletLoadedByCtx.get(ctx);
  if (!p) {
    p = ctx.audioWorklet.addModule("/worklets/noise-processor.js");
    workletLoadedByCtx.set(ctx, p);
  }
  await p;
}

export async function createNoiseNode(
  ctx: AudioContext,
  opts?: { type?: NoiseType; gain?: number; pan?: number }
): Promise<NoiseNodeHandle> {
  await ensureWorklet(ctx);

  const noise = new AudioWorkletNode(ctx, "noise-processor", {
    numberOfInputs: 0,
    numberOfOutputs: 1,
    outputChannelCount: [1],
    parameterData: { gain: opts?.gain ?? 0.25 },
  });
  const panner = ctx.createStereoPanner();
  panner.pan.value = opts?.pan ?? 0;

  noise.connect(panner);

  const setType = (t: NoiseType) =>
    noise.port.postMessage({ type: "setType", value: t });
  if (opts?.type) setType(opts.type);

  const setGain = (linear: number) => {
    const v = Math.max(0, Math.min(1, linear));
    noise.parameters.get("gain")!.setValueAtTime(v, ctx.currentTime);
  };

  const setPan = (pan: number) =>
    panner.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), ctx.currentTime);

  return {
    node: noise,
    panner,
    setType,
    setGain,
    setPan,
    connect: (dest: AudioNode) => panner.connect(dest),
    disconnect: () => panner.disconnect(),
    dispose: () => {
      try {
        noise.disconnect();
      } catch {}
      try {
        panner.disconnect();
      } catch {}
    },
  };
}
