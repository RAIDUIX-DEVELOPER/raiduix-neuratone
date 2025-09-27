import "@testing-library/jest-dom";

// Minimal Web Audio mocks (extend as needed for integration tests)
class FakeAudioParam {
  value = 0;
  setValueAtTime(v: number) {
    this.value = v;
  }
  linearRampToValueAtTime(v: number) {
    this.value = v;
  }
  cancelScheduledValues() {}
  exponentialRampToValueAtTime(v: number) {
    this.value = v;
  }
}

class FakeGainNode {
  constructor(public context: any) {}
  gain = new FakeAudioParam();
  connect() {
    return this;
  }
  disconnect() {}
}

(global as any).AudioContext = class {
  currentTime = 0;
  createGain() {
    return new FakeGainNode(this);
  }
  resume() {
    return Promise.resolve();
  }
};

// Basic crypto.randomUUID polyfill for tests (not cryptographically secure)
if (!(global as any).crypto) {
  (global as any).crypto = {};
}
if (!(global as any).crypto.randomUUID) {
  (global as any).crypto.randomUUID = () =>
    "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
}
