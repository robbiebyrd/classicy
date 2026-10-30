---
id: 0024-ktc
title: 'C 5.1: Package assets emit as files; verify:dist'
purpose: Stop lib-mode Vite from inlining src/Appearance/** assets so Platinum fonts and art ship as files, and make verify:dist guard the new invariants.
type: impr
status: complete
priority: "2"
effort: M
created: "2026-10-28T20:04:07.145Z"
updated: "2026-10-29T01:11:29.954Z"
started: "2026-10-28T23:47:54.073Z"
completed: "2026-10-29T00:20:27.242Z"
links:
  repo:
    local: ~/classicy
    files:
      - vite.config.ts
      - bin/check-dist-imports.mjs
      - package.json
      - docs/AGENT-REFERENCE.md
      - CLAUDE.md
      - bin/classicyStyleInjector.test.ts
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
  stories:
    - ["0023-yme", "depends"]
  plans:
    - ["0007-1sl", "included", ["5.1"]]
progress:
  "1":
    status: complete
  "2":
    status: complete
  "3":
    status: complete
  "4":
    status: complete
  "5":
    status: complete
  "6":
    status: complete
  "7":
    status: complete
---

# C 5.1: Package assets emit as files; verify:dist

## Problem Statement

Audit §4.7: `build.lib` inlines every asset as a `data:` URI (~78 % of the JS is base64), so a second package would double the bundle. Audit §9 Phase 3 item 6 asks for `assetsInlineLimit`, but Vite 7.3.5's `shouldInline` ignores that option in lib mode and honors only the per-import `?no-inline` query (`node_modules/vite/dist/node/chunks/config.js:8815-8819`). After C 4.1 the fonts are imports under `src/Appearance/**` and would be inlined back into the bundle, undoing #303.

This story adds `noInlineAppearanceAssetsPlugin` (a `resolveId` hook that appends `?no-inline` to asset imports under `/src/Appearance/`), deletes `splitFontFacesPlugin`, turns `dist/fonts.js` into a deprecated no-op shim so `import "classicy/fonts"` keeps resolving, drops the `./dist/fonts.css` export, and rewrites `bin/check-dist-imports.mjs` invariants 3-5 (no `data:font` in bundles, self-contained `fonts.js`, 13 `.woff2` and 17+ art files in `dist/assets/`).

**Impact:** Without it `pnpm build:source` either re-inlines several MB of fonts into every consumer's bundle or fails `verify:dist`; C 6.1's full gate cannot pass.

## Steps

### 1: Write the failing check

Edit `bin/check-dist-imports.mjs` first: invariant 3 becomes "each entry bundle injects the stylesheet and contains neither `data:font/` nor `data:application/font-`"; invariant 4 becomes "`dist/fonts.js` exists and has no `import`/`require`"; new invariant 5: `dist/assets/` contains exactly 13 `.woff2` files and at least 17 `.svg`/`.png` files from `src/Appearance/Platinum/assets/art`, and `dist/classicy.es.js` references `new URL("assets/` at least once. Each failure prints `<file>: <reason>` and exits 1. Then build the current tree.

### 2: Run it to verify it fails

`pnpm build:source` — Expected: FAIL at `verify:dist` — `dist/classicy.es.js: inlines fonts as data: URIs` (the fonts are now imported from `src/Appearance` but lib mode still inlines them) and `dist/assets: expected 13 .woff2 files, found 0`.

### 3: Implement noInlineAppearanceAssetsPlugin, delete splitFontFacesPlugin, make fonts.js the shim, update package.json exports

`vite.config.ts`: `noInlineAppearanceAssetsPlugin(): Plugin` (`enforce: "pre"`, `resolveId(source, importer, options)`: return `null` unless `importer` is set and `source` carries no Vite query; `const r = await this.resolve(source, importer, { ...options, skipSelf: true })`; if `r` and `r.id` (query stripped) matches `/\.(woff2?|ttf|otf|png|jpe?g|gif|svg|ogg|m4a|mp3|ac3|wav)$/i` and contains `/src/Appearance/`, return `r.id + (r.id.includes("?") ? "&" : "?") + "no-inline"`); listed before `react()`; replace the comment at 254-270 with three lines saying lib mode ignores `assetsInlineLimit` and this plugin uses the per-import `?no-inline` opt-out. Delete `splitFontFacesPlugin`; `injectCssPlugin` always emits `fonts.js` with the source `// Deprecated no-op: Classicy's fonts are registered by the Platinum appearance package (registerClassicyFonts). Kept so \`import "classicy/fonts"\` keeps resolving.\n` and `fonts.d.ts` as today; drop the `CLASSICY_FONTS_STYLE_ELEMENT_ID` import (the constant stays in `bin/classicyStyleInjector.ts` for its test). `package.json`: remove the `./dist/fonts.css` export; keep `./fonts`; `files` unchanged.

### 4: Build to verify it passes

`pnpm build:source && ls dist/assets | grep -c '\.woff2$' && grep -c 'data:font' dist/classicy.es.js` — Expected: `verify:dist` passes; `13`; `0`. Also `grep -c 'classicy-fonts-platinum' dist/classicy.es.js` ≥ 1 and `du -sh dist/classicy.es.js` is smaller than before the part (record both numbers in the commit body).

### 5: Smoke the example app

`pnpm preview`; open it; in devtools `document.getElementById("classicy-fonts-platinum").textContent.match(/@font-face/g).length` is 13; Network shows `.woff2` requests with 200; the Appearance Manager Fonts tab lists six families; no console errors. Stop the server.

### 6: Update the docs

`docs/AGENT-REFERENCE.md:36-56`: the `import 'classicy/fonts'` line becomes `// no longer needed: the Platinum package registers its fonts; the import is a deprecated no-op`, the exports table drops `classicy/dist/fonts.css` and says fonts ship as `dist/assets/*.woff2`. `CLAUDE.md:621-622`: rewrite the two bullets — styles still inject; fonts are registered by `registerClassicyFonts` as `<style id="classicy-fonts-platinum">` from files under `dist/assets/`, `classicy/fonts` is a no-op shim, package assets under `src/Appearance/**` emit as files via the `?no-inline` resolver, `verify:dist` checks both.

### 7: Lint, type-check, commit

`pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`; then git add vite.config.ts bin/check-dist-imports.mjs package.json docs/AGENT-REFERENCE.md CLAUDE.md && git commit -m "build: emit appearance package assets as files; fonts.js becomes a no-op shim" (with the trailer).

## Acceptance Criteria

- [x] VERIFY: pnpm build:source  # verify:dist passes with the new invariants
- [x] `dist/assets/` holds exactly 13 `.woff2` files and at least 17 art files; `grep -c 'data:font' dist/classicy.es.js` is 0; `dist/fonts.js` exists with no `import`/`require`; `package.json` no longer exports `./dist/fonts.css`.
- [x] [MANUAL] In the example app `<style id="classicy-fonts-platinum">` carries 13 `@font-face` rules, the `.woff2` requests return 200, and the Fonts tab lists six families with no console errors.
- [x] VERIFY: pnpm exec vitest run bin/classicyStyleInjector.test.ts
- [x] VERIFY: pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test

## Files

- `vite.config.ts` - noInlineAppearanceAssetsPlugin; splitFontFacesPlugin removed; fonts.js shim
- `bin/check-dist-imports.mjs` - invariants 3-5 rewritten
- `package.json` - ./dist/fonts.css export removed
- `docs/AGENT-REFERENCE.md` - :36-56 fonts delivery and exports table
- `CLAUDE.md` - :621-622 build notes rewritten
- `bin/classicyStyleInjector.test.ts` - unchanged, must still pass

## Work Log

### 2026-10-28T23:47:54.167Z - Implementation dispatched

### 2026-10-29T00:01:04.356Z - Implementation committed (4d92822d3, c09bb4f76); task review in progress

### 2026-10-29T00:20:26.518Z - Completed: commits 6bfd5c8a1..18dfe7ed9 (4d92822d3 format cherry-pick, c09bb4f76 build change, 18dfe7ed9 fix round), task review clean after one fix round. Full gate green (lint, tsc, 296 files / 3398 tests, verify:dist). dist/assets: 13 woff2, 17 svg, 1 png, 0 webp; 0 data:font in classicy.es.js. Criterion 3 evidence: headless Chromium smoke showed #classicy-fonts-platinum with 13 @font-face, woff2 requests 200, no console errors; a real Vite 7 consumer loaded 13 fonts as 200 font/woff2 with optimizeDeps.exclude. The Fonts tab six-family list was not hand-checked in the example app (covered by the C 4.1 unit test).

### 2026-10-29T00:20:26.611Z - breaking change for Vite dev consumers documented (AGENT-REFERENCE §1, README, CLAUDE.md)

### 2026-10-29T01:11:29.953Z - Fonts tab verified in the example app during C 6.1: six families listed; 13 faces load on demand
