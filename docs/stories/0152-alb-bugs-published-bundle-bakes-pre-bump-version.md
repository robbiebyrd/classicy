---
id: 0152-alb
title: The published bundle bakes in the version from before the release bump, so About This Computer shows the old version
purpose: A released bundle reports its own version.
type: bugs
status: ready
priority: "1"
effort: S
created: "2026-11-06T16:46:02.551Z"
updated: "2026-11-06T16:46:09.828Z"
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
      - .github/workflows/push.yml
      - src/SystemFolder/Finder/FinderAboutThisComputer.tsx
      - bin/classicyReleaseWorkflow.test.ts
progress:
  "1":
    status: pending
  "2":
    status: pending
---

# The published bundle bakes in the version from before the release bump, so About This Computer shows the old version

## Problem Statement

From 0132-jsg's Fable review (2026-11-06, out of scope there). `src/SystemFolder/Finder/FinderAboutThisComputer.tsx:12` bakes `package.json`'s version into the bundle at build time, and `.github/workflows/push.yml` builds before the Bump step, so the published 3.0.0 bundle's About box would say 2.1.8 (pre-existing for every release).

**Impact:** Every published release shows the previous version in About This Computer.

## Steps

### 1: Failing test

In `bin/classicyReleaseWorkflow.test.ts`: the step that builds the published `dist/` comes after the Bump and Sync steps (or the build reads the bumped version), so the packed bundle's baked version equals the tag.

### 2: Fix the order

Build after the bump and Platinum sync, before the atomic push and publish (keep 0141's one-push-after-tag rule and the step-order test's intent); or inject the version from the tag at build time. Check the About box reads it.

## Acceptance Criteria

- [ ] VERIFY: The release workflow builds the published dist after the version bump, and a test pins it.
- [ ] VERIFY: `pnpm exec vitest run bin/classicyReleaseWorkflow.test.ts` and the full gate are green.

## Files

- `.github/workflows/push.yml` - build after the bump

## Work Log
