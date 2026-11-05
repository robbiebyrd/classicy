---
id: 0107-6bj
title: Window blur, pointercancel and a hidden page end every pointer-following gesture
purpose: End drags and presses cleanly when the browser loses the pointer stream.
type: bugs
status: complete
priority: "3"
effort: L
created: "2026-11-05T00:59:18.747Z"
updated: "2026-11-05T01:04:02.475Z"
started: "2026-11-05T00:59:26.406Z"
completed: "2026-11-05T00:59:43.852Z"
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
      - src/SystemFolder/SystemResources
  stories:
    - ["0084-fd7", "depends"]
  plans:
    - ["0002-ldj", "included"]
progress:
  "1":
    status: complete
  "2":
    status: complete
---

# Window blur, pointercancel and a hidden page end every pointer-following gesture

## Problem Statement

Window blur, pointercancel and a hidden page did not end window or file drags (it predates the program): a drag could stay attached to the pointer, or a file-drag outline stay on screen, after the stream was lost.

**Impact:** Stuck drags and outlines after alt-tab, touch cancel or tab switches.

## Steps

### 1: Implement

Add a shared lost-pointer-stream watcher and use it in every pointer-following gesture: file drags and the bevel held press cancel; the others end in place (window, split view commits, Control Strip, sliders commit on pointercancel, color wheel, PDF pan, HyperCard part, icons, selection rectangle, little arrows).

### 2: Land

Gate on the landing tree, land on feat/AppearancePackages and push.

## Acceptance Criteria

- [x] A lost pointer stream (blur, pointercancel, hidden page) ends every pointer-following gesture: file drags and the bevel held press as canceled, the rest in place.
- [x] VERIFY: pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test --maxWorkers=3 && pnpm build:source

## Files

- `src/SystemFolder/SystemResources`

## Work Log

### 2026-11-05T00:59:28.669Z - Filed as a follow-up candidate 2026-11-04; dispatched ~18:00 UTC (owner approved) on fu/drag-cancel from 40934effc, rebased onto 5b0ce7ee3 (tip c14b4ef35). Filed after the fact because the tracker was offline (MongoDB outage).

### 2026-11-05T00:59:40.435Z - Landed e598f0df3..67805920e, pushed (20 commits, ac6dc42fa..67805920e, including the review minors: slider single commit, split view unmount cleanup d51957d2f/173d196ce, release-note slider sentence). Agent gate 454 files / 6032 tests; land gate passed; independent review done. Not covered here: table column resize and the lost flag on dragEnd (filed as table-resize-cancel and drag-lost-detail). Complete.
