---
id: 0101-i4j
title: 'Pixel and multiplier scanner edge cases: interpolated media preludes, interpolated selectors, mixin parameters'
purpose: Close the scanner gaps the Part H fix re-review found (Minor 1 and Minor 2).
type: chor
status: complete
priority: "4"
effort: S
created: "2026-11-05T00:56:23.271Z"
updated: "2026-11-05T00:57:04.327Z"
started: "2026-11-05T00:56:47.552Z"
completed: "2026-11-05T00:57:04.327Z"
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
      - bin/check-pixel-literals.ts
      - bin/check-pixel-literals.test.ts
      - docs/AGENT-REFERENCE.md
  plans:
    - ["0011-v9t", "included"]
    - ["0002-ldj", "included"]
progress:
  "1":
    status: complete
  "2":
    status: complete
---

# Pixel and multiplier scanner edge cases: interpolated media preludes, interpolated selectors, mixin parameters

## Problem Statement

The Part H fix re-review found three edge cases in `bin/check-pixel-literals.ts`: an `@media` prelude holding `#{}` interpolation, a selector built with interpolation such as `.gap-#{$n}px`, and mixin parameters that shadow file-level number constants. Each could make the pixel or multiplier gate report a false site or miss a real one.

**Impact:** The pixel-literal and multiplier ratchets, which `pnpm lint` enforces, could pass a literal or flag a non-literal.

## Steps

### 1: Implement

Fix the prelude, selector and parameter handling in `bin/check-pixel-literals.ts`, with a failing test per case in `bin/check-pixel-literals.test.ts`, and update AGENT-REFERENCE §8.

### 2: Land

Gate on the landing tree, land on feat/AppearancePackages and push.

## Acceptance Criteria

- [x] Interpolated `@media`/`@container` preludes and interpolated selectors are not reported as pixel literals, and a mixin parameter that shadows a file constant is left unresolved, each pinned by a test.
- [x] VERIFY: node bin/check-pixel-literals.ts

## Files

- `bin/check-pixel-literals.ts`
- `bin/check-pixel-literals.test.ts`
- `docs/AGENT-REFERENCE.md`

## Work Log

### 2026-11-05T00:56:49.815Z - Implemented on fu/h-scanner (93aa968fe..bc9832b55, 3 commits): review Needs fixes -> fixed -> re-review Approved -> minors 2 closed; controller-verified 2026-11-04 (66/66 scanner tests, tree 40 sites / 9 files, lint clean). Filed after the fact because the tracker was offline (MongoDB outage).

### 2026-11-05T00:57:01.123Z - Landed 342d83edb..ab8b7d0d0 (342d83edb, 47b032be2, ab8b7d0d0) with the 0082-lgo + 0088-sz9 batch (93aa968fe..ab8b7d0d0, pushed). Gate on 0afb185bc: 449 files / 5851 tests. Complete.
