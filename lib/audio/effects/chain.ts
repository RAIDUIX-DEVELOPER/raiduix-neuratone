import type { LayerEffect } from "@/lib/audio/types";
import log from "@/lib/logger";

// Generic helper to rebuild an effect chain given a mapping of effect kind to its handle map.
// Each handle is expected to expose inputGain/outputGain AudioNodes when chainable.
export interface EffectHandleLike {
  inputGain?: AudioNode;
  outputGain?: AudioNode;
  stop?: () => void;
  dispose?: () => void;
}

export interface EffectHandleMaps {
  [kind: string]: Map<string, EffectHandleLike>;
}

export function rebuildEffectChain(
  effects: LayerEffect[],
  maps: EffectHandleMaps,
  effectChainInput: AudioNode | null,
  effectChainOutput: AudioNode | null,
  ctx: AudioContext | null
) {
  if (!effectChainInput || !effectChainOutput || !ctx) return;
  try {
    effectChainInput.disconnect();
  } catch {}
  // Disconnect existing effect outputs so we can re-chain cleanly.
  for (const map of Object.values(maps)) {
    for (const h of map.values()) {
      try {
        (h as any).outputGain?.disconnect();
      } catch {}
    }
  }
  let currentNode: AudioNode = effectChainInput;
  let effectsWereChained = false;
  for (const fx of effects) {
    const map = maps[fx.kind];
    if (!map) continue;
    const handle = map.get(fx.id) as any;
    if (handle && handle.inputGain && handle.outputGain) {
      try {
        currentNode.connect(handle.inputGain);
        currentNode = handle.outputGain;
        effectsWereChained = true;
      } catch (e) {
        log.warn("Failed to chain effect", fx.kind, e);
      }
    }
  }
  if (!effectsWereChained && currentNode === effectChainInput) {
    log.debug("No chainable effects found, maintaining direct connection");
  }
  try {
    currentNode.connect(effectChainOutput);
  } catch (e) {
    log.warn("Failed to connect effect chain output", e);
    try {
      effectChainInput.connect(effectChainOutput);
    } catch (fallbackError) {
      log.error("Failed fallback connection", fallbackError);
    }
  }
}
