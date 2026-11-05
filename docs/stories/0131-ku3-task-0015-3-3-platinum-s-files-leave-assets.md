---
id: 0131-ku3
title: '0015 §3.3: Platinum''s files leave assets/'
purpose: Execute plan 0015-kxa section 3.3.
type: task
status: pending
priority: "1"
effort: M
created: "2026-11-05T19:54:55.758Z"
updated: "2026-11-05T19:54:55.758Z"
tags: []
milestone: ""
due_date: ""
planned_start: ""
planned_end: ""
order: 0
links:
  repo:
    local: ~/classicy
  stories:
    - ["0130-rpe", "depends"]
  plans:
    - ["0015-kxa", "included"]
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
  "6":
    status: pending
---

# 0015 §3.3: Platinum's files leave assets/

## Problem Statement

Plan 0015-kxa section 3.3 (Extract Platinum into packages/appearance/platinum): Platinum's files leave assets/. The plan section holds the interfaces and exact steps; this story tracks its execution (implementer → review → fix → controller verification → land on feat/AppearancePackages).

**Produces:** Platinum's sound sprites, wallpapers and Platinum-only system-art/cursor files live under `packages/appearance/platinum/assets/` and are imported by Platinum directly. The core's `ClassicyIcons` tree loses the entries for moved files.

## Steps

### 1: Apply the rule and write the list down

For each candidate, a file moves only if nothing outside Platinum reads it (research: `system.apple`, `system.alias`, `system.desktop.trashEmpty/trashFull`, `ui.helpButton`, `ui.cursors.watch/resizeLr/resizeUd/resizeU/resizeD/resizeL/resizeR` move; `system.macosSvg` (ScreenSaverLogoRegistry.ts:129), `classicy.logo` (ScreenSaverLogoRegistry.ts:119, PlatinumTheme.ts:10), `ui.halftoneLarge` (BootSequence.tsx:63) and `ui.cursors.hand` (PDFViewerDocument.tsx:64) stay; check `assets/img/PlatinumClickLaunch.png` and the ten unregistered cursors, which are orphans if unread). Record the final table in the report.

### 2: Write the failing tests

An import-graph test: the core's static graph reaches no file under `packages/`; `ClassicyIcons` has no key for a moved file; Platinum's registration still provides every system-art key and cursor role it provided before (compare against a snapshot of `resolveClassicyAsset("systemArt", k)` keys taken before the move); `ClassicyIcons.test.ts:9,16-19,26-28`, `ClassicyHelpButton.test.tsx:37` and `useClassicyCursor.test.tsx:26` are rewritten to read the system-art/cursor registry.

### 3: Move with git mv

`assets/sounds/platinum/` → `packages/appearance/platinum/assets/sounds/platinum/` (`make_audio_sprites.sh` default path and the root `build:audio` script follow; `build:watchaudio` watches the new source); `assets/img/wallpapers/` (with `photos/`) → `packages/appearance/platinum/assets/wallpapers/`; the moved system-art and cursor files → `packages/appearance/platinum/assets/art/` or `assets/cursors/`; `assets/img/icons/control-panels/appearance-manager/platinum.png` is deleted (byte-identical to the icon moved in 1.5) and its icon-tree entry (`ClassicyIcons.ts:185`) removed.

### 4: Release note

Add a table to the release note, modeled on the README's "Seven icon paths are gone": each removed `ClassicyIcons` path and its replacement (`resolveClassicyAsset("systemArt", key)` / the cursor role). File a follow-up story for the `assets/img/ui/` orphans (`stripe.svg`, `tab.svg`, `halftone-small.png`, `menu-dropdown-arrows.svg`, `sad-mac.png`) and the unread cursors, which the core's eager glob still inlines.

### 5: Run the gate

Run the gate Command: `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm storybook:typecheck && node bin/generate-vocabulary.ts --check && node bin/classicyLiteralColorSweep.ts && pnpm test --maxWorkers=3 && pnpm build:source && pnpm build:storybook && pnpm --filter classicy-example build`

### 6: Commit

Conventional commit(s) ending with the session trailers; confirm the branch and `git diff --cached` first. Command: `git commit -m "refactor(platinum): Platinum's sounds, wallpapers and art move into its package"`

## Acceptance Criteria

- [ ] VERIFY: `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm storybook:typecheck && node bin/generate-vocabulary.ts --check && node bin/classicyLiteralColorSweep.ts && pnpm test --maxWorkers=3 && pnpm build:source && pnpm build:storybook && pnpm --filter classicy-example build` passes.
- [ ] VERIFY: Reviewed with no open finding at or above 70 confidence, verified by the controller, and landed on feat/AppearancePackages with the full gate green.

## Files

- `packages/appearance/platinum/assets/` - create (moved files)
- `packages/appearance/platinum/src/assets/sounds/platinum.ts` - modify
- `packages/appearance/platinum/src/assets/platinumWallpapers.ts` - modify
- `packages/appearance/platinum/src/assets/platinumAssets.ts` - modify
- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons.ts` - modify
- `bin/make_audio_sprites.sh` - modify
- `package.json` - modify
- `docs/RELEASE-NOTES-APPEARANCE-PACKAGES.md` - modify

## Work Log
