---
id: 0150-jga
title: 'Core assets/: delete or stop inlining the orphan ui art and cursors'
purpose: Ship only the core art something reads, so the bundle carries no dead images.
type: chor
status: complete
priority: "3"
effort: S
created: "2026-11-06T09:33:57.431Z"
updated: "2026-11-06T10:30:13.072Z"
started: "2026-11-06T10:00:17.455Z"
completed: "2026-11-06T10:30:13.072Z"
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
      - src/SystemFolder/SystemResources/Icons/ClassicyIcons.ts
      - assets/img/ui
      - docs/RELEASE-NOTES-APPEARANCE-PACKAGES.md
progress:
  "1":
    status: pending
  "2":
    status: pending
---

# Core assets/: delete or stop inlining the orphan ui art and cursors

## Problem Statement

From 0131-ku3's J8 (2026-11-06). `ClassicyIcons.ts`'s eager `assets/img/ui/**` glob inlines files nothing reads: `stripe.svg`, `tab.svg`, `halftone-small.png`, `menu-dropdown-arrows.svg`, `sad-mac.png`, `cursor-resize-ld.png`, and ten unregistered cursors (`add`, `eyedropper`, `hand-counting`, `highlight`, `menu`, `plus`, `precision`, `rom`, `shortcut`, `spin`), which the release notes document as readable at `ui.cursors.<name>`. `assets/img/PlatinumClickLaunch.png` is read by nothing (no glob reaches it).

**Impact:** Dead images inflate the core bundle (inlined as data URIs) and the published surface.

## Steps

### 1: Decide

For each file: delete it, or narrow the glob to the files the icon tree names. The ten `ui.cursors.<name>` entries are documented as readable, so removing them is a breaking change: list them in the release notes' removed-path table with their replacement (none, or a host registration via `registerClassicyCursors`), or keep them registered on purpose.

### 2: Apply and pin

A test that every file under `assets/img/ui` is either reachable from the icon tree or listed with a reason; the bundle no longer inlines the removed files (compare the dist bundle size).

## Acceptance Criteria

- [x] VERIFY: No unread file under `assets/img` is shipped, the release notes list every removed icon path, and the full gate is green.

## Files

- `src/SystemFolder/SystemResources/Icons/ClassicyIcons.ts` - narrow the eager glob or drop orphans

## Work Log

### 2026-11-06T10:30:05.446Z - Landed at fc40f0abc (855cd7480, fc40f0abc). 20 unread files deleted (the 17 listed plus system/bomb.svg and system/files/{font,messages}.png found by the new test); the ten ui.cursors.<name> paths are removed and listed in the release notes' removed-path table, AGENT-REFERENCE and README. ClassicyCoreAssets.test.ts pins every tracked assets/img file as named, read or not shipped. Core bundle: ES -35,149 B, UMD -34,923 B. Gate 484 files / 7103 tests + package 274 tests green; parity 445/445 against before-land. Controller check: no code reads a deleted file (two unrelated tests use 'sad-mac.png'/'tab.svg' as example strings).
