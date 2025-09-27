// Minimal typed event emitter for future engine module.
export type EngineEvent =
  | "layer-created"
  | "layer-disposed"
  | "layer-updated"
  | "effect-chain-rebuilt"
  | "engine-error"
  | "performance-sample";

export type EngineEventPayloads = {
  "layer-created": { id: string; type: string };
  "layer-disposed": { id: string };
  "layer-updated": { id: string; changed: string[] };
  "effect-chain-rebuilt": { id: string; count: number; durationMs: number };
  "engine-error": { id?: string; error: unknown; code: string };
  "performance-sample": { fps: number; audioDriftMs?: number };
};

export type Listener<K extends EngineEvent> = (
  p: EngineEventPayloads[K]
) => void;

export class EngineEvents {
  // Loosened internal typing to avoid complex generic constraint collisions.
  private listeners: Record<string, Set<(...args: any[]) => void>> = {};

  on<K extends EngineEvent>(evt: K, fn: Listener<K>) {
    (this.listeners[evt] ||= new Set()).add(fn as any);
    return () => this.off(evt, fn);
  }
  off<K extends EngineEvent>(evt: K, fn: Listener<K>) {
    this.listeners[evt]?.delete(fn as any);
  }
  emit<K extends EngineEvent>(evt: K, payload: EngineEventPayloads[K]) {
    this.listeners[evt]?.forEach((fn) => {
      try {
        fn(payload);
      } catch {}
    });
  }
}

export const engineEvents = new EngineEvents();
