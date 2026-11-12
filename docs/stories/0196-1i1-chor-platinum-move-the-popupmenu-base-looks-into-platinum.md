---
id: 0196-1i1
title: 'Platinum: move the PopUpMenu base looks into Platinum'
purpose: Follow-up from plan 0018-dbd (System 7 Appearance Package).
type: chor
status: pending
priority: "4"
effort: S
created: "2026-11-12T14:12:37.314Z"
updated: "2026-11-12T14:12:37.314Z"
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

# Platinum: move the PopUpMenu base looks into Platinum

## Problem Statement

The base PopUpMenu stylesheet still holds look declarations that System 7 overrides (plan 0018-dbd task 3.5). Base SCSS is structure only.

**Impact:** Every new package must fight base looks in the pop-up menu.

## Steps

### 1: Move the look declarations into Platinum's PopUpMenu partial

Move the look declarations into Platinum's PopUpMenu partial

### 2: Add the file to ClassicyBaseHoldsNoControlLook.repo.test.ts; Platinum parity AE 0

Add the file to ClassicyBaseHoldsNoControlLook.repo.test.ts; Platinum parity AE 0

## Acceptance Criteria

- [ ] VERIFY: Base PopUpMenu SCSS holds no look, and Platinum is pixel-identical.

## Files

- `src/SystemFolder/SystemResources/PopUpMenu` - modify

## Work Log
