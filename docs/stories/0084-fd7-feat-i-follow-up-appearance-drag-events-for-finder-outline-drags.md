---
id: 0084-fd7
title: 'I follow-up: appearance drag events for Finder outline drags'
purpose: Make Finder and desktop file drags (ClassicyFileDrag) emit the same dragStart/dragEnd appearance events as window and icon drags, so a package can style or sound them.
type: feat
status: complete
priority: "3"
effort: S
created: "2026-10-29T21:26:50.186Z"
updated: "2026-11-05T00:48:49.859Z"
started: "2026-11-04T00:30:14.364Z"
completed: "2026-11-05T00:48:49.859Z"
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
    - ["0046-ukg", "depends"]
  plans:
    - ["0006-dy6", "included"]
progress:
  "1":
    status: complete
  "2":
    status: complete
  "3":
    status: complete
  "4":
    status: complete
---

# I follow-up: appearance drag events for Finder outline drags

## Problem Statement

Part I 2.3 (0046-ukg, 41793c78b) wires `dragStart`/`dragEnd` appearance events for window and icon drags, but Finder and desktop file drags go through `startClassicyFileDrag` (`src/SystemFolder/SystemResources/File/ClassicyFileDrag.ts`), which has no start or cancel callback. Those drags therefore emit no appearance event, so a package can neither decorate the dragged item nor play a drag sound for it. The I 2.3 fix round deferred this because it needs an API change in ClassicyFileDrag, outside that task's files.

**Impact:** File drags are the most common drag in the desktop, and they are the one drag a package cannot participate in.

## Steps

### 1: Add start and end callbacks to startClassicyFileDrag

Accept optional `onStart` (fired once the 4 px threshold is crossed) and `onEnd({ dropped: boolean, cancelled: boolean })` (fired on drop, Escape or pointer release outside a target) callbacks; existing callers are unchanged.

### 2: Emit the events from the file browsers and the desktop

ClassicyFileBrowser icon and list views and the desktop's file icons pass callbacks that emit `dragStart` and exactly one `dragEnd` (with `{ dropped, cancelled }` and `input: "pointer"`) through their `useClassicyAppearance` emitter.

### 3: Tests

Unit tests for the callbacks (threshold, Escape, drop, outside release: exactly one end each) and component tests asserting the emitted events with the appearance probe.

### 4: Gate and docs rows

`pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`; AGENT-REFERENCE event rows for the file-drag events.

## Acceptance Criteria

- [x] VERIFY: pnpm exec vitest run src/SystemFolder/SystemResources/File
- [x] A Finder or desktop file drag emits one dragStart once the drag threshold is crossed and exactly one dragEnd on drop, Escape or release elsewhere.
- [x] VERIFY: pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test

## Work Log

### 2026-10-29T21:26:50.186Z - Created from the Part I 2.3 fix round (41793c78b), which deferred file-drag events because they need a ClassicyFileDrag API change.

### 2026-11-03T23:46:58.680Z - Scheduled by the owner (2026-11-03). Wave 2: starts as soon as Part K lands, because it edits code Part K is landing now (the file system, Finder, Storybook, file drags).

### 2026-11-04T00:32:09.357Z - Wave 2 started in its own worktree from feat/AppearancePackages a02e805cb (Part K landed).

### 2026-11-05T00:48:24.881Z - Implemented (320534048 on fu/0084): one dragStart and exactly one dragEnd; no input field (pointer-only rule); detail is {kind:'file'}. Review: Needs fixes (a source unmounting mid-drag reported dragEnd after unmount and left the outline on screen; three surviving mutants; minors).

### 2026-11-05T00:48:27.244Z - Review fixes (824203d70 on fu/0084): useClassicyFileDragEndOnUnmount ends a drag as canceled before its source unmounts; timing mutants killed; a throwing onEnd is isolated; emitDrag is optional; shared withElementsFromPoint test helper. 11 mutants killed; 5106 tests (File suite 454). Accepted.

### 2026-11-05T00:48:46.394Z - Landed (wave2b) on feat/AppearancePackages as af200b305 and 8a6f63291, right after wave2a 065c27e61 (confirmed from git ancestry; the pending-tracker notes recorded the wave2b gate as running). Every later full gate on the branch includes it (e.g. 443 files / 5722 tests on the Part H rebase). The drag-end field was later renamed cancelled -> canceled (52b917046) and gained lost (29d3a253d). Complete.
