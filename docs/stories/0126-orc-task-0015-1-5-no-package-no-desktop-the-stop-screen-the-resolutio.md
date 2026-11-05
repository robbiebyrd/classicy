---
id: 0126-orc
title: '0015 §1.5: No package, no desktop: the stop screen, the resolution chain and the package icon'
purpose: Execute plan 0015-kxa section 1.5.
type: task
status: pending
priority: "1"
effort: M
created: "2026-11-05T19:54:37.968Z"
updated: "2026-11-05T19:54:37.968Z"
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
    - ["0123-qzc", "depends"]
    - ["0124-ln8", "depends"]
    - ["0125-gqb", "depends"]
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

# 0015 §1.5: No package, no desktop: the stop screen, the resolution chain and the package icon

## Problem Statement

Plan 0015-kxa section 1.5 (Decouple the core from Platinum (Platinum stays in src/ for now)): No package, no desktop: the stop screen, the resolution chain and the package icon. The plan section holds the interfaces and exact steps; this story tracks its execution (implementer → review → fix → controller verification → land on feat/AppearancePackages).

**Produces:** `ClassicyAppearancePackage.icon?: ClassicyAssetSource` (schema-validated, `.describe()`d). Resolution: `resolveClassicyAppearancePackage(id)` = registered `id` → registered `CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID` → first of `listClassicyAppearancePackages()` → `CLASSICY_FALLBACK_APPEARANCE_PACKAGE` (lone components only). `<ClassicyNoAppearancePackage />` (no props). `src/__tests__/withPlatinum.ts`: a side-effect module that imports Platinum, for tests that mount the desktop.

## Steps

### 1: Write the failing stop-screen tests

With no package registered, `<ClassicyDesktop>` renders `ClassicyNoAppearancePackage` and nothing else of the desktop (no menu bar, no icons, no windows, no Control Strip; `#classicyDesktop` absent); the text is exactly: heading "No Appearance Package is loaded", body "Classicy needs an Appearance Package to draw its desktop. Load one at your app's entry, for example:", and a code line `import "@classicy/appearance-platinum";`; `classicyLog("error","Appearance","No Appearance Package is registered; import \"@classicy/appearance-platinum\" (or another package) at your app's entry.")` is called once per page, not per render or remount; registering a package while the screen shows replaces it with the desktop (registry subscription); it is not `ClassicyCrashScreen` and renders no Sad Mac.

### 2: Write the failing resolution tests

Only `mirrored` registered: the desktop renders with `data-classicy-appearance="mirrored"` even when the persisted `packageId` is `"platinum"`; a persisted unregistered id with Platinum registered resolves to Platinum and logs once (today's behavior). Review focus: with only `mirrored` registered, icons resolve (the core's `ClassicyIcons` tree), cursors and system art resolve to `undefined` without throwing, and sound is silent.

### 3: Implement

`ClassicyDesktop.tsx:64-65` loses `import "@/Appearance/Platinum"`; the desktop branches to the stop screen when `useClassicyAppearancePackages().length === 0`. The stop screen must render with no package loaded, so it cannot rely on any package's look or on theme variables a package supplies. Style it in a base-layer `ClassicyNoAppearancePackage.scss` that passes the pixel-literal and literal-color gates: sizes from core-floor variables (`getThemeVars(CLASSICY_CORE_DEFAULT_THEME)` is applied by the desktop root even without a package) or unitless/relative units, and colors only from `--color-*` tokens of the core default theme. If that proves impossible for a color, use the CSS system colors `Canvas`/`CanvasText` and add that one declaration to the color sweep's listed exemptions with a reason. The asset registry's hard `"platinum"` fallback (`ClassicyAssetRegistry.ts:14,116,290,325-330`) becomes `CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID` (the core's icon tree still registers there).

### 4: Give packages an icon

Add `icon` to the type and schema; Platinum sets it to its `platinum.png` (moved from `AppearanceManager/resources/platinum.png` into `src/Appearance/Platinum/assets/art/`, and `verify:dist`'s art set updated); `ClassicyAppearanceManager.Themes.tsx:8,61-68` reads `pkg.icon` and shows a generic package glyph (an existing icon-tree entry; name it) when absent.

### 5: Make desktop tests load Platinum explicitly

Every test or story that mounts `ClassicyDesktop` and expects the Platinum look or sounds imports `@/__tests__/withPlatinum` (stories: `storybook/.storybook/preview.tsx` already imports Platinum). `src/__tests__/setup.ts` stays Platinum-free. Run the whole suite and fix each failure by adding the import, never by registering Platinum globally.

### 6: Run the full test suite

Run the full test suite Command: `pnpm test --maxWorkers=3`

### 7: Commit

Conventional commit(s) ending with the session trailers; confirm the branch and `git diff --cached` first. Command: `git commit -m "feat(desktop): stop and say so when no Appearance Package is loaded"`

## Acceptance Criteria

- [ ] VERIFY: `pnpm test --maxWorkers=3` passes.
- [ ] VERIFY: Reviewed with no open finding at or above 70 confidence, verified by the controller, and landed on feat/AppearancePackages with the full gate green.

## Files

- `src/SystemFolder/SystemResources/Desktop/ClassicyNoAppearancePackage.tsx` - create
- `src/SystemFolder/SystemResources/Desktop/ClassicyNoAppearancePackage.scss` - create
- `src/SystemFolder/SystemResources/Desktop/ClassicyNoAppearancePackage.test.tsx` - create
- `src/__tests__/withPlatinum.ts` - create
- `src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.tsx` - modify
- `src/Appearance/ClassicyAppearancePackage.ts` - modify
- `src/Appearance/ClassicyAppearancePackageSchema.ts` - modify
- `src/Appearance/ClassicyAppearancePackageRegistry.ts` - modify
- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Themes.tsx` - modify
- `src/Appearance/Platinum/index.ts` - modify
- `src/Appearance/ClassicyAssetRegistry.ts` - modify

## Work Log
