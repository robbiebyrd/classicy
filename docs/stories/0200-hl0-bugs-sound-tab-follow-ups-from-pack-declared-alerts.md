---
id: 0200-hl0
title: Sound tab follow-ups from pack-declared alerts
purpose: Follow-up from plan 0018-dbd (System 7 Appearance Package).
type: bugs
status: complete
priority: "4"
effort: S
created: "2026-11-12T14:12:50.384Z"
updated: "2026-11-12T14:59:23.260Z"
started: "2026-11-12T14:13:39.859Z"
completed: "2026-11-12T14:59:23.260Z"
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
---

# Sound tab follow-ups from pack-declared alerts

## Problem Statement

From plan 0018-dbd task 1.3: the Sound tab shows no alerts when the theme's pack is unregistered while Platinum's default plays; its packAlerts memo misses a late Platinum registration (add the registered packs to its deps); the missing-sprite check uses startsWith("ClassicyAlert"); no Appearance Manager-level package-switch test.

**Impact:** The Sound tab can list the wrong alerts after a late registration.

## Steps

### 1: Fix the memo deps and the empty-list case; tighten the sprite check; add a package-switch test

Fix the memo deps and the empty-list case; tighten the sprite check; add a package-switch test

## Acceptance Criteria

- [x] VERIFY: The Sound tab lists the playing pack's alerts after any registration order.

## Files

- `src/SystemFolder/ControlPanels/AppearanceManager` - modify

## Work Log
