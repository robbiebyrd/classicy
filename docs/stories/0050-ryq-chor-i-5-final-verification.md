---
id: 0050-ryq
title: 'I 5: Final verification'
purpose: Run the full gate for Part I and prove every pre-existing Storybook story is pixel-identical after the hook wiring and the feedback moves.
type: chor
status: pending
priority: "2"
effort: S
created: "2026-10-28T20:20:53.774Z"
updated: "2026-10-28T20:20:53.774Z"
links:
  repo:
    local: ~/classicy
    files:
      - .playwright-mcp/parity/part-i/after/
      - dist/classicy.css
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
  stories:
    - ["0049-cdo", "depends"]
  plans:
    - ["0006-dy6", "included", ["5"]]
progress:
  "1":
    status: pending
  "2":
    status: pending
  "3":
    status: pending
  "4":
    status: pending
  "5":
    status: pending
---

# I 5: Final verification

## Problem Statement

Plan 0006-dy6 Phase 5: Part I names no visual change (umbrella 0002-ldj: each part ends pixel-identical for Platinum), so every id shot in I 0 must compare AE 0 after the wiring (2.1-2.3) and the feedback moves (3.1-3.2); the 23 new `--appearance-hooks` ids are additions checked by eye in 4.1. The gate also proves that no feedback sprite is dispatched from a component anymore (error beeps and the boot sound excepted) and that the menu flash keyframes ship in the Platinum css string, not in base.

**Impact:** Without this gate a regression from the per-group wiring (a leaked attribute or style) or from the docs/story commit would ship unnoticed, and parts E/F/H/J would build on a broken Platinum.

## Steps

### 1: Full lint, type-check and test gate

`pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test` → all PASS; record the count.

### 2: No feedback sprite left in component code

`grep -rn 'ClassicySoundPlay"' src/SystemFolder/SystemResources --include=*.tsx | grep -v test | grep -vE 'PlayError|ClassicyBoot'` → prints nothing (every feedback sprite now lives in src/Appearance/Platinum/hooks.ts).

### 3: Build and inspect the base stylesheet

`pnpm build:source` → PASS; `grep -c classicyMenuItemFlashKeyframes dist/classicy.css` → 0 (the keyframes ship in the Platinum css string, not in base).

### 4: Re-shoot and compare the full story set

Re-shoot every id in `.playwright-mcp/parity/part-i/stories.txt` into `.playwright-mcp/parity/part-i/after/` and compare: `for f in .playwright-mcp/parity/part-i/before/*.png; do compare -metric AE "$f" ".playwright-mcp/parity/part-i/after/$(basename $f)" null: 2>&1; echo " $f"; done | grep -v '^0 ' | wc -l` → 0; the 23 new `--appearance-hooks` ids are not in the list and were checked by eye in 4.1 Step 4.

### 5: Stop background servers

Stop the background Storybook / dev servers started by this plan.

## Acceptance Criteria

- [ ] VERIFY: pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test && pnpm build:source
- [ ] VERIFY: test "$(grep -rn 'ClassicySoundPlay\"' src/SystemFolder/SystemResources --include=*.tsx | grep -v test | grep -vE 'PlayError|ClassicyBoot' | wc -l)" -eq 0 && test "$(grep -c classicyMenuItemFlashKeyframes dist/classicy.css)" -eq 0
- [ ] VERIFY: for f in .playwright-mcp/parity/part-i/before/*.png; do compare -metric AE "$f" ".playwright-mcp/parity/part-i/after/$(basename $f)" null: 2>&1; echo " $f"; done | grep -v '^0 ' | wc -l  # expect 0
- [ ] [MANUAL] Every pre-existing story compares AE 0 before vs after; no background dev server is left running.

## Files

- `.playwright-mcp/parity/part-i/after/` - created: after screenshots
- `dist/classicy.css` - inspected: no flash keyframes in base

## Work Log
