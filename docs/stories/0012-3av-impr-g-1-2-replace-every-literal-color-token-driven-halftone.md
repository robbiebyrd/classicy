---
id: 0012-3av
title: 'G 1.2: Replace every literal color; token-driven halftone'
purpose: Replace every literal color in Classicy's SCSS with a token or a tint/shade/alpha of one, and make the icon halftone a token-painted mask.
type: impr
status: complete
priority: "2"
effort: M
created: "2026-10-28T19:54:12.504Z"
updated: "2026-10-30T01:59:16.304Z"
started: "2026-10-30T00:22:13.070Z"
completed: "2026-10-30T01:59:16.304Z"
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
      - src/SystemFolder/SystemResources/Window/ClassicyWindow.scss
      - src/SystemFolder/SystemResources/Alert/ClassicyAlert.scss
      - src/SystemFolder/SystemResources/FileInput/ClassicyFileInput.scss
      - src/SystemFolder/SystemResources/Icon/ClassicyIcon.scss
      - src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon.scss
      - src/SystemFolder/ControlPanels/AppearanceManager/styles/scrollbars.scss
      - src/SystemFolder/Finder/FinderAboutThisComputer.scss
      - src/SystemFolder/WebViewer/WebViewer.scss
      - src/SystemFolder/SystemResources/ProgressBar/ClassicyProgressBar.scss
      - src/SystemFolder/SystemResources/ControlGroup/ClassicyControlGroup.scss
      - src/SystemFolder/SystemResources/QuickTime/QuickTimeMovieEmbed.scss
      - src/SystemFolder/ControlPanels/AppearanceManager/styles/appearance.scss
      - src/Appearance/vocabulary/ClassicyLiteralColors.test.ts
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
  stories:
    - ["0083-v8n", "blocks"]
    - ["0011-76y", "depends"]
  plans:
    - ["0004-vqt", "included", ["1.2"]]
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

# G 1.2: Replace every literal color; token-driven halftone

## Problem Statement

Audit §2.1 lists the literal colors that are leaks, not art: `#f7cecd` duplicated at ClassicyWindow.scss:198 and ClassicyAlert.scss:88, `#c00` FileInput.scss:31, `rgba(255,255,255,.5)`/`rgba(0,0,0,.5)` at Icon.scss:34,95,118 and DesktopIcon.scss:36,93,116, scrollbar track shading scrollbars.scss:163-164,170-171, `#999`/`rgba(255,255,255,.5)` FinderAboutThisComputer.scss:30,53,83, `white` WebViewer.scss:6 and ProgressBar.scss:68, `groove rgb(239,239,239)` ControlGroup.scss:31, `rgba(0,0,0,.5)` QuickTimeMovieEmbed.scss:89, and `theme-halftone(#000000, 7%)` (Icon.scss:57, DesktopIcon.scss:55) compiling a color into a data URI. D10 / umbrella 0002-ldj: every one becomes a token or a `classicy-tint/shade/alpha` of one (G 1.1).

Every replacement reproduces today's pixels arithmetically except one NAMED change: the error title-bar fill becomes `classicy-tint("--color-error", 80%)` = #ffcccc instead of #f7cecd (no tint of pure red reaches R=0xf7; a new theme color input was rejected because it widens the 28-target color schema — raise in review if the owner prefers it). The halftone becomes a `::before` child painted `var(--color-black)` and masked by the dot SVG, still clipped by the element's own icon-shape mask.

**Impact:** Part B's package layer cannot recolor what is baked into literals; part H's literal purge assumes only pixel literals remain. The halftone fallback (JS-emitted data URI) is a contract gap with part C if parity fails here.

## Steps

### 1: Write the failing compiled-CSS tests

`src/Appearance/vocabulary/ClassicyLiteralColors.test.ts` compiles each file in the list (`sass.compile`, `style: "expanded"`; `rule()` helper from ClassicyColorPickerDialog.styles.test.ts; scrollbars is a mixin file, so compile a fixture that `@include`s `scrollbars.scrollbars()` on `.x`): `it("ClassicyWindow red title bar uses the error tint")` (`window` toContain `"background-color: color-mix(in srgb, var(--color-error), white 80%);"`); `it("ClassicyAlert movable title bar uses the same tint")`; `it("FileInput error text is a 20% shade of --color-error")` (`"color: color-mix(in srgb, var(--color-error), black 20%);"`); `it("icon label overlays are alpha tokens")` (`icon` toContain `"background: color-mix(in srgb, var(--color-white) 50%, transparent);"` and `"background: color-mix(in srgb, var(--color-black) 50%, transparent);"`, not match `/rgba\(/`); `it("scrollbar track shading is alpha tokens")` (`color-mix(in srgb, var(--color-black) 25%, transparent)` and the white one); `it("About This Computer borders are a 10% shade of system-04")`; `it("ControlGroup groove is a 6% tint of system-01")` (`"groove color-mix(in srgb, var(--color-system-01), white 6%)"`); `it("halftone is a token-painted mask on ::before")` (`icon` toContain `".classicyIconMask::before {"`; `rule(".classicyIconMask::before")["background-color"]` toBe `"var(--color-black)"`; `["mask-size"]` toBe `"7%"`; `rule(".classicyIconMask")["background-image"]` undefined); `it("no literal color remains in the audited files")` (for each compiled css, after stripping `url(…)` and `color-mix(…)`: not match `/#[0-9a-f]{3,8}\b|rgba?\(|(^|[\s:,(])(white|black)([\s;,)]|$)/im`).

