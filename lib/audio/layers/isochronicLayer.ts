import type { SoundLayer, EngineHandle, LayerEffect } from "@/lib/audio/types";
import { getMasterBus } from "@/lib/audioBus";
import { createNoiseNode, type NoiseNodeHandle } from "@/lib/effects";
import { getAudioContext, resumeIfSuspended } from "@/lib/audio/core/context";
import {
  rebuildEffectChain,
  type EffectHandleMaps,
} from "@/lib/audio/effects/chain";
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

export function createIsochronicLayer(layer: SoundLayer): EngineHandle {
  let tone: any,
    osc: any,
    volNode: any,
    analyserToneFft: any,
    analyserToneWave: any,
    playing = false;
  let ctx = getCtx();
  let carrier: OscillatorNode | null = null;
  let gate: GainNode | null = null; // audio-rate gated VCA
  let gain: GainNode | null = null;
  let stereo: StereoPannerNode | null = null;
  let analyserNode: AnalyserNode | null = null;
  // Pulse LFO chain for precise isochronic gating
  let lfo: OscillatorNode | null = null;
  let lfoScale: GainNode | null = null; // scales LFO to +/-0.5
  let lfoSmooth: BiquadFilterNode | null = null; // optional low-pass to soften edges
  // In WebAudio, AudioParam sums base value with any connected signals. We'll set gate.gain.value=0.5 and add +/-0.5 from LFO to get [0,1].
  let effectChainInput: AudioNode | null = null;
  let effectChainOutput: AudioNode | null = null;
  let effectChainDownstream: AudioNode | null = null;
  const noiseHandles = new Map<string, NoiseNodeHandle>();
  const autopanHandles = new Map<string, AutoPanNodeHandle>();
  const ringmodHandles = new Map<string, RingModNodeHandle>();
  const tremoloHandles = new Map<string, TremoloNodeHandle>();
  const chorusHandles = new Map<string, ChorusNodeHandle>();
  const flangerHandles = new Map<string, FlangerNodeHandle>();
  const phaserHandles = new Map<string, PhaserNodeHandle>();
  const pingpongHandles = new Map<string, PingPongDelayNodeHandle>();
  const combfilterHandles = new Map<string, CombFilterNodeHandle>();
  const acidfilterHandles = new Map<string, AcidFilterNodeHandle>();
  const gateFxHandles = new Map<string, GateEffectNodeHandle>();
  const harmonicexciterHandles = new Map<string, HarmonicExciterNodeHandle>();
  const reverbHandles = new Map<string, AdvancedReverbNodeHandle>();
  const multibandHandles = new Map<string, MultiBandCompressorNodeHandle>();
  const automationTimers = new Map<string, number>();

  async function reconcileEffects(effects?: LayerEffect[]) {
    const list = effects || [];
    const byId = new Map<string, LayerEffect>();
    list.forEach((fx) => byId.set(fx.id, fx));
    // Cleanup removed handles
    for (const [id, h] of noiseHandles.entries()) {
      if (!byId.has(id)) {
        try {
          h.disconnect();
        } catch {}
        try {
          h.dispose();
        } catch {}
        noiseHandles.delete(id);
      }
    }
    for (const [id, h] of autopanHandles.entries()) {
      if (!byId.has(id)) {
        try {
          h.disconnect?.();
        } catch {}
        try {
          (h as any).dispose?.();
        } catch {}
        autopanHandles.delete(id);
      }
    }
    for (const [id, h] of ringmodHandles.entries()) {
      if (!byId.has(id)) {
        try {
          h.disconnect?.();
        } catch {}
        try {
          (h as any).dispose?.();
        } catch {}
        ringmodHandles.delete(id);
      }
    }
    for (const [id, h] of tremoloHandles.entries()) {
      if (!byId.has(id)) {
        try {
          h.stop?.();
        } catch {}
        try {
          (h as any).dispose?.();
        } catch {}
        tremoloHandles.delete(id);
      }
    }
    for (const [id, h] of chorusHandles.entries()) {
      if (!byId.has(id)) {
        try {
          h.stop?.();
        } catch {}
        try {
          (h as any).dispose?.();
        } catch {}
        chorusHandles.delete(id);
      }
    }
    for (const [id, h] of flangerHandles.entries()) {
      if (!byId.has(id)) {
        try {
          h.stop?.();
        } catch {}
        try {
          (h as any).dispose?.();
        } catch {}
        flangerHandles.delete(id);
      }
    }
    for (const [id, h] of phaserHandles.entries()) {
      if (!byId.has(id)) {
        try {
          h.stop?.();
        } catch {}
        try {
          (h as any).dispose?.();
        } catch {}
        phaserHandles.delete(id);
      }
    }
    for (const [id, h] of pingpongHandles.entries()) {
      if (!byId.has(id)) {
        try {
          (h as any).disconnect?.();
        } catch {}
        try {
          (h as any).dispose?.();
        } catch {}
        pingpongHandles.delete(id);
      }
    }
    for (const [id, h] of combfilterHandles.entries()) {
      if (!byId.has(id)) {
        try {
          (h as any).disconnect?.();
        } catch {}
        try {
          (h as any).dispose?.();
        } catch {}
        combfilterHandles.delete(id);
      }
    }
    for (const [id, h] of acidfilterHandles.entries()) {
      if (!byId.has(id)) {
        try {
          h.stop?.();
        } catch {}
        try {
          (h as any).dispose?.();
        } catch {}
        acidfilterHandles.delete(id);
      }
    }
    for (const [id, h] of gateFxHandles.entries()) {
      if (!byId.has(id)) {
        try {
          h.stop?.();
        } catch {}
        try {
          (h as any).dispose?.();
        } catch {}
        gateFxHandles.delete(id);
      }
    }
    for (const [id, h] of harmonicexciterHandles.entries()) {
      if (!byId.has(id)) {
        try {
          (h as any).disconnect?.();
        } catch {}
        try {
          (h as any).dispose?.();
        } catch {}
        harmonicexciterHandles.delete(id);
      }
    }
    for (const [id, h] of reverbHandles.entries()) {
      if (!byId.has(id)) {
        try {
          (h as any).disconnect?.();
        } catch {}
        try {
          (h as any).dispose?.();
        } catch {}
        reverbHandles.delete(id);
      }
    }
    for (const [id, h] of multibandHandles.entries()) {
      if (!byId.has(id)) {
        try {
          (h as any).disconnect?.();
        } catch {}
        try {
          (h as any).dispose?.();
        } catch {}
        multibandHandles.delete(id);
      }
    }
    const ctxLocal = ctx || getCtx();
    if (!ctxLocal) return;
    ctx = ctxLocal;
    for (const fx of list) {
      if (fx.kind === "noise") {
        const existing = noiseHandles.get(fx.id);
        if (!existing) {
          const handle = await createNoiseNode(ctxLocal, {
            type: fx.type,
            gain: fx.gain,
            pan: fx.pan,
          });
          if (playing) handle.connect(getMasterBus(ctxLocal).input);
          noiseHandles.set(fx.id, handle);
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
      } else if (fx.kind === "automation") {
        if (automationTimers.has(fx.id)) continue;
        const start = performance.now();
        const dur = Math.max(0.05, fx.durationSec || 0);
        const from = fx.from;
        const to = fx.to;
        const updateParam = (val: number) => {
          if (fx.target === "pulseFreq") {
            layer.pulseFreq = val;
            if (lfo && ctx) {
              const f = Math.max(0.1, Math.min(50, layer.pulseFreq || 10));
              try {
                lfo.frequency.cancelScheduledValues(ctx.currentTime);
                lfo.frequency.setTargetAtTime(f, ctx.currentTime, 0.03);
              } catch {
                lfo.frequency.value = f;
              }
            }
          } else if (fx.target === "volume") {
            layer.volume = val;
            if (volNode) volNode.volume.value = tone.gainToDb(val);
            if (gain) gain.gain.value = val;
          } else if (fx.target === "pan") {
            layer.pan = val;
            if (stereo) stereo.pan.value = val;
          } else if (fx.target === "beatOffset") {
            layer.beatOffset = val; // not directly used by isochronic
          }
        };
        updateParam(from);
        const tId = window.setInterval(() => {
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
        automationTimers.set(fx.id, tId);
      } else if (fx.kind === "autopan") {
        const existing = autopanHandles.get(fx.id);
        if (!existing) {
          const handle = await createAutoPanNode(ctxLocal, {
            rate: fx.rate,
            depth: fx.depth,
          });
          autopanHandles.set(fx.id, handle);
          if (playing) handle.start();
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
          if (playing) handle.start();
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
        // Accept legacy/UI field names
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
        const existing = gateFxHandles.get(fx.id);
        // Accept legacy/UI field names
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
          gateFxHandles.set(fx.id, handle);
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
      gate: gateFxHandles,
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

  function setupPulseLfo(localCtx: AudioContext) {
    // Create LFO and scaling if not present
    if (!lfo) lfo = localCtx.createOscillator();
    if (!lfoScale) lfoScale = localCtx.createGain();
    if (!lfoSmooth) lfoSmooth = localCtx.createBiquadFilter();
    // Square wave for distinct pulses
    try {
      lfo.type = "square";
    } catch {
      lfo.type = "sine";
    }
    const freq = Math.max(0.1, Math.min(50, layer.pulseFreq || 10));
    lfo.frequency.value = freq;
    // Scale to +/-0.5 and add 0.5 on the AudioParam base value (see gate setup)
    lfoScale.gain.value = 0.5;
    // Slightly smooth edges to avoid clicks when opening/closing the gate
    try {
      lfoSmooth.type = "lowpass";
      // Dynamic cutoff based on pulse frequency (preserve shape, soften edges)
      const cutoff = Math.min(
        2000,
        Math.max(100, (layer.pulseFreq || 10) * 120)
      );
      lfoSmooth.frequency.value = cutoff;
      lfoSmooth.Q.value = 0.707;
    } catch {}
    try {
      lfo.connect(lfoScale);
      lfoScale.connect(lfoSmooth);
      // lfoSmooth is connected to gate.gain where available in ensure()
    } catch {}
  }

  // Recreate the LFO oscillator safely (needed after stop), and (re)connect to gate.gain
  function recreatePulseLfo(localCtx: AudioContext) {
    try {
      lfo?.disconnect();
    } catch {}
    try {
      // Some browsers throw if stop called twice; ignore
      lfo?.stop?.();
    } catch {}
    lfo = localCtx.createOscillator();
    try {
      lfo.type = "square";
    } catch {
      lfo.type = "sine";
    }
    if (!lfoScale) lfoScale = localCtx.createGain();
    if (!lfoSmooth) lfoSmooth = localCtx.createBiquadFilter();
    lfoScale.gain.value = 0.5;
    try {
      lfoSmooth.type = "lowpass";
      const cutoff = Math.min(
        2000,
        Math.max(100, (layer.pulseFreq || 10) * 120)
      );
      lfoSmooth.frequency.value = cutoff;
      lfoSmooth.Q.value = 0.707;
    } catch {}
    try {
      lfo.connect(lfoScale);
      lfoScale.connect(lfoSmooth);
    } catch {}
    const f = Math.max(0.1, Math.min(50, layer.pulseFreq || 10));
    lfo.frequency.value = f;
    if (gate) {
      try {
        // Avoid duplicate summing connections
        lfoSmooth.disconnect();
      } catch {}
      try {
        lfoSmooth.connect((gate as GainNode).gain);
      } catch {}
    }
  }

  async function ensure() {
    if (!tone) {
      tone = await loadTone();
      if (tone?.Oscillator) {
        try {
          const shared = getCtx();
          tone.setContext?.(shared);
          if (shared) ctx = shared;
        } catch {}
        osc = new tone.Oscillator(
          Math.max(1, layer.baseFreq || 200),
          layer.wave || "sine"
        );
        volNode = new tone.Volume(-60);
        analyserToneFft = new tone.Analyser("fft", 1024);
        analyserToneWave = new tone.Analyser("waveform", 1024);
        // Chain within Tone up to volume node; route to shared effect chain using native nodes
        // We'll insert a native GainNode (gate) after volNode for precise audio-rate pulse gating
        osc.connect(volNode);
        try {
          const bus = getMasterBus(ctx || getCtx()!);
          stereo = (ctx || getCtx()!)!.createStereoPanner();
          stereo.pan.value = layer.pan || 0;
          // Create gated VCA and LFO
          const local = (ctx || getCtx()!)!;
          gate = local.createGain();
          gate.gain.value = 0.5; // base value for (LFO*0.5 + 0.5) mapping
          setupPulseLfo(local);
          // Connect Tone -> gate -> stereo -> effects
          (volNode as any).connect?.(gate);
          // Connect LFO to gate gain via scaler
          try {
            // connect smoothing to AudioParam
            lfoSmooth && lfoSmooth.connect(gate.gain);
          } catch {}
          gate.connect(stereo);
          // create shared effects chain
          const effectsInput = (ctx || getCtx()!)!.createGain();
          const effectsOutput = (ctx || getCtx()!)!.createGain();
          effectsInput.gain.value = 1;
          effectsOutput.gain.value = 1;
          effectChainInput = effectsInput;
          effectChainOutput = effectsOutput;
          stereo.connect(analyserToneFft as any);
          stereo.connect(effectsInput);
          effectsInput.connect(effectsOutput);
          effectsOutput.connect(bus.input);
          effectChainDownstream = bus.input;
          volNode.connect?.(analyserToneWave);
        } catch {}
        return;
      }
    }
    if (!carrier && ctx) {
      carrier = ctx.createOscillator();
      carrier.type = layer.wave || "sine";
      carrier.frequency.value = Math.max(1, layer.baseFreq || 200);
      gate = ctx.createGain();
      // Base 0.5 + LFO (+/-0.5) => [0,1] pulses
      gate.gain.value = 0.5;
      setupPulseLfo(ctx);
      gain = ctx.createGain();
      gain.gain.value = layer.volume;
      stereo = ctx.createStereoPanner();
      stereo.pan.value = layer.pan || 0;
      analyserNode = ctx.createAnalyser();
      analyserNode.fftSize = 2048;
      const bus = getMasterBus(ctx);
      const effectsInput = ctx.createGain();
      const effectsOutput = ctx.createGain();
      effectsInput.gain.value = 1;
      effectsOutput.gain.value = 1;
      effectChainInput = effectsInput;
      effectChainOutput = effectsOutput;
      carrier.connect(gate).connect(stereo).connect(gain).connect(effectsInput);
      // Connect LFO scaler to gate gain
      try {
        lfoSmooth && lfoSmooth.connect(gate.gain);
      } catch {}
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
      if (osc) {
        try {
          await resumeIfSuspended();
          const rctx = getCtx();
          if (rctx) ctx = rctx;
        } catch {}
        await tone.start?.();
        // Smooth fade-in on Tone path to prevent clicks
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
        // Ensure fresh LFO instance (OscillatorNode cannot be restarted after stop)
        try {
          if (ctx) recreatePulseLfo(ctx);
        } catch {}
        osc.start();
        playing = true;
        // Start LFO for gating
        try {
          lfo?.start();
        } catch {}
        await reconcileEffects(layer.effects);
        try {
          if (effectChainOutput && effectChainDownstream) {
            effectChainOutput.disconnect();
            effectChainOutput.connect(effectChainDownstream);
          }
        } catch {}
      } else if (carrier && gate && ctx) {
        await resumeIfSuspended();
        // Ensure fresh LFO instance (OscillatorNode cannot be restarted after stop)
        try {
          recreatePulseLfo(ctx);
        } catch {}
        carrier.start();
        try {
          gain!.gain.setValueAtTime(0, ctx.currentTime);
          gain!.gain.linearRampToValueAtTime(
            layer.volume,
            ctx.currentTime + 0.02
          );
        } catch {}
        playing = true;
        // Start LFO for gating
        try {
          lfo?.start();
        } catch {}
        await reconcileEffects(layer.effects);
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
      if (osc) {
        // Smooth fade-out on Tone path to avoid clicks before stopping
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
            osc.stop();
          } catch {}
        }, 35);
      }
      if (carrier && ctx) {
        try {
          gain!.gain.cancelScheduledValues(ctx.currentTime);
          gain!.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.03);
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
      // Stop LFO
      try {
        lfo?.stop();
      } catch {}
      for (const h of noiseHandles.values()) {
        try {
          h.disconnect();
        } catch {}
      }
      for (const h of autopanHandles.values()) {
        try {
          h.stop?.();
        } catch {}
        try {
          (h as any).outputGain?.disconnect();
        } catch {}
      }
      for (const h of ringmodHandles.values()) {
        try {
          h.stop?.();
        } catch {}
        try {
          (h as any).outputGain?.disconnect();
        } catch {}
      }
      for (const h of tremoloHandles.values()) {
        try {
          h.stop?.();
        } catch {}
        try {
          (h as any).outputGain?.disconnect();
        } catch {}
      }
      for (const h of chorusHandles.values()) {
        try {
          h.stop?.();
        } catch {}
        try {
          (h as any).outputGain?.disconnect();
        } catch {}
      }
      for (const h of flangerHandles.values()) {
        try {
          h.stop?.();
        } catch {}
        try {
          (h as any).outputGain?.disconnect();
        } catch {}
      }
      for (const h of phaserHandles.values()) {
        try {
          h.stop?.();
        } catch {}
        try {
          (h as any).outputGain?.disconnect();
        } catch {}
      }
      for (const h of pingpongHandles.values()) {
        try {
          (h as any).stop?.();
        } catch {}
        try {
          (h as any).outputGain?.disconnect();
        } catch {}
      }
      for (const h of combfilterHandles.values()) {
        try {
          (h as any).stop?.();
        } catch {}
        try {
          (h as any).outputGain?.disconnect();
        } catch {}
      }
      for (const h of acidfilterHandles.values()) {
        try {
          h.stop?.();
        } catch {}
        try {
          (h as any).outputGain?.disconnect();
        } catch {}
      }
      for (const h of gateFxHandles.values()) {
        try {
          h.stop?.();
        } catch {}
        try {
          (h as any).outputGain?.disconnect();
        } catch {}
      }
      for (const h of harmonicexciterHandles.values()) {
        try {
          (h as any).stop?.();
        } catch {}
        try {
          (h as any).outputGain?.disconnect();
        } catch {}
      }
      for (const h of reverbHandles.values()) {
        try {
          h.stop?.();
        } catch {}
        try {
          (h as any).outputGain?.disconnect();
        } catch {}
      }
      for (const h of multibandHandles.values()) {
        try {
          (h as any).disconnect?.();
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
      if (typeof l.pulseFreq === "number")
        l.pulseFreq = Math.min(50, Math.max(0.1, l.pulseFreq));
      if (typeof l.volume === "number")
        l.volume = Math.min(1, Math.max(0, l.volume));
      if (typeof l.pan === "number") l.pan = Math.min(1, Math.max(-1, l.pan));
      if (l.baseFreq !== undefined) layer.baseFreq = l.baseFreq;
      if (l.pulseFreq !== undefined) layer.pulseFreq = l.pulseFreq;
      if (l.volume !== undefined) layer.volume = l.volume;
      if (l.pan !== undefined) layer.pan = l.pan;
      const waveChanged = l.wave !== undefined && l.wave !== layer.wave;
      if (l.wave !== undefined) layer.wave = l.wave;
      if (osc) {
        if (l.baseFreq !== undefined) {
          try {
            osc.frequency.value = Math.max(1, layer.baseFreq || 200);
          } catch {}
        }
        if (l.volume !== undefined && volNode) {
          try {
            if (ctx) {
              const targetDb = tone.gainToDb(layer.volume);
              volNode.volume.cancelScheduledValues(ctx.currentTime);
              volNode.volume.setValueAtTime(
                volNode.volume.value,
                ctx.currentTime
              );
              volNode.volume.linearRampToValueAtTime(
                targetDb,
                ctx.currentTime + 0.02
              );
            } else {
              volNode.volume.value = tone.gainToDb(layer.volume);
            }
          } catch {
            volNode.volume.value = tone.gainToDb(layer.volume);
          }
        }
        if (l.pulseFreq !== undefined && lfo && ctx) {
          const f = Math.max(0.1, Math.min(50, layer.pulseFreq || 10));
          try {
            lfo.frequency.cancelScheduledValues(ctx.currentTime);
            lfo.frequency.setTargetAtTime(f, ctx.currentTime, 0.03);
          } catch {
            lfo.frequency.value = f;
          }
          try {
            if (lfoSmooth) {
              const cutoff = Math.min(2000, Math.max(100, f * 120));
              lfoSmooth.frequency.setTargetAtTime(
                cutoff,
                ctx.currentTime,
                0.03
              );
            }
          } catch {}
        }
        if (waveChanged) {
          try {
            osc.stop();
          } catch {}
          try {
            osc.dispose?.();
          } catch {}
          osc = new tone.Oscillator(
            Math.max(1, layer.baseFreq || 200),
            layer.wave || "sine"
          );
          osc.connect(volNode);
          try {
            if (stereo && effectChainInput && effectChainDownstream) {
              // Recreate or reuse gate and LFO chain
              if (!ctx) ctx = getCtx();
              if (ctx && !gate) gate = ctx.createGain();
              if (gate) {
                gate.gain.value = 0.5;
                try {
                  (volNode as any).disconnect?.();
                } catch {}
                (volNode as any).connect?.(gate);
                try {
                  lfoSmooth && gate && lfoSmooth.connect(gate.gain);
                } catch {}
                gate.connect(stereo);
              } else {
                (volNode as any).connect?.(stereo);
              }
              stereo.connect(analyserToneFft as any);
              stereo.connect(effectChainInput);
              // effectChainOutput already connected to downstream in start()
            }
          } catch {}
          if (playing) {
            try {
              osc.start();
            } catch {}
          }
        }
      } else if (carrier && ctx) {
        if (l.baseFreq !== undefined)
          carrier.frequency.value = Math.max(1, layer.baseFreq || 200);
        if (l.volume !== undefined && gain) {
          try {
            if (ctx) {
              gain.gain.cancelScheduledValues(ctx.currentTime);
              gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
              gain.gain.linearRampToValueAtTime(
                layer.volume,
                ctx.currentTime + 0.02
              );
            } else {
              gain.gain.value = layer.volume;
            }
          } catch {
            gain.gain.value = layer.volume;
          }
        }
        if (l.pan !== undefined && stereo) stereo.pan.value = layer.pan || 0;
        if (l.pulseFreq !== undefined && lfo) {
          const f = Math.max(0.1, Math.min(50, layer.pulseFreq || 10));
          try {
            lfo.frequency.cancelScheduledValues(ctx.currentTime);
            lfo.frequency.setTargetAtTime(f, ctx.currentTime, 0.03);
          } catch {
            lfo.frequency.value = f;
          }
          try {
            if (lfoSmooth) {
              const cutoff = Math.min(2000, Math.max(100, f * 120));
              lfoSmooth.frequency.setTargetAtTime(
                cutoff,
                ctx.currentTime,
                0.03
              );
            }
          } catch {}
        }
        if (waveChanged) {
          try {
            carrier.stop();
          } catch {}
          carrier.disconnect();
          carrier = ctx.createOscillator();
          carrier.type = layer.wave || "sine";
          carrier.frequency.value = Math.max(1, layer.baseFreq || 200);
          if (!gate) gate = ctx.createGain();
          if (!stereo) stereo = ctx.createStereoPanner();
          if (!gain) gain = ctx.createGain();
          if (!analyserNode) analyserNode = ctx.createAnalyser();
          gate.gain.value = 0.5;
          gain.gain.value = layer.volume;
          stereo.pan.value = layer.pan || 0;
          analyserNode.fftSize = 2048;
          const bus = getMasterBus(ctx);
          // Recreate effect chain nodes to maintain routing through effects
          const effectsInput = ctx.createGain();
          const effectsOutput = ctx.createGain();
          effectsInput.gain.value = 1;
          effectsOutput.gain.value = 1;
          effectChainInput = effectsInput;
          effectChainOutput = effectsOutput;
          // Connect LFO scaler to gate gain
          try {
            lfoSmooth && gate && lfoSmooth.connect(gate.gain);
          } catch {}
          carrier
            .connect(gate)
            .connect(stereo)
            .connect(gain)
            .connect(effectsInput);
          effectsInput.connect(effectsOutput);
          effectsOutput.connect(analyserNode);
          effectChainDownstream = analyserNode;
          analyserNode.connect(bus.input);
          if (playing) {
            try {
              carrier.start();
            } catch {}
          }
        }
      }
      if ((l as any).effects !== undefined) {
        (layer as any).effects = (l as any).effects;
        reconcileEffects((l as any).effects as LayerEffect[]);
      }
    },
    dispose: () => {
      if (osc) {
        try {
          osc.dispose?.();
          volNode?.dispose?.();
        } catch {}
      }
      if (carrier) {
        try {
          carrier.disconnect();
        } catch {}
      }
      try {
        lfo?.stop();
      } catch {}
      try {
        lfo?.disconnect();
      } catch {}
      try {
        lfoScale?.disconnect();
      } catch {}
      try {
        lfoSmooth?.disconnect();
      } catch {}
      try {
        lfoScale?.disconnect();
      } catch {}
      for (const h of noiseHandles.values()) {
        try {
          h.disconnect();
        } catch {}
        try {
          h.dispose();
        } catch {}
      }
      for (const h of autopanHandles.values()) {
        try {
          (h as any).dispose?.();
        } catch {}
      }
      for (const h of ringmodHandles.values()) {
        try {
          (h as any).dispose?.();
        } catch {}
      }
      for (const h of tremoloHandles.values()) {
        try {
          (h as any).dispose?.();
        } catch {}
      }
      for (const h of chorusHandles.values()) {
        try {
          (h as any).dispose?.();
        } catch {}
      }
      for (const h of flangerHandles.values()) {
        try {
          (h as any).dispose?.();
        } catch {}
      }
      for (const h of phaserHandles.values()) {
        try {
          (h as any).dispose?.();
        } catch {}
      }
      for (const h of pingpongHandles.values()) {
        try {
          (h as any).dispose?.();
        } catch {}
      }
      for (const h of combfilterHandles.values()) {
        try {
          (h as any).dispose?.();
        } catch {}
      }
      for (const h of acidfilterHandles.values()) {
        try {
          (h as any).dispose?.();
        } catch {}
      }
      for (const h of gateFxHandles.values()) {
        try {
          (h as any).dispose?.();
        } catch {}
      }
      for (const h of harmonicexciterHandles.values()) {
        try {
          (h as any).dispose?.();
        } catch {}
      }
      for (const h of reverbHandles.values()) {
        try {
          (h as any).dispose?.();
        } catch {}
      }
      for (const h of multibandHandles.values()) {
        try {
          (h as any).dispose?.();
        } catch {}
      }
      try {
        effectChainInput?.disconnect();
      } catch {}
      try {
        effectChainOutput?.disconnect();
      } catch {}
      effectChainInput = null;
      effectChainOutput = null;
      effectChainDownstream = null;
      for (const id of automationTimers.values()) {
        try {
          clearInterval(id);
        } catch {}
      }
      automationTimers.clear();
      noiseHandles.clear();
      autopanHandles.clear();
      ringmodHandles.clear();
      tremoloHandles.clear();
      chorusHandles.clear();
      flangerHandles.clear();
      phaserHandles.clear();
      pingpongHandles.clear();
      combfilterHandles.clear();
      acidfilterHandles.clear();
      gateFxHandles.clear();
      harmonicexciterHandles.clear();
      reverbHandles.clear();
      multibandHandles.clear();
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
