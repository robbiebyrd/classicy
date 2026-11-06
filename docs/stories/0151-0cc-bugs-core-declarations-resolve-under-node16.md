---
id: 0151-0cc
title: '@classicy/classicy''s declarations yield no types under moduleResolution node16/nodenext'
purpose: Hosts on node16/nodenext module resolution get the core's types in 3.0.0.
type: bugs
status: ready
priority: "1"
effort: S
created: "2026-11-06T16:45:52.021Z"
updated: "2026-11-06T16:45:59.949Z"
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
      - vite.config.ts
      - bin/classicyDistTypes.ts
      - src/index.ts
progress:
  "1":
    status: pending
  "2":
    status: pending
---

# @classicy/classicy's declarations yield no types under moduleResolution node16/nodenext

## Problem Statement

From 0132-jsg's Fable review (2026-11-06, confidence 85; predates the branch). The core's `dist/types/src/index.d.ts` re-exports with extensionless relative specifiers (`export * from './…'`) in a `"type": "module"` package, and some barrel module names are dotted (`./…/ClassicyAppearanceManager.Colors`), which node16 reads as a `.Colors` extension. A host with `moduleResolution: node16` or `nodenext` (and `skipLibCheck: true`) gets `TS2305: Module '"@classicy/classicy"' has no exported member 'ClassicyTheme'` for every core name; `bundler` resolution works. Platinum's own half is fixed in 3.4 (0132).

**Impact:** TypeScript hosts on node16/nodenext resolution lose every Classicy type in 3.0.0.

## Steps

### 1: Host type-check test

A test that packs both packages (`pnpm pack`), extracts them into a scratch host with `@classicy/classicy` and `@classicy/appearance-platinum` in node_modules, and runs `tsc --noEmit` on a tiny host file (imports `ClassicyTheme`, `registerClassicyAppearancePackage`, `platinumAppearanceHooks`, `platinumJson`; assigns `platinumJson.presets[0]` to `ClassicyTheme`) under `moduleResolution: bundler` and `node16`; it fails today under node16.

### 2: Fix the emitted specifiers

Rewrite relative specifiers in the core's emitted declarations to `.js` (e.g. `vite-plugin-dts` `beforeWriteFile`, or `rewriteRelativeImportExtensions`-style source changes), including the dotted barrel module names; keep `verify:dist`'s dist/types checks green.

## Acceptance Criteria

- [ ] VERIFY: The host type-check test passes under both `bundler` and `node16`, and fails if the specifier rewrite is removed.
- [ ] VERIFY: Full gate green and both packages pack with their declarations.

## Files

- `vite.config.ts` - declaration specifiers with .js

## Work Log
