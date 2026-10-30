---
id: 0011-v9t
title: 'Part H: Pixel-literal purge'
type: impl
status: in_progress
priority: "2"
effort: L
created: "2026-10-28T19:31:45.820Z"
updated: "2026-10-30T12:17:07.168Z"
tags: []
milestone: ""
due_date: ""
planned_start: ""
planned_end: ""
order: 0
links:
  repo:
    local: ~/classicy
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
  plans:
    - ["0002-ldj", "parent"]
    - ["0005-1b3", "depends"]
    - ["0004-vqt", "depends"]
    - ["0000-aud", "included"]
progress:
  "0":
    status: complete
  "1":
    status: pending
  "1.1":
    status: in_progress
  "2":
    status: pending
  "2.1":
    status: pending
  "3":
    status: pending
  "3.1":
    status: pending
  "4":
    status: pending
  "4.1":
    status: pending
  "5":
    status: pending
  "5.1":
    status: pending
  "6":
    status: pending
  "6.1":
    status: pending
  "6.2":
    status: pending
  "7":
    status: pending
  "7.1":
    status: pending
  "8":
    status: pending
---

# Part H: Pixel-literal purge

## Summary

**Goal:** Every bare `Npx` in `src/**/*.scss` (283 today, plus 50 `var(--x, Npx)` fallbacks) becomes a theme variable, a named derivation, or a `measurements.<family>` knob emitted by a generic walker, enforced by a lint gate whose allowlist shrinks to empty, with Platinum pixel-identical.

**Problem:** Audit §2.5 counts 331 pixel literals (re-measured 2026-10-28: 283 bare + 50 fallbacks, excluding `savers/**`, `0px` and base64 `url()` payloads). Worst offenders: ControlStrip 84, HyperCard 40, FinderAboutThisComputer 20, menu frame 19 (`appearance.scss:20-52`, after Part B `src/Appearance/Platinum/styles/_mixins.scss`), Pager 17, ColorPicker 16, AppleGuide 12, BalloonHelp 9, scrollbars 8, PopUpSlider 7, FinderPreferences 7, then 23 files with 1–4 each. A package cannot resize pixel-matched art without editing Classicy SCSS (D9, §8.7). The 50 fallbacks hide a missing variable instead of failing loudly.

**Approach:** Add `bin/check-pixel-literals.ts` (run by `pnpm lint`) with a per-file count allowlist that each section ratchets down; add the `measurements.<family>` walker to `getThemeVars` and the knob families to `platinum.json`; rewrite the SCSS surface by surface; finally drop every fallback and pin a test that every `var(--…)` read in SCSS is emitted, declared, or set from TSX.

---

# Part 2 — Implementation

**Architecture:** Implements audit §9 Phase 6 item 3 (D9) under umbrella plan 0002-ldj, 'Shared Contract — colors and numbers' third bullet: knobs under `measurements.<family>` in `src/Appearance/Platinum/platinum.json`, emitted as `--<kebab family>-<kebab key>: <n>px` by a generic walker in `getThemeVars`. Depends on Part B (Platinum package, `platinum.json`, `_mixins.scss`) and Part G (named derivations; H consumes `--menu-item-height`-style names and adds only the four listed in 6.1). For agentic workers: use superpowers:subagent-driven-development or superpowers:executing-plans task-by-task; steps use checkbox syntax.

**Tech Stack:** TypeScript 5.9, Node 24 (runs `.ts` scripts natively, `node bin/x.ts`), zod 4, SCSS (dart-sass 1.101, `calc()` with `var()`), vitest 5/jsdom, Biome, Storybook + Playwright + ImageMagick `compare`.

## Constraints

