---
id: 0059-2t4
title: 'F 0: Parity baseline'
purpose: Capture before-screenshots of every surface Part F rearranges and confirm Part A's part attributes are in place, so the arrangement slots can be proven pixel-identical for Platinum.
type: chor
status: pending
priority: "2"
effort: S
created: "2026-10-28T20:28:20.890Z"
updated: "2026-10-28T20:28:20.890Z"
links:
  repo:
    local: ~/classicy
    files:
      - .playwright-mcp/parity/part-F/stories.txt
      - .playwright-mcp/parity/part-F/before/
      - .playwright-mcp/parity/part-F/attributes.txt
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
  stories:
    - ["0009-pat", "depends"]
    - ["0041-dyu", "depends"]
  plans:
    - ["0010-743", "included", ["0"]]
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

# F 0: Parity baseline

## Problem Statement

Part F (plan 0010-743, audit §9 Phase 5 item 6 / §8.8 / D21 under umbrella 0002-ldj) converts the menu bar's floats to flex + `order`, makes window control boxes, alert parts, Disclosure labels and Tabs strips orderable, rewrites the resize math and adds a window-level menu bar slot. Platinum declares today's values and must render pixel-identical, so every affected Storybook story needs a `before/` screenshot first.

The section rewrites also depend on Part A's `data-classicy-part`, `data-classicy-control` and `data-classicy-role` attributes; this story records where they landed so the consuming sections know whether to add any that are missing.

**Impact:** Without the baseline no later Part F story can prove it left Platinum unchanged; without the attribute inventory sections 2.1, 3.1 and 6.1 cannot tell which attributes they must still add.

## Steps

### 1: Collect the story ids

Start Storybook (`pnpm storybook`, background; note the port). From `index.json` keep every id whose title starts with Desktop/Window, Desktop/Desktop, Desktop/MenuBar, Desktop/MenuBar/Extension, Desktop/DesktopIcon, Desktop/App, Dialogs/Alert, Controls/Tabs, Controls/Disclosure → `.playwright-mcp/parity/part-F/stories.txt`.

### 2: Shoot the before set

Playwright MCP: open each `iframe.html?id=<id>&viewMode=story` at 1024×768, wait networkidle + 500 ms, save `.playwright-mcp/parity/part-F/before/<id>.png`; `ls before | wc -l` equals the line count of stories.txt.

### 3: Attribute gate

`git grep -n 'data-classicy-part' src/SystemFolder/SystemResources/Desktop/MenuBar src/SystemFolder/SystemResources/Menu` and `git grep -n 'data-classicy-control\|data-classicy-role' src/SystemFolder/SystemResources/Window src/SystemFolder/SystemResources/Alert` must show Part A's six cluster parts, three control attributes and the alert role attribute. Record the hits in `.playwright-mcp/parity/part-F/attributes.txt`; a missing one is added by the section that consumes it (2.1 Step 4, 3.1 Step 3, 6.1 Step 3).

### 4: No commit

Everything lives under the gitignored `.playwright-mcp/`; nothing is committed.

## Acceptance Criteria

- [ ] VERIFY: ls .playwright-mcp/parity/part-F/before | wc -l  # equals wc -l stories.txt
- [ ] [MANUAL] `stories.txt` lists every story under the nine title prefixes and `before/` holds one 1024×768 PNG per id.
- [ ] [MANUAL] `attributes.txt` records the grep hits for the six cluster parts, three control attributes and the alert role attribute (or notes which are missing).

## Files

- `.playwright-mcp/parity/part-F/stories.txt` - create: the parity story id list
- `.playwright-mcp/parity/part-F/before/` - create: before screenshots
- `.playwright-mcp/parity/part-F/attributes.txt` - create: Part A attribute inventory

## Work Log
