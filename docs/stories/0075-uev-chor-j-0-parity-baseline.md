---
id: 0075-uev
title: 'J 0: Parity baseline'
purpose: Capture before-screenshots of the Screen Saver control panel, the controls the Appearance panel reuses and the Appearance panel itself, so Part J can prove nothing outside the panel changed.
type: chor
status: pending
priority: "2"
effort: S
created: "2026-10-28T20:39:58.702Z"
updated: "2026-10-28T20:39:58.702Z"
links:
  repo:
    local: ~/classicy
    files:
      - .playwright-mcp/parity/part-J/stories.txt
      - .playwright-mcp/parity/part-J/before
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
  stories:
    - ["0041-dyu", "depends"]
    - ["0025-xns", "depends"]
    - ["0032-ztu", "depends"]
  plans:
    - ["0012-pt9", "included", ["0"]]
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

# J 0: Parity baseline

## Problem Statement

Part J (plan 0012-pt9, audit §9 Phase 8, umbrella 0002-ldj) rebuilds the Appearance control panel and extracts the Screen Saver options form into a shared `ClassicySchemaForm`. Visual change is allowed only inside the Appearance Manager window; the Screen Saver control panel and every reused control must compare AE 0 before vs after.

This story confirms Parts B, C and D are merged (the plan consumes `useClassicyAppearancePackages`, `useClassicyAssetTree`, `useClassicySoundPacks`), shoots the Storybook before-set for Extensions/ScreenSaver and the reused controls, and records the Screen Saver panel and the five current Appearance tabs in the example app.

**Impact:** Without the before-set, J 1.1's form extraction and J 6.1's final comparison cannot prove the Screen Saver panel and the reused controls are pixel-identical.

## Steps

### 1: Confirm Parts B, C, D are merged

`grep -c useClassicyAppearancePackages src/Appearance/ClassicyAppearancePackage.ts; grep -c useClassicyAssetTree src/Appearance/ClassicyAssetRegistry.ts; grep -c useClassicySoundPacks src/SystemFolder/ControlPanels/SoundManager/ClassicySoundPacks.ts` → each ≥ 1. Stop if not.

### 2: Collect the story ids

Start Storybook (`pnpm storybook`, background). From `index.json` collect every story id for titles Extensions/ScreenSaver, Controls/Tabs, Controls/Spinner, Controls/PopUpMenu, Controls/Checkbox, Controls/Input, Controls/ControlGroup, Controls/RadioInput, Controls/Slider, Desktop/Window → `.playwright-mcp/parity/part-J/stories.txt`.

### 3: Shoot the Storybook before-set

Playwright: `iframe.html?id=<id>&viewMode=story` at 1024×768, networkidle + 500 ms → `.playwright-mcp/parity/part-J/before/<id>.png`.

### 4: Shoot the example-app screens

Example app (`pnpm preview`): open the Screen Saver control panel with the Flying Toasters options visible → `before/app-screensaver-panel.png`; open the Appearance Manager on each of its five tabs → `before/app-appearance-<tab>.png` (record only; the panel may change). No commit.

## Acceptance Criteria

- [ ] VERIFY: `ls .playwright-mcp/parity/part-J/before/*.png | wc -l` equals stories.txt lines + 6
- [ ] VERIFY: grep -c useClassicyAppearancePackages src/Appearance/ClassicyAppearancePackage.ts; grep -c useClassicyAssetTree src/Appearance/ClassicyAssetRegistry.ts; grep -c useClassicySoundPacks src/SystemFolder/ControlPanels/SoundManager/ClassicySoundPacks.ts  # each >= 1
- [ ] [MANUAL] The Screen Saver panel screenshot shows the Flying Toasters options form fully rendered.

## Files

- `.playwright-mcp/parity/part-J/stories.txt` - create: the story id list
- `.playwright-mcp/parity/part-J/before` - create: one PNG per story id plus six app screens

## Work Log
