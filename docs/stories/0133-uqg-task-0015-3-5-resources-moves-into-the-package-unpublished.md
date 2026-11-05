---
id: 0133-uqg
title: '0015 §3.5: resources/ moves into the package, unpublished'
purpose: Execute plan 0015-kxa section 3.5.
type: task
status: pending
priority: "1"
effort: M
created: "2026-11-05T19:55:02.125Z"
updated: "2026-11-05T19:55:02.125Z"
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

# 0015 §3.5: resources/ moves into the package, unpublished

## Problem Statement

Plan 0015-kxa section 3.5 (Extract Platinum into packages/appearance/platinum): resources/ moves into the package, unpublished. The plan section holds the interfaces and exact steps; this story tracks its execution (implementer → review → fix → controller verification → land on feat/AppearancePackages).

**Produces:** `packages/appearance/platinum/resources/` (346 MB, 80,038 files), outside every `files` allowlist and `exports` entry.

## Steps

### 1: Write the failing pack assertion

The Platinum pack test from 3.4 already asserts no `resources/` path; add one that `packages/appearance/platinum/resources/Apple_HIGOS8_1997_Guidelines.pdf` exists (the move happened) and the root has no `resources/`.

### 2: Move

`git mv resources packages/appearance/platinum/resources` (no re-encoding; confirm `git diff --stat -M` shows renames only).

### 3: Fix references

`biome.json` (`resources/**` include and the `resources/app-icons/index.json` exclude → new path); the HIGOS8 citation in `hig-audit.md` (path `packages/appearance/platinum/resources/Apple_HIGOS8_1997_Guidelines.pdf`, which also fixes today's nonexistent `Apple_HIGOS8_Guidelines.pdf`); `build:watchaudio` (fixed in 3.3; confirm); any other `resources/` mention (`git grep -n 'resources/' -- ':!packages'`).

### 4: Run lint and the pack tests

Run lint and the pack tests Command: `pnpm lint && pnpm exec vitest run src/Appearance/ClassicyPackageExports.test.ts && pnpm --filter @classicy/appearance-platinum exec vitest run src/PlatinumPackageExports.test.ts`

### 5: Commit

Conventional commit(s) ending with the session trailers; confirm the branch and `git diff --cached` first. Command: `git commit -m "chore: move resources/ into the Platinum package folder (never published)"`

## Acceptance Criteria

- [ ] VERIFY: `pnpm lint && pnpm --filter @classicy/appearance-platinum exec vitest run` passes.
- [ ] VERIFY: Reviewed with no open finding at or above 70 confidence, verified by the controller, and landed on feat/AppearancePackages with the full gate green.

## Files

- `biome.json` - modify
- `package.json` - modify
- `docs/plans/hig-audit.md` - modify (or docs/hig-audit.md, wherever it lives at execution)
- `resources/` - delete (git mv to packages/appearance/platinum/resources/)

## Work Log
