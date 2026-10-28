---
id: 0030-2t0
title: 'D 4.1: Provider and reducer'
purpose: Boot the Sound manager from the persisted theme's pack, reload on pack change with the volume kept, and play sprites missing from the active pack on a Platinum fallback player.
type: feat
status: complete
priority: "2"
effort: L
created: "2026-10-28T20:07:25.344Z"
updated: "2026-10-28T23:47:36.556Z"
started: "2026-10-28T23:34:32.411Z"
completed: "2026-10-28T23:36:34.626Z"
links:
  repo:
    local: ~/classicy
    files:
      - src/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerUtils.tsx
      - src/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerProvider.tsx
      - src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.tsx
      - src/SystemFolder/ControlPanels/SoundManager/ClassicySoundStateEventReducer.test.ts
      - src/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerProvider.packs.test.tsx
      - src/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext.tsx
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
  stories:
    - ["0029-4z8", "depends"]
  plans:
    - ["0008-j5l", "included", ["4.1"]]
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
  "7":
    status: complete
---

# D 4.1: Provider and reducer

## Problem Statement

Audit §4.3: the theme's sound is applied only on `switchTheme`/import (`ClassicyAppearanceManager.tsx:114-207`) while `ClassicySoundManagerUtils.tsx:130-145` boots `ClassicySounds.platinum` unconditionally, ignoring the persisted theme. Umbrella 0002-ldj and D7: `ClassicySoundManagerProvider` boots from `activeTheme.sound.pack`, reloads the Howl when it changes (loading remote `src` on the fly), and a sprite id missing from the active pack falls back to the `platinum` pack.

This story extends `ClassicySoundState` with `packId`, `sprites` and `fallbackPlayer`, makes `ClassicySoundLoad { pack, disabled? }` the single reload path (previous player unloaded, missing sprites logged once), routes every play through `playerFor(ss, sound)`, seeds the provider's reducer synchronously from the persisted pack (so children's boot-chime effects find a player), adds an effect keyed on the `pack` string and the registry snapshot (never the theme object), and removes the Appearance Manager's own sound loading. The existing volume effect keeps re-applying the gain to every new player.

**Impact:** This is the behavior change the whole part exists for; without it a persisted non-Platinum pack is ignored at boot, late-registered packs never load, and a pack missing sprites would silently drop sounds.

## Steps

### 1: Write the failing tests

`ClassicySoundManagerProvider.packs.test.tsx` (howler mocked as in `ClassicySoundManagerProvider.test.tsx:10-17`, but the class records `src` in a hoisted `created: string[][]` and exposes `unload = vi.fn()`; `ClassicyAppManagerUtils` mocked with `useAppManager` as a selector function that also carries a `getState()`; `platinum` module mocked away and packs registered in `beforeEach` with `resetClassicySoundPacks()`):
```ts
it("seeds the player from the persisted theme's pack before children's effects run") // activeTheme.sound.pack "remote" (registered); a child effect dispatches ClassicySoundPlay ClassicyBeep on mount; expect(created[0]).toEqual(["https://cdn.example.com/remote.ogg"]); play called with "ClassicyBeep"
it("falls back to platinum when the persisted pack is unregistered") // pack "ghost" → created[0] is the platinum src; no throw
it("loads a pack registered after mount") // pack "late" unregistered at mount (platinum seeded); act(() => registerClassicySoundPack(late)) → a second Howl with late's src; sound.packId "late"
it("reloads when the theme's pack changes and re-applies the volume") // dispatch ClassicyVolumeSet 40; change mockAppearance pack to "remote" and rerender → new Howl; its volume mock called with 0.4
it("does not recreate the Howl when another theme field changes") // mutate mockAppearance.activeTheme.color and rerender → created.length unchanged
```
`ClassicySoundStateEventReducer.test.ts` additions (lines 193-230 area):
```ts
it("ClassicySoundLoad sets packId, sprites and a platinum fallback player for a non-platinum pack") // load remote → packId "remote", sprites has ClassicyBeep, fallbackPlayer instanceof MockHowl; load platinum → fallbackPlayer null
it("plays a sprite missing from the active pack on the fallback player") // remote has only ClassicyBeep; ClassicySoundPlay ClassicyWindowOpen → fallbackPlayer.play called with it, soundPlayer.play not called
it("plays a sprite the active pack has on the active player")
it("warns once about missing sprites on load") // classicyLog spy: warn, "ClassicySoundManager", message containing "missing sprites"
it("unloads the previous player on reload") // first player's unload called once
```

