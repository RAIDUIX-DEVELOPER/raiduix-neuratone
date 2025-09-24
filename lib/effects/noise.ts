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
    p = ctx.audioWorklet.addModule("/worklets/noise-processor.js").catch((error) => {
      console.error("Failed to load noise processor worklet:", error);
      // Remove the failed promise from cache so we can retry
      workletLoadedByCtx.delete(ctx);
      throw error;
    });
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

  const setType = (t: NoiseType) => {
    // Validate the noise type
    const validTypes: NoiseType[] = ["white", "pink", "brown"];
    const validType = validTypes.includes(t) ? t : "white";
    try {
      noise.port.postMessage({ type: "setType", value: validType });
    } catch (error) {
      console.error("Error setting noise type:", error);
    }
  };
  if (opts?.type) setType(opts.type);

  const setGain = (linear: number) => {
    const validGain = typeof linear === "number" && isFinite(linear) ? linear : 0.25;
    const v = Math.max(0, Math.min(1, validGain));
    try {
      noise.parameters.get("gain")!.setValueAtTime(v, ctx.currentTime);
    } catch (error) {
      console.error("Error setting noise gain:", error);
    }
  };

  const setPan = (pan: number) => {
    const validPan = typeof pan === "number" && isFinite(pan) ? pan : 0;
    const clampedPan = Math.max(-1, Math.min(1, validPan));
    try {
      panner.pan.setValueAtTime(clampedPan, ctx.currentTime);
    } catch (error) {
      console.error("Error setting pan:", error);
    }
  };

  const setLpf = (hz: number) => {
    const validHz = typeof hz === "number" && isFinite(hz) ? hz : 20000;
    const clampedHz = Math.max(20, Math.min(20000, validHz));
    try {
      filter.frequency.setValueAtTime(clampedHz, ctx.currentTime);
    } catch (error) {
      console.error("Error setting filter frequency:", error);
    }
  };

  // Autopan LFO: lfo -> gain -> panner.pan
  let lfo: OscillatorNode | null = null;
  let lfoGain: GainNode | null = null;
  const startAutoPan = (rateHz: number, depth: number) => {
    const validRate = typeof rateHz === "number" && isFinite(rateHz) ? rateHz : 0;
    const validDepth = typeof depth === "number" && isFinite(depth) ? depth : 0;
    const rate = Math.max(0.001, Math.min(5, validRate));
    const dep = Math.max(0, Math.min(1, validDepth));
    
    if (lfo) {
      // update existing
      try {
        lfo.frequency.setValueAtTime(rate, ctx.currentTime);
        if (lfoGain) lfoGain.gain.setValueAtTime(dep, ctx.currentTime);
      } catch (error) {
        console.error("Error updating autopan:", error);
      }
      return;
    }
    
    try {
      lfo = ctx.createOscillator();
      lfo.type = "sine";
      lfo.frequency.value = rate;
      lfoGain = ctx.createGain();
      lfoGain.gain.value = dep; // depth maps to pan range [-dep..+dep]
      lfo.connect(lfoGain).connect(panner.pan);
      lfo.start();
    } catch (error) {
      console.error("Error starting autopan:", error);
      // Clean up if error occurred
      if (lfo) {
        try { lfo.disconnect(); } catch {}
        lfo = null;
      }
      if (lfoGain) {
        try { lfoGain.disconnect(); } catch {}
        lfoGain = null;
      }
    }
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
      const validLinear = typeof linear === "number" && isFinite(linear) ? linear : 0.25;
      const validSeconds = typeof seconds === "number" && isFinite(seconds) ? seconds : 0.01;
      const v = Math.max(0, Math.min(1, validLinear));
      const t = Math.max(0.01, validSeconds);
      
      try {
        const param = noise.parameters.get("gain")!;
        param.cancelScheduledValues(ctx.currentTime);
        param.setValueAtTime(param.value as number, ctx.currentTime);
        param.linearRampToValueAtTime(v, ctx.currentTime + t);
      } catch (error) {
        console.error("Error fading noise:", error);
      }
    },
    setPan,
    setLpf,
    startAutoPan,
    stopAutoPan,
    connect: (dest: AudioNode) => panner.connect(dest),
    disconnect: () => panner.disconnect(),
    dispose: () => {
      try {
        stopAutoPan();
      } catch (error) {
        console.error("Error stopping autopan:", error);
      }
      try {
        noise.disconnect();
      } catch (error) {
        console.error("Error disconnecting noise node:", error);
      }
      try {
        filter.disconnect();
      } catch (error) {
        console.error("Error disconnecting filter:", error);
      }
      try {
        panner.disconnect();
      } catch (error) {
        console.error("Error disconnecting panner:", error);
      }
    },
  };
}
