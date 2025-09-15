"use client";
import { Howl } from "howler";
import {
  createNoiseNode,
  type NoiseNodeHandle,
  type NoiseType,
} from "./effects";
import { getMasterBus } from "./audioBus";

export type LayerType = "binaural" | "isochronic" | "ambient";

export type LayerEffectKind = "noise" | "automation";

export interface NoiseEffect {
  id: string;
  kind: "noise";
  type: NoiseType; // white | pink | brown
  gain: number; // 0..1
  pan: number; // -1..1
  lpfHz?: number; // 20..20000
  autopanHz?: number; // 0..5
  autopanDepth?: number; // 0..1
}

export interface ParamAutomationEffect {
  id: string;
  kind: "automation";
  target: "beatOffset" | "pulseFreq" | "volume" | "pan";
  from: number;
  to: number;
  durationSec: number; // seconds
}

export type LayerEffect = NoiseEffect | ParamAutomationEffect; // extendable
export interface SoundLayer {
  id: string;
  type: LayerType;
  baseFreq?: number;
  beatOffset?: number;
  pulseFreq?: number;
  ambientKey?: string;
  volume: number;
  pan: number;
  wave?: OscillatorType; // sine | square | sawtooth | triangle
  isPlaying: boolean;
  effects?: LayerEffect[];
}
export interface EngineHandle {
  start: () => Promise<void>;
  stop: () => void;
  update: (layer: Partial<SoundLayer>) => void;
  dispose: () => void;
  getAnalyser?: () => AnalyserNode | null;
  getWaveformData?: (target: Uint8Array) => void;
  getFrequencyData?: (target: Uint8Array) => void;
}

const ambientSources: Record<string, string> = {
  rain: "https://cdn.jsdelivr.net/gh/anars/blank-audio/0.5-second-of-silence.mp3",
  white:
    "https://cdn.jsdelivr.net/gh/anars/blank-audio/1-second-of-silence.mp3",
};

let sharedCtx: AudioContext | null = null;
function getCtx() {
  if (typeof window === "undefined") return null;
  if (!sharedCtx)
    sharedCtx = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
  return sharedCtx;
}

let ToneModule: any | null = null;
async function loadTone() {
  if (ToneModule) return ToneModule;
  try {
    const mod: any = await import("tone");
    ToneModule = mod && Object.keys(mod).length ? mod : mod?.default || null;
  } catch {
    ToneModule = null;
  }
  return ToneModule;
}

