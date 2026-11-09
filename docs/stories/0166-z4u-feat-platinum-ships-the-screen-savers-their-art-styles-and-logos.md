---
id: 0166-z4u
title: Platinum ships the screen savers, their art, styles and logos
purpose: Plan 0016-vbq section 2.1.
type: feat
status: complete
priority: "2"
effort: L
created: "2026-11-09T19:25:03.578Z"
updated: "2026-11-09T20:59:21.245Z"
started: "2026-11-09T20:59:18.025Z"
completed: "2026-11-09T20:59:21.244Z"
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

# Platinum ships the screen savers, their art, styles and logos

## Problem Statement

Plan 0016-vbq §2.1 (Move the savers, art, styles and logo registry into Platinum). Spec: docs/superpowers/specs/2026-11-09-screen-savers-in-appearance-packages-design.md. Interfaces: {"consumes": "1.2's `packages` field; the core's public exports (registerClassicyScreenSaver, ClassicySpinner, ClassicyPopUpMenu, resolveClassicyAsset, \u2026).", "produces": "`@classicy/appearance-platinum` exports every saver component, schema and options component under its current name, plus `registerClassicyScreenSaverLogo`, `unregisterClassicyScreenSaverLogo`, `getClassicyScreenSaverLogo`, `listClassicyScreenSaverLogos`, `useClassicyScreenSaverLogos`, `resolveClassicyScreenSaverLogo`, `CLASSICY_SCREEN_SAVER_LOGO_IDS`, `CLASSICY_SCREEN_SAVER_DEFAULT_LOGO_ID`, `ClassicyScreenSaverLogoDefinition` (`src: string | (() => string)`, resolved when the Logo saver draws). Every Platinum saver registers with `packages: [\"platinum\"]` before the package registers; the package declares `defaultScreenSaver: \"bouncing-ball\"`. Platinum's package.json gains `zod` at the core's range and the saver/logo registration modules in `sideEffects`."}

**Impact:** Part of moving the screen savers into the Appearance Package.

## Steps

### 1: Write the failing tests

`Platinum registers the twelve savers under platinum, with bouncing-ball as its default`; `the three built-in logos resolve, the classicy and startup-screen logos at draw time`; `no saver style sets animation-play-state or cursor` (scan the compiled `_screenSavers.scss` rules); in the core: `nothing src/index.ts reaches names a saver module, its art or a Platinum saver id` (extend ClassicyCoreImportGraph.test.ts).

### 2: Confirm they fail

Command: `pnpm exec vitest run src/ClassicyCoreImportGraph.test.ts && pnpm --filter @classicy/appearance-platinum exec vitest run src/screenSavers`

### 3: Move with `git mv`, rewrite `@/…` imports to `@classicy/classicy`, register in Platinum, move saver styles into `_screenSavers.scss` (included by platinum.scss outside the scope mixin), remove the core's BuiltIns import and saver sideEffects, regenerate barrels (`pnpm build:source` runs generate-barrels), move the saver stories next to the savers and widen Storybook's stories glob and tsconfig include

Move with `git mv`, rewrite `@/…` imports to `@classicy/classicy`, register in Platinum, move saver styles into `_screenSavers.scss` (included by platinum.scss outside the scope mixin), remove the core's BuiltIns import and saver sideEffects, regenerate barrels (`pnpm build:source` runs generate-barrels), move the saver stories next to the savers and widen Storybook's stories glob and tsconfig include

### 4: Confirm they pass, plus both packages' suites

Command: `pnpm test --maxWorkers=3`

### 5: Commit

Command: `git commit -m "feat(platinum): Platinum ships the screen savers"`

## Acceptance Criteria

- [x] VERIFY: The section's tests pass and `pnpm lint` and `pnpm exec tsc --noEmit -p .` are clean.

## Files

- `packages/appearance/platinum/src/screenSavers` - create
- `packages/appearance/platinum/src/styles/_screenSavers.scss` - create
- `src/SystemFolder/Extensions/ScreenSaver/savers` - delete
- `src/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaver.tsx` - modify
- `src/index.ts` - modify
- `package.json` - modify
- `packages/appearance/platinum/src/index.ts` - modify
- `packages/appearance/platinum/src/styles/platinum.scss` - modify
- `packages/appearance/platinum/package.json` - modify
- `storybook/.storybook/main.ts` - modify
- `storybook/tsconfig.json` - modify
- `packages/appearance/platinum/src/screenSavers/platinumScreenSavers.test.tsx` - modify
- `packages/appearance/platinum/src/screenSavers/platinumScreenSaverStyles.test.ts` - modify
- `src/ClassicyCoreImportGraph.test.ts` - modify

## Work Log
