# Accessibility Checklist

Status: Draft

## Landmarks & Structure

- [x] Skip link present and visible on focus
- [ ] Unique `<h1>` on every route
- [ ] `<main role="main">` wrapping primary content
- [ ] `<header>` and `<footer>` semantic usage

## Keyboard

- [ ] All interactive elements reachable via Tab
- [ ] Focus outline visible (uses `:focus-visible`)
- [ ] No keyboard traps in drawers / modals
- [ ] Escape closes modals/drawers

## Forms & Controls

- [ ] All sliders have associated `<label>` or `aria-label`
- [ ] All icon-only buttons have `aria-label`
- [ ] Group related controls with `role="group"` + `aria-labelledby` where meaningful

## Media & Motion

- [ ] Respect `prefers-reduced-motion` for shimmer, sweep, grain, wave animations
- [ ] Auto‑playing background video muted by default or user-consented
- [ ] Provide alternative text for meaningful images
- [ ] Decorative images use empty `alt=""`

## Color & Contrast

- [ ] Text contrast ≥ WCAG AA (normal 4.5:1, large 3:1)
- [ ] Focus indicators contrast ≥ 3:1
- [ ] Charts/visualizations not purely color‑dependent

## ARIA & Semantics

- [ ] No redundant roles on native elements
- [ ] No `aria-hidden="true"` on focusable children
- [ ] Live region for route loading (`RouteLoadingOverlay` integration)
- [ ] Effect chips have role (e.g., `listitem` inside a `list`)

## Feedback & Errors

- [ ] Toast or inline region for engine errors
- [ ] Announce long operations via aria-live

## Testing

- [ ] Automated axe run for each primary route
- [ ] Manual screen reader spot check (NVDA / VoiceOver)
- [ ] Keyboard-only test pass documented

## Roadmap Enhancements

- High contrast theme toggle
- Reduced motion explicit user toggle
- Localization readiness (language attribute per route if multilingual)

---

Track progress by converting brackets to checked as fixes land.
