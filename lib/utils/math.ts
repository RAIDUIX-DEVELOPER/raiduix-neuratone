// Math utilities extracted from legacy audioEngine monolith.
// TODO: Remove duplicated inline versions once engine refactor completes.

/**
 * Compute left/right carrier frequencies for binaural beat generation.
 * Ensures neither channel drops below 1 Hz.
 */
export function computeBinauralPair(base: number, beat: number) {
  const safeBase = Math.max(1, base || 0);
  const l = Math.max(1, safeBase - beat / 2);
  const r = Math.max(1, safeBase + beat / 2);
  return [l, r] as const;
}
