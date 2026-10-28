---
id: 0018-0zn
title: 'C 0: Parity baseline'
purpose: Capture the before-state screenshots of every surface Part C touches so the final pixel-identity gate has a reference.
type: chor
status: pending
priority: "2"
effort: XS
created: "2026-10-28T19:59:21.641Z"
updated: "2026-10-28T19:59:21.641Z"
links:
  repo:
    local: ~/classicy
    files:
      - .playwright-mcp/parity/part-C/stories.txt
      - .playwright-mcp/parity/part-C/before
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
  plans:
    - ["0007-1sl", "included", ["0"]]
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

# C 0: Parity baseline

## Problem Statement

Plan 0007-1sl (umbrella 0002-ldj, audit §9 Phase 3) rewrites how icons, cursors, wallpapers, fonts and system art reach the screen. The umbrella plan requires every part to re-shoot its own parity baseline on its first day and end pixel-identical for Platinum. This story shoots the 18 Storybook titles Part C touches (desktop, window, menu bar, alias badge, help button, QuickTime controls, split view, crash and startup screens, and the rest) at 1024×768 into `.playwright-mcp/parity/part-C/before/` (gitignored), nothing is committed.

**Impact:** Without the baseline, story C 6.1 has nothing to compare against and a regression in any converted asset read (wrong icon, missing font, moved badge) would ship unnoticed.

## Steps

### 1: Start Storybook

`pnpm storybook` in the background (storybook/package.json: port 6006); wait for "Storybook … started".

### 2: Collect the story ids

`curl -s http://localhost:6006/index.json | python3 -I -c 'import json,sys; d=json.load(sys.stdin)["entries"]; print("\n".join(k for k,v in d.items() if v["type"]=="story" and v["title"] in {"Desktop/Desktop","Desktop/DesktopIcon","Desktop/MenuBar","Desktop/Window","Desktop/WindowFrame","Desktop/Menu","Desktop/AboutWindow","Dialogs/Alert","Controls/HelpButton","Controls/QuickTime","Controls/SplitView","Controls/Table","Controls/LittleArrows","Controls/PopUpMenu","Controls/Slider","Controls/Tabs","System/CrashScreen","System/StartupScreen"}))' > .playwright-mcp/parity/part-C/stories.txt` (create the directory first).

### 3: Shoot every story

Playwright: for each id open `http://localhost:6006/iframe.html?id=<id>&viewMode=story` at 1024×768, wait for networkidle + 500 ms, save `.playwright-mcp/parity/part-C/before/<id>.png`.

### 4: Check the count

`ls .playwright-mcp/parity/part-C/before | wc -l` equals `wc -l < stories.txt`. No commit.

## Acceptance Criteria

- [ ] VERIFY: ls .playwright-mcp/parity/part-C/before/*.png | wc -l  # equals the line count of stories.txt
- [ ] `stories.txt` lists one id per story under the 18 titles named in step 2 and every id has a PNG at 1024×768.
- [ ] Nothing is committed; `.playwright-mcp/` stays gitignored.

## Files

- `.playwright-mcp/parity/part-C/stories.txt` - story ids to shoot
- `.playwright-mcp/parity/part-C/before` - baseline screenshots

## Work Log
