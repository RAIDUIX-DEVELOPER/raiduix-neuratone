"use client";
import { useAppStore } from "@/lib/store";
import { SoundLayer, createEngine } from "@/lib/audioEngine";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Play, Square, Plus, Trash2 } from "lucide-react";

interface EngineDataProvider {
  getWaveformData?: (arr: Uint8Array) => void;
  getFrequencyData?: (arr: Uint8Array) => void;
}
function Visualizers({
  getEngines,
  showWave,
  showSpec,
}: {
  getEngines: () => (EngineDataProvider | null)[];
  showWave: boolean;
  showSpec: boolean;
}) {
  const waveRef = useRef<HTMLCanvasElement | null>(null);
  const specRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    let raf: number;
    // Allow either canvas to be missing depending on toggles
    const waveCanvas = showWave ? waveRef.current : null;
    const specCanvas = showSpec ? specRef.current : null;
    const wCtx = waveCanvas ? waveCanvas.getContext("2d") : null;
    const sCtx = specCanvas ? specCanvas.getContext("2d") : null;
    // If both displays are disabled, skip starting loop
    if (!showWave && !showSpec) return;
    // If a requested display lacks its canvas or context, wait until next render (user toggled quickly)
    if (
      (showWave && (!waveCanvas || !wCtx)) ||
      (showSpec && (!specCanvas || !sCtx))
    )
      return;
    const wfLen = 1024;
    const mixedWave = new Float32Array(wfLen);
    const tempWave = new Uint8Array(wfLen);
    const mixedFreq = new Float32Array(1024);
    const tempFreq = new Uint8Array(1024);
    const FRAME_INTERVAL = 1000 / 24; // 24 FPS target (slower)
    let lastFrame = 0;
    function draw(ts?: number) {
      if (ts && ts - lastFrame < FRAME_INTERVAL) {
        raf = requestAnimationFrame(draw);
        return;
      }
      if (ts) lastFrame = ts;
      const engines = getEngines().filter((e) => e) as EngineDataProvider[];
      if (engines.length === 0) {
        if (showWave && wCtx && waveCanvas)
          wCtx.clearRect(0, 0, waveCanvas.width, waveCanvas.height);
        if (showSpec && sCtx && specCanvas)
          sCtx.clearRect(0, 0, specCanvas.width, specCanvas.height);
        raf = requestAnimationFrame(draw);
        return;
      }
      mixedWave.fill(0);
      mixedFreq.fill(0);
      let activeWaveCount = 0;
      let activeFreqCount = 0;
      for (const eng of engines) {
        if (eng.getWaveformData) {
          eng.getWaveformData(tempWave);
          // convert to -1..1 then accumulate
          for (let i = 0; i < wfLen; i++) {
            mixedWave[i] += (tempWave[i] - 128) / 128;
          }
          activeWaveCount++;
        }
        if (eng.getFrequencyData) {
          eng.getFrequencyData(tempFreq);
          for (let i = 0; i < tempFreq.length; i++) {
            mixedFreq[i] += tempFreq[i];
          }
          activeFreqCount++;
        }
      }
      if (activeWaveCount > 0) {
        const inv = 1 / activeWaveCount;
        for (let i = 0; i < wfLen; i++) mixedWave[i] *= inv;
      }
      if (activeFreqCount > 0) {
        const invF = 1 / activeFreqCount;
        for (let i = 0; i < mixedFreq.length; i++) mixedFreq[i] *= invF;
      }
      if (showWave && wCtx && waveCanvas) {
        wCtx.clearRect(0, 0, waveCanvas.width, waveCanvas.height);
        wCtx.lineWidth = 2;
        wCtx.strokeStyle = "#14b8a6";
        wCtx.beginPath();
        for (let i = 0; i < wfLen; i++) {
          const x = (i / (wfLen - 1)) * waveCanvas.width;
          const v = mixedWave[i];
          const y = waveCanvas.height / 2 + v * (waveCanvas.height / 2 - 4);
          if (i === 0) wCtx.moveTo(x, y);
          else wCtx.lineTo(x, y);
        }
        wCtx.stroke();
      }
      if (showSpec && sCtx && specCanvas) {
        const h = specCanvas.height;
        const w = specCanvas.width;
        const imageData = sCtx.getImageData(1, 0, w - 1, h);
        sCtx.putImageData(imageData, 0, 0);
        for (let y = 0; y < h; y++) {
          const bin = Math.floor((y / h) * mixedFreq.length);
          const val = mixedFreq[bin];
          const hue = 180 + (val / 255) * 120;
          sCtx.fillStyle = `hsl(${hue} 70% ${30 + (val / 255) * 50}%)`;
          sCtx.fillRect(w - 1, h - 1 - y, 1, 1);
        }
      }
      raf = requestAnimationFrame(draw);
    }
    draw();
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
  } = useAppStore((s) => ({
    layers: s.layers,
    updateLayer: s.updateLayer,
    savePreset: s.savePreset,
    addLayer: s.addLayer,
    removeLayer: s.removeLayer,
    presets: s.presets,
    loadPreset: s.loadPreset,
    deletePreset: (s as any).deletePreset,
  }));
  const [presetName, setPresetName] = useState("");
  const engines = useRef<EngineRef>({});
  const [showWave, setShowWave] = useState(true);
  const [showSpec, setShowSpec] = useState(true);
  const [pendingPresetName, setPendingPresetName] = useState<string | null>(
    null
  );
  const [showOverwriteModal, setShowOverwriteModal] = useState(false);
  const [presetToDelete, setPresetToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  useEffect(() => {
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
    layers.forEach((l) => {
      if (!engines.current[l.id]) engines.current[l.id] = createEngine(l);
    });
  }, [layers]);

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
    const layer = layers.find((l) => l.id === id);
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
    // Remove from store afterwards so effect cleanup is minimal
    removeLayer(id);
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (presetName.trim()) {
            const exists = presets.some(
              (p) => p.name.toLowerCase() === presetName.trim().toLowerCase()
            );
            if (exists) {
              setPendingPresetName(presetName.trim());
              setShowOverwriteModal(true);
            } else {
              savePreset(presetName.trim());
              setPresetName("");
            }
          }
        }}
        className="flex gap-2 items-end flex-wrap w-full"
      >
        <div className="flex flex-col">
          <label className="text-[10px] uppercase tracking-wide">
            Save Preset
          </label>
          <input
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            placeholder="Name"
            className="border rounded px-2 py-1 text-xs"
          />
        </div>
        <button
          type="submit"
          className="bg-teal-500 text-white text-xs px-3 py-1 rounded self-start mt-4 disabled:opacity-40"
          disabled={!presetName.trim()}
        >
          Save
        </button>
        <div className="flex gap-2 ml-auto mt-4">
          <button
            type="button"
            onClick={playAll}
            className="px-3 py-1 rounded bg-slate-700/60 hover:bg-slate-600/60 text-xs font-medium text-slate-200 border border-slate-600/50"
          >
            Play All
          </button>
          <button
            type="button"
            onClick={stopAll}
            className="px-3 py-1 rounded bg-slate-700/60 hover:bg-slate-600/60 text-xs font-medium text-slate-200 border border-slate-600/50"
          >
            Stop All
          </button>
          <button
            type="button"
            onClick={() => setShowWave((v) => !v)}
            className={`px-3 py-1 rounded text-xs font-medium border border-slate-600/50 ${
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
            className={`px-3 py-1 rounded text-xs font-medium border border-slate-600/50 ${
              showSpec
                ? "bg-teal-600/70 text-white"
                : "bg-slate-700/60 text-slate-200 hover:bg-slate-600/60"
            }`}
          >
            {showSpec ? "Hide Spec" : "Show Spec"}
          </button>
        </div>
      </form>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {layers.map((layer, idx) => (
          <motion.div
            key={layer.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="card rounded-lg p-4 w-full min-w-[230px] bg-[#121826]/70 border border-slate-700/40"
          >
            <h3 className="text-sm font-semibold mb-3 text-slate-200 flex items-center justify-between">
              <span>Frequency {idx + 1}</span>
              <button
                onClick={() => togglePlay(layer)}
                className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium transition ${
                  layer.isPlaying
                    ? "bg-teal-500/90 text-white"
                    : "bg-slate-700/60 text-slate-200 hover:bg-slate-600/60"
                }`}
              >
                {layer.isPlaying ? <Square size={12} /> : <Play size={12} />}
                {layer.isPlaying ? "Stop" : "Play"}
              </button>
              <button
                onClick={() => handleRemoveLayer(layer.id)}
                className="ml-2 text-slate-500 hover:text-red-400 transition"
                aria-label="Remove layer"
              >
                <Trash2 size={14} />
              </button>
            </h3>
            <div className="space-y-3">
              <div>
                <div className="flex items-stretch mb-2">
                  <div className="flex-1 text-center rounded-md bg-[#121826] border border-slate-700/60 py-2 text-slate-200 text-sm font-medium">
                    {layer.baseFreq}{" "}
                    <span className="text-[10px] font-normal">Hz</span>
                  </div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1000}
                  value={layer.baseFreq}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    updateLayer(layer.id, { baseFreq: v });
                    engines.current[layer.id]?.update({ baseFreq: v });
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
                    value={layer.baseFreq}
                    onChange={(e) => {
                      const v = Math.max(
                        0,
                        Math.min(1000, Number(e.target.value))
                      );
                      updateLayer(layer.id, { baseFreq: v });
                      engines.current[layer.id]?.update({ baseFreq: v });
                    }}
                    className="w-24 rounded border border-slate-700/60 bg-slate-900/40 px-2 py-1 text-xs"
                  />
                  <span className="text-[10px] text-slate-400">Manual</span>
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide mb-1 text-slate-400">
                  Waveform
                </div>
                <div className="flex gap-1">
                  {(["sine", "square", "sawtooth", "triangle"] as const).map(
                    (w) => (
                      <button
                        key={w}
                        onClick={() => {
                          updateLayer(layer.id, { wave: w });
                          engines.current[layer.id]?.update({ wave: w });
                        }}
                        className={`flex-1 rounded-md px-2 py-1 text-[10px] capitalize border transition ${
                          layer.wave === w
                            ? "bg-teal-500/90 border-teal-400 text-white"
                            : "bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-700/60"
                        }`}
                        type="button"
                      >
                        {w.replace("sawtooth", "saw")}
                      </button>
                    )
                  )}
                </div>
              </div>
              <div>
                <label className="block text-[10px] mb-1 uppercase tracking-wide text-slate-400">
                  Volume {Math.round(layer.volume * 100)}%
                </label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={layer.volume}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    updateLayer(layer.id, { volume: v });
                    engines.current[layer.id]?.update({ volume: v });
                  }}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-[10px] mb-1 uppercase tracking-wide text-slate-400">
                  Pan {layer.pan}
                </label>
                <input
                  type="range"
                  min={-1}
                  max={1}
                  step={0.01}
                  value={layer.pan}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    updateLayer(layer.id, { pan: v });
                    engines.current[layer.id]?.update({ pan: v });
                  }}
                  className="w-full"
                />
              </div>
            </div>
          </motion.div>
        ))}
        {layers.length < 5 && (
          <button
            type="button"
            onClick={() => addLayer({})}
            className="rounded-lg border-2 border-dashed border-slate-600/40 hover:border-teal-500/60 text-slate-400 hover:text-teal-400 flex items-center justify-center min-h-[260px] bg-slate-900/30"
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              <Plus size={16} /> Add Layer
            </span>
          </button>
        )}
      </div>
      <Visualizers
        getEngines={() => layers.map((l) => engines.current[l.id] || null)}
        showWave={showWave}
        showSpec={showSpec}
      />
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
              <div className="flex gap-2">
                <button
                  onClick={() => loadPreset(p.id)}
                  className="flex-1 text-[11px] bg-teal-600/80 hover:bg-teal-500 text-white rounded px-2 py-1 font-medium"
                >
                  Load
                </button>
                <button
                  onClick={() => setPresetToDelete({ id: p.id, name: p.name })}
                  className="px-2 py-1 rounded bg-red-600/80 hover:bg-red-500 text-white font-medium inline-flex items-center justify-center"
                  title="Delete preset"
                  aria-label={`Delete preset ${p.name}`}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
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
    </div>
  );
}
