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
          return {
            ...state,
            layers: [
              ...state.layers,
              {
                id: crypto.randomUUID(),
                type: (l.type as any) || "binaural",
                baseFreq: l.baseFreq ?? 440,
                beatOffset: l.beatOffset ?? 0,
                volume: l.volume ?? 0.5,
                pan: l.pan ?? 0,
                wave: l.wave ?? "sine",
                isPlaying: false,
              },
            ],
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
      deletePreset: (id) =>
        set((state) => ({
          ...state,
          presets: state.presets.filter((p) => p.id !== id),
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
