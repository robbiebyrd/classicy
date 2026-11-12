---
id: 0192-yy2
title: 'Core: pop-up menu lists use the package scroll bars'
purpose: Follow-up from plan 0018-dbd (System 7 Appearance Package).
type: impr
status: pending
priority: "4"
effort: S
created: "2026-11-12T14:12:24.293Z"
updated: "2026-11-12T14:12:24.293Z"
tags: []
milestone: ""
due_date: ""
planned_start: ""
planned_end: ""
order: 0
links:
  repo:
    local: ~/classicy
  plans:
    - ["0018-dbd", "included"]
progress:
  "1":
    status: pending
  "2":
    status: pending
---

# Core: pop-up menu lists use the package scroll bars

## Problem Statement

Pop-up menu lists that scroll keep native scroll bars rather than ClassicyScrollArea's package-drawn bars (plan 0018-dbd task 1.5).

**Impact:** A long pop-up menu shows browser scroll bars under every package.

## Steps

### 1: Wrap the scrolling pop-up list in ClassicyScrollArea or give it the menu's own scroll arrows

Wrap the scrolling pop-up list in ClassicyScrollArea or give it the menu's own scroll arrows

### 2: Tests and parity

Tests and parity

## Acceptance Criteria

- [ ] VERIFY: Scrolling pop-up menus draw the active package's scroll look.

## Files

- `src/SystemFolder/SystemResources/PopUpMenu` - modify

## Work Log
