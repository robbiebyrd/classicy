---
id: 0010-f28
title: 'G 0: Parity baseline'
purpose: Capture the before-screenshots of every Controls, Desktop and Dialogs story (and the error alert's title-bar color) so Part G's color and derivation rewrites can be proven pixel-identical apart from the one named change.
type: chor
status: pending
priority: "2"
effort: S
created: "2026-10-28T19:52:56.298Z"
updated: "2026-10-28T19:52:56.298Z"
links:
  repo:
    local: ~/classicy
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
  stories:
    - ["0009-pat", "depends"]
  plans:
    - ["0004-vqt", "included", ["0"]]
progress:
  "1":
    status: pending
  "2":
    status: pending
  "3":
    status: pending
  "4":
    status: pending
---

# G 0: Parity baseline

## Problem Statement

Part G (plan 0004-vqt, umbrella 0002-ldj) replaces every literal color, rewrites ~390 multiplier sites and moves window geometry to CSS variables across ~45 stylesheets. The umbrella's regression gate is screenshot parity re-shot per part (`.playwright-mcp/parity/` is gitignored), so the full `Controls/*`, `Desktop/*`, `Dialogs/*` set is captured here first. Part G depends on Part A only for the `src/Appearance/vocabulary/` directory, which exists once A's stories are done.

The baseline also records the error title-bar color the plan's one named visual change replaces (`rgb(247, 206, 205)` on `dialogs-alert--stop`).

**Impact:** Without the baseline, G 4 cannot separate the named error-tint change from accidental drift in the halftone, scrollbar shading or font-size rewrites.

## Steps

### 1: Start Storybook

`pnpm storybook` in the background; note the port.

### 2: Collect the story ids

Collect every `Controls/*`, `Desktop/*` and `Dialogs/*` story id from `http://localhost:<port>/index.json` into `.playwright-mcp/parity/part-G/stories.txt` (same python one-liner as plan 0001 Phase 0 / story A 0).

### 3: Shoot every story

Playwright: `iframe.html?id=<id>&viewMode=story` at 1024×768, networkidle + 500 ms, save `.playwright-mcp/parity/part-G/before/<id>.png`.

### 4: Verify the count and record the error title-bar color

Verify the PNG count equals the stories.txt line count. On `dialogs-alert--stop` record `getComputedStyle(document.querySelector('.classicyWindowTitleBar')).backgroundColor` → `rgb(247, 206, 205)` (the value the named change replaces). No commit.

## Acceptance Criteria

- [ ] VERIFY: ls .playwright-mcp/parity/part-G/before/*.png | wc -l  # equals the stories.txt line count
- [ ] [MANUAL] `dialogs-alert--stop` title bar measures `rgb(247, 206, 205)` and the value is noted for G 4.
- [ ] No repo file changed and nothing was committed.

## Work Log
