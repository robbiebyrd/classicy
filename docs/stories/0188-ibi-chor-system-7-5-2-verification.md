---
id: 0188-ibi
title: 'System 7 5.2: Verification'
purpose: Plan 0018-dbd section 5.2.
type: chor
status: pending
priority: "2"
effort: S
created: "2026-11-11T15:13:51.840Z"
updated: "2026-11-11T15:13:51.840Z"
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
---

# System 7 5.2: Verification

## Problem Statement

Plan 0018-dbd §5.2 (Verification). Design: plan 0017-6me. Interfaces: {}

**Impact:** Part of the System 7 Appearance Package.

## Steps

### 1: Full gate (lint, tsc, storybook typecheck, vocabulary, color sweep, tests, build:source with all dist checks and host ty

Command: `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm storybook:typecheck && pnpm test --maxWorkers=3 && pnpm build:source && pnpm build:storybook && pnpm --filter classicy-example build`

## Acceptance Criteria

- [ ] VERIFY: The section's tests pass, Platinum parity stays AE 0 where the section touches the core or Platinum, and lint and tsc are clean.

## Files

- `packages/appearance/system7` - modify

## Work Log
