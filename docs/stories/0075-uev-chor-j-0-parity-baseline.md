---
id: 0075-uev
title: 'J 0: Parity baseline'
purpose: Capture before-screenshots of the Screen Saver control panel, the controls the Appearance panel reuses and the Appearance panel itself, so Part J can prove nothing outside the panel changed.
type: chor
status: complete
priority: "2"
effort: S
created: "2026-10-28T20:39:58.702Z"
updated: "2026-10-30T00:37:09.224Z"
started: "2026-10-30T00:24:17.406Z"
completed: "2026-10-30T00:37:09.224Z"
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
      - .playwright-mcp/parity/part-J/stories.txt
      - .playwright-mcp/parity/part-J/before
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
  stories:
    - ["0083-v8n", "blocks"]
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

- [x] VERIFY: `ls .playwright-mcp/parity/part-J/before/*.png | wc -l` equals stories.txt lines + 6
- [x] VERIFY: grep -c useClassicyAppearancePackages src/Appearance/ClassicyAppearancePackage.ts; grep -c useClassicyAssetTree src/Appearance/ClassicyAssetRegistry.ts; grep -c useClassicySoundPacks src/SystemFolder/ControlPanels/SoundManager/ClassicySoundPacks.ts  # each >= 1

## Files

- `.playwright-mcp/parity/part-J/stories.txt` - create: the story id list
- `.playwright-mcp/parity/part-J/before` - create: one PNG per story id plus six app screens

## Work Log
### 2026-10-29T20:22:00.352Z - Moved one open [MANUAL] acceptance criterion to the program V&V ticket 0083-v8n (human verification and validation), where it is tracked and ticked. This story now closes on its automated criteria; 0083-v8n links back with `depends`.

### 2026-10-30T00:36:54.101Z - Done at the pre-J post-B commit 29a15c243. The gate greps give 2, 1 and 1. part-J/ holds 79 story ids, a title-filtered subset of the shared post-B baseline with hard-linked PNGs, plus 6 example-app shots from that commit (Node 24, port 5310): app-screensaver-panel (Flying Toasters options) and app-appearance-{themes,desktop,colors,fonts,sound} (5 tabs at that commit). 85 PNGs = 79 + 6. The menu-bar clock drifted and its colon blinks, so scripts/shoot-app.cjs pins the clock and pauses the blink; two runs compared at AE 0 on all six. J 6.1's after shots must use the same script, and its implementer was told.
