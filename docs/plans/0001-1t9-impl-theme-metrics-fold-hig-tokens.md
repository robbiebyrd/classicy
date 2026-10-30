---
id: 0001-1t9
title: 'Theme Metrics: fold --hig-* into theme measurements'
type: impl
status: complete
priority: "2"
effort: L
created: "2026-10-27T20:14:28.801Z"
updated: "2026-10-28T19:38:37.493Z"
completed: "2026-10-28T18:00:46.297Z"
links:
  repo:
    local: ~/classicy
  specs:
    - ./docs/superpowers/specs/2026-10-27-theme-metrics-design.md
  plans:
    - ["0000-aud", "included"]
progress:
  "0":
    status: complete
  "1":
    status: complete
  "1.1":
    status: complete
  "2":
    status: complete
  "2.1":
    status: complete
  "3":
    status: complete
  "3.1":
    status: complete
  "4":
    status: complete
  "4.1":
    status: complete
  "5":
    status: complete
  "5.1":
    status: complete
  "6":
    status: complete
  "6.1":
    status: complete
  "7":
    status: complete
  "7.1":
    status: complete
  "8":
    status: complete
---

# Theme Metrics: fold --hig-* into theme measurements

> **Status: complete (merged to `main` 2026-10-28, merge commit `4515f5096`).** This plan was amended during execution by the owner's decisions D12/D16 (`docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md` (plan 0000-aud) §7): **no deprecated `--hig-*` aliases are emitted**. Lines below that mention aliases record the original plan; the *Outcome* section at the end records what shipped.

## Summary

**Goal:** Every `--hig-*` layout constant becomes a theme-driven metric (input under `measurements.<family>` or a derivation of one), renamed without the `hig-` prefix, editable through a metric-targets table, with built-ins rendering pixel-identical.

**Problem:** The 32 `--hig-*` CSS variables were build-time constants emitted beside the theme tokens (`getThemeVars`), so no theme pack could change button height, group-box margins or title-bar height. They duplicated the theme's `measurements.window` values and the title-bar height was defined twice (18 px multiplier vs 19 px `--hig-titlebar-height`).

**Approach:** `ClassicyThemeMetrics.ts` holds Platinum defaults and a copy-on-write normalizer; `getThemeVars` emits inputs and derivations; zod `.default()`s and `migrateClassicyState` keep v1 files and persisted state loading; `ClassicyThemeMetricTargets.ts` + `ClassicyDesktopChangeMetric` mirror the color-targets pattern; SCSS re-pointed mechanically and verified by screenshot parity.

---

# Part 2 — Implementation

**Architecture:** Spec: `docs/superpowers/specs/2026-10-27-theme-metrics-design.md` (amended: "No deprecated aliases"). Executed inline with superpowers:executing-plans.

**Tech Stack:** TypeScript, zod 4.4 (`.default()` does not re-parse — group defaults must be full objects), Zustand reducer, SCSS, vitest/jsdom, Biome, Storybook + Playwright + ImageMagick `compare`.

## Constraints

- Built-in themes render pixel-identical (title bar stays 19 px document / 10 px utility).
- `CLASSICY_THEME_FILE_VERSION` stays 1; a v1 file lacking the new groups must parse.
- ~~Old `--hig-*` names (except the three deleted) are emitted as `var(--new-name)` aliases.~~ **Amended (D12/D16): no `--hig-*` name is emitted at all; no alias table.**
- Deleted: `--hig-button-gap-v`, `--hig-groupbox-gap-h`, `--hig-disclosure-text-gap` (and, after the amendment, every other `--hig-*` name).
- No invented names for variables their namesake control does not read (no `--checkbox-*`, no `--popup-height`).
- Library code uses `classicyLog`, never `console.*`.
- `src/index.ts` is barrel-generated: run `pnpm exec barrelsby -c .ts-barrel.json` after adding a module; never hand-edit.
- Before each commit: `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`.
- Review focus (each pinned to a test): (1) persisted `availableThemes` lacking metrics must not emit `NaNpx` after a theme switch → 4.1; (2) v1 theme file with only `measurements.window` parses and exports the full block → 3.1; (3) `ClassicyDesktopChangeMetric` with `windowControlSize: 0` is rejected → 5.1; (4) derivations read the input: `borderSize: 2` → `--control-frame-width: 4px` → 2.1; (5) utility window stays 10 px with boxes sized from it → 6.1 parity.

## Files

