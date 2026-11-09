---
id: 0167-yj4
title: Release waits up to 45 minutes for npm to list each package
purpose: Keep slow npm listings from skipping the downstream deploys.
type: chor
status: complete
priority: "2"
effort: XS
created: "2026-11-09T23:57:30.318Z"
updated: "2026-11-09T23:57:43.866Z"
started: "2026-11-09T23:57:40.317Z"
completed: "2026-11-09T23:57:43.866Z"
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
---

# Release waits up to 45 minutes for npm to list each package

## Problem Statement

push.yml's 'Wait for the release to appear on npm' polls each package 60 times, 30 s apart (30 minutes). npm listed @classicy/classicy 3.0.0 on attempt 52 and 3.1.0 on attempt 51. Past the limit the step fails: the publish has happened, but the classicy-web deploy and the rt911 bump are not dispatched.

**Impact:** A slightly slower listing would skip both downstream deploys.

## Steps

### 1: Raise the limit

90 polls of 30 s (45 minutes) per package, named once (POLLS, POLL_SECONDS) so the error message follows; tests pin 90 polls, the 45-minute message, and success after 85 polls.

## Acceptance Criteria

- [x] VERIFY: bin/classicyReleaseWorkflow.test.ts passes; it fails with the old 60-poll loop.

## Files

- `.github/workflows/push.yml` - modify
- `bin/classicyReleaseWorkflow.test.ts` - modify

## Work Log
