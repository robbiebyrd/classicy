---
id: 0001-cay
title: 'A 0: Parity baseline'
purpose: Capture the before-screenshots of every Controls, Desktop and Dialogs Storybook story so Part A's vocabulary and cascade changes can be proven pixel-identical.
type: chor
status: pending
priority: "2"
effort: S
created: "2026-10-28T19:45:58.778Z"
updated: "2026-10-28T19:45:58.778Z"
links:
  repo:
    local: ~/classicy
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
  plans:
    - ["0003-7x7", "included", ["0"]]
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

# A 0: Parity baseline

## Problem Statement

Part A (plan 0003-7x7, umbrella 0002-ldj) rewrites state classes, removes every `!important` and layers all component CSS. The umbrella plan's regression gate is screenshot parity (plan 0001-1t9 procedure: Storybook `iframe.html?id=<id>&viewMode=story` at 1024×768, ImageMagick `compare -metric AE`), and `.playwright-mcp/parity/` is gitignored, so each part re-shoots its own `before/` set on its first day.

This story records the baseline for every `Controls/*`, `Desktop/*` and `Dialogs/*` story — this part touches every component.

**Impact:** Without the baseline, A 6 cannot prove that the `!important` removal (4.1/4.2) and the `@layer` wrapping (5.1) changed no pixel; any regression would ship unnoticed.

## Steps

### 1: Start Storybook

`pnpm storybook` in the background; note the port it prints.

### 2: Collect the story ids

`curl -s http://localhost:<port>/index.json | python3 -I -c 'import json,sys; d=json.load(sys.stdin)["entries"]; [print(k) for k,v in d.items() if v["type"]=="story" and v["title"].split("/")[0] in ("Controls","Desktop","Dialogs")]' > .playwright-mcp/parity/part-A/stories.txt` (every Controls/*, Desktop/* and Dialogs/* story).

### 3: Shoot every story

Playwright: for each id open `http://localhost:<port>/iframe.html?id=<id>&viewMode=story` at 1024×768, wait for networkidle + 500 ms, save `.playwright-mcp/parity/part-A/before/<id>.png`.

### 4: Verify the count

`ls .playwright-mcp/parity/part-A/before | wc -l` equals `wc -l < .playwright-mcp/parity/part-A/stories.txt`. Record the count in the PR description. No commit.

## Acceptance Criteria

- [ ] VERIFY: ls .playwright-mcp/parity/part-A/before/*.png | wc -l  # equals the stories.txt line count
- [ ] [MANUAL] `.playwright-mcp/parity/part-A/stories.txt` lists every Controls/*, Desktop/* and Dialogs/* story id and each has a 1024×768 PNG under `before/`.
- [ ] No repo file changed and nothing was committed.

## Work Log
