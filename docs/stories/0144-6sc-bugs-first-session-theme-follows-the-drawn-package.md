---
id: 0144-6sc
title: A host whose only package is not Platinum draws it with the core stand-in theme
purpose: Make a first session with a non-Platinum package look like that package, once 1.6 drops the Platinum import.
type: bugs
status: in_progress
priority: "1"
effort: S
created: "2026-11-06T00:14:15.984Z"
updated: "2026-11-06T02:19:06.115Z"
started: "2026-11-06T02:19:06.115Z"
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
      - src/SystemFolder/ControlPanels/AppearanceManager/ClassicyBuiltInThemes.internal.ts
      - src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.ts
      - src/SystemFolder/ControlPanels/AppearanceManager/ClassicyCustomTheme.ts
progress:
  "1":
    status: pending
  "2":
    status: pending
---

# A host whose only package is not Platinum draws it with the core stand-in theme

## Problem Statement

From 0126-orc's review (2026-11-06, confidence 75). Not reachable while §1.5 still imports Platinum; reachable after plan 0015-kxa §1.6. On a first session with only package `foo` registered: `packageId` stays the seeded `"platinum"`, so the desktop draws `foo` through §1.5's first-registered step, but `activeTheme` stays `CLASSICY_CORE_DEFAULT_THEME` (`package: "platinum"`), and `refreshedClassicyActiveTheme` refreshes only a theme of a registered package, which "platinum" never is. `getThemeVars` then completes from the core floor alone (J2), so every look-only knob `foo`'s CSS reads is unset (the invalid-`var()` failure `StorybookPackageKnobs.test.ts` guards in Storybook), and a Theme Options knob edit validates against `foo`'s knobs but forks into Platinum's "custom" slot. No wrong bytes persist.

**Impact:** The first thing a non-Platinum host sees after 3.0.0 is its package drawn with missing bevels and borders.

## Steps

### 1: Failing test

With only a test package `foo` registered (no Platinum), a fresh store mounted under `ClassicyDesktop` must activate `foo`'s defaults theme: `getThemeVars(activeTheme)` emits every knob `foo`'s themes declare, and a `ClassicyDesktopChangeMetric` on a `foo` family forks into `custom-foo`.

### 2: Activate the drawn package's defaults

Controller's call (reviewer's suggestion): when the active theme is the core stand-in (`CLASSICY_CORE_DEFAULT_THEME`'s id, unedited) and the drawn package is not the theme's package, activate the drawn package's defaults, the same completion as a package switch, without writing `packageId`. Never replace a custom, host-loaded or user-chosen theme. Do it in the same place the store refreshes the stand-in when a package registers, so the order of store creation and registration does not matter.

## Acceptance Criteria

- [ ] VERIFY: With only `foo` registered, a first session draws `foo`'s defaults theme (every declared knob emitted), knob edits fork into `custom-foo`, `packageId` is unchanged, and a persisted custom or host theme is never replaced.
- [ ] VERIFY: Full gate green and a parity round against `platinum-split/before` is AE 0 except the known clock-colon @mid flake.

## Files

- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyBuiltInThemes.internal.ts` - refresh the core stand-in to the drawn package's defaults

## Work Log
