---
id: 0105-1wm
title: Heal out-of-range font sizes already persisted, in migrateClassicyState
purpose: Bring font sizes saved before the 8-72 bound back into range on load.
type: bugs
status: complete
priority: "3"
effort: XS
created: "2026-11-05T00:58:24.938Z"
updated: "2026-11-05T01:03:59.835Z"
started: "2026-11-05T00:58:32.946Z"
completed: "2026-11-05T00:58:50.107Z"
tags: []
milestone: ""
due_date: ""
planned_start: ""
planned_end: ""
order: 0
links:
  repo:
    local: ~/classicy
    files:
      - src/SystemFolder/ControlPanels/AppManager/ClassicyStateMigrations.ts
  stories:
    - ["0099-rlc", "depends"]
  plans:
    - ["0011-v9t", "included"]
    - ["0002-ldj", "included"]
progress:
  "1":
    status: complete
  "2":
    status: complete
---

# Heal out-of-range font sizes already persisted, in migrateClassicyState

## Problem Statement

0099-rlc and the key-name bound refuse new out-of-range font sizes, but state persisted before them can still hold sizes outside 8-72 (UI fonts and package `*FontSize` knobs), which load unchanged.

**Impact:** A desktop saved with a broken font size stays broken after upgrading.

## Steps

### 1: Implement

Clamp persisted out-of-range font sizes into 8-72 in migrateClassicyState (shape-detecting and idempotent, like the other migrations), with tests.

### 2: Land

Gate on the landing tree, land on feat/AppearancePackages and push.

## Acceptance Criteria

- [x] A persisted theme whose font sizes are outside 8-72 loads with each one clamped into range, and the migration is idempotent.
- [x] VERIFY: pnpm test --maxWorkers=3

## Files

- `src/SystemFolder/ControlPanels/AppManager/ClassicyStateMigrations.ts`

## Work Log

### 2026-11-05T00:58:35.179Z - Follow-up candidate from 0099-rlc, paired with the key-name bound; implemented on fu/font-bounds. Filed after the fact because the tracker was offline (MongoDB outage).

### 2026-11-05T00:58:46.916Z - Landed as fa963316a in 726d344db..40934effc, pushed. Gate on 40934effc: 451 files / 5942 tests, all builds. Complete.
