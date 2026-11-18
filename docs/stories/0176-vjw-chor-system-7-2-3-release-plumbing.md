---
id: 0176-vjw
title: 'System 7 2.3: Release plumbing'
purpose: Plan 0018-dbd section 2.3.
type: chor
status: complete
priority: "2"
effort: S
created: "2026-11-11T15:12:45.370Z"
updated: "2026-11-11T23:16:39.108Z"
started: "2026-11-11T23:16:35.688Z"
completed: "2026-11-11T23:16:39.108Z"
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

# System 7 2.3: Release plumbing

## Problem Statement

Plan 0018-dbd §2.3 (Release plumbing). Design: plan 0017-6me. Interfaces: {}

**Impact:** Part of the System 7 Appearance Package.

## Steps

### 1: Failing tests

push.yml syncs, builds, checks trusted publishing for and publishes `@classicy/appearance-system7`, and the wait step waits for it; the bootstrap script's default manifests include it.

### 2: Implement

Command: `pnpm exec vitest run bin`

### 3: Commit

Command: `git commit -m "ci(release): publish @classicy/appearance-system7"`

## Acceptance Criteria

- [x] VERIFY: The section's tests pass, Platinum parity stays AE 0 where the section touches the core or Platinum, and lint and tsc are clean.

## Files

- `.github/workflows/push.yml` - modify
- `bin/npm-bootstrap-trusted-publishing.sh` - modify
- `bin/check-host-types.ts` - modify

## Work Log
