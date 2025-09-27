<div align="center">
	<h1>NeuraToneᴿᴬᴵᴰᵁᴵˣ</h1>
	<p><strong>Layer Your Mind With Sound.</strong><br/>Progressive Web App for crafting multi‑layered binaural / isochronic / ambient soundscapes.</p>
	<p>
		<sub>Built with Next.js App Router · TypeScript · Tone.js · Web Audio · Howler · Zustand · Tailwind · Framer Motion</sub>
	</p>
	<img src="public/globe.svg" width="72" alt="NeuraTone" />
</div>

---

## Table of Contents

- Intro
- Current Feature Set
- Professional Audio Effects
- Audio Engine Architecture
- State & Persistence
- Visualizer
- Getting Started
- Project Structure
- Presets Library (Solfeggio set)
- SEO, PWA, and Analytics
- Development Scripts
- Troubleshooting FAQ
- Accessibility & Performance
- Roadmap
- Contributing
- License & Disclaimer

## ✨ Current Feature Set

- Up to **5 simultaneous layers** (binaural, isochronic, ambient)
- Real‑time controls with precise inputs:
  - Base frequency 1–5000 Hz (slider + number input)
  - Beat offset (binaural) 0–1000 Hz (symmetric L/R application)
  - Pulse rate (isochronic) 0.1–50 Hz
  - Waveform: sine / square / saw / triangle
  - Pan and volume per layer
- Resilient audio engine: hybrid **Tone.js + native Web Audio** with safe fallbacks
- Visuals: lightweight **Orb visualizer** driven by per‑layer analysers
- **Professional Effects Library (drawer)** with per‑layer effects:
  - **17 High-Quality Audio Effects** including advanced spatial processing
  - Built‑in noise generator: **white, pink, brown** (AudioWorklet)
  - **Enhanced Modulation Effects**: Advanced Chorus, Phaser, Flanger with stereo processing
  - **Advanced Spatial Effects**: Professional Reverb with multi-tap delays & diffusion matrices
  - **Professional Dynamics**: Multi-Band Compressor with frequency-aware compression
  - **Creative Effects**: Ring Modulator, Tremolo, Ping-Pong Delay, Comb Filter
  - **Filter Effects**: Acid Filter, Filter Envelope, Harmonic Exciter, Gate, Supersaw
  - Live preview (separate audio context), gain and pan controls
  - Add to a target layer; shows as removable chips (color‑coded)
- **Presets (drawer)**: load, update, save‑as, delete; effects are persisted
- **Help overlay**: in‑app guidance with accordions (global controls, layers, effects, presets, visualizer, engine basics, tips)
- **Unified play/stop** toggles (global and per‑layer)
- PWA scaffolding (service worker only in prod) — offline audio streams are not bundled
- Mobile‑first UI with accessible contrast and subtle motion

Notes on accuracy and real‑time behavior:

- Isochronic pulses use audio‑rate gating with smoothing to avoid clicks and ensure precise pulse frequency output.
- Effect parameters update live; the signal path is safely rebuilt so changes are audible immediately without artifacts.
- Effect modules accept legacy/alias parameter names to keep UI and engine in sync during refactors.

## 🎛️ Professional Audio Effects

NeuraTone features a comprehensive library of **17 professional-grade audio effects** designed for immersive soundscape creation:

### **Spatial & Reverb Effects**

- **Advanced Reverb**: Multi-tap delays, diffusion matrices, mathematical room simulation
- **Chorus**: Stereo processing, feedback control, high-frequency damping
- **Flanger**: Stereo width control, envelope follower, dynamic response
- **Phaser**: Notch depth control, resonance feedback, LFO shape selection

### **Dynamics & Compression**

- **Multi-Band Compressor**: 3-band frequency separation with independent compression curves
- **Gate**: Precise threshold control with attack/release timing
- **Harmonic Exciter**: Add warmth and presence to any layer

### **Modulation & Movement**

- **Tremolo**: Amplitude modulation with adjustable rate and depth
- **Auto-Pan**: Automated stereo movement for spatial effects
- **Ring Modulator**: Classic analog-style ring modulation

### **Filter & Synthesis**

- **Acid Filter**: Classic resonant filter with envelope modulation
- **Filter Envelope**: ADSR-controlled filter sweeps
- **Comb Filter**: Resonant comb filtering for metallic textures
- **Supersaw**: Unison saw wave synthesis with detuning

### **Utility & Noise**

