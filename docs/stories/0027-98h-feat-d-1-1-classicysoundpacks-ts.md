---
id: 0027-98h
title: 'D 1.1: ClassicySoundPacks.ts'
purpose: Create the live sound-pack registry and pin the 41 sprite ids every pack must satisfy.
type: feat
status: complete
priority: "2"
effort: M
created: "2026-10-28T20:05:25.358Z"
updated: "2026-10-28T23:47:35.774Z"
started: "2026-10-28T23:34:32.128Z"
completed: "2026-10-28T23:36:19.518Z"
links:
  repo:
    local: ~/classicy
    files:
      - src/SystemFolder/ControlPanels/SoundManager/ClassicySoundPacks.ts
      - src/SystemFolder/ControlPanels/SoundManager/ClassicySoundPacks.test.ts
      - src/index.ts
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
  stories:
    - ["0026-3a7", "depends"]
  plans:
    - ["0008-j5l", "included", ["1.1"]]
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

# D 1.1: ClassicySoundPacks.ts

## Problem Statement

Audit §4.3: `ClassicySounds` (`ClassicySounds.ts:17-19`) is a mutable object with one entry and no register function, and the sprite ids components dispatch are not pinned anywhere a pack author can read. Umbrella 0002-ldj ("Shared Contract — sound packs") pins `ClassicySoundPack`, `ClassicySoundPackSchema`, `registerClassicySoundPack`, `getClassicySoundPack`, `listClassicySoundPacks`, `subscribeClassicySoundPacks`, `useClassicySoundPacks` and `CLASSICY_SOUND_SPRITE_IDS`.

