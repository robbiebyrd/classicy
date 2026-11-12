---
id: 0203-9w6
title: Audio script runs under bash 3.2
purpose: Follow-up from plan 0018-dbd (System 7 Appearance Package).
type: task
status: pending
priority: "4"
effort: S
created: "2026-11-12T14:12:59.945Z"
updated: "2026-11-12T14:12:59.945Z"
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

# Audio script runs under bash 3.2

## Problem Statement

bin/make_audio_sprites.sh now guards empty-array expansion for macOS /bin/bash 3.2 under set -u, but no bash 3.2 was available to run it (plan 0018-dbd task 4.2).

**Impact:** A Mac developer's audio rebuild is untested.

## Steps

### 1: Build bash 3.2 from GNU source into a scratch directory

Build bash 3.2 from GNU source into a scratch directory

### 2: Run the script's loop-list and guarded expansions (and a full System 7 encode into scratch) under it

Run the script's loop-list and guarded expansions (and a full System 7 encode into scratch) under it

## Acceptance Criteria

- [ ] VERIFY: The audio script runs to completion under bash 3.2 for both packages.

## Files

- `bin/make_audio_sprites.sh` - modify

## Work Log
