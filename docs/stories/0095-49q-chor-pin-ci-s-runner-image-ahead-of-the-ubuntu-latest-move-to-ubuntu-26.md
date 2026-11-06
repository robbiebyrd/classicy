---
id: 0095-49q
title: Pin CI's runner image ahead of the ubuntu-latest move to Ubuntu 26
purpose: Keep CI reproducible when GitHub moves ubuntu-latest to Ubuntu 26.
type: chor
status: complete
priority: "3"
effort: XS
created: "2026-10-30T19:15:34.073Z"
updated: "2026-11-05T00:46:09.810Z"
started: "2026-11-03T23:45:02.183Z"
completed: "2026-11-05T00:46:09.810Z"
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
      - .github/workflows/ci.yml
      - .github/workflows/push.yml
      - .github/workflows/pages.yml
      - .github/workflows/pr-preview.yml
progress:
  "1":
    status: complete
  "2":
    status: complete
---

# Pin CI's runner image ahead of the ubuntu-latest move to Ubuntu 26

## Problem Statement

GitHub annotates runs: "The ubuntu-latest label will migrate to Ubuntu 26 beginning October 19, 2026." All four workflows use `runs-on: ubuntu-latest`. CI deliberately uses the distro ffmpeg package (CLAUDE.md), whose version changes with the image.

**Impact:** Builds can change under us with no commit, including audio sprite generation.

## Steps

### 1: Pin or verify

Pin `ubuntu-24.04` or move to Ubuntu 26 deliberately: run CI, build:audio and the Pages deploy on the new image, then switch.

### 2: Document

Record the choice in the workflow comments.

## Acceptance Criteria

- [x] Every workflow names an explicit runner image, and CI is green on it.

## Files

- `.github/workflows/ci.yml` - runs-on
- `.github/workflows/push.yml` - runs-on
- `.github/workflows/pages.yml` - runs-on
- `.github/workflows/pr-preview.yml` - runs-on

## Work Log

### 2026-11-03T23:46:41.123Z - Scheduled by the owner (2026-11-03: 'Schedule them all for work as soon as possible'). Wave 1: started in its own worktree from feat/AppearancePackages 670daf925.

### 2026-11-04T00:31:56.650Z - Implemented on fu/ci (521d01a3a, b613a1a53, 90912b4ff): runners pinned to ubuntu-26.04, the image ubuntu-latest has resolved to since 2026-10-27 (all green; pinning 24.04 would regress ffmpeg 8.0.1 to 6.1.1); the example-app build step is added and fails on a deliberate type error. The CI checks can only be verified on the PR after landing.

### 2026-11-05T00:46:06.739Z - Landed in wave 1 as a2256f006 (pin every workflow to ubuntu-26.04) and d37b8b883 (CLAUDE.md note); wave tip 9b9f8d028, gate 430 files / 5140 tests. PR 333 CI at 06380274b: 'Lint, type check and test', 'preview' and the CodeQL analyses pass. The CodeQL gate's 2 new js/incomplete-sanitization alerts in bin tests were fixed in 98d5aedc6 (pushed). Criterion met; complete.
