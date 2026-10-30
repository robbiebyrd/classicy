---
id: 0080-xy4
title: 'J 5.1: Presets from the active package; registry-backed fonts, wallpapers and sound packs'
purpose: Re-point the Themes, Desktop, Fonts and Sound tabs at the active package's presets and the asset/sound registries, carry the package id through theme files, and refuse a theme file for an unregistered package with a stop alert.
type: impr
status: complete
priority: "2"
effort: M
created: "2026-10-28T20:43:31.288Z"
updated: "2026-10-29T20:34:28.132Z"
started: "2026-10-29T17:50:20.231Z"
completed: "2026-10-29T20:34:28.132Z"
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
      - src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Themes.tsx
      - src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Desktop.tsx
      - src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Fonts.tsx
      - src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Sound.tsx
      - src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.tsx
      - src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Themes.test.tsx
      - src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Desktop.test.tsx
      - src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Fonts.test.tsx
      - src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Sound.test.tsx
      - src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.themeFile.test.tsx
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
  stories:
    - ["0083-v8n", "blocks"]
    - ["0079-vn4", "depends"]
  plans:
    - ["0012-pt9", "included", ["5.1"]]
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

# J 5.1: Presets from the active package; registry-backed fonts, wallpapers and sound packs

## Problem Statement

Audit §9 Phase 8 item 3 (presets from the package; Save/Load carry the package id) and §4.3–§4.5: the Themes tab hard-codes the package name (`.Themes.tsx:55`), the Fonts tab lists a literal array (`.Fonts.tsx:9-16`), the Desktop tab imports the `ClassicyWallpapers` array (`.Desktop.tsx:6,69`), and the manager resolves sounds through the mutable `ClassicySounds` record (`ClassicyAppearanceManager.tsx:22,114-150,192,206`). Umbrella 0002-ldj pins `pkg.presets` (D24), theme `package`, `useClassicyAssetTree('fonts' | 'wallpapers')` and `useClassicySoundPacks()` with `sound.pack`.

This section (plan 0012-pt9 §5.1) gives the Themes tab a `packageName` and a preset list filtered to the active package, pre-checks `getClassicyAppearancePackage(result.theme.package)` on load and shows the existing stop alert when the package is not installed, feeds the Desktop and Fonts tabs from the asset registries (Part C's Phase 3 item 5 may already have done this; the tests decide), adds a Sound Pack pop-up writing `sound.pack` through `ClassicyDesktopChangeAppearanceOption`, and deletes the `ClassicySounds` path from the manager.

**Impact:** Without it a second package's presets never appear, a theme file saved for an uninstalled package is dispatched into the reducer instead of being refused in the panel, and the Sound tab cannot switch sound packs (Part D's registry stays unreachable from the UI).

## Steps

### 1: Write the failing tests

Themes.test.tsx: `names the active package` (`packageName: 'Platinum'` → text `The current Appearance Package is Platinum`). themeFile.test.tsx: `refuses a theme file for an unregistered package with a stop alert and no dispatch` (file `{ format: 'classicy-theme', version: 1, theme: { ...getTheme('default'), package: 'irix' } }` → alert text contains `“irix” Appearance Package, which is not installed`; `ClassicyDesktopImportTheme` never dispatched); `lists presets of the active package and custom themes of that package only` (store with `customThemes: [{...custom, package: 'platinum'}, {...other, package: 'test-pack'}]` → the theme pop-up has 21 + 1 options). Desktop.test.tsx: `lists registered wallpapers` (`registerClassicyWallpapers('platinum', [{ name: 'Test Paper', src: 'https://example.com/t.png' }])` before render → option `Test Paper` with value `https://example.com/t.png`). Fonts.test.tsx: `lists registered font families` (`registerClassicyFonts('platinum', [{ family: 'TestFace', src: 'data:font/woff2;base64,AA==' }])` → each of the five menus has option `TestFace`); keep `shows the primary family of each of the default theme's stacks`. Sound.test.tsx: `lists sound packs and selects the theme's pack` (`soundPacks: [{ id: 'platinum', name: 'Platinum' }, { id: 'beep', name: 'Beep' }]`, `soundPack: 'beep'` → combobox `#soundPack` has value `beep`); `changeSoundPack fires on change` (fireEvent.change → called once with the event whose target value is `platinum`). Manager-level (themeFile.test.tsx harness): `selecting a sound pack dispatches ClassicyDesktopChangeAppearanceOption sound.pack` (spy on dispatch → `{ type: 'ClassicyDesktopChangeAppearanceOption', path: 'sound.pack', value: 'beep' }`).

### 2: Run them to verify they fail

`pnpm exec vitest run src/SystemFolder/ControlPanels/AppearanceManager` — Expected: the new tests FAIL (missing props/labels); the Fonts/Desktop registry tests may already PASS if Part C re-pointed them — note which.

### 3: Implement the four tab changes and the manager handlers; delete the ClassicySounds path

