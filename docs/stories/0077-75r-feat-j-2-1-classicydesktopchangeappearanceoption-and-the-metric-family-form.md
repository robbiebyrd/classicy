---
id: 0077-75r
title: 'J 2.1: ClassicyDesktopChangeAppearanceOption and the metric family form'
purpose: 'Give the panel two guarded write paths: `ClassicyDesktopChangeAppearanceOption { path, value }` for non-metric theme options and a `{ family, key }` form of `ClassicyDesktopChangeMetric` for package knob families, both rejecting bad input without forking a Custom theme.'
type: feat
status: in_progress
priority: "2"
effort: M
created: "2026-10-28T20:41:27.990Z"
updated: "2026-10-29T16:47:55.346Z"
started: "2026-10-29T16:47:55.346Z"
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
      - src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceOptions.ts
      - src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceOptions.test.ts
      - src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetricTargets.ts
      - src/SystemFolder/ControlPanels/AppManager/ClassicyActionPredicates.ts
      - src/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager.tsx
      - src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetricTargets.test.ts
      - src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.customTheme.test.tsx
      - src/index.ts
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
  stories:
    - ["0076-4sb", "depends"]
  plans:
    - ["0012-pt9", "included", ["2.1"]]
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

# J 2.1: ClassicyDesktopChangeAppearanceOption and the metric family form

## Problem Statement

Audit §9 Phase 8 item 2 wants an Options form over the package schema, but the reducer today only knows `ClassicyDesktopChangeColor`, `ClassicyDesktopChangeMetric` with the 20 core `metricKey`s (`ClassicyThemeMetricTargets.ts`), and the font/background actions. There is no way to write `sound.pack`, a package preference, or a knob like `measurements.controlStrip.cellHeight` (Part H).

This section (plan 0012-pt9 §2.1) adds `ClassicyAppearanceOptions.ts` (`parseClassicyAppearanceOptionPath`, `getClassicyAppearanceOption`, `applyClassicyAppearanceOption` with path regex, own-property walk and schema re-validation that restores the old value on failure), extends `ClassicyThemeMetricTarget` with a `{ family, key }` form that writes only an existing knob, adds `hasAppearanceOptionChange`, and the reducer case `ClassicyDesktopChangeAppearanceOption` beside `ChangeMetric`, logging rejections through `classicyLog`. Because `editActiveClassicyTheme` forks only when the theme changed, a rejected write never creates a Custom theme.

