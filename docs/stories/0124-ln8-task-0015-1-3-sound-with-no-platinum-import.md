---
id: 0124-ln8
title: '0015 §1.3: Sound with no Platinum import'
purpose: Execute plan 0015-kxa section 1.3.
type: task
status: complete
priority: "1"
effort: M
created: "2026-11-05T19:54:13.695Z"
updated: "2026-11-05T22:39:51.695Z"
started: "2026-11-05T20:26:06.423Z"
completed: "2026-11-05T22:39:51.695Z"
tags: []
milestone: ""
due_date: ""
planned_start: ""
planned_end: ""
order: 0
links:
  repo:
    local: ~/classicy
  plans:
    - ["0015-kxa", "included"]
progress:
  "1":
    status: pending
  "2":
    status: pending
  "3":
    status: pending
  "4":
    status: pending
  "5":
    status: pending
---

# 0015 §1.3: Sound with no Platinum import

## Problem Statement

Plan 0015-kxa section 1.3 (Decouple the core from Platinum (Platinum stays in src/ for now)): Sound with no Platinum import. The plan section holds the interfaces and exact steps; this story tracks its execution (implementer → review → fix → controller verification → land on feat/AppearancePackages).

**Produces:** With no registered pack for `activeTheme.sound.pack` and none for `CLASSICY_DEFAULT_SOUND_PACK_ID`, the provider creates no Howl and every sound dispatch is a no-op (no throw, one `classicyLog("warn","Sound",…)` per missing pack id). `fallbackPlayer` is the default pack's player only when that pack is registered.

## Steps

### 1: Write the failing tests

Provider with no pack registered: mounts, plays nothing, `Howl` constructor never called, one warning; registering the Platinum pack afterwards loads it (the provider already re-runs on `useClassicySoundPacks()`). Reducer: `ClassicySoundLoad` with an unknown pack and no default pack sets `fallbackPlayer: null`. Schema: `sound.pack` validates against whatever is registered, and the module graph of `ClassicyThemeSchema.ts` contains no `Appearance/Platinum` file.

### 2: Remove the three side-effect imports and the hard Platinum fallback

`ClassicySoundManagerProvider.tsx:7`, `ClassicySoundManagerUtils.tsx:3`, `ClassicyThemeSchema.ts:9`; `createPlatinumPlayer` (:160-163) becomes a lookup of `getClassicySoundPack(CLASSICY_DEFAULT_SOUND_PACK_ID)` that may return `null`; the "falling back to platinum" warning (:322-327) names the default pack id and only fires when that pack exists.

### 3: Drop the three `vi.mock("@/Appearance/Platinum/assets/sounds/platinum")` lines

They are no longer needed; tests that assert Platinum sprites import Platinum explicitly.

### 4: Run the sound suites

Run the sound suites Command: `pnpm exec vitest run src/SystemFolder/ControlPanels/SoundManager src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeSchema`

### 5: Commit

Conventional commit(s) ending with the session trailers; confirm the branch and `git diff --cached` first. Command: `git commit -m "refactor(sound): the core plays only registered packs, and is silent without one"`

## Acceptance Criteria

- [x] VERIFY: `pnpm exec vitest run src/SystemFolder/ControlPanels/SoundManager` passes.
- [x] VERIFY: Reviewed with no open finding at or above 70 confidence, verified by the controller, and landed on feat/AppearancePackages with the full gate green.

## Files

- `src/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerProvider.tsx` - modify
- `src/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerUtils.tsx` - modify
- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeSchema.ts` - modify
- `src/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerProvider.test.tsx` - modify
- `src/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerProvider.packs.test.tsx` - modify
- `src/SystemFolder/ControlPanels/SoundManager/ClassicySoundStateEventReducer.test.ts` - modify

## Work Log

### 2026-11-05T22:38:47.181Z - 1.3: the core imports no Platinum sound pack; with no pack the provider builds no Howl and every dispatch is a no-op, one warn per missing pack id; fallbackPlayer = the default pack's player only when registered (controller ruling: an unregistered theme pack falls back to the default pack if registered, else silent; design 0014-ahm updated). Review: no findings ≥70. Landed 2026-11-05 on feat/AppearancePackages at 66481727b (pushed) as part of stack A (3.5 landed first; then 4.1, 1.3, 0120, 1.1 in one fast-forward). Stack landing gate at the top: 462 files / 6325 tests, lint, tsc, storybook:typecheck, vocabulary --check, color sweep, build:source + verify:dist (jsxDEV=0), build:storybook, example build, exit 0.
