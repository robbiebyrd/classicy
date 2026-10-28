---
id: 0008-j5l
title: 'Part D: Sound packs'
type: impl
status: pending
priority: "2"
effort: M
created: "2026-10-28T19:16:15.509Z"
updated: "2026-10-28T19:38:38.909Z"
links:
  repo:
    local: ~/classicy
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
  plans:
    - ["0002-ldj", "parent"]
    - ["0000-aud", "included"]
progress:
  "0":
    status: pending
  "1":
    status: pending
  "1.1":
    status: pending
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
---

# Part D: Sound packs

## Summary

**Goal:** Sound themes become registered Sound packs selected by `sound.pack` in theme JSON, loaded by the Sound manager from the persisted theme at boot and on change, with missing sprites falling back to Platinum.

**Problem:** Audit §4.3: `ClassicySounds` (`ClassicySounds.ts:17-19`) is a mutable exported object with one entry and no register call; `ClassicyThemeSchema.ts:86-90` refines `sound.name` against that frozen object; the theme's sound is applied only on `switchTheme`/import (`ClassicyAppearanceManager.tsx:114-207`) while `ClassicySoundManagerUtils.tsx:130-145` boots `ClassicySounds.platinum` unconditionally, ignoring the persisted theme; `bin/make_audio_sprites.sh:5,18` writes absolute `/assets/sounds/<name>` `src` paths, so a pack cannot be hosted elsewhere; the sprite ids components dispatch are not pinned anywhere a pack author can read.

**Approach:** A live `ClassicySoundPacks.ts` registry (zod-validated, `useSyncExternalStore`) with `CLASSICY_SOUND_SPRITE_IDS` as the pack contract; the Platinum pack moves to `src/Appearance/Platinum/assets/sounds/platinum.ts` and registers itself under "platinum"; `sound.name` → `sound.pack` everywhere with a copy-on-write state migration; the provider seeds its Howl from the persisted theme's pack, reloads on pack change and resolves missing sprites to Platinum.

---

# Part 2 — Implementation

**Architecture:** Implements audit §9 Phase 4 under umbrella plan 0002-ldj ("Shared Contract — sound packs"). No dependency on other parts: the Platinum pack registers itself at module scope from its own file (listed in `package.json` `sideEffects`) and `ClassicySoundManagerProvider` imports it for its side effect until Part B moves the call into `src/Appearance/Platinum/index.ts`. For agentic workers: use superpowers:subagent-driven-development or superpowers:executing-plans task-by-task; steps use checkbox syntax.

**Tech Stack:** TypeScript, zod 4.4 (`.extend`, `.refine`), howler 2.2 (`Howl`, mocked in tests via `vi.mock("howler")`), React 19 `useReducer`/`useSyncExternalStore`, Zustand (read-only), bash + audiosprite (`npx -y audiosprite -f howler2`), vitest 5/jsdom, Biome.

## Constraints

- No visual change; Phase 0 shoots a two-story parity set and Phase 6 re-shoots it (AE 0) as a cheap regression guard.
- Before every commit: `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`; commits end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Library code logs through `classicyLog(level, subsystem, …)`, never `console.*`.
- `src/index.ts` is barrel-generated: `pnpm exec barrelsby -c .ts-barrel.json` after adding or deleting a module; never hand-edit it.
- Contract names verbatim: `ClassicySoundPack`, `ClassicySoundPackSchema`, `registerClassicySoundPack`, `getClassicySoundPack`, `listClassicySoundPacks`, `subscribeClassicySoundPacks`, `useClassicySoundPacks`, `CLASSICY_SOUND_SPRITE_IDS`, theme field `sound.pack`, Platinum pack file `src/Appearance/Platinum/assets/sounds/platinum.ts`.
- D16: no alias for `sound.name` in the schema or theme files (a file with `sound.name` is refused with a `sound.pack:` issue); persisted state is healed by `migrateClassicyState` because that is the store's documented shape-migration mechanism, not an alias.
- A Howl is created only inside `createSoundPlayer`; every reload goes through the `ClassicySoundLoad` reducer case so volume re-application (`ClassicySoundManagerProvider.tsx:62-65`) keeps working.
- American English spelling in code, comments and docs.
- Review focus: (1) `CLASSICY_SOUND_SPRITE_IDS` must equal the Platinum sprite JSON key set exactly → 1.1; (2) a persisted theme with `sound.pack: "remote"` whose pack is registered after mount must load it without a reload → 4.1; (3) `ClassicySoundPlay` of a sprite absent from the active pack must play from the Platinum player, never silently drop → 4.1; (4) a color edit on the active theme must not recreate the Howl (effect keyed on the `pack` string) → 4.1; (5) `exportClassicyTheme` of a migrated persisted theme must round-trip → 3.1.

## Files

