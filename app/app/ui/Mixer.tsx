"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Play, Square, Plus, Trash2, Pencil, ChevronDown } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { SoundLayer, createEngine } from "@/lib/audioEngine";

// Simple visualizers that read from the active engines
function Visualizers({
  getEngines,
  showWave,
  showSpec,
}: {
  getEngines: () => (any | null)[];
  showWave: boolean;
  showSpec: boolean;
}) {
  const waveRef = useRef<HTMLCanvasElement | null>(null);
  const specRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!showWave && !showSpec) return;
    let raf = 0;
    const waveCanvas = waveRef.current;
    const specCanvas = specRef.current;
    const wCtx = waveCanvas?.getContext("2d") || null;
    const sCtx = specCanvas?.getContext("2d") || null;

    const N = 1024;
    const tempWave = new Uint8Array(N);
    const mixWave = new Float32Array(N);
    const tempFreq = new Uint8Array(1024);
    const mixFreq = new Float32Array(1024);

    const draw = () => {
      const engines = getEngines().filter(Boolean) as any[];
      mixWave.fill(0);
      mixFreq.fill(0);
      let wc = 0,
        fc = 0;
      for (const e of engines) {
        if (e.getWaveformData) {
          e.getWaveformData(tempWave);
          for (let i = 0; i < N; i++) mixWave[i] += (tempWave[i] - 128) / 128;
          wc++;
        }
        if (e.getFrequencyData) {
          e.getFrequencyData(tempFreq);
          for (let i = 0; i < tempFreq.length; i++) mixFreq[i] += tempFreq[i];
          fc++;
        }
      }
      if (wc) for (let i = 0; i < N; i++) mixWave[i] /= wc;
      if (fc) for (let i = 0; i < mixFreq.length; i++) mixFreq[i] /= fc;

      if (showWave && wCtx && waveCanvas) {
        wCtx.clearRect(0, 0, waveCanvas.width, waveCanvas.height);
        wCtx.lineWidth = 2;
        wCtx.strokeStyle = "#14b8a6";
        wCtx.beginPath();
        for (let i = 0; i < N; i++) {
          const x = (i / (N - 1)) * waveCanvas.width;
          const v = mixWave[i];
          const y = waveCanvas.height / 2 + v * (waveCanvas.height / 2 - 4);
          i === 0 ? wCtx.moveTo(x, y) : wCtx.lineTo(x, y);
        }
        wCtx.stroke();
      }
      if (showSpec && sCtx && specCanvas) {
        const h = specCanvas.height;
        const w = specCanvas.width;
        const imageData = sCtx.getImageData(1, 0, w - 1, h);
        sCtx.putImageData(imageData, 0, 0);
        for (let y = 0; y < h; y++) {
          const bin = Math.floor((y / h) * mixFreq.length);
          const val = mixFreq[bin] || 0;
          const hue = 180 + (val / 255) * 120;
          sCtx.fillStyle = `hsl(${hue} 70% ${30 + (val / 255) * 50}%)`;
          sCtx.fillRect(w - 1, h - 1 - y, 1, 1);
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [getEngines, showWave, showSpec]);

  return (
    <div className="mt-8 flex flex-col md:flex-row gap-4">
      <div className={`flex-1 min-w-0 ${showWave ? "" : "hidden"}`}>
        {showWave && (
          <>
            <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-1">
              Waveform
            </div>
            <canvas
              ref={waveRef}
              width={400}
              height={100}
              className="w-full h-[100px] rounded bg-slate-900/50 border border-slate-700/60"
            />
          </>
        )}
      </div>
      <div className={`flex-1 min-w-0 ${showSpec ? "" : "hidden"}`}>
        {showSpec && (
          <>
            <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-1">
              Spectrogram
            </div>
            <canvas
              ref={specRef}
              width={400}
              height={100}
              className="w-full h-[100px] rounded bg-slate-900/50 border border-slate-700/60"
            />
          </>
        )}
      </div>
    </div>
  );
}

interface EngineRef {
  [id: string]: ReturnType<typeof createEngine>;
}

export default function Mixer() {
  const {
    layers,
    updateLayer,
    savePreset,
    addLayer,
    removeLayer,
    presets,
    loadPreset,
    deletePreset,
    resetLayer,
    resetAllLayers,
    clearLayers,
  } = useAppStore((s) => ({
    layers: s.layers,
    updateLayer: s.updateLayer,
    savePreset: s.savePreset,
    addLayer: s.addLayer,
    removeLayer: s.removeLayer,
    presets: s.presets,
    loadPreset: s.loadPreset,
    deletePreset: (s as any).deletePreset,
    resetLayer: (s as any).resetLayer,
    resetAllLayers: (s as any).resetAllLayers,
    clearLayers: (s as any).clearLayers,
  }));

  const engines = useRef<EngineRef>({});

  // Preset name + dialogs
  const [presetName, setPresetName] = useState("Unnamed Preset");
  const [editingTitle, setEditingTitle] = useState(false);
  const [pendingPresetName, setPendingPresetName] = useState<string | null>(
    null
  );
  const [showOverwriteModal, setShowOverwriteModal] = useState(false);
  const [presetToDelete, setPresetToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [showResetAllModal, setShowResetAllModal] = useState(false);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [loadedPresetId, setLoadedPresetId] = useState<string | null>(null);
  const lastLoadedSnapshot = useRef<string>("[]");

  // Visualizers toggles
  const [showWave, setShowWave] = useState(true);
  const [showSpec, setShowSpec] = useState(true);

  // Carousel state (infinite + 3D)
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [slideIndex, setSlideIndex] = useState(0); // real index
  const [visualIndex, setVisualIndex] = useState(0); // combined index
  const initialized = useRef(false);
  const [visibleCount, setVisibleCount] = useState(1);
  const isNormalizingRef = useRef(false);

  // Build slides: each layer + optional Add tile as a real slide
  const includeAdd = layers.length < 5;
  const realSlides: Array<
    | { kind: "layer"; id: string; layer: SoundLayer }
    | { kind: "add"; id: string }
  > = [
    ...layers.map((l) => ({ kind: "layer" as const, id: l.id, layer: l })),
    ...(includeAdd ? [{ kind: "add" as const, id: "__add__" }] : []),
  ];
  const realCount = realSlides.length || 1;
  // ensure enough clones to cover desktop where multiple slides are visible
  const cloneCount = Math.min(realCount, Math.max(visibleCount + 1, 2));
  const headClones = realSlides
    .slice(realCount - cloneCount)
    .map((s, i) => ({ ...s, clone: true as const, key: `head-${i}-${s.id}` }));
  const tailClones = realSlides
    .slice(0, cloneCount)
    .map((s, i) => ({ ...s, clone: true as const, key: `tail-${i}-${s.id}` }));
  const combinedSlides = [...headClones, ...realSlides, ...tailClones];

  const toRealIndex = (combinedIdx: number) =>
    (((combinedIdx - cloneCount) % realCount) + realCount) % realCount;

  const getNearestCombinedIndex = () => {
    const parent = trackRef.current;
    if (!parent) return 0;
    const children = Array.from(parent.children) as HTMLElement[];
    const center = parent.scrollLeft + parent.clientWidth / 2;
    let nearest = 0;
    let best = Number.POSITIVE_INFINITY;
    children.forEach((child, idx) => {
      const childCenter = child.offsetLeft + child.offsetWidth / 2;
      const d = Math.abs(childCenter - center);
      if (d < best) {
        best = d;
        nearest = idx;
      }
    });
    return nearest;
  };

  const scrollToCombined = (
    combinedIdx: number,
    behavior: ScrollBehavior = "auto"
  ) => {
    const parent = trackRef.current;
    if (!parent) return;
    const children = Array.from(parent.children) as HTMLElement[];
    const clamped = Math.max(0, Math.min(combinedIdx, children.length - 1));
    const target = children[clamped];
    target?.scrollIntoView({ behavior, inline: "center", block: "nearest" });
  };

  const scrollToSlide = (
    realIdx: number,
    behavior: ScrollBehavior = "auto"
  ) => {
    const base = cloneCount + (((realIdx % realCount) + realCount) % realCount);
    const total = combinedSlides.length;
    const alt1 = base + realCount;
    const alt2 = base - realCount;
    const current = visualIndex;
    const candidates = [base, alt1, alt2].filter((i) => i >= 0 && i < total);
    let best = base;
    let bestDist = Number.POSITIVE_INFINITY;
    for (const c of candidates) {
      const d = Math.abs(c - current);
      if (d < bestDist) {
        best = c;
        bestDist = d;
      }
    }
    scrollToCombined(best, behavior);
  };

  // Measure how many slides are visible (for dynamic clone count)
  useEffect(() => {
    const measure = () => {
      const parent = trackRef.current;
      if (!parent) return;
      const first = parent.children[0] as HTMLElement | undefined;
      if (!first) return setVisibleCount(1);
      const style = getComputedStyle(parent as HTMLElement);
      const gapStr = (style as any).columnGap || (style as any).gap || "0";
      const gap = parseFloat(gapStr) || 0;
      const cell = first.offsetWidth + gap;
      const count =
        cell > 0 ? Math.max(1, Math.floor(parent.clientWidth / cell)) : 1;
      setVisibleCount(count);
    };
    measure();
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const parent = trackRef.current;
    if (!parent) return;
    if (!initialized.current) {
      initialized.current = true;
      requestAnimationFrame(() => scrollToCombined(cloneCount, "auto"));
      setVisualIndex(cloneCount);
      setSlideIndex(0);
    }
    const onResize = () =>
      requestAnimationFrame(() => scrollToCombined(visualIndex, "auto"));
    const onScroll = () => {
      if (isNormalizingRef.current) return; // ignore synthetic scrolls from normalization
      let idx = getNearestCombinedIndex();
      const parent = trackRef.current!;
      const children = Array.from(parent.children) as HTMLElement[];
      if (idx < cloneCount) {
        const dest = idx + realCount; // equivalent real index region
        // Seamless: move scrollLeft by the offset difference instead of jumping
        const fromEl = children[idx];
        const toEl = children[dest];
        if (fromEl && toEl) {
          const delta = toEl.offsetLeft - fromEl.offsetLeft;
          isNormalizingRef.current = true;
          const prevSnap = parent.style.scrollSnapType;
          parent.style.scrollSnapType = "none";
          parent.scrollLeft += delta;
          requestAnimationFrame(() => {
            parent.style.scrollSnapType = prevSnap || "x mandatory";
            isNormalizingRef.current = false;
          });
        }
        idx = dest;
      } else if (idx >= cloneCount + realCount) {
        const dest = idx - realCount;
        const fromEl = children[idx];
        const toEl = children[dest];
        if (fromEl && toEl) {
          const delta = toEl.offsetLeft - fromEl.offsetLeft;
          isNormalizingRef.current = true;
          const prevSnap = parent.style.scrollSnapType;
          parent.style.scrollSnapType = "none";
          parent.scrollLeft += delta;
          requestAnimationFrame(() => {
            parent.style.scrollSnapType = prevSnap || "x mandatory";
            isNormalizingRef.current = false;
          });
        }
        idx = dest;
      }
      setVisualIndex(idx);
      setSlideIndex(toRealIndex(idx));
    };
    parent.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      parent.removeEventListener("scroll", onScroll as any);
      window.removeEventListener("resize", onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layers.length, cloneCount]);

  // When cloneCount changes (e.g., desktop vs mobile), preserve current real slide
  useEffect(() => {
    if (!initialized.current) return;
    scrollToSlide(slideIndex, "auto");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloneCount]);

  // Engines lifecycle: create/dispose per layer
  useEffect(() => {
    // migrate any legacy type values if present
    layers.forEach((l) => {
      if ((l as any).type === "ambient") {
        updateLayer(l.id, {
          type: "binaural",
          baseFreq: l.baseFreq ?? 440,
          beatOffset: l.beatOffset ?? 0,
          wave: l.wave || "sine",
        });
      }
    });

    // dispose removed engines
    Object.keys(engines.current).forEach((id) => {
      if (!layers.find((l) => l.id === id)) {
        try {
          engines.current[id]?.stop?.();
        } catch {}
        try {
          engines.current[id]?.dispose?.();
        } catch {}
        delete engines.current[id];
      }
    });

    // create missing
    layers.forEach((l) => {
      if (!engines.current[l.id]) engines.current[l.id] = createEngine(l);
    });
  }, [layers, updateLayer]);

  // Helpers
  function togglePlay(layer: SoundLayer) {
    const eng = engines.current[layer.id];
    if (!eng) return;
    if (layer.isPlaying) {
      eng.stop();
      updateLayer(layer.id, { isPlaying: false });
    } else {
      eng.start();
      updateLayer(layer.id, { isPlaying: true });
    }
  }
  function playAll() {
    layers.forEach((l) => {
      const e = engines.current[l.id];
      if (!e || l.isPlaying) return;
      e.start();
      updateLayer(l.id, { isPlaying: true });
    });
  }
  function stopAll() {
    layers.forEach((l) => {
      const e = engines.current[l.id];
      if (!e || !l.isPlaying) return;
      e.stop();
      updateLayer(l.id, { isPlaying: false });
    });
  }
  function handleRemoveLayer(id: string) {
    const eng = engines.current[id];
    if (eng) {
      try {
        eng.stop();
      } catch {}
      try {
        eng.dispose();
      } catch {}
      delete engines.current[id];
    }
    removeLayer(id);
  }

  // Preset diff/dirty state
  function layerSnapshot() {
    return layers.map(({ id, isPlaying, ...rest }) => rest);
  }
  const currentSnapshot = JSON.stringify(layerSnapshot());
  const [hasChanges, setHasChanges] = useState(true);
  const loadedPreset = loadedPresetId
    ? presets.find((p) => p.id === loadedPresetId)
    : null;
  useEffect(() => {
    const nameChanged = loadedPreset
      ? loadedPreset.name !== presetName
      : !!presetName.trim();
    const structuralChanged =
      loadedPresetId === null || currentSnapshot !== lastLoadedSnapshot.current;
    setHasChanges(nameChanged || structuralChanged);
  }, [presetName, currentSnapshot, loadedPresetId, presets, loadedPreset]);

  function handleLoadPreset(id: string) {
    const p = presets.find((pp) => pp.id === id);
    if (!p) return;
    loadPreset(id);
    setPresetName(p.name || "Unnamed Preset");
    setLoadedPresetId(id);
    setTimeout(() => {
      lastLoadedSnapshot.current = JSON.stringify(layerSnapshot());
    }, 0);
  }

  return (
    <div className="space-y-4">
      {/* Header and actions */}
      <div className="flex gap-4 items-center flex-wrap w-full">
        <div className="flex items-center gap-2 min-w-[320px]">
          {editingTitle ? (
            <input
              autoFocus
              value={presetName}
              onChange={(e) =>
                setPresetName(e.target.value || "Unnamed Preset")
              }
              onBlur={() => setEditingTitle(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  (e.target as HTMLInputElement).blur();
                } else if (e.key === "Escape") setEditingTitle(false);
              }}
              className="bg-slate-900/60 border border-slate-600/60 rounded px-2 py-1 text-sm font-medium text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          ) : (
            <h1 className="text-base font-semibold text-slate-200 flex items-center gap-2 select-none">
              <span>{presetName || "Unnamed Preset"}</span>
              <button
                type="button"
                onClick={() => setEditingTitle(true)}
                aria-label="Edit preset title"
                className="spotlight inline-flex items-center justify-center rounded p-1 text-slate-400 hover:text-amber-300 hover:bg-slate-700/40 transition"
              >
                <Pencil size={14} />
              </button>
            </h1>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!loadedPresetId && (
            <button
              type="button"
              disabled={!hasChanges || !presetName.trim()}
              onClick={() => {
                const name = (presetName || "Unnamed Preset").trim();
                if (!name) return;
                savePreset(name);
                const created = presets.find(
                  (p) => p.name.toLowerCase() === name.toLowerCase()
                );
                if (created) {
                  setLoadedPresetId(created.id);
                  lastLoadedSnapshot.current = JSON.stringify(layerSnapshot());
                }
              }}
              className="spotlight px-3 py-1 rounded text-[11px] font-medium border border-teal-600/50 bg-teal-600/80 hover:bg-teal-500 text-white disabled:opacity-30"
            >
              Save
            </button>
          )}
          {loadedPresetId && (
            <>
              <button
                type="button"
                disabled={!hasChanges || !presetName.trim()}
                onClick={() => {
                  const name = (presetName || "Unnamed Preset").trim();
                  if (!name) return;
                  savePreset(name);
                  const created = presets.find(
                    (p) => p.name.toLowerCase() === name.toLowerCase()
                  );
                  if (created) {
                    setLoadedPresetId(created.id);
                    lastLoadedSnapshot.current = JSON.stringify(
                      layerSnapshot()
                    );
                  }
                }}
                className="spotlight px-3 py-1 rounded text-[11px] font-medium border border-teal-600/50 bg-teal-600/80 hover:bg-teal-500 text-white disabled:opacity-30"
              >
                SAVE AS NEW
              </button>
              <button
                type="button"
                disabled={!hasChanges}
                onClick={() => {
                  if (!loadedPresetId) return;
                  const name = (presetName || "Unnamed Preset").trim();
                  const updater: any = useAppStore.getState();
                  if (updater.updatePreset)
                    updater.updatePreset(loadedPresetId, name);
                  lastLoadedSnapshot.current = JSON.stringify(layerSnapshot());
                }}
                className="spotlight px-3 py-1 rounded text-[11px] font-medium border border-amber-500/50 bg-amber-600/80 hover:bg-amber-500 text-white disabled:opacity-30"
              >
                Update
              </button>
            </>
          )}
        </div>
        <div className="w-full grid grid-cols-2 gap-2 mt-3 md:mt-1 md:inline-flex md:flex-row md:gap-2 md:ml-auto">
          <button
            type="button"
            onClick={() => setShowResetAllModal(true)}
            className="spotlight px-3 py-1 rounded text-xs font-medium border border-amber-500/50 bg-amber-600/80 hover:bg-amber-500 text-white w-full md:w-auto"
          >
            Reset All
          </button>
          <button
            type="button"
            onClick={() => setShowDeleteAllModal(true)}
            className="spotlight px-3 py-1 rounded text-xs font-medium border border-red-500/50 bg-red-600/80 hover:bg-red-500 text-white w-full md:w-auto"
          >
            Delete All
          </button>
          <button
            className="spotlight px-3 py-1 rounded bg-slate-700/60 hover:bg-slate-600/60 text-xs font-medium text-slate-200 border border-slate-600/50 w-full md:w-auto"
            type="button"
            onClick={playAll}
          >
            Play All
          </button>
          <button
            type="button"
            onClick={stopAll}
            className="spotlight px-3 py-1 rounded bg-slate-700/60 hover:bg-slate-600/60 text-xs font-medium text-slate-200 border border-slate-600/50 w-full md:w-auto"
          >
            Stop All
          </button>
          <button
            type="button"
            onClick={() => setShowWave((v) => !v)}
            className={`spotlight px-3 py-1 rounded text-xs font-medium border border-slate-600/50 w-full md:w-auto ${
              showWave
                ? "bg-teal-600/70 text-white"
                : "bg-slate-700/60 text-slate-200 hover:bg-slate-600/60"
            }`}
          >
            {showWave ? "Hide Wave" : "Show Wave"}
          </button>
          <button
            type="button"
            onClick={() => setShowSpec((v) => !v)}
            className={`spotlight px-3 py-1 rounded text-xs font-medium border border-slate-600/50 w-full md:w-auto ${
              showSpec
                ? "bg-teal-600/70 text-white"
                : "bg-slate-700/60 text-slate-200 hover:bg-slate-600/60"
            }`}
          >
            {showSpec ? "Hide Spec" : "Show Spec"}
          </button>
        </div>
      </div>

      {/* Carousel */}
      <div className="relative">
        {/* Nav buttons above content */}
        <div className="pointer-events-none absolute inset-y-0 left-0 right-0 flex items-center justify-between z-30">
          <button
            type="button"
            onClick={() =>
              scrollToSlide((slideIndex - 1 + realCount) % realCount)
            }
            className="pointer-events-auto ml-[-8px] md:ml-[-12px] spotlight px-2 py-1 rounded text-xs font-medium bg-slate-700/60 hover:bg-slate-600/60 text-slate-200 border border-slate-600/50"
            aria-label="Previous"
          >
            ◀
          </button>
          <button
            type="button"
            onClick={() => scrollToSlide((slideIndex + 1) % realCount)}
            className="pointer-events-auto mr-[-8px] md:mr-[-12px] spotlight px-2 py-1 rounded text-xs font-medium bg-slate-700/60 hover:bg-slate-600/60 text-slate-200 border border-slate-600/50"
            aria-label="Next"
          >
            ▶
          </button>
        </div>

        <div
          ref={trackRef}
          className="flex gap-6 overflow-x-auto snap-x snap-mandatory pb-4 scrollbar-none z-0"
          style={{ perspective: "1000px" }}
        >
          {combinedSlides.map((s: any, cIdx: number) => {
            const isLayer = s.kind === "layer";
            const itemLayer = isLayer ? (s.layer as SoundLayer) : null;
            const key = s.clone ? s.key : s.id;

            // 3D transform relative to current visual index
            const delta = cIdx - visualIndex;
            const absD = Math.abs(delta);
            const scale = Math.max(0.85, 1 - absD * 0.08);
            const rotate = Math.max(-15, Math.min(15, -delta * 6));
            const z = Math.max(0, 60 - absD * 20);
            const opacity = absD === 0 ? 1 : absD === 1 ? 0.9 : 0.7;
            const zIndex = 20 - absD;

            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex-none snap-center w-[85vw] sm:w-[320px] md:w-[340px] lg:w-[350px] max-w-[350px]"
                style={{
                  transform: `translateZ(${z}px) scale(${scale}) rotateY(${rotate}deg)`,
                  transformStyle: "preserve-3d",
                  opacity,
                  zIndex,
                }}
              >
                {isLayer ? (
                  <div className="card spotlight rounded-lg p-4 bg-[#121826]/70 border border-slate-700/40">
                    <h3 className="text-sm font-semibold mb-3 text-slate-200 flex items-center justify-between gap-2 flex-wrap">
                      <span>
                        Layer{" "}
                        {layers.findIndex(
                          (l) => l.id === (itemLayer as SoundLayer).id
                        ) + 1}
                      </span>
                      <div className="relative">
                        <select
                          value={(itemLayer as SoundLayer).type}
                          onChange={(e) => {
                            const newType = e.target.value as any;
                            if (newType === (itemLayer as SoundLayer).type)
                              return;
                            const old =
                              engines.current[(itemLayer as SoundLayer).id];
                            const wasPlaying = (itemLayer as SoundLayer)
                              .isPlaying;
                            try {
                              old?.stop();
                            } catch {}
                            try {
                              old?.dispose();
                            } catch {}
                            delete engines.current[
                              (itemLayer as SoundLayer).id
                            ];
                            let patch: any = { type: newType };
                            if (newType === "binaural") {
                              patch = {
                                ...patch,
                                baseFreq:
                                  (itemLayer as SoundLayer).baseFreq ?? 440,
                                beatOffset: 0,
                                wave: (itemLayer as SoundLayer).wave || "sine",
                                pulseFreq: undefined,
                              };
                            } else if (newType === "isochronic") {
                              patch = {
                                ...patch,
                                baseFreq:
                                  (itemLayer as SoundLayer).baseFreq ?? 200,
                                pulseFreq:
                                  (itemLayer as SoundLayer).pulseFreq ?? 10,
                                beatOffset: undefined,
                              };
                            }
                            updateLayer((itemLayer as SoundLayer).id, patch);
                            const updated = useAppStore
                              .getState()
                              .layers.find(
                                (l) => l.id === (itemLayer as SoundLayer).id
                              );
                            if (updated) {
                              engines.current[(itemLayer as SoundLayer).id] =
                                createEngine(updated as SoundLayer);
                              if (wasPlaying) {
                                engines.current[
                                  (itemLayer as SoundLayer).id
                                ].start();
                                updateLayer((itemLayer as SoundLayer).id, {
                                  isPlaying: true,
                                });
                              }
                            }
                          }}
                          className="spotlight bg-slate-900/70 border border-slate-600/60 text-[11px] rounded pl-2 pr-6 py-1 text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500 appearance-none cursor-pointer"
                        >
                          <option className="bg-slate-900" value="binaural">
                            Binaural
                          </option>
                          <option className="bg-slate-900" value="isochronic">
                            Isochronic
                          </option>
                        </select>
                        <span className="pointer-events-none absolute inset-y-0 right-1 flex items-center text-slate-400">
                          <ChevronDown size={14} />
                        </span>
                      </div>
                      <button
                        onClick={() => togglePlay(itemLayer as SoundLayer)}
                        className={`spotlight inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium transition ${
                          (itemLayer as SoundLayer).isPlaying
                            ? "bg-teal-500/90 text-white"
                            : "bg-slate-700/60 text-slate-200 hover:bg-slate-600/60"
                        }`}
                      >
                        {(itemLayer as SoundLayer).isPlaying ? (
                          <Square size={12} />
                        ) : (
                          <Play size={12} />
                        )}
                        {(itemLayer as SoundLayer).isPlaying ? "Stop" : "Play"}
                      </button>
                      <button
                        onClick={() => {
                          const eng =
                            engines.current[(itemLayer as SoundLayer).id];
                          if (eng) {
                            try {
                              eng.stop();
                            } catch {}
                          }
                          resetLayer((itemLayer as SoundLayer).id);
                          engines.current[(itemLayer as SoundLayer).id]?.update(
                            {
                              baseFreq: 440,
                              beatOffset: 0,
                              volume: 0.5,
                              pan: 0,
                              wave: "sine",
                            }
                          );
                        }}
                        className="spotlight ml-2 text-[11px] px-2 py-1 rounded bg-slate-700/60 hover:bg-slate-600/60 text-slate-300 border border-slate-600/50"
                        aria-label="Reset layer to defaults"
                      >
                        Reset
                      </button>
                      <button
                        onClick={() =>
                          handleRemoveLayer((itemLayer as SoundLayer).id)
                        }
                        className="spotlight ml-2 text-slate-500 hover:text-red-400 transition"
                        aria-label="Remove layer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </h3>

                    <div className="space-y-3">
                      {(itemLayer as SoundLayer).type === "binaural" && (
                        <div>
                          <div className="flex items-stretch mb-2">
                            <div className="flex-1 text-center rounded-md bg-[#121826] border border-slate-700/60 py-2 text-slate-200 text-sm font-medium">
                              {(itemLayer as SoundLayer).baseFreq}{" "}
                              <span className="text-[10px] font-normal">
                                Hz
                              </span>
                            </div>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={1000}
                            value={(itemLayer as SoundLayer).baseFreq || 0}
                            onChange={(e) => {
                              const v = Number(e.target.value);
                              updateLayer((itemLayer as SoundLayer).id, {
                                baseFreq: v,
                              });
                              engines.current[
                                (itemLayer as SoundLayer).id
                              ]?.update({
                                baseFreq: v,
                              });
                            }}
                            className="w-full"
                          />
                          <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                            <span>0 Hz</span>
                            <span>1000Hz</span>
                          </div>
                          <div className="mt-3 flex items-center gap-2">
                            <input
                              type="number"
                              min={0}
                              max={1000}
                              value={(itemLayer as SoundLayer).baseFreq || 0}
                              onChange={(e) => {
                                const v = Math.max(
                                  0,
                                  Math.min(1000, Number(e.target.value))
                                );
                                updateLayer((itemLayer as SoundLayer).id, {
                                  baseFreq: v,
                                });
                                engines.current[
                                  (itemLayer as SoundLayer).id
                                ]?.update({
                                  baseFreq: v,
                                });
                              }}
                              className="w-24 rounded border border-slate-700/60 bg-slate-900/40 px-2 py-1 text-xs"
                            />
                            <span className="text-[10px] text-slate-400">
                              Manual
                            </span>
                          </div>
                          <div className="mt-4">
                            <label className="block text-[10px] mb-1 uppercase tracking-wide text-slate-400">
                              Beat Offset {(itemLayer as SoundLayer).beatOffset}{" "}
                              Hz
                            </label>
                            <input
                              type="range"
                              min={0}
                              max={40}
                              value={(itemLayer as SoundLayer).beatOffset || 0}
                              onChange={(e) => {
                                const v = Number(e.target.value);
                                updateLayer((itemLayer as SoundLayer).id, {
                                  beatOffset: v,
                                });
                                engines.current[
                                  (itemLayer as SoundLayer).id
                                ]?.update({
                                  beatOffset: v,
                                });
                              }}
                              className="w-full"
                            />
                            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                              <span>0 Hz</span>
                              <span>40Hz</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {(itemLayer as SoundLayer).type === "isochronic" && (
                        <div>
                          <div className="flex items-stretch mb-2">
                            <div className="flex-1 text-center rounded-md bg-[#121826] border border-slate-700/60 py-2 text-slate-200 text-sm font-medium">
                              {(itemLayer as SoundLayer).baseFreq || 200}{" "}
                              <span className="text-[10px] font-normal">
                                Hz
                              </span>
                            </div>
                          </div>
                          <label className="block text-[10px] mb-1 uppercase tracking-wide text-slate-400">
                            Base Frequency
                          </label>
                          <input
                            type="range"
                            min={0}
                            max={1000}
                            value={(itemLayer as SoundLayer).baseFreq || 200}
                            onChange={(e) => {
                              const v = Number(e.target.value);
                              updateLayer((itemLayer as SoundLayer).id, {
                                baseFreq: v,
                              });
                              engines.current[
                                (itemLayer as SoundLayer).id
                              ]?.update({
                                baseFreq: v,
                              });
                            }}
                            className="w-full"
                          />
                          <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                            <span>0 Hz</span>
                            <span>1000Hz</span>
                          </div>
                          <div className="mt-3 flex items-center gap-2">
                            <input
                              type="number"
                              min={0}
                              max={1000}
                              value={(itemLayer as SoundLayer).baseFreq || 200}
                              onChange={(e) => {
                                const v = Math.max(
                                  0,
                                  Math.min(1000, Number(e.target.value))
                                );
                                updateLayer((itemLayer as SoundLayer).id, {
                                  baseFreq: v,
                                });
                                engines.current[
                                  (itemLayer as SoundLayer).id
                                ]?.update({
                                  baseFreq: v,
                                });
                              }}
                              className="w-24 rounded border border-slate-700/60 bg-slate-900/40 px-2 py-1 text-xs"
                            />
                            <span className="text-[10px] text-slate-400">
                              Manual
                            </span>
                          </div>
                          <div className="mt-5">
                            <label className="block text-[10px] mb-1 uppercase tracking-wide text-slate-400">
                              Pulse Frequency (Pulses / sec)
                            </label>
                            <input
                              type="range"
                              min={1}
                              max={100}
                              value={(itemLayer as SoundLayer).pulseFreq || 10}
                              onChange={(e) => {
                                const v = Number(e.target.value);
                                updateLayer((itemLayer as SoundLayer).id, {
                                  pulseFreq: v,
                                });
                                engines.current[
                                  (itemLayer as SoundLayer).id
                                ]?.update({
                                  pulseFreq: v,
                                });
                              }}
                              className="w-full"
                            />
                            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                              <span>1</span>
                              <span>100</span>
                            </div>
                            <div className="mt-3 flex items-center gap-2">
                              <input
                                type="number"
                                min={1}
                                max={100}
                                value={
                                  (itemLayer as SoundLayer).pulseFreq || 10
                                }
                                onChange={(e) => {
                                  const v = Math.max(
                                    1,
                                    Math.min(100, Number(e.target.value))
                                  );
                                  updateLayer((itemLayer as SoundLayer).id, {
                                    pulseFreq: v,
                                  });
                                  engines.current[
                                    (itemLayer as SoundLayer).id
                                  ]?.update({
                                    pulseFreq: v,
                                  });
                                }}
                                className="w-24 rounded border border-slate-700/60 bg-slate-900/40 px-2 py-1 text-xs"
                              />
                              <span className="text-[10px] text-slate-400">
                                Manual
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Waveform selector for non-ambient */}
                      <div>
                        {(itemLayer as SoundLayer).type !== "ambient" && (
                          <>
                            <div className="text-[10px] uppercase tracking-wide mb-1 text-slate-400">
                              Waveform
                            </div>
                            <div className="flex gap-1">
                              {(
                                [
                                  "sine",
                                  "square",
                                  "sawtooth",
                                  "triangle",
                                ] as const
                              ).map((w) => (
                                <button
                                  key={w}
                                  onClick={() => {
                                    updateLayer((itemLayer as SoundLayer).id, {
                                      wave: w,
                                    });
                                    engines.current[
                                      (itemLayer as SoundLayer).id
                                    ]?.update({ wave: w });
                                  }}
                                  className={`flex-1 rounded-md px-2 py-1 text-[10px] capitalize border transition ${
                                    (itemLayer as SoundLayer).wave === w
                                      ? "bg-teal-500/90 border-teal-400 text-white"
                                      : "bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-700/60"
                                  }`}
                                  type="button"
                                >
                                  {w.replace("sawtooth", "saw")}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>

                      {/* Volume/Pan */}
                      <div>
                        <label className="block text-[10px] mb-1 uppercase tracking-wide text-slate-400">
                          Volume{" "}
                          {Math.round((itemLayer as SoundLayer).volume * 100)}%
                        </label>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.01}
                          value={(itemLayer as SoundLayer).volume}
                          onChange={(e) => {
                            const v = Number(e.target.value);
                            updateLayer((itemLayer as SoundLayer).id, {
                              volume: v,
                            });
                            engines.current[
                              (itemLayer as SoundLayer).id
                            ]?.update({
                              volume: v,
                            });
                          }}
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] mb-1 uppercase tracking-wide text-slate-400">
                          Pan {(itemLayer as SoundLayer).pan}
                        </label>
                        <input
                          type="range"
                          min={-1}
                          max={1}
                          step={0.01}
                          value={(itemLayer as SoundLayer).pan}
                          onChange={(e) => {
                            const v = Number(e.target.value);
                            updateLayer((itemLayer as SoundLayer).id, {
                              pan: v,
                            });
                            engines.current[
                              (itemLayer as SoundLayer).id
                            ]?.update({ pan: v });
                          }}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      addLayer({});
                      setTimeout(
                        () => scrollToSlide(Math.max(0, layers.length)),
                        0
                      );
                    }}
                    className="rounded-lg border-2 border-dashed border-slate-600/40 hover:border-teal-500/60 text-slate-400 hover:text-teal-400 flex items-center justify-center min-h-[260px] bg-slate-900/30 w-full"
                  >
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <Plus size={16} /> Add Layer
                    </span>
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Dots */}
        <div className="mt-2 flex items-center justify-center gap-1">
          {Array.from({ length: realCount }).map((_, i) => (
            <button
              key={i}
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => scrollToSlide(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === slideIndex
                  ? "w-6 bg-teal-400/80"
                  : "w-3 bg-slate-600/60 hover:bg-slate-500/70"
              }`}
            />
          ))}
        </div>
      </div>

      <Visualizers
        getEngines={() => layers.map((l) => engines.current[l.id] || null)}
        showWave={showWave}
        showSpec={showSpec}
      />

      {/* Presets */}
      <div className="mt-12 space-y-4">
        <h2 className="text-sm font-semibold tracking-wide uppercase text-slate-400">
          Presets
        </h2>
        {presets.length === 0 && (
          <p className="text-xs text-slate-500">No presets saved yet.</p>
        )}
        <ul className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {presets.map((p) => (
            <li
              key={p.id}
              className="rounded-md border border-slate-700/50 bg-slate-900/40 px-3 py-3 flex flex-col gap-2"
            >
              <span
                className="text-sm font-medium text-slate-200 truncate"
                title={p.name}
              >
                {p.name}
              </span>
              {p.layers && p.layers.length > 0 && (
                <div className="space-y-1 mt-1 overflow-auto max-h-40 pr-1 scrollbar-thin scrollbar-thumb-slate-700/60 scrollbar-track-transparent">
                  {p.layers.map((l, idx) => {
                    const parts: string[] = [];
                    parts.push(
                      `Layer ${idx + 1} – ${l.type
                        .charAt(0)
                        .toUpperCase()}${l.type.slice(1)}`
                    );
                    if (l.type === "binaural") {
                      if (typeof l.baseFreq === "number")
                        parts.push(`Base frequency: ${l.baseFreq} Hz`);
                      if (typeof l.beatOffset === "number")
                        parts.push(`Beat offset: ${l.beatOffset} Hz`);
                      if (l.wave) parts.push(`Waveform: ${l.wave}`);
                    } else if (l.type === "isochronic") {
                      if (typeof l.pulseFreq === "number")
                        parts.push(`Pulse frequency: ${l.pulseFreq} Hz`);
                      if (l.wave) parts.push(`Waveform: ${l.wave}`);
                    } else if (l.type === "ambient") {
                      if (l.ambientKey)
                        parts.push(`Ambient source: ${l.ambientKey}`);
                    }
                    parts.push(`Volume: ${Math.round(l.volume * 100)}%`);
                    // Pan formatting: center, left xx%, right xx%
                    let panLabel = "center";
                    if (l.pan < -0.01)
                      panLabel = `left ${Math.round(Math.abs(l.pan) * 100)}%`;
                    else if (l.pan > 0.01)
                      panLabel = `right ${Math.round(Math.abs(l.pan) * 100)}%`;
                    parts.push(`Pan: ${panLabel}`);
                    return (
                      <div
                        key={l.id}
                        className="text-[10px] leading-snug text-slate-400 border border-slate-700/40 rounded p-1 bg-slate-800/40"
                      >
                        {parts.map((line, i) => (
                          <div key={i}>{line}</div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => handleLoadPreset(p.id)}
                  className="flex-1 text-[11px] bg-teal-600/80 hover:bg-teal-500 text-white rounded px-2 py-1 font-medium"
                >
                  Load
                </button>
                <button
                  onClick={() => {
                    setPresetName(p.name);
                    setLoadedPresetId(p.id);
                    lastLoadedSnapshot.current = JSON.stringify(p.layers || []);
                  }}
                  className="text-[11px] bg-slate-700/70 hover:bg-slate-600/70 text-slate-200 rounded px-2 py-1 font-medium"
                >
                  Edit Name
                </button>
                <button
                  onClick={() => setPresetToDelete({ id: p.id, name: p.name })}
                  className="text-[11px] bg-red-600/80 hover:bg-red-500 text-white rounded px-2 py-1 font-medium"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Overwrite modal */}
      {showOverwriteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-lg border border-slate-700/60 bg-[#0d121b] p-5 shadow-xl space-y-4">
            <h3 className="text-sm font-semibold text-slate-200">
              Overwrite Preset?
            </h3>
            <p className="text-xs text-slate-400">
              A preset named{" "}
              <span className="text-teal-400 font-medium">
                {pendingPresetName}
              </span>{" "}
              already exists. Do you want to replace it with the current layers?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setShowOverwriteModal(false);
                  setPendingPresetName(null);
                }}
                className="px-3 py-1 rounded text-xs border border-slate-600/50 bg-slate-800/60 hover:bg-slate-700/60 text-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (pendingPresetName) {
                    savePreset(pendingPresetName);
                    setPresetName("");
                  }
                  setShowOverwriteModal(false);
                  setPendingPresetName(null);
                }}
                className="px-3 py-1 rounded text-xs font-medium bg-teal-600/80 hover:bg-teal-500 text-white"
              >
                Overwrite
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete preset modal */}
      {presetToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-lg border border-slate-700/60 bg-[#0d121b] p-5 shadow-xl space-y-4">
            <h3 className="text-sm font-semibold text-red-300">
              Delete Preset
            </h3>
            <p className="text-xs text-slate-400">
              Are you sure you want to permanently delete{" "}
              <span className="text-red-400 font-medium">
                {presetToDelete.name}
              </span>
              ? This cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setPresetToDelete(null)}
                className="px-3 py-1 rounded text-xs border border-slate-600/50 bg-slate-800/60 hover:bg-slate-700/60 text-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deletePreset(presetToDelete.id);
                  setPresetToDelete(null);
                }}
                className="px-3 py-1 rounded text-xs font-medium bg-red-600/80 hover:bg-red-500 text-white"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset all modal */}
      {showResetAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-lg border border-slate-700/60 bg-[#0d121b] p-5 shadow-xl space-y-4">
            <h3 className="text-sm font-semibold text-slate-200">
              Reset All Layers?
            </h3>
            <p className="text-xs text-slate-400">
              This will reset every layer back to the default settings (binaural
              sine wave at 440 Hz, 0 beat offset, 50% volume, centered pan). Any
              playing layers will stop. Continue?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowResetAllModal(false)}
                className="px-3 py-1 rounded text-xs border border-slate-600/50 bg-slate-800/60 hover:bg-slate-700/60 text-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  layers.forEach((l) => {
                    const e = engines.current[l.id];
                    if (e) {
                      try {
                        e.stop();
                      } catch {}
                    }
                  });
                  resetAllLayers();
                  setShowResetAllModal(false);
                }}
                className="px-3 py-1 rounded text-xs font-medium bg-teal-600/80 hover:bg-teal-500 text-white"
              >
                Reset All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete all modal */}
      {showDeleteAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-lg border border-slate-700/60 bg-[#0d121b] p-5 shadow-xl space-y-4">
            <h3 className="text-sm font-semibold text-red-300">
              Delete All Layers?
            </h3>
            <p className="text-xs text-slate-400">
              This will permanently remove every layer from the mixer. This
              action cannot be undone. Are you absolutely sure?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowDeleteAllModal(false)}
                className="px-3 py-1 rounded text-xs border border-slate-600/50 bg-slate-800/60 hover:bg-slate-700/60 text-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  layers.forEach((l) => {
                    const e = engines.current[l.id];
                    if (e) {
                      try {
                        e.stop();
                      } catch {}
                      try {
                        e.dispose?.();
                      } catch {}
                      delete engines.current[l.id];
                    }
                  });
                  clearLayers();
                  setShowDeleteAllModal(false);
                }}
                className="px-3 py-1 rounded text-xs font-medium bg-red-600/80 hover:bg-red-500 text-white"
              >
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
