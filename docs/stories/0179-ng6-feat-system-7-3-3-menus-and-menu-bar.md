---
id: 0179-ng6
title: 'System 7 3.3: Menus and menu bar'
purpose: Plan 0018-dbd section 3.3.
type: feat
status: complete
priority: "2"
effort: M
created: "2026-11-11T15:13:06.454Z"
updated: "2026-11-12T02:37:08.207Z"
started: "2026-11-12T02:37:03.803Z"
completed: "2026-11-12T02:37:08.207Z"
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

# System 7 3.3: Menus and menu bar

## Problem Statement

Plan 0018-dbd §3.3 (Menus and menu bar). Design: plan 0017-6me. Interfaces: {}

**Impact:** Part of the System 7 Appearance Package.

## Steps

### 1: Menu bar (rounded corners, Apple glyph per theme, help art), pull-down, hierarchical, pop-up, highlight inversion, dimme

Menu bar (rounded corners, Apple glyph per theme, help art), pull-down, hierarchical, pop-up, highlight inversion, dimmed and separators per theme; compare; parity

### 2: Commit

Command: `git commit -m "feat(system7): menus"`

## Acceptance Criteria

- [x] VERIFY: The section's tests pass, Platinum parity stays AE 0 where the section touches the core or Platinum, and lint and tsc are clean.

## Files

- `packages/appearance/system7` - modify

## Work Log
