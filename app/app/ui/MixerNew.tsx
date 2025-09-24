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
  Shuffle,
  Eye,
  EyeOff,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Save,
  FolderOpen,
  SlidersHorizontal,
  HelpCircle,
  PanelLeftClose,
  PanelLeftOpen,
  Minus,
  Check,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { SoundLayer, createEngine, type LayerEffect } from "@/lib/audioEngine";
import OrbVisualizer from "./OrbVisualizer";
import PixabayBackgroundPanel, {
  type SelectPayload as PixabaySelect,
} from "./PixabayBackgroundPanel";
import {
  createNoiseNode,
  type NoiseType,
  type NoiseNodeHandle,
  createAutoPanNode,
  type AutoPanNodeHandle,
} from "@/lib/effects";
import {
  createRingModNode,
  type RingModNodeHandle,
} from "@/lib/effects/ringmod";
import {
  createTremoloNode,
  type TremoloNodeHandle,
} from "@/lib/effects/tremolo";
import { createChorusNode, type ChorusNodeHandle } from "@/lib/effects/chorus";
import {
  createFlangerNode,
  type FlangerNodeHandle,
} from "@/lib/effects/flanger";
import { createPhaserNode, type PhaserNodeHandle } from "@/lib/effects/phaser";
import {
  createPingPongDelayNode,
  type PingPongDelayNodeHandle,
} from "@/lib/effects/pingpong";
import {
  createCombFilterNode,
  type CombFilterNodeHandle,
} from "@/lib/effects/combfilter";
import {
  createAcidFilterNode,
  type AcidFilterNodeHandle,
} from "@/lib/effects/acidfilter";
import {
  createGateEffectNode,
  type GateEffectNodeHandle,
} from "@/lib/effects/gate";
import {
  createHarmonicExciterNode,
  type HarmonicExciterNodeHandle,
} from "@/lib/effects/harmonicexciter";

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
  const [noiseLpf, setNoiseLpf] = useState<number>(20000);
  const [noiseAutopanHz, setNoiseAutopanHz] = useState<number>(0);
  const [noiseAutopanDepth, setNoiseAutopanDepth] = useState<number>(0);
  const [targetLayerId, setTargetLayerId] = useState<string | null>(null);
  // Preview state tracking
  const [isNoisePreviewActive, setIsNoisePreviewActive] = useState(false);
  // Recently added effects feedback
  const [recentlyAddedEffects, setRecentlyAddedEffects] = useState<Set<string>>(
    new Set()
  );

  const noiseCtxRef = useRef<AudioContext | null>(null);
  const noiseHandleRef = useRef<NoiseNodeHandle | null>(null);
  // AutoPan effect state
  const [autoPanRate, setAutoPanRate] = useState<number>(0.2);
  const [autoPanDepth, setAutoPanDepth] = useState<number>(0.8);
  const autoPanCtxRef = useRef<AudioContext | null>(null);
  const autoPanHandleRef = useRef<AutoPanNodeHandle | null>(null);
  // Ring Mod effect state
  const [ringModFrequency, setRingModFrequency] = useState<number>(30);
  const [ringModIntensity, setRingModIntensity] = useState<number>(0.5);
  const ringModCtxRef = useRef<AudioContext | null>(null);
  const ringModHandleRef = useRef<RingModNodeHandle | null>(null);
  // Tremolo effect state
  const [tremoloRate, setTremoloRate] = useState<number>(4);
  const [tremoloDepth, setTremoloDepth] = useState<number>(0.5);
  const tremoloCtxRef = useRef<AudioContext | null>(null);
  const tremoloHandleRef = useRef<TremoloNodeHandle | null>(null);
  // Chorus effect state
  const [chorusRate, setChorusRate] = useState<number>(0.5);
  const [chorusDepth, setChorusDepth] = useState<number>(10);
  const [chorusMix, setChorusMix] = useState<number>(50);
  const chorusCtxRef = useRef<AudioContext | null>(null);
  const chorusHandleRef = useRef<ChorusNodeHandle | null>(null);
  // Flanger effect state
  const [flangerRate, setFlangerRate] = useState<number>(0.5);
  const [flangerDepth, setFlangerDepth] = useState<number>(2);
  const [flangerFeedback, setFlangerFeedback] = useState<number>(50);
  const [flangerMix, setFlangerMix] = useState<number>(50);
  const flangerCtxRef = useRef<AudioContext | null>(null);
  const flangerHandleRef = useRef<FlangerNodeHandle | null>(null);
  // Phaser effect state
  const [phaserRate, setPhaserRate] = useState<number>(0.5);
  const [phaserDepth, setPhaserDepth] = useState<number>(100);
  const [phaserStages, setPhaserStages] = useState<number>(4);
  const [phaserMix, setPhaserMix] = useState<number>(50);
  const phaserCtxRef = useRef<AudioContext | null>(null);
  const phaserHandleRef = useRef<PhaserNodeHandle | null>(null);
  // Ping Pong Delay effect state
  const [pingpongTime, setPingpongTime] = useState<number>(250);
  const [pingpongFeedback, setPingpongFeedback] = useState<number>(30);
  const [pingpongMix, setPingpongMix] = useState<number>(30);
  const pingpongCtxRef = useRef<AudioContext | null>(null);
  const pingpongHandleRef = useRef<PingPongDelayNodeHandle | null>(null);
  // Comb Filter effect state
  const [combfilterFrequency, setCombfilterFrequency] = useState<number>(440);
  const [combfilterResonance, setCombfilterResonance] = useState<number>(50);
  const [combfilterMix, setCombfilterMix] = useState<number>(50);
  const combfilterCtxRef = useRef<AudioContext | null>(null);
  const combfilterHandleRef = useRef<CombFilterNodeHandle | null>(null);
  // Acid Filter effect state
  const [acidfilterCutoff, setAcidfilterCutoff] = useState<number>(1000);
  const [acidfilterResonance, setAcidfilterResonance] = useState<number>(15);
  const [acidfilterLfoRate, setAcidfilterLfoRate] = useState<number>(0.5);
  const [acidfilterLfoDepth, setAcidfilterLfoDepth] = useState<number>(500);
  const [acidfilterMix, setAcidfilterMix] = useState<number>(100);
  const acidfilterCtxRef = useRef<AudioContext | null>(null);
  const acidfilterHandleRef = useRef<AcidFilterNodeHandle | null>(null);
  // Gate effect state
  const [gateRate, setGateRate] = useState<number>(4);
  const [gateThreshold, setGateThreshold] = useState<number>(50);
  const [gateAttack, setGateAttack] = useState<number>(10);
  const [gateRelease, setGateRelease] = useState<number>(100);
  const [gateMix, setGateMix] = useState<number>(100);
  const gateCtxRef = useRef<AudioContext | null>(null);
  const gateHandleRef = useRef<GateEffectNodeHandle | null>(null);
  // Harmonic Exciter effect state
  const [harmonicDrive, setHarmonicDrive] = useState<number>(30);
  const [harmonicHarmonics, setHarmonicHarmonics] = useState<number>(50);
  const [harmonicTone, setHarmonicTone] = useState<number>(50);
  const [harmonicMix, setHarmonicMix] = useState<number>(50);
  const harmonicCtxRef = useRef<AudioContext | null>(null);
  const harmonicHandleRef = useRef<HarmonicExciterNodeHandle | null>(null);
  // ...removed Pixabay audio search state (deprecated)
  const [saveAsName, setSaveAsName] = useState("");
  const [loadedPresetId, setLoadedPresetId] = useState<string | null>(null);
  const lastLoadedSnapshot = useRef<string>("[]");
  // Removed: expandable layer sections; waveform is always visible
  // Mobile: active layer tab selection
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);
  // Mobile: measure bottom tabs height to avoid overlap with scroll panel
  const tabsRef = useRef<HTMLDivElement | null>(null);
  // Header: measure height to size the main content to viewport minus header
  const headerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    // Ensure we always have a valid active layer on mobile
    if (!activeLayerId && layers.length > 0) {
      setActiveLayerId(layers[0].id);
    } else if (
      activeLayerId &&
      layers.length > 0 &&
      !layers.find((l) => l.id === activeLayerId)
    ) {
      setActiveLayerId(layers[0].id);
    }
  }, [layers, activeLayerId]);
  // Keep a CSS var --mobile-tabs-h in sync with actual tabs height
  useEffect(() => {
    // CSS Vars used across responsive layout:
    //  --app-header-h: The measured height of the top header. We subtract this
    //     from the viewport height to size the main grid.
    //  --mobile-tabs-h: The measured height of the sticky mobile tabs so the
    //     scrollable panel reserves bottom space and avoids overlap.
    const updateVars = () => {
      const isDesktop =
        typeof window !== "undefined" && window.innerWidth >= 640; // sm breakpoint
      const tabsH = isDesktop ? 0 : tabsRef.current?.offsetHeight ?? 0;
      const headerH = headerRef.current?.offsetHeight ?? 0;
      document.documentElement.style.setProperty(
        "--mobile-tabs-h",
        `${tabsH}px`
      );
      document.documentElement.style.setProperty(
        "--app-header-h",
        `${headerH}px`
      );
    };
    updateVars();
    // Defer another update to catch post-mount layout
    if (typeof window !== "undefined") {
      requestAnimationFrame(updateVars);
      setTimeout(updateVars, 50);
    }
    let roTabs: ResizeObserver | null = null;
    let roHeader: ResizeObserver | null = null;
    if (typeof window !== "undefined") {
      roTabs = new ResizeObserver(updateVars);
      roHeader = new ResizeObserver(updateVars);
      if (tabsRef.current) roTabs.observe(tabsRef.current);
      if (headerRef.current) roHeader.observe(headerRef.current);
      window.addEventListener("resize", updateVars);
      window.addEventListener("orientationchange", updateVars);
    }
    return () => {
      try {
        roTabs?.disconnect();
        roHeader?.disconnect();
      } catch {}
      if (typeof window !== "undefined") {
        window.removeEventListener("resize", updateVars);
        window.removeEventListener("orientationchange", updateVars);
      }
      document.documentElement.style.removeProperty("--mobile-tabs-h");
      document.documentElement.style.removeProperty("--app-header-h");
    };
  }, []);
  const activeCount = layers.filter((l) => l.isPlaying).length;
  const didAutoloadRef = useRef(false);
  // Background picker UI state
  const [bgMedia, setBgMedia] = useState<null | {
    kind: "image" | "video";
    src: string;
  }>(null);
  const [showBgPanel, setShowBgPanel] = useState(false);
  const [bgHidden, setBgHidden] = useState(false);
  const [showVisualizer, setShowVisualizer] = useState(true);
  const bgVideoRef = useRef<HTMLVideoElement | null>(null);
  const [videoMuted, setVideoMuted] = useState(true);
  const fsContainerRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  // Mobile: collapse/expand left visualizer container
  const [mixerCollapsed, setMixerCollapsed] = useState(false);

  // Keep video element's mute state in sync and handle play/pause
  useEffect(() => {
    const v = bgVideoRef.current;
    if (v) v.muted = videoMuted;
  }, [videoMuted]);
  useEffect(() => {
    const v = bgVideoRef.current;
    if (!v) return;
    if (bgHidden) {
      try {
        v.pause();
      } catch {}
    } else if (!videoMuted) {
      v.play().catch(() => {});
    }
  }, [bgHidden, videoMuted]);

  // Fullscreen state sync
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  async function toggleFullscreen() {
    try {
      if (!document.fullscreenElement) {
        await fsContainerRef.current?.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (e) {
      console.warn("Fullscreen toggle failed", e);
    }
  }

  async function randomizeBackground(kind?: "images" | "videos") {
    try {
      const imageChips = [
        "space",
        "forest",
        "ocean",
        "mountains",
        "city",
        "abstract",
        "nebula",
        "sunset",
      ];
      const videoChips = [
        "space",
        "waves",
        "clouds",
        "rain",
        "city night",
        "stars",
        "aurora",
        "timelapse",
      ];
      const selectedKind = kind || (Math.random() < 0.5 ? "images" : "videos");
      const term = (selectedKind === "images" ? imageChips : videoChips)[
        Math.floor(
          Math.random() *
            (selectedKind === "images" ? imageChips.length : videoChips.length)
        )
      ];
      const endpoint =
        selectedKind === "images"
          ? "/api/pixabay/images"
          : "/api/pixabay/videos";
      const url = new URL(endpoint, window.location.origin);
      url.searchParams.set("q", term);
      url.searchParams.set("per_page", "50");
      const r = await fetch(url.toString());
      const data = await r.json();
      const hits: any[] = Array.isArray(data?.hits) ? data.hits : [];
      if (!hits.length) return;
      const hit = hits[Math.floor(Math.random() * hits.length)];
      if (selectedKind === "images") {
        const src = hit.largeImageURL || hit.webformatURL || hit.previewURL;
        if (src) {
          setBgMedia({ kind: "image", src });
          setBgHidden(false);
        }
      } else {
        const videos = hit.videos || {};
        const src =
          videos.medium?.url ||
          videos.small?.url ||
          videos.large?.url ||
          videos.tiny?.url;
        if (src) {
          setBgMedia({ kind: "video", src });
          setBgHidden(false);
        }
      }
    } catch (e) {
      console.warn("Randomize background failed", e);
    }
  }

  // ...removed Pixabay audio search function (deprecated)

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
        lpfHz: noiseLpf,
        autopanHz: noiseAutopanHz,
        autopanDepth: noiseAutopanDepth,
      });
      handle.connect(ctx.destination);
      noiseHandleRef.current = handle;
    } else {
      noiseHandleRef.current.setType(noiseType);
      noiseHandleRef.current.setGain(noiseGain);
      noiseHandleRef.current.setPan(noisePan);
      noiseHandleRef.current.setLpf(noiseLpf);
      if (noiseAutopanHz > 0 && noiseAutopanDepth > 0) {
        noiseHandleRef.current.startAutoPan(noiseAutopanHz, noiseAutopanDepth);
      } else {
        noiseHandleRef.current.stopAutoPan();
      }
    }
    setIsNoisePreviewActive(true);
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
    setIsNoisePreviewActive(false);
  }

  // AutoPan effect preview lifecycle
  async function ensureAutoPanPreviewStarted() {
    if (!autoPanCtxRef.current) {
      const Ctor = (window.AudioContext ||
        (window as any).webkitAudioContext) as typeof AudioContext;
      autoPanCtxRef.current = new Ctor();
    }
    const ctx = autoPanCtxRef.current!;
    try {
      await ctx.resume();
    } catch {}
    if (!autoPanHandleRef.current) {
      const handle = await createAutoPanNode(ctx, {
        rate: autoPanRate,
        depth: autoPanDepth,
      });
      handle.connect(ctx.destination);
      autoPanHandleRef.current = handle;
    } else {
      autoPanHandleRef.current.setRate(autoPanRate);
      autoPanHandleRef.current.setDepth(autoPanDepth);
    }
  }
  function stopAutoPanPreview() {
    const h = autoPanHandleRef.current;
    try {
      h?.disconnect();
    } catch {}
    try {
      h?.dispose();
    } catch {}
    autoPanHandleRef.current = null;
  }

  // Ring Mod effect preview lifecycle
  async function ensureRingModPreviewStarted() {
    if (!ringModCtxRef.current) {
      const Ctor = (window.AudioContext ||
        (window as any).webkitAudioContext) as typeof AudioContext;
      ringModCtxRef.current = new Ctor();
    }
    const ctx = ringModCtxRef.current!;
    try {
      await ctx.resume();
    } catch {}
    if (!ringModHandleRef.current) {
      const handle = await createRingModNode(ctx, {
        frequency: ringModFrequency,
        intensity: ringModIntensity,
      });
      handle.connect(ctx.destination);
      handle.start();
      ringModHandleRef.current = handle;
    } else {
      ringModHandleRef.current.setFrequency(ringModFrequency);
      ringModHandleRef.current.setIntensity(ringModIntensity);
    }
  }
  function stopRingModPreview() {
    const h = ringModHandleRef.current;
    try {
      h?.disconnect();
    } catch {}
    try {
      h?.dispose();
    } catch {}
    ringModHandleRef.current = null;
  }

  // Tremolo effect preview lifecycle
  function ensureTremoloPreviewStarted() {
    if (!tremoloCtxRef.current) {
      const Ctor = (window.AudioContext ||
        (window as any).webkitAudioContext) as typeof AudioContext;
      tremoloCtxRef.current = new Ctor();
    }
    const ctx = tremoloCtxRef.current!;
    try {
      ctx.resume();
    } catch {}
    if (!tremoloHandleRef.current) {
      const handle = createTremoloNode(ctx, tremoloRate, tremoloDepth * 100);

      // Create a test oscillator to hear the tremolo effect
      const osc = ctx.createOscillator();
      osc.frequency.value = 440; // A4 note for testing
      osc.type = "sine";

      // Connect: osc -> tremolo -> destination
      osc.connect(handle.inputGain);
      handle.outputGain.connect(ctx.destination);

      osc.start();
      handle.start();

      tremoloHandleRef.current = handle;
    } else {
      tremoloHandleRef.current.setRate(tremoloRate);
      tremoloHandleRef.current.setDepth(tremoloDepth * 100);
    }
  }
  function stopTremoloPreview() {
    const h = tremoloHandleRef.current;
    try {
      h?.outputGain?.disconnect();
    } catch {}
    try {
      h?.dispose();
    } catch {}
    tremoloHandleRef.current = null;
  }

  // Chorus effect preview lifecycle
  function ensureChorusPreviewStarted() {
    if (!chorusCtxRef.current) {
      const Ctor = (window.AudioContext ||
        (window as any).webkitAudioContext) as typeof AudioContext;
      chorusCtxRef.current = new Ctor();
    }
    const ctx = chorusCtxRef.current!;
    try {
      ctx.resume();
    } catch {}
    if (!chorusHandleRef.current) {
      const handle = createChorusNode(ctx, chorusRate, chorusDepth, chorusMix);

      // Create a test oscillator to hear the chorus effect
      const osc = ctx.createOscillator();
      osc.frequency.value = 440; // A4 note for testing
      osc.type = "sine";

      // Connect: osc -> chorus -> destination
      osc.connect(handle.inputGain);
      handle.outputGain.connect(ctx.destination);

      osc.start();
      handle.start();

      chorusHandleRef.current = handle;
    } else {
      chorusHandleRef.current.setRate(chorusRate);
      chorusHandleRef.current.setDepth(chorusDepth);
      chorusHandleRef.current.setMix(chorusMix);
    }
  }
  function stopChorusPreview() {
    const h = chorusHandleRef.current;
    try {
      h?.outputGain?.disconnect();
    } catch {}
    try {
      h?.dispose();
    } catch {}
    chorusHandleRef.current = null;
  }

  // Flanger effect preview lifecycle
  function ensureFlangerPreviewStarted() {
    if (!flangerCtxRef.current) {
      const Ctor = (window.AudioContext ||
        (window as any).webkitAudioContext) as typeof AudioContext;
      flangerCtxRef.current = new Ctor();
    }
    const ctx = flangerCtxRef.current!;
    try {
      ctx.resume();
    } catch {}
    if (!flangerHandleRef.current) {
      const handle = createFlangerNode(
        ctx,
        flangerRate,
        flangerDepth,
        flangerFeedback,
        flangerMix
      );

      // Create a test oscillator to hear the flanger effect
      const osc = ctx.createOscillator();
      osc.frequency.value = 440; // A4 note for testing
      osc.type = "sine";

      // Connect: osc -> flanger -> destination
      osc.connect(handle.inputGain);
      handle.outputGain.connect(ctx.destination);

      osc.start();
      handle.start();

      flangerHandleRef.current = handle;
    } else {
      flangerHandleRef.current.setRate(flangerRate);
      flangerHandleRef.current.setDepth(flangerDepth);
      flangerHandleRef.current.setFeedback(flangerFeedback);
      flangerHandleRef.current.setMix(flangerMix);
    }
  }
  function stopFlangerPreview() {
    const h = flangerHandleRef.current;
    try {
      h?.outputGain?.disconnect();
    } catch {}
    try {
      h?.dispose();
    } catch {}
    flangerHandleRef.current = null;
  }

  // Phaser effect preview lifecycle
  function ensurePhaserPreviewStarted() {
    if (!phaserCtxRef.current) {
      const Ctor = (window.AudioContext ||
        (window as any).webkitAudioContext) as typeof AudioContext;
      phaserCtxRef.current = new Ctor();
    }
    const ctx = phaserCtxRef.current!;
    try {
      ctx.resume();
    } catch {}
    if (!phaserHandleRef.current) {
      const handle = createPhaserNode(
        ctx,
        phaserRate,
        phaserDepth,
        phaserStages,
        phaserMix
      );

      // Create a test oscillator to hear the phaser effect
      const osc = ctx.createOscillator();
      osc.frequency.value = 440; // A4 note for testing
      osc.type = "sawtooth"; // Sawtooth works well with phaser

      // Connect: osc -> phaser -> destination
      osc.connect(handle.inputGain);
      handle.outputGain.connect(ctx.destination);

      osc.start();
      handle.start();

      phaserHandleRef.current = handle;
    } else {
      phaserHandleRef.current.setRate(phaserRate);
      phaserHandleRef.current.setDepth(phaserDepth);
      phaserHandleRef.current.setStages(phaserStages);
      phaserHandleRef.current.setMix(phaserMix);
    }
  }
  function stopPhaserPreview() {
    const h = phaserHandleRef.current;
    try {
      h?.outputGain?.disconnect();
    } catch {}
    try {
      h?.dispose();
    } catch {}
    phaserHandleRef.current = null;
  }

  // Ping Pong Delay effect preview lifecycle
  function ensurePingPongPreviewStarted() {
    if (!pingpongCtxRef.current) {
      const Ctor = (window.AudioContext ||
        (window as any).webkitAudioContext) as typeof AudioContext;
      pingpongCtxRef.current = new Ctor();
    }
    const ctx = pingpongCtxRef.current!;
    try {
      ctx.resume();
    } catch {}
    if (!pingpongHandleRef.current) {
      const handle = createPingPongDelayNode(
        ctx,
        pingpongTime,
        pingpongFeedback,
        pingpongMix
      );

      // Create a test oscillator to hear the ping pong delay effect
      const osc = ctx.createOscillator();
      osc.frequency.value = 880; // Higher pitch for delay testing
      osc.type = "square"; // Square wave works well with delay

      // Connect: osc -> delay -> destination
      osc.connect(handle.inputGain);
      handle.outputGain.connect(ctx.destination);

      osc.start();
      handle.start();

      pingpongHandleRef.current = handle;
    } else {
      pingpongHandleRef.current.setTime(pingpongTime);
      pingpongHandleRef.current.setFeedback(pingpongFeedback);
      pingpongHandleRef.current.setMix(pingpongMix);
    }
  }
  function stopPingPongPreview() {
    const h = pingpongHandleRef.current;
    try {
      h?.outputGain?.disconnect();
    } catch {}
    try {
      h?.dispose();
    } catch {}
    pingpongHandleRef.current = null;
  }

  // Comb Filter effect preview lifecycle
  function ensureCombFilterPreviewStarted() {
    if (!combfilterCtxRef.current) {
      const Ctor = (window.AudioContext ||
        (window as any).webkitAudioContext) as typeof AudioContext;
      combfilterCtxRef.current = new Ctor();
    }
    const ctx = combfilterCtxRef.current!;
    try {
      ctx.resume();
    } catch {}
    if (!combfilterHandleRef.current) {
      const handle = createCombFilterNode(
        ctx,
        combfilterFrequency,
        combfilterResonance,
        combfilterMix
      );

      // Create a test oscillator to hear the comb filter effect
      const osc = ctx.createOscillator();
      osc.frequency.value = 220; // Lower frequency for comb filter testing
      osc.type = "sawtooth"; // Sawtooth has harmonics that work well with comb filtering

      // Connect: osc -> comb filter -> destination
      osc.connect(handle.inputGain);
      handle.outputGain.connect(ctx.destination);

      osc.start();
      handle.start();

      combfilterHandleRef.current = handle;
    } else {
      combfilterHandleRef.current.setFrequency(combfilterFrequency);
      combfilterHandleRef.current.setResonance(combfilterResonance);
      combfilterHandleRef.current.setMix(combfilterMix);
    }
  }
  function stopCombFilterPreview() {
    const h = combfilterHandleRef.current;
    try {
      h?.outputGain?.disconnect();
    } catch {}
    try {
      h?.dispose();
    } catch {}
    combfilterHandleRef.current = null;
  }

  // Acid Filter effect preview lifecycle
  function ensureAcidFilterPreviewStarted() {
    if (!acidfilterCtxRef.current) {
      const Ctor = (window.AudioContext ||
        (window as any).webkitAudioContext) as typeof AudioContext;
      acidfilterCtxRef.current = new Ctor();
    }
    const ctx = acidfilterCtxRef.current!;
    try {
      ctx.resume();
    } catch {}
    if (!acidfilterHandleRef.current) {
      const handle = createAcidFilterNode(
        ctx,
        acidfilterCutoff,
        acidfilterResonance,
        acidfilterLfoRate,
        acidfilterLfoDepth,
        acidfilterMix
      );

      // Create a test oscillator for the classic acid sound
      const osc = ctx.createOscillator();
      osc.frequency.value = 110; // Lower bass frequency for acid effect
      osc.type = "sawtooth"; // Classic acid waveform

      // Connect: osc -> acid filter -> destination
      osc.connect(handle.inputGain);
      handle.outputGain.connect(ctx.destination);

      osc.start();
      handle.start();

      acidfilterHandleRef.current = handle;
    } else {
      acidfilterHandleRef.current.setCutoff(acidfilterCutoff);
      acidfilterHandleRef.current.setResonance(acidfilterResonance);
      acidfilterHandleRef.current.setLfoRate(acidfilterLfoRate);
      acidfilterHandleRef.current.setLfoDepth(acidfilterLfoDepth);
      acidfilterHandleRef.current.setMix(acidfilterMix);
    }
  }
  function stopAcidFilterPreview() {
    const h = acidfilterHandleRef.current;
    try {
      h?.outputGain?.disconnect();
    } catch {}
    try {
      h?.dispose();
    } catch {}
    acidfilterHandleRef.current = null;
  }

  // Gate effect preview lifecycle
  function ensureGatePreviewStarted() {
    if (!gateCtxRef.current) {
      const Ctor = (window.AudioContext ||
        (window as any).webkitAudioContext) as typeof AudioContext;
      gateCtxRef.current = new Ctor();
    }
    const ctx = gateCtxRef.current!;
    try {
      ctx.resume();
    } catch {}
    if (!gateHandleRef.current) {
      const handle = createGateEffectNode(
        ctx as any,
        gateRate,
        gateThreshold,
        gateAttack,
        gateRelease,
        gateMix
      );

      // Create a test oscillator for the gate effect
      const osc = ctx.createOscillator();
      osc.frequency.value = 150; // Mid-bass frequency for gate testing
      osc.type = "sawtooth"; // Rich harmonics work well with gating

      // Connect: osc -> gate -> destination
      osc.connect(handle.inputGain);
      handle.outputGain.connect(ctx.destination);

      osc.start();
      handle.start();

      gateHandleRef.current = handle;
    } else {
      gateHandleRef.current.setRate(gateRate);
      gateHandleRef.current.setThreshold(gateThreshold);
      gateHandleRef.current.setAttack(gateAttack);
      gateHandleRef.current.setRelease(gateRelease);
      gateHandleRef.current.setMix(gateMix);
    }
  }
  function stopGatePreview() {
    const h = gateHandleRef.current;
    try {
      h?.outputGain?.disconnect();
    } catch {}
    try {
      h?.dispose();
    } catch {}
    gateHandleRef.current = null;
  }

  // Harmonic Exciter effect preview lifecycle
  function ensureHarmonicExciterPreviewStarted() {
    if (!harmonicCtxRef.current) {
      const Ctor = (window.AudioContext ||
        (window as any).webkitAudioContext) as typeof AudioContext;
      harmonicCtxRef.current = new Ctor();
    }
    const ctx = harmonicCtxRef.current!;
    try {
      ctx.resume();
    } catch {}
    if (!harmonicHandleRef.current) {
      const handle = createHarmonicExciterNode(
        ctx as any,
        harmonicDrive,
        harmonicHarmonics,
        harmonicTone,
        harmonicMix
      );

      // Create a test oscillator with harmonic content for exciter testing
      const osc = ctx.createOscillator();
      osc.frequency.value = 200; // Base frequency with harmonics
      osc.type = "sawtooth"; // Rich harmonic content to excite

      // Connect: osc -> harmonic exciter -> destination
      osc.connect(handle.inputGain);
      handle.outputGain.connect(ctx.destination);

      osc.start();
      handle.start();

      harmonicHandleRef.current = handle;
    } else {
      harmonicHandleRef.current.setDrive(harmonicDrive);
      harmonicHandleRef.current.setHarmonics(harmonicHarmonics);
      harmonicHandleRef.current.setTone(harmonicTone);
      harmonicHandleRef.current.setMix(harmonicMix);
    }
  }
  function stopHarmonicExciterPreview() {
    const h = harmonicHandleRef.current;
    try {
      h?.outputGain?.disconnect();
    } catch {}
    try {
      h?.dispose();
    } catch {}
    harmonicHandleRef.current = null;
  }

  // Cleanup on close/unmount
  useEffect(() => {
    if (!showEffectsLibrary) {
      stopNoisePreview();
      stopAutoPanPreview();
      stopRingModPreview();
      stopTremoloPreview();
      stopChorusPreview();
      stopFlangerPreview();
      stopPhaserPreview();
      stopPingPongPreview();
      stopCombFilterPreview();
      stopAcidFilterPreview();
      stopGatePreview();
      stopHarmonicExciterPreview();
    }
    return () => {
      stopNoisePreview();
      stopAutoPanPreview();
      stopRingModPreview();
      stopTremoloPreview();
      stopChorusPreview();
      stopFlangerPreview();
      stopPhaserPreview();
      stopPingPongPreview();
      stopCombFilterPreview();
      stopAcidFilterPreview();
      stopGatePreview();
      stopHarmonicExciterPreview();
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
    <div className="w-full min-h-[100svh] px-0 flex flex-col">
      {/* Top Header: Preset controls (title/edit/save) + Presets button */}
      <header
        ref={headerRef}
        className="px-4 py-2 bg-black/40 backdrop-blur supports-[backdrop-filter]:bg-black/35 border-b border-white/10"
      >
        <div className="flex items-center justify-between gap-2 min-w-0">
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
                className="bg-black/40 border border-white/20 rounded-xl px-3 py-2 text-base font-light text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 backdrop-blur-sm max-w-[60vw] sm:max-w-none"
              />
            ) : (
              <div className="flex items-center gap-3">
                <h1 className="text-base lg:text-lg font-light text-white/90 tracking-wide truncate max-w-[50vw] sm:max-w-[20rem]">
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
          <div className="flex items-center gap-1 sm:gap-2 whitespace-nowrap">
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
                className="px-2.5 py-1.5 btn-shape font-medium text-[11px] bg-teal-500/20 text-teal-300 border border-teal-500/30 hover:bg-teal-500/30 disabled:opacity-40 inline-flex items-center gap-1"
              >
                <Save size={14} />
                <span className="hidden sm:inline">Update Preset</span>
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
                className="px-2.5 py-1.5 btn-shape font-medium text-[11px] bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 disabled:opacity-40 inline-flex items-center gap-1"
              >
                <Save size={14} />
                <span className="hidden sm:inline">Save As New</span>
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
                className="px-2.5 py-1.5 btn-shape font-medium text-[11px] bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 disabled:opacity-40 inline-flex items-center gap-1"
              >
                <Save size={14} />
                <span className="hidden sm:inline">Save Preset</span>
              </button>
            )}
            <button
              onClick={() => setShowPresetsModal((v) => !v)}
              aria-expanded={showPresetsModal}
              aria-controls="presets-drawer-panel"
              className={`inline-flex items-center gap-1 sm:gap-2 px-2.5 py-1.5 btn-shape text-white text-xs font-medium transition-colors border ${
                showPresetsModal
                  ? "bg-white/15 border-white/30"
                  : "bg-white/5 hover:bg-white/10 border-white/10"
              }`}
            >
              {showPresetsModal ? (
                <>
                  <X size={14} />
                  <span className="hidden sm:inline">Close Presets</span>
                </>
              ) : (
                <>
                  <FolderOpen size={14} />
                  <span className="hidden sm:inline">Open Presets</span>
                </>
              )}
            </button>
            <button
              onClick={() => setShowEffectsLibrary((v) => !v)}
              aria-expanded={showEffectsLibrary}
              aria-controls="effects-library-panel"
              className={`inline-flex items-center gap-1 sm:gap-2 px-2.5 py-1.5 btn-shape text-white text-xs font-medium transition-colors border ${
                showEffectsLibrary
                  ? "bg-white/15 border-white/30"
                  : "bg-white/5 hover:bg-white/10 border-white/10"
              }`}
            >
              {showEffectsLibrary ? (
                <>
                  <X size={14} />
                  <span className="hidden sm:inline">Close Effects</span>
                </>
              ) : (
                <>
                  <SlidersHorizontal size={14} />
                  <span className="hidden sm:inline">Effects Library</span>
                </>
              )}
            </button>

            {/* Help pill button */}
            <button
              onClick={() => setShowHelp(true)}
              className="inline-flex items-center gap-1 sm:gap-2 px-2.5 py-1.5 rounded-full bg-white/10 hover:bg-white/15 text-white text-xs font-medium border border-white/10"
              aria-label="Open help"
            >
              <HelpCircle size={14} />
              <span className="hidden sm:inline">Help</span>
            </button>

            {/* Mobile only: collapse/expand visualizer */}
            <button
              onClick={() => setMixerCollapsed((v) => !v)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-white/10 hover:bg-white/15 text-white text-xs font-medium border border-white/10 sm:hidden"
              aria-label={
                mixerCollapsed ? "Show visualizer" : "Hide visualizer"
              }
              title={mixerCollapsed ? "Show visualizer" : "Hide visualizer"}
            >
              {mixerCollapsed ? (
                <PanelLeftOpen size={14} />
              ) : (
                <PanelLeftClose size={14} />
              )}
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 min-h-0">
        <div
          className="grid grid-rows-[auto_1fr] sm:grid-rows-[auto_1fr] md:grid-rows-1 md:grid-cols-[5fr_3fr] lg:grid-cols-[7fr_3fr] xl:grid-cols-[3fr_1fr] w-full gap-0 min-h-0 min-w-0"
          style={{
            maxHeight: "calc(100svh - var(--app-header-h, 0px))",
            minHeight: "calc(100svh - var(--app-header-h, 0px))",
          }}
        >
          {/* Left: Orb (75vw, 100vh) */}
          <div
            className={`${
              mixerCollapsed ? "hidden sm:block" : "block"
            } relative w-full h-[30vh] xs:h-[35vh] sm:h-[40vh] md:h-auto md:min-h-[400px] lg:min-h-[450px] xl:min-h-[480px] min-w-0`}
          >
            <div
              ref={fsContainerRef}
              className="relative h-full overflow-hidden"
              style={{
                backgroundColor: "rgba(0,0,0,0.15)",
                backgroundImage:
                  "radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), radial-gradient(rgba(255,255,255,0.02) 1px, transparent 1px)",
                backgroundSize: "22px 22px, 22px 22px",
                backgroundPosition: "0 0, 11px 11px",
              }}
            >
              {/* Background media rendered behind Orb */}
              {!bgHidden && bgMedia?.kind === "image" && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={bgMedia.src}
                  alt="Ambient background visual for audio mixing interface"
                  className="absolute inset-0 w-full h-full object-cover z-0"
                  style={{ filter: "brightness(0.6)", pointerEvents: "none" }}
                />
              )}
              {!bgHidden && bgMedia?.kind === "video" && (
                <video
                  ref={bgVideoRef}
                  src={bgMedia.src}
                  autoPlay
                  muted={videoMuted}
                  loop
                  playsInline
                  onLoadedMetadata={() => {
                    if (!videoMuted && !bgHidden) {
                      bgVideoRef.current?.play().catch(() => {});
                    }
                  }}
                  className="absolute inset-0 w-full h-full object-cover z-0"
                  style={{ filter: "brightness(0.6)", pointerEvents: "none" }}
                />
              )}
              {/* Subtle top-left title overlay */}
              <div
                className="absolute left-2 right-2 sm:left-4 sm:right-4 flex items-center gap-2 sm:gap-3 text-white/80 z-20 pointer-events-auto"
                style={{ top: "max(0.75rem, env(safe-area-inset-top))" }}
              >
                {/* Title + count (show on md+), compact count on small screens */}
                <div className="hidden md:flex items-center gap-3">
                  <div className="text-lg font-medium tracking-wide text-white/90">
                    Neural Mixer
                  </div>
                  <span className="h-4 w-px bg-white/15" />
                  <div className="text-xs uppercase tracking-wider text-teal-300/90">
                    {activeCount}/{layers.length} layers active
                  </div>
                </div>
                <div className="md:hidden text-xs text-white/80">
                  {activeCount}/{layers.length}
                </div>
                <div className="ml-auto flex flex-wrap items-center gap-1.5 sm:gap-2 pointer-events-auto">
                  <button
                    onClick={() => setShowBgPanel((v) => !v)}
                    className="px-2.5 py-1.5 rounded-md bg-white/10 hover:bg-white/15 text-white text-xs border border-white/15"
                    aria-label="Change background"
                    title="Change background"
                  >
                    <span className="hidden sm:inline">Change background</span>
                    <span className="sm:hidden">BG</span>
                  </button>
                  <button
                    onClick={() => randomizeBackground()}
                    className="px-2.5 py-1.5 rounded-md bg-white/10 hover:bg-white/15 text-white text-xs border border-white/15 inline-flex items-center gap-1"
                    aria-label="Randomize background"
                    title="Randomize background"
                  >
                    <Shuffle size={14} />
                    <span className="hidden sm:inline">Random</span>
                  </button>
                  <button
                    onClick={() => setBgHidden((v) => !v)}
                    className="px-2.5 py-1.5 rounded-md bg-white/10 hover:bg-white/15 text-white text-xs border border-white/15 inline-flex items-center gap-1"
                    aria-label="Toggle background visibility"
                    title={bgHidden ? "Show background" : "Hide background"}
                  >
                    {bgHidden ? <Eye size={14} /> : <EyeOff size={14} />}
                    <span className="hidden sm:inline">BG</span>
                  </button>
                  <button
                    onClick={() => setShowVisualizer((v) => !v)}
                    className="px-2.5 py-1.5 rounded-md bg-white/10 hover:bg-white/15 text-white text-xs border border-white/15 inline-flex items-center gap-1"
                    aria-label="Toggle mixer visualizer"
                    title={
                      showVisualizer ? "Hide visualizer" : "Show visualizer"
                    }
                  >
                    {showVisualizer ? <EyeOff size={14} /> : <Eye size={14} />}
                    <span className="hidden sm:inline">Mixer</span>
                  </button>
                  <button
                    onClick={toggleFullscreen}
                    className="px-2.5 py-1.5 rounded-md bg-white/10 hover:bg-white/15 text-white text-xs border border-white/15 inline-flex items-center gap-1"
                    aria-label={
                      isFullscreen ? "Exit fullscreen" : "Enter fullscreen"
                    }
                    title={
                      isFullscreen ? "Exit fullscreen" : "Enter fullscreen"
                    }
                  >
                    {isFullscreen ? (
                      <Minimize2 size={14} />
                    ) : (
                      <Maximize2 size={14} />
                    )}
                    <span className="hidden sm:inline">Fullscreen</span>
                  </button>
                  {bgMedia?.kind === "video" && (
                    <button
                      onClick={() => {
                        setVideoMuted((m) => !m);
                        // On unmute, attempt to start playback via user gesture
                        if (videoMuted) {
                          setTimeout(
                            () => bgVideoRef.current?.play().catch(() => {}),
                            0
                          );
                        }
                      }}
                      className="px-2.5 py-1.5 rounded-md bg-white/10 hover:bg-white/15 text-white text-xs border border-white/15 inline-flex items-center gap-1"
                      aria-label={
                        videoMuted
                          ? "Unmute background video"
                          : "Mute background video"
                      }
                      title={videoMuted ? "Unmute video" : "Mute video"}
                    >
                      {videoMuted ? (
                        <VolumeX size={14} />
                      ) : (
                        <Volume2 size={14} />
                      )}{" "}
                      Audio
                    </button>
                  )}
                </div>
              </div>

              {showVisualizer && (
                <div className="absolute inset-0 z-10">
                  <OrbVisualizer
                    getEngines={() => layers.map((l) => engines.current[l.id])}
                    fit
                  />
                </div>
              )}

              {/* Pixabay library panel mounted inside mixer container */}
              <PixabayBackgroundPanel
                visible={showBgPanel}
                onClose={() => setShowBgPanel(false)}
                onSelect={(p: PixabaySelect) => {
                  setBgMedia({ kind: p.kind, src: p.src });
                  setShowBgPanel(false);
                }}
              />
            </div>
          </div>

          {/* Mobile tabs moved inside the right panel scroller (sticky at bottom) */}

          {/* Right: Control Panel (25vw, 100vh, single column) */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="relative w-full min-h-0 min-w-0"
          >
            <div
              className="relative h-full overflow-hidden border-l border-white/10 min-w-0"
              style={{
                backgroundColor: "rgba(5,8,20,0.9)",
                backgroundImage:
                  "radial-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), radial-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(180deg, rgba(2,6,23,0.9) 0%, rgba(3,7,18,0.92) 100%)",
                backgroundSize: "22px 22px, 22px 22px, auto",
                backgroundPosition: "0 0, 11px 11px, 0 0",
              }}
            >
              <div
                className="overflow-y-auto overflow-x-hidden px-0 sm:px-3 md:px-4 lg:px-4 pt-0 pb-0 h-full"
                style={{
                  height: "100%",
                  overscrollBehavior: "contain",
                }}
              >
                {/* Global Controls (sticky within panel) */}
                <div
                  className="sticky z-10 px-0 sm:px-3 md:px-4 lg:px-4 py-2 mb-2 bg-black/35 backdrop-blur supports-[backdrop-filter]:bg-black/30 border-b border-white/10"
                  style={{ top: "env(safe-area-inset-top)" }}
                >
                  <div className="flex items-center justify-center gap-2">
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
                <div className="grid gap-0 sm:gap-2 md:gap-3 lg:gap-3 xl:gap-4 grid-cols-1">
                  {/* On mobile, only the active layer card is visible (others hidden via class). On sm+ all show. */}
                  {layers.length === 0 && (
                    <div className="mx-3 sm:mx-4 rounded-xl border border-white/10 bg-white/5 p-3 text-white/60 text-sm">
                      No layers yet. Use the + tab below to add one.
                    </div>
                  )}
                  {layers.map((layer, index) => {
                    const engine = engines.current[layer.id];
                    return (
                      <motion.div
                        key={layer.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.35, delay: index * 0.04 }}
                        className={`relative group ${
                          layer.id === activeLayerId
                            ? "block sm:block"
                            : "hidden sm:block"
                        }`}
                      >
                        <div
                          role="region"
                          aria-label={`Layer ${index + 1} controls`}
                          className="mx-0 relative bg-gradient-to-br from-black/30 via-black/25 to-black/20 border border-white/10 rounded-none sm:rounded-2xl md:rounded-3xl p-0 pb-3 hover:border-white/25 hover:shadow-xl hover:shadow-black/20 transition-all duration-300 w-full overflow-hidden max-w-full backdrop-blur-sm"
                        >
                          {/* Header */}
                          <div className="flex flex-wrap items-center justify-between gap-3 md:gap-3 mb-4 md:mb-5 lg:mb-3 xl:mb-3 min-w-0 p-4 lg:p-3 xl:p-3 bg-white/[0.02] border-b border-white/5">
                            <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
                              <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-gradient-to-br from-teal-500/25 to-teal-600/20 text-teal-200 text-[10px] font-bold border border-teal-400/20 shadow-inner p-[5px]">
                                {index + 1}
                              </span>
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
                                      engines.current[layer.id] = createEngine(
                                        updated as SoundLayer
                                      );
                                      if (wasPlaying) {
                                        engines.current[layer.id].start();
                                        updateLayer(layer.id, {
                                          isPlaying: true,
                                        });
                                      }
                                    }
                                  }}
                                  className="bg-black/50 border border-white/25 hover:border-white/35 rounded-lg pl-3 pr-8 h-9 min-w-[6rem] text-xs md:text-xs lg:text-xs xl:text-xs text-white/90 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/60 focus:border-teal-500/70 appearance-none cursor-pointer transition-all duration-150"
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
                              {/* Removed 'More' toggle */}
                            </div>
                            <div className="flex items-center gap-2 w-full sm:w-auto justify-end min-w-0">
                              <button
                                onClick={() => togglePlay(layer)}
                                className={`inline-flex items-center justify-center p-2 rounded-lg transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 ${
                                  layer.isPlaying
                                    ? "bg-teal-500/90 hover:bg-teal-500 text-white shadow-lg shadow-teal-500/25"
                                    : "bg-white/8 text-white/70 hover:bg-white/15 hover:text-white/90 border border-white/15 hover:border-white/25"
                                }`}
                                title={
                                  layer.isPlaying ? "Stop layer" : "Play layer"
                                }
                                aria-label={
                                  layer.isPlaying ? "Stop layer" : "Play layer"
                                }
                              >
                                {layer.isPlaying ? (
                                  <Square size={16} />
                                ) : (
                                  <Play size={16} />
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
                                className="p-2.5 sm:p-2 rounded-lg text-white/50 hover:text-amber-300 hover:bg-amber-500/15 border border-white/10 hover:border-amber-500/30 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50"
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
                                className="p-2.5 sm:p-2 rounded-lg text-white/50 hover:text-red-400 hover:bg-red-500/15 border border-white/10 hover:border-red-500/30 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50"
                                title="Remove layer"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>

                          {/* Controls (Enhanced layout with better visual hierarchy) */}
                          <div className="space-y-4 md:space-y-5 lg:space-y-3 xl:space-y-3 min-w-0 max-w-full px-4 lg:px-3 xl:px-3">
                            {/* Frequency Controls Section */}
                            <div className="space-y-3 text-[10px] min-w-0 max-w-full bg-gradient-to-br from-black/15 to-black/5 rounded-xl p-4 md:p-4 lg:p-3 xl:p-3 border border-white/8 backdrop-blur-sm">
                              <div className="space-y-2 min-w-0 max-w-full">
                                <div className="flex flex-wrap items-center justify-between gap-2 text-white/60">
                                  <label
                                    id={`baseLabel-${layer.id}`}
                                    htmlFor={`base-${layer.id}`}
                                    className="text-[11px] md:text-[10px] lg:text-[9px] xl:text-[9px] font-medium uppercase tracking-wider"
                                  >
                                    Base Freq
                                  </label>
                                  <div className="text-white/80 font-medium inline-flex items-center gap-1 md:gap-2 lg:gap-1 xl:gap-1 shrink min-w-0 flex-wrap">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const cur = layer.baseFreq ?? 440;
                                        const next = Math.max(
                                          1,
                                          Math.min(5000, cur - 5)
                                        );
                                        updateLayer(layer.id, {
                                          baseFreq: next,
                                        });
                                        engine?.update({ baseFreq: next });
                                      }}
                                      className="inline-flex items-center justify-center h-7 w-7 md:h-8 md:w-8 lg:h-7 lg:w-7 xl:h-7 xl:w-7 rounded-lg bg-white/8 hover:bg-white/15 border border-white/20 hover:border-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 transition-all duration-150"
                                      aria-label="Decrease base frequency by 5 Hz"
                                      title="-5 Hz"
                                    >
                                      <Minus size={14} />
                                    </button>
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
                                      id={`base-${layer.id}`}
                                      inputMode="decimal"
                                      autoComplete="off"
                                      autoCorrect="off"
                                      spellCheck={false}
                                      className="w-16 sm:w-18 md:w-20 lg:w-20 xl:w-22 min-w-[4rem] max-w-[6rem] bg-black/50 border border-white/25 hover:border-white/35 rounded-lg px-1.5 py-1.5 text-xs md:text-xs lg:text-xs xl:text-xs text-white text-center tabular-nums font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/60 focus:border-teal-500/70 transition-all duration-150"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const cur = layer.baseFreq ?? 440;
                                        const next = Math.max(
                                          1,
                                          Math.min(5000, cur + 5)
                                        );
                                        updateLayer(layer.id, {
                                          baseFreq: next,
                                        });
                                        engine?.update({ baseFreq: next });
                                      }}
                                      className="inline-flex items-center justify-center h-7 w-7 md:h-8 md:w-8 lg:h-7 lg:w-7 xl:h-7 xl:w-7 rounded-lg bg-white/8 hover:bg-white/15 border border-white/20 hover:border-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 transition-all duration-150"
                                      aria-label="Increase base frequency by 5 Hz"
                                      title="+5 Hz"
                                    >
                                      <Plus size={16} />
                                    </button>
                                    <span className="select-none">Hz</span>
                                  </div>
                                </div>
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
                                  id={`baseRange-${layer.id}`}
                                  aria-labelledby={`baseLabel-${layer.id}`}
                                  className="w-full h-2 appearance-none cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 rounded-full bg-white/15 hover:bg-white/20 transition-colors duration-150"
                                  style={{ touchAction: "pan-y" }}
                                />
                              </div>
                              <div className="space-y-2 min-w-0 max-w-full">
                                <div className="flex flex-wrap items-center justify-between gap-2 text-white/60">
                                  <label
                                    id={`beatpulseLabel-${layer.id}`}
                                    htmlFor={`beatpulse-${layer.id}`}
                                    className="text-[11px] md:text-[10px] lg:text-[9px] xl:text-[9px] font-medium uppercase tracking-wider"
                                  >
                                    {layer.type === "binaural"
                                      ? "Beat Freq"
                                      : "Pulse Freq"}
                                  </label>
                                  <div className="text-white/80 font-medium inline-flex items-center gap-1 md:gap-2 lg:gap-1 xl:gap-1 shrink min-w-0 flex-wrap">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const cur =
                                          layer.type === "binaural"
                                            ? layer.beatOffset ?? 0
                                            : layer.pulseFreq ?? 10;
                                        const next =
                                          layer.type === "binaural"
                                            ? Math.max(
                                                0,
                                                Math.min(1000, cur - 0.5)
                                              )
                                            : Math.max(
                                                0.5,
                                                Math.min(1000, cur - 0.5)
                                              );
                                        if (layer.type === "binaural") {
                                          updateLayer(layer.id, {
                                            beatOffset: next,
                                          });
                                          engine?.update({ beatOffset: next });
                                        } else {
                                          updateLayer(layer.id, {
                                            pulseFreq: next,
                                          });
                                          engine?.update({ pulseFreq: next });
                                        }
                                      }}
                                      className="inline-flex items-center justify-center h-7 w-7 md:h-8 md:w-8 lg:h-7 lg:w-7 xl:h-7 xl:w-7 rounded-lg bg-white/8 hover:bg-white/15 border border-white/20 hover:border-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 transition-all duration-150"
                                      aria-label={
                                        layer.type === "binaural"
                                          ? "Decrease beat by 0.5 Hz"
                                          : "Decrease pulse by 0.5 Hz"
                                      }
                                      title="-0.5 Hz"
                                    >
                                      <Minus size={16} />
                                    </button>
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
                                      id={`beatpulse-${layer.id}`}
                                      inputMode="decimal"
                                      autoComplete="off"
                                      autoCorrect="off"
                                      spellCheck={false}
                                      className="w-16 sm:w-18 md:w-20 lg:w-22 xl:w-24 min-w-[4rem] max-w-[6rem] bg-black/50 border border-white/25 hover:border-white/35 rounded-lg px-1.5 py-1.5 text-xs md:text-xs lg:text-xs xl:text-xs text-white text-center tabular-nums font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/60 focus:border-teal-500/70 transition-all duration-150"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const cur =
                                          layer.type === "binaural"
                                            ? layer.beatOffset ?? 0
                                            : layer.pulseFreq ?? 10;
                                        const next = Math.max(
                                          layer.type === "binaural" ? 0 : 0.5,
                                          Math.min(1000, cur + 0.5)
                                        );
                                        if (layer.type === "binaural") {
                                          updateLayer(layer.id, {
                                            beatOffset: next,
                                          });
                                          engine?.update({ beatOffset: next });
                                        } else {
                                          updateLayer(layer.id, {
                                            pulseFreq: next,
                                          });
                                          engine?.update({ pulseFreq: next });
                                        }
                                      }}
                                      className="inline-flex items-center justify-center h-7 w-7 md:h-8 md:w-8 lg:h-7 lg:w-7 xl:h-7 xl:w-7 rounded-lg bg-white/8 hover:bg-white/15 border border-white/20 hover:border-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 transition-all duration-150"
                                      aria-label={
                                        layer.type === "binaural"
                                          ? "Increase beat by 0.5 Hz"
                                          : "Increase pulse by 0.5 Hz"
                                      }
                                      title="+0.5 Hz"
                                    >
                                      <Plus size={16} />
                                    </button>
                                    <span className="select-none">Hz</span>
                                  </div>
                                </div>
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
                                  id={`beatpulseRange-${layer.id}`}
                                  aria-labelledby={`beatpulseLabel-${layer.id}`}
                                  className="w-full appearance-none cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-teal-500/40 rounded"
                                  style={{ touchAction: "pan-y" }}
                                />
                              </div>
                            </div>
                            {/* Volume & Pan Controls Section */}
                            <div className="space-y-3 text-[10px] min-w-0 max-w-full bg-gradient-to-br from-black/15 to-black/5 rounded-xl p-4 md:p-4 lg:p-3 xl:p-3 border border-white/8 backdrop-blur-sm">
                              <div className="space-y-2 min-w-0 max-w-full">
                                <div className="flex justify-between text-white/70">
                                  <label
                                    id={`volLabel-${layer.id}`}
                                    htmlFor={`volRange-${layer.id}`}
                                    className="text-[11px] md:text-[10px] lg:text-[9px] xl:text-[9px] font-medium uppercase tracking-wider"
                                  >
                                    Volume
                                  </label>
                                  <div className="text-white/80 font-semibold whitespace-nowrap tabular-nums text-xs">
                                    {Math.round(layer.volume * 100)}%
                                  </div>
                                </div>
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
                                  id={`volRange-${layer.id}`}
                                  aria-labelledby={`volLabel-${layer.id}`}
                                  className="w-full h-2 appearance-none cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 rounded-full bg-white/15 hover:bg-white/20 transition-colors duration-150"
                                  style={{ touchAction: "pan-y" }}
                                />
                              </div>
                              <div className="space-y-2 min-w-0 max-w-full">
                                <div className="flex justify-between text-white/70">
                                  <label
                                    id={`panLabel-${layer.id}`}
                                    htmlFor={`panRange-${layer.id}`}
                                    className="text-[11px] md:text-[10px] lg:text-[9px] xl:text-[9px] font-medium uppercase tracking-wider"
                                  >
                                    Stereo Pan
                                  </label>
                                  <div className="text-white/80 font-semibold whitespace-nowrap tabular-nums text-xs">
                                    {layer.pan === 0
                                      ? "CENTER"
                                      : layer.pan > 0
                                      ? "R " + Math.abs(layer.pan).toFixed(2)
                                      : "L " + Math.abs(layer.pan).toFixed(2)}
                                  </div>
                                </div>
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
                                  id={`panRange-${layer.id}`}
                                  aria-labelledby={`panLabel-${layer.id}`}
                                  className="w-full h-2 appearance-none cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 rounded-full bg-white/15 hover:bg-white/20 transition-colors duration-150"
                                  style={{ touchAction: "pan-y" }}
                                />
                              </div>
                            </div>
                            {/* Waveform Selection Section */}
                            <div className="bg-gradient-to-br from-black/15 to-black/5 rounded-xl p-4 md:p-4 lg:p-3 xl:p-3 border border-white/8 min-w-0 max-w-full backdrop-blur-sm">
                              <div className="text-xs md:text-xs lg:text-[10px] xl:text-[10px] uppercase tracking-wider font-medium text-white/80 mb-3 lg:mb-2 xl:mb-1.5">
                                Waveform Selection
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 lg:gap-2 xl:gap-1.5 min-w-0 max-w-full">
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
                                    className={`w-full h-7 md:h-8 lg:h-7 xl:h-7 rounded-lg px-1.5 md:px-2 lg:px-1.5 xl:px-1.5 py-1.5 text-xs md:text-xs lg:text-xs xl:text-xs font-semibold capitalize border transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 ${
                                      layer.wave === w
                                        ? "bg-teal-500/90 hover:bg-teal-500 border-teal-400 text-white shadow-lg shadow-teal-500/25"
                                        : "bg-white/8 border-white/15 text-white/70 hover:bg-white/15 hover:border-white/25 hover:text-white/90"
                                    }`}
                                  >
                                    {w === "sawtooth" ? "saw" : w}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Enhanced Effects Section */}
                          {layer.effects && layer.effects.length > 0 && (
                            <div className="mx-4 mb-3 mt-2">
                              <div className="mb-2">
                                <h4 className="text-xs font-semibold text-white/60 uppercase tracking-wider flex items-center gap-2">
                                  <div className="h-0.5 w-4 bg-gradient-to-r from-teal-400/50 to-transparent rounded"></div>
                                  Active Effects
                                  <span className="bg-white/10 text-white/70 px-1.5 py-0.5 rounded-full text-[10px] font-medium">
                                    {layer.effects.length}
                                  </span>
                                </h4>
                              </div>
                              <div className="grid grid-cols-1 gap-2">
                                {layer.effects.map((fx: LayerEffect) => {
                                  // Enhanced color mapping per effect with gradients and better contrast
                                  let bgGradient = "from-white/8 to-white/4";
                                  let text = "text-white/80";
                                  let border = "border-white/15";
                                  let accentColor = "bg-white/20";
                                  let icon = "🎵";

                                  if (fx.kind === "noise") {
                                    icon = "🌊";
                                    if (fx.type === "white") {
                                      bgGradient =
                                        "from-slate-500/20 to-slate-600/10";
                                      text = "text-slate-100";
                                      border = "border-slate-400/25";
                                      accentColor = "bg-slate-400/30";
                                    } else if (fx.type === "pink") {
                                      bgGradient =
                                        "from-rose-500/20 to-rose-600/10";
                                      text = "text-rose-100";
                                      border = "border-rose-400/25";
                                      accentColor = "bg-rose-400/30";
                                    } else if (fx.type === "brown") {
                                      bgGradient =
                                        "from-amber-500/20 to-amber-600/10";
                                      text = "text-amber-100";
                                      border = "border-amber-400/25";
                                      accentColor = "bg-amber-400/30";
                                    }
                                  } else if (fx.kind === "reverb") {
                                    icon = "🏛️";
                                    bgGradient =
                                      "from-blue-500/20 to-blue-600/10";
                                    text = "text-blue-100";
                                    border = "border-blue-400/25";
                                    accentColor = "bg-blue-400/30";
                                  } else if (fx.kind === "chorus") {
                                    icon = "🌀";
                                    bgGradient =
                                      "from-purple-500/20 to-purple-600/10";
                                    text = "text-purple-100";
                                    border = "border-purple-400/25";
                                    accentColor = "bg-purple-400/30";
                                  } else if (fx.kind === "flanger") {
                                    icon = "🌪️";
                                    bgGradient =
                                      "from-indigo-500/20 to-indigo-600/10";
                                    text = "text-indigo-100";
                                    border = "border-indigo-400/25";
                                    accentColor = "bg-indigo-400/30";
                                  } else if (fx.kind === "phaser") {
                                    icon = "🔄";
                                    bgGradient =
                                      "from-violet-500/20 to-violet-600/10";
                                    text = "text-violet-100";
                                    border = "border-violet-400/25";
                                    accentColor = "bg-violet-400/30";
                                  } else if (fx.kind === "tremolo") {
                                    icon = "📳";
                                    bgGradient =
                                      "from-orange-500/20 to-orange-600/10";
                                    text = "text-orange-100";
                                    border = "border-orange-400/25";
                                    accentColor = "bg-orange-400/30";
                                  } else if (fx.kind === "autopan") {
                                    icon = "↔️";
                                    bgGradient =
                                      "from-cyan-500/20 to-cyan-600/10";
                                    text = "text-cyan-100";
                                    border = "border-cyan-400/25";
                                    accentColor = "bg-cyan-400/30";
                                  } else if (fx.kind === "ringmod") {
                                    icon = "⭕";
                                    bgGradient =
                                      "from-red-500/20 to-red-600/10";
                                    text = "text-red-100";
                                    border = "border-red-400/25";
                                    accentColor = "bg-red-400/30";
                                  } else if (
                                    fx.kind === "multibandcompressor"
                                  ) {
                                    icon = "🎚️";
                                    bgGradient =
                                      "from-emerald-500/20 to-emerald-600/10";
                                    text = "text-emerald-100";
                                    border = "border-emerald-400/25";
                                    accentColor = "bg-emerald-400/30";
                                  }

                                  const effectName =
                                    fx.kind === "noise"
                                      ? `${fx.type} noise`
                                      : fx.kind
                                          .replace(/([A-Z])/g, " $1")
                                          .toLowerCase();

                                  return (
                                    <div
                                      key={fx.id}
                                      className={`relative group bg-gradient-to-r ${bgGradient} border ${border} rounded-xl p-3 hover:shadow-lg hover:scale-[1.02] transition-all duration-200 backdrop-blur-sm`}
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                          <div
                                            className={`w-6 h-6 ${accentColor} rounded-lg flex items-center justify-center text-xs`}
                                          >
                                            {icon}
                                          </div>
                                          <div className="min-w-0 flex-1">
                                            <div
                                              className={`text-xs font-semibold ${text} capitalize truncate`}
                                            >
                                              {effectName}
                                            </div>
                                            <div className="text-[10px] text-white/50 truncate">
                                              Audio Effect
                                            </div>
                                          </div>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            console.log(
                                              `Removing effect ${fx.id} from layer ${layer.id}`
                                            );

                                            // Filter effects locally for immediate engine update
                                            const filteredEffects = (
                                              layer.effects || []
                                            ).filter((e) => e.id !== fx.id);

                                            // Update audio engine immediately with filtered effects
                                            const currentEngine =
                                              engines.current[layer.id];
                                            if (currentEngine) {
                                              currentEngine.update({
                                                effects: filteredEffects as any,
                                              });
                                            }

                                            // Remove from store (this will update UI)
                                            removeLayerEffect(layer.id, fx.id);
                                          }}
                                          className="relative z-10 shrink-0 ml-3 p-2 rounded-lg bg-red-500/10 hover:bg-red-500/25 border border-red-500/20 hover:border-red-500/40 transition-all duration-200 hover:scale-105 flex items-center justify-center group/remove"
                                          aria-label={`Remove ${effectName} effect`}
                                          title={`Remove ${effectName} effect`}
                                        >
                                          <Trash2
                                            size={14}
                                            className="text-red-400 group-hover/remove:text-red-300 transition-colors"
                                          />
                                        </button>
                                      </div>
                                      {/* Subtle animated border effect */}
                                      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Empty state for no effects */}
                          {(!layer.effects || layer.effects.length === 0) && (
                            <div className="mx-4 mb-3 mt-2">
                              <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                                <div className="text-white/40 text-xs mb-1">
                                  No effects applied
                                </div>
                                <div className="text-white/30 text-[10px]">
                                  Add effects from the library below
                                </div>
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
                      className="hidden sm:flex mx-2 sm:mx-3 md:mx-4 lg:mx-5 h-[100px] sm:h-[120px] md:h-[140px] lg:h-[150px] items-center justify-center rounded-xl border-2 border-dashed border-white/10 hover:border-teal-500/40 text-white/50 hover:text-teal-300 bg-black/20 text-xs sm:text-sm md:text-base font-medium gap-2"
                    >
                      <Plus size={16} /> Add Layer ({5 - layers.length})
                    </motion.button>
                  )}
                </div>
                {/* Bottom spacers: on mobile, reserve space equal to tabs height; on desktop, small aesthetic spacer */}
                <div
                  aria-hidden="true"
                  className="sm:hidden"
                  style={{ height: "var(--mobile-tabs-h)" }}
                />
                <div
                  aria-hidden="true"
                  className="hidden sm:block"
                  style={{ height: "30px" }}
                />
                {/* Mobile tabs: inside panel, sticky at bottom */}
                <div
                  ref={tabsRef}
                  className="sm:hidden sticky bottom-0 z-20 border-t border-white/10 bg-black/60 backdrop-blur"
                  style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
                >
                  <div className="px-0 py-2">
                    <div className="mx-0 flex gap-2">
                      {layers.map((l, i) => {
                        const active = l.id === activeLayerId;
                        return (
                          <button
                            key={l.id}
                            onClick={() => setActiveLayerId(l.id)}
                            className={`flex-1 min-w-0 h-[50px] rounded-lg border text-[12px] overflow-hidden text-ellipsis whitespace-nowrap transition-colors ${
                              active
                                ? "bg-teal-500/20 border-teal-400/60 text-teal-50"
                                : "bg-transparent border-white/15 text-white/80 hover:bg-white/10"
                            }`}
                            title={`Layer ${i + 1}`}
                          >
                            {`Layer ${i + 1}`}
                          </button>
                        );
                      })}
                      {layers.length < 5 && (
                        <button
                          onClick={() => {
                            addLayer();
                            try {
                              const all = useAppStore.getState().layers;
                              if (all.length)
                                setActiveLayerId(all[all.length - 1].id);
                            } catch {}
                          }}
                          className="flex-none w-[50px] h-[50px] rounded-lg border border-white/15 text-white/80 hover:bg-white/10 inline-flex items-center justify-center ml-auto"
                          title="Add layer"
                          aria-label="Add layer"
                        >
                          <Plus size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                  {/* Padding-bottom on the tabs container already accounts for safe-area insets */}
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
            className="absolute inset-0 sm:inset-auto sm:right-0 sm:top-0 sm:h-full sm:w-[360px] bg-black/80 sm:bg-black/60 backdrop-blur-xl shadow-2xl sm:border-l sm:border-white/10"
            role="dialog"
            aria-modal="true"
          >
            <div className="h-full flex flex-col">
              <div
                className="flex items-center justify-between px-4 py-3 border-b border-white/10"
                style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
              >
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
              <div
                className="flex-1 overflow-y-auto px-4 py-3"
                style={{
                  paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
                }}
              >
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

      {/* Effects Library Fullscreen Page */}
      {showEffectsLibrary && (
        <div
          className="fixed inset-0 z-50"
          aria-labelledby="effects-library-title"
        >
          {/* Fullscreen Panel */}
          <div
            id="effects-library-panel"
            className="absolute inset-0 bg-black/95 backdrop-blur-xl"
          >
            <div className="h-full flex flex-col">
              <div
                className="flex items-center justify-between px-6 py-4 border-b border-white/15 bg-gradient-to-r from-black/50 to-black/30 backdrop-blur-sm"
                style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-teal-400 to-teal-600 rounded-lg flex items-center justify-center">
                    <SlidersHorizontal size={16} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <h3
                      id="effects-library-title"
                      className="text-lg font-semibold text-white"
                    >
                      Effects Library
                    </h3>
                    <p className="text-xs text-white/60">
                      Add professional audio effects to your layers
                    </p>
                  </div>
                  {/* Target Layer Select - Now in Header */}
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-teal-500/20 rounded-lg flex items-center justify-center">
                      <span className="text-teal-400 text-xs">🎯</span>
                    </div>
                    <label className="text-sm font-medium text-white/90 whitespace-nowrap">
                      Target Layer:
                    </label>
                    <div className="relative min-w-[180px]">
                      <select
                        value={targetLayerId || ""}
                        onChange={(e) =>
                          setTargetLayerId(e.target.value || null)
                        }
                        className="w-full bg-black/50 border border-white/25 hover:border-white/35 rounded-lg pl-3 pr-8 h-9 min-w-[6rem] text-xs md:text-xs lg:text-xs xl:text-xs text-white/90 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/60 focus:border-teal-500/70 appearance-none cursor-pointer transition-all duration-150"
                      >
                        <option className="bg-slate-900" value="" disabled>
                          Choose layer…
                        </option>
                        {layers.map((l, i) => (
                          <option
                            className="bg-slate-900"
                            key={l.id}
                            value={l.id}
                          >
                            Layer {i + 1} • {l.type} • {l.effects?.length || 0}
                            /4
                          </option>
                        ))}
                      </select>
                      <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-white/50">
                        <ChevronDown size={14} />
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  className="p-2.5 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all duration-200 hover:scale-105"
                  aria-label="Close effects library"
                  onClick={() => setShowEffectsLibrary(false)}
                >
                  <X size={18} />
                </button>
              </div>
              <div
                className="flex-1 overflow-y-auto px-6 py-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4"
                style={{
                  paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))",
                }}
              >
                {/* Noise Generator Card - Single Grid Cell */}
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="text-sm text-white font-medium">
                        Noise Generator
                      </div>
                      <div className="text-[11px] text-white/60">
                        White, Pink, and Brown noise textures
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-[11px] text-white/60">
                        <span>Type</span>
                        <span className="text-white/80 font-medium capitalize">
                          {noiseType}
                        </span>
                      </div>
                      <select
                        value={noiseType}
                        onChange={(e) => {
                          const t = e.target.value as NoiseType;
                          setNoiseType(t);
                          noiseHandleRef.current?.setType(t);
                        }}
                        className="w-full bg-black/50 border border-white/20 rounded-lg pl-2 pr-6 py-1.5 text-xs text-white/90 focus:outline-none focus:ring-1 focus:ring-teal-500/50 focus:border-teal-500/50 appearance-none cursor-pointer transition-all duration-200 hover:border-white/30"
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
                    </div>

                    <div className="grid grid-cols-2 gap-3">
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
                              ? `R${Math.abs(noisePan).toFixed(1)}`
                              : `L${Math.abs(noisePan).toFixed(1)}`}
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
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] text-white/60">
                        <span>Filter</span>
                        <span className="text-white/80 font-medium">
                          {Math.round(noiseLpf / 1000)}kHz
                        </span>
                      </div>
                      <input
                        type="range"
                        min={200}
                        max={20000}
                        step={10}
                        value={noiseLpf}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          setNoiseLpf(v);
                          noiseHandleRef.current?.setLpf(v);
                        }}
                        className="w-full appearance-none cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => {
                          if (isNoisePreviewActive) {
                            stopNoisePreview();
                          } else {
                            ensureNoisePreviewStarted();
                          }
                        }}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 btn-shape text-white text-xs font-medium transition-colors ${
                          isNoisePreviewActive
                            ? "bg-red-500/80 hover:bg-red-500"
                            : "bg-teal-500/80 hover:bg-teal-500"
                        }`}
                      >
                        {isNoisePreviewActive ? (
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

                          // Check effect limit
                          const currentLayer = layers.find(
                            (l) => l.id === targetLayerId
                          );
                          if (
                            currentLayer?.effects &&
                            currentLayer.effects.length >= 4
                          ) {
                            alert("Maximum of 4 effects allowed per layer");
                            return;
                          }

                          const effect = {
                            id: crypto.randomUUID(),
                            kind: "noise" as const,
                            type: noiseType,
                            gain: noiseGain,
                            pan: noisePan,
                            lpfHz: noiseLpf,
                            autopanHz: noiseAutopanHz,
                            autopanDepth: noiseAutopanDepth,
                          };
                          addLayerEffect(targetLayerId, effect);

                          // Show success feedback
                          const feedbackKey = `noise-${targetLayerId}`;
                          setRecentlyAddedEffects(
                            (prev) => new Set([...prev, feedbackKey])
                          );
                          setTimeout(() => {
                            setRecentlyAddedEffects((prev) => {
                              const newSet = new Set(prev);
                              newSet.delete(feedbackKey);
                              return newSet;
                            });
                          }, 2000);

                          // Get the current effects and add the new one for immediate engine update
                          const layerForUpdate = useAppStore
                            .getState()
                            .layers.find((l) => l.id === targetLayerId);
                          const existingEffects = layerForUpdate?.effects || [];
                          const updatedEffects = [...existingEffects, effect];
                          // Notify engine about effects change immediately
                          engines.current[targetLayerId]?.update({
                            effects: updatedEffects as any,
                          });
                        }}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 btn-shape text-white text-xs font-medium transition-colors disabled:opacity-40 ${
                          recentlyAddedEffects.has(`noise-${targetLayerId}`)
                            ? "bg-green-500/80 hover:bg-green-500"
                            : "bg-amber-500/80 hover:bg-amber-500"
                        }`}
                      >
                        {recentlyAddedEffects.has(`noise-${targetLayerId}`) ? (
                          <>
                            <Check size={16} /> Added!
                          </>
                        ) : (
                          <>
                            <Plus size={16} /> Add to Layer
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* AutoPan Effect Card */}
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="text-sm text-white font-medium">
                        AutoPan Effect
                      </div>
                      <div className="text-[11px] text-white/60">
                        360-degree panning animation
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="flex justify-between text-[11px] text-white/60">
                          <span>Rate</span>
                          <span className="text-white/80 font-medium">
                            {autoPanRate.toFixed(2)} Hz
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0.05}
                          max={2}
                          step={0.01}
                          value={autoPanRate}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            setAutoPanRate(v);
                            autoPanHandleRef.current?.setRate(v);
                          }}
                          className="w-full appearance-none cursor-pointer"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-[11px] text-white/60">
                          <span>Depth</span>
                          <span className="text-white/80 font-medium">
                            {Math.round(autoPanDepth * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.01}
                          value={autoPanDepth}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            setAutoPanDepth(v);
                            autoPanHandleRef.current?.setDepth(v);
                          }}
                          className="w-full appearance-none cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => {
                          if (autoPanHandleRef.current) {
                            stopAutoPanPreview();
                          } else {
                            ensureAutoPanPreviewStarted();
                          }
                        }}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 btn-shape text-white text-xs font-medium transition-colors ${
                          autoPanHandleRef.current
                            ? "bg-white/10 hover:bg-white/20"
                            : "bg-teal-500/80 hover:bg-teal-500"
                        }`}
                      >
                        {autoPanHandleRef.current ? (
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

                          // Check effect limit
                          const currentLayer = layers.find(
                            (l) => l.id === targetLayerId
                          );
                          if (
                            currentLayer?.effects &&
                            currentLayer.effects.length >= 4
                          ) {
                            alert("Maximum of 4 effects allowed per layer");
                            return;
                          }

                          const effect = {
                            id: crypto.randomUUID(),
                            kind: "autopan" as const,
                            rate: autoPanRate,
                            depth: autoPanDepth,
                          };
                          addLayerEffect(targetLayerId, effect);
                          // Get the current effects and add the new one for immediate engine update
                          const layerForUpdate = useAppStore
                            .getState()
                            .layers.find((l) => l.id === targetLayerId);
                          const existingEffects = layerForUpdate?.effects || [];
                          const updatedEffects = [...existingEffects, effect];
                          // Notify engine about effects change immediately
                          engines.current[targetLayerId]?.update({
                            effects: updatedEffects as any,
                          });
                        }}
                        className="inline-flex items-center gap-2 px-3 py-1.5 btn-shape bg-amber-500/80 hover:bg-amber-500 text-white text-xs font-medium transition-colors disabled:opacity-40"
                      >
                        <Plus size={16} /> Add to Layer
                      </button>
                    </div>
                  </div>
                </div>

                {/* Removed: Pixabay Audio Search (deprecated) */}

                {/* Ring Modulation Effect Card */}
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="text-sm text-white font-medium">
                        Ring Modulation
                      </div>
                      <div className="text-[11px] text-white/60">
                        Creates metallic, robotic tones
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="flex justify-between text-[11px] text-white/60">
                          <span>Frequency</span>
                          <span className="text-white/80 font-medium">
                            {ringModFrequency.toFixed(1)} Hz
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0.1}
                          max={200}
                          step={0.1}
                          value={ringModFrequency}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            setRingModFrequency(v);
                            ringModHandleRef.current?.setFrequency(v);
                          }}
                          className="w-full appearance-none cursor-pointer"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-[11px] text-white/60">
                          <span>Intensity</span>
                          <span className="text-white/80 font-medium">
                            {Math.round(ringModIntensity * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.01}
                          value={ringModIntensity}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            setRingModIntensity(v);
                            ringModHandleRef.current?.setIntensity(v);
                          }}
                          className="w-full appearance-none cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => {
                          if (ringModHandleRef.current) {
                            stopRingModPreview();
                          } else {
                            ensureRingModPreviewStarted();
                          }
                        }}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 btn-shape text-white text-xs font-medium transition-colors ${
                          ringModHandleRef.current
                            ? "bg-white/10 hover:bg-white/20"
                            : "bg-teal-500/80 hover:bg-teal-500"
                        }`}
                      >
                        {ringModHandleRef.current ? (
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

                          // Check effect limit
                          const currentLayer = layers.find(
                            (l) => l.id === targetLayerId
                          );
                          if (
                            currentLayer?.effects &&
                            currentLayer.effects.length >= 4
                          ) {
                            alert("Maximum of 4 effects allowed per layer");
                            return;
                          }

                          const effect = {
                            id: crypto.randomUUID(),
                            kind: "ringmod" as const,
                            frequency: ringModFrequency,
                            intensity: ringModIntensity,
                          };
                          addLayerEffect(targetLayerId, effect);
                          // Get the current effects and add the new one for immediate engine update
                          const layerForUpdate = useAppStore
                            .getState()
                            .layers.find((l) => l.id === targetLayerId);
                          const existingEffects = layerForUpdate?.effects || [];
                          const updatedEffects = [...existingEffects, effect];
                          // Notify engine about effects change immediately
                          engines.current[targetLayerId]?.update({
                            effects: updatedEffects as any,
                          });
                        }}
                        className="inline-flex items-center gap-2 px-3 py-1.5 btn-shape bg-amber-500/80 hover:bg-amber-500 text-white text-xs font-medium transition-colors disabled:opacity-40"
                      >
                        <Plus size={16} /> Add to Layer
                      </button>
                    </div>
                  </div>
                </div>

                {/* Tremolo Effect Card */}
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="text-sm text-white font-medium">
                        Tremolo
                      </div>
                      <div className="text-[11px] text-white/60">
                        Amplitude modulation for volume trembling
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="flex justify-between text-[11px] text-white/60">
                          <span>Rate</span>
                          <span className="text-white/80 font-medium">
                            {tremoloRate.toFixed(1)} Hz
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0.1}
                          max={20}
                          step={0.1}
                          value={tremoloRate}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            setTremoloRate(v);
                            tremoloHandleRef.current?.setRate(v);
                          }}
                          className="w-full appearance-none cursor-pointer"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-[11px] text-white/60">
                          <span>Depth</span>
                          <span className="text-white/80 font-medium">
                            {Math.round(tremoloDepth * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.01}
                          value={tremoloDepth}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            setTremoloDepth(v);
                            tremoloHandleRef.current?.setDepth(v * 100);
                          }}
                          className="w-full appearance-none cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => {
                          if (tremoloHandleRef.current) {
                            stopTremoloPreview();
                          } else {
                            ensureTremoloPreviewStarted();
                          }
                        }}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 btn-shape text-white text-xs font-medium transition-colors ${
                          tremoloHandleRef.current
                            ? "bg-white/10 hover:bg-white/20"
                            : "bg-teal-500/80 hover:bg-teal-500"
                        }`}
                      >
                        {tremoloHandleRef.current ? (
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

                          // Check effect limit
                          const currentLayer = layers.find(
                            (l) => l.id === targetLayerId
                          );
                          if (
                            currentLayer?.effects &&
                            currentLayer.effects.length >= 4
                          ) {
                            alert("Maximum of 4 effects allowed per layer");
                            return;
                          }

                          const effect = {
                            id: crypto.randomUUID(),
                            kind: "tremolo" as const,
                            rate: tremoloRate,
                            depth: tremoloDepth,
                          };
                          addLayerEffect(targetLayerId, effect);
                          // Get the current effects and add the new one for immediate engine update
                          const layerForUpdate = useAppStore
                            .getState()
                            .layers.find((l) => l.id === targetLayerId);
                          const existingEffects = layerForUpdate?.effects || [];
                          const updatedEffects = [...existingEffects, effect];
                          // Notify engine about effects change immediately
                          engines.current[targetLayerId]?.update({
                            effects: updatedEffects as any,
                          });
                        }}
                        className="inline-flex items-center gap-2 px-3 py-1.5 btn-shape bg-amber-500/80 hover:bg-amber-500 text-white text-xs font-medium transition-colors disabled:opacity-40"
                      >
                        <Plus size={16} /> Add to Layer
                      </button>
                    </div>
                  </div>
                </div>

                {/* Chorus Effect Card */}
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="text-sm text-white font-medium">
                        Chorus
                      </div>
                      <div className="text-[11px] text-white/60">
                        Rich, shimmering effect with delayed copies
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <div className="flex justify-between text-[11px] text-white/60">
                          <span>Rate</span>
                          <span className="text-white/80 font-medium">
                            {chorusRate.toFixed(1)} Hz
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0.1}
                          max={5}
                          step={0.1}
                          value={chorusRate}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            setChorusRate(v);
                            chorusHandleRef.current?.setRate(v);
                          }}
                          className="w-full appearance-none cursor-pointer"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-[11px] text-white/60">
                          <span>Depth</span>
                          <span className="text-white/80 font-medium">
                            {chorusDepth.toFixed(0)} ms
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={50}
                          step={1}
                          value={chorusDepth}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            setChorusDepth(v);
                            chorusHandleRef.current?.setDepth(v);
                          }}
                          className="w-full appearance-none cursor-pointer"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-[11px] text-white/60">
                          <span>Mix</span>
                          <span className="text-white/80 font-medium">
                            {Math.round(chorusMix)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={1}
                          value={chorusMix}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            setChorusMix(v);
                            chorusHandleRef.current?.setMix(v);
                          }}
                          className="w-full appearance-none cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => {
                          if (chorusHandleRef.current) {
                            stopChorusPreview();
                          } else {
                            ensureChorusPreviewStarted();
                          }
                        }}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 btn-shape text-white text-xs font-medium transition-colors ${
                          chorusHandleRef.current
                            ? "bg-white/10 hover:bg-white/20"
                            : "bg-teal-500/80 hover:bg-teal-500"
                        }`}
                      >
                        {chorusHandleRef.current ? (
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
                          // Check if layer already has 4 effects
                          const layerForCheck = useAppStore
                            .getState()
                            .layers.find((l) => l.id === targetLayerId);
                          if (
                            layerForCheck?.effects &&
                            layerForCheck.effects.length >= 4
                          ) {
                            alert("Maximum of 4 effects allowed per layer");
                            return;
                          }
                          const effect = {
                            id: crypto.randomUUID(),
                            kind: "chorus" as const,
                            rate: chorusRate,
                            depth: chorusDepth,
                            mix: chorusMix,
                          };
                          addLayerEffect(targetLayerId, effect);
                          // Get the current effects and add the new one for immediate engine update
                          const layerForUpdate = useAppStore
                            .getState()
                            .layers.find((l) => l.id === targetLayerId);
                          const existingEffects = layerForUpdate?.effects || [];
                          const updatedEffects = [...existingEffects, effect];
                          // Notify engine about effects change immediately
                          engines.current[targetLayerId]?.update({
                            effects: updatedEffects as any,
                          });
                        }}
                        className="inline-flex items-center gap-2 px-3 py-1.5 btn-shape bg-amber-500/80 hover:bg-amber-500 text-white text-xs font-medium transition-colors disabled:opacity-40"
                      >
                        <Plus size={16} /> Add to Layer
                      </button>
                    </div>
                  </div>
                </div>

                {/* Flanger Effect Card */}
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="text-sm text-white font-medium">
                        Flanger
                      </div>
                      <div className="text-[11px] text-white/60">
                        Classic swooshing effect with feedback
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="flex justify-between text-[11px] text-white/60">
                          <span>Rate</span>
                          <span className="text-white/80 font-medium">
                            {flangerRate.toFixed(1)} Hz
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0.1}
                          max={10}
                          step={0.1}
                          value={flangerRate}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            setFlangerRate(v);
                            flangerHandleRef.current?.setRate(v);
                          }}
                          className="w-full appearance-none cursor-pointer"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-[11px] text-white/60">
                          <span>Depth</span>
                          <span className="text-white/80 font-medium">
                            {flangerDepth.toFixed(0)} ms
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={10}
                          step={0.1}
                          value={flangerDepth}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            setFlangerDepth(v);
                            flangerHandleRef.current?.setDepth(v);
                          }}
                          className="w-full appearance-none cursor-pointer"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="flex justify-between text-[11px] text-white/60">
                          <span>Feedback</span>
                          <span className="text-white/80 font-medium">
                            {Math.round(flangerFeedback)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={95}
                          step={1}
                          value={flangerFeedback}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            setFlangerFeedback(v);
                            flangerHandleRef.current?.setFeedback(v);
                          }}
                          className="w-full appearance-none cursor-pointer"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-[11px] text-white/60">
                          <span>Mix</span>
                          <span className="text-white/80 font-medium">
                            {Math.round(flangerMix)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={1}
                          value={flangerMix}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            setFlangerMix(v);
                            flangerHandleRef.current?.setMix(v);
                          }}
                          className="w-full appearance-none cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => {
                          if (flangerHandleRef.current) {
                            stopFlangerPreview();
                          } else {
                            ensureFlangerPreviewStarted();
                          }
                        }}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 btn-shape text-white text-xs font-medium transition-colors ${
                          flangerHandleRef.current
                            ? "bg-white/10 hover:bg-white/20"
                            : "bg-teal-500/80 hover:bg-teal-500"
                        }`}
                      >
                        {flangerHandleRef.current ? (
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
                          // Check if layer already has 4 effects
                          const layerForCheck = useAppStore
                            .getState()
                            .layers.find((l) => l.id === targetLayerId);
                          if (
                            layerForCheck?.effects &&
                            layerForCheck.effects.length >= 4
                          ) {
                            alert("Maximum of 4 effects allowed per layer");
                            return;
                          }
                          const effect = {
                            id: crypto.randomUUID(),
                            kind: "flanger" as const,
                            rate: flangerRate,
                            depth: flangerDepth,
                            feedback: flangerFeedback,
                            mix: flangerMix,
                          };
                          addLayerEffect(targetLayerId, effect);
                          // Get the current effects and add the new one for immediate engine update
                          const layerForUpdate = useAppStore
                            .getState()
                            .layers.find((l) => l.id === targetLayerId);
                          const existingEffects = layerForUpdate?.effects || [];
                          const updatedEffects = [...existingEffects, effect];
                          // Notify engine about effects change immediately
                          engines.current[targetLayerId]?.update({
                            effects: updatedEffects as any,
                          });
                        }}
                        className="inline-flex items-center gap-2 px-3 py-1.5 btn-shape bg-amber-500/80 hover:bg-amber-500 text-white text-xs font-medium transition-colors disabled:opacity-40"
                      >
                        <Plus size={16} /> Add to Layer
                      </button>
                    </div>
                  </div>
                </div>

                {/* Phaser Effect Card */}
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="text-sm text-white font-medium">
                        Phaser
                      </div>
                      <div className="text-[11px] text-white/60">
                        Classic sweeping all-pass filter modulation
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="flex justify-between text-[11px] text-white/60">
                          <span>Rate</span>
                          <span className="text-white/80 font-medium">
                            {phaserRate.toFixed(1)} Hz
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0.1}
                          max={10}
                          step={0.1}
                          value={phaserRate}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            setPhaserRate(v);
                            phaserHandleRef.current?.setRate(v);
                          }}
                          className="w-full appearance-none cursor-pointer"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-[11px] text-white/60">
                          <span>Depth</span>
                          <span className="text-white/80 font-medium">
                            {Math.round(phaserDepth)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={1}
                          value={phaserDepth}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            setPhaserDepth(v);
                            phaserHandleRef.current?.setDepth(v);
                          }}
                          className="w-full appearance-none cursor-pointer"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="flex justify-between text-[11px] text-white/60">
                          <span>Stages</span>
                          <span className="text-white/80 font-medium">
                            {phaserStages}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={2}
                          max={8}
                          step={1}
                          value={phaserStages}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            setPhaserStages(v);
                            phaserHandleRef.current?.setStages(v);
                          }}
                          className="w-full appearance-none cursor-pointer"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-[11px] text-white/60">
                          <span>Mix</span>
                          <span className="text-white/80 font-medium">
                            {Math.round(phaserMix)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={1}
                          value={phaserMix}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            setPhaserMix(v);
                            phaserHandleRef.current?.setMix(v);
                          }}
                          className="w-full appearance-none cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => {
                          if (phaserHandleRef.current) {
                            stopPhaserPreview();
                          } else {
                            ensurePhaserPreviewStarted();
                          }
                        }}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 btn-shape text-white text-xs font-medium transition-colors ${
                          phaserHandleRef.current
                            ? "bg-white/10 hover:bg-white/20"
                            : "bg-teal-500/80 hover:bg-teal-500"
                        }`}
                      >
                        {phaserHandleRef.current ? (
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
                          // Check if layer already has 4 effects
                          const layerForCheck = useAppStore
                            .getState()
                            .layers.find((l) => l.id === targetLayerId);
                          if (
                            layerForCheck?.effects &&
                            layerForCheck.effects.length >= 4
                          ) {
                            alert("Maximum of 4 effects allowed per layer");
                            return;
                          }
                          const effect = {
                            id: crypto.randomUUID(),
                            kind: "phaser" as const,
                            rate: phaserRate,
                            depth: phaserDepth,
                            stages: phaserStages,
                            mix: phaserMix,
                          };
                          addLayerEffect(targetLayerId, effect);
                          // Get the current effects and add the new one for immediate engine update
                          const layerForUpdate = useAppStore
                            .getState()
                            .layers.find((l) => l.id === targetLayerId);
                          const existingEffects = layerForUpdate?.effects || [];
                          const updatedEffects = [...existingEffects, effect];
                          // Notify engine about effects change immediately
                          engines.current[targetLayerId]?.update({
                            effects: updatedEffects as any,
                          });
                        }}
                        className="inline-flex items-center gap-2 px-3 py-1.5 btn-shape bg-amber-500/80 hover:bg-amber-500 text-white text-xs font-medium transition-colors disabled:opacity-40"
                      >
                        <Plus size={16} /> Add to Layer
                      </button>
                    </div>
                  </div>
                </div>

                {/* Ping Pong Delay Effect Card */}
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="text-sm text-white font-medium">
                        Ping Pong Delay
                      </div>
                      <div className="text-[11px] text-white/60">
                        Stereo delay with alternating channels
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="flex justify-between text-[11px] text-white/60">
                          <span>Time</span>
                          <span className="text-white/80 font-medium">
                            {Math.round(pingpongTime)} ms
                          </span>
                        </div>
                        <input
                          type="range"
                          min={10}
                          max={2000}
                          step={10}
                          value={pingpongTime}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            setPingpongTime(v);
                            pingpongHandleRef.current?.setTime(v);
                          }}
                          className="w-full appearance-none cursor-pointer"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-[11px] text-white/60">
                          <span>Feedback</span>
                          <span className="text-white/80 font-medium">
                            {Math.round(pingpongFeedback)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={95}
                          step={1}
                          value={pingpongFeedback}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            setPingpongFeedback(v);
                            pingpongHandleRef.current?.setFeedback(v);
                          }}
                          className="w-full appearance-none cursor-pointer"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <div className="flex justify-between text-[11px] text-white/60">
                          <span>Mix</span>
                          <span className="text-white/80 font-medium">
                            {Math.round(pingpongMix)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={1}
                          value={pingpongMix}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            setPingpongMix(v);
                            pingpongHandleRef.current?.setMix(v);
                          }}
                          className="w-full appearance-none cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => {
                          if (pingpongHandleRef.current) {
                            stopPingPongPreview();
                          } else {
                            ensurePingPongPreviewStarted();
                          }
                        }}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 btn-shape text-white text-xs font-medium transition-colors ${
                          pingpongHandleRef.current
                            ? "bg-white/10 hover:bg-white/20"
                            : "bg-teal-500/80 hover:bg-teal-500"
                        }`}
                      >
                        {pingpongHandleRef.current ? (
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
                          // Check if layer already has 4 effects
                          const layerForCheck = useAppStore
                            .getState()
                            .layers.find((l) => l.id === targetLayerId);
                          if (
                            layerForCheck?.effects &&
                            layerForCheck.effects.length >= 4
                          ) {
                            alert("Maximum of 4 effects allowed per layer");
                            return;
                          }
                          const effect = {
                            id: crypto.randomUUID(),
                            kind: "pingpong" as const,
                            time: pingpongTime,
                            feedback: pingpongFeedback,
                            mix: pingpongMix,
                          };
                          addLayerEffect(targetLayerId, effect);
                          // Get the current effects and add the new one for immediate engine update
                          const layerForUpdate = useAppStore
                            .getState()
                            .layers.find((l) => l.id === targetLayerId);
                          const existingEffects = layerForUpdate?.effects || [];
                          const updatedEffects = [...existingEffects, effect];
                          // Notify engine about effects change immediately
                          engines.current[targetLayerId]?.update({
                            effects: updatedEffects as any,
                          });
                        }}
                        className="inline-flex items-center gap-2 px-3 py-1.5 btn-shape bg-amber-500/80 hover:bg-amber-500 text-white text-xs font-medium transition-colors disabled:opacity-40"
                      >
                        <Plus size={16} /> Add to Layer
                      </button>
                    </div>
                  </div>
                </div>

                {/* Comb Filter Effect Card */}
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="text-sm text-white font-medium">
                        Comb Filter
                      </div>
                      <div className="text-[11px] text-white/60">
                        Resonant delay-based filtering
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="flex justify-between text-[11px] text-white/60">
                          <span>Frequency</span>
                          <span className="text-white/80 font-medium">
                            {Math.round(combfilterFrequency)} Hz
                          </span>
                        </div>
                        <input
                          type="range"
                          min={20}
                          max={2000}
                          step={1}
                          value={combfilterFrequency}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            setCombfilterFrequency(v);
                            combfilterHandleRef.current?.setFrequency(v);
                          }}
                          className="w-full appearance-none cursor-pointer"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-[11px] text-white/60">
                          <span>Resonance</span>
                          <span className="text-white/80 font-medium">
                            {Math.round(combfilterResonance)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={95}
                          step={1}
                          value={combfilterResonance}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            setCombfilterResonance(v);
                            combfilterHandleRef.current?.setResonance(v);
                          }}
                          className="w-full appearance-none cursor-pointer"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <div className="flex justify-between text-[11px] text-white/60">
                          <span>Mix</span>
                          <span className="text-white/80 font-medium">
                            {Math.round(combfilterMix)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={1}
                          value={combfilterMix}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            setCombfilterMix(v);
                            combfilterHandleRef.current?.setMix(v);
                          }}
                          className="w-full appearance-none cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => {
                          if (combfilterHandleRef.current) {
                            stopCombFilterPreview();
                          } else {
                            ensureCombFilterPreviewStarted();
                          }
                        }}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 btn-shape text-white text-xs font-medium transition-colors ${
                          combfilterHandleRef.current
                            ? "bg-white/10 hover:bg-white/20"
                            : "bg-teal-500/80 hover:bg-teal-500"
                        }`}
                      >
                        {combfilterHandleRef.current ? (
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
                          // Check if layer already has 4 effects
                          const layerForCheck = useAppStore
                            .getState()
                            .layers.find((l) => l.id === targetLayerId);
                          if (
                            layerForCheck?.effects &&
                            layerForCheck.effects.length >= 4
                          ) {
                            alert("Maximum of 4 effects allowed per layer");
                            return;
                          }
                          const effect = {
                            id: crypto.randomUUID(),
                            kind: "combfilter" as const,
                            frequency: combfilterFrequency,
                            resonance: combfilterResonance,
                            mix: combfilterMix,
                          };
                          addLayerEffect(targetLayerId, effect);
                          // Get the current effects and add the new one for immediate engine update
                          const layerForUpdate = useAppStore
                            .getState()
                            .layers.find((l) => l.id === targetLayerId);
                          const existingEffects = layerForUpdate?.effects || [];
                          const updatedEffects = [...existingEffects, effect];
                          // Notify engine about effects change immediately
                          engines.current[targetLayerId]?.update({
                            effects: updatedEffects as any,
                          });
                        }}
                        className="inline-flex items-center gap-2 px-3 py-1.5 btn-shape bg-amber-500/80 hover:bg-amber-500 text-white text-xs font-medium transition-colors disabled:opacity-40"
                      >
                        <Plus size={16} /> Add to Layer
                      </button>
                    </div>
                  </div>
                </div>

                {/* Acid Filter Effect Card */}
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="text-sm text-white font-medium">
                        Acid Filter
                      </div>
                      <div className="text-[11px] text-white/60">
                        Classic acid house resonant filter with LFO
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="flex justify-between text-[11px] text-white/60">
                          <span>Cutoff</span>
                          <span className="text-white/80 font-medium">
                            {Math.round(acidfilterCutoff)} Hz
                          </span>
                        </div>
                        <input
                          type="range"
                          min={20}
                          max={20000}
                          step={1}
                          value={acidfilterCutoff}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            setAcidfilterCutoff(v);
                            acidfilterHandleRef.current?.setCutoff(v);
                          }}
                          className="w-full appearance-none cursor-pointer"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-[11px] text-white/60">
                          <span>Resonance</span>
                          <span className="text-white/80 font-medium">
                            {acidfilterResonance.toFixed(1)}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={30}
                          step={0.1}
                          value={acidfilterResonance}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            setAcidfilterResonance(v);
                            acidfilterHandleRef.current?.setResonance(v);
                          }}
                          className="w-full appearance-none cursor-pointer"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="flex justify-between text-[11px] text-white/60">
                          <span>LFO Rate</span>
                          <span className="text-white/80 font-medium">
                            {acidfilterLfoRate.toFixed(1)} Hz
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0.1}
                          max={20}
                          step={0.1}
                          value={acidfilterLfoRate}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            setAcidfilterLfoRate(v);
                            acidfilterHandleRef.current?.setLfoRate(v);
                          }}
                          className="w-full appearance-none cursor-pointer"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-[11px] text-white/60">
                          <span>LFO Depth</span>
                          <span className="text-white/80 font-medium">
                            {Math.round(acidfilterLfoDepth)} Hz
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={5000}
                          step={10}
                          value={acidfilterLfoDepth}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            setAcidfilterLfoDepth(v);
                            acidfilterHandleRef.current?.setLfoDepth(v);
                          }}
                          className="w-full appearance-none cursor-pointer"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <div className="flex justify-between text-[11px] text-white/60">
                          <span>Mix</span>
                          <span className="text-white/80 font-medium">
                            {Math.round(acidfilterMix)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={1}
                          value={acidfilterMix}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            setAcidfilterMix(v);
                            acidfilterHandleRef.current?.setMix(v);
                          }}
                          className="w-full appearance-none cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => {
                          if (acidfilterHandleRef.current) {
                            stopAcidFilterPreview();
                          } else {
                            ensureAcidFilterPreviewStarted();
                          }
                        }}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 btn-shape text-white text-xs font-medium transition-colors ${
                          acidfilterHandleRef.current
                            ? "bg-white/10 hover:bg-white/20"
                            : "bg-teal-500/80 hover:bg-teal-500"
                        }`}
                      >
                        {acidfilterHandleRef.current ? (
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
                          // Check if layer already has 4 effects
                          const layerForCheck = useAppStore
                            .getState()
                            .layers.find((l) => l.id === targetLayerId);
                          if (
                            layerForCheck?.effects &&
                            layerForCheck.effects.length >= 4
                          ) {
                            alert("Maximum of 4 effects allowed per layer");
                            return;
                          }
                          const effect = {
                            id: crypto.randomUUID(),
                            kind: "acidfilter" as const,
                            cutoff: acidfilterCutoff,
                            resonance: acidfilterResonance,
                            lfoRate: acidfilterLfoRate,
                            lfoDepth: acidfilterLfoDepth,
                            mix: acidfilterMix,
                          };
                          addLayerEffect(targetLayerId, effect);
                          // Get the current effects and add the new one for immediate engine update
                          const layerForUpdate = useAppStore
                            .getState()
                            .layers.find((l) => l.id === targetLayerId);
                          const existingEffects = layerForUpdate?.effects || [];
                          const updatedEffects = [...existingEffects, effect];
                          // Notify engine about effects change immediately
                          engines.current[targetLayerId]?.update({
                            effects: updatedEffects as any,
                          });
                        }}
                        className="inline-flex items-center gap-2 px-3 py-1.5 btn-shape bg-amber-500/80 hover:bg-amber-500 text-white text-xs font-medium transition-colors disabled:opacity-40"
                      >
                        <Plus size={16} /> Add to Layer
                      </button>
                    </div>
                  </div>
                </div>

                {/* Gate Effect Card */}
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="text-sm text-white font-medium">
                        Gate Effect
                      </div>
                      <div className="text-[11px] text-white/60">
                        Rhythmic gating and pumping compression
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="flex justify-between text-[11px] text-white/60">
                          <span>Rate</span>
                          <span className="text-white/80 font-medium">
                            {gateRate.toFixed(1)} Hz
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0.1}
                          max={20}
                          step={0.1}
                          value={gateRate}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            setGateRate(v);
                            gateHandleRef.current?.setRate(v);
                          }}
                          className="w-full appearance-none cursor-pointer"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-[11px] text-white/60">
                          <span>Threshold</span>
                          <span className="text-white/80 font-medium">
                            {Math.round(gateThreshold)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={1}
                          value={gateThreshold}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            setGateThreshold(v);
                            gateHandleRef.current?.setThreshold(v);
                          }}
                          className="w-full appearance-none cursor-pointer"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="flex justify-between text-[11px] text-white/60">
                          <span>Attack</span>
                          <span className="text-white/80 font-medium">
                            {Math.round(gateAttack)} ms
                          </span>
                        </div>
                        <input
                          type="range"
                          min={1}
                          max={100}
                          step={1}
                          value={gateAttack}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            setGateAttack(v);
                            gateHandleRef.current?.setAttack(v);
                          }}
                          className="w-full appearance-none cursor-pointer"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-[11px] text-white/60">
                          <span>Release</span>
                          <span className="text-white/80 font-medium">
                            {Math.round(gateRelease)} ms
                          </span>
                        </div>
                        <input
                          type="range"
                          min={10}
                          max={1000}
                          step={10}
                          value={gateRelease}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            setGateRelease(v);
                            gateHandleRef.current?.setRelease(v);
                          }}
                          className="w-full appearance-none cursor-pointer"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <div className="flex justify-between text-[11px] text-white/60">
                          <span>Mix</span>
                          <span className="text-white/80 font-medium">
                            {Math.round(gateMix)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={1}
                          value={gateMix}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            setGateMix(v);
                            gateHandleRef.current?.setMix(v);
                          }}
                          className="w-full appearance-none cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => {
                          if (gateHandleRef.current) {
                            stopGatePreview();
                          } else {
                            ensureGatePreviewStarted();
                          }
                        }}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 btn-shape text-white text-xs font-medium transition-colors ${
                          gateHandleRef.current
                            ? "bg-white/10 hover:bg-white/20"
                            : "bg-teal-500/80 hover:bg-teal-500"
                        }`}
                      >
                        {gateHandleRef.current ? (
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
                          // Check if layer already has 4 effects
                          const layerForCheck = useAppStore
                            .getState()
                            .layers.find((l) => l.id === targetLayerId);
                          if (
                            layerForCheck?.effects &&
                            layerForCheck.effects.length >= 4
                          ) {
                            alert("Maximum of 4 effects allowed per layer");
                            return;
                          }
                          const effect = {
                            id: crypto.randomUUID(),
                            kind: "gate" as const,
                            rate: gateRate,
                            threshold: gateThreshold,
                            attack: gateAttack,
                            release: gateRelease,
                            mix: gateMix,
                          };
                          addLayerEffect(targetLayerId, effect);
                          // Get the current effects and add the new one for immediate engine update
                          const layerForUpdate = useAppStore
                            .getState()
                            .layers.find((l) => l.id === targetLayerId);
                          const existingEffects = layerForUpdate?.effects || [];
                          const updatedEffects = [...existingEffects, effect];
                          // Notify engine about effects change immediately
                          engines.current[targetLayerId]?.update({
                            effects: updatedEffects as any,
                          });
                        }}
                        className="inline-flex items-center gap-2 px-3 py-1.5 btn-shape bg-amber-500/80 hover:bg-amber-500 text-white text-xs font-medium transition-colors disabled:opacity-40"
                      >
                        <Plus size={16} /> Add to Layer
                      </button>
                    </div>
                  </div>
                </div>

                {/* Harmonic Exciter Effect Card */}
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="text-sm text-white font-medium">
                        Harmonic Exciter
                      </div>
                      <div className="text-[11px] text-white/60">
                        Adds brightness and harmonic enhancement
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="flex justify-between text-[11px] text-white/60">
                          <span>Drive</span>
                          <span className="text-white/80 font-medium">
                            {Math.round(harmonicDrive)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={1}
                          value={harmonicDrive}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            setHarmonicDrive(v);
                            harmonicHandleRef.current?.setDrive(v);
                          }}
                          className="w-full appearance-none cursor-pointer"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-[11px] text-white/60">
                          <span>Harmonics</span>
                          <span className="text-white/80 font-medium">
                            {Math.round(harmonicHarmonics)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={1}
                          value={harmonicHarmonics}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            setHarmonicHarmonics(v);
                            harmonicHandleRef.current?.setHarmonics(v);
                          }}
                          className="w-full appearance-none cursor-pointer"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="flex justify-between text-[11px] text-white/60">
                          <span>Tone</span>
                          <span className="text-white/80 font-medium">
                            {Math.round(harmonicTone)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={1}
                          value={harmonicTone}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            setHarmonicTone(v);
                            harmonicHandleRef.current?.setTone(v);
                          }}
                          className="w-full appearance-none cursor-pointer"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-[11px] text-white/60">
                          <span>Mix</span>
                          <span className="text-white/80 font-medium">
                            {Math.round(harmonicMix)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={1}
                          value={harmonicMix}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            setHarmonicMix(v);
                            harmonicHandleRef.current?.setMix(v);
                          }}
                          className="w-full appearance-none cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => {
                          if (harmonicHandleRef.current) {
                            stopHarmonicExciterPreview();
                          } else {
                            ensureHarmonicExciterPreviewStarted();
                          }
                        }}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 btn-shape text-white text-xs font-medium transition-colors ${
                          harmonicHandleRef.current
                            ? "bg-white/10 hover:bg-white/20"
                            : "bg-teal-500/80 hover:bg-teal-500"
                        }`}
                      >
                        {harmonicHandleRef.current ? (
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
                          // Check if layer already has 4 effects
                          const layerForCheck = useAppStore
                            .getState()
                            .layers.find((l) => l.id === targetLayerId);
                          if (
                            layerForCheck?.effects &&
                            layerForCheck.effects.length >= 4
                          ) {
                            alert("Maximum of 4 effects allowed per layer");
                            return;
                          }
                          const effect = {
                            id: crypto.randomUUID(),
                            kind: "harmonicexciter" as const,
                            drive: harmonicDrive,
                            harmonics: harmonicHarmonics,
                            tone: harmonicTone,
                            mix: harmonicMix,
                          };
                          addLayerEffect(targetLayerId, effect);
                          // Get the current effects and add the new one for immediate engine update
                          const layerForUpdate = useAppStore
                            .getState()
                            .layers.find((l) => l.id === targetLayerId);
                          const existingEffects = layerForUpdate?.effects || [];
                          const updatedEffects = [...existingEffects, effect];
                          // Notify engine about effects change immediately
                          engines.current[targetLayerId]?.update({
                            effects: updatedEffects as any,
                          });
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
          </div>
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
