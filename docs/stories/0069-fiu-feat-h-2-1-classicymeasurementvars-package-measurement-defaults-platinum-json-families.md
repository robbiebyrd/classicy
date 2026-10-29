---
id: 0069-fiu
title: 'H 2.1: classicyMeasurementVars, package measurement defaults, platinum.json families'
purpose: Emit every `measurements.<family>.<key>` as a CSS variable through a generic walker, seed the Platinum knob families with today's pixel values, and heal persisted themes that lack them.
type: feat
status: pending
priority: "2"
effort: L
created: "2026-10-28T20:36:01.303Z"
updated: "2026-10-29T20:22:00.352Z"
links:
  repo:
    local: ~/classicy
    files:
      - src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetrics.ts
      - src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.ts
      - src/SystemFolder/ControlPanels/AppManager/ClassicyStateMigrations.ts
      - src/Appearance/Platinum/platinum.json
      - src/Appearance/Platinum/index.ts
      - src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetrics.test.ts
      - src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.test.ts
      - src/SystemFolder/ControlPanels/AppManager/ClassicyStateMigrations.metrics.test.ts
      - src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeSchema.test.ts
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
  stories:
    - ["0083-v8n", "blocks"]
    - ["0068-02e", "depends"]
  plans:
    - ["0011-v9t", "included", ["2.1"]]
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

# H 2.1: classicyMeasurementVars, package measurement defaults, platinum.json families

## Problem Statement

Umbrella 0002-ldj ('Shared Contract — colors and numbers') pins that package knobs for pixel-matched surfaces live under `measurements.<family>` in `platinum.json` and are emitted as `--<kebab family>-<kebab key>: <n>px` by a generic walker in `getThemeVars`, so a package adds knobs without touching Classicy. Today `getThemeVars` hand-writes the five core families (`ClassicyAppearance.ts:191-194, 235-257`) and `withDefaultThemeMetrics` only fills those five.

This section (plan 0011-v9t §2.1) adds `kebabCase`, `classicyMeasurementVars` and `classicyThemeMeasurementDefaults(packageId)` to `ClassicyThemeMetrics.ts`, gives `withDefaultThemeMetrics` a `defaults` parameter, spreads the walker into `getThemeVars` (core names stay byte-identical), heals knob families in `migrateClassicyState`, and writes 21 knob families with today's values into `platinum.json` plus the Platinum `options` zod schema via a `knobSchema` helper.

**Impact:** Every SCSS rewrite in H 3.1–6.1 reads `--control-strip-*`, `--menu-frame-*`, `--pager-*` and the other knob variables; without this story those reads resolve to nothing and every surface collapses. Part J's Options tab also lists these families from the `options` schema.

## Steps

### 1: Write the failing tests

ClassicyThemeMetrics.test.ts:
```ts
it('classicyMeasurementVars kebab-cases family and key', () => expect(classicyMeasurementVars({ controlStrip: { cellHeight: 22, moduleWidth: 30 }, popUpSlider: { trackLeft: 4 }, window: { borderSize: 1 } } as never)).toEqual({ '--control-strip-cell-height': '22px', '--control-strip-module-width': '30px', '--pop-up-slider-track-left': '4px', '--window-border-size': '1px' }))
it('classicyMeasurementVars skips non-number leaves', () => expect(classicyMeasurementVars({ x: { a: 'no', b: Number.NaN, c: 2 } } as never)).toEqual({ '--x-c': '2px' }))
it('classicyThemeMeasurementDefaults carries the Platinum knob families', () => { const d = classicyThemeMeasurementDefaults('platinum'); expect(d.controlStrip.cellHeight).toBe(22); expect(d.menuFrame.shadowOffset).toBe(2); expect(d.pager.arrowWidth).toBe(42); expect(d.balloonHelp.tailWidth).toBe(20); expect(d.popUpSlider.height).toBe(73); expect(d.scrollbar.arrowGlyphWidth).toBe(7); expect(d.window.borderSize).toBe(1) })
it('classicyThemeMeasurementDefaults falls back to Platinum for an unknown package', () => expect(classicyThemeMeasurementDefaults('nope').controlStrip.cellHeight).toBe(22))
it('withDefaultThemeMetrics(theme, defaults) fills knob families and keeps present values', () => { const t = withDefaultThemeMetrics({ ...getTheme('default'), measurements: { ...CLASSICY_DEFAULT_THEME_METRICS, controlStrip: { cellHeight: 30 } } }, classicyThemeMeasurementDefaults('platinum')); expect(t.measurements.controlStrip.cellHeight).toBe(30); expect(t.measurements.controlStrip.moduleWidth).toBe(30); expect(t.measurements.pager.arrowWidth).toBe(42) })
```
ClassicyAppearance.test.ts: keep `emits every metric input and derivation for the default theme` unchanged (it pins the core names) and add `emits every Platinum knob family` asserting `vars['--control-strip-cell-height'] === '22px'`, `['--menu-frame-shadow-offset'] === '2px'`, `['--pager-arrow-width'] === '42px'`, `['--balloon-help-tail-width'] === '20px'`, `['--pop-up-slider-height'] === '73px'`, `['--scrollbar-arrow-glyph-width'] === '7px'`, `['--hyper-card-handle-size'] === '6px'`, `['--dialog-alert-min-width'] === '280px'`; and `emits knobs for a theme persisted without them` (strip `controlStrip` from `getTheme('default')` → `getThemeVars` still gives `--control-strip-cell-height: '22px'`). ClassicyStateMigrations.metrics.test.ts: `heals knob families from the package defaults` (state whose `activeTheme.measurements` has only the core five → after `migrateClassicyState`, `activeTheme.measurements.pager.cellHeight === 36`; `getThemeVars(activeTheme)['--pager-cell-height'] === '36px'`).