### 2: Run them to verify they fail

`pnpm exec vitest run src/SystemFolder/ControlPanels/SoundManager` — Expected: FAIL — `packId`/`fallbackPlayer` undefined; `ClassicySoundLoad` ignores `pack`.

### 3: Implement the reducer and state changes in ClassicySoundManagerUtils.tsx

`ClassicySoundState` gains `packId: string | null`, `sprites: ReadonlySet<string>`, `fallbackPlayer: Howl | null` (the Platinum player when `packId !== "platinum"`, else `null`). `ClassicySoundAction.file` is replaced by `pack?: ClassicySoundPack`. `ClassicySoundLoad { pack, disabled? }` → `soundPlayer: createSoundPlayer({ soundData: pack })`, `packId: pack.id`, `sprites: new Set(Object.keys(pack.sprite))`, `fallbackPlayer: pack.id === CLASSICY_DEFAULT_SOUND_PACK_ID ? null : (ss.fallbackPlayer ?? createPlatinumPlayer())` where local `createPlatinumPlayer()` builds from `getClassicySoundPack("platinum")` (null if unregistered, so tests without Platinum get `null`); the previous `soundPlayer` is `unload()`ed; `classicyLog("warn", "ClassicySoundManager", "Sound pack is missing sprites; falling back to platinum", { id, missing })` when `classicySoundPackMissingSprites(pack)` is non-empty. Local `playerFor(ss, sound): Howl | null` = `ss.sprites.has(sound) ? ss.soundPlayer : ss.fallbackPlayer`; `playerCanPlayInterrupt`, `playerCanPlay`, `playAlert`, `ClassicySoundPlay`, `ClassicySoundPlayInterrupt` use it. `initialPlayer`: `soundPlayer: null, packId: null, sprites: new Set(), fallbackPlayer: null` (no module-scope Howl; `defaultSoundData` and `loadSoundTheme` deleted; the `loadSoundTheme` re-export in `ClassicySoundManagerContext.tsx:26` removed). Lines touched: 34-47, 65-75, 130-149, 157-162, 176-189, 245-256.

### 4: Implement seedSoundState and the provider effect; remove the Appearance Manager's sound loading

Provider (`ClassicySoundManagerProvider.tsx:19-37`): `import "@/Appearance/Platinum/assets/sounds/platinum"` (side effect, until Part B); `const packId = useAppManager((s) => s.System.Manager.Appearance?.activeTheme?.sound?.pack) ?? CLASSICY_DEFAULT_SOUND_PACK_ID`; `const packs = useClassicySoundPacks()`; `useReducer` lazy init `(base) => seedSoundState(base, packId, defaultMuted)` where `export const seedSoundState(base, packId, muted)` (in Utils) returns `ClassicySoundStateEventReducer(muted ? { ...base, disabled: ["*"] } : base, { type: "ClassicySoundLoad", pack: getClassicySoundPack(packId) ?? getClassicySoundPack("platinum") })` when a pack exists, else the base; `useEffect(() => { const pack = getClassicySoundPack(packId) ?? getClassicySoundPack(CLASSICY_DEFAULT_SOUND_PACK_ID); if (!pack || pack.id === sound.packId) return; soundDispatch({ type: "ClassicySoundLoad", pack, disabled: useAppManager.getState().System.Manager.Appearance.activeTheme.sound.disabled }); }, [packId, packs, sound.packId])` — keyed on the `pack` string and the registry snapshot, never on the theme object. `ClassicyAppearanceManager.tsx`: delete `loadSoundTheme` (114-133), `applySoundTheme` (135-146), the `loadSoundTheme(result.theme.sound)` call (≈193) and the `applySoundTheme(themeId)` call (≈205) plus the now-unused `ClassicyThemeSound`/`getClassicySoundPack`/`player` imports (:22,34). `grep -n "applySoundTheme\|loadSoundTheme" src -r` must print nothing.

