<div align="center">
	<h1>NeuraToneᴿᴬᴵᴰᵁᴵˣ</h1>
	<p><strong>Layer Your Mind With Sound.</strong><br/>Progressive Web App for crafting multi‑layered binaural / isochronic / ambient soundscapes.</p>
	<p>
		<sub>Built with Next.js App Router · TypeScript · Tone.js · Web Audio · Howler · Zustand · Tailwind · Framer Motion</sub>
	</p>
	<img src="public/globe.svg" width="72" alt="NeuraTone" />
</div>

---

## ✨ Current Feature Set

- Up to **5 simultaneous layers** (binaural, isochronic, ambient)
- Real‑time controls with precise inputs:
  - Base frequency 1–5000 Hz (slider + number input)
  - Beat offset (binaural) 0–1000 Hz (symmetric L/R application)
  - Pulse rate (isochronic) 0.5–1000 Hz
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
| Isochronic | Single oscillator     | Gated pulses / intervals           | Envelope (Tone) or native Gain gate; clamps ≥ 1 Hz           |
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
