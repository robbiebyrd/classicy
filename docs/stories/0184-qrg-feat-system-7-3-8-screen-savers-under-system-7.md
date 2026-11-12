---
id: 0184-qrg
title: 'System 7 3.8: Screen savers under System 7'
purpose: Plan 0018-dbd section 3.8.
type: feat
status: complete
priority: "2"
effort: S
created: "2026-11-11T15:13:31.400Z"
updated: "2026-11-12T13:40:05.717Z"
started: "2026-11-12T12:13:03.184Z"
completed: "2026-11-12T13:40:05.716Z"
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

# System 7 3.8: Screen savers under System 7

## Problem Statement

Plan 0018-dbd §3.8 (Screen savers under System 7). Design: plan 0017-6me. Interfaces: {}

**Impact:** Part of the System 7 Appearance Package.

## Steps

### 1: Platinum's saver registration lists both packages; System 7 bundles it (boundary test), adds its reduced-motion pause ru

Platinum's saver registration lists both packages; System 7 bundles it (boundary test), adds its reduced-motion pause rule, lists the saver art in its dist check; tests for a System 7-only host

### 2: Commit

Command: `git commit -m "feat(system7): the After Dark savers under System 7"`

## Acceptance Criteria

- [x] VERIFY: The section's tests pass, Platinum parity stays AE 0 where the section touches the core or Platinum, and lint and tsc are clean.

## Files

- `packages/appearance/system7` - modify

## Work Log
