---
id: 0206-d4j
title: 'Core: asset and icon registry follow-ups'
purpose: Follow-up from plan 0018-dbd (System 7 Appearance Package), Phase 6.
type: impr
status: pending
priority: "4"
effort: S
created: "2026-11-12T14:15:52.252Z"
updated: "2026-11-12T14:15:52.252Z"
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
    - ["0018-dbd", "included"]
progress:
  "1":
    status: pending
  "2":
    status: pending
  "3":
    status: pending
---

# Core: asset and icon registry follow-ups

## Problem Statement

From plan 0018-dbd tasks 1.1 and 1.2: a variant whose leaves are all rejected still counts as registered and silences the missing-asset warning; resolveClassicyAsset(kind, path, packageId) defaults to the active theme's variant even for a sibling theme's preview (the Appearance Manager must pass the variant explicitly); ClassicyBevelButton's iconSmall prop is undocumented as strip-only; useClassicyIconImage builds a getSnapshot closure per render; the isIconLeafShape comment is stale; ClassicyDesktopIcon's small-size path is untested.

**Impact:** Silent fallbacks and previews that show the wrong variant.

## Steps

### 1: Count a variant as registered only when a leaf was accepted

Count a variant as registered only when a leaf was accepted

### 2: Previews pass their theme's variant (or the API takes the theme)

Previews pass their theme's variant (or the API takes the theme)

### 3: Stable getSnapshot; iconSmall documented or moved to context; comment; small-size test

Stable getSnapshot; iconSmall documented or moved to context; comment; small-size test

## Acceptance Criteria

- [ ] VERIFY: Each item is fixed and tested; Platinum parity AE 0.

## Files

- `src/Appearance/ClassicyAssetRegistry.ts` - modify
- `src/SystemFolder/SystemResources/Icon` - modify

## Work Log