| File | Change | Responsibility |
|---|---|---|
| `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetrics.ts` | create | `CLASSICY_DEFAULT_THEME_METRICS`, `withDefaultThemeMetrics`, `withDefaultThemeMetricsList` (no alias table after D12). |
| `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetricTargets.ts` | create | Metric target table, guards, get/set — mirror of `ClassicyThemeColorTargets.ts`. |
| `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.ts` | modify | Measurement types; `getThemeVars` metric emission; `resolvedThemes` normalization. |
| `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeSchema.ts` | modify | Zod defaults for new metric groups/keys. |
| `src/SystemFolder/ControlPanels/AppearanceManager/styles/themes.json` | modify | Full `measurements` block on all 21 themes. |
| `src/SystemFolder/ControlPanels/AppManager/ClassicyStateMigrations.ts` | modify | Copy-on-write metric healing of activeTheme/availableThemes/customThemes. |
| `src/SystemFolder/ControlPanels/AppManager/ClassicyActionPredicates.ts` | modify | `hasThemeMetricChange`. |
| `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager.tsx` | modify | `ClassicyDesktopChangeMetric` reducer case; `LoadThemes` completes metrics (review fix). |
| `src/SystemFolder/SystemResources/Window/ClassicyWindow.scss` | modify | Title-bar height unification; rename reads. |
| `src/SystemFolder/**/*.scss` | modify | Rename every `var(--hig-*)` read (117 replacements, 23 stylesheets). |
| `docs/AGENT-REFERENCE.md`, `CLAUDE.md`, `docs/hig-audit.md` | modify | Metric tables, action, paragraph, historical names. |

## Phase 0: Baseline screenshots (before any change)

- [x] Start Storybook; collect every story id under the 19 parity titles (126 stories, not 19 — every story under each title).
- [x] Screenshot each at 1024×768 with the menu-bar clock, carets and animations frozen (first pass showed ~200 px run-to-run noise without that).
- [x] Self-compare two baseline runs: 122/126 exact; residual noise ≤ 17 px on two stories, animation on the indeterminate progress bar; one capture replaced after an environmental desktop-icon difference.

## Phase 1: Metric defaults, normalizer, types, themes.json

### 1.1: ClassicyThemeMetrics module

- [x] Types, `CLASSICY_DEFAULT_THEME_METRICS`, `withDefaultThemeMetrics` (same reference when complete), all 21 themes written out, `resolvedThemes` normalized. 7 tests. The zod schema change (3.1) was pulled in here because `tsc` broke the `satisfies` guard, as the plan anticipated. Commit `10db8fdd4`.

## Phase 2: getThemeVars emits metrics and derivations

### 2.1: Variable emission

