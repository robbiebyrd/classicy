---
id: 0137-dm7
title: '0015 §5.1: Prepare robbiebyrd/classicy-web for 3.0.0'
purpose: Execute plan 0015-kxa section 5.1.
type: task
status: pending
priority: "1"
effort: M
created: "2026-11-05T19:55:14.701Z"
updated: "2026-11-05T20:17:24.686Z"
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

- [ ] VERIFY: `pnpm test` passes.
- [ ] VERIFY: Reviewed with no open finding at or above 70 confidence, verified by the controller, and landed on feat/AppearancePackages with the full gate green.

## Files

- `robbiebyrd/classicy-web:` - modify package.json, the lockfile, every `from "classicy` import, the app entry, its classicy auto-bump workflow (deploy-pages)

## Work Log
