---
id: 0116-lxg
title: 'The last press-ending gaps: a lost keyboard press and an early hold release'
purpose: Close the two press-ending gaps found after press-canceled.
type: bugs
status: complete
priority: "4"
effort: S
created: "2026-11-05T01:03:25.144Z"
updated: "2026-11-05T01:04:25.852Z"
started: "2026-11-05T01:03:33.316Z"
completed: "2026-11-05T01:03:51.987Z"
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
      - src/SystemFolder/SystemResources/Button/ClassicyButton.tsx
      - src/SystemFolder/SystemResources/BevelButton/ClassicyBevelButton.tsx
  stories:
    - ["0115-hh2", "depends"]
  plans:
    - ["0002-ldj", "included"]
progress:
  "1":
    status: complete
  "2":
    status: complete
---

# The last press-ending gaps: a lost keyboard press and an early hold release

## Problem Statement

Found after press-canceled (owner: 'Fix the things you found'): a keyboard press whose keyup never comes (blur) emitted no release, and a hold-trigger bevel press let go before its delay still opened its menu.

**Impact:** An unpaired keyboard press, and a menu opening on a short press of a hold-trigger button.

## Steps

### 1: Implement

On blur, end a pending keyboard press with release { input: keyboard, lost: true, canceled: true }; a hold-trigger bevel press released before the delay opens nothing; docs.

### 2: Land

Gate on the landing tree, land on feat/AppearancePackages and push.

## Acceptance Criteria

- [x] A keyboard press with no keyup ends in release { input: 'keyboard', lost: true, canceled: true }, and a hold-trigger bevel press let go before its delay opens nothing.
- [x] VERIFY: pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test --maxWorkers=3 && pnpm build:source

## Files

- `src/SystemFolder/SystemResources/Button/ClassicyButton.tsx`
- `src/SystemFolder/SystemResources/BevelButton/ClassicyBevelButton.tsx`

## Work Log

### 2026-11-05T01:03:35.702Z - Dispatched 2026-11-04 ~23:25 UTC on fu/press-ends from 6b49c3943. Filed after the fact because the tracker was offline (MongoDB outage).

### 2026-11-05T01:03:48.420Z - Landed 6b49c3943..c4cdae72b, pushed (08b7c42fc keyboard press ends canceled, a485d7089 hold-trigger early release opens nothing, c4cdae72b docs). Agent gate on the identical tree: 458 files / 6259 tests, all builds. Known limit: Return on a <button> activates on keydown, so a lost Return press has already clicked. Complete.
