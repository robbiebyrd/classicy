---
id: 0122-ieh
title: '0015 §1.1: A core theme floor that is not Platinum'
purpose: Execute plan 0015-kxa section 1.1.
type: task
status: pending
priority: "1"
effort: M
created: "2026-11-05T19:54:07.578Z"
updated: "2026-11-05T19:54:07.578Z"
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
    - ["0121-e89", "depends"]
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

# 0015 §1.1: A core theme floor that is not Platinum

## Problem Statement

Plan 0015-kxa section 1.1 (Decouple the core from Platinum (Platinum stays in src/ for now)): A core theme floor that is not Platinum. The plan section holds the interfaces and exact steps; this story tracks its execution (implementer → review → fix → controller verification → land on feat/AppearancePackages).

**Produces:** `CLASSICY_CORE_MEASUREMENT_DEFAULTS: ClassicyThemeMeasurements` (frozen; the core five plus every structural knob, i.e. the 84 rows marked "Structural: yes" in AGENT-REFERENCE §8's knob-families table, ~:3599-3695) and `CLASSICY_CORE_DEFAULT_THEME: Readonly<ClassicyTheme>` (id `"default"`, `package: "platinum"`, Platinum's `defaults` colors/typography/layout values, `desktop.backgroundImage: ""`, measurements = the core floor), both in `src/Appearance/ClassicyCoreTheme.ts`. `getTheme(id, overrides?)` and `getAllThemes()` keep their signatures but read the registered packages' `defaults`/`presets` (registration order), falling back to `CLASSICY_CORE_DEFAULT_THEME`.

## Steps

### 1: Write the failing floor tests

`ClassicyCoreTheme.test.ts`: (1) every key of `CLASSICY_CORE_MEASUREMENT_DEFAULTS` equals `platinum.json` `defaults.measurements` at the same family/key (parity pin); (2) it holds the core five families exactly as `CLASSICY_DEFAULT_THEME_METRICS`; (3) it holds exactly the structural knobs: parse the AGENT-REFERENCE table's Structural column and compare sets, so the doc and the floor cannot drift; (4) none of the 11 look-only knobs (`controlStrip.bevelWidth`, `menuFrame.{borderWidth,bevelWidth,shadowWidth,shadowStart,shadowGap}`, `scrollbar.{thumbGripWidth,thumbGripHeight}`, `utilityTitleBar.{textureWidth,textureHeight}`, `quickTime.captionShadowBlur`) is in it; (5) `CLASSICY_CORE_DEFAULT_THEME` equals Platinum's `defaults` except `desktop.backgroundImage === ""` and the look-only knobs; (6) with no package registered (`resetClassicyAppearancePackagesForTests`), `getAllThemes()` is `[CLASSICY_CORE_DEFAULT_THEME]` and `getThemeVars(getTheme("default"))` emits every variable it emits today except the look-only knobs' `--<family>-<key>`. Command: `pnpm exec vitest run src/Appearance/ClassicyCoreTheme.test.ts`

### 2: Implement `ClassicyCoreTheme.ts`

Plain data plus a freeze; no import of `@/Appearance/Platinum` (an import-graph test in 1.6 enforces it). The values are copied, not read from `platinum.json`.

### 3: Point every `platinumJson` reader outside Platinum at the floor

`ClassicyThemeMetrics.ts:262-265` (`PLATINUM_MEASUREMENT_DEFAULTS` → `CLASSICY_CORE_MEASUREMENT_DEFAULTS`, keep `mergeMeasurementDefaults`/WeakMap caching), `ClassicyThemeDerivations.ts:47-49` (the `progressBar.stripeWidth` fallback), `ClassicyPopUpMenuPlacement.ts:72` (`maxHeightCap` default from `CLASSICY_CORE_MEASUREMENT_DEFAULTS.menu.popUpMaxHeight`), `ClassicyThemeMetricReader.ts:16`, `ClassicyAppearance.ts:337-357` (`resolvedThemes` goes; `getAllThemes`/`getTheme` read registered packages), `ClassicyAppearancePackageRegistry.ts:40-48` (`CLASSICY_FALLBACK_APPEARANCE_PACKAGE.defaults = CLASSICY_CORE_DEFAULT_THEME`, `presets: [CLASSICY_CORE_DEFAULT_THEME]`), `ClassicyAppManager.ts:665,668` (`DefaultAppManagerState` activeTheme = `CLASSICY_CORE_DEFAULT_THEME`, `availableThemes = getAllThemes()` evaluated lazily or `[]`; it is not persisted).

### 4: Make Platinum build its own themes

`src/Appearance/Platinum/index.ts:41-42` stops calling `getTheme`/`getAllThemes`: it builds `defaults` and `presets` from its own `platinum.json`, completing each with `withDefaultThemeMetrics(theme, classicyThemeMeasurementDefaults("platinum"))`-equivalent logic and resolving `desktop.backgroundImage` through its own wallpaper module (1.4 finishes the wallpaper half).

### 5: Update the "Platinum floor" sentences

CLAUDE.md:703, AGENT-REFERENCE :1684, :3476, :3568-3580, `ClassicyAppearanceManager.Options.tsx:89` and `Options.test.tsx:167`: the guarantee now comes from the core floor (`ClassicyCoreTheme.ts`).

### 6: Run the touched tests and the theming suites

Run the touched tests and the theming suites Command: `pnpm exec vitest run src/Appearance src/SystemFolder/ControlPanels/AppearanceManager src/SystemFolder/SystemResources/PopUpMenu`

### 7: Commit

Conventional commit(s) ending with the session trailers; confirm the branch and `git diff --cached` first. Command: `git commit -m "refactor(appearance): a core theme floor that is not Platinum"`

## Acceptance Criteria

- [ ] VERIFY: `pnpm exec vitest run src/Appearance/ClassicyCoreTheme.test.ts && pnpm exec tsc --noEmit -p .` passes.
- [ ] VERIFY: Reviewed with no open finding at or above 70 confidence, verified by the controller, and landed on feat/AppearancePackages with the full gate green.

## Files

- `src/Appearance/ClassicyCoreTheme.ts` - create
- `src/Appearance/ClassicyCoreTheme.test.ts` - create
- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetrics.ts` - modify
- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeDerivations.ts` - modify
- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.ts` - modify
- `src/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenuPlacement.ts` - modify
- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetricReader.ts` - modify
- `src/Appearance/ClassicyAppearancePackageRegistry.ts` - modify
- `src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.ts` - modify
- `src/Appearance/Platinum/index.ts` - modify
- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Options.tsx` - modify
- `docs/AGENT-REFERENCE.md` - modify
- `CLAUDE.md` - modify

## Work Log
