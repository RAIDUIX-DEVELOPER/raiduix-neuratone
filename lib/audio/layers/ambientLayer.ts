import { Howl } from "howler";
import type { SoundLayer, EngineHandle } from "@/lib/audio/types";

// Ambient source map retained; consider moving to config later.
const ambientSources: Record<string, string> = {
  rain: "https://cdn.jsdelivr.net/gh/anars/blank-audio/0.5-second-of-silence.mp3",
  white:
    "https://cdn.jsdelivr.net/gh/anars/blank-audio/1-second-of-silence.mp3",
};

// Ambient layer uses an extra 'ambientKey' not present on generic SoundLayer; we cast to extend at runtime.
type AmbientLayer = SoundLayer & { ambientKey?: string };
export function createAmbientLayer(layer: AmbientLayer): EngineHandle {
  let howl: Howl | null = null;
  let nextHowl: Howl | null = null;
  let currentId: number | null = null;
  let nextId: number | null = null;
  const FADE_IN_MS = 200;
  const FADE_OUT_MS = 120;

  function clamp01(v: number) {
    return Math.min(1, Math.max(0, v));
  }

  function getVolume(h: Howl, id?: number | null): number {
    try {
      if (id != null) {
        const v = (h as any).volume(id);
        return typeof v === "number" ? v : h.volume();
      }
      return h.volume();
    } catch {
      return h.volume();
    }
  }

  function ensure() {
    if (!howl) {
      howl = new Howl({
        src: [ambientSources[layer.ambientKey || "rain"]],
        loop: true,
        volume: 0,
      });
      currentId = howl.play();
      howl.stereo(layer.pan || 0, currentId!);
      // Smooth fade-in to target volume
      howl.fade(0, clamp01(layer.volume ?? 1), FADE_IN_MS, currentId!);
    }
  }
  return {
    start: async () => {
      ensure();
    },
    stop: () => {
      if (howl && currentId != null) {
        const h = howl;
        const id = currentId;
        const from = getVolume(h, id);
        h.fade(from, 0, FADE_OUT_MS, id);
        setTimeout(() => {
          try {
            h.stop(id);
          } catch {}
        }, FADE_OUT_MS + 20);
      }
    },
    update: (l: Partial<AmbientLayer>) => {
      if (typeof l.volume === "number") layer.volume = clamp01(l.volume);
      if (typeof l.pan === "number")
        layer.pan = Math.min(1, Math.max(-1, l.pan));
      if (l.ambientKey) layer.ambientKey = l.ambientKey;
      if (!howl) {
        // Nothing active, just ensure on demand
        if (l.ambientKey || l.volume !== undefined || l.pan !== undefined)
          ensure();
        return;
      }
      // Live param updates
      if (l.volume !== undefined && currentId != null) {
        const h = howl;
        const id = currentId;
        const from = getVolume(h, id);
        const to = clamp01(layer.volume);
        if (Math.abs(from - to) > 0.01) h.fade(from, to, 100, id);
        else h.volume(to, id);
      }
      if (l.pan !== undefined && currentId != null)
        howl.stereo(layer.pan || 0, currentId);
      // Crossfade on source change
      if (l.ambientKey) {
        const src = ambientSources[l.ambientKey] || ambientSources["rain"];
        nextHowl = new Howl({ src: [src], loop: true, volume: 0 });
        nextId = nextHowl.play();
        nextHowl.stereo(layer.pan || 0, nextId!);
        nextHowl.fade(0, clamp01(layer.volume ?? 1), FADE_IN_MS, nextId!);
        if (howl && currentId != null) {
          const old = howl;
          const oldId = currentId;
          const from = getVolume(old, oldId);
          old.fade(from, 0, FADE_OUT_MS, oldId);
          setTimeout(() => {
            try {
              old.stop(oldId);
            } catch {}
            try {
              old.unload();
            } catch {}
          }, FADE_OUT_MS + 30);
        }
        // Promote next to current
        howl = nextHowl;
        currentId = nextId;
        nextHowl = null;
        nextId = null;
      }
    },
    dispose: () => {
      try {
        if (howl && currentId != null) howl.stop(currentId);
      } catch {}
      try {
        howl?.unload();
      } catch {}
      howl = null;
      currentId = null;
      if (nextHowl && nextId != null) {
        try {
          nextHowl.stop(nextId);
        } catch {}
        try {
          nextHowl.unload();
        } catch {}
      }
      nextHowl = null;
      nextId = null;
    },
    getAnalyser: () => null,
    getWaveformData: () => {},
    getFrequencyData: () => {},
  };
}
