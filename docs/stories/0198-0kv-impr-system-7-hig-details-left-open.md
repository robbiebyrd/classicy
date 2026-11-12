---
id: 0198-0kv
title: 'System 7: HIG details left open'
purpose: Follow-up from plan 0018-dbd (System 7 Appearance Package).
type: impr
status: pending
priority: "5"
effort: S
created: "2026-11-12T14:12:43.661Z"
updated: "2026-11-12T14:12:43.661Z"
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

# System 7: HIG details left open

## Problem Statement

Small HIG differences left open in plan 0018-dbd: the core centers alerts on half pixels (crisp in Chrome); Don't Save is not placed at the left (HIG p.201); the slider's far-end checker phase depends on its length, its ticks are not on the channel edge, and a vertical thumb stops 6 px from the ends instead of 5; a dimmed checked checkbox loses one diagonal of its X; the menu blink count is two off phases in 250 ms (System 7 default 3).

**Impact:** Pixel-level differences from System 7.5.

## Steps

### 1: Triage each item; fix where it needs no Platinum pixel change, record the rest

Triage each item; fix where it needs no Platinum pixel change, record the rest

## Acceptance Criteria

- [ ] VERIFY: Each item is fixed or recorded as accepted.

## Files

- `packages/appearance/system7` - modify

## Work Log
