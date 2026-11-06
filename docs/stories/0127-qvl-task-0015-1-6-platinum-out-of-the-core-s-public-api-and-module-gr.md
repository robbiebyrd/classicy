---
id: 0127-qvl
title: '0015 §1.6: The desktop stops importing Platinum, and Platinum leaves the core''s API and module graph'
purpose: Execute plan 0015-kxa section 1.6.
type: task
status: complete
priority: "1"
effort: M
created: "2026-11-05T19:54:42.107Z"
updated: "2026-11-06T05:12:28.231Z"
started: "2026-11-06T02:19:03.746Z"
completed: "2026-11-06T05:12:28.230Z"
tags: []
milestone: ""
due_date: ""
planned_start: ""
planned_end: ""
order: 0
links:
  repo:
    local: ~/classicy
  stories:
    - ["0123-qzc", "depends"]
    - ["0124-ln8", "depends"]
    - ["0126-orc", "depends"]
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

# 0015 §1.6: The desktop stops importing Platinum, and Platinum leaves the core's API and module graph

## Problem Statement

Plan 0015-kxa section 1.6 (Decouple the core from Platinum (Platinum stays in src/ for now)): Platinum out of the core's public API and module graph. The plan section holds the interfaces and exact steps; this story tracks its execution (implementer → review → fix → controller verification → land on feat/AppearancePackages).

**Produces:** The core barrel exports nothing from `src/Appearance/Platinum/`; `PLATINUM_APPEARANCE_PACKAGE_ID`, `platinumAppearanceHooks`, `platinumSoundPack` are exported only by Platinum's own index (the future `@classicy/appearance-platinum`). The wallpaper helpers exported by the core are 1.4's index functions.

## Steps

### 1: Drop the desktop's Platinum import

`ClassicyDesktop.tsx:64-65` loses `import "@/Appearance/Platinum"`. Every test or story that mounts `ClassicyDesktop` and expects the Platinum look or sounds imports `@/__tests__/withPlatinum` (from story 0126-orc); `storybook/.storybook/preview.tsx` already imports Platinum. `src/__tests__/setup.ts` stays Platinum-free. Run the whole suite and fix each failure by adding the import, never by registering Platinum globally. Command: `pnpm test --maxWorkers=3`

### 2: Write the failing import-graph test

`ClassicyCoreImportGraph.test.ts`: walk the static import graph from `src/index.ts` (reuse the walker in `platinumAssets.importGraph.test.ts`) and assert no reachable file is under `src/Appearance/Platinum/`; assert `@/index` has no `platinumSoundPack`/`PLATINUM_APPEARANCE_PACKAGE_ID` export.

### 3: Exclude Platinum from barrelsby

Add `"Appearance/Platinum"` to `.ts-barrel.json` `exclude`; regenerate; `src/index.ts:17` disappears. Update `ClassicyPlatinum.test.ts:236-248` to assert the opposite.

### 4: Storybook reads presets from the registry

`preview.tsx:6,15-18` builds its theme toolbar from `listClassicyAppearancePackages()` presets after importing Platinum (by path for now); `RenamedPackage.ts:15,21` imports `PLATINUM_APPEARANCE_PACKAGE_ID` from Platinum's index.

### 5: Run the gate

This is the end of Phase 1: Platinum still lives in `src/`, but nothing in the core reaches it. Command: `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm storybook:typecheck && node bin/generate-vocabulary.ts --check && node bin/classicyLiteralColorSweep.ts && pnpm test --maxWorkers=3 && pnpm build:source && pnpm build:storybook && pnpm --filter classicy-example build`

### 6: Commit

Conventional commit(s) ending with the session trailers; confirm the branch and `git diff --cached` first. Command: `git commit -m "refactor(appearance): the core neither exports nor imports Platinum"`

## Acceptance Criteria

- [x] VERIFY: `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm storybook:typecheck && node bin/generate-vocabulary.ts --check && node bin/classicyLiteralColorSweep.ts && pnpm test --maxWorkers=3 && pnpm build:source && pnpm build:storybook && pnpm --filter classicy-example build` passes.
- [x] VERIFY: Reviewed with no open finding at or above 70 confidence, verified by the controller, and landed on feat/AppearancePackages with the full gate green.

## Files

- `src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.tsx` - modify: drop the Platinum import
- every test or story that mounts `ClassicyDesktop` and expects Platinum - modify: `import "@/__tests__/withPlatinum"`
- `src/Appearance/ClassicyCoreImportGraph.test.ts` - create
- `.ts-barrel.json` - modify
- `src/index.ts` - modify
- `src/Appearance/Platinum/ClassicyPlatinum.test.ts` - modify
- `storybook/.storybook/preview.tsx` - modify
- `storybook/.storybook/RenamedPackage.ts` - modify

## Work Log

### 2026-11-06T00:15:27.230Z - 2026-11-06: 0144-6sc (first session with only a non-Platinum package draws the core stand-in theme; found by 0126's review) becomes reachable with this section and is dispatched with it: the 1.6 implementer also fixes 0144.

### 2026-11-06T05:12:16.175Z - Landed at afe942157 (12 commits rebased onto 28a2cccd5). Rebased gate: 470 files / 6584 tests, GATE_EXIT=0. Controller parity with the 0140 tool from the static build plus the example dev server against platinum-split/before (its @mid set swapped to before-mid2, old set in before-mid-old): 445/445 AE 0. Reviews: round 1 fix-first (0144 detection), round 2 fix-first (defaultState seed tweaks lost, confidence 75), fixed in df7f2ca76 exactly as the reviewer prescribed and verified by the controller. J1 (library build entry src/ClassicyLibraryBuild.internal.ts still registers Platinum) logged on 0129/0132 for Phase 3. Follow-ups: 0147-qyy (J12, dropped package's defaults reference), 0148-wf3 (J14/J15, seed tweaks lost on reload or late registration).
