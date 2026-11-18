---
id: 0201-uj9
title: 'Core: self-padding dialogs carry a class'
purpose: Follow-up from plan 0018-dbd (System 7 Appearance Package).
type: impr
status: complete
priority: "4"
effort: S
created: "2026-11-12T14:12:53.304Z"
updated: "2026-11-12T17:32:24.493Z"
started: "2026-11-12T15:00:07.412Z"
completed: "2026-11-12T17:32:24.493Z"
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

# Core: self-padding dialogs carry a class

## Problem Statement

System 7 zeroes the modal inner inset only for dialogs that pad themselves, found with `:has(> :is(.classicyAlert, …))`. Firefox 113–120 (inside the supported range) has no `:has()`, so those dialogs get both insets there (plan 0018-dbd task 3.4).

**Impact:** Alerts and input dialogs are over-padded on Firefox 113–120 under System 7.

## Steps

### 1: Have the window mark its modal inner area with a class when its content pads itself (Alert, InputDialog, KeyboardEquival

Have the window mark its modal inner area with a class when its content pads itself (Alert, InputDialog, KeyboardEquivalent, Form)

### 2: System 7 keys the zero inset on the class; tests; Platinum parity AE 0

System 7 keys the zero inset on the class; tests; Platinum parity AE 0

## Acceptance Criteria

- [x] VERIFY: Self-padding dialogs get one inset in every supported browser.

## Files

- `src/SystemFolder/SystemResources/Window/ClassicyWindow.tsx` - modify
- `packages/appearance/system7/src/styles/components/_Dialog.scss` - modify

## Work Log
