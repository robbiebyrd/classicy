---
id: 0173-q1z
title: 'System 7 1.6: Move base-layer looks into Platinum'
purpose: Plan 0018-dbd section 1.6.
type: feat
status: complete
priority: "2"
effort: S
created: "2026-11-11T15:12:30.863Z"
updated: "2026-11-11T21:57:47.426Z"
started: "2026-11-11T21:57:43.894Z"
completed: "2026-11-11T21:57:47.426Z"
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
---

# System 7 1.6: Move base-layer looks into Platinum

## Problem Statement

Plan 0018-dbd §1.6 (Move base-layer looks into Platinum). Design: plan 0017-6me. Interfaces: {}

**Impact:** Part of the System 7 Appearance Package.

## Steps

### 1: Move the look declarations the research found in base SCSS (radio, checkbox face and glyph, little arrows, input bevel, 

Move the look declarations the research found in base SCSS (radio, checkbox face and glyph, little arrows, input bevel, list selection) into Platinum's component partials; base keeps structure

### 2: Parity AE 0; cascade and literal gates green

Command: `pnpm lint && pnpm test --maxWorkers=3`

### 3: Commit

Command: `git commit -m "refactor(appearance): radio, checkbox, little-arrow, input and list looks move to Platinum"`

## Acceptance Criteria

- [x] VERIFY: The section's tests pass, Platinum parity stays AE 0 where the section touches the core or Platinum, and lint and tsc are clean.

## Files

- `packages/appearance/system7` - modify

## Work Log
