---
id: 0033-f4o
title: 'B 0: Parity baseline'
purpose: Capture before-screenshots of every Storybook story so Part B's package extraction can be proven pixel-identical for Platinum.
type: chor
status: pending
priority: "2"
effort: S
created: "2026-10-28T20:09:19.027Z"
updated: "2026-10-28T20:09:19.027Z"
links:
  repo:
    local: ~/classicy
    files:
      - .playwright-mcp/parity/part-b/stories.txt
      - .playwright-mcp/parity/part-b/before/
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
  stories:
    - ["0009-pat", "depends"]
  plans:
    - ["0005-1b3", "included", ["0"]]
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

# B 0: Parity baseline

## Problem Statement

Part B (plan 0005-1b3, audit §9 Phase 2 under umbrella 0002-ldj) moves every Platinum mixin, asset and preset out of Classicy's base stylesheets into a package whose CSS lives in a different cascade layer. The only acceptable visual outcome is zero changed pixels, so the full Storybook story set must be photographed before any file moves.

The parity procedure is the one plan 0001-1t9 established: `iframe.html?id=<id>&viewMode=story` at 1024×768, compared later with ImageMagick `compare -metric AE`. Output lives under the gitignored `.playwright-mcp/parity/part-b/`.

**Impact:** Without a before set, the look moves in 4.2 and 4.3 and the Storybook decorator change in 2.1 cannot be proven pixel-identical; every later parity step (4.2 Step 6, 4.3 Step 5, Phase 6) has nothing to compare against.

## Steps

### 1: Start Storybook

Start Storybook in the background with `pnpm storybook`; note the port it prints (normally 6006).

### 2: Collect every story id

`curl -s http://localhost:<port>/index.json | python3 -I -c 'import json,sys; d=json.load(sys.stdin); print("\n".join(sorted(e["id"] for e in d["entries"].values() if e["type"]=="story")))' > .playwright-mcp/parity/part-b/stories.txt` — the full set (every story, ~126 ids), not a subset.

### 3: Shoot the before set

Playwright: for each id open `http://localhost:<port>/iframe.html?id=<id>&viewMode=story` at 1024×768, wait for networkidle + 500 ms, save `.playwright-mcp/parity/part-b/before/<id>.png`.

### 4: Verify the count

`ls .playwright-mcp/parity/part-b/before | wc -l` equals `wc -l < .playwright-mcp/parity/part-b/stories.txt`. No commit (the directory is gitignored).

## Acceptance Criteria

- [ ] VERIFY: test "$(ls .playwright-mcp/parity/part-b/before | wc -l)" -eq "$(wc -l < .playwright-mcp/parity/part-b/stories.txt)"
- [ ] stories.txt lists every story id from Storybook's index.json (the full set, not a subset).
- [ ] [MANUAL] Each before PNG is a 1024×768 capture taken after networkidle + 500 ms.

## Files

- `.playwright-mcp/parity/part-b/stories.txt` - created: full story id list
- `.playwright-mcp/parity/part-b/before/` - created: one PNG per story id

## Work Log
