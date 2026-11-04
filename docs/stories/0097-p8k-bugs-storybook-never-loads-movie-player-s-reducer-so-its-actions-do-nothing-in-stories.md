---
id: 0097-p8k
title: Storybook never loads Movie Player's reducer, so its actions do nothing in stories
purpose: Make Movie Player behave in Storybook as it does in a host app.
type: bugs
status: in_progress
priority: "3"
effort: S
created: "2026-10-30T21:33:37.126Z"
updated: "2026-11-04T00:32:06.761Z"
started: "2026-11-04T00:30:04.997Z"
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
      - storybook/.storybook/preview.tsx
      - src/SystemFolder/QuickTime/MoviePlayer/MoviePlayerContext.tsx
  plans:
    - ["0013-l9f", "included"]
progress:
  "1":
    status: pending
  "2":
    status: pending
---

# Storybook never loads Movie Player's reducer, so its actions do nothing in stories

## Problem Statement

K 5.1 found that no Storybook module imports `MoviePlayerContext`, the module that registers Movie Player's reducer. Every `ClassicyAppMoviePlayer*` action in any story is therefore dropped, and Movie Player windows never open from actions. The K 5.1 browser check works around it by importing the module itself.

**Impact:** Stories that show Movie Player can't show its real behavior, and checks have to import internals to work.

## Steps

### 1: Confirm

Confirm which app reducers a host gets from `import "classicy"` and which ones Storybook's preview does not get. Check every bundled app, not only Movie Player.

### 2: Fix

Register the missing reducers the way a host does: through the package's side-effect imports or the Storybook preview. Then remove the K 5.1 check's own import.

## Acceptance Criteria

- [ ] Dispatching a `ClassicyAppMoviePlayer*` action in a Storybook story reaches its reducer with no extra import in the story or check.
- [ ] VERIFY: pnpm build:storybook

## Files

- `storybook/.storybook/preview.tsx` - Load the bundled app reducers the way a host does.

## Work Log

### 2026-11-03T23:46:56.202Z - Scheduled by the owner (2026-11-03). Wave 2: starts as soon as Part K lands, because it edits code Part K is landing now (the file system, Finder, Storybook, file drags).

### 2026-11-04T00:32:06.761Z - Wave 2 started in its own worktree from feat/AppearancePackages a02e805cb (Part K landed).
