---
id: 0193-801
title: 'Core: derived folders and Control Strip module icons follow the active package'
purpose: Follow-up from plan 0018-dbd (System 7 Appearance Package).
type: bugs
status: pending
priority: "3"
effort: M
created: "2026-11-12T14:12:27.378Z"
updated: "2026-11-12T14:12:27.378Z"
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

# Core: derived folders and Control Strip module icons follow the active package

## Problem Statement

The derived Applications, Extensions and Control Strip Modules folders, and Control Strip modules' fileIcon, capture core icon images instead of resolving them through the asset registry at render, so they show the core art under System 7 (plan 0018-dbd tasks 2.1, 4.1). Finder's drive icon on the desktop shows the core image too (task 3.7).

**Impact:** System 7 hosts see Platinum-era icons in Finder folders, the Control Strip Modules folder and on the desktop drive icon.

## Steps

### 1: Resolve these icons at render (useClassicyAsset) or rebuild the derived entries keyed on package and asset variant

Resolve these icons at render (useClassicyAsset) or rebuild the derived entries keyed on package and asset variant

### 2: Tests under System 7 and Platinum; parity

Tests under System 7 and Platinum; parity

## Acceptance Criteria

- [ ] VERIFY: Under System 7, the derived folders, module file icons and the desktop drive icon show System 7's icons.

## Files

- `src/SystemFolder/SystemResources/File` - modify
- `src/SystemFolder/Finder` - modify

## Work Log
