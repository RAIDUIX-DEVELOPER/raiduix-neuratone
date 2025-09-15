"use client";
export type NoiseType = "white" | "pink" | "brown";

export interface NoiseNodeHandle {
  node: AudioWorkletNode;
  panner: StereoPannerNode;
  filter: BiquadFilterNode;
  setType: (t: NoiseType) => void;
  setGain: (linear: number) => void; // 0..1
  fadeTo: (linear: number, seconds: number) => void; // ramp gain
  setPan: (pan: number) => void; // -1..1
  setLpf: (hz: number) => void; // low-pass cutoff
  startAutoPan: (rateHz: number, depth: number) => void;
  stopAutoPan: () => void;
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
  opts?: {
    type?: NoiseType;
    gain?: number;
    pan?: number;
    lpfHz?: number;
    autopanHz?: number;
    autopanDepth?: number; // 0..1
  }
): Promise<NoiseNodeHandle> {
  await ensureWorklet(ctx);

  const noise = new AudioWorkletNode(ctx, "noise-processor", {
    numberOfInputs: 0,
    numberOfOutputs: 1,
    outputChannelCount: [1],
    parameterData: { gain: opts?.gain ?? 0.25 },
  });
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = opts?.lpfHz ?? 20000;
  const panner = ctx.createStereoPanner();
  panner.pan.value = opts?.pan ?? 0;

  // chain: noise -> filter -> panner
  noise.connect(filter).connect(panner);

  const setType = (t: NoiseType) =>
    noise.port.postMessage({ type: "setType", value: t });
  if (opts?.type) setType(opts.type);

  const setGain = (linear: number) => {
    const v = Math.max(0, Math.min(1, linear));
    noise.parameters.get("gain")!.setValueAtTime(v, ctx.currentTime);
  };

  const setPan = (pan: number) =>
    panner.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), ctx.currentTime);

  const setLpf = (hz: number) =>
    filter.frequency.setValueAtTime(
      Math.max(20, Math.min(20000, hz)),
      ctx.currentTime
    );

  // Autopan LFO: lfo -> gain -> panner.pan
  let lfo: OscillatorNode | null = null;
  let lfoGain: GainNode | null = null;
  const startAutoPan = (rateHz: number, depth: number) => {
    const rate = Math.max(0.001, Math.min(5, rateHz || 0));
    const dep = Math.max(0, Math.min(1, depth || 0));
    if (lfo) {
      // update existing
      try {
        lfo.frequency.setValueAtTime(rate, ctx.currentTime);
        if (lfoGain) lfoGain.gain.setValueAtTime(dep, ctx.currentTime);
      } catch {}
      return;
    }
    lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = rate;
    lfoGain = ctx.createGain();
    lfoGain.gain.value = dep; // depth maps to pan range [-dep..+dep]
    lfo.connect(lfoGain).connect(panner.pan);
    try {
      lfo.start();
    } catch {}
  };
  const stopAutoPan = () => {
    if (lfo) {
      try {
        lfo.stop();
      } catch {}
      try {
        lfo.disconnect();
      } catch {}
      lfo = null;
    }
    if (lfoGain) {
      try {
        lfoGain.disconnect();
      } catch {}
      lfoGain = null;
    }
  };

  if ((opts?.autopanHz || 0) > 0 && (opts?.autopanDepth || 0) > 0) {
    startAutoPan(opts!.autopanHz!, opts!.autopanDepth!);
  }

  return {
    node: noise,
    filter,
    panner,
    setType,
    setGain,
    fadeTo: (linear: number, seconds: number) => {
      const v = Math.max(0, Math.min(1, linear));
      const t = Math.max(0.01, seconds || 0.01);
      const param = noise.parameters.get("gain")!;
      param.cancelScheduledValues(ctx.currentTime);
      param.setValueAtTime(param.value as number, ctx.currentTime);
      param.linearRampToValueAtTime(v, ctx.currentTime + t);
    },
    setPan,
    setLpf,
    startAutoPan,
    stopAutoPan,
    connect: (dest: AudioNode) => panner.connect(dest),
    disconnect: () => panner.disconnect(),
    dispose: () => {
      try {
        noise.disconnect();
      } catch {}
      try {
        stopAutoPan();
        panner.disconnect();
      } catch {}
      try {
        filter.disconnect();
      } catch {}
    },
  };
}