### 5: Run tests to verify they pass

`pnpm exec vitest run src/SystemFolder/ControlPanels/SoundManager src/SystemFolder/ControlPanels/AppearanceManager src/SystemFolder/SystemResources/Boot` — Expected: PASS, including the existing alert-bridge and volume tests.

### 6: Manual check in the example app

`pnpm preview`; load the app: the boot chime plays once; in the Appearance Manager switch Default → Azul → Default: button clicks still sound, no console warning; in devtools `localStorage.classicyDesktopState` contains `"pack":"platinum"` and no `"name":"platinum"` inside a sound block; set the volume to 40 in the Control Strip, switch theme, clicks stay quieter. Stop the server.

### 7: Lint, type-check, commit

`pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`; then git add -A src && git commit -m "feat(sound): boot and switch the sound manager by the theme's pack with Platinum sprite fallback" (with the trailer).

## Acceptance Criteria

- [x] VERIFY: pnpm exec vitest run src/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerProvider.packs.test.tsx src/SystemFolder/ControlPanels/SoundManager/ClassicySoundStateEventReducer.test.ts
- [x] The provider seeds its Howl from the persisted theme's pack before children's mount effects, loads a pack registered after mount, reloads on `sound.pack` change with the volume re-applied, and does not recreate the Howl on other theme edits.
- [x] A sprite missing from the active pack plays on the Platinum fallback player; `ClassicySoundLoad` logs one `classicyLog` warning naming the missing ids and unloads the previous player; `grep -rn "applySoundTheme\|loadSoundTheme" src` is empty.
- [~] [MANUAL] In the example app the boot chime plays once, Default → Azul → Default keeps button clicks sounding with no console warning, persisted state carries `"pack":"platinum"`, and a volume of 40 survives a theme switch.
- [x] VERIFY: pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test

## Files

- `src/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerUtils.tsx` - packId/sprites/fallbackPlayer, ClassicySoundLoad { pack }, playerFor, seedSoundState
- `src/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerProvider.tsx` - :19-37 seed from persisted pack; reload effect
- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.tsx` - :22,34,114-146,193-207 sound loading removed
- `src/SystemFolder/ControlPanels/SoundManager/ClassicySoundStateEventReducer.test.ts` - :193-230 pack and fallback cases
- `src/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerProvider.packs.test.tsx` - create
- `src/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext.tsx` - :26 loadSoundTheme re-export removed

## Work Log

### 2026-10-28T23:35:51.540Z - Manual example-app check (boot chime, button clicks across Default-Azul-Default, volume 40 surviving a theme switch) could not be run audibly in the headless environment (criterion 4 set not_applicable). D 6.1 verified headlessly that localStorage carries sound.pack platinum, a legacy sound.name state heals on reload, platinum.json/ogg are fetched, and the console shows no sound errors.

### 2026-10-28T23:35:51.664Z - pnpm lint blocked by pre-existing drift in untouched ClassicyScreenSaverWarp.tsx; fixed at part close-out (criterion 5 set not_applicable; tsc and pnpm test passed)

### 2026-10-28T23:35:51.774Z - Completed: commits 17fecf9..acc6de1, task review clean

### 2026-10-28T23:47:36.438Z - pnpm lint passes repo-wide after 88ff181e6 (criterion 5 changed from not_applicable to done; controller verified lint 0, tsc 0, 3357/3357 tests)

### 2026-10-28T23:47:36.556Z - Whole-branch review fix wave 2bddbed76..88ff181e6 (loop stop across players; docs); merged a1a600a76
