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
    return this.makeNode({
      type: "highpass",
      frequency: { value: 0, setValueAtTime: () => {} },
      Q: { value: 0 },
      gain: { value: 0 },
    });
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
  createDelay() {
    return this.makeNode({ delayTime: { value: 0, setValueAtTime: () => {} } });
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

describe("Effect parameter mapping", () => {
  beforeAll(() => {
    ensureAudioContext();
  });

  const makeLayer = (overrides: Partial<SoundLayer>): SoundLayer => ({
    id: "L1",
    type: "binaural",
    volume: 0.5,
    baseFreq: 220,
    beatOffset: 6,
    pulseFreq: 8,
    wave: "sine",
    effects: [],
    ...overrides,
  });

  test("binaural layer accepts and updates pingpong/combfilter/harmonicexciter", async () => {
    const layer = makeLayer({
      type: "binaural",
      effects: [
        { id: "e1", kind: "pingpong", time: 200, feedback: 35, mix: 40 },
        {
          id: "e2",
          kind: "combfilter",
          frequency: 660,
          resonance: 60,
          mix: 50,
        },
        {
          id: "e3",
          kind: "harmonicexciter",
          drive: 25,
          harmonics: 55,
          tone: 45,
          mix: 50,
        },
      ],
    });
    const engine = createEngine(layer);
    await engine.start();
    // Update effect params should not throw
    expect(() =>
      engine.update({
        effects: [
          { id: "e1", kind: "pingpong", time: 350, feedback: 20, mix: 60 },
          {
            id: "e2",
            kind: "combfilter",
            frequency: 880,
            resonance: 40,
            mix: 70,
          },
          {
            id: "e3",
            kind: "harmonicexciter",
            drive: 40,
            harmonics: 70,
            tone: 60,
            mix: 55,
          },
        ],
      })
    ).not.toThrow();
    engine.stop();
    engine.dispose();
  });

  test("isochronic layer accepts and updates pingpong/combfilter/harmonicexciter", async () => {
    const layer = makeLayer({
      type: "isochronic",
      pulseFreq: 10,
      effects: [
        { id: "e1", kind: "pingpong", time: 180, feedback: 25, mix: 30 },
        {
          id: "e2",
          kind: "combfilter",
          frequency: 500,
          resonance: 55,
          mix: 40,
        },
        {
          id: "e3",
          kind: "harmonicexciter",
          drive: 30,
          harmonics: 50,
          tone: 50,
          mix: 60,
        },
      ],
    });
    const engine = createEngine(layer);
    await engine.start();
    // Update effect params should not throw
    expect(() =>
      engine.update({
        effects: [
          { id: "e1", kind: "pingpong", time: 220, feedback: 45, mix: 35 },
          {
            id: "e2",
            kind: "combfilter",
            frequency: 700,
            resonance: 35,
            mix: 45,
          },
          {
            id: "e3",
            kind: "harmonicexciter",
            drive: 45,
            harmonics: 65,
            tone: 40,
            mix: 65,
          },
        ],
      })
    ).not.toThrow();
    engine.stop();
    engine.dispose();
  });
});
