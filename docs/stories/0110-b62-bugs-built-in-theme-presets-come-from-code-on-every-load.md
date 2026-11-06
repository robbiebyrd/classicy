---
id: 0110-b62
title: Built-in theme presets come from code on every load
purpose: Stop persisted state from freezing the built-in theme presets.
type: bugs
status: complete
priority: "3"
effort: M
created: "2026-11-05T01:00:35.894Z"
updated: "2026-11-05T01:01:01.198Z"
started: "2026-11-05T01:00:43.269Z"
completed: "2026-11-05T01:01:01.198Z"
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
      - src/SystemFolder/ControlPanels/AppManager/ClassicyStateMigrations.ts
  plans:
    - ["0000-aud", "included"]
    - ["0002-ldj", "included"]
progress:
  "1":
    status: complete
  "2":
    status: complete
---

# Built-in theme presets come from code on every load

## Problem Statement

Plan 0000-aud Deferred item: persisted `availableThemes` froze the built-in presets, so preset changes in code never reached existing users.

**Impact:** Users keep stale built-in themes forever after an upgrade.

## Steps

### 1: Implement

Never persist built-ins; save a built-in active theme as {id, package} and resolve it on load or on package registration. Owner decisions 2026-11-04: (1) always refresh a saved built-in active theme by id (pre-v0.83 in-place edits dropped; release-note Breaking); (2) host LoadThemes lists are not persisted, hosts dispatch them each boot.

### 2: Land

Gate on the landing tree, land on feat/AppearancePackages and push.

## Acceptance Criteria

- [x] Built-in themes are never persisted and a saved built-in active theme is replaced by its current preset on every load or package registration.
- [x] VERIFY: pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test --maxWorkers=3 && pnpm build:source

## Files

- `src/SystemFolder/ControlPanels/AppManager/ClassicyStateMigrations.ts`

## Work Log

### 2026-11-05T01:00:45.676Z - Dispatched 2026-11-04 ~18:00 UTC on fu/preset-reload from 40934effc; the controller rebased it onto 5b0ce7ee3 and the agent resumed for owner decision (1). Filed after the fact because the tracker was offline (MongoDB outage).

### 2026-11-05T01:00:57.772Z - Landed 793f3af80..e598f0df3, pushed (2a9815f02, 5294965c5, 63f234ba2, f30023591, e598f0df3). Land gate passed. Plan 0000-aud's Deferred item is done. Complete.