- **Noise Generator**: White, pink, brown noise with stereo panning
- **Ping-Pong Delay**: Stereo delay with feedback control

All effects feature real-time parameter control, wet/dry mixing, and seamless integration with the layer system.

## 🧠 Audio Engine Architecture

### **System Overview**

NeuraTone implements a sophisticated multi-engine audio architecture with professional signal routing and effects processing:

```
┌────────────────────────────────────────────────────────────────────────────┐
│                         NEURATONE AUDIO ARCHITECTURE                       │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐         │
│  │   BINAURAL      │    │   ISOCHRONIC    │    │   AMBIENT       │         │
│  │   LAYERS        │    │   LAYERS        │    │   LAYERS        │         │
│  │                 │    │                 │    │                 │         │
│  │ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │         │
│  │ │Left Osc     │ │    │ │Pulse Osc    │ │    │ │Howl.js      │ │         │
│  │ │(Base-Beat/2)│ │    │ │(Pulse Freq) │ │    │ │Audio Files  │ │         │
│  │ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │         │
│  │ ┌─────────────┐ │    │       │         │    │       │         │         │
│  │ │Right Osc    │ │    │       ▼         │    │       ▼         │         │
│  │ │(Base+Beat/2)│ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │         │
│  │ └─────────────┘ │    │ │Gain Node    │ │    │ │Gain Node    │ │         │
│  │       │         │    │ └─────────────┘ │    │ └─────────────┘ │         │
│  │       ▼         │    │       │         │    │       │         │         │
│  │ ┌─────────────┐ │    │       ▼         │    │       ▼         │         │
│  │ │Merger Node  │ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │         │
│  │ │(L/R Combine)│ │    │ │Stereo Pan   │ │    │ │Stereo Pan   │ │         │
│  │ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │         │
│  │       │         │    │       │         │    │       │         │         │
│  │       ▼         │    │       ▼         │    │       ▼         │         │
│  │ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │         │
│  │ │Volume Node  │ │    │ │Analyser     │ │    │ │Analyser     │ │         │
│  │ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │         │
│  │       │         │    │       │         │    │       │         │         │
│  │       ▼         │    │       ▼         │    │       ▼         │         │
│  │ ┌─────────────┐ │    └───────┬─────────┘    └───────┬─────────┘         │
│  │ │Stereo Pan   │ │            │                      │                   │
│  │ └─────────────┘ │            │                      │                   │
│  │       │         │            │                      │                   │
│  │       ▼         │            │                      │                   │
│  │ ┌─────────────┐ │            │                      │                   │
│  │ │Analyser     │ │            │                      │                   │
│  │ └─────────────┘ │            │                      │                   │
│  │       │         │            │                      │                   │
│  └───────┼─────────┘            │                      │                   │
│          │                      │                      │                   │
│          ▼                      ▼                      ▼                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      MASTER BUS CHAIN                               │   │
│  │                                                                     │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐   │   │
│  │  │Input Gain   │→ │DC Highpass  │→ │Compressor   │→ │Soft Clip  │   │   │
│  │  │(0.85 gain)  │  │(20Hz filter)│  │(Dynamics)   │  │(Waveshaper│   │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └───────────┘   │   │
│  │         │                 │                │               │        │   │
│  │         ▼                 ▼                ▼               ▼        │   │
│  │  ┌─────────────┐                                   ┌───────────┐    │   │
│  │  │Master       │                                   │Master     │    │   │
│  │  │Analyser     │                                   │Output     │    │   │
│  │  └─────────────┘                                   └───────────┘    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     EFFECTS PROCESSING                              │   │
│  │                                                                     │   │
│  │  Each Layer can have up to 4 effects from these types:              │   │
│  │                                                                     │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐    │   │
│  │  │   NOISE     │ │  AUTOPAN    │ │  RING MOD   │ │  TREMOLO    │    │   │
│  │  │ Generator   │ │ L/R Panning │ │ Frequency   │ │ Amplitude   │    │   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘    │   │
│  │                                                                     │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐    │   │
│  │  │   CHORUS    │ │  FLANGER    │ │   PHASER    │ │ PING PONG   │    │   │
│  │  │ Multi-delay │ │ Short Delay │ │ All-pass    │ │   DELAY     │    │   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘    │   │
│  │                                                                     │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐    │   │
│  │  │COMB FILTER  │ │ACID FILTER  │ │    GATE     │ │ HARMONIC    │    │   │
│  │  │Resonant     │ │ Sweeping    │ │ Amplitude   │ │ EXCITER     │    │   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘    │   │
│  │                                                                     │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                    │   │
│  │  │  REVERB     │ │MULTIBAND    │ │AUTOMATION   │                    │   │
│  │  │ Space       │ │COMPRESSOR   │ │Parameters   │                    │   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘                    │   │
│  │                                                                     │   │
│  │  Effects are applied per layer and routed to master bus             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────────┘
```