### 2: Run them to verify they fail

`pnpm exec vitest run src/Appearance/vocabulary/ClassicyLiteralColors.test.ts` — Expected: FAIL on every `toContain`.

### 3: Apply the replacement table

Add `@use "<relative>/Appearance/vocabulary/color" as c;` after the existing `@use`s in each file (part B swaps these for `classicy/scss/color`). Window.scss:198 and Alert.scss:88 `#f7cecd` → `c.classicy-tint("--color-error", 80%)` (NAMED change: #ffcccc); FileInput.scss:31 `#c00` → `c.classicy-shade("--color-error", 20%)` (= #cc0000); Icon.scss:34, DesktopIcon.scss:36 `rgba(255,255,255,.5)` → `c.classicy-alpha("--color-white", 50%)`; Icon.scss:95,118, DesktopIcon.scss:93,116, QuickTimeMovieEmbed.scss:89 `rgba(0,0,0,.5)` → `c.classicy-alpha("--color-black", 50%)`; scrollbars.scss:163,170 `rgba(0,0,0,.25)` → `c.classicy-alpha("--color-black", 25%)`, :164,171 `rgba(255,255,255,.25)` → `c.classicy-alpha("--color-white", 25%)`; FinderAboutThisComputer.scss:30 → `c.classicy-alpha("--color-white", 50%)`, :53,:83 `#999` → `c.classicy-shade("--color-system-04", 10%)` (= #999999); WebViewer.scss:6 `white` → `var(--color-white)`; ProgressBar.scss:68 `white` → `var(--color-white)`; ControlGroup.scss:31 `rgb(239,239,239)` → `c.classicy-tint("--color-system-01", 6%)` (= 239.02 → 239). Nothing else in a declaration changes. Intentionally untouched: ColorPicker crayon/track colors, `var(--x, #hex)` fallbacks in HyperCard/DriveSetup/CrashScreen, saver art.

### 4: Rewrite theme-halftone and delete encode-color

appearance.scss:225-237: `@mixin theme-halftone($token: "--color-black", $size: 5%)` emits `position: relative; &::before { content: ""; position: absolute; inset: 0; z-index: -1; pointer-events: none; background-color: var(#{$token}); mask-image: url('data:image/svg+xml,<svg …same paths… fill="black"/>…'); mask-repeat: repeat; mask-size: $size; }` — keep the SVG path data byte-identical, only `fill` becomes `black` (it is a mask now). Callers Icon.scss:57 and DesktopIcon.scss:55 become `@include appearance.theme-halftone("--color-black", 7%)`. Delete `encode-color` (confirm with `grep -rn encode-color src`).

### 5: Run tests to verify they pass

`pnpm exec vitest run src/Appearance src/SystemFolder/SystemResources/Icon src/SystemFolder/SystemResources/Desktop src/SystemFolder/SystemResources/Window` — Expected: PASS.

### 6: Repo-wide literal sweep

`grep -rnE '#[0-9a-fA-F]{3,8}\b|rgba?\([0-9]|(^|[ :,(])(white|black)([ ;,)]|$)|groove rgb' src --include=*.scss | grep -v 'var(--[a-z0-9-]*, *#\|Extensions/ScreenSaver\|ColorPicker\|data:image\|white-space\|^\S*:\s*//' | wc -l` — Expected: 0 (the CrashScreen `var(--color-black, black)` fallback is excluded by the `var(--x, …` filter; ColorPicker crayon data by design).

### 7: Early parity on Icon/DesktopIcon/Alert/ControlGroup

Re-shoot `controls-icon--*`, `desktop-desktopicon--*`, `controls-controlgroup--*`, `dialogs-alert--*` into `.playwright-mcp/parity/part-G/mid/`; `compare -metric AE` vs `before/`. Expected: 0 for all except `dialogs-alert--stop` and `dialogs-alert--movable` (and any other error-styled alert story), whose `compare … diff.png` must show changed pixels only inside the title bar; record the AE counts in the commit body.

### 8: Lint, type-check, commit

`pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`, then `git add -A src && git commit -m "refactor(scss): replace literal colors with token tints, shades and alphas; token-painted halftone"` with the trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` (the body names the #f7cecd → tint change).

## Acceptance Criteria

- [x] VERIFY: pnpm exec vitest run src/Appearance/vocabulary/ClassicyLiteralColors.test.ts
- [x] `#f7cecd` appears nowhere; `theme-halftone` takes a token and paints a `::before` mask; `encode-color` is gone.
- [x] VERIFY: P='#[0-9a-fA-F]{3,8}\b|rgba?\([0-9]|(^|[ :,(])(white|black)([ ;,)]|$)|groove rgb'; grep -rnE "$P" src --include=*.scss | sed -E 's#/\*[^*]*\*/##' | grep -E "$P" | grep -v 'var(--[a-z0-9-]*, *#\|Extensions/ScreenSaver\|ColorPicker\|data:image\|white-space\|^\S*:\s*//' | grep -v 'vocabulary/_color\.scss\|var(--color-black, black)' | wc -l   # 0 (strips /* */ comments; excludes the color-helper definitions and the CrashScreen keyword fallback; 22 at the base)

## Files

- `src/SystemFolder/SystemResources/Window/ClassicyWindow.scss` - :198 error tint
- `src/SystemFolder/SystemResources/Alert/ClassicyAlert.scss` - :88 error tint
- `src/SystemFolder/SystemResources/FileInput/ClassicyFileInput.scss` - :31 shade(error, 20%)
- `src/SystemFolder/SystemResources/Icon/ClassicyIcon.scss` - :34,95,118 alpha tokens; :57 halftone token
- `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon.scss` - :36,93,116 alpha tokens; :55 halftone token
- `src/SystemFolder/ControlPanels/AppearanceManager/styles/scrollbars.scss` - :163-164,170-171 alpha tokens
- `src/SystemFolder/Finder/FinderAboutThisComputer.scss` - :30 alpha; :53,83 shade(system-04, 10%)
- `src/SystemFolder/WebViewer/WebViewer.scss` - :6 var(--color-white)
- `src/SystemFolder/SystemResources/ProgressBar/ClassicyProgressBar.scss` - :68 var(--color-white)
- `src/SystemFolder/SystemResources/ControlGroup/ClassicyControlGroup.scss` - :31 tint(system-01, 6%)
- `src/SystemFolder/SystemResources/QuickTime/QuickTimeMovieEmbed.scss` - :89 alpha(black, 50%)
- `src/SystemFolder/ControlPanels/AppearanceManager/styles/appearance.scss` - :225-237 theme-halftone rewrite; encode-color deleted
- `src/Appearance/vocabulary/ClassicyLiteralColors.test.ts` - create

## Work Log
### 2026-10-29T20:14:15.844Z - Moved one open [MANUAL] acceptance criterion to the program V&V ticket 0083-v8n (human verification and validation), where it is tracked and ticked. This story now closes on its automated criteria; 0083-v8n links back with `depends`.

### 2026-10-30T00:22:20.817Z - Started on feat/appearance-part-g-v2 (worktree part-g) at post-B base 8bbaa7288. The owner ruled the error title-bar pink as ruling G15 (2026-10-30): classicy-tint(--color-error, 80%) = #ffcccc. The implementer brief is the part-g ledger task-1.2-brief.md; parity uses the shared post-B baseline at .playwright-mcp/parity/post-b/.

### 2026-10-30T01:53:15.551Z - Implemented at 6f6838d76 (pushed). RED→GREEN on 11 tests. Gate: lint, tsc, 4086 tests (no timeouts), build:source with verify:dist. 22 real literal sites became tokens, tints, shades or alphas. Parity: 294/302 at AE 0; the 8 that differ (7 dialogs-alert--*, desktop-window--fixed-modal) differ only inside the title-bar band, #f7cecd → #ffcccc, the G15 named change. Forced: Chromium 52/67 identical, with the other 15 being the title-bar color or a format-only QuickTime readback; Firefox 6/6. Ruling G16 settles the halftone scope: G provides the token-painted ::before fallback reading --classicy-art-halftone, and E 3.1 owns the art. platinum-encode-color is removed, which is a host-facing breaking change noted in the migration table. The task review is in progress.

### 2026-10-30T01:59:13.353Z - Review APPROVED at 6f6838d76, with no Critical or Important findings. The reviewer rendered each literal next to its replacement in Chromium 143 and Firefox 157: all byte-identical, including the 239.02 groove, except G15's title-bar fill. The halftone is byte-identical in the default, selected, open and selected+open states in both engines. The pins and the migration rows changed in the same commit. The controller re-ran the sweep at the commit with `git grep`: the literal criterion matches 5 lines, all false positives (the two color-helper definitions, the CrashScreen keyword fallback and two comments), so the criterion was rewritten to strip comments and exclude those. It gives 0 at 6f6838d76 and 22 at the base. `#f7cecd` occurs nowhere, and `encode-color` survives only in a test regex asserting its absence. Minors 1-3 and 5 (README breaking-change bullet, the halftone art contract in AGENT-REFERENCE, a tighter no-literal guard, the `window` rename) are folded into G 2.2. Minor 4 (a shared rule() test helper) is noted for the whole-branch pass.
