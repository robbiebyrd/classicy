---
id: 0182-0m3
title: 'System 7 3.6: Scroll bars'
purpose: Plan 0018-dbd section 3.6.
type: feat
status: complete
priority: "2"
effort: M
created: "2026-11-11T15:13:21.527Z"
updated: "2026-11-12T10:02:47.139Z"
started: "2026-11-12T08:27:55.409Z"
completed: "2026-11-12T10:02:47.139Z"
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

# System 7 3.6: Scroll bars

## Problem Statement

Plan 0018-dbd §3.6 (Scroll bars). Design: plan 0017-6me. Interfaces: {}

**Impact:** Part of the System 7 Appearance Package.

## Steps

### 1: System 7 styling of the scroll-bar parts: 16 px, outlined arrows both ends, dotted track per theme, square thumb (grip r

System 7 styling of the scroll-bar parts: 16 px, outlined arrows both ends, dotted track per theme, square thumb (grip ridges per references), fits and inactive states; compare

### 2: Commit

Command: `git commit -m "feat(system7): scroll bars"`

## Acceptance Criteria

- [x] VERIFY: The section's tests pass, Platinum parity stays AE 0 where the section touches the core or Platinum, and lint and tsc are clean.

## Files

- `packages/appearance/system7` - modify

## Work Log
