---
id: 0026-3a7
title: 'D 0: Parity baseline'
purpose: Shoot a two-story parity reference so Part D's no-visual-change claim can be checked at the end.
type: chor
status: complete
priority: "2"
effort: XS
created: "2026-10-28T20:04:46.390Z"
updated: "2026-10-28T23:36:06.388Z"
started: "2026-10-28T23:34:32.056Z"
completed: "2026-10-28T23:36:06.388Z"
links:
  repo:
    local: ~/classicy
    files:
      - .playwright-mcp/parity/part-D/stories.txt
      - .playwright-mcp/parity/part-D/before
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
  plans:
    - ["0008-j5l", "included", ["0"]]
progress:
  "1":
    status: complete
  "2":
    status: complete
  "3":
    status: complete
  "4":
    status: complete
---

# D 0: Parity baseline

## Problem Statement

Plan 0008-j5l (umbrella 0002-ldj, audit §9 Phase 4) changes how the Sound manager boots and which theme field selects a sound pack. It promises no visual change; the umbrella plan still asks every part to re-shoot its own parity baseline. This story shoots `desktop-desktop--default` and `dialogs-alert--note` at 1024×768 into `.playwright-mcp/parity/part-D/before/` (gitignored) as a cheap regression guard. Nothing is committed.

**Impact:** Without it D 6.1 has no reference to compare against and an accidental visual side effect of the theme-schema or provider changes would go unnoticed.

## Steps

### 1: Start Storybook

`pnpm storybook` in the background (port 6006).

### 2: Record the two story ids

`mkdir -p .playwright-mcp/parity/part-D/before` and write `desktop-desktop--default` and `dialogs-alert--note` to `.playwright-mcp/parity/part-D/stories.txt` after confirming both ids exist in `curl -s http://localhost:6006/index.json`.

### 3: Shoot both stories

Playwright: open `http://localhost:6006/iframe.html?id=<id>&viewMode=story` at 1024×768, wait networkidle + 500 ms, save `.playwright-mcp/parity/part-D/before/<id>.png` for both.

### 4: Check the count

`ls .playwright-mcp/parity/part-D/before | wc -l` is 2. No commit.

## Acceptance Criteria

- [x] VERIFY: ls .playwright-mcp/parity/part-D/before/*.png | wc -l  # 2
- [x] `stories.txt` holds exactly `desktop-desktop--default` and `dialogs-alert--note`, both confirmed present in Storybook's `index.json`.
- [x] Nothing is committed; `.playwright-mcp/` stays gitignored.

## Files

- `.playwright-mcp/parity/part-D/stories.txt` - the two story ids
- `.playwright-mcp/parity/part-D/before` - baseline screenshots

## Work Log

### 2026-10-28T23:35:50.902Z - Completed: commits e9625ee..ebb87ac, task review clean
