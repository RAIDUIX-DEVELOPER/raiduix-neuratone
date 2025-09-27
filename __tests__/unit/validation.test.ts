import { normalizeLayerPatch } from "@/lib/validation";

describe("normalizeLayerPatch", () => {
  it("clamps baseFreq", () => {
    expect(normalizeLayerPatch({ baseFreq: -10 }).baseFreq).toBe(1);
    expect(normalizeLayerPatch({ baseFreq: 99999 }).baseFreq).toBe(5000);
  });
  it("clamps beatOffset", () => {
    expect(normalizeLayerPatch({ beatOffset: -1 }).beatOffset).toBe(0);
    expect(normalizeLayerPatch({ beatOffset: 50000 }).beatOffset).toBe(1000);
  });
  it("passes through valid values unchanged", () => {
    expect(normalizeLayerPatch({ baseFreq: 440 }).baseFreq).toBe(440);
  });
});
