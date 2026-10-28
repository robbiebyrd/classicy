---
id: 0041-dyu
title: 'B 6: Final verification'
purpose: Run the full gate for Part B and prove every Storybook story is pixel-identical after the package extraction and the decorator change.
type: chor
status: pending
priority: "2"
effort: S
created: "2026-10-28T20:15:20.746Z"
updated: "2026-10-28T20:15:20.746Z"
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
    - ["0040-gok", "depends"]
  plans:
    - ["0005-1b3", "included", ["6"]]
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

- [ ] VERIFY: pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test && pnpm build:source
- [ ] VERIFY: test "$(grep -c 'platinum[A-Z]' dist/classicy.css)" -eq 0 && grep -q '@layer classicy.package' dist/classicy.es.js
- [ ] VERIFY: for f in .playwright-mcp/parity/part-b/before/*.png; do compare -metric AE "$f" ".playwright-mcp/parity/part-b/after/$(basename $f)" null: 2>&1; echo " $f"; done | grep -v '^0 ' | wc -l  # expect 0
- [ ] [MANUAL] Every story in stories.txt compares AE 0 before vs after; no background dev server is left running.

## Files

- `.playwright-mcp/parity/part-b/after/` - created: after screenshots
- `dist/classicy.css` - inspected: no platinum camelCase mixin
- `dist/classicy.es.js` - inspected: package layer present

## Work Log