| File | Change | Responsibility |
|---|---|---|
| `src/SystemFolder/ControlPanels/SoundManager/ClassicySoundPacks.ts` | create | Registry, schema, `CLASSICY_SOUND_SPRITE_IDS`, `CLASSICY_DEFAULT_SOUND_PACK_ID`. |
| `src/SystemFolder/ControlPanels/SoundManager/ClassicySoundPacks.test.ts` | create | Registry tests; sprite-id parity with the Platinum JSON, the labels JSON and every `sound: "…"` literal in `src`. |
| `src/Appearance/Platinum/assets/sounds/platinum.ts` | create | Builds and registers the Platinum pack (`id: "platinum"`) from `assets/sounds/platinum/platinum.json` and the four audio URLs. |
| `src/Appearance/Platinum/assets/sounds/platinum.test.ts` | create | The pack registers on import, carries 41 sprites and four `src` URLs matching the JSON basenames. |
| `src/SystemFolder/ControlPanels/AppearanceManager/ClassicySounds.ts` | delete | Replaced by the registry. |
| `src/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerUtils.tsx` | modify | `ClassicyThemeSound.pack`; state gains `packId`, `sprites`, `fallbackPlayer`; `ClassicySoundLoad { pack }`; sprite fallback in play paths; `initialPlayer` no longer boots a Howl. |
| `src/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerProvider.tsx` | modify | Seeds from the persisted theme's pack; reloads on pack change or late registration. |
| `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.tsx` | modify | Drops `loadSoundTheme`/`applySoundTheme` (lines 114-146, 193-207 callers). |
| `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeSchema.ts, ClassicyAppearance.ts, styles/themes.json, ClassicyThemeFile.ts` | modify | `sound.pack` with a registry-backed refine; 21 themes; file docs. |
| `src/SystemFolder/ControlPanels/AppManager/ClassicyStateMigrations.ts` | modify | `migrateThemeSoundPack` (copy-on-write `name` → `pack`). |
| `Tests naming sound.name (7 files, see 3.1)` | modify | Fixtures and assertions move to `sound.pack`. |
| `bin/make_audio_sprites.sh` | modify | Writes `id`, `name` and relative `./<file>` `src` into the pack JSON. |
| `assets/sounds/platinum/platinum.json` | modify | Regenerated shape (`id`, `name`, relative `src`); sprite map unchanged. |
| `package.json` | modify | `sideEffects` gains the Platinum pack module. |
| `docs/AGENT-REFERENCE.md, CLAUDE.md` | modify | §10 Sound, §8 theme table rows 913/1052, SoundManager note. |

## Phase 0: Parity baseline

- [ ] `pnpm storybook` in the background (port 6006).
- [ ] `mkdir -p .playwright-mcp/parity/part-D/before` and write `desktop-desktop--default` and `dialogs-alert--note` to `.playwright-mcp/parity/part-D/stories.txt` after confirming both ids exist in `curl -s http://localhost:6006/index.json`.
- [ ] Playwright: open `http://localhost:6006/iframe.html?id=<id>&viewMode=story` at 1024×768, wait networkidle + 500 ms, save `.playwright-mcp/parity/part-D/before/<id>.png` for both.
- [ ] `ls .playwright-mcp/parity/part-D/before | wc -l` is 2. No commit.

**Validation:** `ls .playwright-mcp/parity/part-D/before/*.png | wc -l  # 2`

## Phase 1: Registry and sprite-id contract

### 1.1: ClassicySoundPacks.ts

**Files:**
- Create: `src/SystemFolder/ControlPanels/SoundManager/ClassicySoundPacks.ts`
- Test: `src/SystemFolder/ControlPanels/SoundManager/ClassicySoundPacks.test.ts`

**Depends on:** 0

**Interfaces:**
- Consumes: `SoundDataSchema`/`SoundData` (`ClassicySoundSchema.ts:3-14`); `classicyLog`; `assets/sounds/platinum/platinum.json` (41 sprite keys); `ClassicySoundManagerLabels.json` (41 ids); `ClassicyAlertSounds.ts` (`DEFAULT_ALERT_SOUND`, `CLASSICY_ALERT_SOUNDS`).
- Produces: `export type ClassicySoundPack = SoundData & { id: string; name: string; packageId?: string }`; `export const ClassicySoundPackSchema: z.ZodType<ClassicySoundPack> = SoundDataSchema.extend({ id: z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/, "must be a kebab-case id"), name: z.string().trim().min(1).max(64), packageId: z.string().max(64).optional(), src: z.array(z.string().min(1)).min(1) })`; `export const CLASSICY_DEFAULT_SOUND_PACK_ID = "platinum"`; `export const CLASSICY_SOUND_SPRITE_IDS = ["ClassicyAlertBonk","ClassicyAlertGrowl","ClassicyAlertIndigo","ClassicyAlertQuack","ClassicyAlertSosumi","ClassicyAlertTabitha","ClassicyAlertWildEep","ClassicyBeep","ClassicyBoot","ClassicyButtonClickDown","ClassicyButtonClickUp","ClassicyClick","ClassicyEmailMailError","ClassicyEmailMailSent","ClassicyEmailNewMail","ClassicyEmailNoMail","ClassicyInputRadioClickDown","ClassicyInputRadioClickUp","ClassicyMenuClose","ClassicyMenuItemClick","ClassicyMenuItemHover","ClassicyMenuOpen","ClassicyTabClick","ClassicyTabClickDown","ClassicyTabClickUp","ClassicyThump","ClassicyWindowClose","ClassicyWindowCollapse","ClassicyWindowControlClickDown","ClassicyWindowControlClickUp","ClassicyWindowExpand","ClassicyWindowFocus","ClassicyWindowMoveIdle","ClassicyWindowMoveMoving","ClassicyWindowMoveStop","ClassicyWindowOpen","ClassicyWindowResizeIdle","ClassicyWindowResizeResizing","ClassicyWindowResizeStop","ClassicyWindowZoomMaximize","ClassicyWindowZoomMinimize"] as const satisfies readonly string[]` (41 ids — the contract's "~140" counted dispatch sites, not ids; reported to the umbrella); `export type ClassicySoundSpriteId = (typeof CLASSICY_SOUND_SPRITE_IDS)[number]`. `registerClassicySoundPack(pack)`: `safeParse`; on failure `classicyLog("warn", "ClassicySoundPacks", "Rejected sound pack", { id: pack?.id, issues })` and return; on success store `parsed.data` in a `Map<string, ClassicySoundPack>` (re-register replaces, insertion order kept for first registration), rebuild the frozen list snapshot, notify listeners. `getClassicySoundPack(id)`, `listClassicySoundPacks()` (registration order), `subscribeClassicySoundPacks(listener)` → unsubscribe, `useClassicySoundPacks()` = `useSyncExternalStore(subscribe, () => snapshot)`, `export const classicySoundPackMissingSprites = (pack: ClassicySoundPack): string[]` (contract ids absent from `pack.sprite`; used by the provider's warning), `export const resetClassicySoundPacks = (): void` (tests).

