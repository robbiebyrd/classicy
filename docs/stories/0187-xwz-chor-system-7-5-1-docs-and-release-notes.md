---
id: 0187-xwz
title: 'System 7 5.1: Docs and release notes'
purpose: Plan 0018-dbd section 5.1.
type: chor
status: complete
priority: "2"
effort: S
created: "2026-11-11T15:13:46.600Z"
updated: "2026-11-12T14:23:26.022Z"
started: "2026-11-12T13:40:36.658Z"
completed: "2026-11-12T14:23:26.022Z"
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

# System 7 5.1: Docs and release notes

## Problem Statement

Plan 0018-dbd §5.1 (Docs and release notes). Design: plan 0017-6me. Interfaces: {}

**Impact:** Part of the System 7 Appearance Package.

## Steps

### 1: CLAUDE.md, AGENT-REFERENCE §8 (per-theme variants, scroll-bar parts, dither vocabulary, pack alerts, small icons, System

CLAUDE.md, AGENT-REFERENCE §8 (per-theme variants, scroll-bar parts, dither vocabulary, pack alerts, small icons, System 7), README, the System 7 README, docs/RELEASE-NOTES-3.2.md

### 2: Commit

Command: `git commit -m "docs: the System 7 Appearance Package"`

## Acceptance Criteria

- [x] VERIFY: The section's tests pass, Platinum parity stays AE 0 where the section touches the core or Platinum, and lint and tsc are clean.

## Files

- `packages/appearance/system7` - modify

## Work Log
