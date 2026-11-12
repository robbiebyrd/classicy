---
id: 0191-3x1
title: 'Core: always-shown scroll bars in the fits state'
purpose: Follow-up from plan 0018-dbd (System 7 Appearance Package).
type: feat
status: pending
priority: "4"
effort: S
created: "2026-11-12T14:12:20.973Z"
updated: "2026-11-12T14:12:20.973Z"
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

# Core: always-shown scroll bars in the fits state

## Problem Statement

Windows and list boxes whose content fits draw no scroll bars. The Finder and Standard File in System 7 show both bars in the fits state (no box, plain track); System 7 shows them only when the other axis overflows (plan 0018-dbd task 3.6).

**Impact:** System 7 Finder windows lose their bars when content fits.

## Steps

### 1: Let a package (layout block) or a window/list prop keep both bars in the fits state

Let a package (layout block) or a window/list prop keep both bars in the fits state

### 2: Tests and parity

Tests and parity

## Acceptance Criteria

- [ ] VERIFY: A package can keep fits-state bars visible, and Platinum is unchanged.

## Files

- `src/SystemFolder/SystemResources/ScrollArea/ClassicyScrollArea.tsx` - modify

## Work Log
