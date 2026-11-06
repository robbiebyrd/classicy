---
id: 0132-jsg
title: '0015 §3.4: Two builds, two dist checks, two packs'
purpose: Execute plan 0015-kxa section 3.4.
type: task
status: ready
priority: "1"
effort: M
created: "2026-11-05T19:54:58.963Z"
updated: "2026-11-06T09:39:00.850Z"
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
    - ["0131-ku3", "depends"]
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
  "6":
    status: pending
---

# 0015 §3.4: Two builds, two dist checks, two packs

## Problem Statement

Plan 0015-kxa section 3.4 (Extract Platinum into packages/appearance/platinum): Two builds, two dist checks, two packs. The plan section holds the interfaces and exact steps; this story tracks its execution (implementer → review → fix → controller verification → land on feat/AppearancePackages).

**Produces:** `packages/appearance/platinum/dist/`: `appearance-platinum.es.js`, `appearance-platinum.umd.js`, `types/`, `assets/` (13 woff2, the art, the wallpapers, the four sound sprites; all files, none inlined except the halftone mask), `classicy-platinum.css` (byte-identical to the injected package block, starting with the layer order) and `classicy-platinum.fonts.css`. Package `exports`: `.` → `{ types, import: ./dist/appearance-platinum.es.js, require: ./dist/appearance-platinum.umd.js }`, `./scss/*` → `./src/styles/*`, `./classicy-platinum.css`, `./classicy-platinum.fonts.css`. The core loses `./appearance/platinum`, `./appearance/platinum/scss/*`, `dist/appearance-platinum.js(.d.ts)`, `dist/classicy-platinum.css`, `dist/classicy-platinum.fonts.css` and the Platinum files in `dist/assets/`. Root `build:source` builds the core then the package and runs both verifiers.

## Steps

### 1: Write the failing dist and pack tests

Core `check-dist-imports.mjs`: invariant 4 checks only `fonts.js`; invariant 5 asserts no woff2, no Platinum art and no sound sprite in core `dist/assets/` and no `data:audio` or wallpaper `data:image` in the bundles; invariant 7 asserts the entry bundles carry NO `@layer classicy.package` block; invariant 12 is removed. Package `verify-dist.mjs`: the old invariants 5, 7 (byte-identity of `classicy-platinum.css`), 9 (charset) and 12, reading `packages/appearance/platinum/src/assets/…` for the expected sets, plus: no `.webp`, every `new URL("assets/…")` names a file, and the bundle imports `@classicy/classicy` rather than containing it. Pack tests for both packages (`npm pack --dry-run --json` and `pnpm pack --dry-run --json`): the core ships no file under `packages/` and no Platinum asset; Platinum ships no `resources/`, no tests, every exported `.scss`, and its packed `package.json` has `peerDependencies["@classicy/classicy"] === "^<version>"` (no `workspace:`).

### 2: Share the emit logic

Parameterize `bin/classicyFontStylesheet.ts` (`PLATINUM_FONT_SOURCE` → a function of the package's source dir), `bin/classicyDistAssets.ts` (`CLASSICY_ART_SOURCE_DIR` → argument), `bin/classicyPackageCss.ts` (`PACKAGE_STYLESHEET_MODULE` matches `packages/appearance/<pkg>/src/styles/<name>.scss?inline`); the Platinum vite config's own `injectCssPlugin`-equivalent emits `classicy-platinum.css` and `classicy-platinum.fonts.css` from them; `noInlineAppearanceAssetsPlugin` and `assetFileNames` apply to `packages/appearance/` paths (sound sprites included). The core's `injectCssPlugin` keeps the layer-order prepend, the `fonts.js` shim and the style injector, and drops the Platinum emits.

### 3: Exports and scripts

Core `package.json`: drop the two Platinum exports, the shim and the Platinum `sideEffects` entries, keep `src/Appearance` in `files` (vocabulary SCSS only now). `build:source` = barrels, `tsc -b`, core `vite build`, core `verify:dist`, then `pnpm --filter @classicy/appearance-platinum build` (which runs its own `verify:dist`).

### 4: Review focus: a host bundler

Add to `example/` (or a fixture under `bin/` tests) a Vite dev-config assertion and README text: a Vite host excludes both `@classicy/classicy` and `@classicy/appearance-platinum` from `optimizeDeps`, since Platinum's fonts, art, wallpapers and sprites are now `new URL(…, import.meta.url)` files too. `example/vite.config.ts` gets the second exclude.

### 5: Run the gate

Run the gate Command: `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm storybook:typecheck && node bin/generate-vocabulary.ts --check && node bin/classicyLiteralColorSweep.ts && pnpm test --maxWorkers=3 && pnpm build:source && pnpm build:storybook && pnpm --filter classicy-example build`

### 6: Commit

Conventional commit(s) ending with the session trailers; confirm the branch and `git diff --cached` first. Command: `git commit -m "build: the core and Platinum build, verify and pack separately"`

## Acceptance Criteria

- [ ] VERIFY: `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm storybook:typecheck && node bin/generate-vocabulary.ts --check && node bin/classicyLiteralColorSweep.ts && pnpm test --maxWorkers=3 && pnpm build:source && pnpm build:storybook && pnpm --filter classicy-example build` passes.
- [ ] VERIFY: Reviewed with no open finding at or above 70 confidence, verified by the controller, and landed on feat/AppearancePackages with the full gate green.

## Files

- `packages/appearance/platinum/bin/verify-dist.mjs` - create
- `packages/appearance/platinum/src/PlatinumPackageExports.test.ts` - create
- `vite.config.ts` - modify
- `packages/appearance/platinum/vite.config.ts` - modify
- `bin/check-dist-imports.mjs` - modify
- `bin/classicyFontStylesheet.ts` - modify
- `bin/classicyDistAssets.ts` - modify
- `bin/classicyPackageCss.ts` - modify
- `package.json` - modify
- `packages/appearance/platinum/package.json` - modify
- `src/Appearance/ClassicyPackageExports.test.ts` - modify

## Work Log

### 2026-11-06T03:26:31.704Z - 2026-11-06, from 0127-qvl (1.6) J1: the library build now enters through src/ClassicyLibraryBuild.internal.ts (the barrel, then import of Platinum) so verify:dist's package-block invariant still passes while Platinum lives in src/. Phase 3 must delete that file, point the build back at src/index.ts, and move the Platinum package-block invariant to Platinum's own dist check.

### 2026-11-06T09:26:17.693Z - 2026-11-06, from 0130-rpe's review: until 3.4, the example's production bundle registers Platinum twice (the core dist bundles one copy via src/ClassicyLibraryBuild.internal.ts, the package dist registers again and replaces it); example/dist JS is ~14.8 MB with every data:audio sprite twice. 3.4 removes the bundled copy; verify the example's production bundle holds one copy (size and sprite count) when it lands. Do not deploy the example between 3.2 and 3.4.

### 2026-11-06T09:34:05.084Z - 2026-11-06, from 0131-ku3 J1: the core build uses a narrower no-inline rule (isClassicyCoreBuildPackageAsset) so it keeps inlining Platinum's moved files while it still bundles Platinum; 3.4 deletes that rule and its test together with src/ClassicyLibraryBuild.internal.ts.

### 2026-11-06T09:39:00.850Z - 2026-11-06, from 0131-ku3's review: the package's byte-identity test (PlatinumOneRegistry.test.ts:335-343) covers only the four sprites; 3.4's package verify-dist must check every non-font file in the package dist/assets (art, cursors, wallpapers) is byte-identical to its source, so an image optimizer added to the package's Vite config is caught.
