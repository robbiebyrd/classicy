---
id: 0092-prv
title: Clear the 37 transitive Dependabot alerts
purpose: Close the open Dependabot alerts, whether or not Dependabot opens the PR itself.
type: chor
status: complete
priority: "1"
effort: M
created: "2026-10-30T19:15:24.764Z"
updated: "2026-11-07T01:00:28.426Z"
started: "2026-11-07T01:00:20.542Z"
completed: "2026-11-07T01:00:28.426Z"
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
      - pnpm-lock.yaml
      - package.json
      - .github/dependabot.yml
progress:
  "1":
    status: pending
  "2":
    status: complete
  "3":
    status: complete
---

# Clear the 37 transitive Dependabot alerts

## Problem Statement

37 Dependabot alerts are open, all transitive in pnpm-lock.yaml: undici (11), fast-uri (9), svgo (4), brace-expansion (3), sharp (2), @vitest/mocker (2), shell-quote (critical), js-yaml, browserslist, baseline-browser-mapping, source-map-js and deepmerge (no patched version yet). Dependabot has opened no PR since 2026-10-28: its security job keeps deferring to the merged #331, which it still records as the open npm_and_yarn group PR. The new dependabot.yml (eb3a9a293) adds a named npm-security group, but it only takes effect from main.

**Impact:** Known vulnerabilities, critical and high among them, stay in the dependency tree.

## Steps

### 1: Check Dependabot

After PR 333 merges, confirm the next security run opens an npm-security PR. If it still defers, turn Grouped security updates off and on in the repo settings.

### 2: Patch the rest

For alerts Dependabot can't fix, update the lockfile or add pnpm.overrides, with each override's reason; run the full gate.

### 3: Track deepmerge

Watch for a patched deepmerge, or dismiss the alert with a stated reason if it isn't reachable.

## Acceptance Criteria

- [x] No open Dependabot alert remains, except ones dismissed with a stated reason.
- [x] VERIFY: pnpm install --frozen-lockfile && pnpm test --maxWorkers=3

## Files

- `pnpm-lock.yaml` - transitive versions
- `package.json` - pnpm.overrides where a parent pins an old range
- `.github/dependabot.yml` - config

## Work Log

### 2026-11-03T23:46:38.652Z - Scheduled by the owner (2026-11-03: 'Schedule them all for work as soon as possible'). Wave 1: started in its own worktree from feat/AppearancePackages 670daf925.

### 2026-11-04T00:31:54.165Z - Implemented (e3bb63e35 on fu/0092): 33 alerts fixed by in-range lockfile updates and 3 by raised overrides (js-yaml, shell-quote (the critical one), sharp), documented in docs/DEPENDENCY-OVERRIDES.md; pnpm audit drops from 58 findings to 6; dist byte-identical; full gate green. Open, awaiting the owner's dismissal decision: deepmerge #341 (no patch, its caller never loaded) and minimatch #343 (new; patched only in 11.x). Lands after Part K; the Dependabot check after PR 333 merges.

### 2026-11-05T00:46:34.063Z - Landed in wave 1 as 96a666faa (wave tip 9b9f8d028, gate 430 files / 5140 tests; pnpm install --frozen-lockfile passes). Owner approved the dismissals 2026-11-04: Dependabot #341 (deepmerge) and #343 (minimatch) dismissed as tolerable_risk with comments (#343 now reads as withdrawn on GitHub). The other open alerts are fixed on feat/AppearancePackages (lockfile compared) and close when PR 333 merges.

### 2026-11-05T00:46:36.446Z - Held open 2026-11-05: criterion 1 is not met yet. gh shows 37 open alerts on the default branch and PR 333 still OPEN. Remaining: step 1 (after PR 333 merges, confirm the alerts close and the next security run opens an npm-security PR), then tick criterion 1 and complete.

### 2026-11-05T16:31:02.070Z - 2026-11-05: re-checked all open alerts against the branch lockfile. 37 were open on main, 36 already resolved at or above the patched version on feat/AppearancePackages (@vitest/mocker 5.0.5, baseline-browser-mapping 2.11.34, brace-expansion 1.1.21/2.1.7/5.0.12, browserslist 4.29.5, fast-uri 3.1.9, js-yaml 4.3.2, sharp 0.35.5, shell-quote 1.12.0, source-map-js 1.2.2, svgo 3.3.5/4.1.0, undici 7.30.1). The 37th, minimatch #344, is GitHub's reissue of the withdrawn #343 (same GHSA-g3hv-75wg-m249, updated 2026-11-04 16:50): dismissed as tolerable_risk under the owner's 2026-11-04 approval. The reissue narrowed the range to >=7.0.0 <11.0.1, so minimatch 3.x (eslint) is no longer affected; an override of 9.x/10.x to 11 would now close it outright (follow-up option). Criterion 1 stays open only until PR 333 merges and the 36 fixed alerts close on main; then confirm and complete.

### 2026-11-06T15:33:17.472Z - 2026-11-06: set to blocked (owner). Waiting on PR 333 merging to main: Dependabot scans main only, which still shows 36 open alerts. Unblock after the merge, re-check alerts, tick the last criterion and complete.

### 2026-11-06T21:12:48.538Z - 2026-11-06: PR 333 was closed and the branch reopened as PR #337; this story is now blocked on #337 merging to main (Dependabot scans main only).

### 2026-11-07T01:00:00.837Z - 2026-11-07: after PR 337 (e77fe6fa3) and PR 338 (5c11a8db6, story 0160) merged, Dependabot shows 0 open alerts on main. The only dismissed one is #341 (deepmerge, tolerable_risk, reason recorded 2026-11-04). The three alerts 337 brought in (#345-#347, audiosprite's minimist and underscore) were fixed by 0160's overrides at 2026-11-06T23:20Z.
