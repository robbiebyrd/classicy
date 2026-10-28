---
id: 0008-zlu
title: 'A 5.1: @layer declaration in the injector; classicy.base wrapping plugin'
purpose: Declare the `classicy.base, classicy.package, classicy.user` cascade layers once in the style injector and compile every component stylesheet into `classicy.base` in build, dev and Storybook.
type: feat
status: pending
priority: "2"
effort: M
created: "2026-10-28T19:52:07.776Z"
updated: "2026-10-28T19:52:07.776Z"
links:
  repo:
    local: ~/classicy
    files:
      - bin/classicyCssLayerPlugin.ts
      - bin/classicyCssLayerPlugin.test.ts
      - bin/classicyStyleInjector.ts
      - bin/classicyStyleInjector.test.ts
      - vite.config.ts
      - storybook/.storybook/main.ts
      - bin/check-dist-imports.mjs
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
  stories:
    - ["0007-9ng", "depends"]
  plans:
    - ["0003-7x7", "included", ["5.1"]]
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
  "7":
    status: pending
---

# A 5.1: @layer declaration in the injector; classicy.base wrapping plugin

## Problem Statement

Audit §2.9: `classicy.css` is one blob injected by `bin/classicyStyleInjector.ts` with no `@layer`, so a package can only pile overrides on top. Umbrella 0002-ldj (cascade layers): `@layer classicy.base, classicy.package, classicy.user;` is declared once by the injector before any rule; all Classicy component SCSS compiles into `classicy.base`, package CSS into `classicy.package`.

Vite's `vite:css` compiles `.scss` ids before normal-phase user plugins run `transform`, so a small plugin (`bin/classicyCssLayerPlugin.ts`) can wrap each compiled component stylesheet in `@layer classicy.base { … }` for the library build, `vite dev` and Storybook alike; `fonts.scss`, plain `.css` and `node_modules` are left alone. The injector prepends `CLASSICY_LAYER_ORDER` to the default stylesheet only (fonts get no layer statement) and `verify:dist` guards the bundle.

**Impact:** Part B's `classicy-package` mixin emits `@layer classicy.package { … }`; without the base layer and the order statement a package's rules would tie with base rules on specificity instead of winning by layer, and hosts would lose the unlayered-wins guarantee.

## Steps

### 1: Write the failing tests

`bin/classicyStyleInjector.test.ts` (add): `it("declares the cascade layer order before any rule")` (`run(".a{color:red}")`; `document.getElementById(CLASSICY_STYLE_ELEMENT_ID)?.textContent` toBe `"@layer classicy.base, classicy.package, classicy.user;\n.a{color:red}"`); `it("does not prepend the layer order to the fonts stylesheet")` (`new Function(classicyStyleInjector("@font-face{font-family:x}", CLASSICY_FONTS_STYLE_ELEMENT_ID))()`; fonts element textContent toBe `"@font-face{font-family:x}"`); update the existing `inserts the stylesheet once` expectation to the prefixed text. `bin/classicyCssLayerPlugin.test.ts`: `it("wraps compiled component scss in @layer classicy.base")` (`wrapInClassicyLayer(".classicyButton{display:flex}")` toBe `"@layer classicy.base {\n.classicyButton{display:flex}\n}"`); `it("transform wraps src scss ids and ignores fonts.scss, css and node_modules")` (`const p = classicyCssLayerPlugin(); const t = p.transform as Function;` `(await t.call({}, ".a{}", "/repo/src/X/X.scss")).code` toMatch `/^@layer classicy.base \{/`; `/repo/src/SystemFolder/ControlPanels/AppearanceManager/styles/fonts.scss` → null; `/repo/src/index.css` → null; `/repo/node_modules/x/y.scss` → null); `it("is idempotent")` (`wrapInClassicyLayer(wrapInClassicyLayer(".a{}"))` toBe `wrapInClassicyLayer(".a{}")`).

