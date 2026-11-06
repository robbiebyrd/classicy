---
id: 0147-qyy
title: A saved defaults reference to a package the host dropped stays pending, so the drawn package renders without its look-only knobs
purpose: A host that removes an Appearance Package still gets the drawn package's defaults on returning sessions.
type: bugs
status: complete
priority: "3"
effort: S
created: "2026-11-06T04:21:29.726Z"
updated: "2026-11-06T07:32:33.344Z"
started: "2026-11-06T05:13:18.857Z"
completed: "2026-11-06T07:32:33.344Z"
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

- [x] VERIFY: A dropped package's saved defaults reference heals to the drawn package's defaults; a dropped package's preset reference stays pending; old saves load unchanged.
- [x] VERIFY: Full gate green.

## Files

- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyBuiltInThemes.internal.ts` - defaults flag on saved built-in references

## Work Log

### 2026-11-06T07:32:12.296Z - Landed at 42c798ef1 as a stack 0148/0147 (9ec24d9f0, 084162667, 9cd044a2d) then 0143 (d442d5f15..757d567da, plus 42c798ef1 restoring 0147's CLAUDE.md sentences after the doc conflict) on f86f7ac35. Stacked gate: 476 files / 6668 tests, GATE_EXIT=0. Controller parity (static build + example dev server) against platinum-split/before-svgo (the tip carries 0146): 445/445 AE 0. Saved defaults references carry defaults: true; a dropped package's reference heals to the drawn package's defaults; preset references byte-identical.
