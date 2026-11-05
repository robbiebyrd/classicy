---
id: 0109-2eg
title: Mid-animation parity shots for animated stories
purpose: Catch regressions in animations that parity shots froze at t=0.
type: chor
status: complete
priority: "3"
effort: M
created: "2026-11-05T01:00:10.338Z"
updated: "2026-11-05T01:04:10.397Z"
started: "2026-11-05T01:00:17.649Z"
completed: "2026-11-05T01:00:34.076Z"
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
      - bin/parity/parityMidTime.ts
      - bin/parity/README.md
  stories:
    - ["0082-lgo", "included"]
    - ["0083-v8n", "blocks"]
  plans:
    - ["0002-ldj", "included"]
progress:
  "1":
    status: complete
  "2":
    status: complete
---

# Mid-animation parity shots for animated stories

## Problem Statement

0082-lgo item (h), moved to V&V 0083-v8n: the parity procedure froze every animation at t=0, so an animated story's mid-animation frames were never compared.

**Impact:** Visual regressions inside animations ship unseen.

## Steps

### 1: Implement

Add `parity:shoot --mid` (auto-selects stories with running animations, plus a --mid-stories list; --at 50% default; page.clock date shift), a retake guard for unfrozen shots, and docs.

### 2: Land

Gate on the landing tree, land on feat/AppearancePackages and push.

## Acceptance Criteria

- [x] parity:shoot --mid takes one mid-animation shot per animated story, deterministic across runs, and documents its limits.
- [x] VERIFY: pnpm test --maxWorkers=3

## Files

- `bin/parity/parityMidTime.ts`
- `bin/parity/README.md`

## Work Log

### 2026-11-05T01:00:19.791Z - Dispatched 2026-11-04 ~18:00 UTC on fu/parity-midtime from 40934effc. One pre-fix 12px flake (clock separator unfrozen under load) led to the retake guard. Filed after the fact because the tracker was offline (MongoDB outage).

### 2026-11-05T01:00:30.955Z - Landed b945f78fd..793f3af80, pushed (50f3ebdf4, 91ada3c5e, 7f25c40a6, 793f3af80; bin/parity and docs only). Land gate passed (agent gate 452 / 5968). 97/344 stories auto-selected; determinism 97/97 AE 0 twice after the fix; regression proof t=0 344/344 AE 0 vs @mid 91 differ. Limits: fish saver at 50%, startup screens via the list only, barber pole not in getAnimations, rAF/canvas not covered. Satisfies V&V 0083-v8n's 0082-lgo (h). Complete.
