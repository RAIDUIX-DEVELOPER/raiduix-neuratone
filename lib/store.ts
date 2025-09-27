"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { normalizeLayerPatch, withDefaults } from "./validation";
import type { SoundLayer, LayerEffect } from "@/lib/audio/types";

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
  // New Solfeggio‑inspired presets
  {
    id: "preset-solfeggio-528",
    name: "Solfeggio 528 — Gentle Bloom",
    layers: [
      {
        id: "solf528-b1",
        type: "binaural",
        baseFreq: 528,
        beatOffset: 8,
        volume: 0.5,
        pan: 0,
        wave: "sine",
        isPlaying: false,
        effects: [
          {
            id: "fx-528-noise",
            kind: "noise",
            type: "pink",
            gain: 0.12,
            pan: 0,
            lpfHz: 8000,
            autopanHz: 0.05,
            autopanDepth: 0.3,
          },
          {
            id: "fx-528-rev",
            kind: "reverb",
            roomSize: 45,
            damping: 30,
            diffusion: 65,
            density: 70,
            predelay: 15,
            width: 100,
            mix: 18,
            modulation: 10,
          },
          {
            id: "fx-528-autopan",
            kind: "autopan",
            rate: 0.12,
            depth: 0.5,
          },
        ],
      },
      {
        id: "solf528-i1",
        type: "isochronic",
        baseFreq: 180,
        pulseFreq: 8,
        volume: 0.16,
        pan: 0,
        wave: "sine",
        isPlaying: false,
        effects: [
          {
            id: "fx-528-phs",
            kind: "phaser",
            rate: 0.25,
            depth: 60,
            stages: 4,
            feedback: 10,
          },
        ],
      },
    ],
  },
  {
    id: "preset-solfeggio-396",
    name: "Solfeggio 396 — Deep Ground",
    layers: [
      {
        id: "solf396-b1",
        type: "binaural",
        baseFreq: 396,
        beatOffset: 3,
        volume: 0.42,
        pan: 0,
        wave: "sine",
        isPlaying: false,
        effects: [
          {
            id: "fx-396-noise",
            kind: "noise",
            type: "brown",
            gain: 0.12,
            pan: 0,
            lpfHz: 6000,
            autopanHz: 0.04,
            autopanDepth: 0.25,
          },
          {
            id: "fx-396-trem",
            kind: "tremolo",
            rate: 2,
            depth: 25,
          },
          {
            id: "fx-396-rev",
            kind: "reverb",
            roomSize: 40,
            damping: 25,
            diffusion: 60,
            density: 70,
            predelay: 10,
            width: 100,
            mix: 15,
            modulation: 8,
          },
        ],
      },
      {
        id: "solf396-i1",
        type: "isochronic",
        baseFreq: 132,
        pulseFreq: 3,
        volume: 0.12,
        pan: 0,
        wave: "sine",
        isPlaying: false,
      },
    ],
  },
  {
    id: "preset-solfeggio-639",
    name: "Solfeggio 639 — Heart Coherence",
    layers: [
      {
        id: "solf639-b1",
        type: "binaural",
        baseFreq: 639,
        beatOffset: 7,
        volume: 0.46,
        pan: 0,
        wave: "sine",
        isPlaying: false,
        effects: [
          {
            id: "fx-639-noise",
            kind: "noise",
            type: "pink",
            gain: 0.1,
            pan: 0,
            lpfHz: 9000,
            autopanHz: 0.06,
            autopanDepth: 0.35,
          },
          {
            id: "fx-639-chor",
            kind: "chorus",
            rate: 0.35,
            depth: 12,
            mix: 20,
            feedback: 0,
            stereoWidth: 80,
            damping: 0,
          },
          {
            id: "fx-639-rev",
            kind: "reverb",
            roomSize: 48,
            damping: 28,
            diffusion: 65,
            density: 75,
            predelay: 18,
            width: 100,
            mix: 20,
            modulation: 10,
          },
        ],
      },
    ],
  },
  {
    id: "preset-solfeggio-741",
    name: "Solfeggio 741 — Clear Focus",
    layers: [
      {
        id: "solf741-b1",
        type: "binaural",
        baseFreq: 741,
        beatOffset: 15,
        volume: 0.45,
        pan: 0,
        wave: "sine",
        isPlaying: false,
        effects: [
          {
            id: "fx-741-noise",
            kind: "noise",
            type: "white",
            gain: 0.06,
            pan: 0,
            lpfHz: 12000,
            autopanHz: 0.08,
            autopanDepth: 0.3,
          },
          {
            id: "fx-741-flg",
            kind: "flanger",
            rate: 0.25,
            depth: 10,
            feedback: 10,
            mix: 15,
          },
          {
            id: "fx-741-mb",
            kind: "multibandcompressor",
            crossoverLow: 200,
            crossoverHigh: 2000,
            mix: 70,
          },
        ],
      },
      {
        id: "solf741-i1",
        type: "isochronic",
        baseFreq: 185,
        pulseFreq: 18,
        volume: 0.12,
        pan: 0,
        wave: "sine",
        isPlaying: false,
      },
    ],
  },
  {
    id: "preset-solfeggio-852",
    name: "Solfeggio 852 — Awake Clarity",
    layers: [
      {
        id: "solf852-b1",
        type: "binaural",
        baseFreq: 852,
        beatOffset: 18,
        volume: 0.44,
        pan: 0,
        wave: "sine",
        isPlaying: false,
        effects: [
          {
            id: "fx-852-noise",
            kind: "noise",
            type: "pink",
            gain: 0.08,
            pan: 0,
            lpfHz: 11000,
            autopanHz: 0.1,
            autopanDepth: 0.35,
          },
          {
            id: "fx-852-phs",
            kind: "phaser",
            rate: 0.35,
            depth: 55,
            stages: 4,
            feedback: 12,
          },
          {
            id: "fx-852-exc",
            kind: "harmonicexciter",
            drive: 18,
            harmonics: 35,
            tone: 55,
            mix: 20,
          },
          {
            id: "fx-852-rev",
            kind: "reverb",
            roomSize: 42,
            damping: 26,
            diffusion: 60,
            density: 70,
            predelay: 12,
            width: 100,
            mix: 15,
            modulation: 8,
          },
        ],
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
      // Ensure default presets are present; if persisted store exists from an older version,
      // merge any missing defaults (including new Solfeggio set) so they show up in the library.
      presets: (() => {
        const existing =
          typeof window !== "undefined"
            ? (JSON.parse(localStorage.getItem("neuratone-store") || "{}")
                ?.state?.presets as Preset[] | undefined)
            : undefined;
        if (!Array.isArray(existing) || existing.length === 0)
          return defaultPresets;
        const byId = new Set(existing.map((p) => p.id));
        const merged = [...existing];
        for (const d of defaultPresets) {
          if (!byId.has(d.id)) merged.push(d);
        }
        return merged;
      })(),
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
          const normalized = withDefaults({
            ...base,
            ...normalizeLayerPatch(base),
          });
          return { ...state, layers: [...state.layers, normalized] };
        }),
      removeLayer: (id) =>
        set((state) => ({
          ...state,
          layers: state.layers.filter((l) => l.id !== id),
        })),
      updateLayer: (id, patch) =>
        set((state) => ({
          ...state,
          layers: state.layers.map((l) => {
            if (l.id !== id) return l;
            const normalized = normalizeLayerPatch(patch as any);
            return withDefaults({ ...l, ...patch, ...normalized });
          }),
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
                  effects: (l.effects || []).filter(
                    (e: LayerEffect) => e.id !== effectId
                  ),
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
        let p = get().presets.find((p) => p.id === id);
        // If not found (e.g., existing users with older persisted store), try to resolve
        if (!p) {
          const fallback = defaultPresets.find((dp) => dp.id === id);
          if (fallback) {
            set((state) => ({
              ...state,
              presets: [...state.presets, fallback],
            }));
            p = fallback;
          }
        }
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
      // Ensure that on rehydrate we keep persisted data but also union in any
      // new default presets introduced by newer versions.
      merge: (persistedState, currentState) => {
        const p = (persistedState as any) || {};
        const c = (currentState as any) || {};
        const persistedPresets: Preset[] = Array.isArray(p.presets)
          ? p.presets
          : [];
        const currentPresets: Preset[] = Array.isArray(c.presets)
          ? c.presets
          : defaultPresets;
        const persistedById = new Map<string, Preset>(
          persistedPresets.map((pr) => [pr.id, pr])
        );
        // Start from persisted and add any defaults not present
        const merged = [...persistedPresets];
        for (const dp of defaultPresets) {
          if (!persistedById.has(dp.id)) merged.push(dp);
        }
        return {
          ...c,
          ...p,
          presets: merged,
          lastPresetId: p.lastPresetId ?? c.lastPresetId ?? null,
        } as AppState;
      },
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
