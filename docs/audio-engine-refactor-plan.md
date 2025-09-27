# Audio Engine Refactor Plan

Status: Draft
Owner: Initial Draft (AI Assistant)
Last Updated: 2025-09-25

## Goals

- Reduce ~1950 line monolith (`lib/audioEngine.ts`) into composable, testable modules.
- Enable unit & integration testing with mockable interfaces.
- Improve readability, performance, and error isolation.
- Provide clear extension path for new layer types & effects.

## Non-Goals (Phase 1)

- Implement new DSP algorithms.
- Replace Tone.js entirely.
- Introduce real-time collaboration.

## High-Level Architecture

```
lib/
  audio/
    core/
      context.ts          # Shared AudioContext acquisition & lifecycle
      bus.ts              # Master bus, gain staging, global meters
      analyser.ts         # Analyser creation, pooling, adaptive FPS
      engine.ts           # Engine orchestrator (implements IAudioEngine)
      errors.ts           # Error taxonomy
      events.ts           # Typed event emitter
    layers/
      baseLayer.ts        # Abstract base + common utilities
      binauralLayer.ts
      isochronicLayer.ts
      ambientLayer.ts
    effects/
      registry.ts         # Metadata + lazy factories
      chain.ts            # Reconcile + diff graphs
      types.ts            # Effect type definitions
    automation/
      scheduler.ts        # Uses AudioParam setValueAtTime / linearRampToValueAtTime
      curves.ts           # Optional easing helpers
    utils/
      validation.ts       # (moved from lib/validation.ts eventually)
      math.ts             # computePair, dB conversions
      perf.ts             # Timers, frame drift sampling
```

## IAudioEngine Interface (Draft)

```ts
export interface IAudioEngine {
  init(): Promise<void>;
  createLayer(layer: LayerInit): LayerHandle; // returns handle with start/stop/update/dispose
  removeLayer(id: string): void;
  updateLayer(id: string, patch: Partial<LayerUpdate>): void;
  getAnalyser(id: string): AnalyserNode | null;
  on<E extends EngineEvent>(event: E, cb: EngineEventMap[E]): () => void;
  dispose(): void;
}
```

## LayerHandle (Draft)

```ts
export interface LayerHandle {
  id: string;
  start(): Promise<void>;
  stop(): void;
  update(patch: Partial<LayerUpdate>): void;
  dispose(): void;
  getAnalyser(): AnalyserNode | null;
}
```

## Event Taxonomy

| Event                  | Payload                   | Description           |
| ---------------------- | ------------------------- | --------------------- |
| `layer-created`        | { id, type }              | Layer allocated       |
| `layer-disposed`       | { id }                    | Layer disposed        |
| `layer-updated`        | { id, changed: string[] } | Patch applied         |
| `effect-chain-rebuilt` | { id, count, durationMs } | After diff + rebuild  |
| `engine-error`         | { id?, error, code }      | Structured error      |
| `performance-sample`   | { fps, audioDriftMs }     | Periodic perf metrics |

## Error Taxonomy

| Code                 | Meaning               | Trigger Example               |
| -------------------- | --------------------- | ----------------------------- |
| `CTX_UNAVAILABLE`    | AudioContext missing  | SSR / user gesture gate       |
| `LAYER_START_FAIL`   | Layer failed to start | Node creation error           |
| `EFFECT_CREATE_FAIL` | Effect factory threw  | Missing worklet / constraints |
| `CHAIN_CONNECT_FAIL` | Connection error      | Node.connect() failure        |

## Effect Diff Strategy

1. Serialize current active effects (ordered) to hash string.
2. Compare with previous hash; if unchanged, skip rebuild.
3. When changed: build new chain offline (array of nodes) → connect; on success disconnect old nodes.
4. Dispose orphaned effect nodes explicitly.
5. Pool noise/worklet nodes shared across layers when possible.

## Performance Sampling

- `requestAnimationFrame` loop (throttled) measuring:
  - Visual FPS
  - Drift between expected vs actual interval (rough scheduling health)
- Optional AudioContext baseLatency + currentTime monotonic sampling.
- Emit `performance-sample` every ~2s.

## Migration Steps

1. Extract pure helpers (`computePair`, numeric clamps) → `utils/math.ts` & `utils/validation.ts`.
2. Create `core/context.ts` & move shared AudioContext logic.
3. Implement lightweight `events.ts` emitter.
4. Carve out `layers/ambientLayer.ts` (simplest) → adapt old code.
5. Carve out `layers/binauralLayer.ts` & `layers/isochronicLayer.ts` with shared `baseLayer.ts`.
6. Implement `effects/registry.ts` exporting factories + metadata.
7. Move effect chain logic to `effects/chain.ts` with diff application.
8. Implement `core/engine.ts` orchestrating handles (wrap old createEngine usage behind adapter for transition).
9. Introduce new `IAudioEngine` and adapter bridging old API used by UI.
10. Add unit tests per module as extracted (avoid giant PR).
11. Remove obsolete sections from original `audioEngine.ts` once coverage passes.

## Incremental Adoption Plan

- Phase 1: Adapter pattern lets UI continue calling `createEngine(layer)`; internally calls new engine.
- Phase 2: UI migrates to central engine instance for multi-layer coordination.
- Phase 3: Remove legacy code paths and shrink compatibility adapter.

## Testing Plan

| Layer            | Tests                                                |
| ---------------- | ---------------------------------------------------- |
| context.ts       | Returns singleton; resumes after suspend             |
| binauralLayer.ts | Frequency pair calcs; update propagation             |
| chain.ts         | Adds/removes subset; no rebuild if unchanged         |
| registry.ts      | Factory returns required nodes or throws typed error |
| scheduler.ts     | Automation applies final value after duration        |

## Open Questions

- Should automation survive layer restart? (Probably yes—store canonical state.)
- Persist effect parameter tweaks per preset? (Future: add serialization format.)
- Noise/worklet pooling vs per-layer isolation trade-off.

## Risks & Mitigations

| Risk                      | Mitigation                                                |
| ------------------------- | --------------------------------------------------------- |
| Behavior regression       | Add snapshot & frequency pair tests before refactor       |
| Large PR fatigue          | Ship in vertical slices (ambient → binaural → isochronic) |
| Hidden timing differences | Add performance sampling pre & post to compare            |

## Success Metrics

- Original file < 300 LOC residual scaffold or removed entirely.
- 80%+ statement coverage for new modules.
- Effect chain rebuild time reduced (log baseline vs new diff system).
- No increase in reported runtime errors post-deploy (monitor engine-error events).

---

Draft ready for refinement. Update as implementation proceeds.
