---
id: 0111-rgp
title: ClassicyDesktopLoadThemes validates themes with ClassicyThemeSchema
purpose: Validate host-loaded themes as theme files are validated.
type: bugs
status: complete
priority: "3"
effort: S
created: "2026-11-05T01:01:02.850Z"
updated: "2026-11-05T01:04:12.877Z"
started: "2026-11-05T01:01:10.573Z"
completed: "2026-11-05T01:01:28.297Z"
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
      - src/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager.tsx
  stories:
    - ["0104-2bx", "depends"]
  plans:
    - ["0002-ldj", "included"]
progress:
  "1":
    status: complete
  "2":
    status: complete
---

# ClassicyDesktopLoadThemes validates themes with ClassicyThemeSchema

## Problem Statement

Gap found by the font-bounds work: themes handed to ClassicyDesktopLoadThemes were only checked with Array.isArray and cast, so they were neither schema-validated nor clamped (ClassicyDesktopManager.tsx:638).

**Impact:** A host could load malformed themes or out-of-range sizes into state.

## Steps

### 1: Implement

Add readClassicyLoadedThemes: validate each with ClassicyThemeSchema, drop invalid ones with a warning (an all-invalid list keeps the current list), docs and release-note Breaking.

### 2: Land

Gate on the landing tree, land on feat/AppearancePackages and push.

## Acceptance Criteria

- [x] ClassicyDesktopLoadThemes drops each theme that fails ClassicyThemeSchema with a warning, and an all-invalid list leaves the themes unchanged.
- [x] VERIFY: pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test --maxWorkers=3 && pnpm build:source

## Files

- `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager.tsx`

## Work Log

### 2026-11-05T01:01:12.826Z - Dispatched 2026-11-04 ~18:00 UTC on fu/load-themes from 40934effc. Filed after the fact because the tracker was offline (MongoDB outage).

### 2026-11-05T01:01:24.753Z - Landed 40934effc..5b0ce7ee3, pushed (d511be420, 249e2c8b9, 5b0ce7ee3 type fix). Agent gate 452 files / 5966 tests, all builds. Notes: out-of-range font sizes are refused (not clamped); themes for unregistered packages are kept; wallpaper filenames are now resolved to asset URLs. Complete.
