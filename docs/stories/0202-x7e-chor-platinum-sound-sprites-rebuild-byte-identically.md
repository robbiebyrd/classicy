---
id: 0202-x7e
title: 'Platinum: sound sprites rebuild byte-identically'
purpose: Follow-up from plan 0018-dbd (System 7 Appearance Package).
type: chor
status: pending
priority: "4"
effort: S
created: "2026-11-12T14:12:56.587Z"
updated: "2026-11-12T14:12:56.587Z"
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

# Platinum: sound sprites rebuild byte-identically

## Problem Statement

Platinum's committed ogg, m4a and mp3 sprites predate the bit-exact ffmpeg shim, so a forced re-encode (CLASSICY_AUDIO_FORCE=1) writes different bytes under ffmpeg 8.0.1 or 6.0 (plan 0018-dbd task 4.2). The stamp keeps the build from re-encoding, but the committed files are not reproducible.

**Impact:** A forced Platinum audio rebuild rewrites three committed files.

## Steps

### 1: Re-encode Platinum's sprites bit-exact with the pinned ffmpeg, check the sprite JSON and audio durations are unchanged, 

Re-encode Platinum's sprites bit-exact with the pinned ffmpeg, check the sprite JSON and audio durations are unchanged, commit them with their stamp

### 2: Confirm a second forced re-encode is byte-identical

Confirm a second forced re-encode is byte-identical

## Acceptance Criteria

- [ ] VERIFY: A forced Platinum audio rebuild reproduces every committed sprite file byte for byte.

## Files

- `packages/appearance/platinum/src/assets/sounds` - modify

## Work Log
