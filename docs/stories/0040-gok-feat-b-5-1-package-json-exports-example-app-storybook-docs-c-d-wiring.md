---
id: 0040-gok
title: 'B 5.1: package.json exports, example app, Storybook, docs, C/D wiring'
purpose: Expose the vocabulary and the Platinum package through package.json exports, re-point the example app and Storybook, document packages, and wire parts C/D into the Platinum registration when they are present.
type: feat
status: in_progress
priority: "2"
effort: M
created: "2026-10-28T20:15:04.099Z"
updated: "2026-10-29T21:16:39.758Z"
started: "2026-10-29T20:34:41.037Z"
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
      - package.json
      - example/src/Applications/Browser/Browser.scss
      - example/src/Applications/BlueBox/BlueBox.scss
      - storybook/.storybook/ClassicyDecorators.tsx
      - docs/AGENT-REFERENCE.md
      - CLAUDE.md
      - src/Appearance/Platinum/index.ts
      - bin/check-dist-imports.mjs
      - src/Appearance/ClassicyPackageExports.test.ts
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
  stories:
    - ["0083-v8n", "blocks"]
    - ["0039-63e", "depends"]
  plans:
    - ["0005-1b3", "included", ["5.1"]]
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

# B 5.1: package.json exports, example app, Storybook, docs, C/D wiring

## Problem Statement

Audit §9 Phase 2 item 5 and umbrella 0002-ldj 'directories and exports': `./scss/*` must export the vocabulary (`./src/Appearance/vocabulary/*`, replacing the AppearanceManager path), `./appearance/platinum` the package entry (type + import, listed in sideEffects), and — because a JS export cannot serve SCSS — `./appearance/platinum/scss/*` the Platinum mixins; `files` ships `src/Appearance`. The example app's Browser.scss uses `platinumWindowControlBoxBorder` through `classicy/scss/appearance` and must move to the new path and name (D16); BlueBox.scss drops an unused `@use`.

Docs (AGENT-REFERENCE.md export table and theming section, CLAUDE.md `### Theming`) describe registerClassicyAppearancePackage, useActiveClassicyAppearancePackage, Appearance.packageId, ClassicyDesktopChangeAppearancePackage, theme.package, the import refusal and the fallback package. Parts C and D register under the string id "platinum" and are wired into the Platinum registration here when their modules already exist (one presence-checked step).

**Impact:** Without the exports the example app and any consumer `@use`ing `classicy/scss/*` break on the next publish, and `classicy/appearance/platinum` is unreachable; without the C/D step the Platinum package ships without its assets and sound pack when those parts merged first.

## Steps

### 1: Write the failing exports test

src/Appearance/ClassicyPackageExports.test.ts: `exports the vocabulary, the Platinum entry and its scss` (package.json exports["./scss/*"] === "./src/Appearance/vocabulary/*", exports["./appearance/platinum"].default === "./src/Appearance/Platinum/index.ts", exports["./appearance/platinum/scss/*"] === "./src/Appearance/Platinum/styles/*"); `ships src/Appearance` (files includes "src/Appearance"); `marks the Platinum entry as a side effect` (sideEffects includes "./src/Appearance/Platinum/index.ts"); `the example app no longer uses the old mixin path` (example/src/Applications/Browser/Browser.scss has no `scss/appearance`).

### 2: Run it to verify it fails

`pnpm exec vitest run src/Appearance/ClassicyPackageExports.test.ts` — Expected: FAIL on the first assertion.

### 3: Edit package.json, the example SCSS and the docs

package.json `exports`: `"./scss/*": "./src/Appearance/vocabulary/*"`, `"./appearance/platinum": { "types": "./dist/types/src/Appearance/Platinum/index.d.ts", "default": "./src/Appearance/Platinum/index.ts" }`, `"./appearance/platinum/scss/*": "./src/Appearance/Platinum/styles/*"`; `files` gains `"src/Appearance"` (the AppearanceManager/styles entry stays for fonts.scss). Browser.scss:1,13 → `@use 'classicy/appearance/platinum/scss/mixins'; … @include mixins.platinum-window-control-box-border;`; BlueBox.scss:1 → delete the unused `@use`. Docs: AGENT-REFERENCE.md:56 row text `Raw SCSS partials (the Classicy vocabulary: states, layout helpers, classicy-package)` plus new rows `classicy/appearance/platinum` (side-effect import registering the Platinum package) and `classicy/appearance/platinum/scss/*` (Platinum mixins); :1004 paragraph updated; a new `### Appearance Packages` subsection after the metric paragraph (:980-990) documenting registerClassicyAppearancePackage, useActiveClassicyAppearancePackage, Appearance.packageId, ClassicyDesktopChangeAppearancePackage { packageId }, theme.package, the import refusal and the fallback package. CLAUDE.md `### Theming` (:602-612): first sentence `Themes are JSON presets of an Appearance Package (`src/Appearance/Platinum/platinum.json` for Platinum) …` plus one paragraph on packages (registry, packageId, root attribute, platinum-* mixins live in the package, `classicy/scss/*` is the vocabulary). Then `pnpm exec vitest run src/Appearance/ClassicyPackageExports.test.ts` → PASS.

