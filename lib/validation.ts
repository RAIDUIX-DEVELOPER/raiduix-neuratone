// Central numeric validation & clamping utilities for audio layer parameters.

export interface NormalizedLayerParams {
  baseFreq?: number;
  beatOffset?: number;
  pulseFreq?: number;
  volume?: number;
  pan?: number;
}

// Ranges chosen based on UI + safe Web Audio practices
const RANGES = {
  baseFreq: { min: 1, max: 5000 },
  beatOffset: { min: 0, max: 1000 },
  pulseFreq: { min: 0.5, max: 1000 },
  volume: { min: 0, max: 1 },
  pan: { min: -1, max: 1 },
};

function clamp(v: number | undefined, min: number, max: number) {
  if (typeof v !== "number" || Number.isNaN(v)) return undefined;
  return Math.min(max, Math.max(min, v));
}

export function normalizeLayerPatch(patch: Partial<NormalizedLayerParams>) {
  const out: Partial<NormalizedLayerParams> = {};
  if ("baseFreq" in patch)
    out.baseFreq = clamp(
      patch.baseFreq,
      RANGES.baseFreq.min,
      RANGES.baseFreq.max
    );
  if ("beatOffset" in patch)
    out.beatOffset = clamp(
      patch.beatOffset,
      RANGES.beatOffset.min,
      RANGES.beatOffset.max
    );
  if ("pulseFreq" in patch)
    out.pulseFreq = clamp(
      patch.pulseFreq,
      RANGES.pulseFreq.min,
      RANGES.pulseFreq.max
    );
  if ("volume" in patch)
    out.volume = clamp(patch.volume, RANGES.volume.min, RANGES.volume.max);
  if ("pan" in patch)
    out.pan = clamp(patch.pan, RANGES.pan.min, RANGES.pan.max);
  return out;
}

export function withDefaults(layer: any) {
  // Provide defaults if missing after normalization.
  if (typeof layer.baseFreq !== "number") layer.baseFreq = 440;
  if (layer.type === "binaural" && typeof layer.beatOffset !== "number")
    layer.beatOffset = 0;
  if (layer.type === "isochronic" && typeof layer.pulseFreq !== "number")
    layer.pulseFreq = 10;
  if (typeof layer.volume !== "number") layer.volume = 0.5;
  if (typeof layer.pan !== "number") layer.pan = 0;
  return layer;
}
