---
id: 0168-3iv
title: 'System 7 1.1: Per-theme asset variants'
purpose: Plan 0018-dbd section 1.1.
type: feat
status: complete
priority: "2"
effort: M
created: "2026-11-11T15:12:04.431Z"
updated: "2026-11-11T16:18:46.036Z"
started: "2026-11-11T16:18:42.385Z"
completed: "2026-11-11T16:18:46.036Z"
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
---

# System 7 1.1: Per-theme asset variants

## Problem Statement

Plan 0018-dbd §1.1 (Per-theme asset variants). Design: plan 0017-6me. Interfaces: {"produces": "`registerClassicyAssets(kind, packageId, tree, options?: { variant?: string })`; `ClassicyTheme.assetVariant?: string`; resolution: active package's variant tree (the active theme's `assetVariant`) \u2192 its base tree \u2192 default package. `useClassicyAsset`, `useClassicyAssetTree`, `resolveClassicyAsset` and the published `--classicy-art-*`/`--classicy-cursor-*` variables follow it."}

**Impact:** Part of the System 7 Appearance Package.

## Steps

### 1: Failing tests

variant leaf wins over base; base fills a key the variant lacks; default package fills a key the package lacks; switching theme switches art and published variables; `assetVariant` survives persistence, custom-theme fork, theme file export/import (schema); an unregistered variant warns once and uses the base tree.

### 2: Implement, then confirm Platinum parity AE 0 and the suites

Command: `pnpm exec vitest run src/Appearance src/SystemFolder/ControlPanels/AppearanceManager`

### 3: Commit

Command: `git commit -m "feat(appearance): themes can select an asset variant of their package"`

## Acceptance Criteria

- [x] VERIFY: The section's tests pass, Platinum parity stays AE 0 where the section touches the core or Platinum, and lint and tsc are clean.

## Files

- `src/Appearance/ClassicyAssetRegistry.ts` - modify
- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeSchema.ts` - modify
- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeFile.ts` - modify
- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyCustomTheme.ts` - modify
- `src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.tsx` - modify

## Work Log
