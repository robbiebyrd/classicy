---
id: 0190-a8v
title: 'Core: scroll-thumb snap-back and scroll-on-release for packages'
purpose: Follow-up from plan 0018-dbd (System 7 Appearance Package).
type: feat
status: pending
priority: "3"
effort: M
created: "2026-11-12T14:12:17.702Z"
updated: "2026-11-12T14:12:17.702Z"
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

# Core: scroll-thumb snap-back and scroll-on-release for packages

## Problem Statement

ClassicyScrollArea scrolls live while the thumb drags and offers no hook for a package to snap the thumb back when the pointer leaves the bar far enough. System 7 leaves the box in place, draws a dotted outline that follows the pointer, scrolls on release and snaps back when the pointer strays (HIG; plan 0018-dbd task 3.6). System 7 draws the moving box as the outline as a stand-in.

**Impact:** System 7's scroll box behaves like Platinum's live thumb.

## Steps

### 1: Design a package-declared drag mode (live vs on-release) and snap-back distance, read from the package layout or a knob

Design a package-declared drag mode (live vs on-release) and snap-back distance, read from the package layout or a knob

### 2: Implement in ClassicyScrollArea; Platinum keeps live scrolling; tests and parity

Implement in ClassicyScrollArea; Platinum keeps live scrolling; tests and parity

## Acceptance Criteria

- [ ] VERIFY: A package can declare scroll-on-release with snap-back, System 7 declares it, and Platinum is unchanged.

## Files

- `src/SystemFolder/SystemResources/ScrollArea/ClassicyScrollArea.tsx` - modify

## Work Log
