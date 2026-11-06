---
id: 0149-e3b
title: parity:shoot --mid flakes on the chasing-arrows progress bar (AE 99)
purpose: Keep @mid parity deterministic after the clock-colon fix.
type: bugs
status: complete
priority: "3"
effort: S
created: "2026-11-06T06:25:01.895Z"
updated: "2026-11-06T09:02:23.120Z"
started: "2026-11-06T07:37:44.904Z"
completed: "2026-11-06T09:02:01.653Z"
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

- [x] VERIFY: 50 @mid shots of the story under load are AE 0 against each other, and t=0 shots are byte-identical to before.

## Files

- `bin/parity/` - deterministic chasing-arrows mid frame

## Work Log

### 2026-11-06T07:37:42.366Z - 2026-11-06: seen a second time, in 0129's parity round (AE 99 @mid under load; three single reshoots AE 0). Baseline note: platinum-split/before was swapped to the 0146 set (shot from the branch tip at e28f94b92 + 0146, not BASE); the old set is in before-presvgo/.

### 2026-11-06T09:01:53.566Z - Landed at 1bc31304e (b59d18286 rebased): .classicyProgressChasingArrowsSpinner joins PARITY_MID_STILL_SELECTORS (held at 0deg; moving the pause off the steps(8) edge did not fix it), and shootMid waits for desktop url() backgrounds to decode (a second flake: whole @mid shot plain gray, AE ~745780, ~3%). 100 @mid shots under load AE 0 pairwise; t=0 344/344 byte-identical old vs new tool (one old-tool outlier on quicktime--docked-controls matched on 5 reshoots). Implementer gate 476/6669 green; after rebase onto 1bc31304e (no bin/parity changes) parity tests 68/68, biome, tsc clean. Baseline: before-0149/controls-progressbar--chasing-arrows@mid.png replaces before/'s copy once 0130 and 0131 finish their parity rounds (their branches predate this tool).

### 2026-11-06T09:02:23.117Z - Correction: the previous entry's 'Landed at 1bc31304e' was written before the fast-forward ran (a stale index.lock blocked the merge). The fix is landed at 48f000fec.
