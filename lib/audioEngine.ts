"use client";
import { Howl } from "howler";
import {
  createNoiseNode,
  type NoiseNodeHandle,
  type NoiseType,
} from "./effects";
import { createAutoPanNode, type AutoPanNodeHandle } from "./effects/autopan";
import { createRingModNode, type RingModNodeHandle } from "./effects/ringmod";
import { createTremoloNode, type TremoloNodeHandle } from "./effects/tremolo";
import { createChorusNode, type ChorusNodeHandle } from "./effects/chorus";
import { createFlangerNode, type FlangerNodeHandle } from "./effects/flanger";
import { createPhaserNode, type PhaserNodeHandle } from "./effects/phaser";
import {
  createPingPongDelayNode,
  type PingPongDelayNodeHandle,
} from "./effects/pingpong";
import {
  createCombFilterNode,
  type CombFilterNodeHandle,
} from "./effects/combfilter";
import {
  createAcidFilterNode,
  type AcidFilterNodeHandle,
} from "./effects/acidfilter";
import {
  createGateEffectNode,
  type GateEffectNodeHandle,
} from "./effects/gate";
import {
  createHarmonicExciterNode,
  type HarmonicExciterNodeHandle,
} from "./effects/harmonicexciter";
import { getMasterBus } from "./audioBus";

export type LayerType = "binaural" | "isochronic" | "ambient";

// Union type for all effect node handles
export type EffectNodeHandle =
  | NoiseNodeHandle
  | AutoPanNodeHandle
  | RingModNodeHandle
  | TremoloNodeHandle
  | ChorusNodeHandle
  | FlangerNodeHandle
  | PhaserNodeHandle
  | PingPongDelayNodeHandle
  | CombFilterNodeHandle
  | AcidFilterNodeHandle
  | GateEffectNodeHandle
  | HarmonicExciterNodeHandle;

export type LayerEffectKind =
  | "noise"
  | "automation"
  | "autopan"
  | "ringmod"
  | "tremolo"
  | "chorus"
  | "flanger"
  | "phaser"
  | "pingpong"
  | "combfilter"
  | "acidfilter"
  | "gate"
  | "harmonicexciter"
  | "reverb"
  | "multibandcompressor";

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

export interface AutoPanEffect {
  id: string;
  kind: "autopan";
  rate: number; // Hz - how fast the pan cycles
  depth: number; // 0..1 - pan range multiplier
}

export interface RingModEffect {
  id: string;
  kind: "ringmod";
  frequency: number; // Hz - modulator frequency
  intensity: number; // 0..1 - ring modulation intensity
}

export interface TremoloEffect {
  id: string;
  kind: "tremolo";
  rate: number; // Hz - tremolo rate
  depth: number; // 0..100 - tremolo depth percentage
}

export interface ChorusEffect {
  id: string;
  kind: "chorus";
  rate: number; // Hz - LFO rate
  depth: number; // milliseconds - delay modulation depth
  mix: number; // 0..100 - wet/dry mix percentage
  feedback: number; // 0..100 - feedback percentage
  stereoWidth: number; // 0..100 - stereo width percentage
  damping: number; // Hz - high frequency damping
}

export interface FlangerEffect {
  id: string;
  kind: "flanger";
  rate: number; // Hz - LFO rate
  depth: number; // milliseconds - delay modulation depth
  feedback: number; // 0..100 - feedback percentage
  mix: number; // 0..100 - wet/dry mix percentage
}

export interface PhaserEffect {
  id: string;
  kind: "phaser";
  rate: number; // Hz - LFO rate
  depth: number; // 0..100 - modulation depth percentage
  feedback: number; // 0..100 - feedback percentage
  stages: number; // number of all-pass filter stages
}

export interface PingPongEffect {
  id: string;
  kind: "pingpong";
  delayTime: number; // seconds - delay time
  feedback: number; // 0..100 - feedback percentage
  mix: number; // 0..100 - wet/dry mix percentage
}

