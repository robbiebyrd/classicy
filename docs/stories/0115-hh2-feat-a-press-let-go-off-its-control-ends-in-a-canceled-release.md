---
id: 0115-hh2
title: A press let go off its control ends in a canceled release
purpose: Pair every press with exactly one release that says how it ended.
type: feat
status: complete
priority: "4"
effort: S
created: "2026-11-05T01:02:51.231Z"
updated: "2026-11-05T01:04:23.112Z"
started: "2026-11-05T01:03:01.222Z"
completed: "2026-11-05T01:03:23.031Z"
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
    - ["0114-n40", "depends"]
  plans:
    - ["0002-ldj", "included"]
progress:
  "1":
    status: complete
  "2":
    status: complete
---

# A press let go off its control ends in a canceled release

## Problem Statement

Owner decisions 2026-11-04 ~22:30 UTC: (1) a press released off the control emits release { lost: false, canceled: true }, Platinum silent for canceled, every press pairs with one release; (2) the Sound tab skips the alert-volume preview on a lost commit (the volume is still saved).

**Impact:** Packages could not tell a canceled press from a click, and a lost alert-volume drag still played a preview.

## Steps

### 1: Implement

Add ClassicyAppearanceRelease with lost and canceled (lost implies canceled) to the four controls and MenuItem; Sound tab change; docs.

### 2: Land

Gate on the landing tree, land on feat/AppearancePackages and push.

## Acceptance Criteria

- [x] Every press ends in exactly one release { lost, canceled } (lost implies canceled), and the Sound tab plays no preview on a lost commit.
- [x] VERIFY: pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test --maxWorkers=3 && pnpm build:source

## Files

- `src/Appearance/useClassicyAppearance.ts`

## Work Log

### 2026-11-05T01:03:03.850Z - Dispatched 2026-11-04 ~22:30 UTC on fu/press-canceled from facd11b0b. Filed after the fact because the tracker was offline (MongoDB outage).

### 2026-11-05T01:03:18.717Z - Landed facd11b0b..6b49c3943, pushed (118d9a42e, 026ac0d3a, 6b49c3943). Agent gate on the identical tree: 458 files / 6222 tests, all builds. Complete.
