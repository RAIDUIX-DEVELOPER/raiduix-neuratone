"use client";

// Shared master bus per AudioContext to keep headroom and reduce clipping.
// Chain: input -> DC highpass -> compressor -> soft clip -> analyser -> destination

const busByCtx = new WeakMap<
  AudioContext,
  {
    input: GainNode;
    dcBlock: BiquadFilterNode;
    comp: DynamicsCompressorNode;
    clip: WaveShaperNode;
    analyser: AnalyserNode;
    output: AudioDestinationNode;
    setGain: (v: number) => void;
    dispose: () => void;
  }
>();

function createSoftClipCurve(amount = 0.5, samples = 1024) {
  // Amount 0..1, gentle soft-clip curve
  const k = Math.max(0.0001, Math.min(1, amount)) * 2;
  const curve = new Float32Array(samples);
  for (let i = 0; i < samples; i++) {
    const x = (i / (samples - 1)) * 2 - 1;
    curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
  }
  return curve;
}

export function getMasterBus(ctx: AudioContext) {
  let bus = busByCtx.get(ctx);
  if (bus) return bus;

  const input = ctx.createGain();
  input.gain.value = 0.85; // headroom

  const dcBlock = ctx.createBiquadFilter();
  dcBlock.type = "highpass";
  dcBlock.frequency.value = 20; // remove DC/infra

  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -12; // mild glue
  comp.knee.value = 12;
  comp.ratio.value = 2.5;
  comp.attack.value = 0.003;
  comp.release.value = 0.25;

  const clip = ctx.createWaveShaper();
  clip.curve = createSoftClipCurve(0.35, 2048);
  clip.oversample = "2x";

  const analyser = ctx.createAnalyser();
  analyser.fftSize = 2048;

  input
    .connect(dcBlock)
    .connect(comp)
    .connect(clip)
    .connect(analyser)
    .connect(ctx.destination);

  bus = {
    input,
    dcBlock,
    comp,
    clip,
    analyser,
    output: ctx.destination,
    setGain: (v: number) => {
      input.gain.setValueAtTime(Math.max(0, Math.min(1, v)), ctx.currentTime);
    },
    dispose: () => {
      try {
        input.disconnect();
      } catch {}
      try {
        dcBlock.disconnect();
      } catch {}
      try {
        comp.disconnect();
      } catch {}
      try {
        clip.disconnect();
      } catch {}
      try {
        analyser.disconnect();
      } catch {}
      busByCtx.delete(ctx);
    },
  };

  busByCtx.set(ctx, bus);
  return bus;
}

export type MasterBus = ReturnType<typeof getMasterBus>;
