---
id: 0016-a5c
title: 'G 3.2: Icon-grid math reads --desktop-icon-*'
purpose: Make the desktop and Finder icon-grid math read `--desktop-icon-size`, `--desktop-icon-padding` and `--desktop-icon-cell` from CSS instead of bypassing the theme variables.
type: impr
status: pending
priority: "2"
effort: S
created: "2026-10-28T19:57:42.338Z"
updated: "2026-10-28T19:57:42.338Z"
links:
  repo:
    local: ~/classicy
    files:
      - src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconContext.tsx
      - src/SystemFolder/SystemResources/File/ClassicyFileBrowserUtils.ts
      - src/SystemFolder/SystemResources/File/ClassicyFileBrowser.tsx
      - src/SystemFolder/SystemResources/File/ClassicyFileBrowserViewIcons.tsx
      - src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconContext.test.ts
      - src/SystemFolder/SystemResources/File/ClassicyFileBrowserUtils.test.ts
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
  stories:
    - ["0015-uth", "depends"]
  plans:
    - ["0004-vqt", "included", ["3.2"]]
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

# G 3.2: Icon-grid math reads --desktop-icon-*

## Problem Statement

Audit §3.2: `getIconSize` (ClassicyDesktopIconContext.tsx:46-48), `iconGridLattice` (ClassicyFileBrowserUtils.ts:63-71) and ClassicyFileBrowser.tsx:231-233 read `theme.desktop.iconSize` for grid lattice math — legitimate (layout needs the number) but it bypasses the CSS var and diverges if a package sets icon size another way. With `readClassicyThemeVar` (G 3.1) and the `--desktop-icon-padding` / `--desktop-icon-cell` derivations (G 2.1), the JS reads the same values CSS lays out with, keeping the theme number as the fallback so behavior is identical whenever the desktop's inline vars equal the theme (always, today).

**Impact:** Part F's `desktop.iconGridOrigin` clean-up logic builds on `getIconSize`/`iconGridLattice`; a package that changes icon size through CSS would otherwise place icons on a grid the CSS does not draw.

## Steps

### 1: Write the failing tests

`src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconContext.test.ts` (add) and `src/SystemFolder/SystemResources/File/ClassicyFileBrowserUtils.test.ts` (create if absent): `it("getIconSize prefers the desktop's --desktop-icon-size over the theme number")` (mount `#classicyDesktop` with `--desktop-icon-size: 64px` and `--desktop-icon-padding: 16px`; `getIconSize(getTheme("default"))` toEqual `[64, 16]`); `it("getIconSize falls back to the theme without a desktop")` (`getIconSize(getTheme("default"))` toEqual `[48, 12]`); `it("iconGridLattice pitch reads --desktop-icon-cell")` (`--desktop-icon-cell: 80px` → pitch `[80, 80]`; origin `[padding, padding]`); `it("iconGridLattice with an override ignores the CSS cell")` (`iconGridLattice(theme, 32).pitch` toEqual `[64, 64]`).

### 2: Run them to verify they fail

`pnpm exec vitest run src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconContext.test.ts src/SystemFolder/SystemResources/File/ClassicyFileBrowserUtils.test.ts` — Expected: FAIL — `[48, 12]` returned despite the desktop vars.

### 3: Implement per Interfaces

`getIconSize(theme): [number, number]` keeps its signature and returns `[readClassicyThemeVar("--desktop-icon-size", theme.desktop.iconSize), readClassicyThemeVar("--desktop-icon-padding", theme.desktop.iconSize / 4)]`; `iconGridLattice(theme, iconSizeOverride?)` computes `step` as `iconSizeOverride !== undefined ? iconSizeOverride * 2 : readClassicyThemeVar("--desktop-icon-cell", themeIconSize * 2)`; `ClassicyFileBrowser.tsx:231-233` keeps the store selector (it is the fallback) and passes `readClassicyThemeVar("--desktop-icon-size", themeIconSize)` to `listViewIconSize`; the literal `18` fallback at :258 stays (documented as deliberate in the existing comment). Keep `getIconSize`'s export and signature so `ClassicyFileBrowserViewIcons.tsx:179` needs no change beyond the lattice.

### 4: Run tests to verify they pass

`pnpm exec vitest run src/SystemFolder/SystemResources/Desktop src/SystemFolder/SystemResources/File` — Expected: PASS (desktop clean-up and Finder icon-view tests unchanged).

### 5: Lint, type-check, commit

`pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`, then `git add -A src && git commit -m "refactor(icons): icon-grid math reads --desktop-icon-size/-padding/-cell"` with the trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

## Acceptance Criteria

- [ ] VERIFY: pnpm exec vitest run src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconContext.test.ts
- [ ] `getIconSize` returns the desktop's `--desktop-icon-size`/`--desktop-icon-padding` when present and `[48, 12]` from the default theme otherwise; `iconGridLattice` pitch follows `--desktop-icon-cell` unless an override is given.
- [ ] `ClassicyFileBrowser.tsx` keeps the literal `18` list-view fallback; existing desktop clean-up and Finder icon-view tests pass unchanged.

## Files

- `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconContext.tsx` - :46-48 getIconSize reads CSS vars with theme fallback
- `src/SystemFolder/SystemResources/File/ClassicyFileBrowserUtils.ts` - :63-71 iconGridLattice step from --desktop-icon-cell
- `src/SystemFolder/SystemResources/File/ClassicyFileBrowser.tsx` - :231-233 readClassicyThemeVar(--desktop-icon-size, themeIconSize); :252-258 unchanged
- `src/SystemFolder/SystemResources/File/ClassicyFileBrowserViewIcons.tsx` - :178-186 lattice only
- `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconContext.test.ts` - add two cases
- `src/SystemFolder/SystemResources/File/ClassicyFileBrowserUtils.test.ts` - add two cases (create if absent)

## Work Log
