---
id: 0067-opx
title: 'H 0: Parity baseline'
purpose: Capture before-screenshots of every Storybook story and example-app screen that Part H's pixel-literal purge touches, so each later section can prove Platinum pixel-identical.
type: chor
status: pending
priority: "2"
effort: S
created: "2026-10-28T20:34:27.417Z"
updated: "2026-10-28T20:34:27.417Z"
links:
  repo:
    local: ~/classicy
    files:
      - .playwright-mcp/parity/part-H/stories.txt
      - .playwright-mcp/parity/part-H/before
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
  stories:
    - ["0041-dyu", "depends"]
    - ["0017-ih7", "depends"]
  plans:
    - ["0011-v9t", "included", ["0"]]
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

# H 0: Parity baseline

## Problem Statement

Part H (plan 0011-v9t, audit §9 Phase 6 item 3, umbrella 0002-ldj) rewrites 283 bare pixel literals and 50 `var(--x, Npx)` fallbacks across 44 SCSS files. Every section must end pixel-identical for Platinum, and the only proof is a screenshot comparison against a baseline shot before any change.

This story confirms Parts B and G are merged (the plan depends on `platinum.json`, `_mixins.scss` and Part G's `--menu-item-height`-style derivations), then shoots the before-set: every Storybook story on the surfaces H touches, plus four example-app screens (HyperCard, Finder About This Computer, Finder Preferences, Drive Setup) that have no stories.

**Impact:** Without the before-set, no later H story can run its `compare -metric AE` gate; a regression in Control Strip, menu frame, pager or balloon geometry would ship unnoticed.

## Steps

### 1: Confirm Parts B and G are merged

`test -f src/Appearance/Platinum/platinum.json && test -f src/Appearance/Platinum/styles/_mixins.scss && grep -c 'menu-item-height' src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.ts` — expect the files to exist and a count ≥ 1. Stop if not.

### 2: Collect the story ids

Start Storybook (`pnpm storybook`, background; note the port). `curl -s http://localhost:<port>/index.json` and collect every story id whose title is one of: Desktop/ControlStrip, Desktop/Menu, Desktop/Window, Desktop/WindowFrame, Controls/Pager, Controls/BalloonHelp, Controls/PopUpSlider, Controls/ColorPicker, Controls/HelpButton, Controls/Kbd, Controls/Link, Controls/Table, Controls/Tree, Controls/Placard, Controls/BevelButton, Controls/ProgressBar, Controls/Slider, Controls/PopUpMenu, Controls/ControlGroup, Controls/ControlLabel, Controls/FileInput, Controls/ImageWell, Controls/Separator, Controls/Input, Controls/KeyboardEquivalentField, Dialogs/Alert, Dialogs/InputDialog, Dialogs/FileOpenDialog, Extensions/AppleGuide, System/CrashScreen, System/StartupScreen, and the QuickTimeMovieEmbed and AboutWindow stories; save to `.playwright-mcp/parity/part-H/stories.txt`.

### 3: Shoot the Storybook before-set

Playwright: open `iframe.html?id=<id>&viewMode=story` at 1024×768, wait networkidle + 500 ms, save `.playwright-mcp/parity/part-H/before/<id>.png` for each id. `ls before | wc -l` equals the line count of stories.txt.

### 4: Shoot the four example-app screens

HyperCard, Finder About This Computer, Finder Preferences and Drive Setup have no stories: run the example app (`pnpm preview`), open each (Apple menu → About This Computer; Finder → Edit → Preferences; HyperCard editor with one selected button; Drive Setup) and save `.playwright-mcp/parity/part-H/before/app-<name>.png` at 1024×768. No commit.

## Acceptance Criteria

- [ ] VERIFY: `ls .playwright-mcp/parity/part-H/before/*.png | wc -l` equals stories.txt lines + 4
- [ ] VERIFY: `test -f src/Appearance/Platinum/platinum.json && test -f src/Appearance/Platinum/styles/_mixins.scss && grep -c 'menu-item-height' src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.ts`
- [ ] [MANUAL] Every before-screenshot shows the surface fully rendered (no blank frames, no loading state).

## Files

- `.playwright-mcp/parity/part-H/stories.txt` - create: the story id list
- `.playwright-mcp/parity/part-H/before` - create: one PNG per story id plus four app screens

## Work Log
