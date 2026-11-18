---
id: 0171-ir6
title: 'System 7 1.4: Dither vocabulary and small structural states'
purpose: Plan 0018-dbd section 1.4.
type: feat
status: complete
priority: "2"
effort: S
created: "2026-11-11T15:12:20.894Z"
updated: "2026-11-11T18:32:44.698Z"
started: "2026-11-11T18:32:41.439Z"
completed: "2026-11-11T18:32:44.698Z"
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

# System 7 1.4: Dither vocabulary and small structural states

## Problem Statement

Plan 0018-dbd §1.4 (Dither vocabulary and small structural states). Design: plan 0017-6me. Interfaces: {"produces": "A vocabulary mixin (`classicy-dither-text`, `classicy-dither-line`, in `src/Appearance/vocabulary`) masking text/lines with a 50% checker, gated by a theme knob; a fixed-modal marker (part attribute or state) on dialogs without a title bar; an `open` state on the pop-up menu's label and indicator; the Help menu-bar cluster able to render art (system art key) in place of its title text."}

**Impact:** Part of the System 7 Appearance Package.

## Steps

### 1: Failing tests

vocabulary test and a compiled-mixin test; the fixed-modal marker on fixed modals only; `open` present while the pop-up is open; help cluster renders the art when registered, text otherwise.

### 2: Implement; parity AE 0

Command: `pnpm test --maxWorkers=3`

### 3: Commit

Command: `git commit -m "feat(appearance): dither vocabulary, fixed-modal, pop-up open and help-art hooks"`

## Acceptance Criteria

- [x] VERIFY: The section's tests pass, Platinum parity stays AE 0 where the section touches the core or Platinum, and lint and tsc are clean.

## Files

- `packages/appearance/system7` - modify

## Work Log
