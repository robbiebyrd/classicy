---
id: 0082-lgo
title: 'Part A follow-ups: cascade guards, parked window class, test breadth'
purpose: Collect the non-blocking items from Part A's final whole-branch review so they are tracked.
type: chor
status: pending
priority: "4"
effort: M
created: "2026-10-29T09:19:21.134Z"
updated: "2026-10-29T09:19:21.134Z"
links:
  repo:
    local: ~/classicy
  plans:
    - ["0003-7x7", "included"]
    - ["0002-ldj", "included"]
progress:
  "1":
    status: pending
  "2":
    status: pending
  "3":
    status: pending
  "4":
    status: pending
---

# Part A follow-ups: cascade guards, parked window class, test breadth

## Problem Statement

Part A landed as 738dbead5 on feat/AppearancePackages after a final whole-branch review that found nothing blocking once one fix wave was applied. The review also surfaced non-blocking items: guards that would catch cascade regressions earlier, one dead window class, a dead scrollbar mixin, gaps in test breadth and a handful of small cleanups.

This story collects those items so they are tracked rather than lost. None of them changes Platinum's rendering, and none blocks Part B.

**Impact:** Without a tracked home, the cross-file cascade-order risk recorded in plan 0003-7x7 (import order could flip a cross-file override) and the dead code stay invisible, and Part B's package layer builds on guards weaker than they could be.

## Steps

### 1: Triage the follow-ups

Group criteria (a) to (k) by area (cascade guards, dead code, test breadth, small cleanups) and decide which land before Part B's gate.

### 2: Implement the guards and dead-code decisions

Do criteria (a) to (d), (g) and (i) in the build and test tooling, and remove or fix the dead window class and scrollbar mixin.

### 3: Widen the tests

Do criteria (e), (f), (h) and (j), keeping each new test failing first and passing after.

### 4: Small cleanups and gate

Do criterion (k), then run `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test && pnpm build:source`.

## Acceptance Criteria

- [ ] VERIFY: (a) Cross-file cascade order is guarded: either the reversed-sheet-order computed-style swap is committed as a script that runs in Part B's gate, or ClassicyCascade.repo.test.ts pins the specificity of the known cross-file overrides.
- [ ] VERIFY: (b) check-dist fails on any unlayered rule between classicy.base blocks, and on any non-empty plain .css file under src.
- [ ] VERIFY: (c) classicyWindowInvisible is resolved: it is unreachable today (ClassicyWindow renders the root only when not closed, while the class is emitted only when closed), so either the class and its rule are removed or it is made reachable.
- [ ] VERIFY: (d) The scrollbars-inactive mixin, which is dead because it targets the non-scrolling window root, is either fixed or removed.
- [ ] VERIFY: (e) Test breadth: the cascade test pins all window state selectors (ActiveApp, Floating, Backgrounded, ModalFront, NoScroll, Dimmed); collision tests cover overridable positional and custom-property styles; a consumer height stays off a collapsed root; the movable-alert 370 band is covered; Placard disabled+pressed, MenuBar &:after, and FileInput error, Link, Output and ControlLabel disabled are covered; the generator's --check CLI path and a JSON shape guard are tested.
- [ ] VERIFY: (f) Turning reduced motion off does not replay animations that a screen saver paused itself, and :has(#overlay) has a fallback or a documented browser floor.
- [ ] VERIFY: (g) Dev CSS source maps are exact: classicyCssLayerPlugin uses MagicString instead of returning map: null.
- [ ] [MANUAL] (h) The parity procedure adds one mid-time check for animated stories, since animations are currently frozen at t=0.
- [ ] VERIFY: (i) In dev, the fonts <style> is inserted after #classicy-layer-order.
- [ ] VERIFY: (j) The TEMPLATE_FAMILIES suffix lists in ClassicyVocabulary.test.ts are derived from the type unions rather than kept complete by a comment.
- [ ] VERIFY: (k) Small cleanups are done: Finder rows no longer emit selected twice (ClassicyFileBrowserViewTable.tsx); Menu className versus navClass is documented; and a decision is recorded on whether withoutZIndex, now exported from the package root through the barrel, is documented or kept internal.

## Work Log
