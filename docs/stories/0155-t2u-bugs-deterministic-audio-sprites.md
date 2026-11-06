---
id: 0155-t2u
title: pnpm build rewrites the Platinum audio sprites with new bytes every time
purpose: Unchanged sounds keep the same sprite files, so deploys keep cache hits and release diffs stay clean.
type: bugs
status: complete
priority: "3"
effort: S
created: "2026-11-06T19:19:01.014Z"
updated: "2026-11-06T20:49:16.733Z"
started: "2026-11-06T19:56:24.268Z"
completed: "2026-11-06T20:49:16.733Z"
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

- [x] VERIFY: Two `pnpm build:audio` runs on unchanged sources produce byte-identical sprites, pinned by a test that stubs or runs the encoder.
- [x] VERIFY: Full gate green.

## Files

- `bin/make_audio_sprites.sh` - deterministic output

## Work Log

### 2026-11-06T20:49:08.324Z - Landed at 7bdac63e9 (c30d0f3ee, 3ee07ba69 rebased onto 74bb87791, clean). Cause: ffmpeg's random Ogg stream serial in platinum.ogg (mp3/m4a/ac3/json were already stable). Fix: an ffmpeg shim adds -fflags +bitexact -map_metadata -1 to audiosprite's encode, and platinum.sprites.sha256 (sources + script + audiosprite version; ffmpeg version deliberately excluded) skips the encode when unchanged. audiosprite pinned at 0.7.2 as a devDependency (no npx, no network). Committed sprites unchanged; two real pnpm build runs leave no modified sprite. Gate 495 / 7212. Controller: after the rebase, frozen install OK (libc: 63), makeAudioSprites + PackageExports 50/50, build:audio 'up to date' with a clean tree, biome clean. Note: anyone changing a source mp3 or the script must commit the sprites and stamp together; the one-off re-encode the implementer saw was traced to a stubbed test pointing AUDIOSPRITE_BIN elsewhere (empty audiosprite version in the hash), fixed in 3ee07ba69.
