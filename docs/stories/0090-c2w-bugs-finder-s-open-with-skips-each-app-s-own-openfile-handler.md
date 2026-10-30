---
id: 0090-c2w
title: Finder's open-with skips each app's own OpenFile handler
purpose: Make a file opened from Finder reach the target app's own OpenFile reducer case, the same way a dispatched action does.
type: bugs
status: pending
priority: "2"
effort: S
created: "2026-10-30T16:52:53.909Z"
updated: "2026-10-30T16:52:53.909Z"
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
      - src/SystemFolder/Finder/FinderContext.tsx
      - src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.ts
  plans:
    - ["0002-ldj", "included"]
progress:
  "1":
    status: pending
  "2":
    status: pending
---

# Finder's open-with skips each app's own OpenFile handler

## Problem Statement

Found by the Part K 2.1 review (2026-10-30): Finder builds `ClassicyApp${record.name}OpenFile` inside its reducer and calls `classicyAppEventHandler` directly (`FinderContext.tsx:431,440`), skipping `classicyDesktopStateEventReducer`'s prefix routing and the apps' registered manifests. So an app's own OpenFile case (Movie Player, Picture Viewer, PDF Viewer, HyperCard) is never reached when the user opens a file from Finder; only the generic handler runs. This contradicts `docs/superpowers/specs/2026-06-30-pdf-viewer-design.md:14`.

**Impact:** App-specific open logic (validation, per-app state setup) silently does not run for Finder-opened files, and a host app that registers an OpenFile reducer never sees Finder opens.

## Steps

### 1: Failing test

Open a file from Finder for an app whose manifest registers an OpenFile case; assert that case runs (it does not today).

### 2: Route through the kernel

Have Finder route the OpenFile action through the desktop reducer's prefix routing (preserving trust and the untrusted-action floor) instead of calling the generic handler directly; keep the generic fallback for apps without a reducer. Parity unchanged.

## Acceptance Criteria

- [ ] A file opened from Finder reaches the target app's own OpenFile case when its manifest registers one, and the generic handler otherwise; tests prove both.

## Files

- `src/SystemFolder/Finder/FinderContext.tsx` - route OpenFile through the kernel

## Work Log
