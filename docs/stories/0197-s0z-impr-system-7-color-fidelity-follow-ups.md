---
id: 0197-s0z
title: 'System 7: color fidelity follow-ups'
purpose: Follow-up from plan 0018-dbd (System 7 Appearance Package).
type: impr
status: pending
priority: "4"
effort: M
created: "2026-11-12T14:12:40.404Z"
updated: "2026-11-12T14:12:40.404Z"
tags: []
milestone: ""
due_date: ""
planned_start: ""
planned_end: ""
order: 0
links:
  repo:
    local: ~/classicy
  plans:
    - ["0018-dbd", "included"]
progress:
  "1":
    status: pending
  "2":
    status: pending
---

# System 7: color fidelity follow-ups

## Problem Statement

Known System 7 Color gaps against the 7.5 captures (plan 0018-dbd tasks 3.5, 3.7): selected color icons are darkened by half instead of 7.5's color-table mapping (AE 799/1024 on the Sound icon); the Control Strip face is #BBBBBB instead of #CCCCCC; the disclosure triangle checker is #9999CC instead of #9999FF (no theme token holds it).

**Impact:** Color icons, the strip and triangles are near but not exact.

## Steps

### 1: Decide per item: add System 7 theme color slots, or a color-table mapping for selected icons (raster or filter)

Decide per item: add System 7 theme color slots, or a color-table mapping for selected icons (raster or filter)

### 2: Compare against the captures; tests

Compare against the captures; tests

## Acceptance Criteria

- [ ] VERIFY: Each item is either AE 0 against its capture or recorded as accepted with a reason.

## Files

- `packages/appearance/system7/src/styles/components` - modify

## Work Log
