---
id: 0094-h7m
title: Find what leaves empty stale index.lock files
purpose: Stop git operations failing on empty mode-600 index.lock files that no process holds.
type: chor
status: pending
priority: "3"
effort: S
created: "2026-10-30T19:15:31.242Z"
updated: "2026-10-30T19:15:31.242Z"
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
    status: pending
  "2":
    status: pending
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

- [ ] The source is identified and either removed or documented with a safe cleanup procedure.

## Files

- `.git/index.lock` - symptom

## Work Log