Themes: `ThemesTabProps` gains `packageName: string`; the label becomes `The current Appearance Package is ${packageName}`; `themesList` in the manager is `[...(activePackage.presets ?? []), ...(appearanceState.customThemes ?? []).filter(t => t.package === activePackage.id)].map(t => ({ value: t.id, label: t.name }))`. Load: `loadThemeFile` checks `getClassicyAppearancePackage(result.theme.package)` before dispatching; when undefined sets `themeFileError = { label: `“${file.name}” could not be loaded.`, message: `It was saved for the “${result.theme.package}” Appearance Package, which is not installed.` }` and dispatches nothing. Save: unchanged call (`downloadClassicyTheme` now writes `package`). Desktop: `DesktopTabProps` gains `wallpapers: { value: string; label: string }[]`; the manager builds it from `Object.entries(useClassicyAssetTree('wallpapers'))` as `{ value: src, label: name }` (string values only); the `ClassicyWallpapers` import is removed. Fonts: `FontsTabProps` gains `fonts: { value: string; label: string }[]` built from `Object.keys(useClassicyAssetTree('fonts'))` as `{ value: family, label: family }`; the literal `ClassicyFonts` array is deleted. Sound: `SoundTabProps` gains `soundPacks: { id: string; name: string }[]`, `soundPack: string`, `changeSoundPack: (e: ChangeEvent<HTMLSelectElement>) => void`; a first row `Sound Pack` pop-up (`id="soundPack"`, options `{ value: id, label: name }`, `selected={soundPack}`) above Alert Sound; the manager's `changeSoundPack` dispatches `{ type: 'ClassicyDesktopChangeAppearanceOption', path: 'sound.pack', value }` in a `startTransition`. Afterwards `grep -n 'ClassicySounds\|loadSoundTheme\|applySoundTheme' src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.tsx` → 0 (the `ClassicySoundManagerProvider` reloads on `sound.pack` change, Part D).

### 4: Run tests to verify they pass

`pnpm exec vitest run src/SystemFolder/ControlPanels/AppearanceManager src/SystemFolder/ControlPanels/SoundManager` — Expected: PASS.

### 5: Lint, type-check, commit

`pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test` then `git add src/SystemFolder/ControlPanels/AppearanceManager && git commit -m "feat(appearance): presets from the active package; fonts, wallpapers and sound packs from the registries"` (with the `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` trailer).

## Acceptance Criteria

- [x] VERIFY: pnpm exec vitest run src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.themeFile.test.tsx src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Sound.test.tsx
- [x] VERIFY: pnpm exec vitest run src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Themes.test.tsx src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Desktop.test.tsx src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Fonts.test.tsx
- [x] VERIFY: grep -c 'ClassicySounds\|loadSoundTheme\|applySoundTheme' src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.tsx  # expect 0

## Files

- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Themes.tsx` - modify: packageName label
- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Desktop.tsx` - modify: wallpapers prop from the registry
- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Fonts.tsx` - modify: fonts prop from the registry; literal array deleted
- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Sound.tsx` - modify: Sound Pack pop-up
- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.tsx` - modify: presets list, package pre-check on load, registry props, sound.pack dispatch; ClassicySounds path removed
- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Themes.test.tsx` - modify: package name test
- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Desktop.test.tsx` - modify: registered wallpapers test
- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Fonts.test.tsx` - modify: registered fonts test
- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Sound.test.tsx` - modify: sound pack tests
- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.themeFile.test.tsx` - modify: unregistered-package refusal, preset list, sound.pack dispatch

## Work Log

### 2026-10-29T17:50:12.317Z - Started beside Part B by controller decision (J reconciliation: no code overlap with B). The reconciliation narrows the section: Fonts/Desktop are already registry-backed by Part C and the old ClassicySounds globals are already gone (Part D); the remaining work is the Themes list from the active package (ruling 2), no redundant import pre-check (3), cross-package import (4), the shared Custom slot (8), the filtered sound-pack list via ChangeAppearanceOption { path: "sound.pack" } (10, J-R10) and the Themes label (12). Out of chain order (depends 0079-vn4, J 4.1, code complete). Base 954d06de2; implementer dispatched. Parity deferred until after B lands.

### 2026-10-29T18:43:09.813Z - Code complete on feat/appearance-part-j, 954d06de2..19f9cde64: 3bdf8a4cf (J-R2 theme list = active package presets + its loaded themes + its customs, ChangeTheme searches availableThemes → active-package presets (store-free J-R16 helper) → customs, untrusted floor pinned; J-R3 no panel pre-check, B's message pinned; J-R4 importing a theme for another installed package switches packages first; J-R8 one Custom slot per package ("custom" for the default package, custom-<pkg> otherwise); J-R10 Sound Pack pop-up lists shared + active-package packs and writes ChangeAppearanceOption sound.pack; J-R12 Platinum icon only for platinum; Fonts/Desktop already Part C's, old sound globals already gone (Part D)), 2aa35d2b6 (review round 1: a fork moves an import squatting on custom-<pkg> aside to -2/-3 instead of overwriting it — a real data-loss bug; imports deduplicated against the active package's presets; the active theme's pack always listed), 19f9cde64 (final minors: the moved import's new id also avoids its package's presets and every Custom slot id; doc row corrected). Reviews: Needs fixes (I1 M5) → Approved (M2) → closed. Gate on 19f9cde64: lint, tsc, 333 files / 3995 tests, build:source + verify:dist. Contract additions for J 6.1: classicyCustomThemeSlotId, listClassicyPackageThemes, findClassicyTheme's presets parameter, assignImportedClassicyThemeIdentity's reservedIds parameter. Stays in_progress for the [MANUAL] example-app check after Part B lands.

### 2026-10-29T20:22:00.352Z - Moved one open [MANUAL] acceptance criterion to the program V&V ticket 0083-v8n (human verification and validation), where it is tracked and ticked. This story now closes on its automated criteria; 0083-v8n links back with `depends`.
