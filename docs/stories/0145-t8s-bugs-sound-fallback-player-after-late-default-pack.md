---
id: 0145-t8s
title: The sound fallback player stays null when the default pack registers after the provider mounts
purpose: Sprites a pack lacks fall back to the default pack however late it registers.
type: bugs
status: complete
priority: "2"
effort: S
created: "2026-11-06T00:14:19.091Z"
updated: "2026-11-06T02:18:16.637Z"
started: "2026-11-06T00:14:37.879Z"
completed: "2026-11-06T02:18:16.637Z"
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
      - src/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerProvider.tsx
      - src/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerUtils.tsx
progress:
  "1":
    status: pending
  "2":
    status: pending
---

# The sound fallback player stays null when the default pack registers after the provider mounts

## Problem Statement

From 0126-orc's review (2026-11-06, confidence 85), the edge 0124-q4p (plan 0015-kxa §1.3) left open. `ClassicySoundLoad` (`ClassicySoundManagerUtils.tsx:330-350`) sets `fallbackPlayer` from `createDefaultPackPlayer()`, which is null while the default pack is unregistered, and the provider's load effect (`ClassicySoundManagerProvider.tsx:54-66`) returns early when `pack.id === sound.packId`, so nothing rebuilds it when the default pack registers later. Repro: clear sound packs; register `foo` lacking `ClassicyWindowOpen`; leave `platinum` unregistered; set `activeTheme.sound.pack = "foo"`; mount the provider; `act(() => registerClassicySoundPack(platinumSoundPack))`; dispatch `ClassicySoundPlay { sound: "ClassicyWindowOpen" }`: no `Howl.play`. It needs the default pack to register after mount (a lazy import, or a package registered after render), which 3.0.0's explicit host import makes possible.

**Impact:** Silent sprites until the next pack change.

## Steps

### 1: Failing test

The repro above as a provider test: after the late registration, `ClassicyWindowOpen` plays on the default pack's player.

### 2: Rebuild the fallback

In the provider effect, also reload (or build the fallback) when the loaded pack is not the default, `fallbackPlayer` is null and the default pack is now registered; or build the fallback lazily in `playerFor`. Log nothing new on the happy path.

## Acceptance Criteria

- [x] VERIFY: The repro test passes, a pack's own sprites still win over the fallback, and with the default pack never registered sound stays silent with the existing once-per-id log.
- [x] VERIFY: Full gate green.

## Files

- `src/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerProvider.tsx` - rebuild the fallback player when the default pack registers late

## Work Log

### 2026-11-06T02:17:58.346Z - Landed on feat/AppearancePackages at 5ebf1c3fe as a stack 0123 → 0145 → 0126 on 7c1f4b034. Stacked gate: 467 files / 6539 tests, GATE_EXIT=0. Parity from the static Storybook build plus the example app against platinum-split/before: 445 total, 445 AE 0. Review: no findings >=70 (StrictMode extra Howl ~30, same as ClassicySoundLoad). New action ClassicySoundLoadFallback.
