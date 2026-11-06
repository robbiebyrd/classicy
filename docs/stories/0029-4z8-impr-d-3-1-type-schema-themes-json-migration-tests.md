---
id: 0029-4z8
title: 'D 3.1: Type, schema, themes.json, migration, tests'
purpose: Replace the theme's sound.name with sound.pack everywhere, validate it against the live registry, and heal persisted state copy-on-write.
type: impr
status: complete
priority: "2"
effort: M
created: "2026-10-28T20:06:38.056Z"
updated: "2026-10-28T23:47:36.232Z"
started: "2026-10-28T23:34:32.312Z"
completed: "2026-10-28T23:39:49.918Z"
links:
  repo:
    local: ~/classicy
    files:
      - src/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerUtils.tsx
      - src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeSchema.ts
      - src/SystemFolder/ControlPanels/AppearanceManager/styles/themes.json
      - src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeFile.ts
      - src/SystemFolder/ControlPanels/AppManager/ClassicyStateMigrations.ts
      - src/SystemFolder/ControlPanels/AppManager/ClassicyStateMigrations.soundPack.test.ts
      - src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeSchema.test.ts
      - src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeFile.test.ts
      - src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.themeFile.test.tsx
      - src/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager.importTheme.test.ts
      - src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconEventHandler.test.ts
      - src/SystemFolder/SystemResources/Desktop/ClassicyDesktopEventHandler.test.ts
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
  stories:
    - ["0028-c4c", "depends"]
  plans:
    - ["0008-j5l", "included", ["3.1"]]
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

# D 3.1: Type, schema, themes.json, migration, tests

## Problem Statement

Audit §4.3: `ClassicyThemeSchema.ts:86-90` refines `sound.name` against a frozen object, so a pack registered later can never validate. Umbrella 0002-ldj: `sound.pack: string` replaces `sound.name` and the zod `refine` consults `getClassicySoundPack` at parse time; D16 allows the break (no alias in the schema or theme files).

