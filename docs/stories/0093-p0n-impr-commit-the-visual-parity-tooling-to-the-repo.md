---
id: 0093-p0n
title: Commit the visual parity tooling to the repo
purpose: Make pixel-parity checking reproducible for future Appearance Packages and refactors.
type: impr
status: complete
priority: "3"
effort: M
created: "2026-10-30T19:15:27.837Z"
updated: "2026-11-05T00:45:56.579Z"
started: "2026-11-03T23:45:19.259Z"
completed: "2026-11-05T00:45:07.067Z"
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
      - bin/
  plans:
    - ["0002-ldj", "included"]
progress:
  "1":
    status: complete
  "2":
    status: complete
---

# Commit the visual parity tooling to the repo

## Problem Statement

Every part of the program proved pixel parity with scripts that live only in the gitignored `.playwright-mcp/parity/`: `post-b/scripts/capture.cjs`, `part-H/scripts/shoot-app.cjs`, `compare-ae.sh` and `forced.cjs`. The baselines are there too. A fresh clone, CI or a new package author cannot rerun them.

**Impact:** The program's main safety check can't be reproduced, and the scripts can be lost.

## Steps

### 1: Move

Move the capture, app-shot, compare and forced-colors scripts into `bin/parity/`, parameterized by port and output dir, with a README.

### 2: Document

Document how to take a baseline, shoot an after set and compare, including the Chromium flags, in AGENT-REFERENCE.

## Acceptance Criteria

- [x] A fresh clone can shoot all stories and app shots and compare two sets with documented commands.

## Files

- `bin/` - parity scripts

## Work Log

### 2026-11-03T23:46:45.827Z - Scheduled by the owner (2026-11-03: 'Schedule them all for work as soon as possible'). Wave 1: started in its own worktree from feat/AppearancePackages 670daf925.

### 2026-11-05T00:44:45.760Z - Implemented (3146c94bb on fu/0093): bin/parity CLI, pnpm parity scripts and docs (bin/parity/README.md); adds playwright 1.57.0. Found that ImageMagick 6 reports AE 0 on images of different sizes, so the new compare checks sizes; the controller re-checked the recent parity sets: 0 size mismatches.

### 2026-11-05T00:45:03.711Z - Landed in wave 1 (9b9f8d028 on feat/AppearancePackages; wave gate 430 files / 5140 tests). Criterion met: a fresh clone shoots stories and app shots and compares two sets with the documented pnpm parity:* commands (bin/parity/README.md). Complete.

### 2026-11-05T00:45:56.579Z - SHA note: 3146c94bb is the fu/0093 branch SHA; it landed on feat/AppearancePackages as 9b9f8d028 (the last commit of wave 1).