### 2: Run them to verify they fail

`pnpm exec vitest run src/SystemFolder/ControlPanels/AppearanceManager src/SystemFolder/ControlPanels/AppManager/ClassicyStateMigrations.metrics.test.ts` — Expected: FAIL — `classicyMeasurementVars is not a function`, knob vars undefined.

### 3: Add the families to platinum.json and the options schema

Write these families into `defaults.measurements` and every preset's `measurements` (key order: core five, then the families in this order): `controlStrip { cellHeight 22, narrowCellWidth 13, moduleWidth 30, borderWidth 1, bevelWidth 1, pressedShift 1, collapseGlyphLeft 2, collapseGlyphTop 7, scrollGlyphLeft 2, scrollGlyphTop 6, moduleIconLeft 2, moduleIconTop 3, moduleArrowLeft 22, moduleArrowTop 7 }`, `menuFrame { borderWidth 1, bevelWidth 1, shadowWidth 1, shadowStart 1, shadowOffset 2 }`, `pager { borderWidth 1, arrowWidth 42, cellHeight 36, glyphHalfHeight 8, glyphDepth 11, punchHalfHeight 5, punchDepth 7, pageMinWidth 32, pageTopBorder 2 }`, `balloonHelp { cornerRadius 8, minWidth 80, maxWidth 220, titleGap 3, tailOffset 12, tailInset 8, tailWidth 20 }`, `popUpSlider { width 17, height 73, trackLeft 4, trackTop 3, thumbLeft 1 }`, `scrollbar { arrowGlyphWidth 7, arrowGlyphHeight 8 }`, `hyperCard { fontSize 11, handleSize 6, paletteMaxWidth 220, indent 12 }`, `finder { padding 8, aboutBannerWidth 260, aboutBannerHeight 120, aboutBannerShadowOffset 4, aboutBannerShadowBlur 6, aboutRowGap 12, aboutIconSize 56, aboutLabelWidth 80, aboutValueWidth 60 }`, `appleGuide { headerHeight 42, headerPaddingX 12, headerFontSize 13, bodyFontSize 14, bodyPaddingY 12, bodyPaddingX 20, paragraphGap 12, listIndent 18, listItemGap 2, footerHeight 48, footerPaddingX 10 }`, `colorPicker { wheelMax 240, wheelInset 20, labelOverhang 14, modeListWidth 90, itemPaddingY 3, crayonHoverLift 8, crayonSelectedLift 5, boxLipHeight 22, fieldWidth 44, unitWidth 14 }`, `dialog { alertMinWidth 280, alertMaxWidth 460, inputMinWidth 300, inputMaxWidth 460, keyboardEquivalentMinWidth 300, keyboardEquivalentMaxWidth 420, fileDialogMinHeight 220 }`, `controlPanel { listMaxHeight 180, colorsScrollMaxHeight 210 }`, `progressBar { stripePeriod 40 }`, `titleBar { ditherWidth 4, ditherHeight 3 }`, `crashScreen { artWidth 245 }`, `boot { halftoneTile 4 }`, `helpButton { glyphSize 14 }`, `quickTime { captionShadowBlur 3 }`, `menu { popUpMaxHeight 300 }`, `table { resizerWidth 15 }`. In `src/Appearance/Platinum/index.ts`: `const knobSchema = (family: Record<string, number>) => z.object(Object.fromEntries(Object.keys(family).map(k => [k, z.number().min(0).max(512).describe(titleCase(k))])))` and extend `options.shape.measurements` with one `knobSchema(platinumJson.defaults.measurements.<family>)` per family (the core five keep the schema Part B gave them). Verify Part B's schema keeps unknown families: add test `theme schema keeps package knob families` in ClassicyThemeSchema.test.ts asserting `ClassicyThemeSchema.safeParse(platinumJson.defaults).data.measurements.controlStrip.cellHeight === 22`; if it fails, Part B's `measurements` is not loose — change it to `z.looseObject` there before continuing.

