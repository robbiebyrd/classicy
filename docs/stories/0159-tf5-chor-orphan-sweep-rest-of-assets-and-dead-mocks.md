---
id: 0159-tf5
title: 'Orphan sweep: the rest of the assets, and dead test mocks'
purpose: Ship and keep only files something reads, everywhere 0150 did not reach.
type: chor
status: complete
priority: "2"
effort: S
created: "2026-11-06T20:29:02.731Z"
updated: "2026-11-06T21:18:54.709Z"
started: "2026-11-06T20:29:10.820Z"
completed: "2026-11-06T21:18:54.709Z"
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
      - assets
      - packages/appearance/platinum/src/assets
      - src/Appearance/ClassicyCoreAssets.test.ts
progress:
  "1":
    status: pending
  "2":
    status: pending
---

# Orphan sweep: the rest of the assets, and dead test mocks

## Problem Statement

Owner follow-up to 0150 (2026-11-06). 0150 swept the core's `assets/img` and pinned it with a test (every tracked file is named by the icon tree, read by a listed file, or listed as not shipped). Not yet swept: the core's other asset folders (`assets/sounds`, `assets/vid`, anything else under `assets/`), and Platinum's `packages/appearance/platinum/src/assets` (art not mapped by `art/platinumArt.ts`, pixel art, fonts, wallpapers, cursors, sounds nothing registers or reads). Also dead test mocks: e.g. `src/SystemFolder/SystemResources/Alert/ClassicyAlert.test.tsx:44` mocks `ui: { helpButton }`, an icon path that no longer exists, and other `vi.mock` targets or mock objects naming removed paths.

**Impact:** Dead files in the repo and possibly the bundles; mocks that test nothing.

## Steps

### 1: Failing tests

Extend the 0150 test pattern: one case per tracked file under the core's `assets/` (all of it) and under Platinum's `src/assets` (non-code files): read by a listed file or registry, or listed with a reason (not shipped, source for a build step such as the sprite mp3s, etc.). Plus a check that no test mocks an icon path, module path or asset that does not exist.

### 2: Delete or keep, file by file

Check every reader with `git grep` (src, packages, storybook, example, bin, workflows, docs) before deleting; delete with `git rm` only files nothing reads; list kept files with reasons. Remove dead mocks. Any removed public path (icon tree, registry key, export) goes in the release notes' removed-path table.

## Acceptance Criteria

- [x] VERIFY: Every tracked file under `assets/` and Platinum's `src/assets` is read or listed with a reason; no test mocks a missing path; the core and Platinum dist sizes are reported before and after.
- [x] VERIFY: Full gate green and parity 445/445 AE 0.

## Files

- `src/Appearance/ClassicyCoreAssets.test.ts` - cover all asset folders

## Work Log

### 2026-11-06T21:18:46.491Z - Landed at 5915c8dba (616ecaeb6 + controller fix f30bf160d listing 0155's platinum.sprites.sha256 as build:audio's skip stamp; rebased onto f30b144c7, the owner's Demo tweak and the #337 commits). Deleted the 83 unread wallpaper photos (~15 MB; never registered, globbed or among the pinned 2.x digests) and one dead test mock (ClassicyAlert ui.helpButton). New tests: the core's whole assets/ tree, every non-code file in Platinum's src/assets, and every vi.mock target and mocked ClassicyIcons path. Shipped bytes unchanged. Integration gate over 0155-0158 + 0159: 499 files / 7590 tests, Platinum 25 / 468 + build + verify:dist, GATE_EXIT=0; parity 445/445 (implementer). After the final rebase: build:source + example build OK, biome clean, PackageExports + CoreAssets 424/424.
