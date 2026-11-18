---
id: 0186-6vf
title: 'System 7 4.2: Sounds and window colors'
purpose: Plan 0018-dbd section 4.2.
type: feat
status: complete
priority: "2"
effort: S
created: "2026-11-11T15:13:42.058Z"
updated: "2026-11-12T04:56:51.478Z"
started: "2026-11-12T04:56:45.404Z"
completed: "2026-11-12T04:56:51.478Z"
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

# System 7 4.2: Sounds and window colors

## Problem Statement

Plan 0018-dbd §4.2 (Sounds and window colors). Design: plan 0017-6me. Interfaces: {}

**Impact:** Part of the System 7 Appearance Package.

## Steps

### 1: Sound pack from the exported alerts (sprites via the audio pipeline, Simple Beep default); color theme tokens from the `

Sound pack from the exported alerts (sprites via the audio pipeline, Simple Beep default); color theme tokens from the `wctb`/`cctb` values; re-compare color references

### 2: Commit

Command: `git commit -m "feat(system7): alert sounds and the Standard window colors"`

## Acceptance Criteria

- [x] VERIFY: The section's tests pass, Platinum parity stays AE 0 where the section touches the core or Platinum, and lint and tsc are clean.

## Files

- `packages/appearance/system7` - modify

## Work Log