export function createBinaural(layer: SoundLayer): EngineHandle {
  let tone: any,
    left: any,
    right: any,
    leftGainTone: any,
    rightGainTone: any,
    merger: any,
    volNode: any,
    analyserToneFft: any,
    analyserToneWave: any,
    playing = false;
  let ctx = getCtx();
  let lOsc: OscillatorNode | null = null;
  let rOsc: OscillatorNode | null = null;
  let gain: GainNode | null = null;
  let mergerNode: ChannelMergerNode | null = null;
  let leftGain: GainNode | null = null;
  let rightGain: GainNode | null = null;
  let stereoPan: StereoPannerNode | null = null;
  let analyserNode: AnalyserNode | null = null;
  const effectHandles = new Map<string, NoiseNodeHandle>();
  const automationTimers = new Map<string, number>();
  function computePair(base: number, beat: number) {
    const safeBase = Math.max(1, base || 0);
    const l = Math.max(1, safeBase - beat / 2);
    const r = Math.max(1, safeBase + beat / 2);
    return [l, r] as const;
  }
  // Pan via a post-merge StereoPannerNode to avoid altering oscillator timbre
  function smoothSetFreq(param: AudioParam | null, value: number) {
    if (!param || !ctx) return;
    const v = Math.max(1, value);
    try {
      param.cancelScheduledValues(ctx.currentTime);
      param.setTargetAtTime(v, ctx.currentTime, 0.03);
    } catch {
      try {
        (param as any).value = v;
      } catch {}
    }
  }
  async function reconcileEffects(effects?: LayerEffect[]) {
    const list = effects || [];
    const byId = new Map<string, LayerEffect>();
    list.forEach((fx) => byId.set(fx.id, fx));
    for (const [id, h] of effectHandles.entries()) {
      if (!byId.has(id)) {
        try {
          h.disconnect();
        } catch {}
        try {
          h.dispose();
        } catch {}
        effectHandles.delete(id);
      }
    }
    // Clear any automations that were removed
    for (const [id, timer] of automationTimers.entries()) {
      if (!byId.has(id)) {
        try {
          clearInterval(timer);
        } catch {}
        automationTimers.delete(id);
      }
    }
    const ctxLocal = ctx || getCtx();
    if (!ctxLocal) return;
    ctx = ctxLocal;
    for (const fx of list) {
      if (fx.kind === "noise") {
        const existing = effectHandles.get(fx.id);
        if (!existing) {
          const handle = await createNoiseNode(ctxLocal, {
            type: fx.type,
            gain: fx.gain,
            pan: fx.pan,
            lpfHz: fx.lpfHz,
            autopanHz: fx.autopanHz,
            autopanDepth: fx.autopanDepth,
          });
          if (playing) handle.connect(getMasterBus(ctxLocal).input);
          effectHandles.set(fx.id, handle);
        } else {
          existing.setType(fx.type);
          existing.setGain(fx.gain);
          existing.setPan(fx.pan);
          if (fx.lpfHz) existing.setLpf(fx.lpfHz);
          if ((fx.autopanHz || 0) > 0 && (fx.autopanDepth || 0) > 0)
            existing.startAutoPan(fx.autopanHz!, fx.autopanDepth!);
          else existing.stopAutoPan();
          if (playing) {
            try {
              existing.connect(getMasterBus(ctxLocal).input);
            } catch {}
          } else {
            try {
              existing.disconnect();
            } catch {}
          }
        }
      } else if (fx.kind === "automation") {
        const exId = fx.id;
        if (automationTimers.has(exId)) {
          // already running; skip re-adding
          continue;
        }
        const start = performance.now();
        const dur = Math.max(0.05, fx.durationSec || 0);
        const from = fx.from;
        const to = fx.to;
        const updateParam = (val: number) => {
          if (fx.target === "beatOffset") {
            layer.beatOffset = val;
            const base = Math.max(1, layer.baseFreq || 200);
            const [lf, rf] = computePair(base, val);
            if (left && right) {
              left.frequency.value = lf;
              right.frequency.value = rf;
            }
            if (lOsc && rOsc) {
              lOsc.frequency.value = lf;
              rOsc.frequency.value = rf;
            }
          } else if (fx.target === "volume") {
            layer.volume = val;
            if (volNode) volNode.volume.value = tone.gainToDb(val);
            if (gain) gain.gain.value = val;
          } else if (fx.target === "pan") {
            layer.pan = val;
            const applyPan = (p: number) => {
              const lp = p > 0 ? 1 - p : 1;
              const rp = p < 0 ? 1 + p : 1;
              if (leftGainTone && rightGainTone) {
                leftGainTone.gain.value = lp;
                rightGainTone.gain.value = rp;
              }
              if (leftGain && rightGain) {
                leftGain.gain.value = lp;
                rightGain.gain.value = rp;
              }
            };
            applyPan(val);
          } else if (fx.target === "pulseFreq") {
            // Not applicable to binaural engine; ignore
          }
        };
        updateParam(from);
        const timer = window.setInterval(() => {
          const t = (performance.now() - start) / (dur * 1000);
          const k = Math.min(1, Math.max(0, t));
          const v = from + (to - from) * k;
          updateParam(v);
          if (k >= 1) {
            const id = automationTimers.get(exId);
            if (id) clearInterval(id);
            automationTimers.delete(exId);
          }
        }, 16);
        automationTimers.set(exId, timer);
      }
    }
  }
  async function ensure() {
    if (!tone) {
      tone = await loadTone();
      if (tone?.Oscillator && tone?.Merge) {
        // Align Tone with our shared AudioContext so we can route to the master bus
        try {
          const shared = getCtx();
          tone.setContext?.(shared);
          if (shared) ctx = shared;
        } catch {}
        const base = layer.baseFreq || 200;
        const beat = layer.beatOffset || 0;
        const [lf, rf] = computePair(base, beat);
        left = new tone.Oscillator(lf, layer.wave || "sine");
        right = new tone.Oscillator(rf, layer.wave || "sine");
        leftGainTone = new tone.Gain(1);
        rightGainTone = new tone.Gain(1);
        merger = new tone.Merge();
        volNode = new tone.Volume(tone.gainToDb(layer.volume));
        left.connect(leftGainTone).connect(merger, 0, 0);
        right.connect(rightGainTone).connect(merger, 0, 1);
        analyserToneFft = new tone.Analyser("fft", 1024);
        analyserToneWave = new tone.Analyser("waveform", 1024);
        // Route to our master bus instead of Tone.Destination; pan after Volume using native StereoPanner
        try {
          const bus = getMasterBus(ctx || getCtx()!);
          // Create a native StereoPanner for consistent behavior
          stereoPan = (ctx || getCtx()!)!.createStereoPanner();
          stereoPan.pan.value = layer.pan || 0;
          merger.connect(volNode);
          (volNode as any).connect?.(stereoPan);
          stereoPan.connect(analyserToneFft as any);
          stereoPan.connect(bus.input);
          volNode.connect?.(analyserToneWave);
        } catch {}
        return;
      }
    }
    if (tone?.Oscillator && tone?.Merge && !left) {
      try {
        const shared = getCtx();
        tone.setContext?.(shared);
        if (shared) ctx = shared;
      } catch {}
      const base = Math.max(1, layer.baseFreq || 200);
      const beat = layer.beatOffset || 0;
      const [lf, rf] = computePair(base, beat);
      left = new tone.Oscillator(lf, layer.wave || "sine");
      right = new tone.Oscillator(rf, layer.wave || "sine");
      leftGainTone = new tone.Gain(1);
      rightGainTone = new tone.Gain(1);
      merger = new tone.Merge();
      volNode = new tone.Volume(tone.gainToDb(layer.volume));
      left.connect(leftGainTone).connect(merger, 0, 0);
      right.connect(rightGainTone).connect(merger, 0, 1);
      analyserToneFft = new tone.Analyser("fft", 1024);
      analyserToneWave = new tone.Analyser("waveform", 1024);
      try {
        const bus = getMasterBus(ctx || getCtx()!);
        stereoPan = (ctx || getCtx()!)!.createStereoPanner();
        stereoPan.pan.value = layer.pan || 0;
        merger.connect(volNode);
        (volNode as any).connect?.(stereoPan);
        stereoPan.connect(analyserToneFft as any);
        stereoPan.connect(bus.input);
        volNode.connect?.(analyserToneWave);
      } catch {}
      return;
    }
    if (!lOsc && ctx) {
      lOsc = ctx.createOscillator();
      rOsc = ctx.createOscillator();
      lOsc.type = layer.wave || "sine";
      rOsc.type = layer.wave || "sine";
      const base = Math.max(1, layer.baseFreq || 200);
      const beat = layer.beatOffset || 0;
      const [lf, rf] = computePair(base, beat);
      lOsc.frequency.value = lf;
      rOsc.frequency.value = rf;
      leftGain = ctx.createGain();
      rightGain = ctx.createGain();
      leftGain.gain.value = 1;
      rightGain.gain.value = 1;
      gain = ctx.createGain();
      gain.gain.value = layer.volume;
      mergerNode = ctx.createChannelMerger(2);
      lOsc.connect(leftGain).connect(mergerNode, 0, 0);
      rOsc.connect(rightGain).connect(mergerNode, 0, 1);
      stereoPan = ctx.createStereoPanner();
      stereoPan.pan.value = layer.pan || 0;
      analyserNode = ctx.createAnalyser();
      analyserNode.fftSize = 2048;
      const bus = getMasterBus(ctx);
      mergerNode
        .connect(gain)
        .connect(stereoPan)
        .connect(analyserNode)
        .connect(bus.input);
    }
  }
  return {
    start: async () => {
      await ensure();
      if (playing) return;
      if (left && right) {
        // Ensure the shared Web Audio context (used for effects) is running
        try {
          const rctx = getCtx();
          if (rctx) {
            await rctx.resume();
            ctx = rctx;
          }
        } catch {}
        await tone.start?.();
        left.start();
        right.start();
        // Gentle fade in to avoid clicks
        try {
          if (ctx && gain) {
            const target = layer.volume;
            gain.gain.setValueAtTime(0, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(target, ctx.currentTime + 0.02);
          }
        } catch {}
        playing = true;
        await reconcileEffects(layer.effects);
      } else if (lOsc && rOsc && ctx) {
        ctx.resume();
        try {
          lOsc.start();
          rOsc.start();
        } catch (e) {
          if (e instanceof DOMException) {
            lOsc.disconnect();
            rOsc.disconnect();
            lOsc = null;
            rOsc = null;
            gain?.disconnect();
            mergerNode?.disconnect();
            gain = null;
            mergerNode = null;
            await ensure();
            if (lOsc && rOsc) {
              (lOsc as OscillatorNode).start();
              (rOsc as OscillatorNode).start();
            }
          } else {
            throw e;
          }
        }
        playing = true;
        // Gentle fade in
        try {
          if (ctx && gain) {
            const target = layer.volume;
            gain.gain.setValueAtTime(0, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(target, ctx.currentTime + 0.02);
          }
        } catch {}
        await reconcileEffects(layer.effects);
      }
    },
    stop: () => {
      if (!playing) return;
      if (left && right) {
        // fade out then stop
        try {
          if (ctx && gain) {
            gain.gain.cancelScheduledValues(ctx.currentTime);
            gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.03);
          }
        } catch {}
        setTimeout(() => {
          try {
            left.stop();
            right.stop();
          } catch {}
        }, 35);
      } else if (lOsc && rOsc) {
        try {
          if (ctx && gain) {
            gain.gain.cancelScheduledValues(ctx.currentTime);
            gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.03);
          }
        } catch {}
        setTimeout(() => {
          try {
            lOsc!.stop();
            rOsc!.stop();
          } catch {}
        }, 35);
        lOsc = null;
        rOsc = null;
      }
      for (const h of effectHandles.values()) {
        try {
          h.disconnect();
        } catch {}
      }
      for (const id of automationTimers.values()) {
        try {
          clearInterval(id);
        } catch {}
      }
      automationTimers.clear();
      playing = false;
    },
    update: (l) => {
      if (l.baseFreq !== undefined) layer.baseFreq = l.baseFreq;
      if (l.beatOffset !== undefined) layer.beatOffset = l.beatOffset;
      if (l.volume !== undefined) layer.volume = l.volume;
      if (l.pan !== undefined) layer.pan = l.pan;
      const waveChanged = l.wave !== undefined && l.wave !== layer.wave;
      if (l.wave !== undefined) layer.wave = l.wave;
      const applyPanVal = (p: number) => {
        if (stereoPan) stereoPan.pan.value = Math.max(-1, Math.min(1, p || 0));
      };
      if (left && right) {
        if (l.baseFreq !== undefined || l.beatOffset !== undefined) {
          const base = Math.max(1, layer.baseFreq || 200);
          const beat = layer.beatOffset || 0;
          const [lf, rf] = computePair(base, beat);
          try {
            left.frequency.value = lf;
            right.frequency.value = rf;
          } catch {}
        }
        if (l.volume !== undefined && volNode) {
          volNode.volume.value = tone.gainToDb(layer.volume);
        }
        if (l.pan !== undefined && stereoPan)
          stereoPan.pan.value = layer.pan || 0;
        if (waveChanged) {
          try {
            left.stop();
            right.stop();
          } catch {}
          try {
            left.dispose?.();
            right.dispose?.();
          } catch {}
          const base = Math.max(1, layer.baseFreq || 200);
          const beat = layer.beatOffset || 0;
          const [lf, rf] = computePair(base, beat);
          left = new tone.Oscillator(lf, layer.wave || "sine");
          right = new tone.Oscillator(rf, layer.wave || "sine");
          left.connect(leftGainTone).connect(merger, 0, 0);
          right.connect(rightGainTone).connect(merger, 0, 1);
          if (playing) {
            try {
              left.start();
              right.start();
            } catch {}
          }
        }
      } else if (lOsc && rOsc) {
        if (l.baseFreq !== undefined || l.beatOffset !== undefined) {
          const base = Math.max(1, layer.baseFreq || 200);
          const beat = layer.beatOffset || 0;
          const [lf, rf] = computePair(base, beat);
          smoothSetFreq(lOsc.frequency, lf);
          smoothSetFreq(rOsc.frequency, rf);
        }
        if (l.volume !== undefined && gain) gain.gain.value = layer.volume;
        if (l.pan !== undefined && stereoPan)
          stereoPan.pan.value = layer.pan || 0;
        if (waveChanged && ctx) {
          try {
            lOsc.stop();
            rOsc.stop();
          } catch {}
          lOsc.disconnect();
          rOsc.disconnect();
          lOsc = ctx.createOscillator();
          rOsc = ctx.createOscillator();
          lOsc.type = layer.wave || "sine";
          rOsc.type = layer.wave || "sine";
          const base = layer.baseFreq || 200;
          const beat = layer.beatOffset || 0;
          const [lf, rf] = computePair(base, beat);
          smoothSetFreq(lOsc.frequency, lf);
          smoothSetFreq(rOsc.frequency, rf);
          if (!leftGain) {
            leftGain = ctx.createGain();
            leftGain.gain.value = 1;
          }
          if (!rightGain) {
            rightGain = ctx.createGain();
            rightGain.gain.value = 1;
          }
          if (!mergerNode) mergerNode = ctx.createChannelMerger(2);
          lOsc.connect(leftGain).connect(mergerNode, 0, 0);
          rOsc.connect(rightGain).connect(mergerNode, 0, 1);
          if (!gain) {
            gain = ctx.createGain();
            gain.gain.value = layer.volume;
          }
          if (!stereoPan) {
            stereoPan = ctx.createStereoPanner();
            stereoPan.pan.value = layer.pan || 0;
          }
          if (!analyserNode) {
            analyserNode = ctx.createAnalyser();
            analyserNode.fftSize = 2048;
          }
          const bus = getMasterBus(ctx);
          mergerNode
            .connect(gain)
            .connect(stereoPan)
            .connect(analyserNode)
            .connect(bus.input);
          if (playing) {
            try {
              lOsc.start();
              rOsc.start();
            } catch {}
          }
        }
      }
      if ((l as any).effects !== undefined) {
        (layer as any).effects = (l as any).effects as LayerEffect[];
        reconcileEffects((l as any).effects as LayerEffect[]);
      }
    },
    dispose: () => {
      try {
        left?.dispose?.();
        right?.dispose?.();
        volNode?.dispose?.();
        merger?.dispose?.();
        analyserToneFft?.dispose?.();
        analyserToneWave?.dispose?.();
      } catch {}
      if (lOsc) {
        lOsc.disconnect();
        rOsc?.disconnect();
      }
      gain?.disconnect();
      mergerNode?.disconnect();
      analyserNode?.disconnect();
      leftGain?.disconnect();
      rightGain?.disconnect();
      for (const h of effectHandles.values()) {
        try {
          h.disconnect();
        } catch {}
        try {
          h.dispose();
        } catch {}
      }
      effectHandles.clear();
      for (const id of automationTimers.values()) {
        try {
          clearInterval(id);
        } catch {}
      }
      automationTimers.clear();
    },
    getAnalyser: () => analyserNode || null,
    getWaveformData: (arr) => {
      if (analyserNode) {
        (analyserNode as any).getByteTimeDomainData(arr as any);
        return;
      }
      if (analyserToneWave) {
        const vals = analyserToneWave.getValue();
        const len = Math.min(arr.length, vals.length);
        for (let i = 0; i < len; i++) {
          const v = (vals[i] + 1) * 0.5;
          arr[i] = Math.max(0, Math.min(255, Math.floor(v * 255)));
        }
      }
    },
    getFrequencyData: (arr) => {
      if (analyserNode) {
        (analyserNode as any).getByteFrequencyData(arr as any);
        return;
      }
      if (analyserToneFft) {
        const vals = analyserToneFft.getValue();
        const min = -100,
          max = 0;
        const len = Math.min(arr.length, vals.length);
        for (let i = 0; i < len; i++) {
          const norm = (vals[i] - min) / (max - min);
          arr[i] = Math.max(0, Math.min(255, Math.floor(norm * 255)));
        }
      }
    },
  };
}