**Impact:** J 3.1 (Options tab), J 4.1 (Metrics tab) and J 5.1 (Sound tab's `sound.pack`) all dispatch through these two actions; without them the tabs have no reducer to write to, and an unguarded path write would be a prototype-pollution vector.

## Steps

### 1: Write the failing tests

ClassicyAppearanceOptions.test.ts:
```ts
it.each(['sound.pack','desktop.iconSize','typography.uiSize'])('accepts %s', p => expect(parseClassicyAppearanceOptionPath(p)).toEqual(p.split('.')))
it.each(['','sound','__proto__.x','a.constructor','a.prototype.b','id.x','name.x','package.x','measurements.window.borderSize','a.b.c.d.e','bad-key.x','1a.b'])('rejects %s', p => expect(parseClassicyAppearanceOptionPath(p)).toBeUndefined())
it('applies a valid write', () => { const t = structuredClone(getTheme('default')); expect(applyClassicyAppearanceOption(t, 'desktop.iconSize', 48)).toEqual({ ok: true }); expect(t.desktop.iconSize).toBe(48) })
it('rejects a write the schema refuses and restores the value', () => { const t = structuredClone(getTheme('default')); const before = t.desktop.iconSize; expect(applyClassicyAppearanceOption(t, 'desktop.iconSize', 'huge')).toEqual({ ok: false, reason: 'schema' }); expect(t.desktop.iconSize).toBe(before) })
it('rejects a missing leaf', () => expect(applyClassicyAppearanceOption(structuredClone(getTheme('default')), 'desktop.nope', 1)).toEqual({ ok: false, reason: 'missing' }))
it('getClassicyAppearanceOption reads own properties only', () => { expect(getClassicyAppearanceOption(getTheme('default'), ['sound','pack'])).toBe('platinum'); expect(getClassicyAppearanceOption(getTheme('default'), ['sound','toString'])).toBeUndefined() })
```
ClassicyThemeMetricTargets.test.ts: `accepts the family form` (`isThemeMetricTarget({ family: 'controlStrip', key: 'cellHeight' })` true; `{ family: 'window', key: 'borderSize' }` false; `{ family: '__proto__', key: 'x' }` false); `family form get/set round-trips an existing knob` (theme with `measurements.controlStrip.cellHeight: 22` → set 30 → get 30); `family form never creates a key` (set on `{ family: 'controlStrip', key: 'nope' }` leaves `measurements.controlStrip` without `nope`). ClassicyAppearanceManager.customTheme.test.tsx (reducer, same harness as the ChangeColor fork test): `ClassicyDesktopChangeAppearanceOption forks a built-in and applies the value` (`{ path: 'desktop.iconSize', value: 48 }` → `activeTheme.id === 'custom'`, `desktop.iconSize === 48`, built-in untouched); `rejects a bad path without forking` (`path: 'measurements.window.borderSize'` → `activeTheme.id` unchanged, `customThemes` unchanged, `classicyLog` warn spied once); `ClassicyDesktopChangeMetric family form forks and applies` (`{ family: 'controlStrip', key: 'cellHeight', value: 30 }` → custom, 30).

### 2: Run them to verify they fail

`pnpm exec vitest run src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceOptions.test.ts src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetricTargets.test.ts src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.customTheme.test.tsx` — Expected: FAIL — module not found; family form rejected; unknown action ignored.

### 3: Implement the module, the target extension, the predicate and the reducer case; regenerate barrels

`ClassicyAppearanceOptions.ts`: `export const CLASSICY_APPEARANCE_OPTION_SEGMENT = /^[A-Za-z][A-Za-z0-9]*$/`; `export const parseClassicyAppearanceOptionPath = (path: string): string[] | undefined` — split on `.`; 2–4 segments; every segment matches the regex; none of `__proto__`, `constructor`, `prototype`; first segment not one of `id`, `name`, `package`, `measurements` (metrics go through `ClassicyDesktopChangeMetric`); else `undefined`. `export const getClassicyAppearanceOption = (theme: ClassicyTheme, path: readonly string[]): unknown` (own-property walk, `undefined` when missing). `export type ClassicyAppearanceOptionResult = { ok: true } | { ok: false; reason: 'path' | 'missing' | 'schema' }`; `export const applyClassicyAppearanceOption = (theme: ClassicyTheme, path: string, value: unknown): ClassicyAppearanceOptionResult` — parse (→ `path`), walk own properties to the parent which must be a plain object owning the leaf (→ `missing`), set, `ClassicyThemeSchema.safeParse(theme)`; on failure restore the previous value (→ `schema`). `ClassicyThemeMetricTargets.ts`: `export type ClassicyThemeMetricFamilyTarget = { family: string; key: string }`; `ClassicyThemeMetricTarget` becomes `{ metricKey: ClassicyThemeMetricKey; family?: undefined } | (ClassicyThemeMetricFamilyTarget & { metricKey?: undefined })`; `isThemeMetricTarget` also accepts `{ family, key }` when both match `/^[a-z][A-Za-z0-9]*$/` and `family` is not a `CLASSICY_THEME_METRIC_GROUPS` id; `isValidThemeMetric` for the family form: finite number, 0 ≤ v ≤ 512; `getThemeMetric` family form: `Object.hasOwn(m, family) && Object.hasOwn(m[family], key) ? m[family][key] : Number.NaN`; `setThemeMetric` family form writes only when both `hasOwn` checks pass (else no-op → no fork) — keep every core key as a literal `case`; the family form is one extra `default` branch. `ClassicyActionPredicates.ts`: `export function hasAppearanceOptionChange(m: Msg): m is Msg & { path: string; value: unknown }` (`typeof m.path === 'string' && 'value' in m`), placed after `hasThemeMetricChange` (`:246`), which now returns true for the family form too. `ClassicyDesktopManager.tsx`: `case 'ClassicyDesktopChangeAppearanceOption'` after `ChangeMetric` (`:343-350`): `if (!hasAppearanceOptionChange(action)) break; editActiveClassicyTheme(ds.System.Manager.Appearance, theme => { const r = applyClassicyAppearanceOption(theme, action.path, action.value); if (!r.ok) classicyLog('warn', 'ClassicyDesktopManager', `ClassicyDesktopChangeAppearanceOption rejected: ${r.reason}`, { path: action.path }); });`. The action is `ClassicyDesktop*`, so the untrusted floor already blocks it. Then `pnpm exec barrelsby -c .ts-barrel.json`.

### 4: Run tests to verify they pass

`pnpm exec vitest run src/SystemFolder/ControlPanels/AppearanceManager src/SystemFolder/ControlPanels/AppManager src/SystemFolder/SystemResources/Desktop` — Expected: PASS.

### 5: Lint, type-check, commit

`pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test` then `git add src/SystemFolder/ControlPanels src/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager.tsx src/index.ts && git commit -m "feat(theme): ClassicyDesktopChangeAppearanceOption and the metric family form"` (with the `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` trailer).

## Acceptance Criteria

- [ ] VERIFY: pnpm exec vitest run src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceOptions.test.ts
- [ ] VERIFY: pnpm exec vitest run src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetricTargets.test.ts src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.customTheme.test.tsx
- [ ] VERIFY: pnpm exec vitest run src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.customTheme.test.tsx -t 'rejects a bad path without forking'
- [ ] [MANUAL] `parseClassicyAppearanceOptionPath` rejects `__proto__`, `constructor`, `prototype`, `id`, `name`, `package` and `measurements` roots; the family form of `setThemeMetric` never creates a key.

## Files

- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceOptions.ts` - create: path parser, reader and guarded writer
- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceOptions.test.ts` - create: path and schema guard tests
- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetricTargets.ts` - modify: { family, key } target form
- `src/SystemFolder/ControlPanels/AppManager/ClassicyActionPredicates.ts` - modify: hasAppearanceOptionChange; family form in hasThemeMetricChange
- `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager.tsx` - modify: ClassicyDesktopChangeAppearanceOption case
- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetricTargets.test.ts` - modify: family form tests
- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.customTheme.test.tsx` - modify: reducer fork/reject tests
- `src/index.ts` - modify: regenerated barrel

## Work Log

### 2026-10-29T16:47:54.121Z - Started beside Part B by controller decision (reconciliation verdict "Yes": B is done with the reducer, predicates and metric targets): its depends story 0076-4sb (J 1.1) is code-complete at 89c839c22 and only awaits the post-B screenshot check. Branch feat/appearance-part-j from 89c839c22; implementer dispatched.