- [ ] **Step 1: Write the failing tests** — `ClassicySoundPacks.test.ts` (`beforeEach(resetClassicySoundPacks)`):
```ts
const pack = (over = {}) => ({ id: "remote", name: "Remote", src: ["https://cdn.example.com/remote.ogg","https://cdn.example.com/remote.mp3"], sprite: { ClassicyBeep: [0, 100] as [number, number] }, ...over });
it("registers a pack whose src are https URLs and lists it in order") // registerClassicySoundPack(pack()); registerClassicySoundPack(pack({id:"other",name:"Other"})); expect(listClassicySoundPacks().map(p=>p.id)).toEqual(["remote","other"]); expect(getClassicySoundPack("remote")?.src[0]).toBe("https://cdn.example.com/remote.ogg")
it("re-registering an id replaces the pack and keeps its position") // register remote, other, remote(name "Remote 2") → ids ["remote","other"], name "Remote 2"
it("rejects an invalid pack with a warning and does not register it") // spy classicyLog; registerClassicySoundPack(pack({ id: "Bad Id" }) as never); expect(getClassicySoundPack("Bad Id")).toBeUndefined(); warn called once with subsystem "ClassicySoundPacks"; also `src: []` rejected
it("notifies subscribers once per registration and stops after unsubscribe")
it("useClassicySoundPacks re-renders a component when a pack registers after mount") // render <Probe/> printing ids joined; act(register) → "remote"
it("CLASSICY_SOUND_SPRITE_IDS equals the Platinum sprite JSON key set") // import platinumJson from "@snd/platinum/platinum.json"; expect([...CLASSICY_SOUND_SPRITE_IDS].sort()).toEqual(Object.keys(platinumJson.sprite).sort()); expect(CLASSICY_SOUND_SPRITE_IDS).toHaveLength(41)
it("every label id and alert sound is a contract id") // labels JSON ids ⊆ set; DEFAULT_ALERT_SOUND and CLASSICY_ALERT_SOUNDS values ⊆ set
it("every sound literal dispatched in src is a contract id") // node:fs walk of `src` (skip *.test.*, *.stories.*, __tests__), regex /sound:\s*["']([A-Za-z0-9_]+)["']/g over each file; expect(new Set(found) minus set).toEqual(new Set()); also expect(found.length).toBeGreaterThan(20)
it("classicySoundPackMissingSprites lists contract ids a pack lacks") // pack() → 40 missing, not containing "ClassicyBeep"
```
- [ ] **Step 2: Run it to verify it fails** — Expected: FAIL — Cannot find module './ClassicySoundPacks'. — `pnpm exec vitest run src/SystemFolder/ControlPanels/SoundManager/ClassicySoundPacks.test.ts`
- [ ] **Step 3: Implement `ClassicySoundPacks.ts` per the Interfaces block** — Follow the `ClassicyControlStripRegistry.ts` idiom (Map + listeners + frozen snapshot). Export the `as const` id tuple; the `satisfies readonly string[]` keeps the contract's declared type.
- [ ] **Step 4: Run tests to verify they pass** — Expected: PASS (9 tests). — `pnpm exec vitest run src/SystemFolder/ControlPanels/SoundManager/ClassicySoundPacks.test.ts`
- [ ] **Step 5: Regenerate barrels, lint, type-check, commit** — git add src/SystemFolder/ControlPanels/SoundManager/ClassicySoundPacks.ts src/SystemFolder/ControlPanels/SoundManager/ClassicySoundPacks.test.ts src/index.ts && git commit -m "feat(sound): sound pack registry and the sprite-id contract" (with the trailer). — `pnpm exec barrelsby -c .ts-barrel.json && pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`

**Validation:** `pnpm exec vitest run src/SystemFolder/ControlPanels/SoundManager/ClassicySoundPacks.test.ts`

## Phase 2: The Platinum pack

### 2.1: platinum.ts replaces ClassicySounds.ts

