---
id: 0085-c3x
title: CI builds the example app
purpose: Run the example app's production build in CI so a broken consumer import (such as the Platinum SCSS export path) fails the pull request instead of a later manual build.
type: chor
status: in_progress
priority: "3"
effort: XS
created: "2026-10-29T21:26:50.186Z"
updated: "2026-11-04T00:31:59.223Z"
started: "2026-11-03T23:45:10.507Z"
tags: []
milestone: ""
due_date: ""
planned_start: ""
planned_end: ""
order: 0
links:
  repo:
    local: ~/classicy
  stories:
    - ["0040-gok", "depends"]
  plans:
    - ["0005-1b3", "included"]
progress:
  "1":
    status: pending
  "2":
    status: pending
---

# CI builds the example app

## Problem Statement

B 5.1's review (0040-gok, minor 3) found that the example app consumes `classicy/appearance/platinum/scss/mixins` through Vite's Sass resolver, but CI (`.github/workflows/ci.yml`) runs only `pnpm lint`, `pnpm exec tsc --noEmit -p .` and `pnpm test`. The example's production build (`tsc -b` + `vite build`) is never run in CI, which is how its HyperCardPluginsDemo type errors (fixed in 2913f74bb) went unnoticed on main.

**Impact:** A broken export path or a consumer-facing type error ships without any failing check.

## Steps

### 1: Add the example build to CI

Add `pnpm build:source && pnpm --filter classicy-example build` as a CI step after the tests (cache-friendly order), and note it in CLAUDE.md's CI paragraph.

### 2: Prove it

Push a branch where the example's import path is broken on purpose and see CI fail, then revert.

## Acceptance Criteria

- [ ] VERIFY: grep -q "classicy-example build" .github/workflows/ci.yml
- [ ] CI fails on a pull request whose example app does not build, and passes once it builds.

## Work Log

### 2026-10-29T21:26:50.186Z - Created from B 5.1's review (minor 3); deliberately not done inside 5.1 because it changes CI.

### 2026-11-03T23:46:43.460Z - Scheduled by the owner (2026-11-03: 'Schedule them all for work as soon as possible'). Wave 1: started in its own worktree from feat/AppearancePackages 670daf925.

### 2026-11-04T00:31:59.223Z - Implemented on fu/ci (521d01a3a, b613a1a53, 90912b4ff): runners pinned to ubuntu-26.04, the image ubuntu-latest has resolved to since 2026-10-27 (all green; pinning 24.04 would regress ffmpeg 8.0.1 to 6.1.1); the example-app build step is added and fails on a deliberate type error. The CI checks can only be verified on the PR after landing.
