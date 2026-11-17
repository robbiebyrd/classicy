---
id: 0214-c61
title: 'System 7 and Platinum: look follow-ups from the 7.5.5 captures'
purpose: Follow-up from plan 0018-dbd (System 7 Appearance Package), Phase 6, Batch F-c.
type: impr
status: complete
priority: "4"
effort: M
created: "2026-11-17T00:39:22.088Z"
updated: "2026-11-17T06:29:31.756Z"
started: "2026-11-17T06:29:28.733Z"
completed: "2026-11-17T06:29:31.756Z"
tags: []
milestone: ""
due_date: ""
planned_start: ""
planned_end: ""
order: 0
links:
  plans:
    - ["0018-dbd", "included"]
progress:
  "1":
    status: pending
  "2":
    status: pending
  "3":
    status: pending
  "4":
    status: pending
---

# System 7 and Platinum: look follow-ups from the 7.5.5 captures

## Problem Statement

Batch I's scripted 7.5.5 captures (`.playwright-mcp/parity/system7/reference/*-755-*.png`, indexed in `docs/system7-reference-screenshots.md`) settle looks the package still draws by inference: the Standard File box layout, the Application (App Switcher) menu title, and the Finder list view. The Mac OS 8 HIG (Figs. 2-24 and 2-43) settles Platinum's list-view row background and 16 px list art. Review rounds also left smaller gaps: System 7's small text is 9 px but not in Geneva, an empty fonts element is left when Platinum registers first, list-view labels draw anti-aliased where 7.5.5's are crisp, and the Control Strip docked right is mirrored by inference.

## Steps

### 1: Standard File box

System 7 draws the Standard File box as `*-755-dialog-standardfile-layout.png` shows (folder pop-up over the list, disk name at top right, the Eject/Desktop/line/Cancel/Open column), package-side only.

### 2: App Switcher title

System 7's Application menu title is the front app's small icon alone in a 34 px title whose right edge is 6 px from the screen's, open as `*-755-appmenu-open.png`.

### 3: List views

System 7's default list step matches `*-755-finder-list-row-selected.png`; Platinum's list rows use `--color-system-02` and 16 px list art from HIGOS8 Figs. 2-24/2-43.

### 4: Small gaps

System 7 small text family; no empty fonts element; crisp list labels or the technical reason; a capture of the strip docked right (or the reason none exists).

## Acceptance Criteria

- [x] [MANUAL] Each listed look is AE 0 against its capture or HIG figure (pointer excluded), or the report gives the specific technical reason it cannot be, and Platinum and core shots move only where named.

## Work Log
