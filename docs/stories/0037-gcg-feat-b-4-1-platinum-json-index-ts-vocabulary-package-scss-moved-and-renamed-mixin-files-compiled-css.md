---
id: 0037-gcg
title: 'B 4.1: platinum.json, index.ts, vocabulary _package.scss, moved and renamed mixin files, compiled css'
purpose: 'Create the Platinum package module: presets and layout in platinum.json, the platinum-* mixin files moved out of AppearanceManager/styles, and css compiled under the classicy-package scope.'
type: feat
status: in_progress
priority: "2"
effort: L
created: "2026-10-28T20:12:29.317Z"
updated: "2026-10-29T14:45:39.077Z"
started: "2026-10-29T14:45:39.077Z"
links:
  repo:
    local: ~/classicy
    files:
      - src/Appearance/Platinum/index.ts
      - src/Appearance/Platinum/platinum.json
      - src/Appearance/Platinum/styles/platinum.scss
      - src/Appearance/Platinum/styles/_mixins.scss
      - src/Appearance/Platinum/styles/_scrollbars.scss
      - src/Appearance/Platinum/styles/_assets.scss
      - src/Appearance/vocabulary/_package.scss
      - src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.ts
      - src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.tsx
      - .ts-barrel.json
      - src/custom.d.ts
      - package.json
      - src/SystemFolder/ControlPanels/AppearanceManager/styles/themes.json
      - src/SystemFolder/ControlPanels/AppearanceManager/styles/appearance.scss
      - src/SystemFolder/ControlPanels/AppearanceManager/styles/scrollbars.scss
      - src/SystemFolder/ControlPanels/AppearanceManager/styles/assets.scss
      - src/Appearance/Platinum/ClassicyPlatinum.test.ts
      - src/Appearance/Platinum/styles/platinum.css.test.ts
      - src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeSchema.test.ts
      - src/SystemFolder/ControlPanels/AppearanceManager/ClassicyWallpapers.test.ts
      - src/SystemFolder/SystemResources/Window/ClassicyWindow.resizer.test.ts
      - src/SystemFolder/SystemResources/Tabs/ClassicyTabs.typescale.test.ts
      - storybook/.storybook/preview.tsx
      - src/index.ts
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
  stories:
    - ["0036-ouc", "depends"]
  plans:
    - ["0005-1b3", "included", ["4.1"]]
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
  "8":
    status: pending
---

# B 4.1: platinum.json, index.ts, vocabulary _package.scss, moved and renamed mixin files, compiled css

## Problem Statement

Audit §9 Phase 2 items 3-4, §8.1/§8.2 and umbrella 0002-ldj 'Platinum': `src/Appearance/Platinum/index.ts` is a side-effect import that registers the package; `platinum.json` carries id, name, defaults, the 21 former themes.json entries as presets (D24), the Platinum layout and knobs; `styles/*.scss` compile via Vite `?inline` into the `css` string wrapped by `@include classicy-package("platinum")`, which emits `@layer classicy.package { .classicyDesktop[data-classicy-appearance="platinum"] { … } }`. appearance.scss, scrollbars.scss and assets.scss move into the package as `_mixins.scss`, `_scrollbars.scss`, `_assets.scss` with every mixin renamed `platinum-*` (D16); `px-rect`/`no-select` are deleted in favor of the vocabulary's `classicy-px-rect`/`classicy-no-select` (part A).

Two build facts shape this section: `getAllThemes()` reads `platinum.json` as a data import so DefaultAppManagerState never waits for the side-effect module; and barrelsby's purge deletes every `index.ts` under src when `noHeader` is true (node_modules/barrelsby/bin/purge.js:14-22), so `.ts-barrel.json` flips `noHeader` to false and the top barrel re-exports `./Appearance/Platinum/index`.

**Impact:** Without the package module there is nothing to register, no css string to inject and no presets for getAllThemes once themes.json is deleted; 4.2/4.3 have no partials to include and 5.1 nothing to export. After this story the component stylesheets still reference the deleted paths, so `vite build` fails until 4.2/4.3 land — they must follow immediately.

## Steps

### 1: Write the failing Platinum tests

