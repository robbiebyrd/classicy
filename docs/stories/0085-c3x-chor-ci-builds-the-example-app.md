---
id: 0085-c3x
title: 'CI builds the example app'
purpose: Run the example app's production build in CI so a broken consumer import (such as the Platinum SCSS export path) fails the pull request instead of a later manual build.
type: chor
status: pending
priority: "3"
effort: XS
created: "2026-10-29T21:26:50.186Z"
updated: "2026-10-29T21:26:50.186Z"
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
