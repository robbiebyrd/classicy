---
id: 0195-wuo
title: 'Core: Desktop tab offers no picture'
purpose: Follow-up from plan 0018-dbd (System 7 Appearance Package).
type: feat
status: complete
priority: "4"
effort: S
created: "2026-11-12T14:12:34.156Z"
updated: "2026-11-14T05:51:17.465Z"
started: "2026-11-13T20:55:00.393Z"
completed: "2026-11-14T05:51:17.465Z"
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

# Core: Desktop tab offers no picture

## Problem Statement

The Appearance Manager's Desktop tab has no choice that removes the desktop picture, so a solid desktop color cannot be reached from the panel (only by dispatching ClassicyDesktopChangeBackground with an empty image). Under System 7 the pattern is the default picture (plan 0018-dbd task 3.7); under Platinum the same gap exists.

**Impact:** Users cannot pick a plain desktop color.

## Steps

### 1: Add a None entry to the Patterns/picture choice that dispatches an empty background

Add a None entry to the Patterns/picture choice that dispatches an empty background

### 2: Tests; parity

Tests; parity

## Acceptance Criteria

- [x] VERIFY: The Desktop tab can remove the picture, and the desktop then shows the theme's solid color.

## Files

- `src/SystemFolder/ControlPanels/AppearanceManager` - modify

## Work Log
