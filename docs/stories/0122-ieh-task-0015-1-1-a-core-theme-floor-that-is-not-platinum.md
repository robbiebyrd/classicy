---
id: 0122-ieh
title: '0015 §1.1: A core theme floor that is not Platinum'
purpose: Execute plan 0015-kxa section 1.1.
type: task
status: complete
priority: "1"
effort: M
created: "2026-11-05T19:54:07.578Z"
updated: "2026-11-05T23:36:28.146Z"
started: "2026-11-05T20:25:46.050Z"
completed: "2026-11-05T22:40:13.043Z"
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

- [x] VERIFY: `pnpm exec vitest run src/Appearance/ClassicyCoreTheme.test.ts && pnpm exec tsc --noEmit -p .` passes.
- [x] VERIFY: Reviewed with no open finding at or above 70 confidence, verified by the controller, and landed on feat/AppearancePackages with the full gate green.

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

### 2026-11-05T22:38:59.226Z - 1.1: CLASSICY_CORE_MEASUREMENT_DEFAULTS (core five + 84 structural knobs, pinned to AGENT-REFERENCE's table) and CLASSICY_CORE_DEFAULT_THEME; no platinum.json read in the core; getAllThemes/getTheme read registered packages; Platinum builds its own presets; J1 (knownClassicyThemePackage registered-only) and J2 (availableThemes [] by default) accepted. Review fixes: F1 first-session theme when Platinum registers before the store (defaultInitialState via withRefreshedActiveTheme), F2 the desktop loads built-in themes only once a package is registered. Rebased onto 1.3 with 9 test-import conflicts resolved by keeping both imports and 2 doc conflicts by 1.1's text with the rename reapplied. Landed 2026-11-05 on feat/AppearancePackages at 66481727b (pushed) as part of stack A (3.5 landed first; then 4.1, 1.3, 0120, 1.1 in one fast-forward). Stack landing gate at the top: 462 files / 6325 tests, lint, tsc, storybook:typecheck, vocabulary --check, color sweep, build:source + verify:dist (jsxDEV=0), build:storybook, example build, exit 0.

### 2026-11-05T23:36:28.146Z - Post-landing regression found 2026-11-05 by 1.5's parity check: `system-appearancemanager--options` (and @mid) differ from the 0.1 baseline by AE 1662 in the Control Strip under the Storybook-only Test Pack package. The cause is 1.1 removing the 11 look-only knobs from the core floor, so a package that reuses Platinum's Control Strip SCSS without declaring them lost those values. 1.1 was gated without a parity round. The fix is being made on fu/0126 (story 0126-orc) as a separate commit, with a guard test for undeclared knob reads in the Storybook packages. Process change: from here every landing that can affect rendering includes a parity round against platinum-split/before.
