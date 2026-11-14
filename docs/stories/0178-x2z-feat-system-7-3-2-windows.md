---
id: 0178-x2z
title: 'System 7 3.2: Windows'
purpose: Plan 0018-dbd section 3.2.
type: feat
status: complete
priority: "2"
effort: M
created: "2026-11-11T15:13:01.003Z"
updated: "2026-11-12T01:27:23.485Z"
started: "2026-11-12T01:27:20.197Z"
completed: "2026-11-12T01:27:23.485Z"
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
---

# System 7 3.2: Windows

## Problem Statement

Plan 0018-dbd §3.2 (Windows). Design: plan 0017-6me. Interfaces: {}

**Impact:** Part of the System 7 Appearance Package.

## Steps

### 1: Stories under both themes; package SCSS for frame, drop shadow, title bar stripes and boxes, inactive state, utility win

Stories under both themes; package SCSS for frame, drop shadow, title bar stripes and boxes, inactive state, utility windows, size box; compare with references; Platinum parity AE 0

### 2: Commit

Command: `git commit -m "feat(system7): windows"`

## Acceptance Criteria

- [x] VERIFY: The section's tests pass, Platinum parity stays AE 0 where the section touches the core or Platinum, and lint and tsc are clean.

## Files

- `packages/appearance/system7` - modify

## Work Log
