---
id: 0170-qqt
title: 'System 7 1.3: Pack-driven alert sounds'
purpose: Plan 0018-dbd section 1.3.
type: feat
status: complete
priority: "2"
effort: S
created: "2026-11-11T15:12:15.663Z"
updated: "2026-11-11T17:50:54.312Z"
started: "2026-11-11T17:50:51.156Z"
completed: "2026-11-11T17:50:54.312Z"
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

# System 7 1.3: Pack-driven alert sounds

## Problem Statement

Plan 0018-dbd §1.3 (Pack-driven alert sounds). Design: plan 0017-6me. Interfaces: {"produces": "A sound pack declares its alert sprite ids and default alert; the Sound tab, `ClassicyAlertSound` and `DEFAULT_ALERT_SOUND` read the active pack; a persisted `alertSound` the pack lacks falls back to the pack's default without being rewritten. Platinum's pack declares its seven alerts and Sosumi."}

**Impact:** Part of the System 7 Appearance Package.

## Steps

### 1: Failing tests

the Sound tab lists the active pack's alerts; switching package switches the list; the stored choice is never overwritten; Platinum behavior unchanged.

### 2: Implement

Command: `pnpm exec vitest run src/SystemFolder/ControlPanels packages/appearance/platinum/src/assets/sounds`

### 3: Commit

Command: `git commit -m "feat(sound): alert sounds come from the active sound pack"`

## Acceptance Criteria

- [x] VERIFY: The section's tests pass, Platinum parity stays AE 0 where the section touches the core or Platinum, and lint and tsc are clean.

## Files

- `packages/appearance/system7` - modify

## Work Log