This story creates `src/SystemFolder/ControlPanels/SoundManager/ClassicySoundPacks.ts` following the `ClassicyControlStripRegistry.ts` idiom, with a zod schema that validates on registration, and `CLASSICY_SOUND_SPRITE_IDS` as a 41-id `as const` tuple (the contract's "~140" counted dispatch sites, not ids). Tests pin the id list against the Platinum sprite JSON, the labels JSON, the alert sounds and every `sound: "…"` literal in `src`.

**Impact:** D 2.1 through D 4.1 register into and read from this module; without it the Platinum pack has nowhere to register, the theme schema cannot consult a registry, and no test guards the sprite-id contract.

## Steps

### 1: Write the failing tests

`ClassicySoundPacks.test.ts` (`beforeEach(resetClassicySoundPacks)`):
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

### 2: Run it to verify it fails

`pnpm exec vitest run src/SystemFolder/ControlPanels/SoundManager/ClassicySoundPacks.test.ts` — Expected: FAIL — Cannot find module './ClassicySoundPacks'.

### 3: Implement ClassicySoundPacks.ts per the Interfaces block

`export type ClassicySoundPack = SoundData & { id: string; name: string; packageId?: string }`; `export const ClassicySoundPackSchema: z.ZodType<ClassicySoundPack> = SoundDataSchema.extend({ id: z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/, "must be a kebab-case id"), name: z.string().trim().min(1).max(64), packageId: z.string().max(64).optional(), src: z.array(z.string().min(1)).min(1) })`; `export const CLASSICY_DEFAULT_SOUND_PACK_ID = "platinum"`; `export const CLASSICY_SOUND_SPRITE_IDS = ["ClassicyAlertBonk","ClassicyAlertGrowl","ClassicyAlertIndigo","ClassicyAlertQuack","ClassicyAlertSosumi","ClassicyAlertTabitha","ClassicyAlertWildEep","ClassicyBeep","ClassicyBoot","ClassicyButtonClickDown","ClassicyButtonClickUp","ClassicyClick","ClassicyEmailMailError","ClassicyEmailMailSent","ClassicyEmailNewMail","ClassicyEmailNoMail","ClassicyInputRadioClickDown","ClassicyInputRadioClickUp","ClassicyMenuClose","ClassicyMenuItemClick","ClassicyMenuItemHover","ClassicyMenuOpen","ClassicyTabClick","ClassicyTabClickDown","ClassicyTabClickUp","ClassicyThump","ClassicyWindowClose","ClassicyWindowCollapse","ClassicyWindowControlClickDown","ClassicyWindowControlClickUp","ClassicyWindowExpand","ClassicyWindowFocus","ClassicyWindowMoveIdle","ClassicyWindowMoveMoving","ClassicyWindowMoveStop","ClassicyWindowOpen","ClassicyWindowResizeIdle","ClassicyWindowResizeResizing","ClassicyWindowResizeStop","ClassicyWindowZoomMaximize","ClassicyWindowZoomMinimize"] as const satisfies readonly string[]`; `export type ClassicySoundSpriteId = (typeof CLASSICY_SOUND_SPRITE_IDS)[number]`. `registerClassicySoundPack(pack)`: `safeParse`; on failure `classicyLog("warn", "ClassicySoundPacks", "Rejected sound pack", { id: pack?.id, issues })` and return; on success store `parsed.data` in a `Map<string, ClassicySoundPack>` (re-register replaces, insertion order kept), rebuild the frozen list snapshot, notify listeners. `getClassicySoundPack(id)`, `listClassicySoundPacks()` (registration order), `subscribeClassicySoundPacks(listener)` → unsubscribe, `useClassicySoundPacks()` = `useSyncExternalStore(subscribe, () => snapshot)`, `export const classicySoundPackMissingSprites = (pack: ClassicySoundPack): string[]`, `export const resetClassicySoundPacks = (): void` (tests). Follow the `ClassicyControlStripRegistry.ts` idiom (Map + listeners + frozen snapshot).

### 4: Run tests to verify they pass

`pnpm exec vitest run src/SystemFolder/ControlPanels/SoundManager/ClassicySoundPacks.test.ts` — Expected: PASS (9 tests).

### 5: Regenerate barrels, lint, type-check, commit

`pnpm exec barrelsby -c .ts-barrel.json && pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`; then git add src/SystemFolder/ControlPanels/SoundManager/ClassicySoundPacks.ts src/SystemFolder/ControlPanels/SoundManager/ClassicySoundPacks.test.ts src/index.ts && git commit -m "feat(sound): sound pack registry and the sprite-id contract" (with the trailer).

## Acceptance Criteria

- [x] VERIFY: pnpm exec vitest run src/SystemFolder/ControlPanels/SoundManager/ClassicySoundPacks.test.ts
- [x] `CLASSICY_SOUND_SPRITE_IDS` has 41 entries equal to the Platinum sprite JSON key set, the labels JSON ids, the alert sounds and every `sound: "…"` literal in `src`.
- [x] `registerClassicySoundPack` validates with `ClassicySoundPackSchema`, logs a `classicyLog` warn and skips an invalid pack, replaces on re-register, and notifies `useClassicySoundPacks` subscribers.
- [x] VERIFY: pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test

## Files

- `src/SystemFolder/ControlPanels/SoundManager/ClassicySoundPacks.ts` - create registry, schema, sprite-id contract
- `src/SystemFolder/ControlPanels/SoundManager/ClassicySoundPacks.test.ts` - create
- `src/index.ts` - barrel regenerated

## Work Log

### 2026-10-28T23:35:50.980Z - pnpm lint blocked by pre-existing drift in untouched ClassicyScreenSaverWarp.tsx; fixed at part close-out (criterion 4 set not_applicable; tsc and pnpm test passed)

### 2026-10-28T23:35:51.072Z - Completed: commits e9625ee..ebb87ac, task review clean

### 2026-10-28T23:47:35.774Z - pnpm lint passes repo-wide after 88ff181e6 (criterion 4 changed from not_applicable to done; controller verified lint 0, tsc 0, 3357/3357 tests; merged a1a600a76)
