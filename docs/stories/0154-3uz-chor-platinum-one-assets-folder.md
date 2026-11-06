---
id: 0154-3uz
title: 'Platinum package: consolidate assets/ into src/assets/'
purpose: One assets folder in the Platinum package, so its layout is obvious.
type: chor
status: in_progress
priority: "2"
effort: S
created: "2026-11-06T19:14:33.873Z"
updated: "2026-11-06T19:14:41.737Z"
started: "2026-11-06T19:14:41.737Z"
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
      - packages/appearance/platinum/assets
      - packages/appearance/platinum/src/assets
      - bin/make_audio_sprites.sh
      - package.json
      - CLAUDE.md
      - docs/AGENT-REFERENCE.md
progress:
  "1":
    status: pending
  "2":
    status: pending
---

# Platinum package: consolidate assets/ into src/assets/

## Problem Statement

Owner request (2026-11-06). 3.3 (0131) moved Platinum's sound sprites and sources, wallpapers, five system-art PNGs and the cursors into `packages/appearance/platinum/assets/` (188 files: art 6, cursors 8, sounds 2 entries, wallpapers 49), beside the existing `packages/appearance/platinum/src/assets/` (code, art, fonts, pixel art, sounds code). Two folders named assets in one package is confusing (CLAUDE.md needs a sentence to explain them). No file name collides between them.

**Impact:** Contributors look in the wrong folder; docs carry an explanation that should not be needed.

## Steps

### 1: Move

`git mv` every file under `packages/appearance/platinum/assets/` to the same relative path under `packages/appearance/platinum/src/assets/` (renames, R100), then remove the empty folder.

### 2: Follow the move

Update every reference: the Platinum asset modules and their globs (platinumAssets.ts, platinumWallpapers.ts, sounds/platinum.ts), `bin/make_audio_sprites.sh`'s default and the build:watchaudio/build:watchsource paths in package.json, the Platinum tsconfig, every test that names the old path, and CLAUDE.md / AGENT-REFERENCE / README / release notes (drop the two-folders explanation). Add a test that `packages/appearance/platinum/assets/` does not exist and that every Platinum asset lives under `src/assets/`.

## Acceptance Criteria

- [ ] VERIFY: No `packages/appearance/platinum/assets/` folder; Platinum's dist, verify:dist and packed file list are unchanged except for nothing (same emitted file names and bytes).
- [ ] VERIFY: Full gate green and a parity round AE 0 against platinum-split/before.

## Files

- `packages/appearance/platinum/src/assets` - receives the 188 files

## Work Log
