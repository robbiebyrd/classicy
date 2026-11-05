---
id: 0130-rpe
title: '0015 §3.2: Root consumers and the lint gates follow the move'
purpose: Execute plan 0015-kxa section 3.2.
type: task
status: ready
priority: "1"
effort: M
created: "2026-11-05T19:54:52.288Z"
updated: "2026-11-05T20:26:28.685Z"
tags: []
milestone: ""
due_date: ""
planned_start: ""
planned_end: ""
order: 0
links:
  repo:
    local: ~/classicy
  stories:
    - ["0129-00o", "depends"]
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
---

# 0015 §3.2: Root consumers and the lint gates follow the move

## Problem Statement

Plan 0015-kxa section 3.2 (Extract Platinum into packages/appearance/platinum): Root consumers and the lint gates follow the move. The plan section holds the interfaces and exact steps; this story tracks its execution (implementer → review → fix → controller verification → land on feat/AppearancePackages).

**Produces:** Root tests, Storybook and the example import `@classicy/appearance-platinum` (aliased to `packages/appearance/platinum/src/index.ts` in vitest, Storybook and the example's live-source dev server; a workspace dependency for the example's production build). The pixel-literal gate, the literal-color sweep and varCoverage scan `src/` and `packages/appearance/*/src/`.

## Steps

### 1: Write the failing gate tests first

`check-pixel-literals.test.ts` and `classicyLiteralColorSweep.test.ts`: a fixture package dir under `packages/appearance/<x>/src` with a bare `12px` / literal `#fff` is reported (today it is skipped silently); varCoverage includes Platinum's SCSS reads (assert a known Platinum-only read, e.g. `--menu-frame-shadow-width`, is in the scanned set).

### 2: Extend the scan roots

`check-pixel-literals.ts:217,892` and `classicyLiteralColorSweep.ts:157` scan `src` plus each `packages/appearance/*/src`; `PACKAGE_FILE` (`classicyLiteralColorSweep.ts:114`) matches `packages/appearance/<pkg>/src/` too; `multiplier-allowlist.json` keys move to the new paths.

### 3: Point every root consumer at the package

`withPlatinum.ts` imports `@classicy/appearance-platinum`; the 52 root test/story files that import `@/Appearance/Platinum…` switch to the package specifier (JSON/sound subpaths become the package's named exports); the ~25 path-reading tests (list in the 0014-ahm research: `ClassicyIcon.art.test.ts:21`, `ClassicyWindow.art.test.ts:26-27,228,317`, `ClassicyMenu.art.test.ts:29-30`, `ClassicyWindow.cascade.test.ts:146`, `ClassicyControlStrip.test.tsx:475`, `ClassicyStateClasses.*`, `ClassicyLiteralColors.test.ts`, `ClassicyCascade.repo.test.ts:153`, `ClassicyPackageExports.test.ts`, `bin/classicyLiteralColorSweep.test.ts:207,239-240`, …) read `packages/appearance/platinum/src/…`. Storybook: `preview.tsx`, `RenamedPackage.ts`, `ClassicyAppearanceProbe.tsx` import the package; `mirrored.scss:15-42` `@use`s `pkg:@classicy/appearance-platinum/scss/…`. Example: depends on `"@classicy/appearance-platinum": "workspace:*"` and imports it in `app.tsx`.

### 4: Run the gate

Run the gate Command: `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm storybook:typecheck && node bin/generate-vocabulary.ts --check && node bin/classicyLiteralColorSweep.ts && pnpm test --maxWorkers=3 && pnpm build:source && pnpm build:storybook && pnpm --filter classicy-example build`

### 5: Commit

Conventional commit(s) ending with the session trailers; confirm the branch and `git diff --cached` first. Command: `git commit -m "refactor: the core's tests, Storybook and the example load Platinum as a package"`

## Acceptance Criteria

- [ ] VERIFY: `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm storybook:typecheck && node bin/generate-vocabulary.ts --check && node bin/classicyLiteralColorSweep.ts && pnpm test --maxWorkers=3 && pnpm build:source && pnpm build:storybook && pnpm --filter classicy-example build` passes.
- [ ] VERIFY: Reviewed with no open finding at or above 70 confidence, verified by the controller, and landed on feat/AppearancePackages with the full gate green.

## Files

- `vitest.config.ts` - modify
- `tsconfig.json` - modify
- `storybook/tsconfig.json` - modify
- `storybook/.storybook/main.ts` - modify
- `storybook/.storybook/preview.tsx` - modify
- `storybook/.storybook/RenamedPackage.ts` - modify
- `storybook/.storybook/ClassicyAppearanceProbe.tsx` - modify
- `storybook/.storybook/mirrored.scss` - modify
- `example/package.json` - modify
- `example/src/app.tsx` - modify
- `bin/check-pixel-literals.ts` - modify
- `bin/classicyLiteralColorSweep.ts` - modify
- `bin/multiplier-allowlist.json` - modify
- `src/Appearance/ClassicyAppearance.varCoverage.test.ts` - modify
- `src/__tests__/withPlatinum.ts` - modify
- `package.json` - modify

## Work Log
