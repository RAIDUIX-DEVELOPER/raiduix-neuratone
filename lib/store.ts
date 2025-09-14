"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  SoundLayer,
  type LayerEffect,
  type LayerEffectKind,
} from "./audioEngine";

export interface Preset {
  id: string;
  name: string;
  layers: SoundLayer[];
}

interface AppState {
  layers: SoundLayer[];
  presets: Preset[];
  lastPresetId: string | null;
  addLayer: (l?: Partial<Omit<SoundLayer, "id" | "isPlaying">>) => void;
  updateLayer: (id: string, patch: Partial<SoundLayer>) => void;
  removeLayer: (id: string) => void;
  addLayerEffect: (id: string, effect: LayerEffect) => void;
  removeLayerEffect: (id: string, effectId: string) => void;
  savePreset: (name: string) => void;
  loadPreset: (id: string) => void;
  deletePreset: (id: string) => void;
  resetLayer: (id: string) => void;
  resetAllLayers: () => void;
  updatePreset: (id: string, name: string) => void;
  clearLayers: () => void;
  setLastPresetId: (id: string | null) => void;
  // UI state (not persisted)
  routeLoading: boolean;
  setRouteLoading: (v: boolean) => void;
  appReady: boolean;
  setAppReady: (v: boolean) => void;
}

// Seeded default presets available on first run.
// Frequency choices are informed by common practice and popular summaries:
// - Delta (1–4 Hz) often used for deep sleep/relaxation
// - Theta (4–8 Hz) and Alpha (8–13 Hz) linked with calm/relaxation
// - Beta (14–30 Hz) linked with focus/alertness; 40 Hz gamma sometimes explored
// Sources (non-medical, informational):
// - Healthline (2024-08-28): https://www.healthline.com/health/binaural-beats
// - Wikipedia (accessed 2025-09): https://en.wikipedia.org/wiki/Binaural_beats
// Note: Research is mixed; these presets are gentle defaults, not medical advice.
const defaultPresets: Preset[] = [
  {
    id: "preset-sleep",
    name: "Sleep",
    layers: [
      // Delta ~3 Hz binaural across a couple carriers
      {
        id: "sleep-b1",
        type: "binaural",
        baseFreq: 200,
        beatOffset: 3,
        volume: 0.42,
        pan: 0,
        wave: "sine",
        isPlaying: false,
      },
      {
        id: "sleep-b2",
        type: "binaural",
        baseFreq: 140,
        beatOffset: 3,
        volume: 0.34,
        pan: 0,
        wave: "sine",
        isPlaying: false,
      },
      // Gentle isochronic pulse at ~3 Hz, low level
      {
        id: "sleep-i1",
        type: "isochronic",
        baseFreq: 110,
        pulseFreq: 3,
        volume: 0.18,
        pan: 0,
        wave: "sine",
        isPlaying: false,
      },
    ],
  },
  {
    id: "preset-calm",
    name: "Calm",
    layers: [
      // Theta ~6 Hz binaural
      {
        id: "calm-b1",
        type: "binaural",
        baseFreq: 200,
        beatOffset: 6,
        volume: 0.4,
        pan: 0,
        wave: "sine",
        isPlaying: false,
      },
      {
        id: "calm-b2",
        type: "binaural",
        baseFreq: 220,
        beatOffset: 6,
        volume: 0.3,
        pan: 0,
        wave: "sine",
        isPlaying: false,
      },
      // Optional isochronic support at 6 Hz
      {
        id: "calm-i1",
        type: "isochronic",
        baseFreq: 130,
        pulseFreq: 6,
        volume: 0.16,
        pan: 0,
        wave: "sine",
        isPlaying: false,
      },
    ],
  },
  {
    id: "preset-focus",
    name: "Focus",
    layers: [
      // Beta ~14 Hz binaural
      {
        id: "focus-b1",
        type: "binaural",
        baseFreq: 200,
        beatOffset: 14,
        volume: 0.42,
        pan: 0,
        wave: "sine",
        isPlaying: false,
      },
      {
        id: "focus-b2",
        type: "binaural",
        baseFreq: 240,
        beatOffset: 14,
        volume: 0.3,
        pan: 0,
        wave: "sine",
        isPlaying: false,
      },
      // Low-level isochronic pulse in low beta range ~18 Hz
      {
        id: "focus-i1",
        type: "isochronic",
        baseFreq: 180,
        pulseFreq: 18,
        volume: 0.14,
        pan: 0,
        wave: "sine",
        isPlaying: false,
      },
    ],
  },
];

export const useAppStore = create<AppState>()(
  persist<AppState>(
    (set, get) => ({
      // UI state
      routeLoading: false,
      setRouteLoading: (v) => set({ routeLoading: v }),
      appReady: false,
      setAppReady: (v) => set({ appReady: v }),
      lastPresetId: null,
      setLastPresetId: (id) => set({ lastPresetId: id }),
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
          effects: [],
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
          effects: [],
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
          effects: [],
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
          effects: [],
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
          effects: [],
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
            effects: [],
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
      addLayerEffect: (id, effect) =>
        set((state) => ({
          ...state,
          layers: state.layers.map((l) =>
            l.id === id ? { ...l, effects: [...(l.effects || []), effect] } : l
          ),
        })),
      removeLayerEffect: (id, effectId) =>
        set((state) => ({
          ...state,
          layers: state.layers.map((l) =>
            l.id === id
              ? {
                  ...l,
                  effects: (l.effects || []).filter((e) => e.id !== effectId),
                }
              : l
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
                  effects: [],
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
            effects: [],
          })),
        })),
      deletePreset: (id) =>
        set((state) => ({
          ...state,
          presets: state.presets.filter((p) => p.id !== id),
          lastPresetId: state.lastPresetId === id ? null : state.lastPresetId,
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
        // If no presets were ever saved (fresh store), keep seeded defaults and add/overwrite by name
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
            lastPresetId: existing.id,
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
            lastPresetId: newPreset.id,
          }));
        }
      },
      loadPreset: (id) => {
        // On first run make sure seeded defaults are present
        if (get().presets.length === 0) {
          set((state) => ({ ...state, presets: defaultPresets }));
        }
        const p = get().presets.find((p) => p.id === id);
        if (p) {
          set((state) => ({
            ...state,
            layers: p.layers.map((l) => ({
              ...l,
              id: crypto.randomUUID(),
              isPlaying: false,
            })),
            lastPresetId: id,
          }));
        }
      },
    }),
    {
      name: "neuratone-store",
      // Only persist data, not ephemeral UI flags
      partialize: (state) =>
        ({
          layers: state.layers,
          presets: state.presets,
          lastPresetId: state.lastPresetId,
        } as unknown as AppState),
    }
  )
);

// Convenience helpers (non-stateful) for preset lookup
export function getPresetByNameOrId(key: string): Preset | undefined {
  const st = useAppStore.getState();
  const byId = st.presets.find((p) => p.id === key);
  if (byId) return byId;
  const decoded = key.toLowerCase();
  return st.presets.find((p) => p.name.toLowerCase() === decoded);
}
