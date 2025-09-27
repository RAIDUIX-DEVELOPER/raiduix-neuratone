"use client";
import { createAmbientLayer } from "@/lib/audio/layers/ambientLayer";
import { createBinauralLayer } from "@/lib/audio/layers/binauralLayer";
import { createIsochronicLayer } from "@/lib/audio/layers/isochronicLayer";
import type { SoundLayer, EngineHandle } from "@/lib/audio/types";

// Thin delegating factory for modular layers
export function createIsochronic(layer: SoundLayer): EngineHandle {
  return createIsochronicLayer(layer);
}

// Delegated to modular implementation in lib/audio/layers/ambientLayer.ts
export function createAmbient(layer: SoundLayer): EngineHandle {
  return createAmbientLayer(layer);
}

export function createEngine(layer: SoundLayer): EngineHandle {
  switch (layer.type) {
    case "binaural":
      return createBinauralLayer(layer);
    case "isochronic":
      return createIsochronic(layer);
    case "ambient":
      // Delegated ambient implementation (modular)
      return createAmbient(layer);
  }
  throw new Error("Unknown layer type");
}
