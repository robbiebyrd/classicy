---
id: 0137-dm7
title: '0015 §5.1: Prepare robbiebyrd/classicy-web for 3.0.0'
purpose: Execute plan 0015-kxa section 5.1.
type: task
status: complete
priority: "1"
effort: M
created: "2026-11-05T19:55:14.701Z"
updated: "2026-11-06T16:24:47.151Z"
started: "2026-11-06T16:19:51.418Z"
completed: "2026-11-06T16:24:47.151Z"
tags: []
milestone: ""
due_date: ""
planned_start: ""
planned_end: ""
order: 0
links:
  repo:
    local: ~/classicy
  stories:
    - ["0132-jsg", "depends"]
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

# 0015 §5.1: Prepare robbiebyrd/classicy-web for 3.0.0

## Problem Statement

Plan 0015-kxa section 5.1 (Prepare the downstream apps): Prepare robbiebyrd/classicy-web for 3.0.0. The plan section holds the interfaces and exact steps; this story tracks its execution (implementer → review → fix → controller verification → land on feat/AppearancePackages).

## Steps

### 1: Branch the repo

Clone into the scratchpad, branch `classicy-3.0.0`; read its build/test commands and its `repository_dispatch` handler for `deploy-pages`.

### 2: Switch to the new packages

Replace `classicy` with `@classicy/classicy` and add `@classicy/appearance-platinum` (pinned `^3.0.0`), rewrite every `classicy` import and CSS/SCSS specifier, add `import "@classicy/appearance-platinum";` at the app entry, add both to `optimizeDeps.exclude` if it uses Vite, and handle any other 3.0 breaking change the build or its tests hit (the release note lists them).

### 3: Verify against the tarballs

Temporarily point both dependencies at the local tarballs (`file:`), run the repo's install, build and tests, and load the built app in Playwright: the desktop renders, no console errors, no 404s. Then restore `^3.0.0` ranges (the lockfile is regenerated once 3.0.0 is on npm; say so in the PR).

### 4: Fix the auto-bump

Its `deploy-pages` handler must bump `@classicy/classicy` and `@classicy/appearance-platinum` together; a bump of `classicy` would find no 3.0.0.

### 5: Open the PR

Title `Classicy 3.0.0: @classicy/classicy and @classicy/appearance-platinum`; body: what changed, the verification run, and that it must merge only after 3.0.0 is published (or before PR 333 merges, if the auto-bump is ready to resolve it). Do not merge; the owner merges.

## Acceptance Criteria

- [x] VERIFY: `pnpm test` passes.
- [x] VERIFY: Reviewed with no open finding at or above 70 confidence, verified by the controller, and landed on feat/AppearancePackages with the full gate green.

## Files

- `robbiebyrd/classicy-web:` - modify package.json, the lockfile, every `from "classicy` import, the app entry, its classicy auto-bump workflow (deploy-pages)

## Work Log

### 2026-11-06T14:18:41.513Z - 2026-11-06, owner instruction: do not start this story until the owner has been alerted to begin the verification on 0139-vni (V&V) and has given the go.

### 2026-11-06T16:19:38.126Z - 2026-11-06 16:18: owner alerted to begin 0139's verification (npm org classicy, NPM_TOKEN able to publish @classicy/*) and asked to start 0137 now, while 3.4 (0132) is still running. Started early: steps 1, 2 and 4 now; step 3 runs against tarballs packed from the current tip and is re-run against 3.4's tarballs when it lands; the PR is not opened until then.

### 2026-11-06T16:24:22.805Z - Done as robbiebyrd/classicy-web PR #10 (branch classicy-3.0.0, commit 072be37), opened unmerged; the owner merges after 3.0.0 is published. The plan's premise did not hold: classicy-web is the Next.js marketing site, does not depend on or import the library (package.json name 'classicy' is the site's own), has no Vite config and no tests. So the only change is the visitor install copy (header.tsx, features.tsx: npm install @classicy/classicy @classicy/appearance-platinum; import @classicy/appearance-platinum at the entry; the classicy/dist/classicy.css import dropped). deploy-pages only rebuilds; no auto-bump exists, so none to fix. Verification: yarn install --frozen-lockfile, yarn lint (0 errors), yarn build OK; built out/ in headless Chromium renders with 0 console errors and 0 responses >=400. Criteria: 'pnpm test' does not apply (yarn repo, no tests; build/lint/browser check stand in); 'landed on feat/AppearancePackages' does not apply (the change lands in classicy-web via PR #10); the controller reviewed the 2-line diff and the PR text. No step-3 re-run is needed after 3.4: the site has no classicy dependency.

### 2026-11-06T16:24:44.891Z - Completed with --force past its 0132 (3.4) dependency: the dependency assumed classicy-web consumes the built packages, which it does not, so nothing in 3.4 can change PR #10.