**Files:**
- Create: `src/Appearance/Platinum/assets/sounds/platinum.ts`
- Modify: `package.json (sideEffects)`
- Modify: `src/SystemFolder/ControlPanels/SoundManager/ClassicySoundStateEventReducer.test.ts:26-32`
- Delete: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicySounds.ts`
- Test: `src/Appearance/Platinum/assets/sounds/platinum.test.ts`

**Depends on:** 1.1

**Interfaces:**
- Consumes: `ClassicySounds.ts:1-19` (the four `new URL("@snd/platinum/platinum.<ext>", import.meta.url).href` lines and the JSON import); 1.1 registry.
- Produces: `src/Appearance/Platinum/assets/sounds/platinum.ts`: `const PLATINUM = "platinum"`; the same four `new URL` literals (the audio stays in `assets/sounds/platinum/`, where `pnpm build:audio` writes it and Storybook serves it); `export const platinumSoundPack: ClassicySoundPack = ClassicySoundPackSchema.parse({ ...platinumJson, id: PLATINUM, name: "Platinum", src: [platinumOgg, platinumM4a, platinumMp3, platinumAc3] })` (explicit `id`/`name` so the module works before 5.1 regenerates the JSON); `registerClassicySoundPack(platinumSoundPack)` at module scope with the comment `// Registered here until plan 0002-ldj Part B moves this call into src/Appearance/Platinum/index.ts`. `package.json` `sideEffects` gains `"./src/Appearance/Platinum/assets/sounds/platinum.ts"`. `ClassicySounds.ts` deleted; its three importers (`ClassicySoundManagerUtils.tsx:5`, `ClassicyThemeSchema.ts:3`, `ClassicyAppearanceManager.tsx:22`) are rewritten in 3.1 and 4.1 — to keep the tree compiling between commits, this section rewrites `ClassicyThemeSchema.ts:86-90`'s refine to `getClassicySoundPack(name) !== undefined` (field still `name`; renamed in 3.1), `ClassicySoundManagerUtils.tsx:130` to `const defaultSoundData = getClassicySoundPack(CLASSICY_DEFAULT_SOUND_PACK_ID)` with `import "@/Appearance/Platinum/assets/sounds/platinum"` above it, and `ClassicyAppearanceManager.tsx:116` to `getClassicySoundPack(soundTheme.name)`. The reducer test's `vi.mock("…/ClassicySounds")` (lines 26-32) becomes `vi.mock("@/Appearance/Platinum/assets/sounds/platinum", () => ({}))` plus a `beforeEach` that calls `registerClassicySoundPack({ id: "platinum", name: "Platinum", src: ["test.mp3"], sprite: { click: [0, 100] } })`.

- [ ] **Step 1: Write the failing tests** — `platinum.test.ts`:
```ts
import { platinumSoundPack } from "@/Appearance/Platinum/assets/sounds/platinum";
it("registers itself under id platinum on import") // expect(getClassicySoundPack("platinum")).toBe(platinumSoundPack); name "Platinum"
it("carries every contract sprite and nothing else") // expect(Object.keys(platinumSoundPack.sprite).sort()).toEqual([...CLASSICY_SOUND_SPRITE_IDS].sort()); expect(classicySoundPackMissingSprites(platinumSoundPack)).toEqual([])
it("has four src URLs whose basenames match the JSON") // expect(platinumSoundPack.src.map(u => u.split("/").pop())).toEqual(["platinum.ogg","platinum.m4a","platinum.mp3","platinum.ac3"])
it("keeps the four loop sprites flagged") // for ClassicyWindowMoveIdle, ClassicyWindowMoveMoving, ClassicyWindowResizeIdle, ClassicyWindowResizeResizing: sprite[id][2] === true
```
- [ ] **Step 2: Run it to verify it fails** — Expected: FAIL — module not found. — `pnpm exec vitest run src/Appearance/Platinum/assets/sounds`
- [ ] **Step 3: Create `platinum.ts`, delete `ClassicySounds.ts`, patch the three importers and the reducer test mock, add the `sideEffects` entry** — Per the Interfaces block. `grep -rn ClassicySounds src docs` must then show only `docs/AGENT-REFERENCE.md` (rewritten in 6.1).
- [ ] **Step 4: Run tests to verify they pass** — Expected: PASS. — `pnpm exec vitest run src/Appearance/Platinum src/SystemFolder/ControlPanels/SoundManager src/SystemFolder/ControlPanels/AppearanceManager`
- [ ] **Step 5: Regenerate barrels, lint, type-check, commit** — git add -A src package.json && git commit -m "refactor(sound): Platinum sound pack module registers itself; delete ClassicySounds" (with the trailer). — `pnpm exec barrelsby -c .ts-barrel.json && pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`

**Validation:** `pnpm exec vitest run src/Appearance/Platinum/assets/sounds/platinum.test.ts && test ! -e src/SystemFolder/ControlPanels/AppearanceManager/ClassicySounds.ts`

## Phase 3: Theme JSON: sound.pack

### 3.1: Type, schema, themes.json, migration, tests

**Files:**
- Modify: `src/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerUtils.tsx:22-25`
- Modify: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeSchema.ts:86-90,184-187`
- Modify: `src/SystemFolder/ControlPanels/AppearanceManager/styles/themes.json (21 × sound block)`
- Modify: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeFile.ts:19-21 (doc comment)`
- Modify: `src/SystemFolder/ControlPanels/AppManager/ClassicyStateMigrations.ts:25-35`
- Modify: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeSchema.test.ts:152-161`
- Modify: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeFile.test.ts:181-192,370-378`
- Modify: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.themeFile.test.tsx:123-127`
- Modify: `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager.importTheme.test.ts:190-195`
- Modify: `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconEventHandler.test.ts:131`
- Modify: `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopEventHandler.test.ts:137`
- Test: `src/SystemFolder/ControlPanels/AppManager/ClassicyStateMigrations.soundPack.test.ts`
- Test: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeSchema.test.ts`

**Depends on:** 2.1

