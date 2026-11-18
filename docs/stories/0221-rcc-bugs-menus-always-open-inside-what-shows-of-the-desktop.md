---
id: 0221-rcc
title: Menus always open inside what shows of the desktop
purpose: 'Owner report on PR #343 (2026-11-17): System 7''s Help menu opened off the screen''s right edge; menus should appear so that they show.'
type: bugs
status: complete
priority: "2"
effort: M
created: "2026-11-18T01:43:03.673Z"
updated: "2026-11-18T01:43:43.144Z"
started: "2026-11-18T01:43:40.177Z"
completed: "2026-11-18T01:43:43.144Z"
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

# Menus always open inside what shows of the desktop

## Problem Statement

System 7's Help title sits at the menu bar's right end, and every pull-down hung from its title's left edge, so the Help menu ran off the screen. Nested and contextual menus were measured against the browser window only, and vertical placement ignored an embedded desktop's bounds.

## Steps

### 1: Menu-bar pull-downs

A pull-down that would pass the right edge hangs with its right side under its title's right side, as System 7.5's Menu Manager does; one still too wide is pinned inside.

### 2: Every menu, both axes

Submenus, contextual menus, pop-up, combo and bevel menus stay inside the desktop's box intersected with the viewport, across and down; the scroll floor is documented.

## Acceptance Criteria

- [x] [MANUAL] The System 7 Help menu matches the 7.5 reference's position, a browser check finds every menu inside the bounds at full size and in embedded desktops down to 80 px tall, Platinum and core parity stay AE 0, and the full gate passes.

## Work Log
