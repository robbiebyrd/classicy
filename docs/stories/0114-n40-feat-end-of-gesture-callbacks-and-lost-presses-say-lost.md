---
id: 0114-n40
title: End-of-gesture callbacks and lost presses say lost
purpose: Tell consumers and packages when a gesture ended because the stream was lost.
type: feat
status: complete
priority: "4"
effort: M
created: "2026-11-05T01:02:23.715Z"
updated: "2026-11-05T01:04:20.648Z"
started: "2026-11-05T01:02:30.721Z"
completed: "2026-11-05T01:02:48.726Z"
tags: []
milestone: ""
due_date: ""
planned_start: ""
planned_end: ""
order: 0
links:
  repo:
    local: ~/classicy
    files:
      - src/Appearance/useClassicyAppearance.ts
  stories:
    - ["0112-m7n", "depends"]
  plans:
    - ["0002-ldj", "included"]
progress:
  "1":
    status: complete
  "2":
    status: complete
---

# End-of-gesture callbacks and lost presses say lost

## Problem Statement

Gaps after drag-lost-detail (owner: 'Fix the gaps now'): end-of-gesture callbacks (onResizeCommit, onCommitFunc, pop-up slider, color wheel end) did not say whether the stream was lost, and a bevel held press lost mid-press emitted no release, so a press could go unpaired.

**Impact:** Consumers persist or preview values from lost gestures; packages see unpaired presses.

## Steps

### 1: Implement

Add ClassicyGestureEnd; trailing { lost } on onResizeCommit/onCommitFunc; Button/BevelButton/Placard/RadioInput lost press -> release { lost: true }; emit requires lost on release.

### 2: Land

Gate on the landing tree, land on feat/AppearancePackages and push.

## Acceptance Criteria

- [x] Every end-of-gesture callback receives a trailing { lost }, and every press is paired with exactly one release.
- [x] VERIFY: pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test --maxWorkers=3 && pnpm build:source

## Files

- `src/Appearance/useClassicyAppearance.ts`

## Work Log

### 2026-11-05T01:02:32.732Z - Dispatched 2026-11-04 ~21:35 UTC on fu/lost-callbacks from 29d3a253d. Filed after the fact because the tracker was offline (MongoDB outage).

### 2026-11-05T01:02:43.522Z - Landed 29d3a253d..facd11b0b, pushed (af1e82a21, a5c33833b, f05a9c628, c9a388b2b, facd11b0b). Agent gate on the identical tree: 458 files / 6199 tests, all builds. Open owner question at landing: the release for a press let go off the control (answered by press-canceled). Complete.
