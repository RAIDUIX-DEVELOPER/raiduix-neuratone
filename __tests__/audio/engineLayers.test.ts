import { createEngine } from "@/lib/audioEngine";
import type { SoundLayer } from "@/lib/audio/types";

// Simple mock for window.AudioContext if not present (JSDOM)
class MockAudioContext {
  currentTime = 0;
  state: AudioContextState = "running";
  destination: any = { connect: () => {} };
  private makeNode(extra: any = {}) {
    return {
      connect: () => this.makeNode(),
      disconnect: () => {},
      ...extra,
    };
  }
  createGain() {
    return this.makeNode({
      gain: {
        value: 1,
        setValueAtTime: () => {},
        linearRampToValueAtTime: () => {},
        cancelScheduledValues: () => {},
      },
    });
  }
  createOscillator() {
    return this.makeNode({
      type: "sine",
      frequency: { value: 440, setValueAtTime: () => {} },
      start: () => {},
      stop: () => {},
    });
  }
  createStereoPanner() {
    return this.makeNode({ pan: { value: 0 } });
  }
  createChannelMerger() {
    return this.makeNode();
  }
  createAnalyser() {
    return this.makeNode({
      fftSize: 0,
      getByteTimeDomainData: () => {},
      getByteFrequencyData: () => {},
    });
  }
  createBiquadFilter() {
    return this.makeNode({ type: "highpass", frequency: { value: 0 } });
  }
  createDynamicsCompressor() {
    return this.makeNode({
      threshold: { value: 0 },
      knee: { value: 0 },
      ratio: { value: 0 },
      attack: { value: 0 },
      release: { value: 0 },
    });
  }
  createWaveShaper() {
    return this.makeNode({
      curve: new Float32Array(0),
      oversample: "none" as const,
    });
  }
  createBuffer() {
    return {};
  }
  resume = async () => {
    this.state = "running";
  };
}

function ensureAudioContext() {
  if (typeof window === "undefined") return;
  // @ts-ignore
  window.AudioContext = MockAudioContext as any;
  // Stub Howler (avoid network/audio operations)
  jest.mock("howler", () => ({
    Howl: class {
      _vol = 1;
      _pan = 0;
      constructor(public cfg: any) {}
      play() {
        return 1;
      }
      stereo(p: number) {
        this._pan = p;
      }
      volume(v?: number) {
        if (v !== undefined) this._vol = v;
        return this._vol;
      }
      stop() {}
      unload() {}
    },
  }));
}

describe("Engine layer factories", () => {
  beforeAll(() => {
    ensureAudioContext();
  });

  const baseLayer = (overrides: Partial<SoundLayer>): SoundLayer => ({
    id: "test",
    type: "binaural",
    volume: 0.5,
    baseFreq: 200,
    beatOffset: 4,
    pulseFreq: 8,
    wave: "sine",
    effects: [],
    ...overrides,
  });

  test("creates binaural layer and start/stop/update without throwing", async () => {
    const l = baseLayer({ type: "binaural" });
    const engine = createEngine(l);
    await engine.start();
    expect(() => engine.update({ volume: 0.7 })).not.toThrow();
    expect(() => engine.stop()).not.toThrow();
    expect(() => engine.dispose()).not.toThrow();
  });

  test("creates isochronic layer and start/stop/update without throwing", async () => {
    const l = baseLayer({ type: "isochronic", pulseFreq: 10 });
    const engine = createEngine(l);
    await engine.start();
    engine.update({ pulseFreq: 12, volume: 0.3 });
    expect(() => engine.stop()).not.toThrow();
    engine.dispose();
  });

  test("creates ambient layer and start/stop/update without throwing", async () => {
    const l = baseLayer({ type: "ambient", volume: 0.2 });
    const engine = createEngine(l);
    await engine.start();
    engine.update({ volume: 0.4, pan: -0.3 });
    engine.stop();
    engine.dispose();
  });
});
