---
id: 0090-c2w
title: Finder's open-with skips each app's own OpenFile handler
purpose: Make a file opened from Finder reach the target app's own OpenFile reducer case, the same way a dispatched action does.
type: bugs
status: complete
priority: "2"
effort: S
created: "2026-10-30T16:52:53.909Z"
updated: "2026-11-05T00:49:05.563Z"
started: "2026-11-04T00:29:55.967Z"
completed: "2026-11-05T00:49:05.563Z"
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
    status: complete
  "2":
    status: complete
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

- [x] A file opened from Finder reaches the target app's own OpenFile case when its manifest registers one, and the generic handler otherwise; tests prove both.

## Files

- `src/SystemFolder/Finder/FinderContext.tsx` - route OpenFile through the kernel

## Work Log

### 2026-11-03T23:46:53.619Z - Scheduled by the owner (2026-11-03). Wave 2: starts as soon as Part K lands, because it edits code Part K is landing now (the file system, Finder, Storybook, file drags).

### 2026-11-04T00:32:04.217Z - Wave 2 started in its own worktree from feat/AppearancePackages a02e805cb (Part K landed).

### 2026-11-05T00:48:51.916Z - Implemented (69f0fae4d on fu/0090). Review: Needs fixes, three trust bypasses (I-1 fail-open default; I-2 legacy QuickTime branch; I-3 the URL-shortcut branch reaching ClassicyDesktopOpenUrl).

### 2026-11-05T00:48:54.150Z - Security fixes (dfd1a604d on fu/0090): trust required (missing means untrusted); the QuickTime branch checks MoviePlayerOpenDocument; URL shortcuts check ClassicyDesktopOpenUrl in all dispositions; shared checkClassicyActionTrust; CLAUDE.md notes. Security re-review APPROVED: all three probes refused, even with ClassicyDesktopOpenUrl allowlisted. Final minors (m-1: normalize trust before passing it to plugin handlers).

### 2026-11-05T00:49:02.718Z - Landed on feat/AppearancePackages as 1d9cb84a5 (route open-with through each app's own OpenFile case), 66d5fc77d (every hand-off keeps the action's trust) and 536a958c9 (plugin handlers receive a normalized trust; the tip Part H was rebased onto). Criterion met: FinderOpenFileRouting.test.ts (15) and FinderOpenWithTrust.test.ts (17). Complete.
