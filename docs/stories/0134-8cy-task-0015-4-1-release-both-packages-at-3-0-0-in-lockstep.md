---
id: 0134-8cy
title: '0015 §4.1: Release both packages at 3.0.0 in lockstep'
purpose: Execute plan 0015-kxa section 4.1.
type: task
status: ready
priority: "1"
effort: M
created: "2026-11-05T19:55:05.295Z"
updated: "2026-11-05T20:26:46.239Z"
tags: []
milestone: ""
due_date: ""
planned_start: ""
planned_end: ""
order: 0
links:
  repo:
    local: ~/classicy
  plans:
    - ["0015-kxa", "included"]
progress:
  "1":
    status: pending
  "2":
    status: pending
  "3":
    status: pending
  "4":
    status: pending
  "5":
    status: pending
---

# 0015 §4.1: Release both packages at 3.0.0 in lockstep

## Problem Statement

Plan 0015-kxa section 4.1 (Release, docs and final verification): Release both packages at 3.0.0 in lockstep. The plan section holds the interfaces and exact steps; this story tracks its execution (implementer → review → fix → controller verification → land on feat/AppearancePackages).

**Produces:** `push.yml`: `paths` gains `packages/**` (keeping `!**/*.stories.tsx`); after the version bump, a step sets the Platinum package's `version` to the root's and commits it `[skip ci]` like the codename step; publish runs `pnpm publish --filter @classicy/classicy --filter @classicy/appearance-platinum --access public --no-git-checks` with `NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}` (replacing `JS-DevTools/npm-publish`, because pnpm rewrites `workspace:^` to `^<version>`); the wait loop checks both names read from their `package.json` files; the dispatches run only after both are live.

## Steps

### 1: Write the failing workflow test

`bin/classicyReleaseWorkflow.test.ts` parses `push.yml` (the `yaml` package already in the tree, or a minimal parse) and asserts: `packages/**` in `paths`; a version-sync step for the Platinum package after the bump step; the publish step names both packages and uses pnpm; the wait loop iterates both `package.json` names; no step hard-codes `classicy` as a package name.

### 2: Make the bump produce 3.0.0

Read `phips28/gh-action-bump-version`'s configured major wording (its `major-wording` default) and either set `major-wording` explicitly or document the keyword; the PR 333 merge commit message must contain it. Record the exact keyword in the PR's release checklist. Prove it with `act`-free reasoning plus the action's README at the pinned ref; if the action cannot be made to produce 3.0.0 from a merge commit, add a one-off `workflow_dispatch` input `version` that, when set, is used instead, and document that path.

### 3: Implement and prove the packed peer range

`pnpm pack` both packages locally and assert the Platinum tarball's `package.json` has `"@classicy/classicy": "^<version>"` (this is also 3.4's pack test). Command: `pnpm --filter @classicy/appearance-platinum pack --pack-destination /tmp/claude-1001/-home-robbiebyrd-classicy/3047943f-7592-48d7-8a65-0338bea11319/scratchpad && tar -xOzf /tmp/claude-1001/-home-robbiebyrd-classicy/3047943f-7592-48d7-8a65-0338bea11319/scratchpad/classicy-appearance-platinum-*.tgz package/package.json | grep -A2 peerDependencies`

### 4: CI builds the package too

`ci.yml`'s `pnpm build:source` now covers it; add `pnpm --filter @classicy/appearance-platinum exec vitest run` if the root `pnpm test` does not include the package's tests (make the root vitest config's `projects`/workspace include it instead, so `pnpm test` stays the one command).

### 5: Commit

Conventional commit(s) ending with the session trailers; confirm the branch and `git diff --cached` first. Command: `git commit -m "ci: publish @classicy/classicy and @classicy/appearance-platinum together"`

## Acceptance Criteria

- [ ] VERIFY: `pnpm exec vitest run bin/classicyReleaseWorkflow.test.ts` passes.
- [ ] VERIFY: Reviewed with no open finding at or above 70 confidence, verified by the controller, and landed on feat/AppearancePackages with the full gate green.

## Files

- `.github/workflows/push.yml` - modify
- `.github/workflows/ci.yml` - modify
- `bin/` - modify (a release helper, if needed)
- `bin/classicyReleaseWorkflow.test.ts` - test

## Work Log