This story renames the field in `ClassicyThemeSound`, the schema, all 21 `themes.json` entries and the theme-file doc comment; adds `migrateThemeSoundPack` to `migrateClassicyState` so persisted `activeTheme`/`availableThemes`/`customThemes` are healed copy-on-write (the store's documented shape-migration mechanism, not an alias); and moves seven test files' fixtures and assertions to `sound.pack`.

**Impact:** D 4.1's provider reads `activeTheme.sound.pack`; without the rename and migration it would read `undefined` for every existing user, and `exportClassicyTheme` would refuse migrated themes at round-trip.

## Steps

### 1: Write the failing tests

`ClassicyStateMigrations.soundPack.test.ts` (same harness as `ClassicyStateMigrations.metrics.test.ts`):
```ts
it("renames sound.name to sound.pack on activeTheme, availableThemes and customThemes") // state from DefaultAppManagerState with all three given sound {name:"platinum",disabled:["ClassicyBeep"]} (pack deleted) → each sound deep-equals {pack:"platinum",disabled:["ClassicyBeep"]} and has no own "name"
it("returns the same object when every theme already has sound.pack") // toBe(DefaultAppManagerState)
it("does not mutate the input") // deep-frozen stripped state; no throw; input unchanged
it("a migrated activeTheme exports and parses as a theme file") // parseClassicyThemeFile(exportClassicyTheme(migrated.System.Manager.Appearance.activeTheme)).ok === true
```
`ClassicyThemeSchema.test.ts` additions beside the existing `sosumi` case:
```ts
it("a sound pack registered after module load validates") // registerClassicySoundPack({id:"late",name:"Late",src:["https://x/l.ogg"],sprite:{ClassicyBeep:[0,1]}}); withEdit(t => { t.sound.pack = "late" }) parses ok
it("a theme file still using sound.name is refused with a sound.pack issue") // withEdit(t => { delete t.sound.pack; t.sound.name = "platinum" }) → issues[0].path ["sound","pack"]
```

### 2: Run them to verify they fail

`pnpm exec vitest run src/SystemFolder/ControlPanels/AppManager/ClassicyStateMigrations.soundPack.test.ts src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeSchema.test.ts` — Expected: FAIL — `pack` undefined after migration; schema path is `sound.name`.

### 3: Implement the type, schema, themes.json rewrite, doc comment and migrateThemeSoundPack

`ClassicyThemeSound = { pack: string; disabled: string[] }` (`ClassicySoundManagerUtils.tsx:22-25`). Schema: `const soundPack = z.string().max(64).refine((id) => getClassicySoundPack(id) !== undefined, { error: "must be a registered sound pack" })`; `sound: z.object({ pack: soundPack, disabled: … })` (`ClassicyThemeSchema.ts:86-90,184-187`). `themes.json`: every `"name": "platinum"` inside a `sound` block becomes `"pack": "platinum"` (21 edits, tab indentation kept; a `node -e` JSON rewrite is fine) — `grep -c '"pack": "platinum"' src/SystemFolder/ControlPanels/AppearanceManager/styles/themes.json` is 21 and `grep -c '"name": "platinum"'` is 0. `ClassicyThemeFile.ts:19-21` doc comment shows `sound: { pack, disabled }`. Migration: `function migrateThemeSoundPack(state)` chained last in `migrateClassicyState` (`return migrateThemeSoundPack(migrateThemeMetrics(migrateAppWindows(state)))`), applied via the existing `migrateThemeList` helper to `activeTheme`, `availableThemes[]`, `customThemes[]`: a theme whose `sound` has own `name` and no `pack` → copy with `sound: { pack: name, disabled }` (`name` dropped); same reference when nothing changes; doc list gains `- 2.2: theme sound.name renamed to sound.pack (plan 0002-ldj Part D)`.

### 4: Move the seven test files' fixtures and assertions to sound.pack

`ClassicyThemeSchema.test.ts:152-161` (`sosumi` case sets `t.sound.pack = "sosumi"`, expects path `["sound","pack"]`; the `toString` prototype case targets `pack`); `ClassicyThemeFile.test.ts:181-192,370-378` (expect `sound.pack:`); `ClassicyAppearanceManager.themeFile.test.tsx:123-127`; `ClassicyDesktopManager.importTheme.test.ts:190-195`; `ClassicyDesktopIconEventHandler.test.ts:131` and `ClassicyDesktopEventHandler.test.ts:137` fixtures become `sound: { pack: "platinum", disabled: [] }`. Keep every other assertion as is.

### 5: Run tests to verify they pass

`pnpm exec vitest run src/SystemFolder/ControlPanels src/SystemFolder/SystemResources/Desktop` — Expected: PASS.

### 6: Lint, type-check, commit

`pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`; then git add -A src && git commit -m "feat(theme): sound.pack selects a registered sound pack; migrate persisted sound.name" (with the trailer).

## Acceptance Criteria

- [~] VERIFY: pnpm exec vitest run src/SystemFolder/ControlPanels/AppManager/ClassicyStateMigrations.soundPack.test.ts && grep -rn 'sound\.name\|name: "platinum"' src --include=*.ts --include=*.tsx --include=*.json | wc -l  # expect 0
- [x] All 21 built-in themes carry `sound.pack: "platinum"`; a theme with `sound.name` fails the schema at path `["sound","pack"]`; a pack registered after module load validates.
- [x] Persisted state with `sound.name` is migrated copy-on-write on `activeTheme`, `availableThemes` and `customThemes`, returns the same reference when nothing changes, and the migrated theme exports and parses as a theme file.
- [x] VERIFY: pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test

## Files

- `src/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerUtils.tsx` - :22-25 ClassicyThemeSound.pack
- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeSchema.ts` - :86-90,184-187 soundPack refine
- `src/SystemFolder/ControlPanels/AppearanceManager/styles/themes.json` - 21 sound blocks name to pack
- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeFile.ts` - :19-21 doc comment
- `src/SystemFolder/ControlPanels/AppManager/ClassicyStateMigrations.ts` - :25-35 migrateThemeSoundPack chained
- `src/SystemFolder/ControlPanels/AppManager/ClassicyStateMigrations.soundPack.test.ts` - create
- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeSchema.test.ts` - :152-161 plus two new cases
- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeFile.test.ts` - :181-192,370-378 fixtures
- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.themeFile.test.tsx` - :123-127 fixture
- `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager.importTheme.test.ts` - :190-195 fixture
- `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconEventHandler.test.ts` - :131 fixture
- `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopEventHandler.test.ts` - :137 fixture

## Work Log

### 2026-10-28T23:35:51.346Z - pnpm lint blocked by pre-existing drift in untouched ClassicyScreenSaverWarp.tsx; fixed at part close-out (criterion 4 set not_applicable; tsc and pnpm test passed)

### 2026-10-28T23:35:51.431Z - Implemented in commits dff96cb..17fecf9, task review clean. Criterion 1 left open: the migration tests pass but the 'sound.name|name: "platinum"' grep prints 9, not 0; all 9 are intentional (migrateThemeSoundPack code and doc line, the migration test fixture, and the schema test that refuses a sound.name file). Ledger ruling accepted these as unreachable under the brief's own mandated migration and refusal tests; the criterion text needs a narrower grep or an explicit waiver.

### 2026-10-28T23:39:48.477Z - Literal grep over-broad (12 hits across the three file types: 3 in ClassicyStateMigrations.ts, 8 in ClassicyStateMigrations.soundPack.test.ts, 1 in ClassicyThemeSchema.test.ts, all mandated migration code or negative assertions); narrowed grep excluding *.test.ts(x) and ClassicyStateMigrations.ts = 0; intent met (controller ruling)

### 2026-10-28T23:47:36.232Z - pnpm lint passes repo-wide after 88ff181e6 (criterion 4 changed from not_applicable to done; controller verified lint 0, tsc 0, 3357/3357 tests; merged a1a600a76)
