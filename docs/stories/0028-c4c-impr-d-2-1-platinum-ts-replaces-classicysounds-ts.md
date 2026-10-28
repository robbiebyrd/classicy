---
id: 0028-c4c
title: 'D 2.1: platinum.ts replaces ClassicySounds.ts'
purpose: Move the Platinum sound pack into the Platinum package tree as a self-registering module and delete the mutable ClassicySounds record.
type: impr
status: pending
priority: "2"
effort: S
created: "2026-10-28T20:05:58.363Z"
updated: "2026-10-28T20:05:58.363Z"
links:
  repo:
    local: ~/classicy
    files:
      - src/Appearance/Platinum/assets/sounds/platinum.ts
      - src/Appearance/Platinum/assets/sounds/platinum.test.ts
      - src/SystemFolder/ControlPanels/AppearanceManager/ClassicySounds.ts
      - package.json
      - src/SystemFolder/ControlPanels/SoundManager/ClassicySoundStateEventReducer.test.ts
      - src/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerUtils.tsx
      - src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeSchema.ts
      - src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.tsx
      - src/index.ts
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
  stories:
    - ["0027-98h", "depends"]
  plans:
    - ["0008-j5l", "included", ["2.1"]]
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

# D 2.1: platinum.ts replaces ClassicySounds.ts

## Problem Statement

Audit §4.3 and D1: `ClassicySounds.platinum` names a look inside Classicy-owned code and is a mutable export with no register call. Umbrella 0002-ldj says `ClassicySounds` is deleted and Platinum's pack lives at `src/Appearance/Platinum/assets/sounds/platinum.ts`, registered by Part D under id "platinum" until Part B moves the call into the package module.

This story creates that module (same four `new URL("@snd/platinum/platinum.<ext>", import.meta.url)` literals, explicit `id`/`name`, `registerClassicySoundPack` at module scope), lists it in `package.json` `sideEffects`, deletes `ClassicySounds.ts`, and patches its three importers just enough to keep the tree compiling until D 3.1 and D 4.1 rewrite them.

**Impact:** D 3.1's schema refine and D 4.1's provider both call `getClassicySoundPack("platinum")`; without a registered Platinum pack every theme fails validation and the sound manager has nothing to boot.

## Steps

### 1: Write the failing tests

`platinum.test.ts`:
```ts
import { platinumSoundPack } from "@/Appearance/Platinum/assets/sounds/platinum";
it("registers itself under id platinum on import") // expect(getClassicySoundPack("platinum")).toBe(platinumSoundPack); name "Platinum"
it("carries every contract sprite and nothing else") // expect(Object.keys(platinumSoundPack.sprite).sort()).toEqual([...CLASSICY_SOUND_SPRITE_IDS].sort()); expect(classicySoundPackMissingSprites(platinumSoundPack)).toEqual([])
it("has four src URLs whose basenames match the JSON") // expect(platinumSoundPack.src.map(u => u.split("/").pop())).toEqual(["platinum.ogg","platinum.m4a","platinum.mp3","platinum.ac3"])
it("keeps the four loop sprites flagged") // for ClassicyWindowMoveIdle, ClassicyWindowMoveMoving, ClassicyWindowResizeIdle, ClassicyWindowResizeResizing: sprite[id][2] === true
```

### 2: Run it to verify it fails

`pnpm exec vitest run src/Appearance/Platinum/assets/sounds` — Expected: FAIL — module not found.

### 3: Create platinum.ts, delete ClassicySounds.ts, patch the three importers and the reducer test mock, add the sideEffects entry

`src/Appearance/Platinum/assets/sounds/platinum.ts`: `const PLATINUM = "platinum"`; the same four `new URL("@snd/platinum/platinum.<ext>", import.meta.url).href` literals from `ClassicySounds.ts:7-10` (the audio stays in `assets/sounds/platinum/`); `export const platinumSoundPack: ClassicySoundPack = ClassicySoundPackSchema.parse({ ...platinumJson, id: PLATINUM, name: "Platinum", src: [platinumOgg, platinumM4a, platinumMp3, platinumAc3] })`; `registerClassicySoundPack(platinumSoundPack)` at module scope with the comment `// Registered here until plan 0002-ldj Part B moves this call into src/Appearance/Platinum/index.ts`. `package.json` `sideEffects` gains `"./src/Appearance/Platinum/assets/sounds/platinum.ts"`. Delete `ClassicySounds.ts`. Keep the tree compiling: `ClassicyThemeSchema.ts:86-90` refine becomes `getClassicySoundPack(name) !== undefined` (field still `name`; renamed in D 3.1); `ClassicySoundManagerUtils.tsx:130` becomes `const defaultSoundData = getClassicySoundPack(CLASSICY_DEFAULT_SOUND_PACK_ID)` with `import "@/Appearance/Platinum/assets/sounds/platinum"` above it; `ClassicyAppearanceManager.tsx:116` becomes `getClassicySoundPack(soundTheme.name)`. The reducer test's `vi.mock("…/ClassicySounds")` (lines 26-32) becomes `vi.mock("@/Appearance/Platinum/assets/sounds/platinum", () => ({}))` plus a `beforeEach` that calls `registerClassicySoundPack({ id: "platinum", name: "Platinum", src: ["test.mp3"], sprite: { click: [0, 100] } })`. `grep -rn ClassicySounds src docs` must then show only `docs/AGENT-REFERENCE.md` (rewritten in D 6.1).

### 4: Run tests to verify they pass

`pnpm exec vitest run src/Appearance/Platinum src/SystemFolder/ControlPanels/SoundManager src/SystemFolder/ControlPanels/AppearanceManager` — Expected: PASS.

### 5: Regenerate barrels, lint, type-check, commit

`pnpm exec barrelsby -c .ts-barrel.json && pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`; then git add -A src package.json && git commit -m "refactor(sound): Platinum sound pack module registers itself; delete ClassicySounds" (with the trailer).

## Acceptance Criteria

- [ ] VERIFY: pnpm exec vitest run src/Appearance/Platinum/assets/sounds/platinum.test.ts && test ! -e src/SystemFolder/ControlPanels/AppearanceManager/ClassicySounds.ts
- [ ] `getClassicySoundPack("platinum")` is `platinumSoundPack` after importing the module; it carries exactly the 41 contract sprites, four `src` URLs and the four loop flags.
- [ ] `package.json` `sideEffects` lists `./src/Appearance/Platinum/assets/sounds/platinum.ts`; `grep -rn ClassicySounds src` is empty.
- [ ] VERIFY: pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test

## Files

- `src/Appearance/Platinum/assets/sounds/platinum.ts` - create the self-registering Platinum pack
- `src/Appearance/Platinum/assets/sounds/platinum.test.ts` - create
- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicySounds.ts` - deleted
- `package.json` - sideEffects entry
- `src/SystemFolder/ControlPanels/SoundManager/ClassicySoundStateEventReducer.test.ts` - :26-32 mock replaced by registering a test pack
- `src/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerUtils.tsx` - :5,130 read the registry
- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeSchema.ts` - :3,86-90 refine consults getClassicySoundPack
- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.tsx` - :22,116 read the registry
- `src/index.ts` - barrel regenerated

## Work Log
