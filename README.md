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
- **Effects Library (drawer)** with per‑layer effects:
  - Built‑in noise generator: **white, pink, brown** (AudioWorklet)
  - Live preview (separate audio context), gain and pan controls
  - Add to a target layer; shows as removable chips (color‑coded)
- **Presets (drawer)**: load, update, save‑as, delete; effects are persisted
- **Help overlay**: in‑app guidance with accordions (global controls, layers, effects, presets, visualizer, engine basics, tips)
- **Unified play/stop** toggles (global and per‑layer)
- PWA scaffolding (service worker only in prod) — offline audio streams are not bundled
- Mobile‑first UI with accessible contrast and subtle motion

## 🧠 Audio Engine Architecture

| Type       | Generation            | Modulation                         | Notes                                                        |
| ---------- | --------------------- | ---------------------------------- | ------------------------------------------------------------ |
| Binaural   | Two oscillators (L/R) | Frequency difference (beat offset) | Symmetric around base; clamps ≥ 1 Hz; Tone.js or native path |
| Isochronic | Single oscillator     | Gated pulses / intervals           | Envelope (Tone) or native Gain gate; clamps ≥ 1 Hz           |
| Ambient    | Howler loop           | Volume / pan / source swap         | Replace with licensed/CC0 assets                             |
| Effects    | AudioWorklet + panner | Per‑effect gain/pan                | Noise worklet (white/pink/brown), per‑context module loading |

Analyser strategy:

- Prefer Tone analysers when available; otherwise use native `AnalyserNode`.
- Orb visualizer pulls composite energy from all active layers.

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
- Optional reverb / spatialization chain

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
