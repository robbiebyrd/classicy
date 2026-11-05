---
id: 0106-3xt
title: formControl knob family for the hidden file input's size
purpose: Give the hidden file input's size its own knob family instead of borrowing dialog's.
type: impr
status: complete
priority: "4"
effort: XS
created: "2026-11-05T00:58:51.943Z"
updated: "2026-11-05T00:59:16.797Z"
started: "2026-11-05T00:58:59.561Z"
completed: "2026-11-05T00:59:16.797Z"
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
      - src/Appearance/Platinum/platinum.json
      - src/SystemFolder/SystemResources/FileInput/ClassicyFileInput.scss
  plans:
    - ["0002-ldj", "included"]
progress:
  "1":
    status: complete
  "2":
    status: complete
---

# formControl knob family for the hidden file input's size

## Problem Statement

Owner decision 2026-11-04: move `dialog.fileInputHiddenSize` to a new family `formControl.fileInputHiddenSize` (`--form-control-file-input-hidden-size`). Unreleased, so no migration.

**Impact:** The file input read a dialog knob, so the family table misdescribed what it sizes.

## Steps

### 1: Implement

Move the knob in platinum.json, read it in ClassicyFileInput.scss, regenerate the themeVars baselines, update AGENT-REFERENCE's knob table and paragraph, the release note and the 0002-ldj amendment counts (21 families).

### 2: Land

Gate on the landing tree, land on feat/AppearancePackages and push.

## Acceptance Criteria

- [x] `--form-control-file-input-hidden-size` is 1px under Platinum, `--dialog-file-input-hidden-size` is gone, and the docs and 0002-ldj amendment count 21 families.
- [x] VERIFY: pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test --maxWorkers=3 && pnpm build:source

## Files

- `src/Appearance/Platinum/platinum.json`
- `src/SystemFolder/SystemResources/FileInput/ClassicyFileInput.scss`

## Work Log

### 2026-11-05T00:59:01.558Z - Owner decision 2026-11-04; implemented on fu/form-control from 98d5aedc6. Filed after the fact because the tracker was offline (MongoDB outage).

### 2026-11-05T00:59:13.383Z - Landed 98d5aedc6..726d344db, pushed: bb7de81fd knob move + baseline regeneration (21 in-place renames), 591ac0612 docs (21 families, 'the other 15'), 726d344db 0002-ldj amendment counts. Gate: 450 files / 5898 tests, all builds. Plan 0000-aud's '20 knob families' Done lines left as historical. Complete.
