---
id: 0031-c35
title: 'D 5.1: make_audio_sprites.sh writes id, name and relative src'
purpose: Make the sprite build emit a self-describing pack JSON with relative src so a pack can be hosted anywhere.
type: chor
status: pending
priority: "2"
effort: S
created: "2026-10-28T20:07:53.293Z"
updated: "2026-10-28T20:07:53.293Z"
links:
  repo:
    local: ~/classicy
    files:
      - bin/make_audio_sprites.sh
      - assets/sounds/platinum/platinum.json
      - src/Appearance/Platinum/assets/sounds/platinum.ts
      - src/SystemFolder/ControlPanels/SoundManager/ClassicySoundSchema.ts
      - src/Appearance/Platinum/assets/sounds/platinum.test.ts
      - src/SystemFolder/ControlPanels/SoundManager/ClassicySoundPacks.test.ts
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
  stories:
    - ["0030-2t0", "depends"]
  plans:
    - ["0008-j5l", "included", ["5.1"]]
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

# D 5.1: make_audio_sprites.sh writes id, name and relative src

## Problem Statement

Audit §4.3: `bin/make_audio_sprites.sh:5,18` passes audiosprite a `/assets/sounds/<name>` URL prefix, so the generated JSON carries absolute paths and a pack cannot be hosted elsewhere, and the JSON has no `id`/`name`. Umbrella 0002-ldj: the script writes `src: ["./<name>.ogg", …]` (relative) and `id`/`name` into the pack JSON; D7 says a Sound pack is a JSON file with web URLs to its audio.

This story adds a node post-processing step to the script, regenerates only the shape of `assets/sounds/platinum/platinum.json` (sprite offsets untouched), makes `platinum.ts` check its four `new URL` literals against the JSON basenames, and loosens `SoundDataSchema` to `z.looseObject` so a pack JSON carrying `id`/`name` still satisfies `SoundData` consumers. A test proves a copy with `https://` `src` validates.

**Impact:** Without it `pnpm build:audio` keeps writing absolute paths that break any remotely hosted pack, and the committed JSON would fail the `id`/`name` assertions D 6.1's gate runs.

## Steps

### 1: Write the failing tests

`platinum.test.ts` additions:
```ts
it("the committed pack JSON carries id, name and relative src") // expect(platinumJson.id).toBe("platinum"); expect(platinumJson.name).toBe("Platinum"); expect(platinumJson.src).toEqual(["./platinum.ogg","./platinum.m4a","./platinum.mp3","./platinum.ac3"])
```
`ClassicySoundPacks.test.ts` additions:
```ts
it("a pack JSON with relative src parses and a copy with https src validates identically") // parse platinumJson with src mapped to `https://cdn.example.com/sounds/${basename}` → success; parse with the relative src as-is → success; ids equal
```

### 2: Run them to verify they fail

`pnpm exec vitest run src/Appearance/Platinum/assets/sounds src/SystemFolder/ControlPanels/SoundManager/ClassicySoundPacks.test.ts` — Expected: FAIL — `platinumJson.id` undefined; `src` absolute.

### 3: Edit bin/make_audio_sprites.sh and regenerate the JSON shape

After each `npx -y audiosprite …` call add a `node -e` post-processing step (the script passes the JSON path as `process.argv[1]`) that reads `<outputDir>/<name>/<name>.json`, sets `id` = directory name, `name` = directory name with the first letter upper-cased, rewrites every `src` entry to `./` + its basename, orders keys `id, name, src, sprite`, and writes it back with tab indentation and a trailing newline; drop `outputPath` (line 5) and the `-u` argument (line 18). Run only that step on `assets/sounds/platinum/platinum.json` (do NOT re-encode audio, so the sprite offsets stay byte-identical) → `{ "id": "platinum", "name": "Platinum", "src": ["./platinum.ogg","./platinum.m4a","./platinum.mp3","./platinum.ac3"], "sprite": {…unchanged…} }`. `platinum.ts` keeps its four explicit `new URL` imports and adds a parse-time check that `platinumJson.src.map(basename)` equals the four literals' basenames (log `classicyLog("error", "ClassicySoundPacks", …)` instead of throwing). `ClassicySoundSchema.ts`: `SoundDataSchema` becomes `z.looseObject({...})`. `git diff --stat assets/sounds` shows one file; `bash -n bin/make_audio_sprites.sh` passes; `shellcheck bin/make_audio_sprites.sh` (if installed) reports nothing new.

### 4: Run tests to verify they pass

`pnpm exec vitest run src/Appearance/Platinum/assets/sounds src/SystemFolder/ControlPanels/SoundManager` — Expected: PASS.

### 5: Lint, type-check, commit

`pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`; then git add bin/make_audio_sprites.sh assets/sounds/platinum/platinum.json src && git commit -m "build(audio): sprite JSON carries id, name and relative src" (with the trailer).

## Acceptance Criteria

- [ ] VERIFY: python3 -I -c 'import json; d=json.load(open("assets/sounds/platinum/platinum.json")); assert d["id"]=="platinum" and all(s.startswith("./") for s in d["src"]) and len(d["sprite"])==41; print("ok")'
- [ ] `assets/sounds/platinum/platinum.json` has `id: "platinum"`, `name: "Platinum"`, `./`-relative `src` in the order ogg, m4a, mp3, ac3, and an unchanged sprite map; a copy with `https://` `src` validates against `ClassicySoundPackSchema`.
- [ ] VERIFY: bash -n bin/make_audio_sprites.sh
- [ ] VERIFY: pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test

## Files

- `bin/make_audio_sprites.sh` - node post-processing step; -u and outputPath dropped
- `assets/sounds/platinum/platinum.json` - id, name, relative src
- `src/Appearance/Platinum/assets/sounds/platinum.ts` - basename check against the JSON
- `src/SystemFolder/ControlPanels/SoundManager/ClassicySoundSchema.ts` - SoundDataSchema becomes z.looseObject
- `src/Appearance/Platinum/assets/sounds/platinum.test.ts` - JSON shape test
- `src/SystemFolder/ControlPanels/SoundManager/ClassicySoundPacks.test.ts` - https src test

## Work Log
