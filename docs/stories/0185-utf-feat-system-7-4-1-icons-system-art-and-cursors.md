---
id: 0185-utf
title: 'System 7 4.1: Icons, system art and cursors'
purpose: Plan 0018-dbd section 4.1.
type: feat
status: complete
priority: "2"
effort: M
created: "2026-11-11T15:13:36.923Z"
updated: "2026-11-12T04:04:06.254Z"
started: "2026-11-12T04:04:02.227Z"
completed: "2026-11-12T04:04:06.254Z"
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

# System 7 4.1: Icons, system art and cursors

## Problem Statement

Plan 0018-dbd §4.1 (Icons, system art and cursors). Design: plan 0017-6me. Interfaces: {}

**Impact:** Part of the System 7 Appearance Package.

## Steps

### 1: Register the exported color art as the base tree and 1-bit art as the `bw` variant (32 and 16 px), every system-art key 

Register the exported color art as the base tree and 1-bit art as the `bw` variant (32 and 16 px), every system-art key and cursor role; tests: every inventory entry registered, files read, byte-identical in dist

### 2: Commit

Command: `git commit -m "feat(system7): System 7 icons, art and cursors"`

## Acceptance Criteria

- [x] VERIFY: The section's tests pass, Platinum parity stays AE 0 where the section touches the core or Platinum, and lint and tsc are clean.

## Files

- `packages/appearance/system7` - modify

## Work Log