**Interfaces:**
- Consumes: `getClassicySoundPack` (1.1); `migrateClassicyState` chain (`ClassicyStateMigrations.ts:34-35`, `migrateThemeList` helper at 66); `ClassicyThemeSchema` `satisfies`/`AssertTrue` guards (lines 188-195).
- Produces: `ClassicyThemeSound = { pack: string; disabled: string[] }` (`ClassicySoundManagerUtils.tsx:22-25`). Schema: `const soundPack = z.string().max(64).refine((id) => getClassicySoundPack(id) !== undefined, { error: "must be a registered sound pack" })` (evaluated per parse, so a pack registered later validates; the message no longer enumerates ids); `sound: z.object({ pack: soundPack, disabled: … })`. `themes.json`: every `"name": "platinum"` inside a `sound` block becomes `"pack": "platinum"` (21 edits, tab indentation kept; a `node -e` JSON rewrite is fine). `ClassicyThemeFile.ts:19-21` doc comment shows `sound: { pack, disabled }`. Migration: `function migrateThemeSoundPack(state)` chained last in `migrateClassicyState` (`return migrateThemeSoundPack(migrateThemeMetrics(migrateAppWindows(state)))`), applied via the existing `migrateThemeList` helper to `activeTheme`, `availableThemes[]`, `customThemes[]`: a theme whose `sound` has own `name` and no `pack` → copy with `sound: { pack: name, disabled }` (`name` dropped); same reference when nothing changes; doc list gains `- 2.2: theme sound.name renamed to sound.pack (plan 0002-ldj Part D)`. Test fixture edits: `sosumi` cases set `t.sound.pack = "sosumi"` and expect `sound.pack:`/path `["sound","pack"]`; the `toString` prototype case targets `pack`; the two desktop handler fixtures become `sound: { pack: "platinum", disabled: [] }`.

- [ ] **Step 1: Write the failing tests** — `ClassicyStateMigrations.soundPack.test.ts` (same harness as `ClassicyStateMigrations.metrics.test.ts`):
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
- [ ] **Step 2: Run them to verify they fail** — Expected: FAIL — `pack` undefined after migration; schema path is `sound.name`. — `pnpm exec vitest run src/SystemFolder/ControlPanels/AppManager/ClassicyStateMigrations.soundPack.test.ts src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeSchema.test.ts`
- [ ] **Step 3: Implement the type, schema, themes.json rewrite, doc comment and `migrateThemeSoundPack`** — Per the Interfaces block; `grep -c '"pack": "platinum"' src/SystemFolder/ControlPanels/AppearanceManager/styles/themes.json` is 21 and `grep -c '"name": "platinum"'` is 0.
- [ ] **Step 4: Move the seven test files' fixtures and assertions to `sound.pack`** — Lines listed in Files; keep every other assertion as is.
- [ ] **Step 5: Run tests to verify they pass** — Expected: PASS. — `pnpm exec vitest run src/SystemFolder/ControlPanels src/SystemFolder/SystemResources/Desktop`
- [ ] **Step 6: Lint, type-check, commit** — git add -A src && git commit -m "feat(theme): sound.pack selects a registered sound pack; migrate persisted sound.name" (with the trailer). — `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`

**Validation:** `pnpm exec vitest run src/SystemFolder/ControlPanels/AppManager/ClassicyStateMigrations.soundPack.test.ts && grep -rn 'sound\.name\|name: "platinum"' src --include=*.ts --include=*.tsx --include=*.json | wc -l  # expect 0`

## Phase 4: Sound manager boots and switches by pack

### 4.1: Provider and reducer

