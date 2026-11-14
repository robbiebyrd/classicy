---
id: 0172-pwu
title: 'System 7 1.5: Custom scroll bars'
purpose: Plan 0018-dbd section 1.5.
type: feat
status: complete
priority: "2"
effort: L
created: "2026-11-11T15:12:26.030Z"
updated: "2026-11-11T20:31:55.578Z"
started: "2026-11-11T20:31:51.920Z"
completed: "2026-11-11T20:31:55.578Z"
tags: []
milestone: ""
due_date: ""
planned_start: ""
planned_end: ""
order: 0
links:
  repo:
    local: ~/classicy
progress:
  "1":
    status: pending
  "2":
    status: pending
  "3":
    status: pending
  "4":
    status: pending
---

# System 7 1.5: Custom scroll bars

## Problem Statement

Plan 0018-dbd §1.5 (Custom scroll bars). Design: plan 0017-6me. Interfaces: {"produces": "A `ClassicyScrollArea` (name the builder's) used wherever windows, lists, tabs and text areas scroll: draws arrows (both ends), track and thumb as `data-classicy-part` parts packages style; states `inactive` (window inactive) and `fits` (content fits); keyboard, wheel, drag and arrow-press repeat behavior; accessible (`role`, focus). Native scroll bars are hidden where it is used."}

**Impact:** Part of the System 7 Appearance Package.

## Steps

### 1: Failing tests

thumb size and position follow content; arrow press repeats (little-arrows pattern); dragging the thumb scrolls; wheel scrolls; `fits` when content fits; `inactive` with the window; lost pointer stream ends a drag (onClassicyPointerStreamLost).

### 2: Implement the component and adopt it in Window, lists, tabs, text areas

Implement the component and adopt it in Window, lists, tabs, text areas

### 3: Platinum restyles it to match today's bars; parity AE 0 on every story

Command: `pnpm build:storybook && pnpm parity:shoot --port <p> --mid --out <dir> && pnpm parity:compare`

### 4: Commit

Command: `git commit -m "feat(scroll): Classicy draws its own scroll bars"`

## Acceptance Criteria

- [x] VERIFY: The section's tests pass, Platinum parity stays AE 0 where the section touches the core or Platinum, and lint and tsc are clean.

## Files

- `packages/appearance/system7` - modify

## Work Log
