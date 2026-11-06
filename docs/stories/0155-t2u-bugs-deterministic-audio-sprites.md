---
id: 0155-t2u
title: pnpm build rewrites the Platinum audio sprites with new bytes every time
purpose: Unchanged sounds keep the same sprite files, so deploys keep cache hits and release diffs stay clean.
type: bugs
status: in_progress
priority: "3"
effort: S
created: "2026-11-06T19:19:01.014Z"
updated: "2026-11-06T19:56:24.268Z"
started: "2026-11-06T19:56:24.268Z"
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
      - bin/make_audio_sprites.sh
      - package.json
progress:
  "1":
    status: pending
  "2":
    status: pending
---

# pnpm build rewrites the Platinum audio sprites with new bytes every time

## Problem Statement

From 4.3 (0136, 2026-11-06). Each `pnpm build` (which runs `build:audio`) writes new bytes to `platinum.ogg` and `platinum.mp3` even when no source mp3 changed (ffmpeg/audiosprite embed timestamps or encoder metadata). Every deploy then ships a new hashed sprite URL, defeating caching, and the release job's build produces a sprite diff with no sound change.

**Impact:** Wasted bandwidth and cache misses on every deploy; noisy diffs.

## Steps

### 1: Failing check

Run `pnpm build:audio` twice on the same sources and compare the outputs byte for byte; it differs today.

### 2: Make it deterministic

Strip the varying metadata (ffmpeg `-fflags +bitexact`, `-map_metadata -1`, fixed encoder tags, or audiosprite options), or skip regenerating when the source mp3s and the script are unchanged (a content hash). Keep CI's distro ffmpeg working.

## Acceptance Criteria

- [ ] VERIFY: Two `pnpm build:audio` runs on unchanged sources produce byte-identical sprites, pinned by a test that stubs or runs the encoder.
- [ ] VERIFY: Full gate green.

## Files

- `bin/make_audio_sprites.sh` - deterministic output

## Work Log
