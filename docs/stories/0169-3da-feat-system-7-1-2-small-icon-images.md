---
id: 0169-3da
title: 'System 7 1.2: Small icon images'
purpose: Plan 0018-dbd section 1.2.
type: feat
status: complete
priority: "2"
effort: S
created: "2026-11-11T15:12:10.244Z"
updated: "2026-11-11T17:17:06.825Z"
started: "2026-11-11T17:17:03.565Z"
completed: "2026-11-11T17:17:06.825Z"
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

# System 7 1.2: Small icon images

## Problem Statement

Plan 0018-dbd §1.2 (Small icon images). Design: plan 0017-6me. Interfaces: {"produces": "An icon tree leaf may be `{ src: string, small?: string }` (or the plain string as today); `ClassicyIcon` and every small render (`--icon-small-size` sites) use `small` when present."}

**Impact:** Part of the System 7 Appearance Package.

## Steps

### 1: Failing tests

a leaf with `small` renders the small image at 16 px and the large one at 32 px; a plain-string leaf scales as today; per-theme variants carry `small` too.

### 2: Implement; parity AE 0

Command: `pnpm exec vitest run src/SystemFolder/SystemResources src/Appearance`

### 3: Commit

Command: `git commit -m "feat(icons): an icon may carry its own 16 px image"`

## Acceptance Criteria

- [x] VERIFY: The section's tests pass, Platinum parity stays AE 0 where the section touches the core or Platinum, and lint and tsc are clean.

## Files

- `packages/appearance/system7` - modify

## Work Log
