---
id: 0119-o08
title: git-clear-stale-lock.sh prints /proc read errors for other users' git processes
purpose: Keep the stale-lock script's stderr clean (and its test deterministic) on a shared machine.
type: bugs
status: in_progress
priority: "2"
effort: S
created: "2026-11-05T19:12:46.972Z"
updated: "2026-11-05T19:13:48.413Z"
started: "2026-11-05T19:13:48.413Z"
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
      - bin/git-clear-stale-lock.sh
      - bin/gitClearStaleLock.test.ts
progress:
  "1":
    status: pending
  "2":
    status: pending
  "3":
    status: pending
---

# git-clear-stale-lock.sh prints /proc read errors for other users' git processes

## Problem Statement

Guard 5 of `bin/git-clear-stale-lock.sh` (line 128) reads each running git process's environment with `tr '\0' '\n' <"$proc/environ" 2>/dev/null`. Bash applies redirections left to right, so when the input redirect fails, the shell reports the error before `2>/dev/null` takes effect. That happens with `Permission denied` for a process owned by another user, or `No such file or directory` when the process exits between the `comm` scan and the read. The script then writes to stderr although nothing is wrong.

On 2026-11-05 this failed `bin/gitClearStaleLock.test.ts` > "ignores a git process running in another repository" during 0117-qjd's full gate (`/proc/2635091/environ: Permission denied`, from another session's git process). The test correctly asserts empty stderr. The file passed on rerun because no foreign git process was running.

**Impact:** The full gate fails intermittently on any shared machine, and the CLAUDE.md golden rule makes such a failure a blocker. The script's documented quiet success turns noisy whenever another user runs git.

## Steps

### 1: Failing test first

Make the race reproducible: a test that gives the script a git process whose `/proc/<pid>/environ` cannot be read, for example a process that exits between the scan and the read via a script-level hook or an injectable proc root, or another deterministic mechanism the script can support without weakening the guard. Assert empty stderr and the correct exit code. It must fail against the current script.

### 2: Fix the redirect

Suppress the failed open itself, for example `env_git_dir=$({ tr '\0' '\n' <"$proc/environ"; } 2>/dev/null | sed -n 's/^GIT_DIR=//p' | head -n 1)`, and check the script's other `/proc` reads (lines 114 and 123) for the same pattern. An unreadable environ must keep the guard's current meaning (state which: the process counts as in this repo when its cwd matches, as today).

### 3: Gate

Run `bin/gitClearStaleLock.test.ts` 20 times in a loop while another user's git process exists, if one can be arranged, else with the step 1 mechanism, then the full gate.

## Acceptance Criteria

- [ ] VERIFY: The new test fails on the old script and passes on the fixed one.
- [ ] VERIFY: `for i in $(seq 20); do pnpm exec vitest run bin/gitClearStaleLock.test.ts || exit 1; done` passes, and the full gate is green.
- [ ] VERIFY: `bin/git-clear-stale-lock.sh` still refuses (exit 2) when a git process runs in the checkout's own git dir.

## Files

- `bin/git-clear-stale-lock.sh` - suppress failed /proc opens without changing the guards
- `bin/gitClearStaleLock.test.ts` - a deterministic test for an unreadable or vanished environ

## Work Log
