---
id: 0211-4pl
title: 'System 7: package code tidy'
purpose: Follow-up from plan 0018-dbd (System 7 Appearance Package), Phase 6.
type: chor
status: pending
priority: "4"
effort: M
created: "2026-11-12T14:16:08.708Z"
updated: "2026-11-12T14:16:08.708Z"
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

# System 7: package code tidy

## Problem Statement

Remaining System 7 package items from plan 0018-dbd: the windowBox knob family emits --window-box-* inside the core window namespace; the header-height rule ignores an in-window menu bar and the Header story content is not in a scroll area (3.2); the racing stripes anti-alias and the utility dots smear at DPR 1.25/1.5 (3.2, check after 4.1's art); menu-frame-clipped rules are mostly dead, the bar padding borrows --window-control-size, an unused sass:list, a duplicated deepFreeze, a hooks test spy that cannot fire (3.3); windowUtilityTexture bakes the #EEEEEE face instead of following the token (4.1); the Appearance Manager preview hides its image with object-position (3.7); the pop-up-arrow comment in _FlatControls.scss sits above the wrong rule (3.7); warnedMissingIcons is per bundle copy (3.8); inventory test gaps and missing counterparts location.map and security.key (2.1).

**Impact:** Small correctness, naming and test debts in the package.

## Steps

### 1: Fix each item; tests; System 7 references re-checked where pixels change

Fix each item; tests; System 7 references re-checked where pixels change

## Acceptance Criteria

- [ ] VERIFY: Each item is fixed or shown not to apply, with tests.

## Files

- `packages/appearance/system7` - modify

## Work Log
