---
id: 0104-2bx
title: Package font-size knobs bounded 8-72 px by key name
purpose: Hold every package font-size knob to the same 8-72 px bound as the UI font sizes.
type: feat
status: complete
priority: "3"
effort: S
created: "2026-11-05T00:57:58.698Z"
updated: "2026-11-05T01:03:57.093Z"
started: "2026-11-05T00:58:06.336Z"
completed: "2026-11-05T00:58:23.515Z"
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
      - src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeFontSizes.ts
  stories:
    - ["0099-rlc", "depends"]
  plans:
    - ["0011-v9t", "included"]
    - ["0002-ldj", "included"]
progress:
  "1":
    status: complete
  "2":
    status: complete
---

# Package font-size knobs bounded 8-72 px by key name

## Problem Statement

Owner question from the Part H rebase: theme files could set package knob font sizes (pager, hyperCard, appleGuide `fontSize`) anywhere from 0 to 512, outside 0099-rlc's 8-72 bound. Owner decision 2026-11-04: YES, by key name: measurement keys `fontSize` / `*FontSize` are validated 8-72 in the theme schema, the reducer and the Options tab, for all packages.

**Impact:** A theme file or a dispatch could give a package surface an unreadable or absurd font size.

## Steps

### 1: Implement

Add `isClassicyFontSizeMeasurementKey` next to the shared 8-72 bounds; apply it in the theme schema, ClassicyDesktopChangeMetric / ChangeAppearanceOption and the Options tab; refuse a package whose defaults break the bound; docs and release note.

### 2: Land

Gate on the landing tree, land on feat/AppearancePackages and push.

## Acceptance Criteria

- [x] Every measurement key named `fontSize` or ending in `FontSize`, in any package, is refused outside 8-72 px by the theme schema, the reducer and the Options tab, and a package whose defaults break the bound is refused at registration.
- [x] VERIFY: pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test --maxWorkers=3 && pnpm build:source

## Files

- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeFontSizes.ts`

## Work Log

### 2026-11-05T00:58:08.546Z - Owner decision 2026-11-04 (bound by key name). Implemented on fu/font-bounds from 98d5aedc6, rebased onto 726d344db. Filed after the fact because the tracker was offline (MongoDB outage).

### 2026-11-05T00:58:20.351Z - Landed 726d344db..40934effc, pushed (3adc1e735 schema/reducer/Options bound by key name, f2ad5a0e4 docs, 40934effc package-registration test; the range also carries merge 9ea1dda1d of origin/main). Gate on 40934effc: 451 files / 5942 tests, all builds. Known gap, out of scope here: ClassicyDesktopLoadThemes themes were neither validated nor clamped (filed and fixed as the load-themes story). Complete.
