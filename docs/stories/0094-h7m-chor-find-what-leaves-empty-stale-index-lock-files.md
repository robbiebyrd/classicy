---
id: 0094-h7m
title: Find what leaves empty stale index.lock files
purpose: Stop git operations failing on empty mode-600 index.lock files that no process holds.
type: chor
status: complete
priority: "3"
effort: S
created: "2026-10-30T19:15:31.242Z"
updated: "2026-11-05T00:45:36.567Z"
started: "2026-11-03T23:45:27.468Z"
completed: "2026-11-05T00:45:19.414Z"
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
      - .git/index.lock
progress:
  "1":
    status: complete
  "2":
    status: complete
---

# Find what leaves empty stale index.lock files

## Problem Statement

Empty, mode-600 `index.lock` files keep appearing in the main checkout and in agent worktrees (`.git/worktrees/<name>/index.lock`), with no git process holding them. Each one blocks commits until it is checked and removed by hand.

**Impact:** Lost time, and the risk that someone deletes a live lock.

## Steps

### 1: Trace

Find the writer: an editor or IDE git integration, a hook, a watcher, or an interrupted git command, using file-creation timestamps and process audit.

### 2: Fix

Stop the source, or document a safe cleanup.

## Acceptance Criteria

- [x] The source is identified and either removed or documented with a safe cleanup procedure.

## Files

- `.git/index.lock` - symptom

## Work Log

### 2026-11-03T23:46:48.149Z - Scheduled by the owner (2026-11-03: 'Schedule them all for work as soon as possible'). Wave 1: started in its own worktree from feat/AppearancePackages 670daf925.

### 2026-11-04T00:18:02.462Z - Root cause found: the clued plugin's hook relay runs git status under a 2 s exec.CommandContext timeout and SIGKILLs it on expiry, leaving an empty lock (mode 600 from the relay's umask 077). The relay log's timeouts match 7 of 8 sightings, and it was reproduced in a scratch repo. The fix belongs in clued (--no-optional-locks / GIT_OPTIONAL_LOCKS=0, SIGTERM before SIGKILL). Committed: bin/git-clear-stale-lock.sh with six guards and 13 tests (c748b7808 on fu/0094). Accepted; lands after Part K.

### 2026-11-05T00:45:16.049Z - Landed in wave 1 (9b9f8d028; wave gate 430 files / 5140 tests): c748b7808 adds bin/git-clear-stale-lock.sh (+ bin/gitClearStaleLock.test.ts) and the CLAUDE.md Build Notes entry. Criterion met: the source (the clued hook relay's git status, SIGKILLed by its 2 s timeout) is identified and a safe cleanup procedure is documented and committed. Complete.

### 2026-11-05T00:45:36.567Z - Correction to the previous entry: c748b7808 is the fu/0094 branch SHA; the commit landed on feat/AppearancePackages as e78e362b8 (wave 1, 9b9f8d028).