- Platinum renders pixel-identical: every parity story compares AE 0 before vs after; no section names a visual change.
- Before each commit: `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`; `pnpm lint` includes the new pixel gate from 1.1 on.
- The gate exempts only: `0px`, `calc(infinity * 1px)`, `@media`/`@container` prelude lines, comments, `url(…)` payloads, and `src/SystemFolder/Extensions/ScreenSaver/savers/**` (audit scope). Nothing else is ever exempt; the allowlist ends empty.
- A literal that equals an existing token with the same meaning reads that token (`4px` gap → `--layout-item-gap`, `16px` gap → `--layout-group-gap`, `6px` padding → `--window-padding-size`, `1px` edge → `--window-border-size`, `16px` icon → `--icon-small-size`); a true ratio reads a Part G derivation by name; anything else becomes a `measurements.<family>` knob with today's value. Never `calc(var(--x) * N)` with an unnamed N.
- No new `--hig-*`, no aliases, no `!important` added; `classicyLog` instead of `console.*`; `src/index.ts` and other barrels are generated (`pnpm exec barrelsby -c .ts-barrel.json`), never hand-edited.
- Commits end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`; American English spelling in code, comments and docs.
- Review focus: (1) the gate must not be fooled by a literal on a line that also contains `var(--` → 1.1 test `counts a bare literal beside a var() read`; (2) a persisted theme without knob families must not emit `undefined` or `NaNpx` → 2.1 test `heals knob families from the package defaults`; (3) the walker must not rename a core input (`--window-control-size` etc. byte-identical) → 2.1 existing test `emits every metric input and derivation for the default theme`; (4) Control Strip pressed offsets must stay +1 px → 3.1 parity on `desktop-controlstrip--*`; (5) dropping a fallback must never leave an unemitted variable → 6.1 coverage test.

## Files

| File | Change | Responsibility |
|---|---|---|
| `bin/check-pixel-literals.ts` | create | Scanner + CLI: `scanPixelLiterals(root)` and the allowlist ratchet; exit 1 on violations. |
| `bin/check-pixel-literals.test.ts` | create | Unit tests for the scanner's exemptions and the ratchet. |
| `bin/pixel-literal-allowlist.json` | create | `{ "<repo-relative scss path>": <count> }`; shrinks to `{}` by 6.1. |
| `package.json` | modify | `lint` runs the gate after Biome. |
| `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetrics.ts` | modify | `classicyMeasurementVars` walker, `classicyThemeMeasurementDefaults(packageId)`, `withDefaultThemeMetrics(theme, defaults)`. |
| `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.ts` | modify | `getThemeVars` spreads the walker; `ClassicyThemeMeasurements` gains an index signature; four derivations added if Part G did not. |
| `src/SystemFolder/ControlPanels/AppManager/ClassicyStateMigrations.ts` | modify | Metric healing uses `classicyThemeMeasurementDefaults(theme.package)`. |
| `src/Appearance/Platinum/platinum.json` | modify | `defaults.measurements.<family>` knob families (values in 2.1) and the same block on every preset. |
| `src/Appearance/Platinum/index.ts` | modify | Platinum `options` schema gains the knob families via `knobSchema`. |
| `src/Appearance/Platinum/styles/_mixins.scss` | modify | Menu frame (19) and Control Strip bevel mixins read `--menu-frame-*` / `--control-strip-*`. |
| `src/Appearance/Platinum/styles/_scrollbars.scss` | modify | Arrow glyph box reads `--scrollbar-arrow-glyph-*`. |
| `src/SystemFolder/SystemResources/ControlStrip/ClassicyControlStrip.scss` | modify | 84 literals → `--control-strip-*`. |
| `src/SystemFolder/SystemResources/ControlStrip/ClassicyControlStrip.tsx` | modify | `MODULE_STEP_FALLBACK` read from `--control-strip-module-width` + `--control-strip-border-width`. |
| `src/SystemFolder/SystemResources/{Pager,BalloonHelp,PopUpSlider}/*.scss` | modify | Pixel-matched surfaces read their knob family. |
| `src/SystemFolder/HyperCard/HyperCard.scss` | modify | 40 literals → tokens and `--hyper-card-*`. |
| `src/SystemFolder/Finder/{FinderAboutThisComputer,FinderPreferences}.scss` | modify | 27 literals → tokens and `--finder-*`. |
| `src/SystemFolder/Extensions/AppleGuide/AppleGuide.scss` | modify | 12 literals → `--apple-guide-*`. |
| `src/SystemFolder/SystemResources/ColorPicker/ClassicyColorPicker.scss` | modify | 16 literals → tokens and `--color-picker-*`; Sass ratio math made unitless. |
| `src/SystemFolder/**/*.scss (long tail, 23 files listed in 6.1)` | modify | 43 literals and 50 fallbacks. |
| `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.varCoverage.test.ts` | create | Every `var(--…)` read in SCSS is emitted by `getThemeVars`, declared in SCSS, or set from TS/TSX. |
| `docs/AGENT-REFERENCE.md` | modify | Knob families table; the pixel gate. |
| `CLAUDE.md` | modify | Two sentences: no pixel literals; knob families. |

## Phase 0: Parity baseline

- [ ] Confirm Parts B and G are merged: `test -f src/Appearance/Platinum/platinum.json && test -f src/Appearance/Platinum/styles/_mixins.scss && grep -c 'menu-item-height' src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.ts` (expect the files to exist and a count ≥ 1). Stop if not.
- [ ] Start Storybook (`pnpm storybook`, background; note the port). `curl -s http://localhost:<port>/index.json` and collect every story id whose title is one of: Desktop/ControlStrip, Desktop/Menu, Desktop/Window, Desktop/WindowFrame, Controls/Pager, Controls/BalloonHelp, Controls/PopUpSlider, Controls/ColorPicker, Controls/HelpButton, Controls/Kbd, Controls/Link, Controls/Table, Controls/Tree, Controls/Placard, Controls/BevelButton, Controls/ProgressBar, Controls/Slider, Controls/PopUpMenu, Controls/ControlGroup, Controls/ControlLabel, Controls/FileInput, Controls/ImageWell, Controls/Separator, Controls/Input, Controls/KeyboardEquivalentField, Dialogs/Alert, Dialogs/InputDialog, Dialogs/FileOpenDialog, Extensions/AppleGuide, System/CrashScreen, System/StartupScreen, and the QuickTimeMovieEmbed and AboutWindow stories; save to `.playwright-mcp/parity/part-H/stories.txt`.
- [ ] Playwright: open `iframe.html?id=<id>&viewMode=story` at 1024×768, wait networkidle + 500 ms, save `.playwright-mcp/parity/part-H/before/<id>.png` for each id. `ls before | wc -l` equals the line count of stories.txt.
- [ ] HyperCard, Finder About This Computer, Finder Preferences and Drive Setup have no stories: run the example app (`pnpm preview`), open each (Apple menu → About This Computer; Finder → Edit → Preferences; HyperCard editor with one selected button; Drive Setup) and save `.playwright-mcp/parity/part-H/before/app-<name>.png` at 1024×768.
- [ ] No commit.

**Validation:** ``ls .playwright-mcp/parity/part-H/before/*.png | wc -l` equals stories.txt lines + 4`

## Phase 1: Lint gate

### 1.1: bin/check-pixel-literals.ts and the ratchet allowlist

**Files:**
- Create: `bin/check-pixel-literals.ts`
- Create: `bin/check-pixel-literals.test.ts`
- Create: `bin/pixel-literal-allowlist.json`
- Modify: `package.json`
- Test: `bin/check-pixel-literals.test.ts`

**Depends on:** 0

**Interfaces:**
- Consumes: Node 24 native TS execution (`bin/classicyStyleInjector.ts` is the precedent for a `.ts` file under `bin/` with a vitest test beside it).
- Produces: `export type ClassicyPixelLiteral = { file: string; line: number; text: string; kind: "bare" | "fallback" }`; `export const scanPixelLiteralsInSource = (source: string, file: string): ClassicyPixelLiteral[]`; `export const scanPixelLiterals = (root: string): Map<string, ClassicyPixelLiteral[]>` (walks `src/**/*.scss`, skips `Extensions/ScreenSaver/savers/`); `export const checkPixelLiteralAllowlist = (found: Map<string, ClassicyPixelLiteral[]>, allowlist: Record<string, number>): string[]` (messages; empty = pass); CLI `main()` guarded by `import.meta.url === pathToFileURL(process.argv[1]).href`, reads `bin/pixel-literal-allowlist.json`, prints the messages and exits 1 when any. Scanner rules: strip `//` and `/* */` comments and the inside of `url(…)`; a match is `(?<![\w.-])-?\d+(\.\d+)?px`; `0px` and `infinity * 1px` are ignored; a line whose trimmed text starts with `@media` or `@container` is ignored; a match inside `var(--name, Npx)` is kind `fallback`, every other match `bare`. Allowlist semantics: file count must equal the listed count (fewer → message `tighten the allowlist for <file>: <n> < <listed>`; more → `<file>:<line> <text>`); a file absent from the list must have 0.

- [ ] **Step 1: Write the failing tests in bin/check-pixel-literals.test.ts** — Test code:
```ts
it('counts a bare literal beside a var() read', () => expect(scanPixelLiteralsInSource('a { padding: var(--x) 3px; }', 'f.scss')).toEqual([{ file: 'f.scss', line: 1, text: '3px', kind: 'bare' }]))
it('classifies a var() fallback', () => expect(scanPixelLiteralsInSource('a { gap: var(--button-gap, 12px); }', 'f.scss')[0].kind).toBe('fallback'))
it('ignores 0px, infinity, media preludes, comments and url payloads', () => expect(scanPixelLiteralsInSource('/* 245px */\n// 4px\n@media (max-width: 480px) {\n b { bottom: max(0px, 1%); border-radius: calc(infinity * 1px); background: url(data:image/svg+xml;base64,AAAApxAAA); }\n}', 'f.scss')).toEqual([]))
it('does not match inside identifiers', () => expect(scanPixelLiteralsInSource('$cp-wheel-max: 240; .x10px { }', 'f.scss')).toEqual([]))
it('ratchet: fewer than listed is a failure', () => expect(checkPixelLiteralAllowlist(new Map([['a.scss', [lit]]]), { 'a.scss': 2 })).toEqual(['tighten the allowlist for a.scss: 1 < 2']))
it('ratchet: unlisted file with literals fails with file:line text', () => expect(checkPixelLiteralAllowlist(new Map([['a.scss', [lit]]]), {})).toEqual(['a.scss:1 3px']))
it('scanPixelLiterals skips savers', () => expect([...scanPixelLiterals(process.cwd()).keys()].some(f => f.includes('/savers/'))).toBe(false))
```
- [ ] **Step 2: Run it to verify it fails** — Expected: FAIL — Cannot find module './check-pixel-literals'. — `pnpm exec vitest run bin/check-pixel-literals.test.ts`
- [ ] **Step 3: Implement bin/check-pixel-literals.ts per the Interfaces block** — Use `node:fs`/`node:path` only (no deps). Walk with `fs.readdirSync(dir, { withFileTypes: true })`. Report paths repo-relative with forward slashes.
- [ ] **Step 4: Seed the allowlist from the scanner** — Add a `--write-allowlist` flag that writes the current per-file counts (bare + fallback) to `bin/pixel-literal-allowlist.json`, sorted by path. Expected today (before Parts A–G landed): 283 bare + 50 fallback over 44 files, ControlStrip 88 (84 + 4 fallbacks), HyperCard 40, FinderAboutThisComputer 20, Pager 17, ColorPicker 16, AppleGuide 12, KeyboardEquivalent 12, InputDialog 11, Alert 12, BalloonHelp 9, BevelButton 8 …; record the actual numbers in the commit message. Then `node bin/check-pixel-literals.ts` → exit 0. — `node bin/check-pixel-literals.ts --write-allowlist`
- [ ] **Step 5: Wire pnpm lint** — `package.json` scripts: `"lint": "biome check . && node bin/check-pixel-literals.ts"`. Add `bin/pixel-literal-allowlist.json` to Biome's formatter include if `biome check` complains about it (run `pnpm lint`).
- [ ] **Step 6: Run tests to verify they pass** — Expected: PASS; `pnpm lint` exit 0. — `pnpm exec vitest run bin && pnpm lint`
- [ ] **Step 7: Lint, type-check, commit** — git add bin/check-pixel-literals.ts bin/check-pixel-literals.test.ts bin/pixel-literal-allowlist.json package.json && git commit -m "chore(lint): gate bare pixel literals in SCSS behind a shrinking allowlist" (with the trailer) — `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`

**Validation:** `node bin/check-pixel-literals.ts; echo exit=$?  # expect exit=0 with the seeded allowlist`

## Phase 2: Knob walker and Platinum knob families

### 2.1: classicyMeasurementVars, package measurement defaults, platinum.json families

**Files:**
- Modify: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetrics.ts`
- Modify: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.ts`
- Modify: `src/SystemFolder/ControlPanels/AppManager/ClassicyStateMigrations.ts`
- Modify: `src/Appearance/Platinum/platinum.json`
- Modify: `src/Appearance/Platinum/index.ts`
- Test: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetrics.test.ts`
- Test: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.test.ts`
- Test: `src/SystemFolder/ControlPanels/AppManager/ClassicyStateMigrations.metrics.test.ts`

**Depends on:** 1.1

**Interfaces:**
- Consumes: Part B: `platinum.json` (`defaults`, `presets`), `getClassicyAppearancePackage(id)` from `src/Appearance/ClassicyAppearancePackage.ts`, theme `package: string`, Platinum `options` zod schema built in `src/Appearance/Platinum/index.ts`. Part G: existing derivations in `getThemeVars` (lines 258-274 today) stay as they are.
- Produces: In `ClassicyAppearance.ts`: `ClassicyThemeMeasurements` becomes `{ window; control; button; groupBox; layout } & { [family: string]: Record<string, number> }`. In `ClassicyThemeMetrics.ts`: `export const kebabCase = (s: string): string` (`controlStrip` → `control-strip`, `popUpSlider` → `pop-up-slider`); `export const classicyMeasurementVars = (measurements: ClassicyThemeMeasurements): Record<string, string>` — for every family and every key whose value is a finite number emits `--${kebabCase(family)}-${kebabCase(key)}: intToPx(value)`; skips non-number leaves; `export const classicyThemeMeasurementDefaults = (packageId: string | undefined): ClassicyThemeMeasurements` = `{ ...CLASSICY_DEFAULT_THEME_METRICS, ...(getClassicyAppearancePackage(packageId ?? 'platinum')?.defaults.measurements ?? platinumJson.defaults.measurements) }` (family-level spread, package family wins; `platinumJson` is a static import of `@/Appearance/Platinum/platinum.json`); `withDefaultThemeMetrics(theme, defaults = CLASSICY_DEFAULT_THEME_METRICS)` gains the second parameter and iterates `Object.keys(defaults)` instead of the fixed five. `getThemeVars`: `const m = withDefaultThemeMetrics(theme, classicyThemeMeasurementDefaults(theme.package)).measurements;` then `...classicyMeasurementVars(m)` replaces the hand-written 1:1 input lines (today 191-194 and 235-257); `--window-scrollbar-arrow-size`, `--button-height` and every derivation stay. `migrateThemeMetrics` in `ClassicyStateMigrations.ts` calls `withDefaultThemeMetrics(t, classicyThemeMeasurementDefaults(t.package))`. `platinum.json` `defaults.measurements` (and each preset, via the same node script Part B used) gains: `controlStrip { cellHeight 22, narrowCellWidth 13, moduleWidth 30, borderWidth 1, bevelWidth 1, pressedShift 1, collapseGlyphLeft 2, collapseGlyphTop 7, scrollGlyphLeft 2, scrollGlyphTop 6, moduleIconLeft 2, moduleIconTop 3, moduleArrowLeft 22, moduleArrowTop 7 }`, `menuFrame { borderWidth 1, bevelWidth 1, shadowWidth 1, shadowStart 1, shadowOffset 2 }`, `pager { borderWidth 1, arrowWidth 42, cellHeight 36, glyphHalfHeight 8, glyphDepth 11, punchHalfHeight 5, punchDepth 7, pageMinWidth 32, pageTopBorder 2 }`, `balloonHelp { cornerRadius 8, minWidth 80, maxWidth 220, titleGap 3, tailOffset 12, tailInset 8, tailWidth 20 }`, `popUpSlider { width 17, height 73, trackLeft 4, trackTop 3, thumbLeft 1 }`, `scrollbar { arrowGlyphWidth 7, arrowGlyphHeight 8 }`, `hyperCard { fontSize 11, handleSize 6, paletteMaxWidth 220, indent 12 }`, `finder { padding 8, aboutBannerWidth 260, aboutBannerHeight 120, aboutBannerShadowOffset 4, aboutBannerShadowBlur 6, aboutRowGap 12, aboutIconSize 56, aboutLabelWidth 80, aboutValueWidth 60 }`, `appleGuide { headerHeight 42, headerPaddingX 12, headerFontSize 13, bodyFontSize 14, bodyPaddingY 12, bodyPaddingX 20, paragraphGap 12, listIndent 18, listItemGap 2, footerHeight 48, footerPaddingX 10 }`, `colorPicker { wheelMax 240, wheelInset 20, labelOverhang 14, modeListWidth 90, itemPaddingY 3, crayonHoverLift 8, crayonSelectedLift 5, boxLipHeight 22, fieldWidth 44, unitWidth 14 }`, `dialog { alertMinWidth 280, alertMaxWidth 460, inputMinWidth 300, inputMaxWidth 460, keyboardEquivalentMinWidth 300, keyboardEquivalentMaxWidth 420, fileDialogMinHeight 220 }`, `controlPanel { listMaxHeight 180, colorsScrollMaxHeight 210 }`, `progressBar { stripePeriod 40 }`, `titleBar { ditherWidth 4, ditherHeight 3 }`, `crashScreen { artWidth 245 }`, `boot { halftoneTile 4 }`, `helpButton { glyphSize 14 }`, `quickTime { captionShadowBlur 3 }`, `menu { popUpMaxHeight 300 }`, `table { resizerWidth 15 }`. In `src/Appearance/Platinum/index.ts`: `const knobSchema = (family: Record<string, number>) => z.object(Object.fromEntries(Object.keys(family).map(k => [k, z.number().min(0).max(512).describe(titleCase(k))])))` and `options.shape.measurements` extended with one `knobSchema(platinumJson.defaults.measurements.<family>)` per family above (the core five keep the schema Part B gave them).

- [ ] **Step 1: Write the failing tests** — ClassicyThemeMetrics.test.ts:
```ts
it('classicyMeasurementVars kebab-cases family and key', () => expect(classicyMeasurementVars({ controlStrip: { cellHeight: 22, moduleWidth: 30 }, popUpSlider: { trackLeft: 4 }, window: { borderSize: 1 } } as never)).toEqual({ '--control-strip-cell-height': '22px', '--control-strip-module-width': '30px', '--pop-up-slider-track-left': '4px', '--window-border-size': '1px' }))
it('classicyMeasurementVars skips non-number leaves', () => expect(classicyMeasurementVars({ x: { a: 'no', b: Number.NaN, c: 2 } } as never)).toEqual({ '--x-c': '2px' }))
it('classicyThemeMeasurementDefaults carries the Platinum knob families', () => { const d = classicyThemeMeasurementDefaults('platinum'); expect(d.controlStrip.cellHeight).toBe(22); expect(d.menuFrame.shadowOffset).toBe(2); expect(d.pager.arrowWidth).toBe(42); expect(d.balloonHelp.tailWidth).toBe(20); expect(d.popUpSlider.height).toBe(73); expect(d.scrollbar.arrowGlyphWidth).toBe(7); expect(d.window.borderSize).toBe(1) })
it('classicyThemeMeasurementDefaults falls back to Platinum for an unknown package', () => expect(classicyThemeMeasurementDefaults('nope').controlStrip.cellHeight).toBe(22))
it('withDefaultThemeMetrics(theme, defaults) fills knob families and keeps present values', () => { const t = withDefaultThemeMetrics({ ...getTheme('default'), measurements: { ...CLASSICY_DEFAULT_THEME_METRICS, controlStrip: { cellHeight: 30 } } }, classicyThemeMeasurementDefaults('platinum')); expect(t.measurements.controlStrip.cellHeight).toBe(30); expect(t.measurements.controlStrip.moduleWidth).toBe(30); expect(t.measurements.pager.arrowWidth).toBe(42) })
```
ClassicyAppearance.test.ts: keep `emits every metric input and derivation for the default theme` unchanged (it pins the core names) and add `emits every Platinum knob family` asserting `vars['--control-strip-cell-height'] === '22px'`, `['--menu-frame-shadow-offset'] === '2px'`, `['--pager-arrow-width'] === '42px'`, `['--balloon-help-tail-width'] === '20px'`, `['--pop-up-slider-height'] === '73px'`, `['--scrollbar-arrow-glyph-width'] === '7px'`, `['--hyper-card-handle-size'] === '6px'`, `['--dialog-alert-min-width'] === '280px'`; and `emits knobs for a theme persisted without them` (strip `controlStrip` from `getTheme('default')` → `getThemeVars` still gives `--control-strip-cell-height: '22px'`). ClassicyStateMigrations.metrics.test.ts: `heals knob families from the package defaults` (state whose `activeTheme.measurements` has only the core five → after `migrateClassicyState`, `activeTheme.measurements.pager.cellHeight === 36`; `getThemeVars(activeTheme)['--pager-cell-height'] === '36px'`).
- [ ] **Step 2: Run them to verify they fail** — Expected: FAIL — `classicyMeasurementVars is not a function`, knob vars undefined. — `pnpm exec vitest run src/SystemFolder/ControlPanels/AppearanceManager src/SystemFolder/ControlPanels/AppManager/ClassicyStateMigrations.metrics.test.ts`
- [ ] **Step 3: Add the families to platinum.json and the options schema** — Write the families from the Interfaces block into `defaults.measurements` and every preset's `measurements` (key order: core five, then the families in the order listed). Add `knobSchema` and the families to Platinum's `options` in `src/Appearance/Platinum/index.ts`. Verify Part B's schema keeps unknown families: `ClassicyThemeSchema.safeParse(platinumJson.defaults).data.measurements.controlStrip.cellHeight === 22` — add this as test `theme schema keeps package knob families` in ClassicyThemeSchema.test.ts; if it fails, Part B's `measurements` is not loose — change it to `z.looseObject` there before continuing.
- [ ] **Step 4: Implement the walker, the defaults helper and the getThemeVars/migration changes** — `kebabCase`, `classicyMeasurementVars`, `classicyThemeMeasurementDefaults`, the `defaults` parameter in `withDefaultThemeMetrics` (and `withDefaultThemeMetricsList`), the index signature on `ClassicyThemeMeasurements`, the spread in `getThemeVars`, and the migration call. Import `getClassicyAppearancePackage` the same way `ClassicyAppearance.ts` already reaches the registry after Part B/F (`grep -n ClassicyAppearancePackage src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.ts`); add test `getAllThemes resolves knobs when ClassicyThemeMetrics is the first module loaded` (`vi.resetModules(); const { getAllThemes } = await import('…/ClassicyAppearance'); expect(getAllThemes()[0].measurements.controlStrip.cellHeight).toBe(22)`) to prove the import cycle is evaluation-safe.
- [ ] **Step 5: Run tests to verify they pass** — Expected: PASS, including the unchanged core-name test. — `pnpm exec vitest run src/SystemFolder/ControlPanels/AppearanceManager src/SystemFolder/ControlPanels/AppManager src/Appearance`
- [ ] **Step 6: Lint, type-check, commit** — git add src/SystemFolder/ControlPanels/AppearanceManager src/SystemFolder/ControlPanels/AppManager src/Appearance/Platinum && git commit -m "feat(theme): emit measurements.<family> knobs through a generic walker and seed the Platinum families" (with the trailer) — `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`

**Validation:** `pnpm exec vitest run src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetrics.test.ts src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.test.ts`

## Phase 3: Control Strip

### 3.1: ClassicyControlStrip.scss and the strip bevel mixins (84 literals, 4 fallbacks)

**Files:**
- Modify: `src/SystemFolder/SystemResources/ControlStrip/ClassicyControlStrip.scss`
- Modify: `src/Appearance/Platinum/styles/_mixins.scss`
- Modify: `src/SystemFolder/SystemResources/ControlStrip/ClassicyControlStrip.tsx`
- Modify: `bin/pixel-literal-allowlist.json`
- Test: `src/SystemFolder/SystemResources/ControlStrip/ClassicyControlStrip.test.tsx`

**Depends on:** 2.1

**Interfaces:**
- Consumes: `--control-strip-*` from 2.1; `--focus-ring-width` / `--focus-ring-inset` (6.1 adds them to `getThemeVars` if Part G did not: `grep -c focus-ring src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.ts`; if 0, add them now as `intToPx(border)` and `intToPx(border * 3)` with the test from 6.1). Part B moved `bevel-raised`/`bevel-recessed`/`bevel-pressed` out of the component file: locate with `grep -rl 'bevel-raised\|platinum-control-strip' src/Appearance/Platinum/styles src/SystemFolder/SystemResources/ControlStrip` (expect one Platinum file; edit that one).
- Produces: Rewrite table (today's line → replacement). Sass variables: `$cell-height`→ delete, read `var(--control-strip-cell-height)`; `$narrow-cell` → `var(--control-strip-narrow-cell-width)`; `$module-width` → `var(--control-strip-module-width)`. Bevel mixins: every `1px` → `var(--control-strip-bevel-width)`, `2px` → `calc(var(--control-strip-bevel-width) * 2)`, `calc(100% - 3px)` → `calc(100% - var(--control-strip-bevel-width) * 3)`, `calc(100% - 4px)` → `* 4`. `strip-cell`: `border: 1px solid` → `var(--control-strip-border-width)`; focus `outline: 1px` → `var(--focus-ring-width)`, `outline-offset: -3px` → `calc(var(--focus-ring-inset) * -1)` (also on `.classicyControlStripTab`). `.classicyControlStrip`: `#{$cell-height + 2px}` and `height: $cell-height + 2px` → `calc(var(--control-strip-cell-height) + var(--control-strip-border-width) * 2)`; keep `var(--classicy-control-strip-bottom, 0px)` and `…-top-inset, 0px)` (instance variables set by the TSX; `0px` is exempt). `.classicyControlStripRight .classicyControlStripScrollStart` and `.classicyControlStripCollapseBox` `border-left: 1px` → `var(--control-strip-border-width)`. Collapse glyph: `left: 2px; top: 7px` → `var(--control-strip-collapse-glyph-left)` / `-top`; active `3px/8px` → `calc(var(--control-strip-collapse-glyph-left) + var(--control-strip-pressed-shift))` etc. Scroll glyph: `2px/6px` → `--control-strip-scroll-glyph-left/-top`, active `+ pressed-shift`. Module icon `2px/3px` → `--control-strip-module-icon-left/-top`; `var(--icon-small-size, 16px)` ×2 → `var(--icon-small-size)`; label `22px/7px` → `--control-strip-module-arrow-left/-top`; pressed `3px/4px`, `23px/8px` → `calc(… + var(--control-strip-pressed-shift))`. TSX: `MODULE_STEP_FALLBACK = 31` → `const moduleStepFallback = () => readDesktopPx('--control-strip-module-width') + readDesktopPx('--control-strip-border-width') || 31` where `readDesktopPx(name)` copies the `readControlSize` idiom in `useClassicyBalloonHelp.tsx:27-34`.

- [ ] **Step 1: Write the failing test** — In `ClassicyControlStrip.test.tsx` add `scrolls one module step read from the theme variables`: render the strip inside a desktop root whose style sets `--control-strip-module-width: 40px; --control-strip-border-width: 2px`, make `offsetWidth` of the first module `0` (jsdom default), click the right scroll arrow and assert `modules.scrollLeft === 42` (today 31). Also `reads no pixel literal` → `expect(scanPixelLiteralsInSource(readFileSync('src/SystemFolder/SystemResources/ControlStrip/ClassicyControlStrip.scss','utf8'), 'strip').filter(l => l.kind === 'bare')).toEqual([])`.
- [ ] **Step 2: Run it to verify it fails** — Expected: FAIL — scrollLeft 31; 84 literals listed. — `pnpm exec vitest run src/SystemFolder/SystemResources/ControlStrip -t 'module step|no pixel literal'`
- [ ] **Step 3: Rewrite the SCSS and the TSX fallback per the rewrite table** — Apply the table top to bottom; `calc()` inside `px-rect()` arguments is fine (the function only concatenates). Keep the HIGOS8 comment block; add one line: `Geometry comes from measurements.controlStrip (platinum.json); see getThemeVars.`
- [ ] **Step 4: Ratchet the allowlist** — Expected: one message `tighten the allowlist for src/SystemFolder/SystemResources/ControlStrip/ClassicyControlStrip.scss: 2 < 88` (the two exempt `0px` fallbacks do not count, so the real remaining count is 0 — set the entry to 0 and delete it; also lower the Platinum mixins file entry by the bevel literals moved). Re-run → exit 0. — `node bin/check-pixel-literals.ts`
- [ ] **Step 5: Run tests and parity** — Expected: PASS. Re-shoot `desktop-controlstrip--*` stories into `.playwright-mcp/parity/part-H/after/` and `compare -metric AE before/<id>.png after/<id>.png null:` → `0` for each (collapsed, right-docked and pressed-module stories included). — `pnpm exec vitest run src/SystemFolder/SystemResources/ControlStrip && pnpm lint`
- [ ] **Step 6: Lint, type-check, commit** — git add src/SystemFolder/SystemResources/ControlStrip src/Appearance/Platinum/styles bin/pixel-literal-allowlist.json && git commit -m "refactor(control-strip): read strip geometry from measurements.controlStrip knobs" (with the trailer) — `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`

**Validation:** `node bin/check-pixel-literals.ts && grep -c 'ClassicyControlStrip.scss' bin/pixel-literal-allowlist.json  # expect exit 0 and 0`

## Phase 4: Menu frame, scrollbars, Pager, Balloon Help, PopUpSlider

### 4.1: Pixel-matched surfaces read their knob families (60 literals)

**Files:**
- Modify: `src/Appearance/Platinum/styles/_mixins.scss`
- Modify: `src/Appearance/Platinum/styles/_scrollbars.scss`
- Modify: `src/SystemFolder/SystemResources/Pager/ClassicyPager.scss`
- Modify: `src/SystemFolder/SystemResources/BalloonHelp/ClassicyBalloonHelp.scss`
- Modify: `src/SystemFolder/SystemResources/PopUpSlider/ClassicyPopUpSlider.scss`
- Modify: `bin/pixel-literal-allowlist.json`
- Test: `src/SystemFolder/SystemResources/Pager/ClassicyPager.test.tsx`
- Test: `src/SystemFolder/SystemResources/BalloonHelp/ClassicyBalloonHelp.test.tsx`

**Depends on:** 2.1

**Interfaces:**
- Consumes: `--menu-frame-*`, `--scrollbar-arrow-glyph-*`, `--pager-*`, `--balloon-help-*`, `--pop-up-slider-*`, `--focus-ring-width` (2.1/3.1); Part G's `--ui-font-size-small` is NOT used here (Balloon Help's `calc(var(--ui-font-size) * 0.85)` is a multiplier, Part G's scope).
- Produces: Menu frame (`_mixins.scss`, the former `platinumMenuFrame` lines 20-52): `border: 1px` → `var(--menu-frame-border-width)`; the four `px-rect` lines: each `1px` → `var(--menu-frame-bevel-width)`, `calc(100% - 1px)` → `calc(100% - var(--menu-frame-bevel-width))`; right shadow `top: 1px` → `var(--menu-frame-shadow-start)`, `right: -2px; bottom: -2px` → `calc(var(--menu-frame-shadow-offset) * -1)`, `width: 1px` → `var(--menu-frame-shadow-width)`; bottom shadow `left: 1px` → shadow-start, `right/bottom: -2px` → offset, `height: 1px` → shadow-width. Scrollbars (`_scrollbars.scss` lines 298, 314, 335, 352 today): `7px 8px` → `var(--scrollbar-arrow-glyph-width) var(--scrollbar-arrow-glyph-height)`; `8px 7px` → height then width (the vertical bar's glyph is rotated). Pager: `border: 1px` → `var(--pager-border-width)`; `width: 42px` → `--pager-arrow-width`; `height: 36px` ×2 → `--pager-cell-height`; `border-block: 8px` → `--pager-glyph-half-height`; `11px` ×2 → `--pager-glyph-depth`; `border-block-width: 5px` ×2 → `--pager-punch-half-height`; `7px` ×2 → `--pager-punch-depth`; `min-width: 32px` → `--pager-page-min-width`; `font-size: 12px` → `var(--ui-font-size)`; `border-top: 2px` → `--pager-page-top-border`; the three `1px` cell borders → `--pager-border-width`. Balloon Help: `border-radius: 8px` → `--balloon-help-corner-radius`; `min-width: 80px` → `--balloon-help-min-width`; `max-width: 220px` → `--balloon-help-max-width`; `margin-bottom: 3px` → `--balloon-help-title-gap`; `bottom: -12px` / `top: -12px` → `calc(var(--balloon-help-tail-offset) * -1)`; `left: 8px` / `right: 8px` → `--balloon-help-tail-inset`; `calc(50% - 10px)` → `calc(50% - var(--balloon-help-tail-width) / 2)`. PopUpSlider: `width: 17px` → `--pop-up-slider-width`; `height: 73px` → `--pop-up-slider-height`; focus `1px` → `var(--focus-ring-width)`, `outline-offset: -1px` → `calc(var(--focus-ring-width) * -1)`; `left: 4px; top: 3px` → `--pop-up-slider-track-left/-top`; `left: 1px` → `--pop-up-slider-thumb-left`.

- [ ] **Step 1: Write the failing tests** — Pager: `reads its geometry from --pager-* variables` → render `<ClassicyPager>` inside a div with `style={{ '--pager-arrow-width': '50px' }}` and assert `getComputedStyle(prevArrow).width` is `'50px'`? jsdom does not cascade custom properties into `calc`, so instead assert the SCSS source: `expect(readFileSync(pagerScss,'utf8')).toMatch(/width:\s*var\(--pager-arrow-width\)/)` and `no bare literal` via `scanPixelLiteralsInSource(...).filter(bare)` → `[]`. Same `no bare literal` test for BalloonHelp (in `ClassicyBalloonHelp.test.tsx`), and a `_mixins.scss`/`_scrollbars.scss`/`ClassicyPopUpSlider.scss` source check in a new `src/Appearance/Platinum/styles/pixelLiterals.test.ts` (one `it.each` over the three files).
- [ ] **Step 2: Run them to verify they fail** — Expected: FAIL with the literal lists (17, 9, 19+8+7). — `pnpm exec vitest run src/SystemFolder/SystemResources/Pager src/SystemFolder/SystemResources/BalloonHelp src/Appearance/Platinum/styles`
- [ ] **Step 3: Rewrite the five files per the table** — Keep every comment that explains a measurement; append `(measurements.<family>, platinum.json)` where a comment names a pixel value.
- [ ] **Step 4: Ratchet the allowlist** — Expected: five `tighten` messages; delete the five entries; re-run → exit 0. — `node bin/check-pixel-literals.ts`
- [ ] **Step 5: Run tests and parity** — Expected: PASS. Re-shoot `desktop-menu--*`, `controls-pager--*`, `controls-balloonhelp--*`, `controls-popupslider--*`, `desktop-window--*` (scrollbars) into `after/`; `compare -metric AE` → `0` each. — `pnpm exec vitest run src/SystemFolder/SystemResources/Pager src/SystemFolder/SystemResources/BalloonHelp src/SystemFolder/SystemResources/PopUpSlider src/SystemFolder/SystemResources/Menu src/Appearance`
- [ ] **Step 6: Lint, type-check, commit** — git add src/Appearance/Platinum/styles src/SystemFolder/SystemResources/Pager src/SystemFolder/SystemResources/BalloonHelp src/SystemFolder/SystemResources/PopUpSlider bin/pixel-literal-allowlist.json && git commit -m "refactor(scss): menu frame, scrollbar arrows, pager, balloon help and pop-up slider read package knobs" (with the trailer) — `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`

**Validation:** `node bin/check-pixel-literals.ts && ! grep -E 'Pager|BalloonHelp|PopUpSlider|_mixins|_scrollbars' bin/pixel-literal-allowlist.json`

## Phase 5: HyperCard, Finder, Apple Guide, Color Picker

### 5.1: App surfaces read tokens or their family knobs (95 literals)

**Files:**
- Modify: `src/SystemFolder/HyperCard/HyperCard.scss`
- Modify: `src/SystemFolder/Finder/FinderAboutThisComputer.scss`
- Modify: `src/SystemFolder/Finder/FinderPreferences.scss`
- Modify: `src/SystemFolder/Extensions/AppleGuide/AppleGuide.scss`
- Modify: `src/SystemFolder/SystemResources/ColorPicker/ClassicyColorPicker.scss`
- Modify: `bin/pixel-literal-allowlist.json`
- Test: `src/SystemFolder/HyperCard/HyperCard.pixelLiterals.test.ts`

**Depends on:** 2.1

**Interfaces:**
- Consumes: Knob variables from 2.1 (`--hyper-card-*`, `--finder-*`, `--apple-guide-*`, `--color-picker-*`), core tokens, `--focus-ring-width`/`--focus-ring-inset`. Color literals on the same lines (`#999`, `rgba(255,255,255,.5)`, `#cc0000` fallbacks) are Part G's and are left as Part G left them.
- Produces: HyperCard (40): `:54,66,180,248 border: 1px` → `var(--window-border-size)`; `:57 font-size: 11px` → `var(--hyper-card-font-size)`; `:186-187 6px` → `var(--hyper-card-handle-size)`; `:192-199` every `-3px` → `calc(var(--hyper-card-handle-size) / -2)` and every `calc(50% - 3px)` → `calc(50% - var(--hyper-card-handle-size) / 2)` (16); `:204,205,210,229,244,249,252 4px` → `var(--layout-item-gap)`; `:215,266 padding: 2px 4px` → `calc(var(--layout-item-gap) / 2) var(--layout-item-gap)`; `:222,223,238,239 6px` → `var(--window-padding-size)`; `:224 max-width: 220px` → `var(--hyper-card-palette-max-width)`; `:257 margin-left: 12px` → `var(--hyper-card-indent)`. FinderAboutThisComputer (20): `:13 gap: 16px` → `--layout-group-gap`; `:14,39 padding: 8px` → `--finder-padding`; `:19 260px` → `--finder-about-banner-width`; `:20 120px` → `--finder-about-banner-height`; `:30 drop-shadow(4px 4px 6px …)` → `drop-shadow(var(--finder-about-banner-shadow-offset) var(--finder-about-banner-shadow-offset) var(--finder-about-banner-shadow-blur) …)`; `:47 gap: 12px` → `--finder-about-row-gap`; `:50,51 56px` → `--finder-about-icon-size`; `:52 padding: 4px` → `--layout-item-gap`; `:69 padding: 4px 8px 6px` → `var(--layout-item-gap) var(--finder-padding) var(--window-padding-size)`; `:93 gap: 6px` → `--window-padding-size`; `:94 padding: 4px 8px` → `var(--layout-item-gap) var(--finder-padding)`; `:104 80px` → `--finder-about-label-width`; `:108 60px` → `--finder-about-value-width`. FinderPreferences (7): `:4,5,23 8px` → `--finder-padding`; `:12 gap: 4px`, `:16 margin: 4px 0 0` → `--layout-item-gap`; `:28,29 16px` → `--icon-small-size`. AppleGuide (12): `:23 42px` → `--apple-guide-header-height`; `:24 0 12px` → `0 var(--apple-guide-header-padding-x)`; `:28 13px` → `--apple-guide-header-font-size`; `:35 14px` → `--apple-guide-body-font-size`; `:37 12px 20px` → `var(--apple-guide-body-padding-y) var(--apple-guide-body-padding-x)`; `:40,44 0 0 12px` → `0 0 var(--apple-guide-paragraph-gap)`; `:45 18px` → `--apple-guide-list-indent`; `:58 2px` → `--apple-guide-list-item-gap`; `:69 48px` → `--apple-guide-footer-height`; `:70 0 10px` → `0 var(--apple-guide-footer-padding-x)`. ColorPicker (16): `:11-12` → `$cp-wheel-max: 240; $cp-wheel-inset: math.div(20, $cp-wheel-max) * 100%;` (unitless; `:304 inset: $cp-wheel-inset` stays a percentage) and `:297 max-width: $cp-wheel-max` → `var(--color-picker-wheel-max)`; `:17` → delete, `:299 margin-left` → `var(--color-picker-label-overhang)`; `:78 90px` → `--color-picker-mode-list-width`; `:88,89` → `var(--focus-ring-width)` / `calc(var(--focus-ring-inset) * -1)`; `:93 3px 6px` → `var(--color-picker-item-padding-y) var(--window-padding-size)`; `:219 -8px` → `calc(var(--color-picker-crayon-hover-lift) * -1)`; `:227 -5px` → `calc(var(--color-picker-crayon-selected-lift) * -1)`; `:233 22px` → `--color-picker-box-lip-height`; `:236 6px` → `--window-padding-size`; `:241 20px` → `var(--control-height)`; `:358 44px` → `--color-picker-field-width`; `:362 4px` → `--layout-item-gap`; `:371 14px` → `--color-picker-unit-width`.

- [ ] **Step 1: Write the failing test** — `src/SystemFolder/HyperCard/HyperCard.pixelLiterals.test.ts`: `it.each([HyperCard.scss, FinderAboutThisComputer.scss, FinderPreferences.scss, AppleGuide.scss, ClassicyColorPicker.scss])('%s has no bare pixel literal', f => expect(scanPixelLiteralsInSource(readFileSync(f,'utf8'), f).filter(l => l.kind === 'bare').map(l => `${l.line}:${l.text}`)).toEqual([]))`.
- [ ] **Step 2: Run it to verify it fails** — Expected: FAIL listing 40, 20, 7, 12, 16 entries. — `pnpm exec vitest run src/SystemFolder/HyperCard/HyperCard.pixelLiterals.test.ts`
- [ ] **Step 3: Rewrite the five files per the table** — Verify each cited line first (`grep -n px <file>`); Parts A/G may have shifted lines but not the literals. ColorPicker: after making `$cp-wheel-max` unitless, `pnpm exec sass --no-source-map src/SystemFolder/SystemResources/ColorPicker/ClassicyColorPicker.scss | grep -c 'inset: 8.3333'` → 1.
- [ ] **Step 4: Ratchet the allowlist** — Expected: five `tighten` messages; delete the entries; re-run → exit 0. — `node bin/check-pixel-literals.ts`
- [ ] **Step 5: Run tests and parity** — Expected: PASS. Re-shoot `extensions-appleguide--*`, `controls-colorpicker--*` into `after/` → AE 0; re-shoot the four example-app screens (`app-hypercard`, `app-about`, `app-finder-preferences`, `app-drive-setup`) → AE 0. — `pnpm exec vitest run src/SystemFolder/HyperCard src/SystemFolder/Finder src/SystemFolder/Extensions/AppleGuide src/SystemFolder/SystemResources/ColorPicker`
- [ ] **Step 6: Lint, type-check, commit** — git add src/SystemFolder/HyperCard src/SystemFolder/Finder src/SystemFolder/Extensions/AppleGuide src/SystemFolder/SystemResources/ColorPicker bin/pixel-literal-allowlist.json && git commit -m "refactor(scss): HyperCard, Finder, Apple Guide and Color Picker read theme variables and knobs" (with the trailer) — `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`

**Validation:** `pnpm exec vitest run src/SystemFolder/HyperCard/HyperCard.pixelLiterals.test.ts`

## Phase 6: Long tail, fallbacks and variable coverage

### 6.1: Remaining 43 literals, the 50 fallbacks, four derivations, coverage test

**Files:**
- Create: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.varCoverage.test.ts`
- Modify: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.ts`
- Modify: `src/SystemFolder/SystemResources/{ProgressBar,Alert,File,InputDialog,Window,KeyboardEquivalent,Link,FileInput,CrashScreen,Boot,Slider,HelpButton,Kbd,BevelButton,QuickTime,ControlLabel,PopUpMenu,Table,FileDialog,ControlGroup,Tree,Placard,ImageWell}/*.scss`
- Modify: `src/SystemFolder/ControlPanels/DriveSetup/DriveSetupList.scss`
- Modify: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Colors.scss`
- Modify: `bin/pixel-literal-allowlist.json`
- Test: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.test.ts`
- Test: `src/SystemFolder/SystemResources/HelpButton/ClassicyHelpButton.test.tsx`

**Depends on:** 3.1, 4.1, 5.1

**Interfaces:**
- Consumes: Part G derivations by name; Part A removed `--box-border-size`, `--color-theme-1`, `--color-theme-hover`, `--color-theme-selection` (verify: `grep -rn 'box-border-size\|color-theme-1\b\|theme-hover\|theme-selection' src --include=*.scss` → 0; if any remain, rewrite `--box-border-size, 2px` to `var(--control-frame-width)` here and report to Part A). Part C's `useClassicyAssetVars` emits `--classicy-art-*` / `--classicy-cursor-*`; Part F's `classicyLayoutVars` (`useClassicyAppearanceLayout.ts`, spread by `ClassicyDesktop`) publishes `--classicy-layout-*` on the desktop root, not `getThemeVars`.
- Produces: Derivations added to `getThemeVars` ONLY if absent (`grep -c '<name>' ClassicyAppearance.ts` = 0): `--focus-ring-width` = `intToPx(border)`, `--focus-ring-inset` = `intToPx(border * 3)`, `--control-corner-radius` = `intToPx(border * 2)`, `--window-shadow-offset` = `intToPx(border * 2)` — these four are H's additions to Part G's inventory; say so in the commit body. Rewrites: ProgressBar `:53 --slide-var: 40px` → `var(--progress-bar-stripe-period)`, `:64,65 + 10px` → `+ var(--progress-bar-stripe-period) / 4`, `:66 + 20px` → `/ 2`; Alert `:9,10` → `var(--dialog-alert-min-width)` / `--dialog-alert-max-width`, `:39 padding-top: 1px` → `var(--window-border-size)`; FileDrag `:28 outline: 2px` → `var(--control-frame-width)`, `:29 -2px` → `calc(var(--control-frame-width) * -1)`, `:42 border: 2px` → `var(--control-frame-width)`; DriveSetupList `:20 180px` → `var(--control-panel-list-max-height)`, `:31 2px 6px` → `calc(var(--layout-item-gap) / 2) var(--window-padding-size)`; InputDialog `:9,10` → `--dialog-input-min-width` / `-max-width`; Window `:682 background-size: 4px 3px` (if Part E left it) → `var(--title-bar-dither-width) var(--title-bar-dither-height)`; WindowFrame `:11 box-shadow: 2px 2px 0` → `var(--window-shadow-offset) var(--window-shadow-offset) 0`; KeyboardEquivalent `:35,36` → `--dialog-keyboard-equivalent-min-width` / `-max-width`; Link `:15 1px` → `var(--focus-ring-width)`, `:16 outline-offset: 1px` → `var(--focus-ring-width)`; FileInput `:19,20 1px` → `var(--window-border-size)` (visually-hidden hairline); CrashScreen `:18 245px` → `var(--crash-screen-art-width)`; BootSequence `:13 4px 4px` → `var(--boot-halftone-tile) var(--boot-halftone-tile)`; Slider `:75,91 999px` → `calc(infinity * 1px)`; HelpButton `:17,18 14px` → `var(--help-button-glyph-size)`; Kbd `:36 2px` → `var(--control-corner-radius)`, `:37 1px` → `var(--focus-ring-width)`; BevelButton `:162 inset 1px 1px 0 0` → `inset var(--window-border-size) var(--window-border-size) 0 0`; QuickTimeMovieEmbed `:242 0px 0 3px` → `0 0 var(--quick-time-caption-shadow-blur)`; ControlLabel `:77 @media (max-width: 480px)` stays (exempt prelude; add comment `viewport breakpoint, not a theme value`); PopUpMenu `:134 300px` → `var(--menu-pop-up-max-height)`; Table `:109 15px` → `var(--table-resizer-width)`; FileOpenDialog `:14 220px` → `var(--dialog-file-dialog-min-height)`; ControlGroup `:36 1px` → `var(--window-border-size)`; AppearanceManager.Colors `:16 210px` → `var(--control-panel-colors-scroll-max-height)`. Fallbacks (50): delete the `, Npx` in every `var(--name, Npx)` whose name `getThemeVars` emits (`--icon-size-regular` ×10, `--icon-small-size` ×2, `--layout-focus-gap` ×6, `--layout-group-gap` ×6, `--layout-dialog-edge` ×3, `--button-gap` ×3, `--control-frame-width` ×3, `--control-bevel-sm/-md` ×2 each, `--control-bevel-lg`, `--control-row-height`, `--edit-field-height` ×2, `--help-button-height`, `--help-button-width`, `--ui-font-size`, `--window-control-size` ×2, `--window-padding-size`) in KeyboardEquivalent, InputDialog, Alert, BevelButton, DriveSetupList, Tree, Placard, StartupScreen, HelpButton, ImageWell; keep the two `--classicy-control-strip-*, 0px` instance fallbacks. Update `ClassicyHelpButton.test.tsx:109-110` expectations to `var(--help-button-width)` / `var(--help-button-height)`.

- [ ] **Step 1: Write the failing tests** — ClassicyAppearance.test.ts: `emits the focus ring, corner radius and window shadow derivations` (`--focus-ring-width` '1px', `--focus-ring-inset` '3px', `--control-corner-radius` '2px', `--window-shadow-offset` '2px'; with `borderSize: 2` → '2px', '6px', '4px', '4px'). ClassicyAppearance.varCoverage.test.ts: `every var(--…) read in src/**/*.scss is emitted, declared or set from TSX` — collect reads with `/var\(\s*(--[a-zA-Z0-9-]+)/g` over `src/**/*.scss` minus `savers/**`; allowed = `new Set(Object.keys(getThemeVars(getTheme('default'))))` ∪ names matching `/^--(\S+):/m` declared in any `src/**/*.scss` ∪ names appearing as string literals `"--name"`/`'--name'` in any `src/**/*.{ts,tsx}` ∪ names matching `/^--classicy-(art|cursor|layout)-/`; `expect([...reads].filter(n => !allowed.has(n)).sort()).toEqual([])`. `no var() fallback carries a pixel literal` — `scanPixelLiterals(root)` entries with `kind === 'fallback'` whose text is not `0px` → `[]`. `the pixel allowlist is empty` — `expect(JSON.parse(readFileSync('bin/pixel-literal-allowlist.json','utf8'))).toEqual({})`.
- [ ] **Step 2: Run them to verify they fail** — Expected: FAIL — derivations undefined (unless Part G added them), 48 fallbacks listed, allowlist non-empty; the coverage test lists exactly the names Part A was to remove (expected `[]` if A is complete). — `pnpm exec vitest run src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.test.ts src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.varCoverage.test.ts`
- [ ] **Step 3: Add the derivations (if absent) and apply the rewrite and fallback tables** — One file at a time; `grep -n px <file>` before and after. Update the HelpButton test expectations in the same change.
- [ ] **Step 4: Empty the allowlist** — Expected: `tighten` messages for every remaining entry; write `{}`; re-run → exit 0 with no output. — `node bin/check-pixel-literals.ts`
- [ ] **Step 5: Run tests to verify they pass** — Expected: PASS (coverage test `[]`, allowlist `{}`). — `pnpm test`
- [ ] **Step 6: Lint, type-check, commit** — git add -A src bin/pixel-literal-allowlist.json && git commit -m "refactor(scss): purge the remaining pixel literals and var() fallbacks; pin variable coverage" (body: lists the four derivations added beyond Part G) (with the trailer) — `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`

**Validation:** `node bin/check-pixel-literals.ts && test "$(cat bin/pixel-literal-allowlist.json | tr -d ' \n')" = '{}'`

### 6.2: Multiplier inventory (added 2026-10-30, owner ruling H-R6)

**Goal:** Work Part G's one-off multiplier inventory (86 `calc(var(--x) * N)` sites at G's landing; AGENT-REFERENCE §8) down to the sites G kept on purpose, so no unnamed proportion survives in `src/**/*.scss`.

**Depends on:** 6.1 (E-dependent sites after Part E lands, per H-R9)

**Interfaces:**
- Consumes: `bin/check-pixel-literals.ts` (1.1) and its scanner; `CLASSICY_THEME_DERIVATIONS` and G13 reservation; the 2.1 knob walker.
- Produces: `kind: "multiplier"` in the scanner with its own ratchet allowlist (`bin/multiplier-allowlist.json`), seeded from the live sites and ending at G's kept-on-purpose sites (`ClassicyIcon.scss` ×2, `ClassicyDesktopIcon.scss` `/4`, `ClassicyWindow.scss` `/4`, `_scrollbars.scss` arrow forms ×3) plus H-R7's stated-reason exceptions (pixel-grid multiples inside package pixel art; handle-centering halves), each with a one-line reason. Every other site becomes a named derivation (a structural role shared across the theme; appended to `CLASSICY_THEME_DERIVATIONS`) or a knob (a component-local size); never more than one name per role.

- [ ] **Step 1: Write the failing tests** — the scanner reports `kind: "multiplier"`; a fixture with one unnamed `calc(var(--x) * 3)` fails the ratchet; the allowlist's every entry carries a reason.
- [ ] **Step 2: Seed the allowlist from the live sites, then convert the E-independent sites** — derivation or knob per site; parity AE 0 on the touched stories (H-R10).
- [ ] **Step 3: After Part E lands, convert the E-file sites** (Window, WindowFrame, `ClassicyWindowTitleBar.scss`, Tabs, Menu, `_Slider.scss`) and tighten the allowlist to the kept-on-purpose set.
- [ ] **Step 4: Docs** — AGENT-REFERENCE §8: the inventory is replaced by the kept-on-purpose list with reasons; new derivations and knobs documented.
- [ ] **Step 5: Lint, type-check, test, commit.**

**Validation:** `node bin/check-pixel-literals.ts` exits 0 and `bin/multiplier-allowlist.json` lists only the kept-on-purpose and stated-reason sites.

## Phase 7: Parity and documentation

### 7.1: Full parity re-shoot and docs

**Files:**
- Modify: `docs/AGENT-REFERENCE.md`
- Modify: `CLAUDE.md`
- Modify: `docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md` (plan 0000-aud)

**Depends on:** 6.1

**Interfaces:**
- Consumes: `.playwright-mcp/parity/part-H/before/` from Phase 0.
- Produces: `after/` set with AE 0 everywhere; AGENT-REFERENCE §8 gains a 'Package knob families' table (family → keys → CSS variables → Platinum values, generated by a one-off script over `platinum.json`) and a 'Pixel literal gate' paragraph; CLAUDE.md Theming gets: 'No bare `Npx` in `src/**/*.scss` (`bin/check-pixel-literals.ts`, run by `pnpm lint`); pixel-matched surfaces read `measurements.<family>` knobs from `platinum.json`, emitted as `--<family>-<key>` by `getThemeVars`.'; plan 0000-aud (the audit) §2.5 and §9 Phase 6 item 3 get a 'Done <date>' line.

- [ ] **Step 1: Re-shoot every Phase 0 story and app screen into after/** — Expected: `0` on every line. Any non-zero: open both images, fix the SCSS (never the screenshot), re-run. — `for f in .playwright-mcp/parity/part-H/before/*.png; do printf '%s ' "$(compare -metric AE "$f" ".playwright-mcp/parity/part-H/after/$(basename "$f")" null: 2>&1)"; echo "$f"; done`
- [ ] **Step 2: Build and grep the bundle** — Expected: only `0px` and values inside compiled `@media` preludes; `grep -c 'control-strip-cell-height' dist/classicy.css` ≥ 1. — `pnpm build:source && grep -oE '[0-9]+px' dist/classicy.css | sort | uniq -c | sort -rn | head`
- [ ] **Step 3: Write the docs** — Per the Interfaces block. Spell-check for American English (`grep -n 'colour\|behaviour\|centre' docs/AGENT-REFERENCE.md CLAUDE.md` over the lines you added → none).
- [ ] **Step 4: Lint, type-check, commit** — git add docs CLAUDE.md && git commit -m "docs(theme): document package knob families and the pixel-literal gate" (with the trailer) — `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`

**Validation:** `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test && pnpm build:source`

## Phase 8: Final verification

- [ ] `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test` → all PASS; `node bin/check-pixel-literals.ts` prints nothing and exits 0; `bin/pixel-literal-allowlist.json` is `{}`.
- [ ] `grep -rnoE '(?<![\w.-])[1-9][0-9]*(\.[0-9]+)?px' src --include=*.scss | grep -v savers | grep -v '@media' | wc -l` → 0 (independent of the gate).
- [ ] `verify` skill: run the example app; Appearance → switch Default → Azul → Default; `getComputedStyle(document.querySelector('.classicyDesktop')).getPropertyValue('--control-strip-cell-height')` → `22px`; Control Strip, a menu, a balloon and the pager in Apple Guide look unchanged.
- [ ] Stop background dev servers started by this plan.

**Validation:** `node bin/check-pixel-literals.ts; echo exit=$?  # expect exit=0, no output`

## Acceptance Criteria

- [ ] `node bin/check-pixel-literals.ts` exits 0 with an empty allowlist, and `pnpm lint` runs it.
- [ ] `getThemeVars(getTheme('default'))` emits every `measurements.<family>.<key>` of `platinum.json` as `--<kebab family>-<kebab key>: <n>px`, and the core input names are byte-identical to today's.
- [ ] A persisted theme lacking knob families renders with Platinum knob values (no `undefined`/`NaNpx`), both via `getThemeVars` and `migrateClassicyState`.
- [ ] No `var(--x, Npx)` fallback remains except the two `--classicy-control-strip-*` instance variables; the coverage test proves every `var(--…)` read is emitted, declared or set.
- [ ] Every Phase 0 story and app screen compares AE 0 before vs after.
- [ ] `pnpm lint`, `pnpm exec tsc --noEmit -p .`, `pnpm test`, `pnpm build:source` all pass.

## Self-Review

| Requirement | Delivered by |
|---|---|
| Audit §9 Phase 6 item 3: 331 → 0 pixel literals | 3.1, 4.1, 5.1, 6.1 + 1.1 gate |
| D9 pixel-matched surfaces get package-JSON metrics (contract: `measurements.<family>`, walker emits `--<family>-<key>`) | 2.1, Steps 3-4 |
| Everything else reads theme variables or Part G derivations | 5.1, 6.1 rewrite tables |
| 55 `var(--x, Npx)` fallbacks dropped once Platinum always supplies the variable | 6.1, Step 3 + coverage test |
| Lint gate with an allowlist that shrinks to empty | 1.1; ratchet steps in 3.1, 4.1, 5.1, 6.1 |
| Platinum pixel-identical | Phase 0, per-section parity, 7.1 Step 1 |

**Placeholder scan:** No TBDs. Every literal has a named replacement in a rewrite table; every knob has today's value; every test names its assertions. The only conditionals are 'if Part G/A/E already did X' checks, each with a grep that decides them.
**Residual risk:** Part B's final file layout for the Control Strip bevel mixins and Platinum's `options` schema is not pinned by the umbrella plan (3.1 and 2.1 locate them by grep). Knob families beyond the four the contract names (`popUpSlider`, `scrollbar`, `hyperCard`, `finder`, `appleGuide`, `colorPicker`, `dialog`, `controlPanel`, `progressBar`, `titleBar`, `crashScreen`, `boot`, `helpButton`, `quickTime`, `menu`, `table`) are H-local names; Part J's Options form lists them automatically. The `--focus-ring-*`, `--control-corner-radius` and `--window-shadow-offset` derivations overlap Part G's inventory if G chose other names — reconcile to G's name at 6.1 Step 3.

## Next Steps

1. Part J's Options form renders the knob families from the Platinum `options` schema; no further wiring needed here.
2. Report to the umbrella plan: `platinum.json` lists a top-level `knobs` key and the contract says `measurements.<family>` — H uses `defaults.measurements.<family>`; pin one.
3. Part G: adopt or rename the four derivations H added (6.1).
