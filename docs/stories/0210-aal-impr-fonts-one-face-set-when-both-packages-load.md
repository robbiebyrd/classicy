---
id: 0210-aal
title: 'Fonts: one face set when both packages load'
purpose: Follow-up from plan 0018-dbd (System 7 Appearance Package), Phase 6.
type: impr
status: pending
priority: "4"
effort: S
created: "2026-11-12T14:16:05.500Z"
updated: "2026-11-12T14:16:05.500Z"
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
  "3":
    status: pending
---

# Fonts: one face set when both packages load

## Problem Statement

From plan 0018-dbd task 2.2: System 7 reuses Platinum's vector faces, so a host loading both packages injects the same @font-face rules twice; --ui-font-size-small derives 9.6 px from uiSize 12 under System 7 (Geneva 9 is the System 7 small size); System 7's tsconfig excludes a resources folder it lacks and its vite config carries Platinum's assetsInclude entries.

**Impact:** Duplicate font downloads and a fractional small size.

## Steps

### 1: Share font face registration by family and file so a second package with the same faces adds none

Share font face registration by family and file so a second package with the same faces adds none

### 2: Give System 7 a small UI size of 9 through its theme data

Give System 7 a small UI size of 9 through its theme data

### 3: Remove the carry-over config

Remove the carry-over config

## Acceptance Criteria

- [ ] VERIFY: Both packages loaded inject each face once; System 7's small size is 9 px; config clean; Platinum parity AE 0.

## Files

- `src/Appearance` - modify
- `packages/appearance/system7` - modify

## Work Log