export interface CombFilterEffect {
  id: string;
  kind: "combfilter";
  delayTime: number; // seconds - comb delay time
  resonance: number; // 0..100 - resonance percentage
  mix: number; // 0..100 - wet/dry mix percentage
}

export interface AcidFilterEffect {
  id: string;
  kind: "acidfilter";
  cutoff: number; // Hz - filter cutoff frequency
  resonance: number; // 0..100 - filter resonance percentage
  envelope: number; // 0..100 - envelope amount percentage
  rate: number; // Hz - LFO rate
}

export interface GateEffect {
  id: string;
  kind: "gate";
  rate: number; // Hz - gate rate
  depth: number; // 0..100 - gate depth percentage
  attack: number; // seconds - gate attack time
  release: number; // seconds - gate release time
}

export interface HarmonicExciterEffect {
  id: string;
  kind: "harmonicexciter";
  drive: number; // 0..100 - harmonic drive percentage
  mix: number; // 0..100 - wet/dry mix percentage
  frequency: number; // Hz - frequency focus
}

export interface ReverbEffect {
  id: string;
  kind: "reverb";
  roomSize: number; // 0..100 - room size percentage
  damping: number; // 0..100 - damping percentage
  diffusion: number; // 0..100 - diffusion percentage
  density: number; // 0..100 - density percentage
  predelay: number; // milliseconds - pre-delay time
  width: number; // 0..100 - stereo width percentage
  mix: number; // 0..100 - wet/dry mix percentage
  modulation: number; // 0..100 - modulation depth percentage
}

export interface MultiBandCompressorEffect {
  id: string;
  kind: "multibandcompressor";
  crossoverLow: number; // Hz - low/mid crossover frequency
  crossoverHigh: number; // Hz - mid/high crossover frequency
  lowRatio: number; // compression ratio for low band
  midRatio: number; // compression ratio for mid band
  highRatio: number; // compression ratio for high band
  lowThreshold: number; // dB - threshold for low band
  midThreshold: number; // dB - threshold for mid band
  highThreshold: number; // dB - threshold for high band
  lowGain: number; // dB - makeup gain for low band
  midGain: number; // dB - makeup gain for mid band
  highGain: number; // dB - makeup gain for high band
}