### 4: Implement the walker, the defaults helper and the getThemeVars/migration changes

In `ClassicyAppearance.ts`: `ClassicyThemeMeasurements` becomes `{ window; control; button; groupBox; layout } & { [family: string]: Record<string, number> }`. In `ClassicyThemeMetrics.ts`: `export const kebabCase = (s: string): string` (`controlStrip` → `control-strip`, `popUpSlider` → `pop-up-slider`); `export const classicyMeasurementVars = (measurements: ClassicyThemeMeasurements): Record<string, string>` — for every family and every key whose value is a finite number emits `--${kebabCase(family)}-${kebabCase(key)}: intToPx(value)`, skipping non-number leaves; `export const classicyThemeMeasurementDefaults = (packageId: string | undefined): ClassicyThemeMeasurements` = `{ ...CLASSICY_DEFAULT_THEME_METRICS, ...(getClassicyAppearancePackage(packageId ?? 'platinum')?.defaults.measurements ?? platinumJson.defaults.measurements) }` (family-level spread; `platinumJson` is a static import of `@/Appearance/Platinum/platinum.json`); `withDefaultThemeMetrics(theme, defaults = CLASSICY_DEFAULT_THEME_METRICS)` (and `withDefaultThemeMetricsList`) gain the parameter and iterate `Object.keys(defaults)`. `getThemeVars`: `const m = withDefaultThemeMetrics(theme, classicyThemeMeasurementDefaults(theme.package)).measurements;` then `...classicyMeasurementVars(m)` replaces the hand-written 1:1 input lines (today 191-194 and 235-257); `--window-scrollbar-arrow-size`, `--button-height` and every derivation stay. `migrateThemeMetrics` in `ClassicyStateMigrations.ts` calls `withDefaultThemeMetrics(t, classicyThemeMeasurementDefaults(t.package))`. Import `getClassicyAppearancePackage` the same way `ClassicyAppearance.ts` already reaches the registry after Part B/F (`grep -n ClassicyAppearancePackage src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.ts`); add test `getAllThemes resolves knobs when ClassicyThemeMetrics is the first module loaded` (`vi.resetModules(); const { getAllThemes } = await import('…/ClassicyAppearance'); expect(getAllThemes()[0].measurements.controlStrip.cellHeight).toBe(22)`) to prove the import cycle is evaluation-safe.

### 5: Run tests to verify they pass

`pnpm exec vitest run src/SystemFolder/ControlPanels/AppearanceManager src/SystemFolder/ControlPanels/AppManager src/Appearance` — Expected: PASS, including the unchanged core-name test.

### 6: Lint, type-check, commit

`pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test` then `git add src/SystemFolder/ControlPanels/AppearanceManager src/SystemFolder/ControlPanels/AppManager src/Appearance/Platinum && git commit -m "feat(theme): emit measurements.<family> knobs through a generic walker and seed the Platinum families"` (with the `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` trailer).

## Acceptance Criteria

- [ ] VERIFY: pnpm exec vitest run src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetrics.test.ts src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.test.ts
- [ ] VERIFY: pnpm exec vitest run src/SystemFolder/ControlPanels/AppManager/ClassicyStateMigrations.metrics.test.ts -t 'heals knob families'
- [ ] VERIFY: pnpm exec vitest run src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.test.ts -t 'emits every metric input and derivation for the default theme'  # core input names byte-identical

## Files

- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetrics.ts` - modify: kebabCase, classicyMeasurementVars, classicyThemeMeasurementDefaults, defaults parameter
- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.ts` - modify: index signature on ClassicyThemeMeasurements; getThemeVars spreads the walker
- `src/SystemFolder/ControlPanels/AppManager/ClassicyStateMigrations.ts` - modify: metric healing uses package defaults
- `src/Appearance/Platinum/platinum.json` - modify: 21 knob families on defaults and presets
- `src/Appearance/Platinum/index.ts` - modify: knobSchema families in the options schema
- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetrics.test.ts` - modify: walker and defaults tests
- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.test.ts` - modify: knob emission tests
- `src/SystemFolder/ControlPanels/AppManager/ClassicyStateMigrations.metrics.test.ts` - modify: knob healing test
- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeSchema.test.ts` - modify: loose-measurements test

## Work Log
### 2026-10-29T20:22:00.352Z - Moved one open [MANUAL] acceptance criterion to the program V&V ticket 0083-v8n (human verification and validation), where it is tracked and ticked. This story now closes on its automated criteria; 0083-v8n links back with `depends`.