ClassicyPlatinum.test.ts: `registers the platinum package on import` (`await import("@/Appearance/Platinum")` → getClassicyAppearancePackage("platinum") defined, name "Platinum"); `ships 21 presets whose ids match the former themes.json order` (ids deep-equal ["default","azul","bondi","copper","crimson","emerald","frenchBlue","gold","ivy","lavender","pistachio","magenta","nutmeg","poppy","plum","rose","sapphire","silver","teal","turquoise","sunny"]); `defaults equals the Default preset` (deep-equal presets[0]); `every preset carries package platinum`; `layout declares today's Platinum values` (exact object { window: { growBoxCorner: "bottom-right" }, menuBar: { placement: "screen" }, desktop: { iconGridOrigin: "top-right" } }); `getAllThemes() comes from the package presets with resolved wallpapers` (same ids; backgroundImage of "azul" !== "azul_dark.png" and classicyWallpaperFilename(...) === "azul_dark.png"); `the top barrel re-exports the Platinum entry` (readFileSync("src/index.ts") contains `./Appearance/Platinum/index`). platinum.css.test.ts (sass API: `compile("src/Appearance/Platinum/styles/platinum.scss", { loadPaths: ["src"] }).css`): `is wrapped in the package layer` (css starts with `@layer classicy.package`); `every rule is scoped under the platinum root` (every selector line matched by /^[^@{}]+\{/m starts with `.classicyDesktop[data-classicy-appearance=platinum]` or `.classicyDesktop[data-classicy-appearance="platinum"]`); `contains no platinumCamelCase mixin name` (no match for /platinum[A-Z]/).

### 2: Run them to verify they fail

`pnpm exec vitest run src/Appearance/Platinum` — Expected: FAIL — module not found.

### 3: Create platinum.json, _package.scss, the three moved style files and platinum.scss

`git mv` appearance.scss → src/Appearance/Platinum/styles/_mixins.scss, scrollbars.scss → _scrollbars.scss, assets.scss → _assets.scss (verbatim), then apply the rename table with sed: platinumMenuFrame→platinum-menu-frame, platinumMenuDivider→platinum-menu-divider, platinumWindowBoxShadow→platinum-window-box-shadow, platinumBoxShadow→platinum-box-shadow, platinumWindowBorder→platinum-window-border, platinumWindowHeaderBorder→platinum-window-header-border, platinumWindowHeaderBorderDepressed→platinum-window-header-border-depressed, platinumWindowInnerBoxShadow→platinum-window-inner-box-shadow, platinumWindowInnerBoxShadowOuter→platinum-window-inner-box-shadow-outer, platinumWindowInnerBorder→platinum-window-inner-border, platinumWindowControlBoxBorder→platinum-window-control-box-border, platinumWindowControlBox→platinum-window-control-box, platinumWindowControlBoxDepressable→platinum-window-control-box-depressable, platinumWindowUndepressable→platinum-window-undepressable, platinumWindowDepressable→platinum-window-depressable, platinumWindowDepressed→platinum-window-depressed, platinumDepressableDefault→platinum-depressable-default, platinumDepressableBoxShadowActive→platinum-depressable-box-shadow-active, theme-halftone→platinum-halftone, encode-color→platinum-encode-color; scrollbars: sb-glyph-up/down/left/right→platinum-scrollbar-glyph-up/down/left/right, sb-btn-box→platinum-scrollbar-button-box, sb-btn-pressed→platinum-scrollbar-button-pressed, scrollbars→platinum-scrollbars, scrollbars-split-arrows→platinum-scrollbars-split-arrows, scrollbars-inactive→platinum-scrollbars-inactive, scrollbars-themed→platinum-scrollbars-themed (`$sb-arrow*` variables keep their names). _mixins.scss adds `@use "../../vocabulary/layout"` (layout.classicy-px-rect; `@use 'assets'` stays), deletes `px-rect` (appearance.scss:9) and `no-select` (:239), and `.hidden` (:244-246) moves to ClassicyDesktop.scss. _package.scss: `@mixin classicy-package($id) { @layer classicy.package { .classicyDesktop[data-classicy-appearance="#{$id}"] { @content; } } }`. platinum.scss: `@use "../../vocabulary/package"; @use "mixins"; @use "scrollbars"; @use "assets"; @include package.classicy-package("platinum") { … }` (component partials are included here by 4.2/4.3; none yet). platinum.json: `{ "id": "platinum", "name": "Platinum", "defaults": <themes.json entry 0>, "presets": [<all 21, themes.json order, each with package "platinum">], "layout": { "window": { "growBoxCorner": "bottom-right" }, "menuBar": { "placement": "screen" }, "desktop": { "iconGridOrigin": "top-right" } }, "knobs": {} }` built by a one-off node script (tab indentation), then `git rm` themes.json.

### 4: Create index.ts; re-point ClassicyAppearance.ts, the four themes.json test imports and Storybook preview.tsx

index.ts: `import platinumJson from "./platinum.json"; import platinumCss from "./styles/platinum.scss?inline"; registerClassicyAppearancePackage({ ...platinumJson, css: platinumCss, options: classicyKnobsToSchema(platinumJson.knobs), layout: platinumJson.layout })` — side effects only (an exported `PLATINUM_APPEARANCE_PACKAGE_ID = "platinum"` is allowed). ClassicyAppearance.ts:8 `import platinumJson from "@/Appearance/Platinum/platinum.json"` and `platinumJson.presets` at :267; ClassicyThemeSchema.test.ts:17, ClassicyWallpapers.test.ts:10, ClassicyWindow.resizer.test.ts:4, ClassicyTabs.typescale.test.ts:4 import `platinumJson` and read `.presets`; storybook/.storybook/preview.tsx:3,12 builds the toolbar from `platinumJson.presets`. Add `import "@/Appearance/Platinum";` to ClassicyDesktop.tsx beside the scss import at line 34 (D14); add `declare module "*.scss?inline" { const css: string; export default css; }` to src/custom.d.ts; add `"./src/Appearance/Platinum/index.ts"` to package.json sideEffects.

### 5: Flip barrelsby noHeader and regenerate

Set `"noHeader": false` in .ts-barrel.json, then `pnpm generate-barrels && test -f src/Appearance/Platinum/index.ts && grep -c 'Appearance/Platinum/index' src/index.ts` — Expected: the entry file still exists and the grep prints 1; src/index.ts now starts with the barrelsby `@file` header comment.

### 6: Run the Platinum tests and the whole suite

`pnpm exec vitest run src/Appearance/Platinum && pnpm test` — Expected: PASS. (Under vitest the `?inline` import resolves to "", so `css` is empty in tests; the sass test covers the real output.)

### 7: Verify module-evaluation order

`pnpm exec vitest run src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.test.ts` — Expected: PASS — DefaultAppManagerState.availableThemes has 21 entries without importing @/Appearance/Platinum (the test file must not import it).

### 8: Lint, type-check, commit

`pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`, then `git commit -m "feat(appearance): Platinum package module with presets, layout and renamed mixins"` with the trailer Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>. The component stylesheets still @use the old paths, which no longer exist — tsc passes but `vite build` would not; 4.2/4.3 fix that before the next parity shot, so do not run the parity set yet.

## Acceptance Criteria

- [ ] VERIFY: pnpm exec vitest run src/Appearance/Platinum
- [ ] src/Appearance/Platinum/ registers id "platinum" with 21 presets in themes.json order, defaults equal to the Default preset, the Platinum layout, knobs {} and css compiled from platinum.scss wrapped in @layer classicy.package under .classicyDesktop[data-classicy-appearance="platinum"].
- [ ] _mixins.scss, _scrollbars.scss and _assets.scss hold the moved files with every mixin renamed platinum-* (no /platinum[A-Z]/ in compiled css); themes.json, appearance.scss, scrollbars.scss and assets.scss are deleted.
- [ ] VERIFY: pnpm generate-barrels && test -f src/Appearance/Platinum/index.ts && grep -q 'Appearance/Platinum/index' src/index.ts
- [ ] VERIFY: pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test

## Files

- `src/Appearance/Platinum/index.ts` - create: side-effect registration
- `src/Appearance/Platinum/platinum.json` - create: id, name, defaults, 21 presets, layout, knobs
- `src/Appearance/Platinum/styles/platinum.scss` - create: compiled entry under classicy-package
- `src/Appearance/Platinum/styles/_mixins.scss` - create: appearance.scss moved and renamed
- `src/Appearance/Platinum/styles/_scrollbars.scss` - create: scrollbars.scss moved and renamed
- `src/Appearance/Platinum/styles/_assets.scss` - create: assets.scss moved verbatim
- `src/Appearance/vocabulary/_package.scss` - create: classicy-package mixin
- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.ts` - presets from platinum.json
- `src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.tsx` - import @/Appearance/Platinum; .hidden rule into ClassicyDesktop.scss
- `.ts-barrel.json` - noHeader false
- `src/custom.d.ts` - *.scss?inline declaration
- `package.json` - sideEffects entry
- `src/SystemFolder/ControlPanels/AppearanceManager/styles/themes.json` - delete
- `src/SystemFolder/ControlPanels/AppearanceManager/styles/appearance.scss` - delete (moved)
- `src/SystemFolder/ControlPanels/AppearanceManager/styles/scrollbars.scss` - delete (moved)
- `src/SystemFolder/ControlPanels/AppearanceManager/styles/assets.scss` - delete (moved)
- `src/Appearance/Platinum/ClassicyPlatinum.test.ts` - create: package tests
- `src/Appearance/Platinum/styles/platinum.css.test.ts` - create: compiled css tests
- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeSchema.test.ts` - import platinum.json presets
- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyWallpapers.test.ts` - import platinum.json presets
- `src/SystemFolder/SystemResources/Window/ClassicyWindow.resizer.test.ts` - import platinum.json presets
- `src/SystemFolder/SystemResources/Tabs/ClassicyTabs.typescale.test.ts` - import platinum.json presets
- `storybook/.storybook/preview.tsx` - toolbar from platinum.json presets
- `src/index.ts` - regenerated with header

## Work Log