export type LayerEffect =
  | NoiseEffect
  | ParamAutomationEffect
  | AutoPanEffect
  | RingModEffect
  | TremoloEffect
  | ChorusEffect
  | FlangerEffect
  | PhaserEffect
  | PingPongEffect
  | CombFilterEffect
  | AcidFilterEffect
  | GateEffect
  | HarmonicExciterEffect
  | ReverbEffect
  | MultiBandCompressorEffect;
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
  // Effect chain for audio processing
  let effectChainInput: AudioNode | null = null;
  let effectChainOutput: AudioNode | null = null;
  // The node after effectChainOutput (e.g., bus.input or analyserNode)
  let effectChainDownstream: AudioNode | null = null;
  const effectHandles = new Map<string, NoiseNodeHandle>();
  const autopanHandles = new Map<string, AutoPanNodeHandle>();
  const ringmodHandles = new Map<string, RingModNodeHandle>();
  const tremoloHandles = new Map<string, TremoloNodeHandle>();
  const chorusHandles = new Map<string, ChorusNodeHandle>();
  const flangerHandles = new Map<string, FlangerNodeHandle>();
  const phaserHandles = new Map<string, PhaserNodeHandle>();
  const pingpongHandles = new Map<string, PingPongDelayNodeHandle>();
  const combfilterHandles = new Map<string, CombFilterNodeHandle>();
  const acidfilterHandles = new Map<string, AcidFilterNodeHandle>();
  const gateHandles = new Map<string, GateEffectNodeHandle>();
  const harmonicexciterHandles = new Map<string, HarmonicExciterNodeHandle>();
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

    // Cleanup removed effects from all handle maps
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
    for (const [id, h] of autopanHandles.entries()) {
      if (!byId.has(id)) {
        try {
          h.disconnect();
        } catch {}
        try {
          h.dispose();
        } catch {}
        autopanHandles.delete(id);
      }
    }
    for (const [id, h] of ringmodHandles.entries()) {
      if (!byId.has(id)) {
        try {
          h.disconnect();
        } catch {}
        try {
          h.dispose();
        } catch {}
        ringmodHandles.delete(id);
      }
    }
    for (const [id, h] of tremoloHandles.entries()) {
      if (!byId.has(id)) {
        try {
          h.stop();
          h.dispose();
        } catch {}
        tremoloHandles.delete(id);
      }
    }
    for (const [id, h] of chorusHandles.entries()) {
      if (!byId.has(id)) {
        try {
          h.stop();
          h.dispose();
        } catch {}
        chorusHandles.delete(id);
      }
    }
    for (const [id, h] of flangerHandles.entries()) {
      if (!byId.has(id)) {
        try {
          h.stop();
          h.dispose();
        } catch {}
        flangerHandles.delete(id);
      }
    }
    for (const [id, h] of phaserHandles.entries()) {
      if (!byId.has(id)) {
        try {
          h.stop();
          h.dispose();
        } catch {}
        phaserHandles.delete(id);
      }
    }
    for (const [id, h] of pingpongHandles.entries()) {
      if (!byId.has(id)) {
        try {
          h.stop();
          h.dispose();
        } catch {}
        pingpongHandles.delete(id);
      }
    }
    for (const [id, h] of combfilterHandles.entries()) {
      if (!byId.has(id)) {
        try {
          h.stop();
          h.dispose();
        } catch {}
        combfilterHandles.delete(id);
      }
    }
    for (const [id, h] of acidfilterHandles.entries()) {
      if (!byId.has(id)) {
        try {
          h.stop();
          h.dispose();
        } catch {}
        acidfilterHandles.delete(id);
      }
    }
    for (const [id, h] of gateHandles.entries()) {
      if (!byId.has(id)) {
        try {
          h.stop();
          h.dispose();
        } catch {}
        gateHandles.delete(id);
      }
    }
    for (const [id, h] of harmonicexciterHandles.entries()) {
      if (!byId.has(id)) {
        try {
          h.stop();
          h.dispose();
        } catch {}
        harmonicexciterHandles.delete(id);
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
      } else if (fx.kind === "autopan") {
        const existing = autopanHandles.get(fx.id);
        if (!existing) {
          const handle = await createAutoPanNode(ctxLocal, {
            rate: fx.rate,
            depth: fx.depth,
          });
          autopanHandles.set(fx.id, handle);
          handle.start();
        } else {
          existing.setRate(fx.rate);
          existing.setDepth(fx.depth);
          // Chaining handled in rebuildEffectChain; no direct bus connections here
        }
      } else if (fx.kind === "ringmod") {
        const existing = ringmodHandles.get(fx.id);
        if (!existing) {
          const handle = await createRingModNode(ctxLocal, {
            frequency: fx.frequency,
            intensity: fx.intensity,
          });
          ringmodHandles.set(fx.id, handle);
          handle.start();
        } else {
          existing.setFrequency(fx.frequency);
          existing.setIntensity(fx.intensity);
          // Chaining handled in rebuildEffectChain; no direct bus connections here
        }
      } else if (fx.kind === "tremolo") {
        const existing = tremoloHandles.get(fx.id);
        if (!existing) {
          const handle = createTremoloNode(
            ctxLocal,
            fx.rate ?? 4,
            fx.depth ?? 50
          );
          tremoloHandles.set(fx.id, handle);
          // Only start if layer is playing
          if (playing) {
            handle.start();
          }
        } else {
          existing.setRate(fx.rate ?? 4);
          existing.setDepth(fx.depth ?? 50);
          // Effect state will be managed by effect chain rebuilding and stop method
        }
      } else if (fx.kind === "chorus") {
        const existing = chorusHandles.get(fx.id);
        if (!existing) {
          const handle = createChorusNode(
            ctxLocal,
            fx.rate ?? 1,
            fx.depth ?? 50,
            fx.mix ?? 50,
            fx.feedback ?? 0,
            fx.stereoWidth ?? 100,
            fx.damping ?? 0
          );
          chorusHandles.set(fx.id, handle);
          // Only start if layer is playing
          if (playing) {
            handle.start();
          }
        } else {
          existing.setRate(fx.rate ?? 1);
          existing.setDepth(fx.depth ?? 50);
          existing.setMix(fx.mix ?? 50);
          existing.setFeedback(fx.feedback ?? 0);
          existing.setStereoWidth(fx.stereoWidth ?? 100);
          existing.setDamping(fx.damping ?? 0);
          // Effect state will be managed by effect chain rebuilding and stop method
        }
      } else if (fx.kind === "flanger") {
        const existing = flangerHandles.get(fx.id);
        if (!existing) {
          const handle = createFlangerNode(
            ctxLocal,
            fx.rate ?? 0.5,
            fx.depth ?? 2,
            fx.feedback ?? 50,
            fx.mix ?? 50,
            fx.stereoWidth ?? 70,
            fx.envelopeAmount ?? 30
          );
          flangerHandles.set(fx.id, handle);
          if (playing) {
            handle.start();
          }
        } else {
          existing.setRate(fx.rate ?? 0.5);
          existing.setDepth(fx.depth ?? 2);
          existing.setFeedback(fx.feedback ?? 50);
          existing.setMix(fx.mix ?? 50);
          if (fx.stereoWidth !== undefined) existing.setStereoWidth(fx.stereoWidth);
          if (fx.envelopeAmount !== undefined) existing.setEnvelopeAmount(fx.envelopeAmount);
        }
      } else if (fx.kind === "phaser") {
        const existing = phaserHandles.get(fx.id);
        if (!existing) {
          const handle = createPhaserNode(
            ctxLocal,
            fx.rate ?? 0.5,
            fx.depth ?? 100,
            fx.stages ?? 4,
            fx.mix ?? 50,
            fx.notchDepth ?? 70,
            fx.resonance ?? 8,
            fx.feedback ?? 20,
            fx.lfoShape ?? "sine"
          );
          phaserHandles.set(fx.id, handle);
          if (playing) {
            handle.start();
          }
        } else {
          existing.setRate(fx.rate ?? 0.5);
          existing.setDepth(fx.depth ?? 100);
          existing.setStages(fx.stages ?? 4);
          existing.setMix(fx.mix ?? 50);
          if (fx.notchDepth !== undefined) existing.setNotchDepth(fx.notchDepth);
          if (fx.resonance !== undefined) existing.setResonance(fx.resonance);
          existing.setFeedback(fx.feedback ?? 20);
          if (fx.lfoShape) existing.setLfoShape(fx.lfoShape);
        }
      } else if (fx.kind === "pingpong") {
        const existing = pingpongHandles.get(fx.id);
        if (!existing) {
          const handle = createPingPongDelayNode(
            ctxLocal,
            fx.delayTime ?? 250,
            fx.feedback ?? 30,
            fx.mix ?? 30
          );
          pingpongHandles.set(fx.id, handle);
          if (playing) {
            handle.start();
          }
        } else {
          existing.setTime(fx.delayTime ?? 250);
          existing.setFeedback(fx.feedback ?? 30);
          existing.setMix(fx.mix ?? 30);
        }
      } else if (fx.kind === "combfilter") {
        const existing = combfilterHandles.get(fx.id);
        if (!existing) {
          const handle = createCombFilterNode(
            ctxLocal,
            fx.frequency ?? 440,
            fx.resonance ?? 50,
            fx.mix ?? 50
          );
          combfilterHandles.set(fx.id, handle);
          if (playing) {
            handle.start();
          }
        } else {
          existing.setFrequency(fx.frequency ?? 440);
          existing.setResonance(fx.resonance ?? 50);
          existing.setMix(fx.mix ?? 50);
        }
      } else if (fx.kind === "acidfilter") {
        const existing = acidfilterHandles.get(fx.id);
        if (!existing) {
          const handle = createAcidFilterNode(
            ctxLocal,
            fx.cutoff ?? 1000,
            fx.resonance ?? 15,
            fx.lfoRate ?? 0.5,
            fx.lfoDepth ?? 500
          );
          acidfilterHandles.set(fx.id, handle);
          if (playing) {
            handle.start();
          }
        } else {
          existing.setCutoff(fx.cutoff ?? 1000);
          existing.setResonance(fx.resonance ?? 15);
          existing.setLfoRate(fx.lfoRate ?? 0.5);
          existing.setLfoDepth(fx.lfoDepth ?? 500);
        }
      } else if (fx.kind === "gate") {
        const existing = gateHandles.get(fx.id);
        if (!existing) {
          const handle = createGateEffectNode(
            ctxLocal,
            fx.rate ?? 4,
            fx.threshold ?? 50,
            fx.attack ?? 10,
            fx.release ?? 100
          );
          gateHandles.set(fx.id, handle);
          if (playing) {
            handle.start();
          }
        } else {
          existing.setRate(fx.rate ?? 4);
          existing.setThreshold(fx.threshold ?? 50);
          existing.setAttack(fx.attack ?? 10);
          existing.setRelease(fx.release ?? 100);
        }
      } else if (fx.kind === "harmonicexciter") {
        const existing = harmonicexciterHandles.get(fx.id);
        if (!existing) {
          // HarmonicExciter signature: (context, drive, harmonics, tone, mix)
          const handle = createHarmonicExciterNode(
            ctxLocal as any,
            fx.drive,
            fx.frequency,
            fx.mix,
            fx.mix
          );
          harmonicexciterHandles.set(fx.id, handle);
        } else {
          existing.setDrive(fx.drive);
          existing.setMix(fx.mix);
          existing.setTone(fx.frequency); // Use setTone instead of setFrequency
        }
      }
    }

    // Always rebuild the effects chain to ensure proper connectivity
    // The chain setup doesn't depend on playing state, only on available effects
    rebuildEffectChain(list);
  }

  function rebuildEffectChain(effects: LayerEffect[]) {
    if (!effectChainInput || !effectChainOutput || !ctx) return;

    // Disconnect all existing effect connections first
    try {
      effectChainInput.disconnect();
    } catch {}

    // Disconnect effect outputs from their current chain destinations (preserve internal wiring)
    for (const handle of tremoloHandles.values()) {
      try {
        if (handle.outputGain) handle.outputGain.disconnect();
      } catch {}
    }
    for (const handle of chorusHandles.values()) {
      try {
        if (handle.outputGain) handle.outputGain.disconnect();
      } catch {}
    }
    for (const handle of flangerHandles.values()) {
      try {
        if (handle.outputGain) handle.outputGain.disconnect();
      } catch {}
    }
    for (const handle of phaserHandles.values()) {
      try {
        if (handle.outputGain) handle.outputGain.disconnect();
      } catch {}
    }
    for (const handle of pingpongHandles.values()) {
      try {
        if (handle.outputGain) handle.outputGain.disconnect();
      } catch {}
    }
    for (const handle of combfilterHandles.values()) {
      try {
        if (handle.outputGain) handle.outputGain.disconnect();
      } catch {}
    }
    for (const handle of acidfilterHandles.values()) {
      try {
        if (handle.outputGain) handle.outputGain.disconnect();
      } catch {}
    }
    for (const handle of gateHandles.values()) {
      try {
        if (handle.outputGain) handle.outputGain.disconnect();
      } catch {}
    }
    for (const handle of harmonicexciterHandles.values()) {
      try {
        if (handle.outputGain) handle.outputGain.disconnect();
      } catch {}
    }
    // Also detach autopan and ringmod outputs from prior chain connections
    for (const handle of autopanHandles.values()) {
      try {
        if (handle.outputGain) handle.outputGain.disconnect();
      } catch {}
    }
    for (const handle of ringmodHandles.values()) {
      try {
        if (handle.outputGain) handle.outputGain.disconnect();
      } catch {}
    }

    let currentNode: AudioNode = effectChainInput;
    let effectsWereChained = false;

    // Chain all active effects in order
    for (const fx of effects) {
      let effectHandle: any = null;

      // Get the effect handle based on type
      if (fx.kind === "tremolo") {
        effectHandle = tremoloHandles.get(fx.id);
      } else if (fx.kind === "chorus") {
        effectHandle = chorusHandles.get(fx.id);
      } else if (fx.kind === "flanger") {
        effectHandle = flangerHandles.get(fx.id);
      } else if (fx.kind === "phaser") {
        effectHandle = phaserHandles.get(fx.id);
      } else if (fx.kind === "pingpong") {
        effectHandle = pingpongHandles.get(fx.id);
      } else if (fx.kind === "combfilter") {
        effectHandle = combfilterHandles.get(fx.id);
      } else if (fx.kind === "acidfilter") {
        effectHandle = acidfilterHandles.get(fx.id);
      } else if (fx.kind === "gate") {
        effectHandle = gateHandles.get(fx.id);
      } else if (fx.kind === "harmonicexciter") {
        effectHandle = harmonicexciterHandles.get(fx.id);
      } else if (fx.kind === "autopan") {
        effectHandle = autopanHandles.get(fx.id);
      } else if (fx.kind === "ringmod") {
        effectHandle = ringmodHandles.get(fx.id);
      }
      // Note: noise is handled differently (global effect)

      // Insert effect into the chain if it has input/output nodes
      if (effectHandle && effectHandle.inputGain && effectHandle.outputGain) {
        try {
          currentNode.connect(effectHandle.inputGain);
          currentNode = effectHandle.outputGain;
          effectsWereChained = true;
        } catch (e) {
          console.warn(`Failed to chain effect ${fx.kind}:`, e);
        }
      }
    }

    // If no effects were chained (e.g., only global effects like noise),
    // ensure we have a direct connection to maintain audio flow
    if (!effectsWereChained && currentNode === effectChainInput) {
      console.log("No chainable effects found, maintaining direct connection");
    }

    // Connect the final node to the output
    try {
      currentNode.connect(effectChainOutput);
    } catch (e) {
      console.warn("Failed to connect effect chain output:", e);
      // If chaining failed, ensure we at least have a direct connection
      try {
        effectChainInput.connect(effectChainOutput);
      } catch (fallbackError) {
        console.warn("Failed to create fallback connection:", fallbackError);
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
        volNode = new tone.Volume(-60); // Start silent, fade-in will ramp up
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

          // Create an effects processing chain before master bus
          const effectsInput = (ctx || getCtx()!)!.createGain();
          const effectsOutput = (ctx || getCtx()!)!.createGain();
          effectsInput.gain.value = 1;
          effectsOutput.gain.value = 1;

          // Default routing: stereoPan -> effectsInput -> effectsOutput -> master bus
          // Effects will be inserted between effectsInput and effectsOutput
          stereoPan.connect(effectsInput);
          effectsInput.connect(effectsOutput);
          effectsOutput.connect(bus.input);
          effectChainDownstream = bus.input;

          // Store references for effect chain building
          effectChainInput = effectsInput;
          effectChainOutput = effectsOutput;
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
      volNode = new tone.Volume(-60); // Start silent, fade-in will ramp up
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

        // Create an effects processing chain before master bus
        const effectsInput = (ctx || getCtx()!)!.createGain();
        const effectsOutput = (ctx || getCtx()!)!.createGain();
        effectsInput.gain.value = 1;
        effectsOutput.gain.value = 1;

        // Default routing: stereoPan -> effectsInput -> effectsOutput -> master bus
        // Effects will be inserted between effectsInput and effectsOutput
        stereoPan.connect(effectsInput);
        effectsInput.connect(effectsOutput);
        effectsOutput.connect(bus.input);
        effectChainDownstream = bus.input;

        // Store references for effect chain building
        effectChainInput = effectsInput;
        effectChainOutput = effectsOutput;
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

      // Create an effects processing chain before master bus
      const effectsInput = ctx.createGain();
      const effectsOutput = ctx.createGain();
      effectsInput.gain.value = 1;
      effectsOutput.gain.value = 1;

      // Store references for effect chain building
      effectChainInput = effectsInput;
      effectChainOutput = effectsOutput;

      // Default routing: layer -> effects chain -> analyser -> master bus
      // Effects will be inserted between effectsInput and effectsOutput
      mergerNode.connect(gain).connect(stereoPan).connect(effectsInput);

      effectsInput.connect(effectsOutput);
      effectsOutput.connect(analyserNode);
      effectChainDownstream = analyserNode;
      analyserNode.connect(bus.input);
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
          if (ctx && volNode) {
            const targetDb = tone.gainToDb(layer.volume);
            // Start from -60dB (effectively silent) and ramp to target
            volNode.volume.setValueAtTime(-60, ctx.currentTime);
            volNode.volume.linearRampToValueAtTime(
              targetDb,
              ctx.currentTime + 0.02
            );
          }
        } catch {}
        playing = true;
        // Only reconcile effects if they exist and we're not already processing them
        if (layer.effects && layer.effects.length > 0) {
          await reconcileEffects(layer.effects);
        }
        // Ensure single downstream connection
        try {
          if (effectChainOutput && effectChainDownstream) {
            effectChainOutput.disconnect();
            effectChainOutput.connect(effectChainDownstream);
          }
        } catch {}
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
            gain.gain.setValueAtTime(0.0001, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(target, ctx.currentTime + 0.02);
          }
        } catch {}
        // Only reconcile effects if they exist and we're not already processing them
        if (layer.effects && layer.effects.length > 0) {
          await reconcileEffects(layer.effects);
        }
        // Ensure single downstream connection
        try {
          if (effectChainOutput && effectChainDownstream) {
            effectChainOutput.disconnect();
            effectChainOutput.connect(effectChainDownstream);
          }
        } catch {}
      }
    },
    stop: () => {
      if (!playing) return;
      if (left && right) {
        // fade out then stop
        try {
          if (ctx && volNode) {
            volNode.volume.cancelScheduledValues(ctx.currentTime);
            volNode.volume.setValueAtTime(
              volNode.volume.value,
              ctx.currentTime
            );
            volNode.volume.linearRampToValueAtTime(-60, ctx.currentTime + 0.03);
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

      // Properly disconnect and stop all effect types
      for (const h of effectHandles.values()) {
        try {
          h.disconnect();
        } catch {}
      }
      for (const h of autopanHandles.values()) {
        try {
          h.stop?.();
        } catch {}
        try {
          h.outputGain?.disconnect();
        } catch {}
      }
      for (const h of ringmodHandles.values()) {
        try {
          h.stop?.();
        } catch {}
        try {
          h.outputGain?.disconnect();
        } catch {}
      }
      for (const h of tremoloHandles.values()) {
        try {
          h.stop();
        } catch {}
        try {
          h.outputGain?.disconnect();
        } catch {}
      }
      for (const h of chorusHandles.values()) {
        try {
          h.stop();
        } catch {}
        try {
          h.outputGain?.disconnect();
        } catch {}
      }
      for (const h of flangerHandles.values()) {
        try {
          h.stop();
        } catch {}
        try {
          h.outputGain?.disconnect();
        } catch {}
      }
      for (const h of phaserHandles.values()) {
        try {
          h.stop();
        } catch {}
        try {
          h.outputGain?.disconnect();
        } catch {}
      }
      for (const h of pingpongHandles.values()) {
        try {
          h.stop();
        } catch {}
        try {
          h.outputGain?.disconnect();
        } catch {}
      }
      for (const h of combfilterHandles.values()) {
        try {
          h.stop();
        } catch {}
        try {
          h.outputGain?.disconnect();
        } catch {}
      }
      for (const h of acidfilterHandles.values()) {
        try {
          h.stop();
        } catch {}
        try {
          h.outputGain?.disconnect();
        } catch {}
      }
      for (const h of gateHandles.values()) {
        try {
          h.stop();
        } catch {}
        try {
          h.outputGain?.disconnect();
        } catch {}
      }
      for (const h of harmonicexciterHandles.values()) {
        try {
          h.stop();
        } catch {}
        try {
          h.outputGain?.disconnect();
        } catch {}
      }

      // Reset effect chain by disconnecting endpoints completely
      try {
        if (effectChainInput) effectChainInput.disconnect();
      } catch {}
      try {
        if (effectChainOutput) effectChainOutput.disconnect();
      } catch {}
      // Also sever any explicit downstream reference
      effectChainDownstream = null;

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

      // Dispose all effect types
      for (const h of effectHandles.values()) {
        try {
          h.disconnect();
        } catch {}
        try {
          h.dispose();
        } catch {}
      }
      for (const h of autopanHandles.values()) {
        try {
          h.disconnect();
        } catch {}
        try {
          h.dispose();
        } catch {}
      }
      for (const h of ringmodHandles.values()) {
        try {
          h.disconnect();
        } catch {}
        try {
          h.dispose();
        } catch {}
      }
      for (const h of tremoloHandles.values()) {
        try {
          h.dispose();
        } catch {}
      }
      for (const h of chorusHandles.values()) {
        try {
          h.dispose();
        } catch {}
      }
      for (const h of flangerHandles.values()) {
        try {
          h.dispose();
        } catch {}
      }
      for (const h of phaserHandles.values()) {
        try {
          h.dispose();
        } catch {}
      }
      for (const h of pingpongHandles.values()) {
        try {
          h.dispose();
        } catch {}
      }
      for (const h of combfilterHandles.values()) {
        try {
          h.dispose();
        } catch {}
      }
      for (const h of acidfilterHandles.values()) {
        try {
          h.dispose();
        } catch {}
      }
      for (const h of gateHandles.values()) {
        try {
          h.dispose();
        } catch {}
      }
      for (const h of harmonicexciterHandles.values()) {
        try {
          h.dispose();
        } catch {}
      }

      effectHandles.clear();
      autopanHandles.clear();
      ringmodHandles.clear();
      tremoloHandles.clear();
      chorusHandles.clear();
      flangerHandles.clear();
      phaserHandles.clear();
      pingpongHandles.clear();
      combfilterHandles.clear();
      acidfilterHandles.clear();
      gateHandles.clear();
      harmonicexciterHandles.clear();

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
  const autopanHandles = new Map<string, AutoPanNodeHandle>();
  const ringmodHandles = new Map<string, RingModNodeHandle>();
  const tremoloHandles = new Map<string, TremoloNodeHandle>();
  const chorusHandles = new Map<string, ChorusNodeHandle>();
  const flangerHandles = new Map<string, FlangerNodeHandle>();
  const phaserHandles = new Map<string, PhaserNodeHandle>();
  const pingpongHandles = new Map<string, PingPongDelayNodeHandle>();
  const combfilterHandles = new Map<string, CombFilterNodeHandle>();
  const acidfilterHandles = new Map<string, AcidFilterNodeHandle>();
  const gateHandles = new Map<string, GateEffectNodeHandle>();
  const harmonicexciterHandles = new Map<string, HarmonicExciterNodeHandle>();
  const automationTimers = new Map<string, number>();
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
        volNode = new tone.Volume(-60); // Start silent, fade-in will ramp up
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
