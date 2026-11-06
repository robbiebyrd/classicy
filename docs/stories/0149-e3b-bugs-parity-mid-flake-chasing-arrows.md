---
id: 0149-e3b
title: parity:shoot --mid flakes on the chasing-arrows progress bar (AE 99)
purpose: Keep @mid parity deterministic after the clock-colon fix.
type: bugs
status: in_progress
priority: "3"
effort: S
created: "2026-11-06T06:25:01.895Z"
updated: "2026-11-06T07:37:44.904Z"
started: "2026-11-06T07:37:44.904Z"
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
      - bin/parity/parityMidTime.ts
      - bin/parity/parityShoot.ts
progress:
  "1":
    status: pending
  "2":
    status: pending
---

# parity:shoot --mid flakes on the chasing-arrows progress bar (AE 99)

## Problem Statement

Found by 0143-sdy's parity round (2026-11-06, static build, under load from three other agents). `controls-progressbar--chasing-arrows@mid` differed by AE 99 against `platinum-split/before`; three single-story reshoots were AE 0 at t=0 and @mid. The clock-colon flake (0140-mid) is fixed, so this is a second animation whose paused mid frame is not deterministic under load.

**Impact:** A false AE 99 in later parity compares costs a reshoot and trains reviewers to dismiss differences.

## Steps

### 1: Reproduce

Shoot `controls-progressbar--chasing-arrows` with `--mid` 50+ times under load (several workers, or a parallel full shoot) and record how often and where it differs; read its animation (keyframes, timing function, whether it is a CSS animation the freeze script lists or a JS/Web Animations one).

### 2: Make it deterministic

Fix the cause in the parity tool (the freeze script's coverage, or the pause point), as 0140 did for the clock, without changing any t=0 shot; if the @mid frame changes, reshoot that story's @mid baseline at BASE into a new directory for the controller to swap.

## Acceptance Criteria

- [ ] VERIFY: 50 @mid shots of the story under load are AE 0 against each other, and t=0 shots are byte-identical to before.

## Files

- `bin/parity/` - deterministic chasing-arrows mid frame

## Work Log

### 2026-11-06T07:37:42.366Z - 2026-11-06: seen a second time, in 0129's parity round (AE 99 @mid under load; three single reshoots AE 0). Baseline note: platinum-split/before was swapped to the 0146 set (shot from the branch tip at e28f94b92 + 0146, not BASE); the old set is in before-presvgo/.
