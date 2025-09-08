"use client";
import { Howl } from "howler";

export type LayerType = "binaural" | "isochronic" | "ambient";
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
  let analyserNode: AnalyserNode | null = null;
  async function ensure() {
    if (!tone) {
      tone = await loadTone();
      if (tone?.Oscillator && tone?.Merge) {
        left = new tone.Oscillator(layer.baseFreq || 200, layer.wave || "sine");
        right = new tone.Oscillator(
          (layer.baseFreq || 200) + (layer.beatOffset || 0),
          layer.wave || "sine"
        );
        leftGainTone = new tone.Gain(1);
        rightGainTone = new tone.Gain(1);
        merger = new tone.Merge();
        volNode = new tone.Volume(tone.gainToDb(layer.volume));
        // connect path
        left.connect(leftGainTone).connect(merger, 0, 0);
        right.connect(rightGainTone).connect(merger, 0, 1);
        analyserToneFft = new tone.Analyser("fft", 1024);
        analyserToneWave = new tone.Analyser("waveform", 1024);
        merger.chain(
          volNode,
          analyserToneFft,
          tone.Destination || tone.getDestination?.()
        );
        volNode.connect?.(analyserToneWave); // tap waveform
        const applyPan = (p: number) => {
          const lp = p > 0 ? 1 - p : 1;
          const rp = p < 0 ? 1 + p : 1;
          leftGainTone.gain.value = lp;
          rightGainTone.gain.value = rp;
        };
        applyPan(layer.pan || 0);
        return;
      }
    }
    // Tone already loaded but oscillators disposed previously
    if (tone?.Oscillator && tone?.Merge && !left) {
      left = new tone.Oscillator(layer.baseFreq || 200, layer.wave || "sine");
      right = new tone.Oscillator(
        (layer.baseFreq || 200) + (layer.beatOffset || 0),
        layer.wave || "sine"
      );
      leftGainTone = new tone.Gain(1);
      rightGainTone = new tone.Gain(1);
      merger = new tone.Merge();
      volNode = new tone.Volume(tone.gainToDb(layer.volume));
      left.connect(leftGainTone).connect(merger, 0, 0);
      right.connect(rightGainTone).connect(merger, 0, 1);
      analyserToneFft = new tone.Analyser("fft", 1024);
      analyserToneWave = new tone.Analyser("waveform", 1024);
      merger.chain(
        volNode,
        analyserToneFft,
        tone.Destination || tone.getDestination?.()
      );
      volNode.connect?.(analyserToneWave);
      const applyPan = (p: number) => {
        const lp = p > 0 ? 1 - p : 1;
        const rp = p < 0 ? 1 + p : 1;
        leftGainTone.gain.value = lp;
        rightGainTone.gain.value = rp;
      };
      applyPan(layer.pan || 0);
      return;
    }
    if (!lOsc && ctx) {
      lOsc = ctx.createOscillator();
      rOsc = ctx.createOscillator();
      lOsc.type = layer.wave || "sine";
      rOsc.type = layer.wave || "sine";
      lOsc.frequency.value = layer.baseFreq || 200;
      rOsc.frequency.value = (layer.baseFreq || 200) + (layer.beatOffset || 0);
      leftGain = ctx.createGain();
      rightGain = ctx.createGain();
      leftGain.gain.value = 1;
      rightGain.gain.value = 1;
      gain = ctx.createGain();
      gain.gain.value = layer.volume;
      mergerNode = ctx.createChannelMerger(2);
      // connect with independent channel gains for proper binaural separation
      lOsc.connect(leftGain).connect(mergerNode, 0, 0);
      rOsc.connect(rightGain).connect(mergerNode, 0, 1);
      analyserNode = ctx.createAnalyser();
      analyserNode.fftSize = 2048;
      mergerNode.connect(gain).connect(analyserNode).connect(ctx.destination);
      const applyPan = (p: number) => {
        const lp = p > 0 ? 1 - p : 1;
        const rp = p < 0 ? 1 + p : 1;
        if (leftGain) leftGain.gain.value = lp;
        if (rightGain) rightGain.gain.value = rp;
      };
      applyPan(layer.pan || 0);
    }
  }
  return {
    start: async () => {
      await ensure();
      if (playing) return;
      if (left && right) {
        await tone.start?.();
        left.start();
        right.start();
        playing = true;
      } else if (lOsc && rOsc && ctx) {
        ctx.resume();
        try {
          lOsc.start();
          rOsc.start();
        } catch (e) {
          // if already started recreate oscillators
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
      }
    },
    stop: () => {
      if (!playing) return;
      if (left && right) {
        left.stop();
        right.stop();
      } else if (lOsc && rOsc) {
        lOsc.stop();
        rOsc.stop();
        // mark for recreation next start
        lOsc = null;
        rOsc = null;
      }
      playing = false;
    },
    update: (l) => {
      // Persist intended values
      if (l.baseFreq !== undefined) layer.baseFreq = l.baseFreq;
      if (l.beatOffset !== undefined) layer.beatOffset = l.beatOffset;
      if (l.volume !== undefined) layer.volume = l.volume;
      if (l.pan !== undefined) layer.pan = l.pan;
      const waveChanged = l.wave !== undefined && l.wave !== layer.wave;
      if (l.wave !== undefined) layer.wave = l.wave;
      const applyPanVal = (p: number) => {
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
      // Tone path
      if (left && right) {
        if (l.baseFreq !== undefined) {
          left.frequency.value = layer.baseFreq || 200;
          right.frequency.value =
            (layer.baseFreq || 200) + (layer.beatOffset || 0);
        }
        if (l.beatOffset !== undefined) {
          right.frequency.value =
            (layer.baseFreq || 200) + (layer.beatOffset || 0);
        }
        if (l.volume !== undefined && volNode) {
          volNode.volume.value = tone.gainToDb(layer.volume);
        }
        if (l.pan !== undefined) applyPanVal(layer.pan || 0);
        if (waveChanged) {
          try {
            left.stop();
            right.stop();
          } catch {}
          try {
            left.dispose?.();
            right.dispose?.();
          } catch {}
          left = new tone.Oscillator(
            layer.baseFreq || 200,
            layer.wave || "sine"
          );
          right = new tone.Oscillator(
            (layer.baseFreq || 200) + (layer.beatOffset || 0),
            layer.wave || "sine"
          );
          left.connect(leftGainTone).connect(merger, 0, 0);
          right.connect(rightGainTone).connect(merger, 0, 1);
          if (playing) {
            try {
              left.start();
              right.start();
            } catch {}
          }
        }
        return;
      }
      // Web Audio path
      if (lOsc && rOsc) {
        if (l.baseFreq !== undefined) {
          lOsc.frequency.value = layer.baseFreq || 200;
          rOsc.frequency.value =
            (layer.baseFreq || 200) + (layer.beatOffset || 0);
        }
        if (l.beatOffset !== undefined) {
          rOsc.frequency.value =
            (layer.baseFreq || 200) + (layer.beatOffset || 0);
        }
        if (l.volume !== undefined && gain) gain.gain.value = layer.volume;
        if (l.pan !== undefined) applyPanVal(layer.pan || 0);
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
          lOsc.frequency.value = layer.baseFreq || 200;
          rOsc.frequency.value =
            (layer.baseFreq || 200) + (layer.beatOffset || 0);
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
          if (!analyserNode) {
            analyserNode = ctx.createAnalyser();
            analyserNode.fftSize = 2048;
          }
          mergerNode
            .connect(gain)
            .connect(analyserNode)
            .connect(ctx.destination);
          if (playing) {
            try {
              lOsc.start();
              rOsc.start();
            } catch {}
          }
        }
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
    },
    getAnalyser: () => analyserNode || null,
    getWaveformData: (arr) => {
      if (analyserNode) {
        if (arr.length !== analyserNode.fftSize) {
          // time domain size is fftSize
        }
        (analyserNode as any).getByteTimeDomainData(arr as any);
        return;
      }
      if (analyserToneWave) {
        const vals = analyserToneWave.getValue(); // Float32Array -1..1
        const len = Math.min(arr.length, vals.length);
        for (let i = 0; i < len; i++) {
          const v = (vals[i] + 1) * 0.5; // 0..1
          arr[i] = Math.max(0, Math.min(255, Math.floor(v * 255)));
        }
        return;
      }
    },
    getFrequencyData: (arr) => {
      if (analyserNode) {
        (analyserNode as any).getByteFrequencyData(arr as any);
        return;
      }
      if (analyserToneFft) {
        const vals = analyserToneFft.getValue(); // Float32Array (dB)
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
  async function ensure() {
    if (!tone) {
      tone = await loadTone();
      if (tone?.Oscillator && tone?.AmplitudeEnvelope) {
        // Tone-based: oscillator frequency is the carrier (baseFreq)
        osc = new tone.Oscillator(layer.baseFreq || 200, layer.wave || "sine");
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
      carrier.frequency.value = layer.baseFreq || 200;
      gate = ctx.createGain();
      gate.gain.value = 0;
      gain = ctx.createGain();
      gain.gain.value = layer.volume;
      stereo = ctx.createStereoPanner();
      stereo.pan.value = layer.pan || 0;
      analyserNode = ctx.createAnalyser();
      analyserNode.fftSize = 2048;
      carrier
        .connect(gate)
        .connect(stereo)
        .connect(gain)
        .connect(analyserNode)
        .connect(ctx.destination);
    }
  }
  return {
    start: async () => {
      await ensure();
      if (playing) return;
      if (osc) {
        await tone.start?.();
        osc.start();
        playing = true;
        if (interval === null) {
          interval = window.setInterval(
            () => env.triggerAttackRelease(0.1),
            1000 / Math.max(1, layer.pulseFreq || 10)
          );
        }
      } else if (carrier && gate && ctx) {
        ctx.resume();
        carrier.start();
        playing = true;
        if (interval === null) {
          interval = window.setInterval(() => {
            gate!.gain.setValueAtTime(1, ctx.currentTime);
            gate!.gain.exponentialRampToValueAtTime(
              0.0001,
              ctx.currentTime + 0.05
            );
          }, 1000 / Math.max(1, layer.pulseFreq || 10));
        }
      }
    },
    stop: () => {
      if (!playing) return;
      if (osc) {
        osc.stop();
      }
      if (carrier) {
        carrier.stop();
        carrier.disconnect();
        carrier = null;
      }
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
      playing = false;
    },
    update: (l) => {
      // Persist values regardless of play state
      if (l.pulseFreq !== undefined) layer.pulseFreq = l.pulseFreq;
      if (l.baseFreq !== undefined) layer.baseFreq = l.baseFreq;
      if (l.volume !== undefined) layer.volume = l.volume;
      if (l.pan !== undefined) layer.pan = l.pan;
      const waveChanged = l.wave !== undefined && l.wave !== layer.wave;
      if (l.wave !== undefined) layer.wave = l.wave;
      if (osc) {
        if (l.baseFreq !== undefined) {
          osc.frequency.value = layer.baseFreq || osc.frequency.value;
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
        return;
      }
      if (carrier && gate) {
        if (l.baseFreq !== undefined && carrier) {
          carrier.frequency.value = layer.baseFreq || carrier.frequency.value;
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
          carrier.frequency.value = layer.baseFreq || 200;
          // Reconnect chain
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