### **Engine Specifications**

| Type       | Generation            | Modulation                         | Notes                                                        |
| ---------- | --------------------- | ---------------------------------- | ------------------------------------------------------------ |
| Binaural   | Two oscillators (L/R) | Frequency difference (beat offset) | Symmetric around base; clamps ≥ 1 Hz; Tone.js or native path |
| Isochronic | Single oscillator     | Gated pulses / intervals           | Audio‑rate gate with smoothing; clamps ≥ 1 Hz                |
| Ambient    | Howler loop           | Volume / pan / source swap         | Replace with licensed/CC0 assets                             |
| Effects    | AudioWorklet + panner | Per‑effect gain/pan                | Noise worklet (white/pink/brown), per‑context module loading |

### **Signal Flow Details**

1. **Layer Generation**: Each engine type generates audio using different synthesis methods
2. **Effects Processing**: Up to 4 effects per layer with individual parameter control
3. **Master Bus**: Professional audio chain with DC blocking, compression, and soft limiting
4. **Analysis**: Multiple analyser nodes feed the visualizer system
5. **Output**: Final audio routed to system audio destination

**Analyser Strategy:**

- Prefer Tone analysers when available; otherwise use native `AnalyserNode`
- Orb visualizer pulls composite energy from all active layers
- Real-time waveform and frequency analysis for visual feedback

## 🗃 State & Persistence

Zustand store (`lib/store.ts`):

- `layers[]` – ephemeral composition state
- `presets[]` – persisted via `zustand/middleware/persist` (key: `neuratone-store`)
- `effects[]` per layer – persisted in presets (chips on the layer cards)
- Overwrite logic: case‑insensitive name match triggers confirmation
- Delete logic: modal confirmation, immutable list update

## 🧩 Visualizer

- Orb visualizer renders a subtle, responsive field driven by analyser data.
- Aggregates per‑layer analysers into a single visual response.

## 🖱 Hero Interaction Physics

Canvas (`HeroWaves.tsx`):

- Multi‑frequency additive synthesis per line (3 layered sines)
- Elastic stick: Gaussian influence centered at pointer, easing ramp + decay
- Ripple emission on release: expanding, decaying Gaussian wave packet
- Subtle amplitude modulation & per‑line phase divergence
- Reduced motion mode still animates gently (no abrupt disable)

## 🚀 Getting Started

Prerequisites: Node 18+ (or 20+), pnpm (recommended) / npm / yarn.

```bash
pnpm install
pnpm dev
# Visit http://localhost:3000
```

Build & Preview:

```bash
pnpm build
pnpm start
```

Using npm instead of pnpm:

```bash
npm install
npm run dev
# Build
npm run build
npm start
```

## 🛠 Project Structure (excerpt)

```
app/
	page.tsx                # Landing: hero, Learn, FAQ
	app/page.tsx            # Mixer dashboard (App Router nested route)
	app/ui/MixerNew.tsx     # Mixer + drawers (Presets, Effects) + Help overlay
	ui/HeroWaves.tsx        # Interactive hero waveform background
lib/
	audioEngine.ts          # Engines (binaural/isochronic/ambient) + effects routing
	store.ts                # Zustand state (layers, presets, per-layer effects)
	effects/                # Effect helpers (noise worklet wrapper)
public/
	worklets/noise-processor.js  # AudioWorklet: white/pink/brown noise
```

## 🎚 Presets Library (Solfeggio set)

- Built‑in presets are available in the Presets drawer and as dedicated pages under `/presets/*`.
- Includes five Solfeggio‑inspired soundscapes that blend carriers, binaural/isochronic beats, subtle effects, and noise layers:
  - 396 Hz · 528 Hz · 639 Hz · 741 Hz · 852 Hz
- Each preset includes balanced levels, gentle spatialization, and conservative dynamics to avoid harshness.
- Presets persist locally; you can customize, “Save As…”, and delete.
- Autoload: Navigate with a `?preset=<id>` query to open the Mixer and load a preset directly.

SEO routing is configured so the hub and individual preset pages are discoverable and included in the sitemap.

## 🔐 Permissions & Safety Notes

