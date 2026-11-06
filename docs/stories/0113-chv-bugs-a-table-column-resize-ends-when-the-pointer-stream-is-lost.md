---
id: 0113-chv
title: A table column resize ends when the pointer stream is lost
purpose: Close the one gesture drag-cancel left uncovered.
type: bugs
status: complete
priority: "4"
effort: S
created: "2026-11-05T01:01:56.902Z"
updated: "2026-11-05T01:04:18.184Z"
started: "2026-11-05T01:02:04.506Z"
completed: "2026-11-05T01:02:21.785Z"
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
      - src/SystemFolder/SystemResources/Table/ClassicyTable.tsx
  stories:
    - ["0107-6bj", "depends"]
  plans:
    - ["0002-ldj", "included"]
progress:
  "1":
    status: complete
  "2":
    status: complete
---

# A table column resize ends when the pointer stream is lost

## Problem Statement

drag-cancel follow-up: ClassicyTable's column resize (@tanstack table-core, which offers no cancel API) did not end on a lost pointer stream.

**Impact:** A column resize could stay attached to the pointer after blur or pointercancel.

## Steps

### 1: Implement

End the TanStack resize from the lost-stream watcher where it is, with tests and docs.

### 2: Land

Gate on the landing tree, land on feat/AppearancePackages and push.

## Acceptance Criteria

- [x] A lost pointer stream ends a ClassicyTable column resize where it is.
- [x] VERIFY: pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test --maxWorkers=3 && pnpm build:source

## Files

- `src/SystemFolder/SystemResources/Table/ClassicyTable.tsx`

## Work Log

### 2026-11-05T01:02:06.762Z - Dispatched 2026-11-04 ~21:00 UTC (owner asked to fix) on fu/table-resize-cancel from 67805920e. Filed after the fact because the tracker was offline (MongoDB outage).

### 2026-11-05T01:02:18.570Z - Landed 67805920e..a0150b291, pushed (73f737823 fix, a0150b291 docs). Agent gate on the identical tree: 458 files / 6136 tests, all builds. Complete.
