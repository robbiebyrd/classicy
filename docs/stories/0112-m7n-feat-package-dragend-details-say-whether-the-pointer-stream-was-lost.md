---
id: 0112-m7n
title: Package dragEnd details say whether the pointer stream was lost
purpose: Let packages tell a lost drag from a normal one.
type: feat
status: complete
priority: "4"
effort: S
created: "2026-11-05T01:01:30.008Z"
updated: "2026-11-05T01:04:15.518Z"
started: "2026-11-05T01:01:37.631Z"
completed: "2026-11-05T01:01:55.086Z"
tags: []
milestone: ""
due_date: ""
planned_start: ""
planned_end: ""
order: 0
links:
  repo:
    local: ~/classicy
    files:
      - src/Appearance/useClassicyAppearance.ts
  stories:
    - ["0107-6bj", "depends"]
  plans:
    - ["0002-ldj", "included"]
progress:
  "1":
    status: complete
  "2":
    status: complete
---

# Package dragEnd details say whether the pointer stream was lost

## Problem Statement

drag-cancel follow-up: package drag and resize dragEnd events (and file drags) did not carry whether the pointer stream was lost.

**Impact:** A package could not, for example, skip a drop sound for a lost drag.

## Steps

### 1: Implement

Add `lost: boolean` to every dragEnd detail; make the emit type require it so every emitter is updated; docs.

### 2: Land

Gate on the landing tree, land on feat/AppearancePackages and push.

## Acceptance Criteria

- [x] Every dragEnd detail, file drags included, carries `lost`, and the emit type requires it.
- [x] VERIFY: pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test --maxWorkers=3 && pnpm build:source

## Files

- `src/Appearance/useClassicyAppearance.ts`

## Work Log

### 2026-11-05T01:01:39.629Z - Dispatched 2026-11-04 ~21:00 UTC (owner asked to fix) on fu/drag-lost-detail from 67805920e. Filed after the fact because the tracker was offline (MongoDB outage).

### 2026-11-05T01:01:51.728Z - Landed a0150b291..29d3a253d, pushed (25b99c8fe feat, 6ee7835b4 docs, 29d3a253d table emitDrag typing by the controller). Land gate passed. Complete.
