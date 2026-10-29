---
id: 0078-nc6
title: 'J 3.1: usePackagesTab and useOptionsTab'
purpose: Add the Packages tab (choose the active Appearance Package among those registered) and the Options tab (a schema form over the active package's `options`), composed into the Appearance Manager beside the existing tabs.
type: feat
status: in_progress
priority: "2"
effort: M
created: "2026-10-28T20:42:14.190Z"
updated: "2026-10-29T20:22:00.352Z"
started: "2026-10-29T19:30:00.026Z"
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
      - src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Packages.tsx
      - src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Packages.test.tsx
      - src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Options.tsx
      - src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Options.test.tsx
      - src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.tsx
      - src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.scss
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
  stories:
    - ["0083-v8n", "blocks"]
    - ["0077-75r", "depends"]
  plans:
    - ["0012-pt9", "included", ["3.1"]]
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

# J 3.1: usePackagesTab and useOptionsTab

## Problem Statement

Audit §9 Phase 8 items 1 and 2: the panel needs a Packages tab to choose the active package among those registered (umbrella 0002-ldj: `useClassicyAppearancePackages`, `ClassicyDesktopChangeAppearancePackage { packageId }`) and an Options form generated from the active package's `options` zod schema. Today the panel hard-codes 'The current Theme Package is Platinum' and has no package or knob UI.

This section (plan 0012-pt9 §3.1) adds `usePackagesTab` (a `ClassicyRadioInput` row per package labeled `Name (N presets)` plus seven swatches from `pkg.defaults.color.theme`) and `useOptionsTab` (`ClassicySchemaForm` over `pkg.options`, routing `measurements.<family>.<key>` edits to `changeMetric({ family, key }, value)` and everything else to `changeOption(path.join('.'), value)`), with the SCSS for swatches and the Options scroll area, and composes eight tabs in `ClassicyAppearanceManager.tsx` (the Metrics tab arrives in J 4.1). The wider tab strip is the one permitted visual change.

**Impact:** Without this story there is no way to switch packages or edit Part H's knob families from the UI; J 4.1 and J 5.1 extend the same composition and would have no `changeMetric`/`changeOption` handlers to share.

## Steps

### 1: Write the failing tests

Packages.test.tsx (Host renders `usePackagesTab(...).children`; `beforeAll` registers `test-pack` via `registerClassicyAppearancePackage({ id: 'test-pack', name: 'Test Pack', css: '', defaults: { ...getTheme('default'), package: 'test-pack' }, presets: [], layout: { window: { growBoxCorner: 'bottom-right' }, menuBar: { placement: 'screen' }, desktop: { iconGridOrigin: 'top-right' } }, options: z.looseObject({ measurements: z.object({ controlStrip: z.object({ cellHeight: z.number().min(1).max(512).describe('Cell height') }) }), preferences: z.object({ shade: z.boolean().describe('Window shade') }) }) })`):
```ts
it('is titled Packages', …)
it('lists every registered package with its preset count', () => { render(<Host packages={listClassicyAppearancePackages()} activePackageId="platinum" />); expect(screen.getByLabelText('Platinum (21 presets)')).toBeChecked(); expect(screen.getByLabelText('Test Pack (0 presets)')).not.toBeChecked() })
it('dispatches changePackage with the package id', () => { const changePackage = vi.fn(); …; fireEvent.click(screen.getByLabelText('Test Pack (0 presets)')); expect(changePackage).toHaveBeenCalledWith('test-pack') })
it('draws seven swatches per package from defaults.color.theme', () => { …; expect(document.querySelectorAll('li[data-package-id="platinum"] .classicyAppearanceManagerPackageSwatch')).toHaveLength(7) })
it('keeps customThemes when the package changes (reducer)', () => { /* reducer harness: state with customThemes [custom]; dispatch ClassicyDesktopChangeAppearancePackage test-pack → packageId 'test-pack', customThemes unchanged */ })
```
Options.test.tsx:
```ts
it('renders the schema form from pkg.options with appearance_option ids', () => { render(<Host pkg={testPack} theme={{ ...getTheme('default'), measurements: { ...getTheme('default').measurements, controlStrip: { cellHeight: 22 } } }} />); expect(document.getElementById('appearance_option_measurements_controlStrip_cellHeight')).toHaveValue(22) })
it('routes measurements.* through changeMetric as a family target', () => { …; fireEvent.change(document.getElementById('appearance_option_measurements_controlStrip_cellHeight')!, { target: { value: '30' } }); expect(changeMetric).toHaveBeenCalledWith({ family: 'controlStrip', key: 'cellHeight' }, 30); expect(changeOption).not.toHaveBeenCalled() })
it('routes everything else through changeOption with a dotted path', () => { …; fireEvent.click(document.getElementById('appearance_option_preferences_shade')!); expect(changeOption).toHaveBeenCalledWith('preferences.shade', true) })
it('says so when the package has no options', () => { render(<Host pkg={{ ...testPack, options: undefined }} />); expect(screen.getByText('The Test Pack package has no options.')).toBeInTheDocument() })
```

### 2: Run them to verify they fail

`pnpm exec vitest run src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Packages.test.tsx src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Options.test.tsx` — Expected: FAIL — modules not found.

### 3: Implement usePackagesTab, useOptionsTab, the SCSS and the composition in ClassicyAppearanceManager.tsx

`usePackagesTab({ packages: ClassicyAppearancePackage[]; activePackageId: string; changePackage: (packageId: string) => void }): TabIndividual` with `title: 'Packages'`: a `ClassicyRadioInput name="appearance_package" align="rows"` whose inputs are `{ id: `appearance_package_${pkg.id}`, label: `${pkg.name} (${pkg.presets?.length ?? 0} presets)`, checked: pkg.id === activePackageId }` and whose `onClickFunc` maps the id back to `pkg.id`; below it `<ul className="classicyAppearanceManagerPackageSwatches">` with one `<li data-package-id={pkg.id}>` holding seven `<span className="classicyAppearanceManagerPackageSwatch" style={{ background: intToHex(c) }}>` for `pkg.defaults.color.theme`. `export const appearancePackageInputId = (packageId: string) => `appearance_package_${packageId}``. `useOptionsTab({ pkg: ClassicyAppearancePackage; theme: ClassicyTheme; changeMetric: (target: ClassicyThemeMetricFamilyTarget, value: number) => void; changeOption: (path: string, value: unknown) => void }): TabIndividual` with `title: 'Options'`: when `pkg.options` is undefined renders `<ClassicyControlLabel label={`The ${pkg.name} package has no options.`} />`; else `<div className="classicyAppearanceManagerOptionsScroll"><ClassicySchemaForm schema={pkg.options} values={theme as unknown as ClassicySchemaFormValues} idPrefix="appearance_option" onChange={(path, value) => path[0] === 'measurements' && path.length === 3 && typeof value === 'number' ? changeMetric({ family: path[1], key: path[2] }, value) : changeOption(path.join('.'), value)} /></div>`. SCSS: `.classicyAppearanceManagerOptionsScroll { max-height: var(--control-panel-colors-scroll-max-height); overflow-y: auto; }`; swatches `display: flex; gap: var(--layout-item-gap)`, each swatch `width: var(--icon-small-size); height: var(--icon-small-size); border: var(--window-border-size) solid var(--color-black)`. `ClassicyAppearanceManager.tsx`: `const packages = useClassicyAppearancePackages(); const activePackage = useActiveClassicyAppearancePackage();` `changePackage` dispatches `ClassicyDesktopChangeAppearancePackage` inside `startTransition`; `changeMetric` dispatches `{ type: 'ClassicyDesktopChangeMetric', ...target, value }`; `changeOption` dispatches `{ type: 'ClassicyDesktopChangeAppearanceOption', path, value }`; tabs order `[themesTab, packagesTab, optionsTab, desktopTab, colorsTab, fontsTab, metricsTab, soundTab]` (metrics arrives in 4.1). `ClassicyTabs size="small"` already scrolls horizontally when eight tabs exceed 480 px; this is the one permitted visual change.

### 4: Run tests to verify they pass

`pnpm exec vitest run src/SystemFolder/ControlPanels/AppearanceManager` — Expected: PASS (existing tab tests untouched).

### 5: Lint, type-check, commit

`pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test` then `git add src/SystemFolder/ControlPanels/AppearanceManager && git commit -m "feat(appearance): Packages and Options tabs driven by the registered packages"` (with the `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` trailer).

## Acceptance Criteria

- [ ] VERIFY: pnpm exec vitest run src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Packages.test.tsx src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Options.test.tsx
- [ ] VERIFY: pnpm exec vitest run src/SystemFolder/ControlPanels/AppearanceManager

## Files

- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Packages.tsx` - create: usePackagesTab
- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Packages.test.tsx` - create: list, dispatch, swatches, reducer keeps customThemes
- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Options.tsx` - create: useOptionsTab over pkg.options
- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Options.test.tsx` - create: ids, routing to changeMetric/changeOption, no-options notice
- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.tsx` - modify: package hooks, changePackage/changeMetric/changeOption, eight-tab composition
- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.scss` - modify: swatches and Options scroll area

## Work Log

### 2026-10-29T19:30:00.913Z - Started beside Part B (reconciliation: code may go now; it rebases over B 4.3's line-1 deletion in ClassicyAppearanceManager.scss, which this task must not touch). Base 19f9cde64; implementer dispatched. Binding: Ruling 1 (Options tab renders the active package's knobs `{ family: { key } }` via classicyKnobsToSchema; edits dispatch ClassicyDesktopChangeMetric { family, key, value }; empty knobs show the no-options state), Ruling 9 (real scroll token, 340 px ceiling), Ruling 12, J-R17 (ClassicySchemaForm numeric clamp added here). Parity and the [MANUAL] example-app check wait for B.

### 2026-10-29T20:13:27.205Z - Implementer DONE at 318ff9176: Packages tab (memoized radio list plus swatches; startTransition on change) and Options tab (active package's knobs by family, dispatching ChangeMetric { family, key, value }; no-options state for empty knobs; Colors scroll region per Ruling 9). J-R17 clamp added to ClassicySchemaForm, with the shared bounds helper getThemeMetricFamilyBounds. Tab order: Themes, Packages, Options, Desktop, Colors, Fonts, Metrics, Sound. SCSS line 1 left for B 4.3. Controller re-ran lint, tsc and 642/644 tests; the 2 failures are vocabulary-scan timeouts at load 93 that pass 10/10 alone with a long timeout (fixed on the integration branch). Pushed; reviewer dispatched.

### 2026-10-29T20:18:42.573Z - Review APPROVED (Critical 0, Important 0, Minor 6). Confirmed: Ruling 1 shape and dispatch, switching packages re-renders the Options tab, the J-R17 clamp (it also fixes a Warp `layers` mismatch between the screen and the saved setting), getThemeMetricFamilyBounds is the single shared bounds source, and the generated vocabulary is current. Ruling J-R18 recorded (bounds intersect 0–512; a knob with an empty intersection is left out with a warning). Final round sent: comment wording, J-R18, a Packages scroll region, the Options fork notice, and two tests.

### 2026-10-29T20:22:00.352Z - Moved one open [MANUAL] acceptance criterion to the program V&V ticket 0083-v8n (human verification and validation), where it is tracked and ticked. This story now closes on its automated criteria; 0083-v8n links back with `depends`.
