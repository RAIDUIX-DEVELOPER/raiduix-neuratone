"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { SoundLayer } from "./audioEngine";

export interface Preset {
  id: string;
  name: string;
  layers: SoundLayer[];
}

interface AppState {
  layers: SoundLayer[];
  presets: Preset[];
  addLayer: (l?: Partial<Omit<SoundLayer, "id" | "isPlaying">>) => void;
  updateLayer: (id: string, patch: Partial<SoundLayer>) => void;
  removeLayer: (id: string) => void;
  savePreset: (name: string) => void;
  loadPreset: (id: string) => void;
  deletePreset: (id: string) => void;
  resetLayer: (id: string) => void;
  resetAllLayers: () => void;
  updatePreset: (id: string, name: string) => void;
  clearLayers: () => void;
}

// Start with no default presets; user-defined only.
const defaultPresets: Preset[] = [];

export const useAppStore = create<AppState>()(
  persist<AppState>(
    (set, get) => ({
      layers: [
        {
          id: "l1",
          type: "binaural",
          baseFreq: 432,
          beatOffset: 0,
          volume: 0.6,
          pan: 0,
          wave: "sine",
          isPlaying: false,
        },
        {
          id: "l2",
          type: "binaural",
          baseFreq: 528,
          beatOffset: 0,
          volume: 0.5,
          pan: 0,
          wave: "sine",
          isPlaying: false,
        },
        {
          id: "l3",
          type: "binaural",
          baseFreq: 639,
          beatOffset: 0,
          volume: 0.5,
          pan: 0,
          wave: "sine",
          isPlaying: false,
        },
        {
          id: "l4",
          type: "binaural",
          baseFreq: 741,
          beatOffset: 0,
          volume: 0.5,
          pan: 0,
          wave: "sine",
          isPlaying: false,
        },
        {
          id: "l5",
          type: "binaural",
          baseFreq: 852,
          beatOffset: 0,
          volume: 0.5,
          pan: 0,
          wave: "sine",
          isPlaying: false,
        },
      ],
      presets: defaultPresets,
      addLayer: (l = {}) =>
        set((state) => {
          if (state.layers.length >= 5) return state; // enforce cap
          const type = (l.type as any) || "binaural";
          const base: any = {
            id: crypto.randomUUID(),
            type,
            baseFreq: l.baseFreq ?? 440,
            beatOffset: l.beatOffset ?? 0,
            volume: l.volume ?? 0.5,
            pan: l.pan ?? 0,
            wave: l.wave ?? "sine",
            isPlaying: false,
          };
          if (type === "isochronic") {
            base.pulseFreq = l.pulseFreq ?? 10;
          } else if (type === "ambient") {
            base.ambientKey = l.ambientKey ?? "rain";
          }
          return {
            ...state,
            layers: [...state.layers, base],
          };
        }),
      removeLayer: (id) =>
        set((state) => ({
          ...state,
          layers: state.layers.filter((l) => l.id !== id),
        })),
      updateLayer: (id, patch) =>
        set((state) => ({
          ...state,
          layers: state.layers.map((l) =>
            l.id === id ? { ...l, ...patch } : l
          ),
        })),
      resetLayer: (id) =>
        set((state) => ({
          ...state,
          layers: state.layers.map((l) =>
            l.id === id
              ? {
                  ...l,
                  type: "binaural",
                  baseFreq: 440,
                  beatOffset: 0,
                  volume: 0.5,
                  pan: 0,
                  wave: "sine",
                  isPlaying: false,
                }
              : l
          ),
        })),
      resetAllLayers: () =>
        set((state) => ({
          ...state,
          layers: state.layers.map((l) => ({
            ...l,
            type: "binaural",
            baseFreq: 440,
            beatOffset: 0,
            volume: 0.5,
            pan: 0,
            wave: "sine",
            isPlaying: false,
          })),
        })),
      deletePreset: (id) =>
        set((state) => ({
          ...state,
          presets: state.presets.filter((p) => p.id !== id),
        })),
      updatePreset: (id, name) =>
        set((state) => {
          const exists = state.presets.find((p) => p.id === id);
          if (!exists) return state;
          const updated = {
            ...exists,
            name,
            layers: get().layers.map((l) => ({ ...l })),
          };
          return {
            ...state,
            presets: state.presets.map((p) => (p.id === id ? updated : p)),
          };
        }),
      clearLayers: () =>
        set((state) => ({
          ...state,
          layers: [],
        })),
      savePreset: (name) => {
        const existing = get().presets.find(
          (p) => p.name.toLowerCase() === name.toLowerCase()
        );
        if (existing) {
          // overwrite existing
          const updated: Preset = {
            ...existing,
            layers: get().layers.map((l) => ({ ...l })),
          };
          set((state) => ({
            ...state,
            presets: state.presets.map((p) =>
              p.id === existing.id ? updated : p
            ),
          }));
        } else {
          const newPreset: Preset = {
            id: crypto.randomUUID(),
            name,
            layers: get().layers.map((l) => ({ ...l })),
          };
          set((state) => ({
            ...state,
            presets: [...state.presets, newPreset],
          }));
        }
      },
      loadPreset: (id) => {
        const p = get().presets.find((p) => p.id === id);
        if (p) {
          set((state) => ({
            ...state,
            layers: p.layers.map((l) => ({
              ...l,
              id: crypto.randomUUID(),
              isPlaying: false,
            })),
          }));
        }
      },
    }),
    { name: "neuratone-store" }
  )
);
