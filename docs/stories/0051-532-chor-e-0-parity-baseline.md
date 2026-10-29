---
id: 0051-532
title: 'E 0: Parity baseline'
purpose: Capture before-screenshots of every surface Part E touches and measure whether the title-bar stripe caps ever paint, so the art extraction can be proven pixel-identical and the cap decision is made on evidence.
type: chor
status: pending
priority: "2"
effort: S
created: "2026-10-28T20:22:13.756Z"
updated: "2026-10-29T20:22:00.352Z"
links:
  repo:
    local: ~/classicy
    files:
      - .playwright-mcp/parity/part-E/stories.txt
      - .playwright-mcp/parity/part-E/before/
      - .playwright-mcp/parity/part-E/caps.txt
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
  stories:
    - ["0083-v8n", "blocks"]
    - ["0041-dyu", "depends"]
    - ["0025-xns", "depends"]
  plans:
    - ["0009-agy", "included", ["0"]]
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

# E 0: Parity baseline

## Problem Statement

Part E (plan 0009-agy, audit §9 Phase 5 items 1–5 under umbrella 0002-ldj) rewrites every Platinum art consumer — title-bar stripes, control-box glyphs, grip, dither, menu arrows, slider thumb, tab outline, icon halftone, pixel art, text glyphs — and must end pixel-identical except for three named changes. The parity gate needs a `before/` screenshot of every affected Storybook story taken before any change.

The stripe caps (`:before`/`:after` on `.classicyWindowTitleLeft/Right`, `ClassicyWindow.scss:109-128`) are `content: " "` blocks that are expected to collapse to zero height and never paint. Section 2.1 branches on that measurement, so it is recorded here.

**Impact:** Without the baseline there is no way to prove any later story left Platinum unchanged; without the cap measurement 2.1 cannot choose between deleting the cap rules and re-rendering them as spans.

## Steps

### 1: Collect the story ids

Start Storybook (`pnpm storybook`, background; note the port). `curl -s http://localhost:<port>/index.json | python3 -I -c 'import json,sys; [print(k) for k in json.load(sys.stdin)["entries"]]'` and keep every id whose title starts with Desktop/Window, Desktop/WindowFrame, Desktop/Desktop, Desktop/MenuBar, Desktop/Menu, Desktop/ControlStrip, Desktop/DesktopIcon, Dialogs/Alert, Controls/PopUpMenu, Controls/ComboBox, Controls/BevelButton, Controls/Placard, Controls/FileInput, Controls/Kbd, Controls/Slider, Controls/Tabs, Controls/PopUpSlider, Controls/Icon, Controls/ColorPicker, System/PixelArt → `.playwright-mcp/parity/part-E/stories.txt`.

### 2: Shoot the before set

Playwright MCP: for each id open `iframe.html?id=<id>&viewMode=story` at 1024×768, wait for networkidle + 500 ms, screenshot to `.playwright-mcp/parity/part-E/before/<id>.png`; `ls before | wc -l` equals the line count of stories.txt.

### 3: Measure the stripe caps

On `desktop-window--default` run `browser_evaluate` with `(() => { const el = document.querySelector('.classicyWindowActive .classicyWindowTitleLeft'); return [getComputedStyle(el, '::before').height, getComputedStyle(el, '::after').height]; })()`. Record the result in `.playwright-mcp/parity/part-E/caps.txt`. Expected `["0px","0px"]` (a `content: " "` block collapses to zero height, so the cap art never paints); then 2.1 Step 4 deletes the cap rules and no cap art is registered. If either value is non-zero, 2.1 Step 4 instead renders caps as spans (fallback spelled out there).

### 4: No commit

The screenshots live under the gitignored `.playwright-mcp/`; nothing is committed.

## Acceptance Criteria

- [ ] VERIFY: ls .playwright-mcp/parity/part-E/before | wc -l  # equals wc -l stories.txt; cat caps.txt

## Files

- `.playwright-mcp/parity/part-E/stories.txt` - create: the parity story id list
- `.playwright-mcp/parity/part-E/before/` - create: before screenshots
- `.playwright-mcp/parity/part-E/caps.txt` - create: measured cap pseudo-element heights

## Work Log
### 2026-10-29T20:22:00.352Z - Moved 2 open [MANUAL] acceptance criteria to the program V&V ticket 0083-v8n (human verification and validation), where it is tracked and ticked. This story now closes on its automated criteria; 0083-v8n links back with `depends`.
