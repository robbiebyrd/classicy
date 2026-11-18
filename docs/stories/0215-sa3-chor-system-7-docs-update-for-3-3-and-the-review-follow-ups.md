---
id: 0215-sa3
title: 'System 7: docs update for 3.3 and the review follow-ups'
purpose: Follow-up from plan 0018-dbd (System 7 Appearance Package), Phase 6, task 6.17 (the second pass of 5.1's docs).
type: chor
status: complete
priority: "4"
effort: M
created: "2026-11-17T06:31:28.557Z"
updated: "2026-11-17T08:13:33.159Z"
started: "2026-11-17T08:13:29.713Z"
completed: "2026-11-17T08:13:33.159Z"
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
  "3":
    status: pending
  "4":
    status: pending
---

# System 7: docs update for 3.3 and the review follow-ups

## Problem Statement

The System 7 package ships in 3.3.0, but its release notes are still named and versioned 3.2. Review rounds since 5.1 left documentation that no longer matches the code: CLAUDE.md's inlined-mask, sprite-stamp and Vite-consumer sentences; the README's auto-bumper list; the release notes' ScrollArea exports, useSoundTab and slider-figure wording; and undocumented contracts (CLASSICY_CONTRACT_ALERT_SPRITE_IDS, the bevel drawn on .classicyMenuScrollShadow). Batch F-c added behavior that CLAUDE.md does not describe yet, and its last review parked three small code items. Strict-CSP hosts that link both packages' font stylesheets load the five shared faces twice.

## Steps

### 1: Release notes for 3.3

`docs/RELEASE-NOTES-3.2.md` becomes `docs/RELEASE-NOTES-3.3.md`, and every reference to this release says 3.3.0; history stays as it was.

### 2: Docs match the code

CLAUDE.md, the README, AGENT-REFERENCE, the release notes and `bin/multiplier-allowlist.json` reasons state what the code does, including everything Batch F-c added.

### 3: Parked code follow-ups

Icon dimming logs and tests its load-failure path; an undimmed icon image subscribes to nothing; the Platinum hidden-app story's app has a 16 px small image.

### 4: Shared fonts under strict CSP

A strict-CSP host linking both packages' font stylesheets loads each shared face once, or the docs give the specific technical reason it cannot.

## Acceptance Criteria

- [x] [MANUAL] Every listed statement matches the code, the three code follow-ups have tests, the shared-font item is fixed or carries its specific reason, and the full gate passes with Platinum and core parity AE 0 except shots the report names.

## Work Log
