---
id: 0181-siu
title: 'System 7 3.5: Controls'
purpose: Plan 0018-dbd section 3.5.
type: feat
status: complete
priority: "2"
effort: M
created: "2026-11-11T15:13:16.705Z"
updated: "2026-11-12T08:27:46.194Z"
started: "2026-11-12T06:34:58.049Z"
completed: "2026-11-12T08:27:46.194Z"
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

# System 7 3.5: Controls

## Problem Statement

Plan 0018-dbd §3.5 (Controls). Design: plan 0017-6me. Interfaces: {}

**Impact:** Part of the System 7 Appearance Package.

## Steps

### 1: Checkbox, radio, pop-up, slider, little arrows, disclosure triangle, text field, list (selection inversion), dimmed stat

Checkbox, radio, pop-up, slider, little arrows, disclosure triangle, text field, list (selection inversion), dimmed states per theme; compare; parity

### 2: Commit

Command: `git commit -m "feat(system7): controls"`

## Acceptance Criteria

- [x] VERIFY: The section's tests pass, Platinum parity stays AE 0 where the section touches the core or Platinum, and lint and tsc are clean.

## Files

- `packages/appearance/system7` - modify

## Work Log
