---
id: 0012-pt9
title: 'Part J: Appearance control panel'
type: impl
status: in_progress
priority: "2"
effort: L
created: "2026-10-28T19:35:31.437Z"
updated: "2026-10-30T01:37:42.796Z"
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
    - ["0007-1sl", "depends"]
    - ["0008-j5l", "depends"]
    - ["0000-aud", "included"]
progress:
  "0":
    status: complete
  "1":
    status: pending
  "1.1":
    status: complete
  "2":
    status: pending
  "2.1":
    status: complete
  "3":
    status: pending
  "3.1":
    status: complete
  "4":
    status: pending
  "4.1":
    status: complete
  "5":
    status: pending
  "5.1":
    status: complete
  "6":
    status: pending
  "6.1":
    status: complete
  "7":
    status: pending
---

# Part J: Appearance control panel

## Summary

**Goal:** The Appearance Manager lets a user pick the active Appearance Package, edit every option the package's zod schema declares (knobs and preferences) and every core metric, and its Themes/Desktop/Fonts/Sound tabs read the package registries instead of literal arrays.

**Problem:** Audit §9 Phase 8 and §8.2: today the panel (`src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.tsx`, 514 lines) hard-codes 'The current Theme Package is Platinum' (`.Themes.tsx:55`), lists a literal font array (`.Fonts.tsx:9-16`, audit §4.4), the `ClassicyWallpapers` array (`.Desktop.tsx:6,69`, §4.5), resolves sounds through the mutable `ClassicySounds` record (`:22,116`, §4.3), and has no UI for package knobs (`measurements.<family>`, Part H) or for the 20 metrics in `CLASSICY_THEME_METRIC_TARGETS` (metrics spec's named follow-on). The ScreenSaver options form (`ClassicyScreenSaverConfigForm.tsx`) is the schema-driven pattern §8.2 names but it is saver-specific and flat.

**Approach:** Extract the ScreenSaver form into a generic, nested `ClassicySchemaForm`; add `ClassicyDesktopChangeAppearanceOption { path, value }` and a family form of `ClassicyDesktopChangeMetric`; add Packages, Options and Metrics tabs as `use*Tab` hooks beside the existing ones; re-point Themes, Desktop, Fonts and Sound at `useClassicyAppearancePackages`, `useClassicyAssetTree`, `useClassicySoundPacks`; one vitest file and one Storybook story per tab.

---

# Part 2 — Implementation

**Architecture:** Implements audit §9 Phase 8 under umbrella plan 0002-ldj. Consumes the package module (Part B: `useClassicyAppearancePackages`, `useActiveClassicyAppearancePackage`, `getClassicyAppearancePackage`, `ClassicyDesktopChangeAppearancePackage`, theme `package`, package `presets`/`options`/`defaults`), the asset registries (Part C: `useClassicyAssetTree('fonts' | 'wallpapers')`) and the sound packs (Part D: `useClassicySoundPacks`, theme `sound.pack`). Every tab stays a `use<Name>Tab(props): TabIndividual` hook composed in `ClassicyAppearanceManager.tsx`, the pattern the five existing tabs follow. For agentic workers: use superpowers:subagent-driven-development or superpowers:executing-plans task-by-task; steps use checkbox syntax.

**Tech Stack:** TypeScript 5.9, React 19, zod 4 (`instanceof z.ZodObject/ZodNumber/ZodBoolean/ZodEnum/ZodString`, `.unwrap()`, `.description`), Zustand reducer (Immer draft), SCSS, vitest 5/jsdom with `@/__tests__/test-utils` (`render`, `renderHook`, `screen`, `fireEvent`, `userEvent`), Storybook 9 with `parameters.classicy.desktop`.

## Constraints

- Visual change is allowed only inside the Appearance Manager window; every other surface — including the Screen Saver control panel whose form is refactored — compares AE 0 before vs after.
- Before each commit: `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`.
- Reducer payloads are untrusted: paths are allowlisted by regex and own-property walks (never `theme[a][b] = v` from raw strings), `__proto__`/`constructor`/`prototype` segments are rejected, and a rejected write leaves the theme unchanged so `editActiveClassicyTheme` does not fork a Custom theme.
- Native `<select>`s (`ClassicyPopUpMenu`) change with `fireEvent.change`; a leaf `ClassicyMenu` item needs a synthetic `webkitAnimationEnd` in jsdom before its action fires (CLAUDE.md memory) — no tab here opens a `ClassicyMenu`, so none of these tests needs it.
- `classicyLog` instead of `console.*`; `src/index.ts` is barrel-generated (`pnpm exec barrelsby -c .ts-barrel.json`) — never hand-edited; new modules under `SystemResources/SchemaForm/` are picked up by the generator.
- Commits end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`; American English spelling (color, behavior, center).
- Review focus: (1) `ClassicySchemaForm` must keep the ScreenSaver ids `ScreenSaver_<saverId>_<key>` and patch shape `{ [key]: value }` → 1.1 existing `ClassicyScreenSaverContext.test.tsx` 'ClassicyScreenSaverConfigForm' block stays green; (2) `ClassicyDesktopChangeAppearanceOption` with `path: '__proto__.x'` or `'measurements.window.borderSize'` must be rejected without forking → 2.1 tests; (3) the Metrics tab must dispatch `metricKey` for the 20 core metrics and the `{ family, key }` form for knobs, never a dotted path → 4.1; (4) selecting a package must not reset the user's custom themes → 3.1 test `keeps customThemes`; (5) a theme file for an unregistered package must show the stop alert and dispatch nothing → 5.1 test.

## Files

| File | Change | Responsibility |
|---|---|---|
| `src/SystemFolder/SystemResources/SchemaForm/ClassicySchemaForm.tsx` | create | Generic, nested zod-object form (`ClassicySchemaForm`). |
| `src/SystemFolder/SystemResources/SchemaForm/ClassicySchemaFormFields.ts` | create | `unwrapClassicySchemaField`, `classicySchemaFieldId`, `classicySchemaFieldLabel`. |
| `src/SystemFolder/SystemResources/SchemaForm/ClassicySchemaForm.test.tsx` | create | Leaf kinds, nesting, ids, onChange paths. |
| `src/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaverConfigForm.tsx` | modify | Thin wrapper over `ClassicySchemaForm` (same ids, same patch shape). |
| `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceOptions.ts` | create | `parseClassicyAppearanceOptionPath`, `applyClassicyAppearanceOption`, `getClassicyAppearanceOption`. |
| `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceOptions.test.ts` | create | Path and schema guards. |
| `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetricTargets.ts` | modify | `{ family, key }` target form for knob families. |
| `src/SystemFolder/ControlPanels/AppManager/ClassicyActionPredicates.ts` | modify | `hasAppearanceOptionChange`; `hasThemeMetricChange` accepts the family form. |
| `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager.tsx` | modify | `case 'ClassicyDesktopChangeAppearanceOption'`. |
| `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Packages.tsx` | create | `usePackagesTab`. |
| `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Options.tsx` | create | `useOptionsTab` (schema form over the active package's `options`). |
| `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Metrics.tsx` | create | `useMetricsTab` over `CLASSICY_THEME_METRIC_TARGETS`. |
| `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.{Themes,Desktop,Fonts,Sound}.tsx` | modify | Registry-backed lists; package label; `sound.pack`. |
| `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.tsx` | modify | Composes eight tabs; package/sound/theme-file handlers; removes `ClassicySounds` use. |
| `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.scss` | modify | Packages swatches, Options/Metrics scroll areas (reads `--control-panel-colors-scroll-max-height` from Part H). |
| `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.{Packages,Options,Metrics,Themes,Desktop,Fonts,Sound}.test.tsx` | modify | One test file per tab (Packages, Options and Metrics are new files; the other four are extended). |
| `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.stories.tsx` | create | `System/AppearanceManager` — one story per tab plus the full panel. |
| `docs/AGENT-REFERENCE.md` | modify | Actions `ClassicyDesktopChangeAppearanceOption`, metric family form; `ClassicySchemaForm`; panel tabs. |
| `CLAUDE.md` | modify | Schema form pointer; Appearance panel tabs. |

## Phase 0: Parity baseline

- [ ] Confirm Parts B, C, D are merged: `grep -c useClassicyAppearancePackages src/Appearance/ClassicyAppearancePackage.ts; grep -c useClassicyAssetTree src/Appearance/ClassicyAssetRegistry.ts; grep -c useClassicySoundPacks src/SystemFolder/ControlPanels/SoundManager/ClassicySoundPacks.ts` → each ≥ 1. Stop if not.
- [ ] Start Storybook (`pnpm storybook`, background). From `index.json` collect every story id for titles Extensions/ScreenSaver, Controls/Tabs, Controls/Spinner, Controls/PopUpMenu, Controls/Checkbox, Controls/Input, Controls/ControlGroup, Controls/RadioInput, Controls/Slider, Desktop/Window → `.playwright-mcp/parity/part-J/stories.txt`.
- [ ] Playwright: `iframe.html?id=<id>&viewMode=story` at 1024×768, networkidle + 500 ms → `.playwright-mcp/parity/part-J/before/<id>.png`.
- [ ] Example app (`pnpm preview`): open the Screen Saver control panel with the Flying Toasters options visible → `before/app-screensaver-panel.png`; open the Appearance Manager on each of its five tabs → `before/app-appearance-<tab>.png` (record only; the panel may change).
- [ ] No commit.

**Validation:** ``ls .playwright-mcp/parity/part-J/before/*.png | wc -l` equals stories.txt lines + 6`

## Phase 1: Shared schema form

### 1.1: ClassicySchemaForm extracted from the ScreenSaver config form

**Files:**
- Create: `src/SystemFolder/SystemResources/SchemaForm/ClassicySchemaForm.tsx`
- Create: `src/SystemFolder/SystemResources/SchemaForm/ClassicySchemaFormFields.ts`
- Create: `src/SystemFolder/SystemResources/SchemaForm/ClassicySchemaForm.test.tsx`
- Modify: `src/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaverConfigForm.tsx`
- Test: `src/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaverContext.test.tsx`
- Test: `src/SystemFolder/ControlPanels/ScreenSaverManager/ClassicyScreenSaverManager.test.tsx`

**Depends on:** 0

**Interfaces:**
- Consumes: `ClassicyScreenSaverConfigForm.tsx` (122 lines): `unwrapField` (:16-29), the four leaf branches (:58-115), ids `ScreenSaver_${saver.id}_${key}` (:57), rows via `ClassicyControlGroupFormRow`, `ClassicySpinner`, `ClassicyPopUpMenu`, `ClassicyInput`, `ClassicyCheckbox`. Decision: the ScreenSaver form is NOT generic (saver-bound props, flat shape, patch-object `onChange`), so it is extracted, not reused.
- Produces: `ClassicySchemaFormFields.ts`: `export type ClassicyUnwrappedField = { schema: z.ZodType; description?: string }`; `export const unwrapClassicySchemaField = (field: z.ZodType): ClassicyUnwrappedField` (moved `unwrapField`); `export const classicySchemaFieldId = (idPrefix: string, path: readonly string[]): string` → `[idPrefix, ...path].join('_')`; `export const classicySchemaFieldLabel = (key: string, description?: string): string` → description, else `key` split on camel-case humps, first letter upper-cased (`cellHeight` → `Cell height`). `ClassicySchemaForm.tsx`: `export type ClassicySchemaFormValues = Record<string, unknown>`; `export type ClassicySchemaFormProps = { schema: z.ZodObject<z.ZodRawShape>; values: ClassicySchemaFormValues; onChange: (path: readonly string[], value: unknown) => void; idPrefix: string; path?: readonly string[] }`; `export const ClassicySchemaForm: FunctionalComponent<ClassicySchemaFormProps>` — iterates `schema.shape`; a nested `z.ZodObject` (after unwrap) renders `<ClassicyControlGroup label={classicySchemaFieldLabel(key, description)}>` containing a recursive `ClassicySchemaForm` with `path=[...path, key]` and `values={values[key] ?? {}}`; leaves render exactly as today (boolean → checkbox row, number → spinner with `field.minValue ?? 0` / `field.maxValue ?? undefined`, enum → pop-up, string → input row), ids from `classicySchemaFieldId(idPrefix, [...path, key])`, `onChange([...path, key], value)`; unsupported kinds render nothing. `ClassicyScreenSaverConfigForm` becomes `({ saver, config, onChange }) => saver.configSchema instanceof z.ZodObject ? <ClassicySchemaForm schema={saver.configSchema} values={config} idPrefix={`ScreenSaver_${saver.id}`} onChange={(path, value) => onChange({ [path[0]]: value })} /> : null`.

- [ ] **Step 1: Write the failing tests in ClassicySchemaForm.test.tsx** — Test code:
```ts
const schema = z.object({ on: z.boolean().describe('Enabled'), speed: z.number().min(1).max(9), mode: z.enum(['a','b']), name: z.string(), nested: z.object({ depth: z.number() }).describe('Nested group') })
it('renders one control per leaf with prefixed ids', () => { render(<ClassicySchemaForm schema={schema} values={{ on: true, speed: 3, mode: 'b', name: 'x', nested: { depth: 2 } }} idPrefix="T" onChange={vi.fn()} />); for (const id of ['T_on','T_speed','T_mode','T_name','T_nested_depth']) expect(document.getElementById(id)).not.toBeNull() })
it('uses .describe() as the label and humanizes bare keys', () => { …; expect(screen.getByText('Enabled')).toBeInTheDocument(); expect(screen.getByText('Speed')).toBeInTheDocument(); expect(screen.getByText('Nested group')).toBeInTheDocument() })
it('reports changes with the full path', async () => { const onChange = vi.fn(); …; fireEvent.change(document.getElementById('T_nested_depth')!, { target: { value: '7' } }); expect(onChange).toHaveBeenCalledWith(['nested','depth'], 7); fireEvent.change(document.getElementById('T_mode')!, { target: { value: 'a' } }); expect(onChange).toHaveBeenCalledWith(['mode'], 'a') })
it('spinner takes min/max from the schema', () => { …; expect(document.getElementById('T_speed')).toHaveAttribute('min', '1'); …('max', '9') })
it('classicySchemaFieldLabel', () => { expect(classicySchemaFieldLabel('cellHeight')).toBe('Cell height'); expect(classicySchemaFieldLabel('x', 'Given')).toBe('Given') })
```
- [ ] **Step 2: Run them to verify they fail** — Expected: FAIL — module not found. — `pnpm exec vitest run src/SystemFolder/SystemResources/SchemaForm`
- [ ] **Step 3: Implement ClassicySchemaFormFields.ts and ClassicySchemaForm.tsx per the Interfaces block** — Move `unwrapField` verbatim; keep the row components the ScreenSaver form uses so the Screen Saver control panel renders the same DOM.
- [ ] **Step 4: Rewrite ClassicyScreenSaverConfigForm.tsx as the wrapper; regenerate barrels** — Keep its doc comment (it describes the rows) pointing at `ClassicySchemaForm`. — `pnpm exec barrelsby -c .ts-barrel.json`
- [ ] **Step 5: Run tests to verify they pass** — Expected: PASS, including the existing 'ClassicyScreenSaverConfigForm' describe block (`ClassicyScreenSaverContext.test.tsx:195`) unchanged. — `pnpm exec vitest run src/SystemFolder/SystemResources/SchemaForm src/SystemFolder/Extensions/ScreenSaver src/SystemFolder/ControlPanels/ScreenSaverManager`
- [ ] **Step 6: Parity for the Screen Saver panel** — Re-shoot `extensions-screensaver--*` and `app-screensaver-panel` into `after/`; `compare -metric AE` → `0` each.
- [ ] **Step 7: Lint, type-check, commit** — git add src/SystemFolder/SystemResources/SchemaForm src/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaverConfigForm.tsx src/index.ts && git commit -m "refactor(form): extract a generic nested ClassicySchemaForm from the screen saver options form" (with the trailer) — `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`

**Validation:** `pnpm exec vitest run src/SystemFolder/SystemResources/SchemaForm src/SystemFolder/Extensions/ScreenSaver`

## Phase 2: Option and knob writes

### 2.1: ClassicyDesktopChangeAppearanceOption and the metric family form

**Files:**
- Create: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceOptions.ts`
- Create: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceOptions.test.ts`
- Modify: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetricTargets.ts`
- Modify: `src/SystemFolder/ControlPanels/AppManager/ClassicyActionPredicates.ts`
- Modify: `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager.tsx`
- Test: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetricTargets.test.ts`
- Test: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.customTheme.test.tsx`

**Depends on:** 0

**Interfaces:**
- Consumes: `editActiveClassicyTheme(appearance, edit)` (`ClassicyCustomTheme.ts:71`, forks only when the theme changed); `ClassicyThemeSchema` (after Part B validates `package` and loose `measurements`); `classicyThemeMeasurementDefaults(packageId)` (Part H, `ClassicyThemeMetrics.ts`; if Part H is not merged, use `CLASSICY_DEFAULT_THEME_METRICS` and note it); reducer cases `ClassicyDesktopChangeColor`/`ChangeMetric` at `ClassicyDesktopManager.tsx:332-350`; predicates `hasThemeMetricChange` at `ClassicyActionPredicates.ts:246`.
- Produces: `ClassicyAppearanceOptions.ts`: `export const CLASSICY_APPEARANCE_OPTION_SEGMENT = /^[A-Za-z][A-Za-z0-9]*$/`; `export const parseClassicyAppearanceOptionPath = (path: string): string[] | undefined` — split on `.`; 2–4 segments; every segment matches the regex; none of `__proto__`, `constructor`, `prototype`; first segment not one of `id`, `name`, `package`, `measurements` (metrics go through `ClassicyDesktopChangeMetric`); else `undefined`. `export const getClassicyAppearanceOption = (theme: ClassicyTheme, path: readonly string[]): unknown` (own-property walk, `undefined` when missing). `export type ClassicyAppearanceOptionResult = { ok: true } | { ok: false; reason: 'path' | 'missing' | 'schema' }`; `export const applyClassicyAppearanceOption = (theme: ClassicyTheme, path: string, value: unknown): ClassicyAppearanceOptionResult` — parse (→ `path`), walk own properties to the parent which must be a plain object owning the leaf (→ `missing`), set, `ClassicyThemeSchema.safeParse(theme)`; on failure restore the previous value (→ `schema`). `ClassicyThemeMetricTargets.ts`: `export type ClassicyThemeMetricFamilyTarget = { family: string; key: string }`; `ClassicyThemeMetricTarget` becomes `{ metricKey: ClassicyThemeMetricKey; family?: undefined } | (ClassicyThemeMetricFamilyTarget & { metricKey?: undefined })`; `isThemeMetricTarget` also accepts `{ family, key }` when both match `/^[a-z][A-Za-z0-9]*$/` and `family` is not a `CLASSICY_THEME_METRIC_GROUPS` id; `isValidThemeMetric` for the family form: finite number, 0 ≤ v ≤ 512; `getThemeMetric` family form: `Object.hasOwn(m, family) && Object.hasOwn(m[family], key) ? m[family][key] : Number.NaN`; `setThemeMetric` family form writes only when both `hasOwn` checks pass (else no-op → no fork). `ClassicyActionPredicates.ts`: `export function hasAppearanceOptionChange(m: Msg): m is Msg & { path: string; value: unknown }` (`typeof m.path === 'string' && 'value' in m`), placed after `hasThemeMetricChange`, which now returns true for the family form too. `ClassicyDesktopManager.tsx`: `case 'ClassicyDesktopChangeAppearanceOption'` after `ChangeMetric`: `if (!hasAppearanceOptionChange(action)) break; editActiveClassicyTheme(ds.System.Manager.Appearance, theme => { const r = applyClassicyAppearanceOption(theme, action.path, action.value); if (!r.ok) classicyLog('warn', 'ClassicyDesktopManager', `ClassicyDesktopChangeAppearanceOption rejected: ${r.reason}`, { path: action.path }); });`. The action is `ClassicyDesktop*`, so the untrusted floor already blocks it.

- [ ] **Step 1: Write the failing tests** — ClassicyAppearanceOptions.test.ts:
```ts
it.each(['sound.pack','desktop.iconSize','typography.uiSize'])('accepts %s', p => expect(parseClassicyAppearanceOptionPath(p)).toEqual(p.split('.')))
it.each(['','sound','__proto__.x','a.constructor','a.prototype.b','id.x','name.x','package.x','measurements.window.borderSize','a.b.c.d.e','bad-key.x','1a.b'])('rejects %s', p => expect(parseClassicyAppearanceOptionPath(p)).toBeUndefined())
it('applies a valid write', () => { const t = structuredClone(getTheme('default')); expect(applyClassicyAppearanceOption(t, 'desktop.iconSize', 48)).toEqual({ ok: true }); expect(t.desktop.iconSize).toBe(48) })
it('rejects a write the schema refuses and restores the value', () => { const t = structuredClone(getTheme('default')); const before = t.desktop.iconSize; expect(applyClassicyAppearanceOption(t, 'desktop.iconSize', 'huge')).toEqual({ ok: false, reason: 'schema' }); expect(t.desktop.iconSize).toBe(before) })
it('rejects a missing leaf', () => expect(applyClassicyAppearanceOption(structuredClone(getTheme('default')), 'desktop.nope', 1)).toEqual({ ok: false, reason: 'missing' }))
it('getClassicyAppearanceOption reads own properties only', () => { expect(getClassicyAppearanceOption(getTheme('default'), ['sound','pack'])).toBe('platinum'); expect(getClassicyAppearanceOption(getTheme('default'), ['sound','toString'])).toBeUndefined() })
```
ClassicyThemeMetricTargets.test.ts: `accepts the family form` (`isThemeMetricTarget({ family: 'controlStrip', key: 'cellHeight' })` true; `{ family: 'window', key: 'borderSize' }` false; `{ family: '__proto__', key: 'x' }` false); `family form get/set round-trips an existing knob` (theme with `measurements.controlStrip.cellHeight: 22` → set 30 → get 30); `family form never creates a key` (set on `{ family: 'controlStrip', key: 'nope' }` leaves `measurements.controlStrip` without `nope`). ClassicyAppearanceManager.customTheme.test.tsx (reducer, same harness as the ChangeColor fork test): `ClassicyDesktopChangeAppearanceOption forks a built-in and applies the value` (`{ path: 'desktop.iconSize', value: 48 }` → `activeTheme.id === 'custom'`, `desktop.iconSize === 48`, built-in untouched); `rejects a bad path without forking` (`path: 'measurements.window.borderSize'` → `activeTheme.id` unchanged, `customThemes` unchanged, `classicyLog` warn spied once); `ClassicyDesktopChangeMetric family form forks and applies` (`{ family: 'controlStrip', key: 'cellHeight', value: 30 }` → custom, 30).
- [ ] **Step 2: Run them to verify they fail** — Expected: FAIL — module not found; family form rejected; unknown action ignored. — `pnpm exec vitest run src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceOptions.test.ts src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetricTargets.test.ts src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.customTheme.test.tsx`
- [ ] **Step 3: Implement the module, the target extension, the predicate and the reducer case; regenerate barrels** — Per the Interfaces block. In `setThemeMetric`, keep every core key as a literal `case`; the family form is one extra `default` branch guarded by the two `Object.hasOwn` checks. — `pnpm exec barrelsby -c .ts-barrel.json`
- [ ] **Step 4: Run tests to verify they pass** — Expected: PASS. — `pnpm exec vitest run src/SystemFolder/ControlPanels/AppearanceManager src/SystemFolder/ControlPanels/AppManager src/SystemFolder/SystemResources/Desktop`
- [ ] **Step 5: Lint, type-check, commit** — git add src/SystemFolder/ControlPanels src/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager.tsx src/index.ts && git commit -m "feat(theme): ClassicyDesktopChangeAppearanceOption and the metric family form" (with the trailer) — `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`

**Validation:** `pnpm exec vitest run src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceOptions.test.ts`

## Phase 3: Packages and Options tabs

### 3.1: usePackagesTab and useOptionsTab

**Files:**
- Create: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Packages.tsx`
- Create: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Packages.test.tsx`
- Create: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Options.tsx`
- Create: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Options.test.tsx`
- Modify: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.tsx`
- Modify: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.scss`
- Test: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Packages.test.tsx`
- Test: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Options.test.tsx`

**Depends on:** 1.1, 2.1

**Interfaces:**
- Consumes: `useClassicyAppearancePackages()`, `useActiveClassicyAppearancePackage()`, `registerClassicyAppearancePackage` (tests register a second package `{ id: 'test-pack', name: 'Test Pack', css: '', defaults: { ...getTheme('default'), package: 'test-pack' }, presets: [], layout: { window: { growBoxCorner: 'bottom-right' }, menuBar: { placement: 'screen' }, desktop: { iconGridOrigin: 'top-right' } }, options: z.looseObject({ measurements: z.object({ controlStrip: z.object({ cellHeight: z.number().min(1).max(512).describe('Cell height') }) }), preferences: z.object({ shade: z.boolean().describe('Window shade') }) }) }`); `ClassicyDesktopChangeAppearancePackage { packageId }`; `ClassicyRadioInput` (`name`, `inputs: [{ id, label, checked }]`, `onClickFunc(id)`); `intToHex`; `ClassicySchemaForm` (1.1); `getClassicyAppearanceOption` (2.1).
- Produces: `usePackagesTab({ packages: ClassicyAppearancePackage[]; activePackageId: string; changePackage: (packageId: string) => void }): TabIndividual` with `title: 'Packages'`: a `ClassicyRadioInput name="appearance_package" align="rows"` whose inputs are `{ id: `appearance_package_${pkg.id}`, label: `${pkg.name} (${pkg.presets?.length ?? 0} presets)`, checked: pkg.id === activePackageId }` and whose `onClickFunc` maps the id back to `pkg.id`; below it `<ul className="classicyAppearanceManagerPackageSwatches">` with one `<li data-package-id={pkg.id}>` holding seven `<span className="classicyAppearanceManagerPackageSwatch" style={{ background: intToHex(c) }}>` for `pkg.defaults.color.theme`. `export const appearancePackageInputId = (packageId: string) => `appearance_package_${packageId}``. `useOptionsTab({ pkg: ClassicyAppearancePackage; theme: ClassicyTheme; changeMetric: (target: ClassicyThemeMetricFamilyTarget, value: number) => void; changeOption: (path: string, value: unknown) => void }): TabIndividual` with `title: 'Options'`: when `pkg.options` is undefined renders `<ClassicyControlLabel label={`The ${pkg.name} package has no options.`} />`; else `<div className="classicyAppearanceManagerOptionsScroll"><ClassicySchemaForm schema={pkg.options} values={theme as unknown as ClassicySchemaFormValues} idPrefix="appearance_option" onChange={(path, value) => path[0] === 'measurements' && path.length === 3 && typeof value === 'number' ? changeMetric({ family: path[1], key: path[2] }, value) : changeOption(path.join('.'), value)} /></div>`. SCSS: `.classicyAppearanceManagerOptionsScroll { max-height: var(--control-panel-colors-scroll-max-height); overflow-y: auto; }` (same height as the Colors tab's scroll); swatches: `display: flex; gap: var(--layout-item-gap)`, each swatch `width: var(--icon-small-size); height: var(--icon-small-size); border: var(--window-border-size) solid var(--color-black)`. `ClassicyAppearanceManager.tsx`: `const packages = useClassicyAppearancePackages(); const activePackage = useActiveClassicyAppearancePackage();` `changePackage` dispatches `ClassicyDesktopChangeAppearancePackage` inside `startTransition`; `changeMetric` dispatches `{ type: 'ClassicyDesktopChangeMetric', ...target, value }`; `changeOption` dispatches `{ type: 'ClassicyDesktopChangeAppearanceOption', path, value }`; tabs order `[themesTab, packagesTab, optionsTab, desktopTab, colorsTab, fontsTab, metricsTab, soundTab]` (metrics arrives in 4.1).

- [ ] **Step 1: Write the failing tests** — Packages.test.tsx (Host renders `usePackagesTab(...).children`; `beforeAll` registers `test-pack`):
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
- [ ] **Step 2: Run them to verify they fail** — Expected: FAIL — modules not found. — `pnpm exec vitest run src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Packages.test.tsx src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Options.test.tsx`
- [ ] **Step 3: Implement usePackagesTab, useOptionsTab, the SCSS and the composition in ClassicyAppearanceManager.tsx** — Per the Interfaces block. `ClassicyTabs size="small"` already scrolls horizontally when eight tabs exceed 480 px; this is the one permitted visual change.
- [ ] **Step 4: Run tests to verify they pass** — Expected: PASS (existing tab tests untouched). — `pnpm exec vitest run src/SystemFolder/ControlPanels/AppearanceManager`
- [ ] **Step 5: Lint, type-check, commit** — git add src/SystemFolder/ControlPanels/AppearanceManager && git commit -m "feat(appearance): Packages and Options tabs driven by the registered packages" (with the trailer) — `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`

**Validation:** `pnpm exec vitest run src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Packages.test.tsx src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Options.test.tsx`

## Phase 4: Metrics tab

### 4.1: useMetricsTab over CLASSICY_THEME_METRIC_TARGETS

**Files:**
- Create: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Metrics.tsx`
- Create: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Metrics.test.tsx`
- Modify: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.tsx`
- Test: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Metrics.test.tsx`

**Depends on:** 2.1

**Interfaces:**
- Consumes: `CLASSICY_THEME_METRIC_GROUPS`, `CLASSICY_THEME_METRIC_TARGETS` (`target`, `label`, `group`, `min`, `max`), `getThemeMetric` (`ClassicyThemeMetricTargets.ts`); `ClassicySpinner` (`id`, `labelTitle`, `labelPosition`, `minValue`, `maxValue`, `prefillValue`, `onChangeFunc`), `ClassicyControlGroup`; the Colors tab layout (`.classicyAppearanceManagerColorsScroll`/`Group`, `ClassicyAppearanceManager.Colors.tsx:53-83`) as the visual template.
- Produces: `useMetricsTab({ theme: ClassicyTheme; editingCustomTheme: boolean; changeMetric: (change: ClassicyThemeMetricChange) => void }): TabIndividual` with `title: 'Metrics'`: the same custom-theme notice line as Colors (`Changing a metric creates a Custom theme from “${theme.name}”.` / `Editing the “${theme.name}” theme.`), then a `.classicyAppearanceManagerColorsScroll` holding one `ClassicyControlGroup label={group.label}` per `CLASSICY_THEME_METRIC_GROUPS` entry with a `ClassicySpinner` per target of that group: `id={appearanceMetricSpinnerId(target)}`, `labelTitle={info.label}`, `labelPosition="left"`, `minValue={info.min}`, `maxValue={info.max}`, `prefillValue={getThemeMetric(theme, info.target)}`, `onChangeFunc={e => { const value = Number(e.target.value); if (Number.isFinite(value)) changeMetric({ ...info.target, value }) }}`. `export const appearanceMetricSpinnerId = (target: { metricKey: ClassicyThemeMetricKey }) => `appearance_metric_${target.metricKey}``. Composition: `const metricsTab = useMetricsTab({ theme: appearanceState.activeTheme, editingCustomTheme: isCustomThemeActive(appearanceState), changeMetric })` where `changeMetric` wraps `startTransition(() => dispatch({ type: 'ClassicyDesktopChangeMetric', ...change }))` (the 3.1 `changeMetric` for family targets reuses this one).

- [ ] **Step 1: Write the failing tests** — Test code:
```ts
it('is titled Metrics', …)
it('renders one spinner per metric target inside its group', () => { render(<Host />); expect(document.querySelectorAll('input[id^="appearance_metric_"]')).toHaveLength(20); for (const info of CLASSICY_THEME_METRIC_TARGETS) expect(document.getElementById(appearanceMetricSpinnerId(info.target))).toHaveValue(getThemeMetric(theme, info.target)); expect(screen.getByText('Group Boxes')).toBeInTheDocument() })
it('passes min and max from the target table', () => { …; const s = document.getElementById('appearance_metric_windowControlSize'); expect(s).toHaveAttribute('min','1'); expect(s).toHaveAttribute('max','512') })
it('dispatches changeMetric with metricKey and the number', () => { …; fireEvent.change(document.getElementById('appearance_metric_buttonGap')!, { target: { value: '20' } }); expect(changeMetric).toHaveBeenCalledWith({ metricKey: 'buttonGap', value: 20 }) })
it('ignores a non-numeric entry', () => { …; fireEvent.change(…buttonGap, { target: { value: '' } }); expect(changeMetric).not.toHaveBeenCalled() })
it('shows the fork notice for a built-in and the editing notice for Custom', …)
```
- [ ] **Step 2: Run them to verify they fail** — Expected: FAIL — module not found. — `pnpm exec vitest run src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Metrics.test.tsx`
- [ ] **Step 3: Implement useMetricsTab and add it to the tab list** — Per the Interfaces block; reuse the Colors SCSS classes rather than adding new ones.
- [ ] **Step 4: Run tests to verify they pass** — Expected: PASS. — `pnpm exec vitest run src/SystemFolder/ControlPanels/AppearanceManager`
- [ ] **Step 5: Lint, type-check, commit** — git add src/SystemFolder/ControlPanels/AppearanceManager && git commit -m "feat(appearance): Metrics tab over CLASSICY_THEME_METRIC_TARGETS" (with the trailer) — `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`

**Validation:** `pnpm exec vitest run src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Metrics.test.tsx`

## Phase 5: Themes, Desktop, Fonts and Sound re-pointed at the package and registries

### 5.1: Presets from the active package; registry-backed fonts, wallpapers and sound packs

**Files:**
- Modify: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Themes.tsx`
- Modify: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Desktop.tsx`
- Modify: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Fonts.tsx`
- Modify: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Sound.tsx`
- Modify: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.tsx`
- Test: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Themes.test.tsx`
- Test: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Desktop.test.tsx`
- Test: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Fonts.test.tsx`
- Test: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Sound.test.tsx`
- Test: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.themeFile.test.tsx`

**Depends on:** 3.1

**Interfaces:**
- Consumes: Part B: `pkg.presets` (D24), theme `package`, `downloadClassicyTheme`/`parseClassicyThemeFile` (theme files carry `package`), `getClassicyAppearancePackage`; Part C: `useClassicyAssetTree('fonts')` (keys are font families) and `useClassicyAssetTree('wallpapers')` (keys are names, values `src`), `registerClassicyFonts`/`registerClassicyWallpapers` for tests; Part D: `useClassicySoundPacks()` (`{ id, name }`), `activeTheme.sound.pack`, `ClassicySoundManagerProvider` reloading on `sound.pack` change (so the panel's `loadSoundTheme`/`applySoundTheme`/`ClassicySounds` code at `ClassicyAppearanceManager.tsx:22,114-150,192,206` is deleted). Part C's Phase 3 item 5 may already have re-pointed Fonts/Desktop: the tests below pass unchanged in that case and the step is a no-op.
- Produces: Themes: `ThemesTabProps` gains `packageName: string`; the label becomes `The current Appearance Package is ${packageName}`; `themesList` in the manager is `[...(activePackage.presets ?? []), ...(appearanceState.customThemes ?? []).filter(t => t.package === activePackage.id)].map(t => ({ value: t.id, label: t.name }))`. Load: `loadThemeFile` checks `getClassicyAppearancePackage(result.theme.package)` before dispatching; when undefined sets `themeFileError = { label: `“${file.name}” could not be loaded.`, message: `It was saved for the “${result.theme.package}” Appearance Package, which is not installed.` }` and dispatches nothing. Save: unchanged call (`downloadClassicyTheme` now writes `package`). Desktop: `DesktopTabProps` gains `wallpapers: { value: string; label: string }[]`; the manager builds it from `Object.entries(useClassicyAssetTree('wallpapers'))` as `{ value: src, label: name }` (string values only); the `ClassicyWallpapers` import is removed. Fonts: `FontsTabProps` gains `fonts: { value: string; label: string }[]` built from `Object.keys(useClassicyAssetTree('fonts'))` as `{ value: family, label: family }`; the literal `ClassicyFonts` array is deleted. Sound: `SoundTabProps` gains `soundPacks: { id: string; name: string }[]`, `soundPack: string`, `changeSoundPack: (e: ChangeEvent<HTMLSelectElement>) => void`; a first row `Sound Pack` pop-up (`id="soundPack"`, options `{ value: id, label: name }`, `selected={soundPack}`) above Alert Sound; the manager's `changeSoundPack` dispatches `{ type: 'ClassicyDesktopChangeAppearanceOption', path: 'sound.pack', value }` in a `startTransition`.

- [ ] **Step 1: Write the failing tests** — Themes.test.tsx: `names the active package` (`packageName: 'Platinum'` → text `The current Appearance Package is Platinum`). themeFile.test.tsx: `refuses a theme file for an unregistered package with a stop alert and no dispatch` (file `{ format: 'classicy-theme', version: 1, theme: { ...getTheme('default'), package: 'irix' } }` → alert text contains `“irix” Appearance Package, which is not installed`; `ClassicyDesktopImportTheme` never dispatched); `lists presets of the active package and custom themes of that package only` (store with `customThemes: [{...custom, package: 'platinum'}, {...other, package: 'test-pack'}]` → the theme pop-up has 21 + 1 options). Desktop.test.tsx: `lists registered wallpapers` (`registerClassicyWallpapers('platinum', [{ name: 'Test Paper', src: 'https://example.com/t.png' }])` before render → option `Test Paper` with value `https://example.com/t.png`). Fonts.test.tsx: `lists registered font families` (`registerClassicyFonts('platinum', [{ family: 'TestFace', src: 'data:font/woff2;base64,AA==' }])` → each of the five menus has option `TestFace`); keep `shows the primary family of each of the default theme's stacks`. Sound.test.tsx: `lists sound packs and selects the theme's pack` (`soundPacks: [{ id: 'platinum', name: 'Platinum' }, { id: 'beep', name: 'Beep' }]`, `soundPack: 'beep'` → combobox `#soundPack` has value `beep`); `changeSoundPack fires on change` (fireEvent.change → called once with the event whose target value is `platinum`). Manager-level (themeFile.test.tsx harness): `selecting a sound pack dispatches ClassicyDesktopChangeAppearanceOption sound.pack` (spy on dispatch → `{ type: 'ClassicyDesktopChangeAppearanceOption', path: 'sound.pack', value: 'beep' }`).
- [ ] **Step 2: Run them to verify they fail** — Expected: the new tests FAIL (missing props/labels); the Fonts/Desktop registry tests may already PASS if Part C re-pointed them — note which. — `pnpm exec vitest run src/SystemFolder/ControlPanels/AppearanceManager`
- [ ] **Step 3: Implement the four tab changes and the manager handlers; delete the ClassicySounds path** — Per the Interfaces block. `grep -n 'ClassicySounds\|loadSoundTheme\|applySoundTheme' src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.tsx` → 0 afterwards.
- [ ] **Step 4: Run tests to verify they pass** — Expected: PASS. — `pnpm exec vitest run src/SystemFolder/ControlPanels/AppearanceManager src/SystemFolder/ControlPanels/SoundManager`
- [ ] **Step 5: Lint, type-check, commit** — git add src/SystemFolder/ControlPanels/AppearanceManager && git commit -m "feat(appearance): presets from the active package; fonts, wallpapers and sound packs from the registries" (with the trailer) — `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`

**Validation:** `pnpm exec vitest run src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.themeFile.test.tsx src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Sound.test.tsx`

## Phase 6: Stories, parity and documentation

### 6.1: One Storybook story per tab, parity outside the panel, docs

**Files:**
- Create: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.stories.tsx`
- Modify: `docs/AGENT-REFERENCE.md`
- Modify: `CLAUDE.md`
- Modify: `docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md` (plan 0000-aud)

**Depends on:** 4.1, 5.1

**Interfaces:**
- Consumes: Storybook decorator `withClassicy` (`storybook/.storybook/ClassicyDecorators.tsx:52-75`): `parameters.classicy.desktop: true` mounts a `ClassicyDesktop` frame; existing `System/*` titles (`ClassicyStartupScreen`, `ClassicyCrashScreen`, `useClassicyCursor`, `ClassicyPixelArt`).
- Produces: `ClassicyAppearanceManager.stories.tsx`: `title: 'System/AppearanceManager'`, `parameters: { classicy: { desktop: true } }`; story `Panel` renders `<ClassicyAppearanceManager />` (the app registers its window on mount); one story per tab — `Themes`, `Packages`, `Options`, `Desktop`, `Colors`, `Fonts`, `Metrics`, `Sound` — each a component that calls the matching `use<Name>Tab` with store-backed props (reading `useAppManager` and dispatching for real) and renders `<ClassicyWindow id="story_<tab>" appId="AppearanceManager.app" title="Appearance: <Tab>" initialSize={[480, 0]}>{tab.children}</ClassicyWindow>` inside `<ClassicyApp id="AppearanceManager.app" …>`; `Packages` registers a second package (`test-pack`, as in 3.1) at module scope so the list shows two rows. Docs: AGENT-REFERENCE gains `ClassicyDesktopChangeAppearanceOption { path, value }` (path rules), the `ClassicyDesktopChangeMetric` family form, a `ClassicySchemaForm` entry, and an 'Appearance Manager tabs' list; CLAUDE.md Balloon-Help-style paragraph: 'Schema-driven forms: `ClassicySchemaForm` (`SystemResources/SchemaForm/`) renders a nested zod object; the Screen Saver options and the Appearance Manager's Options tab both use it. The Appearance Manager has eight tabs (Themes, Packages, Options, Desktop, Colors, Fonts, Metrics, Sound); measurements write through `ClassicyDesktopChangeMetric` (`metricKey` or `{ family, key }`), everything else through `ClassicyDesktopChangeAppearanceOption { path, value }`.'; plan 0000-aud (the audit) §9 Phase 8 gets a 'Done <date>' line.

- [ ] **Step 1: Write the stories** — Per the Interfaces block. `pnpm storybook` → every `system-appearancemanager--*` story renders without console errors (check the browser console via Playwright `page.on('console')`).
- [ ] **Step 2: Shoot the new stories for the record** — `.playwright-mcp/parity/part-J/after/system-appearancemanager--<tab>.png` for each; no comparison (new surfaces).
- [ ] **Step 3: Parity outside the panel** — Expected: `0` on every line (Screen Saver panel, Tabs, Spinner, PopUpMenu, Checkbox, Input, ControlGroup, RadioInput, Slider, Window). Any non-zero: fix the code, never the screenshot. — `for f in .playwright-mcp/parity/part-J/before/*.png; do case "$f" in *app-appearance-*) continue;; esac; printf '%s ' "$(compare -metric AE "$f" ".playwright-mcp/parity/part-J/after/$(basename "$f")" null: 2>&1)"; echo "$f"; done`
- [ ] **Step 4: Write the docs** — Per the Interfaces block; American English check on the added lines (`grep -n 'colour\|behaviour\|centre'` → none).
- [ ] **Step 5: verify skill: drive the panel end-to-end** — Example app: Packages tab shows Platinum checked; Options tab shows the Platinum knob groups (Part H families) and changing Control Strip → Cell height to 30 visibly grows the strip; Metrics tab changing Buttons → Gap to 20 widens dialog button spacing and the theme pop-up switches to Custom; Sound tab lists Platinum; Load Theme… with a file whose `package` is `irix` shows the stop alert. No console errors.
- [ ] **Step 6: Lint, type-check, commit** — git add src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.stories.tsx docs CLAUDE.md && git commit -m "docs(appearance): stories per tab, actions and schema form reference" (with the trailer) — `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`

**Validation:** `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test && pnpm build:storybook`

## Phase 7: Final verification

- [ ] `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test` → all PASS; `pnpm build:source` → PASS.
- [ ] `grep -rn 'ClassicySounds\|ClassicyWallpapers\b\|const ClassicyFonts' src/SystemFolder/ControlPanels/AppearanceManager` → 0 hits.
- [ ] Every `before/` screenshot except `app-appearance-*` compares AE 0 with `after/`.
- [ ] Stop background dev servers started by this plan.

**Validation:** `pnpm exec vitest run src/SystemFolder/ControlPanels/AppearanceManager src/SystemFolder/SystemResources/SchemaForm`

## Acceptance Criteria

- [ ] Packages tab lists every registered package with name, preset count and seven swatches, and selecting one dispatches `ClassicyDesktopChangeAppearancePackage { packageId }` without touching `customThemes`.
- [ ] Options tab is generated from the active package's `options` schema via the shared `ClassicySchemaForm`; `measurements.<family>.<key>` edits dispatch `ClassicyDesktopChangeMetric { family, key, value }`, everything else `ClassicyDesktopChangeAppearanceOption { path, value }`; a bad path is rejected by the reducer without forking.
- [ ] Metrics tab shows the 20 `CLASSICY_THEME_METRIC_TARGETS` grouped, with min/max from the table, dispatching `metricKey` changes.
- [ ] Themes tab lists the active package's presets plus its custom themes, names the package, saves files that carry `package`, and refuses a file for an unregistered package with a stop alert and no dispatch.
- [ ] Desktop, Fonts and Sound tabs list `useClassicyAssetTree('wallpapers')`, `useClassicyAssetTree('fonts')` and `useClassicySoundPacks()`; the Sound tab writes `sound.pack`.
- [ ] The Screen Saver control panel renders pixel-identically through the extracted `ClassicySchemaForm`; one Storybook story per tab exists under `System/AppearanceManager`.
- [ ] `pnpm lint`, `pnpm exec tsc --noEmit -p .`, `pnpm test`, `pnpm build:source` all pass.

## Self-Review

| Requirement | Delivered by |
|---|---|
| §9 Phase 8 item 1: Packages tab | 3.1 usePackagesTab |
| §9 Phase 8 item 2: Options form from the package JSON schema; Metrics tab 'for free' | 1.1 ClassicySchemaForm, 2.1 actions, 3.1 useOptionsTab, 4.1 useMetricsTab |
| §9 Phase 8 item 3: presets from the package; Save/Load carry the package id | 5.1 Themes |
| Brief item 4: Fonts/Desktop/Sound registries; `sound.pack` | 5.1 Desktop, Fonts, Sound |
| Brief item 5: import for an unregistered package shows an alert | 5.1 loadThemeFile pre-check + themeFile test |
| Brief item 6: tests per tab and a story per tab | 3.1, 4.1, 5.1 tests; 6.1 stories |
| Visual change confined to the panel | Phase 0, 1.1 Step 6, 6.1 Step 3 |

**Placeholder scan:** No TBDs. Every prop, id, label string, action payload and test assertion is spelled out; the two 'may already be done by Part C' steps are decided by running the named tests.
**Residual risk:** The umbrella contract pins `registerClassicyFonts`/`registerClassicyWallpapers` but no read API for their lists; J reads `useClassicyAssetTree('fonts' | 'wallpapers')` and assumes keys are family names / wallpaper names with `src` values — if Part C chose another tree shape, adjust the two one-line mappers in 5.1. The contract names an alert for an unregistered-package import but not its mechanism; J pre-checks in the panel so the user sees the existing stop alert regardless. Part H's knob families are what make the Options tab non-trivial; without H the tab shows only what Part B put in `options`.

## Next Steps

1. Report to the umbrella plan: pin a read API for fonts and wallpapers (`listClassicyFonts(packageId?)` / `listClassicyWallpapers(packageId?)` or the tree shape), the import-alert mechanism (`ClassicyDesktopShowErrorDialog`?), and ownership of the Fonts/Desktop tab re-point (named in both Phase 3 item 5 / Part C and Phase 8 / Part J).
2. Part I may add a 'Hooks' read-only view to the Packages tab once package event hooks exist.
3. Deferred (out of scope): reloading built-in presets on hydrate.
