---
id: 0092-prv
title: Clear the 37 transitive Dependabot alerts
purpose: Close the open Dependabot alerts, whether or not Dependabot opens the PR itself.
type: chor
status: pending
priority: "1"
effort: M
created: "2026-10-30T19:15:24.764Z"
updated: "2026-10-30T19:15:24.764Z"
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
    status: pending
  "3":
    status: pending
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

- [ ] No open Dependabot alert remains, except ones dismissed with a stated reason.
- [ ] VERIFY: pnpm install --frozen-lockfile && pnpm test --maxWorkers=3

## Files

- `pnpm-lock.yaml` - transitive versions
- `package.json` - pnpm.overrides where a parent pins an old range
- `.github/dependabot.yml` - config

## Work Log
