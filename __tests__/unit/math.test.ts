import { computeBinauralPair } from "@/lib/utils/math";

describe("computeBinauralPair", () => {
  it("centers beat around base frequency", () => {
    const [l, r] = computeBinauralPair(440, 10);
    expect(r - l).toBeCloseTo(10, 5);
    expect((l + r) / 2).toBeCloseTo(440, 5);
  });
  it("never goes below 1Hz", () => {
    const [l, r] = computeBinauralPair(2, 10); // would push left below 1 without clamp
    expect(l).toBeGreaterThanOrEqual(1);
    expect(r).toBeGreaterThan(l);
  });
  it("handles zero/negative base gracefully", () => {
    const [l, r] = computeBinauralPair(0, 8);
    expect(l).toBeGreaterThanOrEqual(1);
    expect(r).toBeGreaterThanOrEqual(1);
  });
});
