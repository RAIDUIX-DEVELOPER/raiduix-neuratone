# Testing Strategy

Status: Draft
Last Updated: 2025-09-25

## Layers of Testing

| Layer                  | Framework              | Scope                                                 |
| ---------------------- | ---------------------- | ----------------------------------------------------- |
| Unit                   | Jest (or Vitest)       | Pure functions, validation, math, registry factories  |
| Integration            | Jest + Web Audio mocks | Layer start/stop/update, effect chain diffing         |
| E2E                    | Playwright             | User flows (add layer → tweak → save preset → reload) |
| Accessibility          | axe-core (Playwright)  | Per route scan & critical issue enforcement           |
| Contract               | Jest Snapshots         | Metadata generation (robots, sitemap)                 |
| Performance (Optional) | Custom harness         | Layer creation time, effect chain rebuild MS          |

## Tooling

- Install: `jest`, `@testing-library/react`, `@testing-library/jest-dom`, `playwright`, `axe-core` (for scan helper).
- Add a `scripts/test:unit`, `scripts/test:e2e`, and CI workflow gating merges.

## Directory Layout

```
/tests
  unit/
    validation.test.ts
    computePair.test.ts
    registry.test.ts
  integration/
    binauralLayer.integration.test.ts
    effectChain.integration.test.ts
  e2e/
    app.spec.ts
    accessibility.spec.ts
  helpers/
    audioMock.ts
    axeScan.ts
```

## Mocking Web Audio

Use a light stub rather than full polyfill:

```ts
class FakeAudioContext {
  currentTime = 0;
  createGain() {
    return { connect: () => {}, gain: { value: 1 } };
  }
  // Extend as needed
}
```

Inject via dependency inversion into engine (constructor or context provider).

## Accessibility Gate

Playwright example (conceptual):

```ts
import { test, expect } from "@playwright/test";
import { scan } from "./helpers/axeScan";

test("home route a11y", async ({ page }) => {
  await page.goto("/");
  const results = await scan(page);
  expect(
    results.violations.filter((v) => v.impact === "critical")
  ).toHaveLength(0);
});
```

## Metrics Collection

Emit logs or structured JSON for:

- Time to first audio (start → audible) on e2e test environment
- Effect chain rebuild duration baseline vs after refactor

## Exit Criteria for Refactor Phase

- Minimum 15 targeted unit tests covering math/validation/effect registry.
- Integration: start/stop/update for all three layer kinds.
- E2E: preset persistence scenario + accessibility scan pass.
- Coverage: 70% statements initial, grow to 80%+.

## Future Enhancements

- Mutation testing (Stryker) for critical math paths.
- Visual regression tests for mixer UI (Playwright screenshots).
- Performance budget alerts (fail CI if rebuild time > threshold).
