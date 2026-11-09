---
id: 0164-l2e
title: Gates and dist checks follow the savers to Platinum
purpose: Plan 0016-vbq section 2.2.
type: chor
status: complete
priority: "2"
effort: S
created: "2026-11-09T19:24:47.308Z"
updated: "2026-11-09T21:08:24.768Z"
started: "2026-11-09T21:08:21.534Z"
completed: "2026-11-09T21:08:24.768Z"
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
  "4":
    status: pending
  "5":
    status: pending
---

# Gates and dist checks follow the savers to Platinum

## Problem Statement

Plan 0016-vbq §2.2 (Gates and dist checks follow the savers). Spec: docs/superpowers/specs/2026-11-09-screen-savers-in-appearance-packages-design.md. Interfaces: {}

**Impact:** Part of moving the screen savers into the Appearance Package.

## Steps

### 1: Write the failing tests

verify-dist: `dist/assets must hold each saver image, byte-identical` and `a missing saver image fails`; core dist check: `a saver image or a classicySaver keyframe in the core's dist fails`.

### 2: Confirm they fail

Command: `pnpm exec vitest run bin packages/appearance/platinum/bin`

### 3: Implement: move the savers/ path exemptions to Platinum's new path (pixel gate, color sweep, vocabulary test); list the saver art in Platinum's verify-dist; add the core dist invariant

Implement: move the savers/ path exemptions to Platinum's new path (pixel gate, color sweep, vocabulary test); list the saver art in Platinum's verify-dist; add the core dist invariant

### 4: Confirm the gates pass on the real build

Command: `pnpm lint && node bin/classicyLiteralColorSweep.ts && pnpm build:source`

### 5: Commit

Command: `git commit -m "chore(gates): saver exemptions and dist checks follow the savers to Platinum"`

## Acceptance Criteria

- [x] VERIFY: The section's tests pass and `pnpm lint` and `pnpm exec tsc --noEmit -p .` are clean.

## Files

- `bin/check-pixel-literals.ts` - modify
- `bin/classicyLiteralColorSweep.ts` - modify
- `src/Appearance/vocabulary/ClassicyVocabulary.test.ts` - modify
- `packages/appearance/platinum/bin/verify-dist.mjs` - modify
- `packages/appearance/platinum/bin/verify-dist.test.ts` - modify
- `bin/check-dist-imports.mjs` - modify
- `packages/appearance/platinum/bin/verify-dist.test.ts` - modify
- `bin/checkDistImports.test.ts` - modify

## Work Log
