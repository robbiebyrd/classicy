---
id: 0220-8us
title: 'System 7: icons for main''s Calculator and Appearance module'
purpose: 'Follow-up from plan 0018-dbd (System 7 Appearance Package): main''s v3.3.0 and v3.4.0 added two core icon keys while PR #343 was open.'
type: chor
status: complete
priority: "3"
effort: S
created: "2026-11-18T01:43:00.262Z"
updated: "2026-11-18T01:43:32.201Z"
started: "2026-11-18T01:43:28.943Z"
completed: "2026-11-18T01:43:32.201Z"
tags: []
milestone: ""
due_date: ""
planned_start: ""
planned_end: ""
order: 0
links:
  plans:
    - ["0018-dbd", "included"]
progress:
  "1":
    status: pending
  "2":
    status: pending
---

# System 7: icons for main's Calculator and Appearance module

## Problem Statement

Main added `applications.calculator.app` (the Calculator desk accessory) and `system.controlStrip.appearance` (the Control Strip's Appearance module). System 7's icon inventory must cover every core key, so its inventory test failed after main was merged into the branch.

## Steps

### 1: Calculator

Export the System 7.5.5 Calculator desk accessory's own icon (color, 1-bit and selected, 32 and 16 px) and add its inventory row.

### 2: Appearance module

Reuse System 7's generic Control Strip module icon, as for modules 7.5 lacked.

## Acceptance Criteria

- [x] [MANUAL] The inventory covers every core icon key, the Calculator icon is the 7.5.5 desk accessory's own, the full gate passes, and every moved shot is named.

## Work Log
