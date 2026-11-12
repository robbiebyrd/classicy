---
id: 0204-tlq
title: useSoundTab keeps its 3.1 signature
purpose: Follow-up from plan 0018-dbd (System 7 Appearance Package).
type: bugs
status: complete
priority: "2"
effort: S
created: "2026-11-12T14:13:03.129Z"
updated: "2026-11-12T14:59:17.776Z"
started: "2026-11-12T14:13:33.321Z"
completed: "2026-11-12T14:59:17.776Z"
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

# useSoundTab keeps its 3.1 signature

## Problem Statement

Plan 0018-dbd task 1.3 made `useSoundTab` require an `alerts` argument. A host calling the hook as in 3.1 no longer type-checks, a breaking change in the 3.2.0 minor release.

**Impact:** Hosts that call useSoundTab directly fail to build after a minor upgrade.

## Steps

### 1: Make alerts optional, defaulting to the active (or registered default) sound pack's declared alerts

Make alerts optional, defaulting to the active (or registered default) sound pack's declared alerts

### 2: A type test calling it the 3.1 way; update the release notes and AGENT-REFERENCE

A type test calling it the 3.1 way; update the release notes and AGENT-REFERENCE

## Acceptance Criteria

- [x] VERIFY: A 3.1-style useSoundTab call type-checks and lists the active pack's alerts.

## Files

- `src/SystemFolder/ControlPanels/AppearanceManager` - modify

## Work Log
