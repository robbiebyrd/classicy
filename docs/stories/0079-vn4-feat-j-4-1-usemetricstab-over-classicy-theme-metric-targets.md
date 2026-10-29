---
id: 0079-vn4
title: 'J 4.1: useMetricsTab over CLASSICY_THEME_METRIC_TARGETS'
purpose: 'Add the Metrics tab: one spinner per core theme metric, grouped as the targets table groups them, dispatching `ClassicyDesktopChangeMetric { metricKey, value }`.'
type: feat
status: in_progress
priority: "2"
effort: S
created: "2026-10-28T20:42:45.684Z"
updated: "2026-10-29T17:49:40.637Z"
started: "2026-10-29T17:23:17.520Z"
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
      - src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Metrics.tsx
      - src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Metrics.test.tsx
      - src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.tsx
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
  stories:
    - ["0078-nc6", "depends"]
  plans:
    - ["0012-pt9", "included", ["4.1"]]
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
---

# J 4.1: useMetricsTab over CLASSICY_THEME_METRIC_TARGETS

## Problem Statement

The metrics spec (plan 0001-1t9) created `CLASSICY_THEME_METRIC_TARGETS` (20 editable metrics with labels, groups, min/max) and `ClassicyDesktopChangeMetric` precisely so a Metrics tab could be added 'for free' (audit §9 Phase 8 item 2); the tab itself is the named follow-on and does not exist.

This section (plan 0012-pt9 §4.1) adds `useMetricsTab({ theme, editingCustomTheme, changeMetric })` rendering the Colors tab's layout (`.classicyAppearanceManagerColorsScroll`/`Group`) with one `ClassicyControlGroup` per `CLASSICY_THEME_METRIC_GROUPS` entry and one `ClassicySpinner` per target (`id` from `appearanceMetricSpinnerId`, min/max from the table, value from `getThemeMetric`), plus the same fork/editing notice as Colors, and composes it into the tab list.

**Impact:** Without it the 20 core metrics are editable only through theme files; J 6.1's story set and docs assume eight tabs including Metrics.

## Steps

### 1: Write the failing tests

Test code:
```ts
it('is titled Metrics', …)
it('renders one spinner per metric target inside its group', () => { render(<Host />); expect(document.querySelectorAll('input[id^="appearance_metric_"]')).toHaveLength(20); for (const info of CLASSICY_THEME_METRIC_TARGETS) expect(document.getElementById(appearanceMetricSpinnerId(info.target))).toHaveValue(getThemeMetric(theme, info.target)); expect(screen.getByText('Group Boxes')).toBeInTheDocument() })
it('passes min and max from the target table', () => { …; const s = document.getElementById('appearance_metric_windowControlSize'); expect(s).toHaveAttribute('min','1'); expect(s).toHaveAttribute('max','512') })
it('dispatches changeMetric with metricKey and the number', () => { …; fireEvent.change(document.getElementById('appearance_metric_buttonGap')!, { target: { value: '20' } }); expect(changeMetric).toHaveBeenCalledWith({ metricKey: 'buttonGap', value: 20 }) })
it('ignores a non-numeric entry', () => { …; fireEvent.change(…buttonGap, { target: { value: '' } }); expect(changeMetric).not.toHaveBeenCalled() })
it('shows the fork notice for a built-in and the editing notice for Custom', …)
```

### 2: Run them to verify they fail

`pnpm exec vitest run src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Metrics.test.tsx` — Expected: FAIL — module not found.

### 3: Implement useMetricsTab and add it to the tab list

