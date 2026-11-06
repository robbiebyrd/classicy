---
id: 0036-ouc
title: 'B 3.1: ClassicyTheme.package, schema default, file export/import refusal, generic getThemeVars walker'
purpose: Tie every theme to its Appearance Package by id, refuse themes for uninstalled packages, and let getThemeVars emit any package measurement family as CSS variables.
type: feat
status: complete
priority: "2"
effort: M
created: "2026-10-28T20:11:27.034Z"
updated: "2026-10-29T14:44:11.370Z"
started: "2026-10-29T13:41:46.665Z"
completed: "2026-10-29T14:44:11.370Z"
links:
  repo:
    local: ~/classicy
    files:
      - src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.ts
      - src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeSchema.ts
      - src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeFile.ts
      - src/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager.tsx
      - src/SystemFolder/ControlPanels/AppearanceManager/styles/themes.json
      - src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeSchema.test.ts
      - src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeFile.test.ts
      - src/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager.importTheme.test.ts
      - src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.test.ts
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
  stories:
    - ["0035-3bj", "depends"]
  plans:
    - ["0005-1b3", "included", ["3.1"]]
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
  "6":
    status: complete
---

# B 3.1: ClassicyTheme.package, schema default, file export/import refusal, generic getThemeVars walker

## Problem Statement

Audit §9 Phase 2 item 4 and umbrella 0002-ldj: theme JSON gains `package: string` (zod default "platinum"), theme files carry it, and `ClassicyDesktopImportTheme` refuses a theme whose package is not registered — with an alert (here the `Desktop.errorDialog` state) and a classicyLog warning; `readClassicyTheme` applies the same refusal for file loads.

The 0002-ldj 'colors and numbers' contract also pins a generic measurements walker: any `measurements.<family>.<key>` number becomes `--<kebab family>-<kebab key>: <n>px`, so a package adds knobs (controlStrip, menuFrame, …) without touching Classicy. The schema's `measurements` object gets a `.catchall` of numeric records and the TS type an index signature; the 21 existing input emissions are replaced by the walker byte-identically while the derived variables stay explicit.

**Impact:** Without `package`, the Platinum presets (4.1) and the fallback package cannot declare ownership, ChangeAppearancePackage (2.1) cannot tell a foreign theme from its own, and part H's package knobs would have no CSS variable to read.

## Steps

### 1: Write the failing schema, file and import tests

ClassicyThemeSchema.test.ts: `defaults package to platinum when absent` (delete package → data.package === "platinum"); `keeps a package id`; `accepts a package measurement family` (measurements.controlStrip { cellHeight: 22 } → data.measurements.controlStrip.cellHeight === 22); `rejects a non-numeric package measurement` (controlStrip { cellHeight: "22" } → failure). ClassicyThemeFile.test.ts: `writes the package id` (exportClassicyTheme(theme("default")) parsed JSON theme.package === "platinum"); `a v1 file without package loads as platinum`; `refuses a theme for an uninstalled package` (package "irix", nothing registered → error equals `This theme needs the "irix" appearance package, which is not installed.`). importTheme.test.ts: `refuses an uninstalled package with the error dialog` (payload package "irix" → customThemes unchanged, Desktop.errorDialog.message equals the message, title "Appearance"); `accepts a registered package` (register "irix" stub → imported, activeTheme.package "irix").

### 2: Run them to verify they fail

`pnpm exec vitest run src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeSchema.test.ts src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeFile.test.ts src/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager.importTheme.test.ts` — Expected: FAIL — package key stripped / missing refusal.

### 3: Implement the schema field, catchall, type, themes.json field, readClassicyTheme refusal and the ImportTheme error dialog

ClassicyThemeSchema (ClassicyThemeSchema.ts:94): `package: z.string().max(64).default("platinum")` after `name`; `measurements: z.object({...}).catchall(z.record(z.string(), measurement))`. ClassicyAppearance.ts: `ClassicyThemeMeasurements` gains `[family: string]: Record<string, number>` (the five named groups stay); `ClassicyTheme.package: string`. themes.json: every entry gains `"package": "platinum"` after `"name"` via a one-off node script (tab indentation preserved; the file is deleted in 4.1). ClassicyThemeFile.ts readClassicyTheme: after schema parse, `if (!getClassicyAppearancePackage(theme.package)) return { ok: false, error: `This theme needs the "${theme.package}" appearance package, which is not installed.` }`; exportClassicyTheme writes `package` (schema output). ClassicyDesktopManager.tsx ImportTheme (lines 308-331): when `readClassicyTheme` fails, set `ds.System.Manager.Desktop.errorDialog = { title: "Appearance", message: read.error }` and `classicyLog("warn", "ClassicyAppearance", read.error)`. The `AssertTrue` guard in ClassicyThemeSchema.ts:152-156 must still compile.