export function createIsochronic(layer: SoundLayer): EngineHandle {
  let tone: any,
    osc: any,
    env: any,
    volNode: any,
    panNode: any,
    analyserToneFft: any,
    analyserToneWave: any,
    interval: number | null = null,
    playing = false;
  let ctx = getCtx();
  let carrier: OscillatorNode | null = null;
  let gate: GainNode | null = null;
  let gain: GainNode | null = null;
  let stereo: StereoPannerNode | null = null;
  let analyserNode: AnalyserNode | null = null;
  const effectHandles = new Map<string, NoiseNodeHandle>();
  async function reconcileEffects(effects?: LayerEffect[]) {
    const list = effects || [];
    const byId = new Map<string, LayerEffect>();
    list.forEach((fx) => byId.set(fx.id, fx));
    for (const [id, h] of effectHandles.entries()) {
      if (!byId.has(id)) {
        try {
          h.disconnect();
        } catch {}
        try {
          h.dispose();
        } catch {}
        effectHandles.delete(id);
      }
    }
    const ctxLocal = ctx || getCtx();
    if (!ctxLocal) return;
    ctx = ctxLocal;
    for (const fx of list) {
      if (fx.kind === "noise") {
        const existing = effectHandles.get(fx.id);
        if (!existing) {
          const handle = await createNoiseNode(ctxLocal, {
            type: fx.type,
            gain: fx.gain,
            pan: fx.pan,
          });
          if (playing) handle.connect(getMasterBus(ctxLocal).input);
          effectHandles.set(fx.id, handle);
        } else {
          existing.setType(fx.type);
          existing.setGain(fx.gain);
          existing.setPan(fx.pan);
          if (playing) {
            try {
              existing.connect(getMasterBus(ctxLocal).input);
            } catch {}
          } else {
            try {
              existing.disconnect();
            } catch {}
          }
        }
      }
    }
  }
  async function ensure() {
    if (!tone) {
      tone = await loadTone();
      if (tone?.Oscillator && tone?.AmplitudeEnvelope) {
        osc = new tone.Oscillator(
          Math.max(1, layer.baseFreq || 200),
          layer.wave || "sine"
        );
        env = new tone.AmplitudeEnvelope({
          attack: 0.01,
          decay: 0.01,
          sustain: 1,
          release: 0.05,
        });
        volNode = new tone.Volume(tone.gainToDb(layer.volume));
        panNode = new tone.Panner(layer.pan || 0);
        analyserToneFft = new tone.Analyser("fft", 1024);
        analyserToneWave = new tone.Analyser("waveform", 1024);
        osc.chain(
          env,
          panNode,
          volNode,
          analyserToneFft,
          tone.Destination || tone.getDestination?.()
        );
        volNode.connect?.(analyserToneWave);
        return;
      }
    }
    if (!carrier && ctx) {
      carrier = ctx.createOscillator();
      carrier.type = layer.wave || "sine";
      carrier.frequency.value = Math.max(1, layer.baseFreq || 200);
      gate = ctx.createGain();
      gate.gain.value = 0;
      gain = ctx.createGain();
      gain.gain.value = layer.volume;
      stereo = ctx.createStereoPanner();
      stereo.pan.value = layer.pan || 0;
      analyserNode = ctx.createAnalyser();
      analyserNode.fftSize = 2048;
      const bus = getMasterBus(ctx);
      carrier
        .connect(gate)
        .connect(stereo)
        .connect(gain)
        .connect(analyserNode)
        .connect(bus.input);
    }
  }
  return {
    start: async () => {
      await ensure();
      if (playing) return;
      if (osc) {
        // Ensure the shared Web Audio context (used for effects) is running
        try {
          const rctx = getCtx();
          if (rctx) {
            await rctx.resume();
            ctx = rctx;
          }
        } catch {}
        await tone.start?.();
        osc.start();
        playing = true;
        if (interval === null) {
          interval = window.setInterval(
            () => env.triggerAttackRelease(0.1),
            1000 / Math.max(1, layer.pulseFreq || 10)
          );
        }
        await reconcileEffects(layer.effects);
      } else if (carrier && gate && ctx) {
        ctx.resume();
        carrier.start();
        try {
          // fade in to reduce clicks
          gain!.gain.setValueAtTime(0, ctx.currentTime);
          gain!.gain.linearRampToValueAtTime(
            layer.volume,
            ctx.currentTime + 0.02
          );
        } catch {}
        playing = true;
        if (interval === null) {
          interval = window.setInterval(() => {
            if (!ctx) return;
            gate!.gain.setValueAtTime(1, ctx.currentTime);
            gate!.gain.exponentialRampToValueAtTime(
              0.0001,
              ctx.currentTime + 0.05
            );
          }, 1000 / Math.max(1, layer.pulseFreq || 10));
        }
        await reconcileEffects(layer.effects);
      }
    },
    stop: () => {
      if (!playing) return;
      if (osc) {
        osc.stop();
      }
      if (carrier) {
        try {
          gain!.gain.cancelScheduledValues(ctx!.currentTime);
          gain!.gain.setValueAtTime(gain!.gain.value, ctx!.currentTime);
          gain!.gain.linearRampToValueAtTime(0.0001, ctx!.currentTime + 0.03);
        } catch {}
        setTimeout(() => {
          try {
            carrier!.stop();
          } catch {}
          try {
            carrier!.disconnect();
          } catch {}
          carrier = null;
        }, 35);
      }
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
      for (const h of effectHandles.values()) {
        try {
          h.disconnect();
        } catch {}
      }
      playing = false;
    },
    update: (l) => {
      if (l.pulseFreq !== undefined) layer.pulseFreq = l.pulseFreq;
      if (l.baseFreq !== undefined) layer.baseFreq = l.baseFreq;
      if (l.volume !== undefined) layer.volume = l.volume;
      if (l.pan !== undefined) layer.pan = l.pan;
      const waveChanged = l.wave !== undefined && l.wave !== layer.wave;
      if (l.wave !== undefined) layer.wave = l.wave;
      if (osc) {
        if (l.baseFreq !== undefined) {
          osc.frequency.value = Math.max(
            1,
            layer.baseFreq || osc.frequency.value
          );
        }
        if (l.pulseFreq !== undefined) {
          if (interval) {
            clearInterval(interval);
            interval = window.setInterval(
              () => env.triggerAttackRelease(0.1),
              1000 / Math.max(1, layer.pulseFreq || 10)
            );
          }
        }
        if (l.volume !== undefined && volNode) {
          volNode.volume.value = tone.gainToDb(l.volume);
        }
        if (l.pan !== undefined && panNode) {
          panNode.pan.value = l.pan;
        }
        if (waveChanged && osc) {
          osc.type = layer.wave || osc.type;
        }
      } else if (carrier && gate) {
        if (l.baseFreq !== undefined && carrier) {
          carrier.frequency.value = Math.max(
            1,
            layer.baseFreq || carrier.frequency.value
          );
        }
        if (l.pulseFreq !== undefined) {
          if (interval) {
            clearInterval(interval);
            interval = window.setInterval(() => {
              if (!ctx) return;
              gate!.gain.setValueAtTime(1, ctx.currentTime);
              gate!.gain.exponentialRampToValueAtTime(
                0.0001,
                ctx.currentTime + 0.05
              );
            }, 1000 / Math.max(1, layer.pulseFreq || 10));
          }
        }
        if (l.volume !== undefined && gain) {
          gain.gain.value = l.volume;
        }
        if (l.pan !== undefined && stereo) {
          stereo.pan.value = l.pan;
        }
        if (waveChanged && carrier && ctx) {
          try {
            carrier.stop();
          } catch {}
          carrier.disconnect();
          carrier = ctx.createOscillator();
          carrier.type = layer.wave || "sine";
          carrier.frequency.value = Math.max(1, layer.baseFreq || 200);
          if (!gate) {
            gate = ctx.createGain();
            gate.gain.value = 0;
          }
          if (!stereo) {
            stereo = ctx.createStereoPanner();
            stereo.pan.value = layer.pan || 0;
          }
          if (!gain) {
            gain = ctx.createGain();
            gain.gain.value = layer.volume;
          }
          if (!analyserNode) {
            analyserNode = ctx.createAnalyser();
            analyserNode.fftSize = 2048;
          }
          carrier
            .connect(gate)
            .connect(stereo)
            .connect(gain)
            .connect(analyserNode)
            .connect(ctx.destination);
          if (playing) {
            carrier.start();
          }
        }
      }
      if ((l as any).effects !== undefined) {
        (layer as any).effects = (l as any).effects as LayerEffect[];
        reconcileEffects((l as any).effects as LayerEffect[]);
      }
    },
    dispose: () => {
      if (osc) {
        osc.dispose?.();
        env?.dispose?.();
        volNode?.dispose?.();
        panNode?.dispose?.();
      }
      if (carrier) {
        carrier.disconnect();
      }
      for (const h of effectHandles.values()) {
        try {
          h.disconnect();
        } catch {}
        try {
          h.dispose();
        } catch {}
      }
      effectHandles.clear();
      if (interval) clearInterval(interval);
    },
    getAnalyser: () => analyserNode || null,
    getWaveformData: (arr) => {
      if (analyserNode) {
        (analyserNode as any).getByteTimeDomainData(arr as any);
        return;
      }
      if (analyserToneWave) {
        const vals = analyserToneWave.getValue();
        const len = Math.min(arr.length, vals.length);
        for (let i = 0; i < len; i++) {
          const v = (vals[i] + 1) * 0.5;
          arr[i] = Math.max(0, Math.min(255, Math.floor(v * 255)));
        }
      }
    },
    getFrequencyData: (arr) => {
      if (analyserNode) {
        (analyserNode as any).getByteFrequencyData(arr as any);
        return;
      }
      if (analyserToneFft) {
        const vals = analyserToneFft.getValue();
        const min = -100,
          max = 0;
        const len = Math.min(arr.length, vals.length);
        for (let i = 0; i < len; i++) {
          const norm = (vals[i] - min) / (max - min);
          arr[i] = Math.max(0, Math.min(255, Math.floor(norm * 255)));
        }
      }
    },
  };
}

