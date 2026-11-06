---
id: 0125-gqb
title: '0015 §1.4: Wallpapers by filename, through the registry'
purpose: Execute plan 0015-kxa section 1.4.
type: task
status: complete
priority: "1"
effort: M
created: "2026-11-05T19:54:34.533Z"
updated: "2026-11-05T23:19:07.956Z"
started: "2026-11-05T20:25:52.696Z"
completed: "2026-11-05T23:19:07.956Z"
tags: []
milestone: ""
due_date: ""
planned_start: ""
planned_end: ""
order: 0
links:
  repo:
    local: ~/classicy
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
  "7":
    status: pending
---

# 0015 §1.4: Wallpapers by filename, through the registry

## Problem Statement

Plan 0015-kxa section 1.4 (Decouple the core from Platinum (Platinum stays in src/ for now)): Wallpapers by filename, through the registry. The plan section holds the interfaces and exact steps; this story tracks its execution (implementer → review → fix → controller verification → land on feat/AppearancePackages).

**Produces:** `registerClassicyWallpapers(packageId, list: Array<{ name: string; src: ClassicyAssetSource; file?: string }>)` (additive `file`). In `src/Appearance/ClassicyWallpaperIndex.ts` (store-free): `resolveClassicyWallpaper(value: string, packageId?: string): string` (`data:`/`blob:`/http(s)/`//` pass through; a registered filename or basename resolves to its source; unknown → `""` with one warning per value), `classicyWallpaperFilename(value: string): string | undefined` (filename for a registered filename, source URL or `data:` URI), `listClassicyWallpapers(packageId?: string): Array<{ file?: string; name: string; src: string }>`, `defaultClassicyWallpaper(packageId?: string): string` (the package's `default.png` entry, else its first, else `""`).

## Steps

### 1: Write the failing index tests

`ClassicyWallpaperIndex.test.ts`: register `{name:"Azul Dark", file:"azul_dark.png", src:"/x/azul_dark-abc.png"}`; `resolveClassicyWallpaper("azul_dark.png")` → `/x/azul_dark-abc.png`; `classicyWallpaperFilename("/x/azul_dark-abc.png")` → `azul_dark.png`; a `data:` URI equal to a registered source maps back to its filename; `https://example.com/a.png` passes through and has no filename; unknown `nope.png` → `""` and warns once; entries without `file` resolve by `name` only.

### 2: Implement the index and the additive `file`

Index rebuilt lazily on asset-registry change; `registerClassicyWallpapers` keeps keying the asset tree by `name` (the Desktop tab's labels) and records `file` in the index.

### 3: Move `ClassicyWallpapers.ts` into Platinum

`src/Appearance/Platinum/assets/platinumWallpapers.ts` owns the glob (still `assets/img/wallpapers/*` until 3.3) and the 47-entry `{label, file}` list; `platinumAssets.ts:73-76` registers with `file`. Delete the core module; every consumer (ClassicyAppearance.ts:17,345; ClassicyBuiltInThemes.internal.ts:19,78; ClassicyAppManagerUtils.tsx:23,106,115; ClassicyThemeFile.ts:22-24,63,80-81; ClassicyThemeSchema.ts:14,116; ClassicyAppearanceManager.tsx:68,111-112) switches to the index.

### 4: Persist filenames

Write failing tests first: `ClassicyDesktopChangeBackground` with a registered wallpaper's resolved URL stores its filename; `sanitizeStateForPersistence` writes filenames for registered wallpapers in `activeTheme` and `customThemes`; a user's `https://` URL is kept; the desktop still renders the image (every CSS read of `desktop.backgroundImage` resolves through `resolveClassicyWallpaper`). Then implement: the Desktop tab (Desktop.tsx:53-59,77-80) dispatches the filename; render-time resolution in the one place `--desktop-background-image` (or its equivalent) is built.

### 5: Migrate old saved values

`migrateClassicyState` gains a shape-detecting, idempotent step: a `backgroundImage` that `classicyWallpaperFilename` maps becomes the filename; one that does not map is left alone (the 1.2 registration heal retries it once its package registers). Review focus: a 2.1.x save whose `data:` URI matches no current wallpaper keeps its value and still renders.

### 6: Run the wallpaper, theme-file and migration suites

Run the wallpaper, theme-file and migration suites Command: `pnpm exec vitest run src/Appearance/ClassicyWallpaperIndex.test.ts src/SystemFolder/ControlPanels`

### 7: Commit

Conventional commit(s) ending with the session trailers; confirm the branch and `git diff --cached` first. Command: `git commit -m "refactor(appearance): wallpapers are persisted by filename and resolved through the registry"`

## Acceptance Criteria

- [x] VERIFY: `pnpm exec vitest run src/Appearance src/SystemFolder/ControlPanels` passes.
- [x] VERIFY: Reviewed with no open finding at or above 70 confidence, verified by the controller, and landed on feat/AppearancePackages with the full gate green.

## Files

- `src/Appearance/ClassicyWallpaperIndex.ts` - create
- `src/Appearance/ClassicyWallpaperIndex.test.ts` - create
- `src/Appearance/Platinum/assets/platinumWallpapers.ts` - create
- `src/Appearance/ClassicyAssetRegistry.ts` - modify
- `src/Appearance/Platinum/assets/platinumAssets.ts` - modify
- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.ts` - modify
- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyBuiltInThemes.internal.ts` - modify
- `src/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils.tsx` - modify
- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeFile.ts` - modify
- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeSchema.ts` - modify
- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.tsx` - modify
- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Desktop.tsx` - modify
- `src/SystemFolder/ControlPanels/AppManager/ClassicyStateMigrations.ts` - modify
- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyWallpapers.ts` - delete

## Work Log

### 2026-11-05T23:19:04.663Z - Landed 2026-11-05 at 2e8776646 on feat/AppearancePackages (pushed), rebased by its implementer onto stack A (18710eff6) with conflicts resolved file by file. Wallpapers are persisted and held by filename (resolved only in getThemeVars); registerClassicyWallpapers takes optional file and legacyDigests; ClassicyWallpaperIndex (resolve/filename/list/default, portable helpers); a 2.1.8 legacy digest table (46 inlined PNGs, pinned verbatim from the published tarball) maps old data: URIs to filenames after 3.3; bundler-hash strip (exactly 8 chars, not all-lowercase, paths only); case-insensitive pass-through; the Picture field accepts only absolute http(s). Reviews: 1 important + 4 minor, then 2 minor, all fixed; collision case filed as 0143-sdy. Gate at the tip: 465 files / 6417 tests, builds, exit 0.