### 4: Run them to verify they pass

`pnpm exec vitest run src/SystemFolder/ControlPanels/AppearanceManager src/SystemFolder/SystemResources/Desktop` — Expected: PASS.

### 5: Write the failing walker tests, then implement the walker

ClassicyAppearance.test.ts: `emits a package measurement family as kebab-case px variables` (getTheme("default") with measurements.controlStrip { cellHeight: 22, moduleWidth: 30 } → vars["--control-strip-cell-height"] === "22px", vars["--control-strip-module-width"] === "30px"); `the walker reproduces every input variable byte-identically` (snapshot of the 21 input entries from the existing test at :123 — same keys, same values: `--window-control-size` "12px", `--group-box-margin-side` "10px", `--layout-dialog-edge` "12px", …); `ignores non-numeric leaves`. Then replace the 21 explicit input emissions (ClassicyAppearance.ts:189-192 and 240-259) with `for (const [family, keys] of Object.entries(m)) for (const [key, n] of Object.entries(keys)) if (typeof n === "number") vars[`--${kebab(family)}-${kebab(key)}`] = intToPx(n)` where `kebab` lower-cases each capital with a leading hyphen (`groupBox` → `group-box`, `titleBarHeight` → `title-bar-height`); derived variables stay explicit after the walker. Run → PASS, including the untouched derivation assertions.

### 6: Lint, type-check, commit

`pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`, then `git commit -m "feat(theme): package id on themes and files, open measurement families in getThemeVars"` with the trailer Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>.

## Acceptance Criteria

- [x] VERIFY: pnpm exec vitest run src/SystemFolder/ControlPanels/AppearanceManager
- [x] ClassicyThemeSchema defaults package to "platinum" and accepts numeric package measurement families; theme files carry package; readClassicyTheme and ClassicyDesktopImportTheme refuse an unregistered package (file error / Desktop.errorDialog with title "Appearance").
- [x] getThemeVars emits every measurements.<family>.<key> number as --<kebab family>-<kebab key>: <n>px and the 21 pre-existing input variables are byte-identical.
- [x] VERIFY: pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test

## Files

- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.ts` - ClassicyTheme.package, measurements index signature, walker
- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeSchema.ts` - package default, measurements catchall
- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeFile.ts` - refuse unregistered package
- `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager.tsx` - ImportTheme error dialog on refusal
- `src/SystemFolder/ControlPanels/AppearanceManager/styles/themes.json` - package field on all 21 entries
- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeSchema.test.ts` - package and family tests
- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeFile.test.ts` - package round-trip and refusal tests
- `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager.importTheme.test.ts` - refusal and acceptance tests
- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.test.ts` - walker tests

## Work Log

### 2026-10-29T14:44:10.769Z - Done on feat/appearance-part-b, c2da6d1c7..cf41e5930: 2048d5bce theme package id on files, uninstalled-package refusal (readClassicyTheme error; ImportTheme errorDialog { title: "Appearance" } + classicyLog warning), measurements catchall + ClassicyThemeCoreMeasurements type, withDefaultThemeMetrics keeps package families, walker classicyMeasurementVars in ClassicyThemeMetrics.ts replacing the 20 input variables (the AC's "21" is the plan's stale count — reconciliation found 20), committed getThemeVars baseline fixture captured at c2da6d1c7; ruling R16 (default package id always installable, by constant); cf41e5930 review round 1 (core families always win, deterministic first-wins collisions with a one-time warning, CLASSICY_MEASUREMENT_NAME enforced in schema and walker, PascalCase rejected, AGENT-REFERENCE §8 + action table + CLAUDE.md updated, explicit R16 and warning tests). Review APPROVED (0 critical/important); reviewer re-derived the fixture from c2da6d1c7 (21/21 exact). Gate: lint, tsc, 325 files / 3837 tests, build:source + verify:dist green. Parity: 302/302 AE 0, forced 67/67 identical, computed 0 non-noise diffs.
