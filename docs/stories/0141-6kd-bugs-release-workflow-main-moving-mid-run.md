---
id: 0141-6kd
title: 'Release workflow: main moving mid-run publishes an old build, and the codename push has no retry'
purpose: Make a release that races another push to main either rebuild or stop cleanly.
type: bugs
status: in_progress
priority: "3"
effort: S
created: "2026-11-05T21:39:09.677Z"
updated: "2026-11-06T02:19:19.656Z"
started: "2026-11-06T02:19:19.656Z"
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
      - bin/classicyReleaseWorkflow.test.ts
progress:
  "1":
    status: pending
  "2":
    status: pending
---

# Release workflow: main moving mid-run publishes an old build, and the codename push has no retry

## Problem Statement

From 0134-8cy's re-review (2026-11-05, below the reporting bar). (1) When the version push needs `git pull --rebase` because main moved, the tag and HEAD include the newer upstream commits but `dist/` was built from the pre-rebase tree, so the published tarball pairs an old build with a newer tree. (2) The codename step's plain `git push` (pre-existing) has no retry: if main moves after the tag, it is rejected, the job fails after the tag is pushed, and publish never runs (a re-run then bumps again).

**Impact:** Rare (releases are serialized with `cancel-in-progress: false`, and only a push during the roughly 10-minute run triggers it), but a wrong or missing publish is costly.

## Steps

### 1: Failing tests

In `bin/classicyReleaseWorkflow.test.ts`: assert that a rebase in the push step is followed by a rebuild (or that the step fails instead of rebasing), and that the codename push retries with the same bounded rebase loop or folds the codename into the version commit before the tag.

### 2: Fix

Prefer folding the codename into the version/sync commit before the push and tag (one push, nothing after the tag), and rebuild after a rebase (or fail and let a re-run start clean). Keep the step order the tests pin.

## Acceptance Criteria

- [ ] VERIFY: `pnpm exec vitest run bin/classicyReleaseWorkflow.test.ts` passes with the new assertions, and they fail on the current workflow.
- [ ] VERIFY: No push happens after the tag is created.

## Files

- `.github/workflows/push.yml` - codename before the tag; rebuild or fail after a rebase

## Work Log
