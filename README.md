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

- Up to **5 simultaneous layers** (binaural, isochronic, ambient placeholder noise)
- Real‑time controls: frequency, beat offset (binaural), pulse rate (isochronic), waveform (sine / square / saw / triangle), pan, volume
- Resilient audio engine: hybrid **Tone.js + native Web Audio** fallback logic
- Live **waveform + spectrogram visualizers** with averaged multi‑layer analysis & independent toggles
- **Add / remove** layers dynamically (engines stop & dispose cleanly)
- **Local presets** (save / overwrite by name with confirmation modal, delete with confirmation)
- **No bundled default presets** – entirely user defined now
- PWA scaffolding in place (service worker only in prod) — offline playback is not currently supported
- **Elastic hero background**: multi-line organic canvas waveform with subtle motion, interactive stick + ripple physics
- Mobile‑first UI with glassy dark surfaces & accessible contrast

## 🧠 Audio Engine Architecture

| Type       | Generation          | Modulation                         | Notes                                                        |
| ---------- | ------------------- | ---------------------------------- | ------------------------------------------------------------ |
| Binaural   | Two oscillators L/R | Frequency difference (beat offset) | Recreates oscillators if already started (DOMException safe) |
| Isochronic | Single oscillator   | Gated pulses / intervals           | Native or Tone envelope fallback                             |
| Ambient    | Howler loop         | Volume / pan / source swap         | Placeholder silent assets (replace with CC0)                 |

Analyser strategy:

- Tone nodes preferred when available; otherwise native `AnalyserNode`.
- Waveform & FFT data merged across active engines (simple average) before drawing.

## 🗃 State & Persistence

Zustand store (`lib/store.ts`):

- `layers[]` – ephemeral composition state
- `presets[]` – persisted via `zustand/middleware/persist` (key: `neuratone-store`)
- Overwrite logic: case‑insensitive name match triggers confirmation modal
- Delete logic: modal confirmation, immutable list update

## 🧩 Visualization Loop

- Throttled ~24 FPS draw cycle for efficiency
- Waveform: time‑domain average into single polyline
- Spectrogram: vertical scroll column shift + per‑row bin mapping with hue ramp
- Hidden canvases stop painting (conditional mount pattern)

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
	page.tsx          # Landing + hero waves
	app/page.tsx      # Mixer dashboard (App Router nested route)
	app/ui/Mixer.tsx  # Core mixer + visualizers + presets
	ui/HeroWaves.tsx  # Interactive hero waveform background
lib/
	audioEngine.ts    # Engine creation + analysers
	store.ts          # Zustand state (layers & presets)
public/             # Static assets / icons
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

- If audio fails to start on first interaction: ensure a user gesture occurred (browser autoplay policies) – e.g. click play.
- Spectrogram looking blank? Verify at least one playing layer & check analyser sizes (Tone fallback may differ).
- Layer removal leaves ghost audio? Engine `stop()` + `dispose()` is invoked before store removal – inspect console for errors.

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
