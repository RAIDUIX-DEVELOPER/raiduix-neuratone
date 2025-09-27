// Shared AudioContext management extracted from legacy audioEngine.
// Provides a single point for future suspend/resume & feature detection.

let sharedCtx: AudioContext | null = null;

export function getAudioContext() {
  if (typeof window === "undefined") return null;
  if (!sharedCtx) {
    const Ctx: typeof AudioContext =
      window.AudioContext || (window as any).webkitAudioContext;
    sharedCtx = new Ctx();
  }
  return sharedCtx;
}

export async function resumeIfSuspended() {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {}
  }
}

export function disposeAudioContext() {
  // Not typically disposed in web apps; placeholder for future teardown.
}
