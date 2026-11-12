---
id: 0194-5bs
title: 'Core: ticked vertical slider layout'
purpose: Follow-up from plan 0018-dbd (System 7 Appearance Package).
type: bugs
status: pending
priority: "3"
effort: S
created: "2026-11-12T14:12:30.755Z"
updated: "2026-11-12T14:12:30.755Z"
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

# Core: ticked vertical slider layout

## Problem Statement

In the base stylesheet a vertical ClassicySlider with tick marks falls back to a column (ticks under the slider), takes its height from the viewport, and its value label spills one label height below its container. Platinum stories draw no ticked vertical slider, so parity never saw it; System 7 corrects it in its own sheet (plan 0018-dbd task 3.5).

**Impact:** Hosts using a ticked vertical slider under Platinum get a broken layout.

## Steps

### 1: Fix the base vertical-slider stack layout and label placement

Fix the base vertical-slider stack layout and label placement

### 2: Add a Platinum story for a ticked vertical slider; re-baseline only that new shot

Add a Platinum story for a ticked vertical slider; re-baseline only that new shot

## Acceptance Criteria

- [ ] VERIFY: A ticked vertical slider lays out correctly under Platinum and System 7, and every existing Platinum shot stays AE 0.

## Files

- `src/SystemFolder/SystemResources/Slider` - modify

## Work Log
