---
id: 0082-lgo
title: 'Part A follow-ups: cascade guards, parked window class, test breadth'
purpose: Collect the non-blocking items from Part A's final whole-branch review so they are tracked.
type: chor
status: complete
priority: "4"
effort: M
created: "2026-10-29T09:19:21.134Z"
updated: "2026-11-05T00:51:04.402Z"
started: "2026-11-04T00:13:08.988Z"
completed: "2026-11-05T00:51:04.402Z"
tags: []
milestone: ""
due_date: ""
planned_start: ""
planned_end: ""
order: 0
links:
  repo:
    local: ~/classicy
  stories:
    - ["0083-v8n", "blocks"]
  plans:
    - ["0003-7x7", "included"]
    - ["0002-ldj", "included"]
progress:
  "1":
    status: complete
  "2":
    status: complete
  "3":
    status: complete
  "4":
    status: complete
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

- [x] VERIFY: (a) Cross-file cascade order is guarded: either the reversed-sheet-order computed-style swap is committed as a script that runs in Part B's gate, or ClassicyCascade.repo.test.ts pins the specificity of the known cross-file overrides.
- [x] VERIFY: (b) check-dist fails on any unlayered rule between classicy.base blocks, and on any non-empty plain .css file under src.
- [x] VERIFY: (c) classicyWindowInvisible is resolved: it is unreachable today (ClassicyWindow renders the root only when not closed, while the class is emitted only when closed), so either the class and its rule are removed or it is made reachable.
- [x] VERIFY: (d) The scrollbars-inactive mixin, which is dead because it targets the non-scrolling window root, is either fixed or removed.
- [x] VERIFY: (e) Test breadth: the cascade test pins all window state selectors (ActiveApp, Floating, Backgrounded, ModalFront, NoScroll, Dimmed); collision tests cover overridable positional and custom-property styles; a consumer height stays off a collapsed root; the movable-alert 370 band is covered; Placard disabled+pressed, MenuBar &:after, and FileInput error, Link, Output and ControlLabel disabled are covered; the generator's --check CLI path and a JSON shape guard are tested.
- [x] VERIFY: (f) Turning reduced motion off does not replay animations that a screen saver paused itself, and :has(#overlay) has a fallback or a documented browser floor.
- [x] VERIFY: (g) Dev CSS source maps are exact: classicyCssLayerPlugin uses MagicString instead of returning map: null.
- [x] VERIFY: (i) In dev, the fonts <style> is inserted after #classicy-layer-order.
- [x] VERIFY: (j) The TEMPLATE_FAMILIES suffix lists in ClassicyVocabulary.test.ts are derived from the type unions rather than kept complete by a comment.
- [x] VERIFY: (k) Small cleanups are done: Finder rows no longer emit selected twice (ClassicyFileBrowserViewTable.tsx); Menu className versus navClass is documented; and a decision is recorded on whether withoutZIndex, now exported from the package root through the barrel, is documented or kept internal.
- [x] (l) The vocabulary coverage tests that scan every src .ts/.tsx file (ClassicyVocabulary.test.ts's class scan and its negative twin) never hit vitest's 5 s default timeout: give them an explicit timeout sized for a loaded machine, or cache the parsed file list. Observed 2026-10-29 by three implementers (Parts G, I, J) at load average 33–43 on 16 cores: 1.4–2.9 s alone, timed out under load, green on rerun.

## Work Log

### 2026-10-29T09:40:22.977Z - Criterion (a): for Part B, the cross-file order guard is met by the forced-state computed-style matrix (forced.cjs) that every look-moving task re-runs; the permanent CI guard stays in this story. Criterion (d): Part B moves scrollbars-inactive into the package unchanged (renamed platinum-*); this story removes it later.

### 2026-10-29T18:23:10.159Z - Item (l) done on feat/AppearancePackages in bd555eb15: the class-coverage scan and its negative twin share one cached parse of src (scanSourceTree behind scanClassicyTokens) and carry an explicit 60 s timeout (SCAN_TIMEOUT_MS). Gate on the integration branch: pnpm lint clean, tsc clean, pnpm test 315 files / 3716 tests. The part branches (G, I, J, and B's remaining tasks) pick it up when they rebase; until then their implementers rerun the scan alone on a timeout.

### 2026-10-29T20:22:00.352Z - Moved one open [MANUAL] acceptance criterion to the program V&V ticket 0083-v8n (human verification and validation), where it is tracked and ticked. This story now closes on its automated criteria; 0083-v8n links back with `depends`.

### 2026-11-03T23:47:03.406Z - Scheduled by the owner (2026-11-03). Wave 3: starts as soon as H 6.2b finishes, because it edits the Platinum styles 6.2b is rewriting; it lands after Part H.

### 2026-11-04T00:13:11.433Z - Wave 3 started in its own worktree from land/part-h 2b481f62b (Part H through 6.2b); it lands after Part H.

### 2026-11-05T00:50:26.715Z - Implemented (12 commits to adb6fbaee on fu/0082, from land/part-h 2b481f62b): items (a)-(k) done, (l) was already done; parity 342 + 4 AE 0; 5076 tests. Review fixes (c7621e6ff, ebd397db1 on fu/0082): the cross-file tie check uses class co-occurrence read from every component's source, pinned against the rendered DOM, so the reviewer's case now fails; minors done; 5085 tests. Accepted. Release note: the scrollbars-inactive mixin is removed.

### 2026-11-05T00:51:01.106Z - Landed with 0088-sz9: feat/AppearancePackages 93aa968fe..ab8b7d0d0 pushed (0082-lgo's 13 commits 326a33e95..6a2657ae3, 0088-sz9 f2a30c37b, fallout 7b15dd426 + 0afb185bc). Gate on 0afb185bc: 449 files / 5851 tests; parity 324/348 AE 0 (the 24 are the probe-note reflow, as 0088 ruled), AM 9/9, forced 67/67 + Firefox 6/6. Item (h) (mid-time parity) moved to V&V 0083-v8n and was delivered by the parity-midtime follow-up (793f3af80). The ties the guard found were filed as the order-ties follow-up (landed b945f78fd). Complete.