export function createAmbient(layer: SoundLayer): EngineHandle {
  let howl: Howl | null = null;
  function ensure() {
    if (!howl) {
      howl = new Howl({
        src: [ambientSources[layer.ambientKey || "rain"]],
        loop: true,
        volume: layer.volume,
      });
      const id = howl.play();
      howl.stereo(layer.pan || 0, id);
    }
  }
  return {
    start: async () => {
      ensure();
    },
    stop: () => {
      howl?.stop();
    },
    update: (l) => {
      // Always persist values
      if (l.volume !== undefined) layer.volume = l.volume;
      if (l.pan !== undefined) layer.pan = l.pan;
      if (l.ambientKey) layer.ambientKey = l.ambientKey;
      if (!howl) return; // will be applied on next start/ensure
      if (l.volume !== undefined) howl.volume(l.volume);
      if (l.pan !== undefined) howl.stereo(l.pan);
      if (l.ambientKey) {
        howl.stop();
        howl = null;
        ensure();
      }
    },
    dispose: () => {
      howl?.unload();
    },
    getAnalyser: () => null,
    getWaveformData: () => {},
    getFrequencyData: () => {},
  };
}

export function createEngine(layer: SoundLayer): EngineHandle {
  switch (layer.type) {
    case "binaural":
      return createBinaural(layer);
    case "isochronic":
      return createIsochronic(layer);
    case "ambient":
      return createAmbient(layer);
  }
  throw new Error("Unknown layer type");
}
