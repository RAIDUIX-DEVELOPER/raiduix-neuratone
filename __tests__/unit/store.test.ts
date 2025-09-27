import { useAppStore } from "@/lib/store";

// Helper to isolate store between tests
function resetStore() {
  const { layers, presets } = useAppStore.getState();
  // Not fully resetting persistence; focusing on operational behaviors
  layers.splice(0, layers.length);
  presets.splice(0, presets.length);
}

describe("useAppStore basic behaviors", () => {
  beforeEach(() => {
    resetStore();
  });

  it("adds a layer with defaults and clamps values", () => {
    useAppStore.getState().addLayer({ baseFreq: 99999 });
    const l = useAppStore.getState().layers[0];
    expect(l.baseFreq).toBeLessThanOrEqual(5000);
  });

  it("updates a layer and clamps out-of-range patch", () => {
    useAppStore.getState().addLayer({ baseFreq: 440 });
    const id = useAppStore.getState().layers[0].id;
    useAppStore.getState().updateLayer(id, { beatOffset: 50000 });
    const updated = useAppStore.getState().layers[0];
    expect(updated.beatOffset).toBe(1000);
  });
});