`useMetricsTab({ theme: ClassicyTheme; editingCustomTheme: boolean; changeMetric: (change: ClassicyThemeMetricChange) => void }): TabIndividual` with `title: 'Metrics'`: the same custom-theme notice line as Colors (`Changing a metric creates a Custom theme from “${theme.name}”.` / `Editing the “${theme.name}” theme.`), then a `.classicyAppearanceManagerColorsScroll` holding one `ClassicyControlGroup label={group.label}` per `CLASSICY_THEME_METRIC_GROUPS` entry with a `ClassicySpinner` per target of that group: `id={appearanceMetricSpinnerId(target)}`, `labelTitle={info.label}`, `labelPosition="left"`, `minValue={info.min}`, `maxValue={info.max}`, `prefillValue={getThemeMetric(theme, info.target)}`, `onChangeFunc={e => { const value = Number(e.target.value); if (Number.isFinite(value)) changeMetric({ ...info.target, value }) }}`. `export const appearanceMetricSpinnerId = (target: { metricKey: ClassicyThemeMetricKey }) => `appearance_metric_${target.metricKey}``. Composition: `const metricsTab = useMetricsTab({ theme: appearanceState.activeTheme, editingCustomTheme: isCustomThemeActive(appearanceState), changeMetric })` where `changeMetric` wraps `startTransition(() => dispatch({ type: 'ClassicyDesktopChangeMetric', ...change }))` (the 3.1 `changeMetric` for family targets reuses this one). Reuse the Colors SCSS classes rather than adding new ones.

### 4: Run tests to verify they pass

`pnpm exec vitest run src/SystemFolder/ControlPanels/AppearanceManager` — Expected: PASS.

### 5: Lint, type-check, commit

`pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test` then `git add src/SystemFolder/ControlPanels/AppearanceManager && git commit -m "feat(appearance): Metrics tab over CLASSICY_THEME_METRIC_TARGETS"` (with the `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` trailer).

## Acceptance Criteria

- [x] VERIFY: pnpm exec vitest run src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Metrics.test.tsx
- [x] VERIFY: pnpm exec vitest run src/SystemFolder/ControlPanels/AppearanceManager
- [ ] [MANUAL] In the example app, changing Buttons → Gap to 20 on the Metrics tab widens dialog button spacing and switches the theme pop-up to Custom.

## Files

- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Metrics.tsx` - create: useMetricsTab and appearanceMetricSpinnerId
- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Metrics.test.tsx` - create: spinner count, min/max, dispatch, notices
- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.tsx` - modify: metricsTab composed into the tab list

## Work Log

### 2026-10-29T17:23:10.556Z - Started beside Part B by controller decision (J reconciliation lists 4.1 as safe early: no overlap with B; the Metrics tab dispatches the core ClassicyDesktopChangeMetric { metricKey } form). Out of chain order: its depends story 0078-nc6 (J 3.1, the Packages/Options tabs) waits; 4.1 needs only J 1.1/2.1, both done. Base 2b892472a on feat/appearance-part-j; implementer dispatched. The panel gains a tab (a deliberate visual change); the screenshot check is deferred until after Part B lands, like J 1.1.

### 2026-10-29T17:49:29.224Z - Code complete on feat/appearance-part-j, 2b892472a..954d06de2: a5a12617d (useMetricsTab: one ClassicySpinner per CLASSICY_THEME_METRIC_TARGETS entry in the five groups, Colors-tab layout and notices, dispatching the core ClassicyDesktopChangeMetric { metricKey, value } form per J-R7; parseFloat + clamp because the plan's Number("") is 0; Colors integration test scoped to the visible panel; two end-to-end panel tests), 954d06de2 (review minors: honest empty-entry comment + pinned behavior; whole-pixel rounding per new ruling J-R17; group-membership assertion; "color" spelling). Review: Approved (C0 I0 M5; four fixed, M2 — ClassicySchemaForm clamping — carried to J 3.1 via J-R17). Gate on 954d06de2: lint, tsc, 3968 tests, build:source + verify:dist; controller re-ran AppearanceManager (21 files / 394 tests) and the Metrics file (8/8). VERIFY criteria pass. Stays in_progress for the [MANUAL] example-app check and the Appearance Manager screenshot check, both after Part B lands (the panel gains a tab, a deliberate visual change; only the J 6.1 System/AppearanceManager stories change).
