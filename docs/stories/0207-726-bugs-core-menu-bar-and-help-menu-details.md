---
id: 0207-726
title: 'Core: menu bar and Help menu details'
purpose: Follow-up from plan 0018-dbd (System 7 Appearance Package), Phase 6.
type: bugs
status: pending
priority: "4"
effort: S
created: "2026-11-12T14:15:55.574Z"
updated: "2026-11-12T14:15:55.574Z"
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
---

# Core: menu bar and Help menu details

## Problem Statement

From plan 0018-dbd tasks 1.4 and 3.3: the Help menu item's analytics title is undefined when it shows art (fall back to imageAlt); the Apple menu image has no alt (imageAlt "Apple"); the help-art test's resetClassicyAssets clears the core icon tree; the menuBar.bandHeight knob accepts a negative band (guard >= 0).

**Impact:** Analytics and accessibility gaps in the menu bar.

## Steps

### 1: Fix each item with a test

Fix each item with a test

## Acceptance Criteria

- [ ] VERIFY: Help analytics carry a title, the Apple menu image has alt text, the test restores the core tree, and a negative band falls back.

## Files

- `src/SystemFolder/SystemResources/Desktop/MenuBar` - modify

## Work Log
