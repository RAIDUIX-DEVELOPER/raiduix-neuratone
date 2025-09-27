// Central shared audio layer types to avoid circular imports and duplication.
import type { NoiseType } from "@/lib/effects";

export type LayerType = "binaural" | "isochronic" | "ambient";

export interface BaseEffect {
  id: string;
}
export interface NoiseEffect extends BaseEffect {
  kind: "noise";
  type: NoiseType;
  gain: number;
  pan: number;
  lpfHz?: number;
  autopanHz?: number;
  autopanDepth?: number;
}
export interface ParamAutomationEffect extends BaseEffect {
  kind: "automation";
  target: "beatOffset" | "pulseFreq" | "volume" | "pan";
  from: number;
  to: number;
  durationSec: number;
}
export interface AutoPanEffect extends BaseEffect {
  kind: "autopan";
  rate: number;
  depth: number;
}
export interface RingModEffect extends BaseEffect {
  kind: "ringmod";
  frequency: number;
  intensity: number;
}
export interface TremoloEffect extends BaseEffect {
  kind: "tremolo";
  rate?: number;
  depth?: number;
}
export interface ChorusEffect extends BaseEffect {
  kind: "chorus";
  rate?: number;
  depth?: number;
  mix?: number;
  feedback?: number;
  stereoWidth?: number;
  damping?: number;
}
export interface FlangerEffect extends BaseEffect {
  kind: "flanger";
  rate?: number;
  depth?: number;
  feedback?: number;
  mix?: number;
}
export interface PhaserEffect extends BaseEffect {
  kind: "phaser";
  rate?: number;
  depth?: number;
  feedback?: number;
  stages?: number;
}
export interface PingPongEffect extends BaseEffect {
  kind: "pingpong";
  delayTime: number;
  feedback: number;
  mix: number;
}
export interface CombFilterEffect extends BaseEffect {
  kind: "combfilter";
  delayTime: number;
  resonance: number;
  mix: number;
}
export interface AcidFilterEffect extends BaseEffect {
  kind: "acidfilter";
  cutoff: number;
  resonance: number;
  rate: number;
  envelope: number;
}
export interface GateEffect extends BaseEffect {
  kind: "gate";
  rate: number;
  depth: number;
  attack: number;
  release: number;
}
export interface HarmonicExciterEffect extends BaseEffect {
  kind: "harmonicexciter";
  drive: number;
  frequency: number;
  mix: number;
}

// Additional effects used by the UI; parameters kept minimal for typing
export interface ReverbEffect extends BaseEffect {
  kind: "reverb";
  roomSize?: number;
  damping?: number;
  diffusion?: number;
  density?: number;
  predelay?: number;
  width?: number;
  mix?: number;
  modulation?: number;
}

export interface MultiBandCompressorEffect extends BaseEffect {
  kind: "multibandcompressor";
  crossoverLow?: number;
  crossoverHigh?: number;
  mix?: number;
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
  beatOffset?: number; // binaural beat difference Hz
  pulseFreq?: number; // isochronic pulse frequency
  wave?: OscillatorType;
  volume: number;
  pan?: number;
  effects?: LayerEffect[];
  // UI/transient flags
  isPlaying?: boolean;
  // Ambient-specific key for selecting source
  ambientKey?: string;
}

export interface EngineHandle {
  start(): Promise<void> | void;
  stop(): void;
  update(layer: Partial<SoundLayer>): void;
  dispose(): void;
  getAnalyser?(): AnalyserNode | null;
  getWaveformData?(arr: Uint8Array): void;
  getFrequencyData?(arr: Uint8Array): void;
}
