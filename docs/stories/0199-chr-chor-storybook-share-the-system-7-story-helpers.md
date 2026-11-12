---
id: 0199-chr
title: 'Storybook: share the System 7 story helpers'
purpose: Follow-up from plan 0018-dbd (System 7 Appearance Package).
type: chor
status: pending
priority: "5"
effort: S
created: "2026-11-12T14:12:47.028Z"
updated: "2026-11-12T14:12:47.028Z"
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

# Storybook: share the System 7 story helpers

## Problem Statement

WithTheme/inColor are copied into five System 7 story files (plan 0018-dbd task 3.4).

**Impact:** Story helpers drift.

## Steps

### 1: Move them into @sb/system7 (storybook/.storybook/system7.ts) and import them

Move them into @sb/system7 (storybook/.storybook/system7.ts) and import them

## Acceptance Criteria

- [ ] VERIFY: One definition, used by every System 7 story file.

## Files

- `packages/appearance/system7/src` - modify
- `storybook/.storybook/system7.ts` - modify

## Work Log
