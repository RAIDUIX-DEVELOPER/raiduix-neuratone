"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Play,
  Square,
  Plus,
  Trash2,
  Pencil,
  ChevronDown,
  X,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { SoundLayer, createEngine, type LayerEffect } from "@/lib/audioEngine";
import OrbVisualizer from "./OrbVisualizer";
import {
  createNoiseNode,
  type NoiseType,
  type NoiseNodeHandle,
} from "@/lib/effects";

interface EngineRef {
  [id: string]: ReturnType<typeof createEngine>;
}

export default function Mixer() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const {
    layers,
    updateLayer,
    addLayerEffect,
    removeLayerEffect,
    savePreset,
    updatePreset,
    addLayer,
    removeLayer,
    presets,
    loadPreset,
    deletePreset,
    resetLayer,
    clearLayers,
  } = useAppStore((s) => ({
    layers: s.layers,
    updateLayer: s.updateLayer,
    addLayerEffect: (s as any).addLayerEffect,
    removeLayerEffect: (s as any).removeLayerEffect,
    savePreset: s.savePreset,
    updatePreset: (s as any).updatePreset,
    addLayer: s.addLayer,
    removeLayer: s.removeLayer,
    presets: s.presets,
    loadPreset: s.loadPreset,
    deletePreset: s.deletePreset,
    resetLayer: (s as any).resetLayer,
    clearLayers: (s as any).clearLayers,
  }));

  const engines = useRef<EngineRef>({});
  const [presetName, setPresetName] = useState("Unnamed Preset");
  const [editingTitle, setEditingTitle] = useState(false);
  const [showResetAllModal, setShowResetAllModal] = useState(false);
  const [showPresetsModal, setShowPresetsModal] = useState(false);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [showSaveAsModal, setShowSaveAsModal] = useState(false);
  const [showEffectsLibrary, setShowEffectsLibrary] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  // Effects Library (Noise preview) state
  const [noiseType, setNoiseType] = useState<NoiseType>("white");
  const [noiseGain, setNoiseGain] = useState(0.25);
  const [noisePan, setNoisePan] = useState(0);
  const [targetLayerId, setTargetLayerId] = useState<string | null>(null);
  const noiseCtxRef = useRef<AudioContext | null>(null);
  const noiseHandleRef = useRef<NoiseNodeHandle | null>(null);
  const [saveAsName, setSaveAsName] = useState("");
  const [loadedPresetId, setLoadedPresetId] = useState<string | null>(null);
  const lastLoadedSnapshot = useRef<string>("[]");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggleExpanded = (id: string) =>
    setExpanded((m) => ({ ...m, [id]: !m[id] }));
  const activeCount = layers.filter((l) => l.isPlaying).length;
  const didAutoloadRef = useRef(false);

  // Helpers: preset summaries for modal cards
  const uniquePresetName = (base: string) => {
    const names = new Set(
      useAppStore.getState().presets.map((p) => p.name.toLowerCase())
    );
    if (!names.has(base.toLowerCase())) return base;
    let i = 2;
    while (names.has(`${base} (${i})`.toLowerCase())) i++;
    return `${base} (${i})`;
  };
  const waveShort = (w?: OscillatorType) =>
    w === "square"
      ? "sq"
      : w === "sawtooth"
      ? "saw"
      : w === "triangle"
      ? "tri"
      : "sin";
  const summarizeTypeCounts = (ls: SoundLayer[]) => {
    const c: Record<string, number> = {
      binaural: 0,
      isochronic: 0,
      ambient: 0,
    };
    ls.forEach((l) => (c[l.type] = (c[l.type] || 0) + 1));
    const parts = [] as string[];
    if (c.binaural) parts.push(`${c.binaural} binaural`);
    if (c.isochronic) parts.push(`${c.isochronic} isochronic`);
    if (c.ambient) parts.push(`${c.ambient} ambient`);
    return parts.join(", ");
  };
  const summarizeLayersCompact = (ls: SoundLayer[]) => {
    const items = ls.slice(0, 3).map((l) => {
      if (l.type === "binaural") {
        const base = Math.round(l.baseFreq || 0);
        const beat = Math.round(l.beatOffset || 0);
        return `${waveShort(l.wave)} ${base}Hz Δ${beat}`;
      }
      if (l.type === "isochronic") {
        const base = Math.round(l.baseFreq || 0);
        const pulse = (l.pulseFreq ?? 0).toFixed(0);
        return `${waveShort(l.wave)} ${base}Hz P${pulse}`;
      }
      // ambient
      return `amb ${l.ambientKey || "white"}`;
    });
    if (ls.length > 3) items.push(`+${ls.length - 3} more`);
    return items.join(" • ");
  };

  // Close modals on ESC and lock scroll while open
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowPresetsModal(false);
        setShowResetAllModal(false);
        setShowDeleteAllModal(false);
        setShowEffectsLibrary(false);
        setShowHelp(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    if (
      showPresetsModal ||
      showResetAllModal ||
      showDeleteAllModal ||
      showSaveAsModal ||
      showEffectsLibrary ||
      showHelp
    ) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = prev || "";
    }
    return () => {
      document.body.style.overflow = prev || "";
    };
  }, [
    showPresetsModal,
    showResetAllModal,
    showDeleteAllModal,
    showSaveAsModal,
    showEffectsLibrary,
    showHelp,
  ]);

  // Effects Library: helpers for noise preview lifecycle
  async function ensureNoisePreviewStarted() {
    if (!noiseCtxRef.current) {
      const Ctor = (window.AudioContext ||
        (window as any).webkitAudioContext) as typeof AudioContext;
      noiseCtxRef.current = new Ctor();
    }
    const ctx = noiseCtxRef.current!;
    try {
      await ctx.resume();
    } catch {}
    if (!noiseHandleRef.current) {
      const handle = await createNoiseNode(ctx, {
        type: noiseType,
        gain: noiseGain,
        pan: noisePan,
      });
      handle.connect(ctx.destination);
      noiseHandleRef.current = handle;
    } else {
      noiseHandleRef.current.setType(noiseType);
      noiseHandleRef.current.setGain(noiseGain);
      noiseHandleRef.current.setPan(noisePan);
    }
  }
  function stopNoisePreview() {
    const h = noiseHandleRef.current;
    try {
      h?.disconnect();
    } catch {}
    try {
      h?.dispose();
    } catch {}
    noiseHandleRef.current = null;
  }
  // Cleanup on close/unmount
  useEffect(() => {
    if (!showEffectsLibrary) {
      stopNoisePreview();
    }
    return () => {
      stopNoisePreview();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showEffectsLibrary]);

  // On first mount, handle query params to auto-load a preset
  useEffect(() => {
    if (didAutoloadRef.current) return;
    // Prefer explicit preset over continue
    const presetParam = searchParams.get("preset");
    const continueParam = searchParams.get("continue");

    const st = useAppStore.getState();
    const byName = (name: string) =>
      st.presets.find((p) => p.name.toLowerCase() === name.toLowerCase());
    const byId = (id: string) => st.presets.find((p) => p.id === id);

    let target: { id: string; name: string } | null = null;

    if (presetParam) {
      const decoded = decodeURIComponent(presetParam);
      const match = byId(decoded) || byName(decoded);
      if (match) target = { id: match.id, name: match.name };
      // If no presets exist yet (e.g., migrated users with empty persisted store),
      // seed and resolve built-in defaults by key for first-run experience.
      if (!target && st.presets.length === 0) {
        const key = decoded.toLowerCase();
        const keyToId: Record<string, string> = {
          sleep: "preset-sleep",
          calm: "preset-calm",
          focus: "preset-focus",
        };
        const fallbackId = keyToId[key];
        if (fallbackId) {
          // loadPreset will also inject seeded defaults when empty
          loadPreset(fallbackId);
          const seeded = useAppStore
            .getState()
            .presets.find((p) => p.id === fallbackId);
          if (seeded) {
            const newLayers = useAppStore.getState().layers;
            lastLoadedSnapshot.current = JSON.stringify(
              newLayers.map(({ id, isPlaying, ...rest }) => rest)
            );
            setLoadedPresetId(seeded.id);
            setPresetName(seeded.name);
            didAutoloadRef.current = true;
            try {
              router.replace("/app");
            } catch {}
            return; // early exit after seeding + load
          }
        }
      }
    } else if (continueParam === "1") {
      const lastId = st.lastPresetId;
      if (lastId) {
        const match = byId(lastId);
        if (match) target = { id: match.id, name: match.name };
      }
    }

    if (target) {
      loadPreset(target.id);
      const newLayers = useAppStore.getState().layers;
      lastLoadedSnapshot.current = JSON.stringify(
        newLayers.map(({ id, isPlaying, ...rest }) => rest)
      );
      setLoadedPresetId(target.id);
      setPresetName(target.name);
      didAutoloadRef.current = true;
      // Clean the query string to avoid repeated autoloads and keep /app tidy
      try {
        router.replace("/app");
      } catch {}
    }
  }, [searchParams, router, loadPreset]);

  // Initialize engines and cleanup
  useEffect(() => {
    layers.forEach((layer) => {
      if (!engines.current[layer.id]) {
        engines.current[layer.id] = createEngine(layer);
      }
    });
    Object.keys(engines.current).forEach((id) => {
      if (!layers.find((l) => l.id === id)) {
        const engine = engines.current[id];
        try {
          engine?.stop();
          engine?.dispose?.();
        } catch {}
        delete engines.current[id];
      }
    });
  }, [layers]);

  function togglePlay(layer: SoundLayer) {
    const engine = engines.current[layer.id];
    if (!engine) return;
    if (layer.isPlaying) {
      engine.stop();
      updateLayer(layer.id, { isPlaying: false });
    } else {
      engine.start();
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
        eng.dispose?.();
      } catch {}
      delete engines.current[id];
    }
    removeLayer(id);
  }

  function layerSnapshot() {
    return layers.map(({ id, isPlaying, ...rest }) => rest);
  }
  const currentSnapshot = JSON.stringify(layerSnapshot());
  const hasChanges = useMemo(() => {
    const lp = loadedPresetId
      ? presets.find((p) => p.id === loadedPresetId)
      : null;
    const nameChanged = lp ? lp.name !== presetName : !!presetName.trim();
    const structuralChanged =
      loadedPresetId === null || currentSnapshot !== lastLoadedSnapshot.current;
    return nameChanged || structuralChanged;
  }, [presetName, currentSnapshot, loadedPresetId, presets]);

  return (
    <div className="w-full h-[100dvh] px-0 flex flex-col">
      {/* Top Header: Preset controls (title/edit/save) + Presets button */}
      <header className="px-4 py-2 bg-black/40 backdrop-blur supports-[backdrop-filter]:bg-black/35 border-b border-white/10">
        <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
          <div className="flex items-center gap-3">
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
                className="bg-black/40 border border-white/20 rounded-xl px-4 py-2 text-base font-light text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 backdrop-blur-sm"
              />
            ) : (
              <div className="flex items-center gap-3">
                <h1 className="text-base lg:text-lg font-light text-white/90 tracking-wide max-w-[20rem] truncate">
                  {presetName || "Unnamed Preset"}
                </h1>
                <button
                  type="button"
                  onClick={() => setEditingTitle(true)}
                  className="p-2 rounded-xl text-white/60 hover:text-teal-400 hover:bg-white/5 transition-all duration-200"
                  aria-label="Edit preset name"
                >
                  <Pencil size={16} />
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Update existing preset when one is loaded */}
            {loadedPresetId && (
              <button
                disabled={!hasChanges}
                onClick={() => {
                  const id = loadedPresetId;
                  const name = (presetName || "Unnamed Preset").trim();
                  if (!id || !name) return;
                  updatePreset(id, name);
                  lastLoadedSnapshot.current = JSON.stringify(layerSnapshot());
                }}
                className="px-3 py-1.5 btn-shape font-medium text-[11px] bg-teal-500/20 text-teal-300 border border-teal-500/30 hover:bg-teal-500/30 disabled:opacity-40"
              >
                Update Preset
              </button>
            )}
            {/* Save current as a new preset (only when a preset is loaded) */}
            {loadedPresetId && (
              <button
                disabled={!presetName.trim()}
                onClick={() => {
                  const base = (presetName || "Unnamed Preset").trim();
                  const suggested = uniquePresetName(base);
                  setSaveAsName(suggested);
                  setShowSaveAsModal(true);
                }}
                className="px-3 py-1.5 btn-shape font-medium text-[11px] bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 disabled:opacity-40"
              >
                Save As New
              </button>
            )}
            {/* Save Preset when none is loaded (legacy create path) */}
            {!loadedPresetId && (
              <button
                disabled={!hasChanges || !presetName.trim()}
                onClick={() => {
                  const name = (presetName || "Unnamed Preset").trim();
                  if (!name) return;
                  savePreset(name);
                  const st = useAppStore.getState();
                  const created = st.presets.find(
                    (p) => p.name.toLowerCase() === name.toLowerCase()
                  );
                  if (created) {
                    setLoadedPresetId(created.id);
                    lastLoadedSnapshot.current = JSON.stringify(
                      layerSnapshot()
                    );
                  }
                }}
                className="px-3 py-1.5 btn-shape font-medium text-[11px] bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 disabled:opacity-40"
              >
                Save Preset
              </button>
            )}
            <button
              onClick={() => setShowPresetsModal((v) => !v)}
              aria-expanded={showPresetsModal}
              aria-controls="presets-drawer-panel"
              className={`inline-flex items-center gap-2 px-3 py-1.5 btn-shape text-white text-xs font-medium transition-colors border ${
                showPresetsModal
                  ? "bg-white/15 border-white/30"
                  : "bg-white/5 hover:bg-white/10 border-white/10"
              }`}
            >
              {showPresetsModal ? (
                <>
                  <X size={14} />
                  Close Presets
                </>
              ) : (
                <>
                  <ChevronDown size={14} />
                  Open Presets
                </>
              )}
            </button>
            <button
              onClick={() => setShowEffectsLibrary((v) => !v)}
              aria-expanded={showEffectsLibrary}
              aria-controls="effects-library-panel"
              className={`inline-flex items-center gap-2 px-3 py-1.5 btn-shape text-white text-xs font-medium transition-colors border ${
                showEffectsLibrary
                  ? "bg-white/15 border-white/30"
                  : "bg-white/5 hover:bg-white/10 border-white/10"
              }`}
            >
              {showEffectsLibrary ? (
                <>
                  <X size={14} />
                  Close Effects
                </>
              ) : (
                <>
                  <ChevronDown size={14} />
                  Effects Library
                </>
              )}
            </button>

            {/* Help pill button */}
            <button
              onClick={() => setShowHelp(true)}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 text-white text-xs font-medium border border-white/10"
              aria-label="Open help"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 1 1 5.82 1c0 2-3 2-3 4" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              Help
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 min-h-0">
        <div className="grid grid-rows-[auto_1fr] lg:grid-rows-1 lg:grid-cols-[3fr_1fr] h-full w-full gap-0">
          {/* Left: Orb (75vw, 100vh) */}
          <div className="relative w-full h-[50vh] lg:h-full">
            <div
              className="relative h-full rounded-2xl overflow-hidden"
              style={{
                backgroundColor: "rgba(0,0,0,0.15)",
                backgroundImage:
                  "radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), radial-gradient(rgba(255,255,255,0.02) 1px, transparent 1px)",
                backgroundSize: "22px 22px, 22px 22px",
                backgroundPosition: "0 0, 11px 11px",
              }}
            >
              {/* Subtle top-left title overlay */}
              <div className="pointer-events-none absolute left-4 right-4 top-3 flex items-center gap-3 text-white/80">
                <div className="text-lg font-medium tracking-wide text-white/90">
                  Neural Mixer
                </div>
                <span className="h-4 w-px bg-white/15" />
                <div className="text-xs uppercase tracking-wider text-teal-300/90">
                  {activeCount}/{layers.length} layers active
                </div>
              </div>

              <OrbVisualizer
                getEngines={() => layers.map((l) => engines.current[l.id])}
                fit
              />
            </div>
          </div>

          {/* Right: Control Panel (25vw, 100vh, single column) */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="relative w-full h-[55vh] lg:h-full"
          >
            <div
              className="relative h-full overflow-hidden border-l border-white/10"
              style={{
                backgroundColor: "rgba(5,8,20,0.9)",
                backgroundImage:
                  "radial-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), radial-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(180deg, rgba(2,6,23,0.9) 0%, rgba(3,7,18,0.92) 100%)",
                backgroundSize: "22px 22px, 22px 22px, auto",
                backgroundPosition: "0 0, 11px 11px, 0 0",
              }}
            >
              <div className="h-full overflow-y-auto px-3 pt-3 pb-4">
                {/* Global Controls (sticky within panel) */}
                <div className="sticky top-0 z-10 px-3 py-2 mb-2 bg-black/35 backdrop-blur supports-[backdrop-filter]:bg-black/30 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (activeCount > 0) stopAll();
                        else playAll();
                      }}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 btn-shape text-white text-xs font-medium transition-colors ${
                        activeCount > 0
                          ? "bg-white/10 hover:bg-white/20"
                          : "bg-teal-500/80 hover:bg-teal-500"
                      }`}
                    >
                      {activeCount > 0 ? (
                        <>
                          <Square size={16} /> Stop All
                        </>
                      ) : (
                        <>
                          <Play size={16} /> Play All
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setShowResetAllModal(true)}
                      className="px-3 py-1.5 btn-shape font-medium bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 text-xs"
                    >
                      Reset All
                    </button>
                    <button
                      onClick={() => setShowDeleteAllModal(true)}
                      className="px-3 py-1.5 btn-shape font-medium bg-red-500/15 text-red-300 border border-red-500/30 hover:bg-red-500/20 text-xs"
                    >
                      Delete All
                    </button>
                  </div>
                </div>

                {/* Layer Management (Minimal Cards) - single column */}
                <div className="grid gap-3 lg:gap-4 grid-cols-1">
                  {layers.map((layer, index) => {
                    const engine = engines.current[layer.id];
                    return (
                      <motion.div
                        key={layer.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.35, delay: index * 0.04 }}
                        className="relative group"
                      >
                        <div className="relative bg-black/30 border border-white/10 rounded-xl p-3.5 hover:border-white/20 transition-colors">
                          {/* Header */}
                          <div className="flex items-center justify-between mb-2.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-teal-500/20 text-teal-300 text-xs font-medium">
                                {index + 1}
                              </span>
                              <div className="flex items-center gap-2">
                                <div className="relative">
                                  <select
                                    value={layer.type}
                                    onChange={(e) => {
                                      const newType = e.target.value as any;
                                      if (newType === layer.type) return;
                                      const old = engines.current[layer.id];
                                      const wasPlaying = layer.isPlaying;
                                      try {
                                        old?.stop();
                                        old?.dispose?.();
                                      } catch {}
                                      delete engines.current[layer.id];
                                      let patch: any = { type: newType };
                                      if (newType === "binaural") {
                                        patch = {
                                          ...patch,
                                          baseFreq: layer.baseFreq ?? 440,
                                          beatOffset: 0,
                                          wave: layer.wave || "sine",
                                          pulseFreq: undefined,
                                        };
                                      } else if (newType === "isochronic") {
                                        patch = {
                                          ...patch,
                                          baseFreq: layer.baseFreq ?? 200,
                                          pulseFreq: layer.pulseFreq ?? 10,
                                          beatOffset: undefined,
                                        };
                                      }
                                      updateLayer(layer.id, patch);
                                      const updated = useAppStore
                                        .getState()
                                        .layers.find((l) => l.id === layer.id);
                                      if (updated) {
                                        engines.current[layer.id] =
                                          createEngine(updated as SoundLayer);
                                        if (wasPlaying) {
                                          engines.current[layer.id].start();
                                          updateLayer(layer.id, {
                                            isPlaying: true,
                                          });
                                        }
                                      }
                                    }}
                                    className="bg-black/40 border border-white/15 rounded-md pl-2 pr-6 py-1 text-[11px] text-white/80 focus:outline-none focus:ring-1 focus:ring-teal-500/50 focus:border-teal-500/50 appearance-none cursor-pointer"
                                  >
                                    <option
                                      className="bg-slate-900"
                                      value="binaural"
                                    >
                                      Binaural
                                    </option>
                                    <option
                                      className="bg-slate-900"
                                      value="isochronic"
                                    >
                                      Isochronic
                                    </option>
                                  </select>
                                  <span className="pointer-events-none absolute inset-y-0 right-1 flex items-center text-white/50">
                                    <ChevronDown size={14} />
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => toggleExpanded(layer.id)}
                                  className="text-[10px] px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-white/60"
                                >
                                  {expanded[layer.id] ? "Hide" : "More"}
                                </button>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => togglePlay(layer)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
                                  layer.isPlaying
                                    ? "bg-teal-500/80 text-white"
                                    : "bg-white/5 text-white/60 hover:bg-white/10"
                                }`}
                              >
                                {layer.isPlaying ? (
                                  <>
                                    <Square size={16} />
                                    Stop
                                  </>
                                ) : (
                                  <>
                                    <Play size={16} />
                                    Play
                                  </>
                                )}
                              </button>
                              <button
                                onClick={() => {
                                  const eng = engines.current[layer.id];
                                  if (eng) {
                                    try {
                                      eng.stop();
                                    } catch {}
                                  }
                                  resetLayer(layer.id);
                                  engines.current[layer.id]?.update({
                                    baseFreq: 440,
                                    beatOffset: 0,
                                    volume: 0.5,
                                    pan: 0,
                                    wave: "sine",
                                  });
                                }}
                                className="p-1.5 btn-shape text-white/40 hover:text-amber-300 hover:bg-amber-500/10 transition-colors"
                                title="Reset layer"
                              >
                                <svg
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                >
                                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                                  <path d="M3 3v5h5" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleRemoveLayer(layer.id)}
                                className="p-1.5 btn-shape text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                title="Remove layer"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>

                          {/* Controls (Compact) */}
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-3 text-[10px]">
                              <label className="space-y-1">
                                <span className="flex justify-between items-center text-white/50">
                                  <span>Base</span>
                                  <span className="text-white/70 font-medium inline-flex items-center gap-1">
                                    <input
                                      type="number"
                                      value={layer.baseFreq ?? 440}
                                      min={1}
                                      max={5000}
                                      step={1}
                                      onChange={(e) => {
                                        const raw = parseFloat(e.target.value);
                                        const cur = layer.baseFreq ?? 440;
                                        const clamped = Math.max(
                                          1,
                                          Math.min(5000, isNaN(raw) ? cur : raw)
                                        );
                                        updateLayer(layer.id, {
                                          baseFreq: clamped,
                                        });
                                        engine?.update({ baseFreq: clamped });
                                      }}
                                      className="w-20 bg-black/40 border border-white/20 rounded-md px-2 py-1 text-[11px] text-white focus:outline-none focus:ring-1 focus:ring-teal-500/50 focus:border-teal-500/50"
                                    />
                                    Hz
                                  </span>
                                </span>
                                <input
                                  type="range"
                                  min={1}
                                  max={5000}
                                  step={1}
                                  value={layer.baseFreq}
                                  onChange={(e) => {
                                    const freq = parseInt(e.target.value);
                                    updateLayer(layer.id, { baseFreq: freq });
                                    engine?.update({ baseFreq: freq });
                                  }}
                                  className="w-full appearance-none cursor-pointer"
                                />
                              </label>
                              <label className="space-y-1">
                                <span className="flex justify-between items-center text-white/50">
                                  <span>
                                    {layer.type === "binaural"
                                      ? "Beat"
                                      : "Pulse"}
                                  </span>
                                  <span className="text-white/70 font-medium inline-flex items-center gap-1">
                                    <input
                                      type="number"
                                      value={
                                        layer.type === "binaural"
                                          ? layer.beatOffset ?? 0
                                          : layer.pulseFreq ?? 10
                                      }
                                      min={layer.type === "binaural" ? 0 : 0.5}
                                      max={1000}
                                      step={0.1}
                                      onChange={(e) => {
                                        const raw = parseFloat(e.target.value);
                                        const minVal =
                                          layer.type === "binaural" ? 0 : 0.5;
                                        const fallback =
                                          layer.type === "binaural"
                                            ? layer.beatOffset ?? 0
                                            : layer.pulseFreq ?? 10;
                                        const clamped = Math.max(
                                          minVal,
                                          Math.min(
                                            1000,
                                            isNaN(raw) ? fallback : raw
                                          )
                                        );
                                        if (layer.type === "binaural") {
                                          updateLayer(layer.id, {
                                            beatOffset: clamped,
                                          });
                                          engine?.update({
                                            beatOffset: clamped,
                                          });
                                        } else {
                                          updateLayer(layer.id, {
                                            pulseFreq: clamped,
                                          });
                                          engine?.update({
                                            pulseFreq: clamped,
                                          });
                                        }
                                      }}
                                      className="w-24 bg-black/40 border border-white/20 rounded-md px-2 py-1 text-[11px] text-white focus:outline-none focus:ring-1 focus:ring-teal-500/50 focus:border-teal-500/50"
                                    />
                                    Hz
                                  </span>
                                </span>
                                <input
                                  type="range"
                                  min={layer.type === "binaural" ? 0 : 0.5}
                                  max={1000}
                                  step={0.1}
                                  value={
                                    layer.type === "binaural"
                                      ? layer.beatOffset
                                      : layer.pulseFreq || 10
                                  }
                                  onChange={(e) => {
                                    const v = parseFloat(e.target.value);
                                    if (layer.type === "binaural") {
                                      updateLayer(layer.id, { beatOffset: v });
                                      engine?.update({ beatOffset: v });
                                    } else {
                                      updateLayer(layer.id, { pulseFreq: v });
                                      engine?.update({ pulseFreq: v });
                                    }
                                  }}
                                  className="w-full appearance-none cursor-pointer"
                                />
                              </label>
                              <label className="space-y-1">
                                <span className="flex justify-between text-white/50">
                                  <span>Vol</span>
                                  <span className="text-white/70 font-medium">
                                    {Math.round(layer.volume * 100)}%
                                  </span>
                                </span>
                                <input
                                  type="range"
                                  min={0}
                                  max={1}
                                  step={0.01}
                                  value={layer.volume}
                                  onChange={(e) => {
                                    const vol = parseFloat(e.target.value);
                                    updateLayer(layer.id, { volume: vol });
                                    engine?.update({ volume: vol });
                                  }}
                                  className="w-full appearance-none cursor-pointer"
                                />
                              </label>
                              <label className="space-y-1">
                                <span className="flex justify-between text-white/50">
                                  <span>Pan</span>
                                  <span className="text-white/70 font-medium">
                                    {layer.pan === 0
                                      ? "C"
                                      : layer.pan > 0
                                      ? "R " + Math.abs(layer.pan).toFixed(2)
                                      : "L " + Math.abs(layer.pan).toFixed(2)}
                                  </span>
                                </span>
                                <input
                                  type="range"
                                  min={-1}
                                  max={1}
                                  step={0.01}
                                  value={layer.pan || 0}
                                  onChange={(e) => {
                                    const pan = parseFloat(e.target.value);
                                    updateLayer(layer.id, { pan });
                                    engine?.update({ pan });
                                  }}
                                  className="w-full appearance-none cursor-pointer"
                                />
                              </label>
                            </div>
                            {expanded[layer.id] && (
                              <div className="pt-2 border-t border-white/5">
                                <div className="text-[10px] uppercase tracking-wide text-white/40 mb-1">
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
                                        updateLayer(layer.id, { wave: w });
                                        engine?.update({ wave: w });
                                      }}
                                      className={`flex-1 rounded-md px-1.5 py-1 text-[10px] capitalize border transition-colors ${
                                        layer.wave === w
                                          ? "bg-teal-500/80 border-teal-400 text-white"
                                          : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                                      }`}
                                    >
                                      {w === "sawtooth" ? "saw" : w}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Effects chips at bottom of layer card */}
                          {layer.effects && layer.effects.length > 0 && (
                            <div className="pt-2 mt-2 border-t border-white/5">
                              <div className="flex flex-wrap gap-1">
                                {layer.effects.map((fx: LayerEffect) => {
                                  // Color mapping per effect
                                  let bg = "bg-white/10";
                                  let text = "text-white/70";
                                  let border = "border-white/20";
                                  if (fx.kind === "noise") {
                                    if (fx.type === "white") {
                                      bg = "bg-slate-500/15";
                                      text = "text-slate-200";
                                      border = "border-slate-400/30";
                                    } else if (fx.type === "pink") {
                                      bg = "bg-rose-500/15";
                                      text = "text-rose-200";
                                      border = "border-rose-400/30";
                                    } else if (fx.type === "brown") {
                                      bg = "bg-amber-500/15";
                                      text = "text-amber-200";
                                      border = "border-amber-400/30";
                                    }
                                  }
                                  return (
                                    <span
                                      key={fx.id}
                                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] ${bg} ${text} border ${border}`}
                                    >
                                      {fx.kind === "noise"
                                        ? `${fx.type} noise`
                                        : fx.kind}
                                      <button
                                        onClick={() => {
                                          removeLayerEffect(layer.id, fx.id);
                                          const updated = useAppStore
                                            .getState()
                                            .layers.find(
                                              (l) => l.id === layer.id
                                            );
                                          if (updated) {
                                            engines.current[layer.id]?.update({
                                              effects: (updated.effects ||
                                                []) as any,
                                            });
                                          }
                                        }}
                                        className="ml-1 p-0.5 rounded hover:bg-white/10"
                                        aria-label="Remove effect"
                                      >
                                        <X size={12} />
                                      </button>
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}

                  {layers.length < 5 && (
                    <motion.button
                      type="button"
                      onClick={() => addLayer()}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{
                        duration: 0.35,
                        delay: layers.length * 0.04,
                      }}
                      className="flex h-[140px] items-center justify-center rounded-xl border-2 border-dashed border-white/10 hover:border-teal-500/40 text-white/50 hover:text-teal-300 bg-black/20 text-sm font-medium gap-2"
                    >
                      <Plus size={16} /> Add Layer ({5 - layers.length})
                    </motion.button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Reset All Modal */}
      {showResetAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-white/20 bg-black/40 backdrop-blur-xl p-6 shadow-xl">
            <h3 className="text-lg font-medium text-white mb-4">
              Reset All Layers?
            </h3>
            <p className="text-sm text-white/60 mb-6">
              This will reset all layers to their default settings. Are you
              sure?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowResetAllModal(false)}
                className="px-4 py-2 btn-shape text-sm border border-white/20 bg-white/5 hover:bg-white/10 text-white transition-all duration-200"
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
                    resetLayer(l.id);
                    engines.current[l.id]?.update({
                      baseFreq: 440,
                      beatOffset: 0,
                      volume: 0.5,
                      pan: 0,
                      wave: "sine",
                    });
                  });
                  setShowResetAllModal(false);
                }}
                className="px-4 py-2 btn-shape text-sm font-medium bg-amber-500 hover:bg-amber-400 text-white transition-all duration-200"
              >
                Reset All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Help Overlay */}
      {showHelp && (
        <div className="fixed inset-0 z-[60]" aria-labelledby="help-title">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowHelp(false)}
          />
          {/* Centered panel constrained over mixer area */}
          <div
            className="absolute inset-0 flex items-start justify-center pt-16 px-4"
            onClick={() => setShowHelp(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              className="w-full max-w-3xl rounded-2xl border border-white/15 bg-black/60 backdrop-blur-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
                <h3 id="help-title" className="text-sm font-medium text-white">
                  Help • Neural Mixer
                </h3>
                <button
                  className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10"
                  onClick={() => setShowHelp(false)}
                  aria-label="Close help"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="max-h-[70vh] overflow-y-auto px-5 py-4 space-y-3">
                {/* Accordions */}
                {[
                  {
                    title: "Global controls",
                    body: (
                      <ul className="list-disc list-inside text-white/80 text-sm space-y-1">
                        <li>
                          <b>Play/Stop All</b>: Toggles all layers. When any
                          layer is active, the button shows Stop All; otherwise
                          Play All.
                        </li>
                        <li>
                          <b>Reset All</b>: Resets each layer to defaults (freq,
                          beat/pulse, volume, pan, waveform).
                        </li>
                        <li>
                          <b>Delete All</b>: Removes all layers and stops their
                          audio engines.
                        </li>
                        <li>
                          <b>Presets</b>: Open the presets drawer to load, save,
                          or duplicate presets.
                        </li>
                        <li>
                          <b>Effects Library</b>: Open the effects drawer to
                          preview effects and add them to a specific layer.
                        </li>
                      </ul>
                    ),
                  },
                  {
                    title: "Layer controls",
                    body: (
                      <ul className="list-disc list-inside text-white/80 text-sm space-y-1">
                        <li>
                          <b>Type</b>: Choose Binaural or Isochronic per layer.
                          Switching adapts control set.
                        </li>
                        <li>
                          <b>Base</b>: Carrier frequency of the layer (Hz).
                        </li>
                        <li>
                          <b>Beat/Pulse</b>: For Binaural, the frequency offset
                          (Δ) between channels; for Isochronic, the pulse rate
                          (Hz).
                        </li>
                        <li>
                          <b>Vol</b>: Output amplitude of the layer (0–100%).
                        </li>
                        <li>
                          <b>Pan</b>: Stereo position (L/C/R).
                        </li>
                        <li>
                          <b>Waveform</b>: Oscillator shape: sine, square, saw,
                          triangle.
                        </li>
                        <li>
                          <b>Per-layer effects</b>: Applied effects are shown as
                          chips at the bottom of the card; click X to remove.
                        </li>
                      </ul>
                    ),
                  },
                  {
                    title: "Effects Library",
                    body: (
                      <ul className="list-disc list-inside text-white/80 text-sm space-y-1">
                        <li>
                          <b>Preview/Stop</b>: Toggle live preview of the
                          selected effect settings (uses its own audio context).
                        </li>
                        <li>
                          <b>Choose layer to add effect</b>: Select which layer
                          should receive the configured effect.
                        </li>
                        <li>
                          <b>Noise type</b>: White (flat spectrum), Pink (−3
                          dB/oct), Brown (−6 dB/oct) tonal balances.
                        </li>
                        <li>
                          <b>Gain</b>: Effect level. This drives the worklet
                          gain parameter, not your layer volume.
                        </li>
                        <li>
                          <b>Pan</b>: Position the effect in stereo field.
                        </li>
                        <li>
                          <b>Add to Layer</b>: Creates a per-layer effect node
                          managed by the layer engine; chips appear on the layer
                          card.
                        </li>
                      </ul>
                    ),
                  },
                  {
                    title: "Presets",
                    body: (
                      <ul className="list-disc list-inside text-white/80 text-sm space-y-1">
                        <li>
                          <b>Update Preset</b>: When a preset is loaded, save
                          changes over the same preset.
                        </li>
                        <li>
                          <b>Save As New</b>: Duplicate the current setup under
                          a new name.
                        </li>
                        <li>
                          <b>Save Preset</b>: Create a new preset when none is
                          loaded.
                        </li>
                        <li>
                          <b>Presets Drawer</b>: Load or delete saved presets;
                          summaries include counts and concise layer
                          descriptions.
                        </li>
                      </ul>
                    ),
                  },
                  {
                    title: "Visualizer",
                    body: (
                      <ul className="list-disc list-inside text-white/80 text-sm space-y-1">
                        <li>
                          <b>Orb</b>: Reflects energy/pulse from active layers
                          using analyser nodes.
                        </li>
                        <li>
                          <b>Sync</b>: The orb collects analyser data from each
                          layer engine to render composite visuals.
                        </li>
                      </ul>
                    ),
                  },
                  {
                    title: "Audio engine basics",
                    body: (
                      <ul className="list-disc list-inside text-white/80 text-sm space-y-1">
                        <li>
                          <b>Contexts</b>: Layer audio uses a shared Web Audio
                          context; effect preview uses a separate one.
                        </li>
                        <li>
                          <b>Start/Stop</b>: Engines create oscillators/gates on
                          start and tear them down on stop/dispose.
                        </li>
                        <li>
                          <b>Effects</b>: Every effect has its own node(s). When
                          you add/remove an effect, the engine reconciles:
                          creating/updating/disposing nodes and routing them to
                          output only when the layer is playing.
                        </li>
                        <li>
                          <b>Persistence</b>: Effects are saved with presets and
                          restored on load.
                        </li>
                      </ul>
                    ),
                  },
                  {
                    title: "Tips",
                    body: (
                      <ul className="list-disc list-inside text-white/80 text-sm space-y-1">
                        <li>
                          Start with modest <b>Gain</b> on noise effects and
                          adjust slowly.
                        </li>
                        <li>
                          Use <b>Pan</b> creatively to create space between
                          tonal layers and noise.
                        </li>
                        <li>
                          Save variations as presets to compare sessions
                          quickly.
                        </li>
                      </ul>
                    ),
                  },
                ].map((sec, i) => (
                  <details
                    key={i}
                    className="group rounded-xl border border-white/10 bg-white/5"
                  >
                    <summary className="cursor-pointer select-none flex items-center justify-between px-4 py-3 text-white/90 text-sm">
                      <span>{sec.title}</span>
                      <span className="text-white/50 group-open:rotate-180 transition-transform">
                        <ChevronDown size={16} />
                      </span>
                    </summary>
                    <div className="px-4 pb-4 pt-1">{sec.body}</div>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {showPresetsModal && (
        <div
          className="fixed inset-0 z-50"
          aria-labelledby="presets-drawer-title"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowPresetsModal(false)}
          />
          {/* Drawer Panel */}
          <aside
            id="presets-drawer-panel"
            className="absolute right-0 top-0 h-full w-[320px] sm:w-[360px] border-l border-white/10 bg-black/60 backdrop-blur-xl shadow-2xl"
            role="dialog"
            aria-modal="true"
          >
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                <h3
                  id="presets-drawer-title"
                  className="text-sm font-medium text-white"
                >
                  Presets
                </h3>
                <button
                  className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10"
                  onClick={() => setShowPresetsModal(false)}
                  aria-label="Close presets"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-3">
                {presets.length === 0 ? (
                  <div className="text-sm text-white/60 p-4 text-center">
                    No presets saved yet. Use "Save Preset" to store the current
                    setup.
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {presets.map((p) => (
                      <li
                        key={p.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/30 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <div className="text-sm text-white truncate">
                            {p.name}
                          </div>
                          <div className="text-[10px] text-white/60 truncate">
                            {p.layers.length} layer
                            {p.layers.length === 1 ? "" : "s"}{" "}
                            {(() => {
                              const tc = summarizeTypeCounts(p.layers);
                              return tc ? `• ${tc}` : "";
                            })()}
                          </div>
                          <div className="text-[10px] text-white/50 truncate">
                            {summarizeLayersCompact(p.layers)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            className="px-2.5 py-1.5 btn-shape text-[11px] font-medium bg-teal-500/80 hover:bg-teal-500 text-white"
                            onClick={() => {
                              loadPreset(p.id);
                              const newLayers = useAppStore.getState().layers;
                              lastLoadedSnapshot.current = JSON.stringify(
                                newLayers.map(
                                  ({ id, isPlaying, ...rest }) => rest
                                )
                              );
                              setLoadedPresetId(p.id);
                              setPresetName(p.name);
                              setShowPresetsModal(false);
                            }}
                          >
                            Load
                          </button>
                          <button
                            className="px-2.5 py-1.5 btn-shape text-[11px] font-medium bg-white/5 hover:bg-white/10 text-white/70 border border-white/10"
                            onClick={() => {
                              deletePreset(p.id);
                              if (loadedPresetId === p.id)
                                setLoadedPresetId(null);
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Effects Library Drawer */}
      {showEffectsLibrary && (
        <div
          className="fixed inset-0 z-50"
          aria-labelledby="effects-library-title"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowEffectsLibrary(false)}
          />
          {/* Panel */}
          <aside
            id="effects-library-panel"
            className="absolute right-0 top-0 h-full w-[320px] sm:w-[360px] border-l border-white/10 bg-black/60 backdrop-blur-xl shadow-2xl"
          >
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                <h3
                  id="effects-library-title"
                  className="text-sm font-medium text-white"
                >
                  Effects Library
                </h3>
                <button
                  className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10"
                  aria-label="Close effects library"
                  onClick={() => setShowEffectsLibrary(false)}
                >
                  <X size={16} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
                {/* Target Layer Select */}
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <label className="block text-[11px] text-white/70 mb-1">
                    Choose layer to add effect:
                  </label>
                  <div className="relative inline-block">
                    <select
                      value={targetLayerId || ""}
                      onChange={(e) => setTargetLayerId(e.target.value || null)}
                      className="bg-black/40 border border-white/15 rounded-md pl-2 pr-6 py-1 text-[11px] text-white/80 focus:outline-none focus:ring-1 focus:ring-teal-500/50 focus:border-teal-500/50 appearance-none cursor-pointer min-w-[180px]"
                    >
                      <option className="bg-slate-900" value="" disabled>
                        Select a layer…
                      </option>
                      {layers.map((l, i) => (
                        <option
                          className="bg-slate-900"
                          key={l.id}
                          value={l.id}
                        >
                          Layer {i + 1} • {l.type}
                        </option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute inset-y-0 right-1 flex items-center text-white/50">
                      <ChevronDown size={14} />
                    </span>
                  </div>
                </div>
                {/* Noise Generator Card */}
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="text-sm text-white font-medium">
                        Noise Generator
                      </div>
                      <div className="text-[11px] text-white/60">
                        White, Pink, and Brown noise
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="block text-[11px] text-white/70">
                      Type
                    </label>
                    <div className="relative inline-block">
                      <select
                        value={noiseType}
                        onChange={(e) => {
                          const t = e.target.value as NoiseType;
                          setNoiseType(t);
                          noiseHandleRef.current?.setType(t);
                        }}
                        className="bg-black/40 border border-white/15 rounded-md pl-2 pr-6 py-1 text-[11px] text-white/80 focus:outline-none focus:ring-1 focus:ring-teal-500/50 focus:border-teal-500/50 appearance-none cursor-pointer"
                      >
                        <option className="bg-slate-900" value="white">
                          White
                        </option>
                        <option className="bg-slate-900" value="pink">
                          Pink
                        </option>
                        <option className="bg-slate-900" value="brown">
                          Brown
                        </option>
                      </select>
                      <span className="pointer-events-none absolute inset-y-0 right-1 flex items-center text-white/50">
                        <ChevronDown size={14} />
                      </span>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] text-white/60">
                        <span>Gain</span>
                        <span className="text-white/80 font-medium">
                          {Math.round(noiseGain * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={noiseGain}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          setNoiseGain(v);
                          noiseHandleRef.current?.setGain(v);
                        }}
                        className="w-full appearance-none cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] text-white/60">
                        <span>Pan</span>
                        <span className="text-white/80 font-medium">
                          {noisePan === 0
                            ? "C"
                            : noisePan > 0
                            ? `R ${Math.abs(noisePan).toFixed(2)}`
                            : `L ${Math.abs(noisePan).toFixed(2)}`}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={-1}
                        max={1}
                        step={0.01}
                        value={noisePan}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          setNoisePan(v);
                          noiseHandleRef.current?.setPan(v);
                        }}
                        className="w-full appearance-none cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => {
                          if (noiseHandleRef.current) {
                            stopNoisePreview();
                          } else {
                            ensureNoisePreviewStarted();
                          }
                        }}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 btn-shape text-white text-xs font-medium transition-colors ${
                          noiseHandleRef.current
                            ? "bg-white/10 hover:bg-white/20"
                            : "bg-teal-500/80 hover:bg-teal-500"
                        }`}
                      >
                        {noiseHandleRef.current ? (
                          <>
                            <Square size={16} /> Stop
                          </>
                        ) : (
                          <>
                            <Play size={16} /> Preview
                          </>
                        )}
                      </button>
                      <button
                        disabled={!targetLayerId}
                        onClick={() => {
                          if (!targetLayerId) return;
                          const effect = {
                            id: crypto.randomUUID(),
                            kind: "noise" as const,
                            type: noiseType,
                            gain: noiseGain,
                            pan: noisePan,
                          };
                          addLayerEffect(targetLayerId, effect);
                          // notify engine about effects change
                          const updated = useAppStore
                            .getState()
                            .layers.find((l) => l.id === targetLayerId);
                          if (updated) {
                            engines.current[targetLayerId]?.update({
                              effects: updated.effects as any,
                            });
                          }
                        }}
                        className="inline-flex items-center gap-2 px-3 py-1.5 btn-shape bg-amber-500/80 hover:bg-amber-500 text-white text-xs font-medium transition-colors disabled:opacity-40"
                      >
                        <Plus size={16} /> Add to Layer
                      </button>
                    </div>
                  </div>
                </div>

                {/* Placeholder for future effects */}
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="text-[11px] text-white/60">
                    More effects coming soon…
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Save As New Modal */}
      {showSaveAsModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowSaveAsModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-white/20 bg-black/40 backdrop-blur-xl p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-medium text-white">
                Save As New Preset
              </h3>
              <button
                className="p-2 btn-shape text-white/60 hover:text-white hover:bg-white/10"
                onClick={() => setShowSaveAsModal(false)}
                aria-label="Close save as modal"
              >
                <X size={16} />
              </button>
            </div>
            <label className="block text-sm text-white/70 mb-2">
              Preset name
            </label>
            <input
              value={saveAsName}
              onChange={(e) => setSaveAsName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const nm = (saveAsName || "Unnamed Preset").trim();
                  if (!nm) return;
                  savePreset(nm);
                  const st = useAppStore.getState();
                  const created = st.presets.find(
                    (p) => p.name.toLowerCase() === nm.toLowerCase()
                  );
                  if (created) {
                    setLoadedPresetId(created.id);
                    setPresetName(created.name);
                    lastLoadedSnapshot.current = JSON.stringify(
                      layerSnapshot()
                    );
                  }
                  setShowSaveAsModal(false);
                } else if (e.key === "Escape") {
                  setShowSaveAsModal(false);
                }
              }}
              className="w-full bg-black/40 border border-white/20 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 backdrop-blur-sm"
              placeholder="Preset name"
              autoFocus
            />
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setShowSaveAsModal(false)}
                className="px-4 py-2 btn-shape text-sm border border-white/20 bg-white/5 hover:bg-white/10 text-white transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const nm = (saveAsName || "Unnamed Preset").trim();
                  if (!nm) return;
                  savePreset(nm);
                  const st = useAppStore.getState();
                  const created = st.presets.find(
                    (p) => p.name.toLowerCase() === nm.toLowerCase()
                  );
                  if (created) {
                    setLoadedPresetId(created.id);
                    setPresetName(created.name);
                    lastLoadedSnapshot.current = JSON.stringify(
                      layerSnapshot()
                    );
                  }
                  setShowSaveAsModal(false);
                }}
                className="px-4 py-2 rounded-xl text-[12px] font-medium bg-amber-500 hover:bg-amber-400 text-white transition-all duration-200"
              >
                Save Preset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete All Modal */}
      {showDeleteAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-white/20 bg-black/40 backdrop-blur-xl p-6 shadow-xl">
            <h3 className="text-lg font-medium text-white mb-4">
              Delete All Layers?
            </h3>
            <p className="text-sm text-white/60 mb-6">
              This will remove all layers permanently. You cannot undo this
              action.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteAllModal(false)}
                className="px-4 py-2 rounded-xl text-sm border border-white/20 bg-white/5 hover:bg-white/10 text-white transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // Stop and dispose engines, then clear store layers
                  layers.forEach((l) => {
                    const e = engines.current[l.id];
                    if (e) {
                      try {
                        e.stop();
                        e.dispose?.();
                      } catch {}
                    }
                    delete engines.current[l.id];
                  });
                  clearLayers();
                  setShowDeleteAllModal(false);
                }}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-red-500 hover:bg-red-400 text-white transition-all duration-200"
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
