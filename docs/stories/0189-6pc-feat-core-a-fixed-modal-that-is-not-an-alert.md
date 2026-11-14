---
id: 0189-6pc
title: 'Core: a fixed modal that is not an alert'
purpose: Follow-up from plan 0018-dbd (System 7 Appearance Package).
type: feat
status: complete
priority: "3"
effort: M
created: "2026-11-12T14:12:14.396Z"
updated: "2026-11-12T17:32:19.579Z"
started: "2026-11-12T15:00:00.309Z"
completed: "2026-11-12T17:32:19.579Z"
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

# Core: a fixed modal that is not an alert

## Problem Statement

A host cannot ask for a fixed (unmovable, title-bar-less) modal dialog unless it is an alert: the core marks `classicyWindowModalFixed` only for `modal` with `type="error"`, which also beeps and takes the error scrim. System 7's Standard File, Print and Page Setup dialogs are fixed modals that are not alerts (plan 0018-dbd tasks 1.4, 3.4).

**Impact:** System 7 hosts draw Standard File-style dialogs as movable modals or as error alerts.

## Steps

### 1: Add a ClassicyWindow prop (e.g. movable={false}) that sets classicyWindowModalFixed without the error semantics

Add a ClassicyWindow prop (e.g. movable={false}) that sets classicyWindowModalFixed without the error semantics

### 2: Story and tests under Platinum and System 7; Platinum parity AE 0

Story and tests under Platinum and System 7; Platinum parity AE 0

## Acceptance Criteria

- [x] VERIFY: A modal window can be fixed without beeping or the error scrim, and Platinum's existing modals are unchanged.

## Files

- `src/SystemFolder/SystemResources/Window/ClassicyWindow.tsx` - modify

## Work Log
