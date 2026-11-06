---
id: 0042-pbp
title: 'I 0: Parity baseline'
purpose: Capture before-screenshots of every Storybook story so Part I's hook wiring and feedback moves can be proven pixel-identical for Platinum.
type: chor
status: complete
priority: "2"
effort: S
created: "2026-10-28T20:15:36.352Z"
updated: "2026-10-30T00:37:01.327Z"
started: "2026-10-30T00:24:14.913Z"
completed: "2026-10-30T00:37:01.327Z"
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
      - .playwright-mcp/parity/part-i/stories.txt
      - .playwright-mcp/parity/part-i/before/
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
  stories:
    - ["0083-v8n", "blocks"]
    - ["0041-dyu", "depends"]
  plans:
    - ["0006-dy6", "included", ["0"]]
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

# I 0: Parity baseline

## Problem Statement

Part I (plan 0006-dy6, audit §9 Phase 7 under umbrella 0002-ldj) wires `useClassicyAppearance` into 24 component roots and moves Platinum feedback (sounds, the menu-item flash) into package hooks. None of that may change a pixel of the Platinum look, so the full Storybook story set is photographed before the first wiring commit, with the same procedure as plan 0001-1t9 (`iframe.html?id=<id>&viewMode=story` at 1024×768, ImageMagick `compare -metric AE`). Output lives under the gitignored `.playwright-mcp/parity/part-i/`.

**Impact:** Without a before set, the per-group parity checks in 2.1-2.3 and 3.2 and the final gate in Phase 5 have nothing to compare against, and an attribute or style leaked by the hook would go unnoticed.

## Steps

### 1: Start Storybook

Start Storybook in the background with `pnpm storybook`; note the port.

### 2: Collect every story id

`curl -s http://localhost:<port>/index.json | python3 -I -c 'import json,sys; d=json.load(sys.stdin); print("\n".join(sorted(e["id"] for e in d["entries"].values() if e["type"]=="story")))' > .playwright-mcp/parity/part-i/stories.txt` (the full set).

### 3: Shoot the before set

Playwright: each `iframe.html?id=<id>&viewMode=story` at 1024×768, networkidle + 500 ms → `.playwright-mcp/parity/part-i/before/<id>.png`.

### 4: Verify the count

`ls .playwright-mcp/parity/part-i/before | wc -l` equals the story count. No commit.

## Acceptance Criteria

- [x] VERIFY: test "$(ls .playwright-mcp/parity/part-i/before | wc -l)" -eq "$(wc -l < .playwright-mcp/parity/part-i/stories.txt)"
- [x] stories.txt lists every story id from Storybook's index.json (the full set).

## Files

- `.playwright-mcp/parity/part-i/stories.txt` - created: full story id list
- `.playwright-mcp/parity/part-i/before/` - created: one PNG per story id

## Work Log
### 2026-10-29T20:22:00.352Z - Moved one open [MANUAL] acceptance criterion to the program V&V ticket 0083-v8n (human verification and validation), where it is tracked and ticked. This story now closes on its automated criteria; 0083-v8n links back with `depends`.

### 2026-10-30T00:36:47.308Z - Done: .playwright-mcp/parity/part-i/ holds the full set: 302 ids, identical to the story entries in the shared post-B baseline's Storybook index.json (commit 29a15c243). The PNGs are hard-linked from post-b/before. 302 PNGs = 302 lines.
