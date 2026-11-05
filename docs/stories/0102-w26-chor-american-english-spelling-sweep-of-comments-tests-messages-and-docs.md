---
id: 0102-w26
title: American English spelling sweep of comments, tests, messages and docs
purpose: Use American English throughout the repository, as the project requires.
type: chor
status: complete
priority: "4"
effort: M
created: "2026-11-05T00:57:05.756Z"
updated: "2026-11-05T00:57:29.955Z"
started: "2026-11-05T00:57:12.529Z"
completed: "2026-11-05T00:57:29.955Z"
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
      - src
      - storybook
      - docs
progress:
  "1":
    status: complete
  "2":
    status: complete
---

# American English spelling sweep of comments, tests, messages and docs

## Problem Statement

Comments, test names, messages, stories and docs used British spellings (colour, behaviour, centred/centre, grey, labelled prose), e.g. ClassicyScreenSaver.stories.tsx:43, ClassicyControlStrip.tsx:188, ClassicyLink.tsx:38, ClassicyPopUpMenu.test.tsx:478. `aria-labelledby` is an API name and stays. The unreleased drag-end field `cancelled` (added by 0084-fd7 on this branch, never on main) is renamed `canceled`.

**Impact:** Mixed spelling across the codebase and an unreleased public field spelled the British way.

## Steps

### 1: Implement

Search tracked files for about 190 British patterns (excluding resources/, HISTORY.md, docs/plans, docs/stories, assets, dist, lockfiles), review every hit, apply whole-word case-keeping replacements, rename `cancelled` -> `canceled` by hand.

### 2: Land

Gate on the landing tree, land on feat/AppearancePackages and push.

## Acceptance Criteria

- [x] No British spelling remains in src, storybook or docs prose (aria-labelledby kept), and the drag-end detail is `{ kind, dropped, canceled }`.
- [x] VERIFY: pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test --maxWorkers=3 && pnpm build:source

## Files

- `src`
- `storybook`
- `docs`

## Work Log

### 2026-11-05T00:57:14.652Z - Implemented on fu/spelling (d8795483f: about 290 fixes in 120 files) from ab8b7d0d0; filed after the fact because the tracker was offline (MongoDB outage).

### 2026-11-05T00:57:26.370Z - Landed ab8b7d0d0..52b917046 (00dc02ac1 src, 874e8a082 storybook, d8795483f docs, 52b917046 drag-end cancelled -> canceled; 128 files), pushed. Gate on fu/spelling: 5870 tests; pnpm-lock.yaml byte-identical. Complete.
