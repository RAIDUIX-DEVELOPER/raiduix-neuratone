import type { SoundLayer, EngineHandle, LayerEffect } from "@/lib/audio/types";
import { getMasterBus } from "@/lib/audioBus";
import { computeBinauralPair } from "@/lib/utils/math";
import log from "@/lib/logger";
import { createNoiseNode, type NoiseNodeHandle } from "@/lib/effects";
import {
  createAutoPanNode,
  type AutoPanNodeHandle,
} from "@/lib/effects/autopan";
import {
  createRingModNode,
  type RingModNodeHandle,
} from "@/lib/effects/ringmod";
import {
  createTremoloNode,
  type TremoloNodeHandle,
} from "@/lib/effects/tremolo";
import { createChorusNode, type ChorusNodeHandle } from "@/lib/effects/chorus";
import {
  createFlangerNode,
  type FlangerNodeHandle,
} from "@/lib/effects/flanger";
import { createPhaserNode, type PhaserNodeHandle } from "@/lib/effects/phaser";
import {
  createPingPongDelayNode,
  type PingPongDelayNodeHandle,
} from "@/lib/effects/pingpong";
import {
  createCombFilterNode,
  type CombFilterNodeHandle,
} from "@/lib/effects/combfilter";
import {
  createAcidFilterNode,
  type AcidFilterNodeHandle,
} from "@/lib/effects/acidfilter";
import {
  createGateEffectNode,
  type GateEffectNodeHandle,
} from "@/lib/effects/gate";
import {
  createHarmonicExciterNode,
  type HarmonicExciterNodeHandle,
} from "@/lib/effects/harmonicexciter";
import {
  createAdvancedReverbNode,
  type AdvancedReverbNodeHandle,
} from "@/lib/effects/reverb";
import {
  createMultiBandCompressorNode,
  type MultiBandCompressorNodeHandle,
} from "@/lib/effects/multibandcompressor";
import { getAudioContext, resumeIfSuspended } from "@/lib/audio/core/context";
import {
  rebuildEffectChain,
  type EffectHandleMaps,
} from "@/lib/audio/effects/chain";

// NOTE: This is a near verbatim extraction of the previous createBinaural implementation
// from audioEngine.ts. Future refactors will consolidate duplicated effect-chain logic
// across layers.

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

const getCtx = getAudioContext;

