---
id: 0209-2zg
title: 'Repo gate: base-look pinning parser'
purpose: Follow-up from plan 0018-dbd (System 7 Appearance Package), Phase 6.
type: bugs
status: pending
priority: "5"
effort: XS
created: "2026-11-12T14:16:02.093Z"
updated: "2026-11-12T14:16:02.093Z"
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

# Repo gate: base-look pinning parser

## Problem Statement

From plan 0018-dbd task 1.6: ClassicyBaseHoldsNoControlLook.repo.test.ts treats an unprefixed pseudo-selector line as a property (false positive), and a ';' inside url(data:) splits a declaration.

**Impact:** The gate can misread valid SCSS.

## Steps

### 1: Parse selectors and data URLs correctly; add cases

Parse selectors and data URLs correctly; add cases

## Acceptance Criteria

- [ ] VERIFY: The parser handles both cases, with tests.

## Files

- `src/Appearance` - modify

## Work Log
