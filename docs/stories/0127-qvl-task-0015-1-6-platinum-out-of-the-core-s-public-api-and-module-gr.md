---
id: 0127-qvl
title: '0015 §1.6: Platinum out of the core''s public API and module graph'
purpose: Execute plan 0015-kxa section 1.6.
type: task
status: pending
priority: "1"
effort: M
created: "2026-11-05T19:54:42.107Z"
updated: "2026-11-05T19:54:42.107Z"
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

# 0015 §1.6: Platinum out of the core's public API and module graph

## Problem Statement

Plan 0015-kxa section 1.6 (Decouple the core from Platinum (Platinum stays in src/ for now)): Platinum out of the core's public API and module graph. The plan section holds the interfaces and exact steps; this story tracks its execution (implementer → review → fix → controller verification → land on feat/AppearancePackages).

**Produces:** The core barrel exports nothing from `src/Appearance/Platinum/`; `PLATINUM_APPEARANCE_PACKAGE_ID`, `platinumAppearanceHooks`, `platinumSoundPack` are exported only by Platinum's own index (the future `@classicy/appearance-platinum`). The wallpaper helpers exported by the core are 1.4's index functions.

## Steps

### 1: Write the failing import-graph test

`ClassicyCoreImportGraph.test.ts`: walk the static import graph from `src/index.ts` (reuse the walker in `platinumAssets.importGraph.test.ts`) and assert no reachable file is under `src/Appearance/Platinum/`; assert `@/index` has no `platinumSoundPack`/`PLATINUM_APPEARANCE_PACKAGE_ID` export.

### 2: Exclude Platinum from barrelsby

Add `"Appearance/Platinum"` to `.ts-barrel.json` `exclude`; regenerate; `src/index.ts:17` disappears. Update `ClassicyPlatinum.test.ts:236-248` to assert the opposite.

### 3: Storybook reads presets from the registry

`preview.tsx:6,15-18` builds its theme toolbar from `listClassicyAppearancePackages()` presets after importing Platinum (by path for now); `RenamedPackage.ts:15,21` imports `PLATINUM_APPEARANCE_PACKAGE_ID` from Platinum's index.

### 4: Run the gate

This is the end of Phase 1: Platinum still lives in `src/`, but nothing in the core reaches it. Command: `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm storybook:typecheck && node bin/generate-vocabulary.ts --check && node bin/classicyLiteralColorSweep.ts && pnpm test --maxWorkers=3 && pnpm build:source && pnpm build:storybook && pnpm --filter classicy-example build`

### 5: Commit

Conventional commit(s) ending with the session trailers; confirm the branch and `git diff --cached` first. Command: `git commit -m "refactor(appearance): the core neither exports nor imports Platinum"`

## Acceptance Criteria

- [ ] VERIFY: `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm storybook:typecheck && node bin/generate-vocabulary.ts --check && node bin/classicyLiteralColorSweep.ts && pnpm test --maxWorkers=3 && pnpm build:source && pnpm build:storybook && pnpm --filter classicy-example build` passes.
- [ ] VERIFY: Reviewed with no open finding at or above 70 confidence, verified by the controller, and landed on feat/AppearancePackages with the full gate green.

## Files

- `src/Appearance/ClassicyCoreImportGraph.test.ts` - create
- `.ts-barrel.json` - modify
- `src/index.ts` - modify
- `src/Appearance/Platinum/ClassicyPlatinum.test.ts` - modify
- `storybook/.storybook/preview.tsx` - modify
- `storybook/.storybook/RenamedPackage.ts` - modify

## Work Log