export function createBinauralLayer(layer: SoundLayer): EngineHandle {
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
  let effectChainInput: AudioNode | null = null;
  let effectChainOutput: AudioNode | null = null;
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
  const reverbHandles = new Map<string, AdvancedReverbNodeHandle>();
  const multibandHandles = new Map<string, MultiBandCompressorNodeHandle>();
  const automationTimers = new Map<string, number>();
  const computePair = computeBinauralPair;

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
    // Cleanup removed
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
          h.dispose();
        } catch {}
        pingpongHandles.delete(id);
      }
    }
    for (const [id, h] of combfilterHandles.entries()) {
      if (!byId.has(id)) {
        try {
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
          h.dispose();
        } catch {}
        harmonicexciterHandles.delete(id);
      }
    }
    for (const [id, h] of reverbHandles.entries()) {
      if (!byId.has(id)) {
        try {
          h.dispose();
        } catch {}
        reverbHandles.delete(id);
      }
    }
    for (const [id, h] of multibandHandles.entries()) {
      if (!byId.has(id)) {
        try {
          h.disconnect();
        } catch {}
        try {
          h.dispose();
        } catch {}
        multibandHandles.delete(id);
      }
    }
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
        if (automationTimers.has(fx.id)) continue;
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
            if (stereoPan) stereoPan.pan.value = val;
          }
        };
        updateParam(from);
        const timer = window.setInterval(() => {
          const t = (performance.now() - start) / (dur * 1000);
          const k = Math.min(1, Math.max(0, t));
          const v = from + (to - from) * k;
          updateParam(v);
          if (k >= 1) {
            const id = automationTimers.get(fx.id);
            if (id) clearInterval(id);
            automationTimers.delete(fx.id);
          }
        }, 16);
        automationTimers.set(fx.id, timer);
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
          if (playing) handle.start();
        } else {
          existing.setRate(fx.rate ?? 4);
          existing.setDepth(fx.depth ?? 50);
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
          if (playing) handle.start();
        } else {
          existing.setRate(fx.rate ?? 1);
          existing.setDepth(fx.depth ?? 50);
          existing.setMix(fx.mix ?? 50);
          existing.setFeedback(fx.feedback ?? 0);
          existing.setStereoWidth(fx.stereoWidth ?? 100);
          existing.setDamping(fx.damping ?? 0);
        }
      } else if (fx.kind === "flanger") {
        const existing = flangerHandles.get(fx.id);
        if (!existing) {
          const handle = createFlangerNode(
            ctxLocal,
            fx.rate ?? 0.5,
            fx.depth ?? 50,
            fx.feedback ?? 0,
            fx.mix ?? 50
          );
          flangerHandles.set(fx.id, handle);
          if (playing) handle.start();
        } else {
          existing.setRate(fx.rate ?? 0.5);
          existing.setDepth(fx.depth ?? 50);
          existing.setFeedback(fx.feedback ?? 0);
          existing.setMix(fx.mix ?? 50);
        }
      } else if (fx.kind === "phaser") {
        const existing = phaserHandles.get(fx.id);
        if (!existing) {
          // createPhaserNode signature: (ctx, rate?, depth?, stages?, mix?, notchDepth?, resonance?, feedback?, lfoShape?)
          const handle = createPhaserNode(
            ctxLocal,
            fx.rate ?? 0.5,
            fx.depth ?? 50,
            fx.stages ?? 4
          );
          if (fx.feedback !== undefined) {
            try {
              handle.setFeedback(fx.feedback);
            } catch {}
          }
          phaserHandles.set(fx.id, handle);
          if (playing) handle.start();
        } else {
          existing.setRate(fx.rate ?? 0.5);
          existing.setDepth(fx.depth ?? 50);
          if (fx.feedback !== undefined) existing.setFeedback(fx.feedback);
          existing.setStages(fx.stages ?? 4);
        }
      } else if (fx.kind === "pingpong") {
        const existing = pingpongHandles.get(fx.id);
        if (!existing) {
          const handle = createPingPongDelayNode(
            ctxLocal,
            fx.time,
            fx.feedback,
            fx.mix
          );
          pingpongHandles.set(fx.id, handle);
        } else {
          existing.setTime(fx.time);
          existing.setFeedback(fx.feedback);
          existing.setMix(fx.mix);
        }
      } else if (fx.kind === "combfilter") {
        const existing = combfilterHandles.get(fx.id);
        if (!existing) {
          const handle = createCombFilterNode(
            ctxLocal,
            fx.frequency,
            fx.resonance,
            fx.mix
          );
          combfilterHandles.set(fx.id, handle);
        } else {
          existing.setFrequency(fx.frequency);
          existing.setResonance(fx.resonance);
          existing.setMix(fx.mix);
        }
      } else if (fx.kind === "acidfilter") {
        const existing = acidfilterHandles.get(fx.id);
        const lfoRate = (fx as any).lfoRate ?? (fx as any).rate ?? fx.rate;
        const lfoDepth =
          (fx as any).lfoDepth ?? (fx as any).envelope ?? fx.envelope;
        if (!existing) {
          const handle = createAcidFilterNode(
            ctxLocal,
            fx.cutoff,
            fx.resonance,
            lfoRate,
            lfoDepth
          );
          acidfilterHandles.set(fx.id, handle);
          if (playing) handle.start();
        } else {
          existing.setCutoff(fx.cutoff);
          existing.setResonance(fx.resonance);
          if (lfoRate !== undefined) existing.setLfoRate(lfoRate);
          if (lfoDepth !== undefined) existing.setLfoDepth(lfoDepth);
        }
      } else if (fx.kind === "gate") {
        const existing = gateHandles.get(fx.id);
        const threshold =
          (fx as any).threshold ?? (fx as any).depth ?? fx.depth ?? 50;
        if (!existing) {
          const handle = createGateEffectNode(
            ctxLocal as any,
            fx.rate,
            threshold,
            fx.attack,
            fx.release
          );
          gateHandles.set(fx.id, handle);
          if (playing) handle.start();
        } else {
          existing.setRate(fx.rate ?? 4);
          existing.setThreshold(threshold);
          existing.setAttack(fx.attack ?? 10);
          existing.setRelease(fx.release ?? 100);
        }
      } else if (fx.kind === "harmonicexciter") {
        const existing = harmonicexciterHandles.get(fx.id);
        if (!existing) {
          const handle = createHarmonicExciterNode(
            ctxLocal as any,
            fx.drive,
            fx.harmonics,
            fx.tone,
            fx.mix
          );
          harmonicexciterHandles.set(fx.id, handle);
        } else {
          existing.setDrive(fx.drive);
          existing.setMix(fx.mix);
          existing.setHarmonics(fx.harmonics);
          existing.setTone(fx.tone);
        }
      } else if (fx.kind === "reverb") {
        const existing = reverbHandles.get(fx.id);
        if (!existing) {
          const handle = createAdvancedReverbNode(
            ctxLocal,
            fx.roomSize ?? 50,
            fx.damping ?? 30,
            fx.diffusion ?? 70,
            fx.density ?? 80,
            fx.predelay ?? 20,
            fx.width ?? 100,
            fx.mix ?? 25,
            fx.modulation ?? 15
          );
          reverbHandles.set(fx.id, handle);
          if (playing) handle.start();
        } else {
          if (fx.roomSize !== undefined) existing.setRoomSize(fx.roomSize);
          if (fx.damping !== undefined) existing.setDamping(fx.damping);
          if (fx.diffusion !== undefined) existing.setDiffusion(fx.diffusion);
          if (fx.density !== undefined) existing.setDensity(fx.density);
          if (fx.predelay !== undefined) existing.setPredelay(fx.predelay);
          if (fx.width !== undefined) existing.setWidth(fx.width);
          if (fx.mix !== undefined) existing.setMix(fx.mix);
          if (fx.modulation !== undefined)
            existing.setModulation(fx.modulation);
        }
      } else if (fx.kind === "multibandcompressor") {
        const existing = multibandHandles.get(fx.id);
        if (!existing) {
          const handle = createMultiBandCompressorNode(
            ctxLocal as any,
            fx.crossoverLow ?? 200,
            fx.crossoverHigh ?? 2000,
            -12,
            -10,
            -8,
            4,
            3,
            2,
            fx.mix ?? 100
          );
          multibandHandles.set(fx.id, handle);
        } else {
          if (fx.crossoverLow !== undefined)
            existing.setCrossoverLow(fx.crossoverLow);
          if (fx.crossoverHigh !== undefined)
            existing.setCrossoverHigh(fx.crossoverHigh);
          if (fx.mix !== undefined) existing.setMix(fx.mix);
        }
      }
    }
    const handleMaps: EffectHandleMaps = {
      tremolo: tremoloHandles,
      chorus: chorusHandles,
      flanger: flangerHandles,
      phaser: phaserHandles,
      pingpong: pingpongHandles,
      combfilter: combfilterHandles,
      acidfilter: acidfilterHandles,
      gate: gateHandles,
      harmonicexciter: harmonicexciterHandles,
      autopan: autopanHandles,
      ringmod: ringmodHandles,
      reverb: reverbHandles as any,
      multibandcompressor: multibandHandles as any,
    };
    rebuildEffectChain(
      list,
      handleMaps,
      effectChainInput,
      effectChainOutput,
      ctx
    );
  }

  async function ensure() {
    if (!tone) {
      tone = await loadTone();
      if (tone?.Oscillator && tone?.Merge) {
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
        volNode = new tone.Volume(-60);
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
          const effectsInput = (ctx || getCtx()!)!.createGain();
          const effectsOutput = (ctx || getCtx()!)!.createGain();
          effectsInput.gain.value = 1;
          effectsOutput.gain.value = 1;
          stereoPan.connect(effectsInput);
          effectsInput.connect(effectsOutput);
          effectsOutput.connect(bus.input);
          effectChainDownstream = bus.input;
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
      volNode = new tone.Volume(-60);
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
        const effectsInput = (ctx || getCtx()!)!.createGain();
        const effectsOutput = (ctx || getCtx()!)!.createGain();
        effectsInput.gain.value = 1;
        effectsOutput.gain.value = 1;
        stereoPan.connect(effectsInput);
        effectsInput.connect(effectsOutput);
        effectsOutput.connect(bus.input);
        effectChainDownstream = bus.input;
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
      const effectsInput = ctx.createGain();
      const effectsOutput = ctx.createGain();
      effectsInput.gain.value = 1;
      effectsOutput.gain.value = 1;
      effectChainInput = effectsInput;
      effectChainOutput = effectsOutput;
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
        try {
          await resumeIfSuspended();
          const rctx = getCtx();
          if (rctx) ctx = rctx;
        } catch {}
        await tone.start?.();
        left.start();
        right.start();
        try {
          if (ctx && volNode) {
            const targetDb = tone.gainToDb(layer.volume);
            volNode.volume.setValueAtTime(-60, ctx.currentTime);
            volNode.volume.linearRampToValueAtTime(
              targetDb,
              ctx.currentTime + 0.02
            );
          }
        } catch {}
        playing = true;
        if (layer.effects && layer.effects.length > 0) {
          await reconcileEffects(layer.effects);
        }
        try {
          if (effectChainOutput && effectChainDownstream) {
            effectChainOutput.disconnect();
            effectChainOutput.connect(effectChainDownstream);
          }
        } catch {}
      } else if (lOsc && rOsc && ctx) {
        await resumeIfSuspended();
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
        try {
          if (ctx && gain) {
            const target = layer.volume;
            gain.gain.setValueAtTime(0.0001, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(target, ctx.currentTime + 0.02);
          }
        } catch {}
        if (layer.effects && layer.effects.length > 0) {
          await reconcileEffects(layer.effects);
        }
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
      for (const h of reverbHandles.values()) {
        try {
          h.stop?.();
        } catch {}
        try {
          h.outputGain?.disconnect();
        } catch {}
      }
      for (const h of multibandHandles.values()) {
        try {
          h.disconnect?.();
        } catch {}
      }
      try {
        if (effectChainInput) effectChainInput.disconnect();
      } catch {}
      try {
        if (effectChainOutput) effectChainOutput.disconnect();
      } catch {}
      effectChainDownstream = null;
      for (const id of automationTimers.values()) {
        try {
          clearInterval(id);
        } catch {}
      }
      automationTimers.clear();
      playing = false;
    },
    update: (l: Partial<SoundLayer>) => {
      if (typeof l.baseFreq === "number")
        l.baseFreq = Math.min(5000, Math.max(1, l.baseFreq));
      if (typeof l.beatOffset === "number")
        l.beatOffset = Math.min(1000, Math.max(0, l.beatOffset));
      if (typeof l.volume === "number")
        l.volume = Math.min(1, Math.max(0, l.volume));
      if (typeof l.pan === "number") l.pan = Math.min(1, Math.max(-1, l.pan));
      if (l.baseFreq !== undefined) layer.baseFreq = l.baseFreq;
      if (l.beatOffset !== undefined) layer.beatOffset = l.beatOffset;
      if (l.volume !== undefined) layer.volume = l.volume;
      if (l.pan !== undefined) layer.pan = l.pan;
      const waveChanged = l.wave !== undefined && l.wave !== layer.wave;
      if (l.wave !== undefined) layer.wave = l.wave;
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
          const effectsInput = ctx.createGain();
          const effectsOutput = ctx.createGain();
          effectsInput.gain.value = 1;
          effectsOutput.gain.value = 1;
          effectChainInput = effectsInput;
          effectChainOutput = effectsOutput;
          mergerNode.connect(gain).connect(stereoPan).connect(effectsInput);
          effectsInput.connect(effectsOutput);
          effectsOutput.connect(analyserNode);
          effectChainDownstream = analyserNode;
          analyserNode.connect(bus.input);
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
      for (const h of reverbHandles.values()) {
        try {
          h.dispose();
        } catch {}
      }
      for (const h of multibandHandles.values()) {
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
      reverbHandles.clear();
      multibandHandles.clear();
      for (const id of automationTimers.values()) {
        try {
          clearInterval(id);
        } catch {}
      }
      automationTimers.clear();
    },
    getAnalyser: () => analyserNode || null,
    getWaveformData: (arr: Uint8Array) => {
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
    getFrequencyData: (arr: Uint8Array) => {
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
