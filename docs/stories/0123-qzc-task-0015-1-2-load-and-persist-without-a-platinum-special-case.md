---
id: 0123-qzc
title: '0015 §1.2: Load and persist without a Platinum special case'
purpose: Execute plan 0015-kxa section 1.2.
type: task
status: in_progress
priority: "1"
effort: M
created: "2026-11-05T19:54:10.591Z"
updated: "2026-11-05T23:19:29.008Z"
started: "2026-11-05T23:19:29.008Z"
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
    - ["0122-ieh", "depends"]
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
---

# 0015 §1.2: Load and persist without a Platinum special case

## Problem Statement

Plan 0015-kxa section 1.2 (Decouple the core from Platinum (Platinum stays in src/ for now)): Load and persist without a Platinum special case. The plan section holds the interfaces and exact steps; this story tracks its execution (implementer → review → fix → controller verification → land on feat/AppearancePackages).

**Produces:** Rule: no load/persist helper treats `"platinum"` as known unless it is registered. `knownClassicyThemePackage(id)` returns `getClassicyAppearancePackage(id)` only; `hasKnownClassicyThemePackage(theme)` is true only for a registered package (an absent `theme.package` still means `"platinum"`, which is then unknown until it registers).

## Steps

### 1: Write the failing load tests

`ClassicyLoadBeforePackage.test.ts`, each with Platinum NOT registered at module evaluation (seed `localStorage.classicyDesktopState`, `vi.resetModules()`, import the store, then `await import("@/Appearance/Platinum")`): (a) a saved built-in reference `{id:"bondi",package:"platinum"}` stays pending, logs no "falls back to defaults" warning, and after registration the active theme deep-equals Platinum's current `bondi` preset; (b) a saved Platinum custom theme with `desktop.backgroundImage: "azul_dark.png"` (a real wallpaper filename) and a knob override `{menuFrame:{shadowWidth:2}}` round-trips: before registration `sanitizeStateForPersistence` writes it whole (no stripped knobs, no blanked wallpaper); after registration the wallpaper resolves and the override survives; (c) review focus: importing Platinum twice (and re-registering, as HMR does) leaves exactly one package, one sound pack and an unchanged active theme.

### 2: Run them to see them fail

Today (a) resets to defaults, (b) blanks the wallpaper and strips the override. Command: `pnpm exec vitest run src/SystemFolder/ControlPanels/AppManager/ClassicyLoadBeforePackage.test.ts`

### 3: Remove the special cases

`ClassicyBuiltInThemes.internal.ts:49-55` (`knownClassicyThemePackage`), `ClassicyAppManagerUtils.tsx:125-128` (`hasKnownClassicyThemePackage`), `ClassicyThemeFile.ts:73-75` (`isClassicyAppearancePackageInstalled`: the default id counts only if registered), `ClassicyDesktopManager.tsx:353-358` (`ChangeAppearancePackage` resolves registered packages only), `useClassicyAppearance.ts:53-55` (falls back to `CLASSICY_FALLBACK_APPEARANCE_PACKAGE` for hooks only, never for theme data).

### 4: Heal wallpapers on registration

Extend `refreshActiveBuiltInTheme` (ClassicyAppManagerUtils.tsx:260-275) or add a sibling subscriber: when package P registers, run the wallpaper heal over the active theme and every `availableThemes`/`customThemes` entry whose `package` is P (through 1.4's `resolveClassicyWallpaper`), in one `setState`.

### 5: Run the tests, then the AppManager and AppearanceManager suites

Run the tests, then the AppManager and AppearanceManager suites Command: `pnpm exec vitest run src/SystemFolder/ControlPanels`

### 6: Commit

Conventional commit(s) ending with the session trailers; confirm the branch and `git diff --cached` first. Command: `git commit -m "fix(appearance): a package that registers after load refreshes its themes, Platinum included"`

## Acceptance Criteria

- [ ] VERIFY: `pnpm exec vitest run src/SystemFolder/ControlPanels/AppManager/ClassicyLoadBeforePackage.test.ts` passes.
- [ ] VERIFY: Reviewed with no open finding at or above 70 confidence, verified by the controller, and landed on feat/AppearancePackages with the full gate green.

## Files

- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyBuiltInThemes.internal.ts` - modify
- `src/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils.tsx` - modify
- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeFile.ts` - modify
- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyDesktopManager.tsx` - modify
- `src/Appearance/useClassicyAppearance.ts` - modify
- `src/SystemFolder/ControlPanels/AppManager/ClassicyLoadBeforePackage.test.ts` - test

## Work Log
