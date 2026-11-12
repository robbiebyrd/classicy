---
id: 0183-25y
title: 'System 7 3.7: Desktop, icons, Control Strip, Appearance Manager'
purpose: Plan 0018-dbd section 3.7.
type: feat
status: complete
priority: "2"
effort: S
created: "2026-11-11T15:13:26.470Z"
updated: "2026-11-12T12:12:54.377Z"
started: "2026-11-12T10:03:14.419Z"
completed: "2026-11-12T12:12:54.377Z"
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

# System 7 3.7: Desktop, icons, Control Strip, Appearance Manager

## Problem Statement

Plan 0018-dbd §3.7 (Desktop, icons, Control Strip, Appearance Manager). Design: plan 0017-6me. Interfaces: {}

**Impact:** Part of the System 7 Appearance Package.

## Steps

### 1: Desktop pattern per theme, icon labels (Geneva 9, opaque, inverted), selected/open icon states (B&W invert, color darken

Desktop pattern per theme, icon labels (Geneva 9, opaque, inverted), selected/open icon states (B&W invert, color darken), Control Strip and Appearance Manager under System 7; compare

### 2: Commit

Command: `git commit -m "feat(system7): desktop, icons, Control Strip and Appearance Manager"`

## Acceptance Criteria

- [x] VERIFY: The section's tests pass, Platinum parity stays AE 0 where the section touches the core or Platinum, and lint and tsc are clean.

## Files

- `packages/appearance/system7` - modify

## Work Log
