---
id: 0174-rl1
title: 'System 7 2.1: Asset inventory for the owner'
purpose: Plan 0018-dbd section 2.1.
type: chor
status: complete
priority: "2"
effort: S
created: "2026-11-11T15:12:35.790Z"
updated: "2026-11-11T15:47:05.262Z"
started: "2026-11-11T15:47:01.773Z"
completed: "2026-11-11T15:47:05.262Z"
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

# System 7 2.1: Asset inventory for the owner

## Problem Statement

Plan 0018-dbd §2.1 (Asset inventory for the owner). Design: plan 0017-6me. Interfaces: {}

**Impact:** Part of the System 7 Appearance Package.

## Steps

### 1: Write the inventory

every icon key (core icon tree, bundled apps), every `ClassicySystemArtKey`, every `ClassicyCursorRole`, the alert sounds and the `wctb`/`cctb` window colors: each with its System 7.5 source (file, resource type and id), or a fallback for keys with no System 7 counterpart; and the exact export: PNG 32×32 and 16×16, 1-bit with transparency and 8-bit color, file names and target paths under `packages/appearance/system7/src/assets/`; cursors PNG + hotspot; sounds AIFF/WAV; colors as hex. A test checks the inventory names every key the core reads.

### 2: Commit and hand the inventory to the owner

Command: `git commit -m "docs: System 7 asset inventory"`

## Acceptance Criteria

- [x] VERIFY: The section's tests pass, Platinum parity stays AE 0 where the section touches the core or Platinum, and lint and tsc are clean.

## Files

- `docs/system7-asset-inventory.md` - create

## Work Log
