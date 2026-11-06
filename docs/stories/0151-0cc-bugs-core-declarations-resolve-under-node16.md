---
id: 0151-0cc
title: '@classicy/classicy''s declarations yield no types under moduleResolution node16/nodenext'
purpose: Hosts on node16/nodenext module resolution get the core's types in 3.0.0.
type: bugs
status: complete
priority: "1"
effort: S
created: "2026-11-06T16:45:52.021Z"
updated: "2026-11-06T17:47:40.581Z"
started: "2026-11-06T16:54:21.440Z"
completed: "2026-11-06T17:47:40.581Z"
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

- [x] VERIFY: The host type-check test passes under both `bundler` and `node16`, and fails if the specifier rewrite is removed.
- [x] VERIFY: Full gate green and both packages pack with their declarations.

## Files

- `vite.config.ts` - declaration specifiers with .js

## Work Log

### 2026-11-06T16:54:26.488Z - 2026-11-06 16:53: started at the owner's request in parallel with 3.4, based on fu/0132 at fc49bddc4 (it needs 3.4's separate packs and Platinum's declarations); rebases onto 3.4's final head, and reuses 3.4's bin/classicyDeclarationSpecifiers.ts for the core's half.

### 2026-11-06T17:47:32.794Z - Landed at a74125f67 (4 commits, rebased over tracker-only commits). The core's declarations get .js relative specifiers via 3.4's shared helper (which now skips comments and strings); verify:dist invariant 8 fails on any extensionless relative specifier; bin/check-host-types.ts (pnpm verify:host-types, end of build:source) packs both packages and type-checks a host under bundler, node16 and nodenext. Implementer gate 493 files / 7178 tests + Platinum 23/314; Fable review: ready to land (598 specifiers rewritten and resolving, host check not vacuous, CI-safe ~9 s, no files left behind). Its finding (the check links devDependency @types and uses skipLibCheck, masking @mdxeditor/editor and howler leaks) and the duplicated beforeWriteFile went to 0153 (priority 1).
