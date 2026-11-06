---
id: 0148-wf3
title: A host defaultState's theme tweaks are lost on the second session, or when the seeded package registers after mount
purpose: A host that customizes its first-session theme through defaultState keeps that look.
type: bugs
status: in_progress
priority: "2"
effort: S
created: "2026-11-06T04:52:43.682Z"
updated: "2026-11-06T05:13:21.082Z"
started: "2026-11-06T05:13:21.082Z"
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
      - src/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext.tsx
      - src/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils.tsx
      - src/SystemFolder/ControlPanels/AppearanceManager/ClassicyBuiltInThemes.internal.ts
progress:
  "1":
    status: pending
  "2":
    status: pending
---

# A host defaultState's theme tweaks are lost on the second session, or when the seeded package registers after mount

## Problem Statement

From 0127-qvl's J14 and J15 (2026-11-06). (J15) `ClassicyAppManagerProvider` merges `defaultState` only on a first session (not when hydrated from storage). Its `activeTheme` tweaks land on a built-in theme, and `sanitizeStateForPersistence` saves a built-in active theme as the reference `{ id, package }`, so the tweaks are dropped from storage; the second session loads the plain preset and the seed does not run again. (J14) A seed naming a `packageId` that registers only after the provider mounts gets no `withSeededPackageDefaults` swap at seed time; when that package registers, `drawnClassicyPackageDefaults` replaces the tweaked theme with the package's defaults.

**Impact:** A host's first-session look (icon size, desktop color) silently reverts on the second visit, or immediately with a lazily registered package.

## Steps

### 1: Failing tests

(a) Provider with `defaultState` tweaking `activeTheme.desktop.iconSize`; reload (fresh module graph with the saved localStorage): the tweak is still applied. (b) Seed `packageId: "foo"` plus tweaks, `foo` registered after mount: after registration the active theme is `foo`'s defaults with the tweaks.

### 2: Decide and fix

Choose: a tweaked seed theme is a custom theme (fork it, like the first edit of a built-in does, so it persists whole), or the seed is re-applied on every boot over the hydrated defaults while the user has not changed the theme. Prefer the fork; it reuses the custom-theme path and persistence. For J14, have the drawn-package rule carry the seed's tweaks, or fork at seed time so the rule never matches.

## Acceptance Criteria

- [ ] VERIFY: A host defaultState's theme tweaks survive a reload and a late-registering seeded package, and a user's later theme choice still wins.
- [ ] VERIFY: Full gate green.

## Files

- `src/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext.tsx` - seed tweaks persist

## Work Log
