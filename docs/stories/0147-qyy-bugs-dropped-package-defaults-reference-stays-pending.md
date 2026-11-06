---
id: 0147-qyy
title: A saved defaults reference to a package the host dropped stays pending, so the drawn package renders without its look-only knobs
purpose: A host that removes an Appearance Package still gets the drawn package's defaults on returning sessions.
type: bugs
status: in_progress
priority: "3"
effort: S
created: "2026-11-06T04:21:29.726Z"
updated: "2026-11-06T05:13:18.857Z"
started: "2026-11-06T05:13:18.857Z"
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
      - src/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils.tsx
progress:
  "1":
    status: pending
  "2":
    status: pending
---

# A saved defaults reference to a package the host dropped stays pending, so the drawn package renders without its look-only knobs

## Problem Statement

From 0127-qvl's J12 (2026-11-06). 0144's rule (`drawnClassicyPackageDefaults`) activates the drawn package's defaults when the active theme is another package Q's `defaults.id`. While Q is unregistered its defaults id is unknown, so only the core stand-in id under the default package counts. A session that ran with only `foo` saves `{ id: "foo-default", package: "foo" }`; if the host later drops `foo` (only Platinum registers), that reference stays pending forever and Platinum draws without its 11 look-only knobs and with no preset active.

**Impact:** Returning users of a host that removed a package see a degraded desktop until they pick a theme.

## Steps

### 1: Failing test

Seed a save `{ id: "foo-default", package: "foo" }` with only Platinum registered: the active theme must become Platinum's defaults, packageId unchanged, while a pending `foo-dark` (a preset) reference stays pending.

### 2: Record defaults-ness in the saved reference

When `sanitizeStateForPersistence` saves a built-in active theme as a reference, also record whether it is its package's defaults theme (for example `{ id, package, defaults: true }`), and let the rule treat such a pending reference as Q's defaults. Old saves without the flag keep today's behavior. Keep the theme-file and import paths unaffected.

## Acceptance Criteria

- [ ] VERIFY: A dropped package's saved defaults reference heals to the drawn package's defaults; a dropped package's preset reference stays pending; old saves load unchanged.
- [ ] VERIFY: Full gate green.

## Files

- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyBuiltInThemes.internal.ts` - defaults flag on saved built-in references

## Work Log