### 2: Run them to verify they fail

`pnpm exec vitest run bin` — Expected: FAIL — `CLASSICY_LAYER_ORDER` undefined; module not found.

### 3: Implement CLASSICY_LAYER_ORDER, the injector change and bin/classicyCssLayerPlugin.ts

`bin/classicyStyleInjector.ts`: `export const CLASSICY_LAYER_ORDER = "@layer classicy.base, classicy.package, classicy.user;";` and `classicyStyleInjector(css, elementId)` injects `${CLASSICY_LAYER_ORDER}\n${css}` for the default element id only. `bin/classicyCssLayerPlugin.ts`: `export function classicyCssLayerPlugin(layer = "classicy.base"): Plugin` — `name: "classicy-css-layer"`, no `enforce`, `transform(code, id)` returns `{ code: `@layer ${layer} {\n${code}\n}`, map: null }` when `id` matches `/\.scss(\?|$)/`, is under `src/`, is not `styles/fonts.scss`, and `code` does not already start with `@layer ${layer}`; else `null`; also `export const wrapInClassicyLayer = (css: string, layer?: string): string`. Register the plugin in `vite.config.ts` `plugins` (before `react()` is fine) and in `storybook/.storybook/main.ts` `viteFinal` `plugins`. `src/index.css` (empty) is left alone.

### 4: Run tests to verify they pass

`pnpm exec vitest run bin` — Expected: PASS.

### 5: Build and verify the bundle

`pnpm build:source && head -c 120 dist/classicy.css && grep -c '@layer classicy.base {' dist/classicy.css && node -e "const s=require('fs').readFileSync('dist/classicy.es.js','utf8'); if(!s.includes('@layer classicy.base, classicy.package, classicy.user;')) process.exit(1)"` — Expected: dist/classicy.css begins with `@layer classicy.base {`, the count is ≥ 90 (one per source stylesheet), the ES bundle embeds the order statement. Extend `bin/check-dist-imports.mjs` with that last assertion so `verify:dist` guards it.

### 6: Verify Storybook still styles components

With Storybook running, open `iframe.html?id=controls-button--default&viewMode=story`; in the console `[...document.styleSheets].some(s => [...s.cssRules].some(r => r instanceof CSSLayerBlockRule && r.name === 'classicy.base'))` → `true`. Layered rules lose only to unlayered host rules; the ClassicyDesktop wrapper's inline theme vars are unaffected.

### 7: Lint, type-check, commit

`pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`, then `git add bin vite.config.ts storybook/.storybook/main.ts && git commit -m "feat(css): declare classicy.base/package/user layers and compile component CSS into classicy.base"` with the trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

## Acceptance Criteria

- [ ] VERIFY: pnpm exec vitest run bin && pnpm build:source
- [ ] The injected `<style id="classicy-styles">` starts with `@layer classicy.base, classicy.package, classicy.user;`; `<style id="classicy-fonts">` does not.
- [ ] `dist/classicy.css` consists of `@layer classicy.base { … }` blocks (≥ 90) and `verify:dist` fails if the ES bundle stops embedding the order statement.
- [ ] [MANUAL] In Storybook, `controls-button--default` renders styled and a `CSSLayerBlockRule` named `classicy.base` is present in `document.styleSheets`.

## Files

- `bin/classicyCssLayerPlugin.ts` - create: classicyCssLayerPlugin + wrapInClassicyLayer
- `bin/classicyCssLayerPlugin.test.ts` - create
- `bin/classicyStyleInjector.ts` - CLASSICY_LAYER_ORDER; prepend for the default id
- `bin/classicyStyleInjector.test.ts` - two new cases; update the first expectation
- `vite.config.ts` - register the plugin (injectCssPlugin unchanged)
- `storybook/.storybook/main.ts` - register the plugin in viteFinal
- `bin/check-dist-imports.mjs` - assert the bundle embeds the layer order

## Work Log