**Files:**
- Modify: `src/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerUtils.tsx:34-47,65-75,130-149,157-162,176-189,245-256`
- Modify: `src/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerProvider.tsx:19-37`
- Modify: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.tsx:22,34,114-146,193-207`
- Modify: `src/SystemFolder/ControlPanels/SoundManager/ClassicySoundStateEventReducer.test.ts:193-230`
- Test: `src/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerProvider.packs.test.tsx`
- Test: `src/SystemFolder/ControlPanels/SoundManager/ClassicySoundStateEventReducer.test.ts`

**Depends on:** 3.1

**Interfaces:**
- Consumes: 1.1 registry (`getClassicySoundPack`, `useClassicySoundPacks`, `classicySoundPackMissingSprites`, `CLASSICY_DEFAULT_SOUND_PACK_ID`); 2.1 Platinum module; `useAppManager` (`activeTheme.sound.pack`); existing volume effect (`Provider.tsx:62-65`).
- Produces: State (`ClassicySoundState`) gains `packId: string | null`, `sprites: ReadonlySet<string>`, `fallbackPlayer: Howl | null` (the Platinum player when `packId !== "platinum"`, else `null`). `ClassicySoundAction.file` is replaced by `pack?: ClassicySoundPack`. `ClassicySoundLoad { pack, disabled? }` → `soundPlayer: createSoundPlayer({ soundData: pack })`, `packId: pack.id`, `sprites: new Set(Object.keys(pack.sprite))`, `fallbackPlayer: pack.id === CLASSICY_DEFAULT_SOUND_PACK_ID ? null : (ss.fallbackPlayer ?? createPlatinumPlayer())` where `createPlatinumPlayer()` builds from `getClassicySoundPack("platinum")` (null if unregistered), the previous `soundPlayer` is `unload()`ed, and `classicyLog("warn", "ClassicySoundManager", "Sound pack is missing sprites; falling back to platinum", { id, missing })` is emitted when `classicySoundPackMissingSprites(pack)` is non-empty. New local `playerFor(ss, sound): Howl | null` = `ss.sprites.has(sound) ? ss.soundPlayer : ss.fallbackPlayer`; `playerCanPlayInterrupt`, `playerCanPlay`, `playAlert`, `ClassicySoundPlay`, `ClassicySoundPlayInterrupt` use `playerFor` (stop/play on that player). `initialPlayer`: `soundPlayer: null, packId: null, sprites: new Set(), fallbackPlayer: null` (no module-scope Howl; `defaultSoundData` and `loadSoundTheme` deleted; `loadSoundTheme` re-export in `ClassicySoundManagerContext.tsx:26` removed). Provider: `import "@/Appearance/Platinum/assets/sounds/platinum"` (side effect, until Part B); `const packId = useAppManager((s) => s.System.Manager.Appearance?.activeTheme?.sound?.pack) ?? CLASSICY_DEFAULT_SOUND_PACK_ID`; `const packs = useClassicySoundPacks()`; `useReducer` lazy init becomes `(base) => seedSoundState(base, packId, defaultMuted)` where `export const seedSoundState(base, packId, muted)` (in Utils, testable) returns `ClassicySoundStateEventReducer(muted ? { ...base, disabled: ["*"] } : base, { type: "ClassicySoundLoad", pack: getClassicySoundPack(packId) ?? getClassicySoundPack("platinum") })` when a pack exists, else the base (so the boot chime dispatched by children's effects finds a player, as today); `useEffect(() => { const pack = getClassicySoundPack(packId) ?? getClassicySoundPack(CLASSICY_DEFAULT_SOUND_PACK_ID); if (!pack || pack.id === sound.packId) return; soundDispatch({ type: "ClassicySoundLoad", pack, disabled: useAppManager.getState().System.Manager.Appearance.activeTheme.sound.disabled }); }, [packId, packs, sound.packId])` — keyed on the `pack` string and the registry snapshot, never on the theme object. `ClassicyAppearanceManager.tsx`: delete `loadSoundTheme` (114-133), `applySoundTheme` (135-146), the `loadSoundTheme(result.theme.sound)` call (≈193) and the `applySoundTheme(themeId)` call (≈205) plus the now-unused `ClassicyThemeSound`/`getClassicySoundPack`/`player` imports if nothing else uses them.

- [ ] **Step 1: Write the failing tests** — `ClassicySoundManagerProvider.packs.test.tsx` (howler mocked as in `ClassicySoundManagerProvider.test.tsx:10-17`, but the class records `src` in a hoisted `created: string[][]` and exposes `unload = vi.fn()`; `ClassicyAppManagerUtils` mocked with `useAppManager` as a selector function that also carries a `getState()`; `platinum` module mocked away and packs registered in `beforeEach` with `resetClassicySoundPacks()`):
```ts
it("seeds the player from the persisted theme's pack before children's effects run") // activeTheme.sound.pack "remote" (registered); a child effect dispatches ClassicySoundPlay ClassicyBeep on mount; expect(created[0]).toEqual(["https://cdn.example.com/remote.ogg"]); play called with "ClassicyBeep"
it("falls back to platinum when the persisted pack is unregistered") // pack "ghost" → created[0] is the platinum src; no throw
it("loads a pack registered after mount") // pack "late" unregistered at mount (platinum seeded); act(() => registerClassicySoundPack(late)) → a second Howl with late's src; sound.packId "late"
it("reloads when the theme's pack changes and re-applies the volume") // dispatch ClassicyVolumeSet 40; change mockAppearance pack to "remote" and rerender → new Howl; its volume mock called with 0.4
it("does not recreate the Howl when another theme field changes") // mutate mockAppearance.activeTheme.color and rerender → created.length unchanged
```
`ClassicySoundStateEventReducer.test.ts` additions:
```ts
it("ClassicySoundLoad sets packId, sprites and a platinum fallback player for a non-platinum pack") // load remote → packId "remote", sprites has ClassicyBeep, fallbackPlayer instanceof MockHowl; load platinum → fallbackPlayer null
it("plays a sprite missing from the active pack on the fallback player") // remote has only ClassicyBeep; ClassicySoundPlay ClassicyWindowOpen → fallbackPlayer.play called with it, soundPlayer.play not called
it("plays a sprite the active pack has on the active player")
it("warns once about missing sprites on load") // classicyLog spy: warn, "ClassicySoundManager", message containing "missing sprites"
it("unloads the previous player on reload") // first player's unload called once
```
- [ ] **Step 2: Run them to verify they fail** — Expected: FAIL — `packId`/`fallbackPlayer` undefined; `ClassicySoundLoad` ignores `pack`. — `pnpm exec vitest run src/SystemFolder/ControlPanels/SoundManager`
- [ ] **Step 3: Implement the reducer and state changes in `ClassicySoundManagerUtils.tsx`** — Per the Interfaces block; `createPlatinumPlayer` is a local function guarded by `getClassicySoundPack` so tests without Platinum get `null`.
- [ ] **Step 4: Implement `seedSoundState` and the provider effect; remove the Appearance Manager's sound loading** — Per the Interfaces block. `grep -n "applySoundTheme\|loadSoundTheme" src -r` must print nothing.
- [ ] **Step 5: Run tests to verify they pass** — Expected: PASS, including the existing alert-bridge and volume tests. — `pnpm exec vitest run src/SystemFolder/ControlPanels/SoundManager src/SystemFolder/ControlPanels/AppearanceManager src/SystemFolder/SystemResources/Boot`
- [ ] **Step 6: Manual check in the example app** — Load the app: the boot chime plays once; in the Appearance Manager switch Default → Azul → Default: button clicks still sound, no console warning; in devtools `localStorage.classicyDesktopState` contains `"pack":"platinum"` and no `"name":"platinum"` inside a sound block; set the volume to 40 in the Control Strip, switch theme, clicks stay quieter. Stop the server. — `pnpm preview`
- [ ] **Step 7: Lint, type-check, commit** — git add -A src && git commit -m "feat(sound): boot and switch the sound manager by the theme's pack with Platinum sprite fallback" (with the trailer). — `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`

**Validation:** `pnpm exec vitest run src/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerProvider.packs.test.tsx src/SystemFolder/ControlPanels/SoundManager/ClassicySoundStateEventReducer.test.ts`

## Phase 5: Sprite build script

### 5.1: make_audio_sprites.sh writes id, name and relative src

**Files:**
- Modify: `bin/make_audio_sprites.sh`
- Modify: `assets/sounds/platinum/platinum.json`
- Modify: `src/Appearance/Platinum/assets/sounds/platinum.ts`
- Modify: `src/SystemFolder/ControlPanels/SoundManager/ClassicySoundSchema.ts`
- Test: `src/Appearance/Platinum/assets/sounds/platinum.test.ts`
- Test: `src/SystemFolder/ControlPanels/SoundManager/ClassicySoundPacks.test.ts`

**Depends on:** 2.1

**Interfaces:**
- Consumes: `bin/make_audio_sprites.sh:3-19` (audiosprite `-u` URL prefix at line 18 writes `/assets/sounds/<name>/<name>.<ext>`); node 24 (mise).
- Produces: Script: after each `npx -y audiosprite …` call, a post-processing step `node -e` (inline, with `-I` not applicable to node; the script passes the JSON path as `process.argv[1]`) that reads `<outputDir>/<name>/<name>.json`, sets `id` = directory name, `name` = directory name with the first letter upper-cased, rewrites every `src` entry to `./` + its basename, orders keys `id, name, src, sprite`, and writes it back with tab indentation and a trailing newline; `outputPath` (line 5) and the `-u` argument are dropped. `assets/sounds/platinum/platinum.json` is regenerated by running the step on the existing JSON only (do NOT re-encode audio: run the node step directly against the current file so the sprite offsets stay byte-identical) → `{ "id": "platinum", "name": "Platinum", "src": ["./platinum.ogg","./platinum.m4a","./platinum.mp3","./platinum.ac3"], "sprite": {…unchanged…} }`. `platinum.ts` keeps its four explicit `new URL` imports (Vite needs static literals) and adds a parse-time check `platinumJson.src.map(basename)` equals the four literals' basenames (throwing at module load would crash the desktop, so log `classicyLog("error", "ClassicySoundPacks", …)` instead and continue). `ClassicySoundSchema.ts`: `SoundDataSchema` becomes `z.looseObject({...})` so a pack JSON carrying `id`/`name` still satisfies `SoundData` consumers.

- [ ] **Step 1: Write the failing tests** — `platinum.test.ts` additions:
```ts
it("the committed pack JSON carries id, name and relative src") // expect(platinumJson.id).toBe("platinum"); expect(platinumJson.name).toBe("Platinum"); expect(platinumJson.src).toEqual(["./platinum.ogg","./platinum.m4a","./platinum.mp3","./platinum.ac3"])
```
`ClassicySoundPacks.test.ts` additions:
```ts
it("a pack JSON with relative src parses and a copy with https src validates identically") // parse platinumJson with src mapped to `https://cdn.example.com/sounds/${basename}` → success; parse with the relative src as-is → success; ids equal
```
- [ ] **Step 2: Run them to verify they fail** — Expected: FAIL — `platinumJson.id` undefined; `src` absolute. — `pnpm exec vitest run src/Appearance/Platinum/assets/sounds src/SystemFolder/ControlPanels/SoundManager/ClassicySoundPacks.test.ts`
- [ ] **Step 3: Edit `bin/make_audio_sprites.sh` and regenerate the JSON shape** — Add the node post-processing step; run only that step on `assets/sounds/platinum/platinum.json`; `git diff --stat assets/sounds` shows one file; `bash -n bin/make_audio_sprites.sh` passes; `shellcheck bin/make_audio_sprites.sh` (if installed) reports nothing new.
- [ ] **Step 4: Run tests to verify they pass** — Expected: PASS. — `pnpm exec vitest run src/Appearance/Platinum/assets/sounds src/SystemFolder/ControlPanels/SoundManager`
- [ ] **Step 5: Lint, type-check, commit** — git add bin/make_audio_sprites.sh assets/sounds/platinum/platinum.json src && git commit -m "build(audio): sprite JSON carries id, name and relative src" (with the trailer). — `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`

**Validation:** `python3 -I -c 'import json; d=json.load(open("assets/sounds/platinum/platinum.json")); assert d["id"]=="platinum" and all(s.startswith("./") for s in d["src"]) and len(d["sprite"])==41; print("ok")'`

## Phase 6: Documentation and final verification

### 6.1: Docs, parity, gate

**Files:**
- Modify: `docs/AGENT-REFERENCE.md:913,1052,1188-1230`
- Modify: `CLAUDE.md:59 (State Management SoundManager bullet)`

**Depends on:** 4.1, 5.1

**Interfaces:**
- Consumes: Everything above.
- Produces: `AGENT-REFERENCE.md` line 913 `sound: { pack: string; disabled: string[] }`; line 1052 `| sound.pack | a registered sound pack id (e.g. "platinum") |`; §10 Sound: replace the "Custom sound themes" paragraph (1223-1228) with "Sound packs": `ClassicySoundPack` shape (`{ id, name, packageId?, src: string[], sprite }`, `src` may be relative to the pack JSON, http(s) or data:), `registerClassicySoundPack` / `getClassicySoundPack` / `listClassicySoundPacks` / `useClassicySoundPacks`, `CLASSICY_SOUND_SPRITE_IDS` as the 41-id contract with the rule that missing ids fall back to Platinum (with the warning), boot/switch behavior (persisted `activeTheme.sound.pack`, reload on change, volume kept), `ClassicySoundLoad { pack, disabled }`, and `pnpm build:audio` producing a pack JSON per `assets/sounds/<name>/`. `CLAUDE.md` SoundManager bullet gains one sentence: the Howl is loaded from the registered pack named by `activeTheme.sound.pack` (`ClassicySoundPacks.ts`), reloaded on change, with Platinum as the sprite fallback.

- [ ] **Step 1: Write the docs** — Per the Interfaces block; `grep -rn 'sound\.name\|ClassicySounds\b' docs CLAUDE.md` then prints only the historical audit text in `docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md` (plan 0000-aud).
- [ ] **Step 2: Shoot the parity set after and compare** — Same two ids into `.playwright-mcp/parity/part-D/after/`; `cd .playwright-mcp/parity/part-D && for f in before/*.png; do printf '%s ' "$(compare -metric AE "$f" "after/$(basename "$f")" null: 2>&1)"; echo "$f"; done`. Expected: `0` twice. Stop Storybook. — `pnpm storybook`
- [ ] **Step 3: Full gate** — Expected: all PASS; `grep -c '"pack":"platinum"' dist/classicy.es.js` ≥ 21 (themes.json is bundled) and `grep -c 'ClassicySounds' dist/classicy.es.js` is 0. — `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test && pnpm build:source`
- [ ] **Step 4: Commit** — git add docs/AGENT-REFERENCE.md CLAUDE.md && git commit -m "docs(sound): sound packs, sound.pack and the sprite-id contract" (with the trailer).

**Validation:** `grep -rn 'sound\.name\|ClassicySounds\b' src docs/AGENT-REFERENCE.md docs/BUILDING-APPS.md CLAUDE.md | wc -l  # expect 0`

## Acceptance Criteria

- [ ] `CLASSICY_SOUND_SPRITE_IDS` has 41 entries equal to the Platinum sprite JSON key set, the labels JSON ids, and every `sound: "…"` literal in `src` (1.1 tests).
- [ ] `getClassicySoundPack("platinum")` is defined after importing `src/Appearance/Platinum/assets/sounds/platinum.ts`; `ClassicySounds.ts` no longer exists; `grep -rn ClassicySounds src` is empty.
- [ ] All 21 built-in themes carry `sound.pack: "platinum"`; a theme with `sound.name` fails the schema at path `sound.pack`; persisted state with `sound.name` is migrated copy-on-write and exports as a valid theme file.
- [ ] The provider seeds its Howl from the persisted theme's pack before children's mount effects, loads a pack registered after mount, reloads on `sound.pack` change with the volume re-applied, and does not recreate the Howl on other theme edits (4.1 tests).
- [ ] A sprite missing from the active pack plays from the Platinum player and the load logs one `classicyLog` warning naming the missing ids.
- [ ] `assets/sounds/platinum/platinum.json` has `id`, `name` and `./`-relative `src`; a copy with `https://` `src` validates.
- [ ] Manual example-app check (4.1 Step 6) recorded in the commit body; both parity stories compare with AE 0.
- [ ] `pnpm lint`, `pnpm exec tsc --noEmit -p .`, `pnpm test`, `pnpm build:source` all pass.

## Self-Review

| Requirement | Delivered by |
|---|---|
| §9 Phase 4 item 1: `registerClassicySoundPack` and live registry; `ClassicySounds` becomes the Platinum pack registered by the package | 1.1 Step 3; 2.1 Step 3 |
| Contract exports (`ClassicySoundPack`, `ClassicySoundPackSchema`, `registerClassicySoundPack`, `getClassicySoundPack`, `listClassicySoundPacks`, `subscribeClassicySoundPacks`, `useClassicySoundPacks`, `CLASSICY_SOUND_SPRITE_IDS`) | 1.1 Step 3 |
| Sprite-id parity test (JSON ↔ list ↔ labels ↔ dispatch literals) | 1.1 Step 1 |
| Platinum pack at `src/Appearance/Platinum/assets/sounds/platinum.ts`, registered under "platinum", in `sideEffects` | 2.1 Step 3 |
| Phase 4 item 2: `sound.name` → `sound.pack`; schema refine reads the registry; themes.json; theme file; tests | 3.1 Steps 3-4 |
| Phase 4 item 3 / D7: boot from the persisted pack, reload on change (remote `src` loaded on the fly), missing-sprite fallback, volume re-applied | 4.1 Steps 3-4 |
| Phase 4 item 4: `bin/make_audio_sprites.sh` writes `id`, `name`, relative `src`; https pack validates | 5.1 Steps 1-3 |
| Docs: AGENT-REFERENCE sound section and theme table | 6.1 Step 1 |
| No visual change; sound-manager tests and a manual example-app check | 0, 4.1 Step 6, 6.1 Step 2 |

**Placeholder scan:** No TBDs. Every step carries a file, a signature, a command or an expected value; the only forward reference is the side-effect import of the Platinum pack module that Part B relocates.
**Residual risk:** (1) `seedSoundState` depends on the Zustand store being hydrated synchronously at module load (it is: `getInitialState` runs in `create()`); if a host mounts the provider before registering a non-Platinum pack, the late-registration effect covers it. (2) Howler `unload()` on reload stops any looping move/resize sprite mid-drag if a theme switch happens during a drag — acceptable, documented in the reducer comment. (3) `z.looseObject` on `SoundDataSchema` widens what a hand-dispatched `ClassicySoundLoad` accepts; the pack schema still rejects bad `src`/`sprite`.

## Next Steps

1. Part B moves `registerClassicySoundPack(platinumSoundPack)` into `src/Appearance/Platinum/index.ts` (`sounds: [platinumSoundPack]`) and drops the provider's side-effect import.
2. Part J's Appearance control panel lists `useClassicySoundPacks()` in a Sound pack pop-up and dispatches a theme edit of `sound.pack`.
3. Report to the umbrella plan: the sprite-id contract is 41 ids, not ~140; `SoundDataSchema` must be loose for pack JSON to carry `id`/`name`; `ClassicySoundLoad`'s payload is now `pack` (was `file`).
