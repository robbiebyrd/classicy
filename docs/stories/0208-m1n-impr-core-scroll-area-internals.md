---
id: 0208-m1n
title: 'Core: scroll area internals'
purpose: Follow-up from plan 0018-dbd (System 7 Appearance Package), Phase 6.
type: impr
status: pending
priority: "4"
effort: S
created: "2026-11-12T14:15:58.930Z"
updated: "2026-11-12T14:15:58.930Z"
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

# Core: scroll area internals

## Problem Statement

From plan 0018-dbd task 1.5: two layout measurements per scroll frame; the MutationObserver watches attributes and characterData more broadly than needed; observers attach once per viewport element, so a renderViewport remount would leave them on the old node; the renderViewport ref is typed HTMLDivElement though a textarea can be the viewport; track re-entry reads the pointer from the previous mousemove (use the mouseenter coordinates); no lost-pointer-stream test for track paging.

**Impact:** Extra layout work and two latent bugs in ClassicyScrollArea.

## Steps

### 1: Fix each item with a test; Platinum parity AE 0

Fix each item with a test; Platinum parity AE 0

## Acceptance Criteria

- [ ] VERIFY: Each item is fixed and tested.

## Files

- `src/SystemFolder/SystemResources/ScrollArea/ClassicyScrollArea.tsx` - modify

## Work Log
