---
id: 0162-mk7
title: Savers name packages; packages name a default saver
purpose: Plan 0016-vbq section 1.2.
type: feat
status: pending
priority: "2"
effort: M
created: "2026-11-09T19:24:36.020Z"
updated: "2026-11-09T19:24:36.020Z"
tags: []
milestone: ""
due_date: ""
planned_start: ""
planned_end: ""
order: 0
links:
  repo:
    local: ~/classicy
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

# Savers name packages; packages name a default saver

## Problem Statement

Plan 0016-vbq §1.2 (Savers name packages; packages name a default; offered resolution). Spec: docs/superpowers/specs/2026-11-09-screen-savers-in-appearance-packages-design.md. Interfaces: {"produces": "`ClassicyScreenSaverDefinition.packages?: readonly string[]`; `ClassicyAppearancePackage.defaultScreenSaver?: string` (schema: optional non-empty string). In ClassicyScreenSaverOffer.ts, all store-free: `isClassicyScreenSaverOffered(saver, packageId: string): boolean` (no `packages` or empty \u2192 true); `listClassicyScreenSaversFor(packageId: string): ClassicyScreenSaverDefinition[]` (offered, sorted by name like `listClassicyScreenSavers`); `resolveClassicyScreenSaverFor(packageId: string, selectedSaver?: string): ClassicyScreenSaverDefinition | undefined` (stored choice if offered, else the package's `defaultScreenSaver` if offered, else the first offered saver in registration order, else undefined); `activeClassicyScreenSaverPackageId(state?: ClassicyStore): string` (the resolved package id, via `getRegisteredClassicyAppearancePackageOrDefault(state.System.Manager.Appearance.packageId)?.id ?? CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID`). The registry gains a subscription (`subscribeClassicyScreenSavers`, `useClassicyScreenSavers`) if one does not exist, so UIs follow late registrations."}

**Impact:** Part of moving the screen savers into the Appearance Package.

## Steps

### 1: Write the failing tests

With fake savers and fake packages (`resetClassicyAppearancePackagesForTests`): `a saver naming no packages is offered under every package`; `a saver naming ["a"] is offered only under "a"`; `the stored choice wins when offered`; `the package default stands in when the stored choice belongs to another package, and the stored value is untouched`; `the first offered saver in registration order is used when neither is offered`; `a package offering none resolves to undefined`; `re-registering an id replaces its packages`; `a package whose defaultScreenSaver is unregistered logs one classicyLog warning and still registers`.

### 2: Confirm they fail

Command: `pnpm exec vitest run src/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaverOffer.test.ts`

### 3: Implement the fields, schema entry, warning and ClassicyScreenSaverOffer.ts

The warning is logged once per package id at `registerClassicyAppearancePackage` when `defaultScreenSaver` is set and no saver with that id is registered or offered under it (savers register before their package, as Platinum's assets do).

### 4: Confirm they pass, with the package-registry and schema suites

Command: `pnpm exec vitest run src/SystemFolder/Extensions/ScreenSaver src/Appearance`

### 5: Commit

Command: `git commit -m "feat(screen-saver): savers name the packages they are offered under"`

## Acceptance Criteria

- [ ] VERIFY: The section's tests pass and `pnpm lint` and `pnpm exec tsc --noEmit -p .` are clean.

## Files

- `src/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaverOffer.ts` - create
- `src/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaverRegistry.tsx` - modify
- `src/Appearance/ClassicyAppearancePackage.ts` - modify
- `src/Appearance/ClassicyAppearancePackageSchema.ts` - modify
- `src/Appearance/ClassicyAppearancePackageRegistry.ts` - modify
- `src/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaverOffer.test.ts` - modify

## Work Log
