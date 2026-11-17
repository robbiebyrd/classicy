---
id: 0219-c62
title: 'System 7: dithers take the window''s pattern phase'
purpose: Follow-up from plan 0018-dbd (System 7 Appearance Package), task 5.2 verification (batch L's review).
type: impr
status: pending
priority: "4"
effort: M
created: "2026-11-17T11:24:27.639Z"
updated: "2026-11-17T11:24:27.639Z"
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
---

# System 7: dithers take the window's pattern phase

## Problem Statement

QuickDraw aligns a pattern to the window port's origin, so a dithered part shows the same phase wherever it sits. System 7's scroll tracks follow the window's origin (layout scrollBar.patternOrigin, published by ClassicyScrollPatternOrigin), but its other dithers (the dimmed-control pattern, the primary group box's dotted frame, the color pop-up's sprinkle) are anchored at each part's own corner, so a part whose position or size parity differs from the reference capture shows its dots one pixel out of phase.

## Steps

### 1: Window origin for any dithered part

Generalize the core's window-origin publication from scroll bars to any part a package declares as window-anchored, as an optional declaration Platinum leaves unset.

### 2: System 7 dithers

The dimmed pattern, the group box checker and the color pop-up sprinkle position their patterns from the published origin.

## Acceptance Criteria

- [ ] [MANUAL] Every System 7 dither named here keeps the window's phase at any position and size (tested at both parities), Platinum and core parity stay AE 0, System 7 moved shots are named, and the full gate passes.

## Work Log
