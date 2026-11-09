---
id: 0165-z8i
title: Document the screen saver move and write the 3.1 release notes
purpose: Plan 0016-vbq section 3.1.
type: chor
status: complete
priority: "2"
effort: S
created: "2026-11-09T19:24:52.740Z"
updated: "2026-11-09T21:12:47.286Z"
started: "2026-11-09T21:12:44.273Z"
completed: "2026-11-09T21:12:47.286Z"
tags: []
milestone: ""
due_date: ""
planned_start: ""
planned_end: ""
order: 0
links:
  repo:
    local: ~/classicy
progress:
  "1":
    status: pending
  "2":
    status: pending
  "3":
    status: pending
---

# Document the screen saver move and write the 3.1 release notes

## Problem Statement

Plan 0016-vbq §3.1 (Document the move). Spec: docs/superpowers/specs/2026-11-09-screen-savers-in-appearance-packages-design.md. Interfaces: {}

**Impact:** Part of moving the screen savers into the Appearance Package.

## Steps

### 1: Write the docs

CLAUDE.md's Screen Saver section (core mechanism; Platinum ships the savers; `packages`, `defaultScreenSaver`, the resolution order; saver styles in the package layer and the reduced-motion/pointer guarantee as it now stands; logo registry in Platinum); AGENT-REFERENCE §8 and the screen saver API; README upgrade link; RELEASE-NOTES-3.1.md: the saver exports moved to @classicy/appearance-platinum (breaking for a host importing one; migration is the import specifier), `packages`, `defaultScreenSaver`, `src` widening, and how to offer a Platinum saver under another package. American English.

### 2: Check doc tests and lint

Command: `pnpm lint && pnpm exec vitest run src/Appearance/ClassicyPackageExports.test.ts`

### 3: Commit

Command: `git commit -m "docs: screen savers ship with Appearance Packages"`

## Acceptance Criteria

- [x] VERIFY: The section's tests pass and `pnpm lint` and `pnpm exec tsc --noEmit -p .` are clean.

## Files

- `docs/RELEASE-NOTES-3.1.md` - create
- `CLAUDE.md` - modify
- `docs/AGENT-REFERENCE.md` - modify
- `README.md` - modify
- `docs/BUILDING-APPS.md` - modify

## Work Log
