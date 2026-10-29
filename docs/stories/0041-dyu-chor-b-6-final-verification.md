---
id: 0041-dyu
title: 'B 6: Final verification'
purpose: Run the full gate for Part B and prove every Storybook story is pixel-identical after the package extraction and the decorator change.
type: chor
status: complete
priority: "2"
effort: S
created: "2026-10-28T20:15:20.746Z"
updated: "2026-10-29T22:32:06.578Z"
started: "2026-10-29T21:44:56.938Z"
completed: "2026-10-29T22:32:06.578Z"
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
      - .playwright-mcp/parity/part-b/after/
      - dist/classicy.css
      - dist/classicy.es.js
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
  stories:
    - ["0083-v8n", "blocks"]
    - ["0040-gok", "depends"]
  plans:
    - ["0005-1b3", "included", ["6"]]
progress:
  "1":
    status: complete
  "2":
    status: complete
  "3":
    status: complete
  "4":
    status: complete
---

# B 6: Final verification

## Problem Statement

Plan 0005-1b3 Phase 6: Part B names no visual change (umbrella 0002-ldj: each part ends pixel-identical for Platinum), so the whole story set shot in B 0 must compare AE 0 after 5.1 — 4.3 Step 5 already compared once, but the Storybook decorator and the example exports changed since. The build gate also proves no camelCase Platinum mixin leaked into the base stylesheet and that the package layer ships in the bundle.

**Impact:** Without this gate a regression introduced by 5.1 (frame attribute, exports) would ship unnoticed, and part I's baseline (I 0) would start from a broken Platinum.

## Steps

### 1: Full lint, type-check and test gate

`pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test` → all PASS; record the test count.

### 2: Build and inspect the bundle

`pnpm build:source` → PASS; `grep -c 'platinum[A-Z]' dist/classicy.css` → 0 (no camelCase mixin leaked into base); `grep -c '@layer classicy.package' dist/classicy.es.js` ≥ 1.

### 3: Re-shoot and compare the full story set

Re-shoot every id in `.playwright-mcp/parity/part-b/stories.txt` into `.playwright-mcp/parity/part-b/after/` and compare: `for f in .playwright-mcp/parity/part-b/before/*.png; do compare -metric AE "$f" ".playwright-mcp/parity/part-b/after/$(basename $f)" null: 2>&1; echo " $f"; done | grep -v '^0 ' | wc -l` → 0 (AE 0 for every id).

### 4: Stop background servers

Stop the background Storybook / dev servers started by this plan.

## Acceptance Criteria

- [x] VERIFY: pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test && pnpm build:source
- [x] VERIFY: test "$(grep -c 'platinum[A-Z]' dist/classicy.css)" -eq 0 && grep -q '@layer classicy.package' dist/classicy.es.js
- [x] VERIFY: for f in .playwright-mcp/parity/part-b/before/*.png; do compare -metric AE "$f" ".playwright-mcp/parity/part-b/after/$(basename $f)" null: 2>&1; echo " $f"; done | grep -v '^0 ' | wc -l  # expect 0

## Files

- `.playwright-mcp/parity/part-b/after/` - created: after screenshots
- `dist/classicy.css` - inspected: no platinum camelCase mixin
- `dist/classicy.es.js` - inspected: package layer present

## Work Log
### 2026-10-29T20:22:00.352Z - Moved one open [MANUAL] acceptance criterion to the program V&V ticket 0083-v8n (human verification and validation), where it is tracked and ticked. This story now closes on its automated criteria; 0083-v8n links back with `depends`.

### 2026-10-29T21:44:58.965Z - Started on the integrated feat/appearance-part-b HEAD d46ece610 (4.3a, 4.3b, 4.3c ba391e984, and 5.1 cherry-picked as a900dae78/27a330356/d46ece610). The verification agent runs the full gate (lint, tsc, vitest --maxWorkers=3, build:source with invariants 7+8, the example and Storybook builds), the Phase 6 bundle greps, and full-set parity (302 screenshots, computed dumps, forced Chromium 67 and Firefox 6) into after-b6*. Verify-only: it fixes nothing and stops on any failure. The 4.3c review runs in parallel.

### 2026-10-29T22:32:05.694Z - B 6 verification on d46ece610: lint (727 files); tsc; vitest --maxWorkers=3 at 331 files / 3999 tests with no timeouts; build:source with verify:dist invariants 7 and 8; the example and Storybook builds; 0 `platinum[A-Z]` in dist/classicy.css; one `@layer classicy.package` block in each bundle. Parity into after-b6: 302/302 AE 0 (the plan's loop prints 0 non-zero lines), forced Chromium 67/67, Firefox 6/6. Computed dumps 297/302: the 5 SplitView divider `cursor` deltas come from 5.1's E-B4 StoryFrame asset vars, accepted as ruling R17, so computed-after-b6 is the post-B computed baseline. Servers stopped by PID. The report is saved by the controller as task-6-report.md. The 4.3c final round (tests and docs only) followed as 8fd1de682: lint, tsc, 275 tests. Complete.