This app does not collect personal data. All presets are local. If deploying commercial variants add a privacy policy & consent UI.

## 🔄 Replacing Ambient Audio

Edit `ambientSources` in `lib/audioEngine.ts` with CC0 / licensed loops:

```ts
const ambientSources = {
  rain: "https://example.com/rain.mp3",
  white: "https://example.com/white.mp3",
};
```

## 🧪 Development Tips

- If audio fails to start initially: ensure a user gesture occurred (autoplay policies) – click a Play button.
- Noise effect error about AudioWorklet? The app loads the worklet per‑context; if you hot‑reloaded, toggle the Effect preview or restart the layer.
- Layer removal leaves ghost audio? Engines call `stop()` + `dispose()` before store removal – check console for any thrown DOMExceptions and retry.
- If effects don’t seem to apply: the engine rebuilds the per‑layer effect chain on updates—toggle the effect off/on to force a reconcile if you hot‑reloaded during development.
- Phaser specific: creation uses a rate/depth/stages signature with feedback set via a setter—ensure your UI maps those correctly.
- Ring Mod & other previews: the Effects Library uses a separate preview path with an injected oscillator so effects are audible without a layer.

## 🌐 SEO, PWA, and Analytics

- SEO: `app/sitemap.ts` and `app/robots.ts` generate sitemap and robots; new preset routes are included.
- PWA: `next-pwa` is wired for production builds; service worker is not active in dev.
- Analytics: `@vercel/analytics` can be enabled per page or globally; keep usage minimal for privacy.

## 🧰 Development Scripts

Scripts defined in `package.json`:

- `dev` — Next.js dev server (Turbopack)
- `build` — Production build (Turbopack)
- `start` — Start production server
- `lint` — Run Next lint
- `analyze:bundle` — Visualize bundle size
- `test`, `test:watch`, `test:ci` — Jest test suite

Optional tasks (VS Code tasks.json) are available in this repo to streamline CI‑like checks.

## 🧯 Troubleshooting FAQ

- No audio on first play? Most browsers require a user gesture—click Play once to unlock the AudioContext.
- Hearing clicks on isochronic pulses? The gate uses smoothing, but avoid extreme pulse rates; 0.1–50 Hz is the intended range.
- Ghost audio after hot‑reload? Stop layers and restart; engines call stop+dispose, but dev hot‑swap can leave dangling nodes.
- Noise effect failed to initialize? The noise AudioWorklet is loaded per context—toggle the effect or reload the page.
- CPU high on mobile? Reduce active layers, disable heavy effects (reverb/compressor), and lower visualizer quality.

## ♿ Accessibility & Performance

- Color contrast meets accessible defaults; motion is subtle and respects reduced‑motion where possible.
- Audio output uses a master bus with DC blocking, gentle compression, and soft clipping to avoid spikes.
- Effects and analysers are shared and reused where possible to minimize CPU.

## 🧭 Roadmap (Potential Next Steps)

- Cloud sync / user accounts (Supabase or Cognito)
- Sharable preset export (URL or JSON blob)
- Advanced psychoacoustic profiles (Gamma ramp, Pomodoro presets)
- Custom ambient library manager
- CPU adaptive visual FPS throttling
- ✅ **Advanced Reverb & Spatial Effects** (Recently Added)
- ✅ **Multi-Band Compressor** (Recently Added)
- ✅ **Professional Effects Library** (Recently Added)
- Advanced effect chaining and routing
- MIDI controller integration for real-time effect control

## 🧪 How to add a new Effect (developer quick‑start)

1. Create an effect node module in `lib/effects/<name>.ts` exposing a handle with `inputGain`, `outputGain`, and parameter setters.
2. Register it in the layer engines by adding it to the reconcile logic and to `rebuildEffectChain` mappings.
3. Add a preview block in the Effects Library UI (Mixer) so users can audition it.
4. Add basic tests (happy path + parameter updates) and a short note in this README.

## 🤝 Contributing

PRs welcome. Suggested flow:

1. Fork & branch (`feat/preset-sharing`)
2. Run lint / type check before commit
3. Keep commits small & focused
4. Add short description in PR body

## 🧾 License

© RAIDUIX 2025 – All rights reserved (proprietary internal project). For external reuse, clarify licensing before distribution.

## ⚠️ Disclaimer

Auditory entrainment responses vary. Not medical advice. Avoid use while driving or operating machinery. Consult a professional if you have neurological or auditory conditions.

---

Built with curiosity & calm.