- [x] 17 input variables 1:1 with `measurements.<family>.<key>` (`--window-title-bar-height`, `--window-utility-title-bar-height`, `--control-height`, `--control-label-gap`, `--control-static-text-height`, `--button-height`, `--button-min-width`, `--button-text-padding`, `--button-gap`, `--group-box-margin-side/-top/-bottom`, `--group-box-title-pad`, `--group-box-gap`, `--layout-item-gap`, `--layout-group-gap`, `--layout-dialog-edge`) and 11 derivations (`--control-frame-width` = border×2, `--control-bevel-sm/-md/-lg` = border×2/3/4, `--button-default-ring` = border×3, `--control-row-height` = controlSize×1.5, `--edit-field-height` = control.height + border×2, `--progress-height` = controlSize, `--help-button-width/-height` = control.height / +border, `--layout-focus-gap` = paddingSize). Commit `a99f35aa4`.
- [x] ~~29 `var()` aliases for the old names~~ implemented in `a99f35aa4`, then **removed outright in `48e759f1c`** per D12; the test now asserts that no `--hig-*` key is emitted for any built-in theme. (The plan's "33 aliases" was a miscount: the old block had 32 keys.)

## Phase 3: Schema defaults and theme-file compatibility

### 3.1: Zod defaults

- [x] Window keys and the four new groups default to their Platinum values (full objects, zod 4); `measurements` stays required; v1 files round-trip with the full block. Done inside 1.1 (commit `10db8fdd4`); 5 tests.

## Phase 4: Heal persisted themes in migrateClassicyState

### 4.1: Copy-on-write metric migration

- [x] `migrateClassicyState` completes `activeTheme`, every `availableThemes[i]` and `customThemes[i]`, returning the same state object when nothing changed. 4 tests. Commit `251fc60d2`.

## Phase 5: Metric targets table and ClassicyDesktopChangeMetric

### 5.1: Targets, predicate, reducer

- [x] 20 targets (`CLASSICY_THEME_METRIC_KEYS`), `isThemeMetricTarget` allowlist, `isValidThemeMetric` bounds (max 512; min 1 for the six collapsing sizes), literal-property `setThemeMetric`, `hasThemeMetricChange`, reducer case with fork-on-first-edit, barrel regenerated. 8 tests. Commit `b5492d211`.

## Phase 6: Re-point SCSS, unify title-bar height, parity

### 6.1: SCSS rename and parity

- [x] 117 replacements across 23 stylesheets plus two comment files; BevelButton → `--window-control-size`, Kbd → `--control-height`, Placard/ListBox → `--control-row-height`; title bar on `--window-title-bar-height` alone (document min-height override removed); `grep var(--hig-` → 0. Parity 125/126 exact, the one diff a 9×9 px Apple-menu-corner capture flake also seen between two pre-change captures. Commit `3a3b1dafb`.
- [x] 6b (D12 amendment): alias emission and table removed; RED→GREEN "emits no --hig-* name at all". Commit `48e759f1c`.

## Phase 7: Documentation

### 7.1: Docs

- [x] AGENT-REFERENCE §8: metric-input table (JSON path → variable → Platinum), derived-metrics table with formulas, `ClassicyDesktopChangeMetric` with its 20 keys; CLAUDE.md theming paragraph; hig-audit historical names. `docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md` (plan 0000-aud) left to the owner (its §9 Phase 0 tracks this slice). Commit `195fca364`.

## Phase 8: Final verification

- [x] Final tree: `pnpm test` 286 files / 3300 passed; `pnpm lint` clean; `tsc --noEmit` clean; `pnpm build:source` + `verify:dist` passed; `dist/classicy.css` has 0 `--hig-` occurrences.
- [x] Final parity at HEAD on a fresh Storybook: 124/126 exact, the other two inside the ledgered noise tolerance.
- [x] Example app probe (Playwright): metric variables resolve, the old names resolve to nothing, a stored theme without metric groups heals on load across Default → Azul → Default. The only console error is Chrome's automatic `/favicon.ico` request against an example that ships no icon.
- [x] Dev servers stopped.

## Acceptance Criteria

- [x] `getThemeVars(getTheme('default'))` emits all 17 metric inputs and 11 derivations and **no** `--hig-*` name (amended from "29 aliases").
- [x] `grep -rn 'var(--hig-' src --include=*.scss` returns nothing.
- [x] All 126 parity stories match the baseline (124 exact; two inside the recorded noise tolerance).
- [x] A v1 theme file without metric groups loads and exports the full block; persisted state with metric-less `availableThemes` switches themes without `NaNpx`.
- [x] `ClassicyDesktopChangeMetric` forks a built-in into Custom and rejects out-of-range values.
- [x] `pnpm lint`, `pnpm exec tsc --noEmit -p .`, `pnpm test`, `pnpm build:source` all pass.

## Outcome

- **Commits (merged into `main` via `4515f5096`):** `10db8fdd4` defaults/normalizer/schema · `a99f35aa4` emission · `251fc60d2` migration · `b5492d211` targets + action · `3a3b1dafb` SCSS rename + title bar · `48e759f1c` no aliases (D12) · `195fca364` docs · `74c142204` review fix (`ClassicyDesktopLoadThemes` completes metrics, copy-on-write via `withDefaultThemeMetricsList`). Follow-up on main: `9601617ee` lint cleanup of dead symbols left by an unrelated earlier commit.
- **Fresh review:** 0 Critical, 1 Important (fixed, above), 5 Minor deferred: `isValidThemeMetric` accepts non-integers while docs say whole pixels; `migrateThemeMetrics` may add explicit `undefined` list keys when only `activeTheme` needed healing; the "every built-in theme is complete" test is tautological (assert against raw `themes.json`); `windowBorderSize` `min` is 0; AGENT-REFERENCE's quick-reference action table lacks a `ChangeMetric` row.
- **Spec follow-ons (not this slice):** a Metrics tab in the Appearance control panel; reloading persisted built-in themes from the build on hydrate; the remaining ~100 `calc(var(--token) * N)` multipliers (seam S1 continues in `docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md` (plan 0000-aud) §9 Phase 1+).
