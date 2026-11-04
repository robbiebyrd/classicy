---
id: 0099-rlc
title: The UI font-size action accepts negative and nonsensical values
purpose: Reject font sizes that no theme can render, as the Metrics tab already does for metrics.
type: bugs
status: pending
priority: "3"
effort: XS
created: "2026-11-04T00:23:56.962Z"
updated: "2026-11-04T00:23:56.962Z"
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
      - src/SystemFolder/ControlPanels/AppManager/ClassicyActionPredicates.ts
  plans:
    - ["0011-v9t", "included"]
progress:
  "1":
    status: pending
  "2":
    status: pending
---

# The UI font-size action accepts negative and nonsensical values

## Problem Statement

The H 6.2b review found that `hasFontSize` (`ClassicyActionPredicates.ts:226`) accepts any number, including negative, zero and non-finite values, for the UI font size. Metric edits are range-checked by the Metrics tab and the theme schema, but a dispatched font-size change is not. With a negative size, derived heights such as the ones H 6.2b named compute to an invalid length and fall back to `auto`, instead of the old 0.

**Impact:** A scripted or buggy dispatch can put the desktop into a broken layout that persists across reloads.

## Steps

### 1: Failing tests

Dispatch a font-size change with -1, 0, NaN, Infinity and an absurdly large value, and assert that each is refused or clamped, consistent with the theme schema's font-size bounds.

### 2: Fix

Make `hasFontSize` (and the reducer, if needed) validate against the same bounds the theme schema uses for font sizes, from one shared source.

## Acceptance Criteria

- [ ] Out-of-range and non-finite UI font sizes are refused, logged with `classicyLog`, and never reach the theme or persisted state.
- [ ] VERIFY: pnpm test --maxWorkers=3

## Files

- `src/SystemFolder/ControlPanels/AppManager/ClassicyActionPredicates.ts` - Validate the font-size range.

## Work Log
