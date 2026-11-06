---
id: 0157-veo
title: Hosts install only react, react-dom and the two Classicy packages
purpose: A host's install line is just Classicy, with no version pins to know about.
type: impr
status: complete
priority: "1"
effort: S
created: "2026-11-06T20:01:43.122Z"
updated: "2026-11-06T20:27:24.167Z"
started: "2026-11-06T20:01:50.812Z"
completed: "2026-11-06T20:27:24.167Z"
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
      - package.json
      - vite.config.ts
      - README.md
      - docs/AGENT-REFERENCE.md
      - docs/RELEASE-NOTES-APPEARANCE-PACKAGES.md
progress:
  "1":
    status: pending
  "2":
    status: pending
---

# Hosts install only react, react-dom and the two Classicy packages

## Problem Statement

Owner (2026-11-06): the release notes' instruction to pin `@tanstack/react-table@^8.21.3` is work hosts should not have to do. `@classicy/classicy` lists `@tanstack/react-table`, `immer`, `react-player` and `zustand` as peerDependencies (as 2.x did), although they are Classicy's own implementation details (react-table is used only by ClassicyTable); the docs' install line therefore lists them, and an unpinned react-table now installs 9.x, outside the peer range.

**Impact:** Every new host types a long install line and must know a pin; yarn berry hosts get peer warnings.

## Steps

### 1: Move them to dependencies

Move `@tanstack/react-table`, `immer`, `react-player` and `zustand` from peerDependencies to dependencies at their current ranges; keep `react`, `react-dom` and the optional `@types/react` as peers. Keep them external in both bundles (vite.config.ts externalPackages) so the package manager dedupes them with a host's own copies; check no singleton concern (zustand's store is created inside the core). Update the lockfile with `--config.minimum-release-age=10080` (libc: count 63). Extend the host type check (bin/check-host-types.ts) and the pack tests if they assume these are peers.

### 2: Docs

Install line becomes `pnpm add @classicy/classicy @classicy/appearance-platinum` (plus `react react-dom` for a new app); remove the react-table pin note from README, AGENT-REFERENCE and the release notes' Summary; add a release-note line: these four are now dependencies, nothing to do for an upgrading host (its existing copies are reused when in range).

## Acceptance Criteria

- [x] VERIFY: The packed core manifest lists only react, react-dom and optional @types/react as peers; a scratch host installing only the two Classicy packages plus react/react-dom builds, renders and type-checks (verify:host-types).
- [x] VERIFY: No doc tells a host to pin or install @tanstack/react-table, immer, react-player or zustand; full gate green.

## Files

- `package.json` - four peers become dependencies

## Work Log

### 2026-11-06T20:27:16.227Z - Landed at ac51cfe82 (6d16651fc, e6b058001 rebased onto 3fcde4b86, no conflicts). @tanstack/react-table, immer, react-player and zustand are dependencies (still external in both bundles); peers are react, react-dom and optional @types/react; lockfile libc: 63. Install line is pnpm add @classicy/classicy @classicy/appearance-platinum (plus react react-dom for a new app); the pin note is gone; a release-note line says upgrading hosts have nothing to do. Scratch host (two tarballs + react/react-dom, npm) resolved react-table 8.21.3, built, and type-checked without skipLibCheck. Gate 495 files / 7210 tests, Platinum 24/319. Controller reviewed the manifest and docs, and after the rebase ClassicyPackageExports (44) and biome are green; the owner's rename-entry title is intact.
