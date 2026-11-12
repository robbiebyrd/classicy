---
id: 0175-nqm
title: 'System 7 2.2: Package skeleton'
purpose: Plan 0018-dbd section 2.2.
type: chor
status: complete
priority: "2"
effort: M
created: "2026-11-11T15:12:40.494Z"
updated: "2026-11-11T23:00:18.152Z"
started: "2026-11-11T23:00:15.116Z"
completed: "2026-11-11T23:00:18.152Z"
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

# System 7 2.2: Package skeleton

## Problem Statement

Plan 0018-dbd §2.2 (Package skeleton). Design: plan 0017-6me. Interfaces: {}

**Impact:** Part of the System 7 Appearance Package.

## Steps

### 1: Failing tests mirroring Platinum's

source imports only `@classicy/classicy` (plus the saver module); one registry; package exports and manifest; registration of package `system7` with themes System 7 and System 7 Color (assetVariant `bw` on the former), fonts as byte-identical copies, layout, `defaultScreenSaver`; full system-art and cursor key coverage (placeholder art until Phase 4, listed).

### 2: Implement; wire workspace, tsconfig/vitest/Storybook/example aliases, the gates' scan roots, both dist checks, `verify:h

Command: `pnpm build:source && pnpm test --maxWorkers=3`

### 3: Commit

Command: `git commit -m "feat(system7): the System 7 Appearance Package skeleton"`

## Acceptance Criteria

- [x] VERIFY: The section's tests pass, Platinum parity stays AE 0 where the section touches the core or Platinum, and lint and tsc are clean.

## Files

- `packages/appearance/system7/package.json` - create
- `packages/appearance/system7/vite.config.ts` - create
- `packages/appearance/system7/vitest.config.ts` - create
- `packages/appearance/system7/bin/verify-dist.mjs` - create
- `packages/appearance/system7/src/index.ts` - create
- `packages/appearance/system7/src/system7.json` - create
- `packages/appearance/system7/src/styles/system7.scss` - create
- `packages/appearance/system7/README.md` - create

## Work Log