### 4: Build and run the example app

`pnpm build:source && pnpm --filter classicy-example build` — Expected: both builds pass (the example resolves `classicy/appearance/platinum/scss/mixins` through the exports map); then run the `verify` skill: open the example, confirm `document.querySelector('.classicyDesktop').dataset.classicyAppearance === 'platinum'` and that `document.getElementById('classicy-appearance-platinum')` is the element right after `#classicy-styles`; switch Default → Azul → Default in the Appearance panel with no console errors.

### 5: Storybook smoke

`pnpm build:storybook` — Expected: builds; the non-desktop frame carries data-classicy-appearance (2.1) so Controls/* stories keep the Platinum look — spot-check Controls/Button--default in the browser.

### 6: Wire part C and part D registrations when they are already merged

`ls src/SystemFolder/ControlPanels/SoundManager/ClassicySoundPacks.ts src/Appearance/ClassicyAssetRegistry.ts 2>/dev/null` — for each file the command lists: ClassicySoundPacks.ts present → index.ts passes `sounds: [platinumSoundPack]` (imported from src/Appearance/Platinum/assets/sounds/platinum.ts) and calls `registerClassicySoundPack(platinumSoundPack)` before registering the package; ClassicyAssetRegistry.ts present → index.ts passes `assets: { icons: ClassicyIcons }` and calls `registerClassicyIcons(ClassicyIcons, "platinum")`. A file the command does not list is wired by that part's own plan; record which case applied in the commit body.

### 7: Lint, type-check, test, commit

`pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`, then `git commit -m "feat(appearance): export the vocabulary and the Platinum package; document packages"` with the trailer Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>.

## Acceptance Criteria

- [ ] VERIFY: pnpm exec vitest run src/Appearance/ClassicyPackageExports.test.ts && pnpm build:source
- [ ] package.json exports ./scss/* (vocabulary), ./appearance/platinum and ./appearance/platinum/scss/*; files ships src/Appearance; the example app and Storybook build.
- [ ] AGENT-REFERENCE.md and CLAUDE.md document the package registry, packageId, ChangeAppearancePackage, theme.package and the new export paths; the C/D wiring outcome is recorded in the commit body.

## Files

- `package.json` - exports, files
- `example/src/Applications/Browser/Browser.scss` - platinum mixins via classicy/appearance/platinum/scss/mixins
- `example/src/Applications/BlueBox/BlueBox.scss` - unused @use removed
- `storybook/.storybook/ClassicyDecorators.tsx` - smoke-checked frame attribute
- `docs/AGENT-REFERENCE.md` - export table and Appearance Packages subsection
- `CLAUDE.md` - Theming section updated
- `src/Appearance/Platinum/index.ts` - C/D registrations when present
- `bin/check-dist-imports.mjs` - run by build:source as the dist gate
- `src/Appearance/ClassicyPackageExports.test.ts` - create: exports test

## Work Log
### 2026-10-29T20:22:00.352Z - Moved one open [MANUAL] acceptance criterion to the program V&V ticket 0083-v8n (human verification and validation), where it is tracked and ticked. This story now closes on its automated criteria; 0083-v8n links back with `depends`.

### 2026-10-29T20:34:41.738Z - Started in parallel with B 4.3c, for maximum concurrency at the user's request. Worktree part-b-43a, branch feat/appearance-part-b-51, base 50433055c (4.3a and 4.3b integrated). Owns package.json, Platinum/index.ts, the example app (bridge removal), the Storybook decorator (useClassicyAssetVars per E-B4) and docs; 4.3c owns the SCSS, the guard test and deleting the old modules. Implementer dispatched.

### 2026-10-29T21:16:39.757Z - Implementer DONE_WITH_CONCERNS at a77b68688: exports, files (plus src/Appearance/.npmignore, because the `!` patterns in package.json files had no effect), the ./appearance/platinum shim (R4), dist/classicy-platinum.css byte-identical to the injected package CSS, mandatory invariant 7, the bridge deleted, the Storybook decorator, docs; gate 330 files / 3986 tests, build:source + verify:dist, build:storybook, 302/302 stories AE 0. Its concern was the example's production build failing tsc -b in HyperCardPluginsDemo.tsx (plugin commands rejected by HCAction; on main since f645b976c); the controller fixed it in 2913f74bb with a pluginAction helper typed through HCPluginAction, and the example build passes. Controller re-ran lint, tsc and src/Appearance + bin (31 files / 553 tests) green. Pushed feat/appearance-part-b-51; reviewer dispatched; it integrates onto feat/appearance-part-b after 4.3c.
