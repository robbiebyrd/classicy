---
id: 0177-zev
title: 'System 7 3.1: Reference screenshots'
purpose: Plan 0018-dbd section 3.1.
type: feat
status: complete
priority: "2"
effort: S
created: "2026-11-11T15:12:50.564Z"
updated: "2026-11-12T00:01:57.288Z"
started: "2026-11-12T00:01:53.707Z"
completed: "2026-11-12T00:01:57.288Z"
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

# System 7 3.1: Reference screenshots

## Problem Statement

Plan 0018-dbd §3.1 (Reference screenshots). Design: plan 0017-6me. Interfaces: {}

**Impact:** Part of the System 7 Appearance Package.

## Steps

### 1: Capture System 7.5 references

in an emulator (e.g. Infinite Mac) at 1x, in 1-bit and in color: a document window active and inactive, utility window, menu bar and pull-down, hierarchical and pop-up menus, modeless, movable modal and fixed modal dialogs, an alert, buttons, checkboxes, radios, sliders, little arrows, disclosure triangles, text field, list, scroll bars (fits, inactive), desktop icons selected and not; plus pressed close/zoom boxes and other HIG gaps. Store under `.playwright-mcp/parity/system7/reference/` with an index.

### 2: Commit the index (not the screenshots)

Command: `git commit -m "docs: System 7.5 reference screenshot index"`

## Acceptance Criteria

- [x] VERIFY: The section's tests pass, Platinum parity stays AE 0 where the section touches the core or Platinum, and lint and tsc are clean.

## Files

- `packages/appearance/system7` - modify

## Work Log
