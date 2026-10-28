---
id: 0032-ztu
title: 'D 6.1: Docs, parity, gate'
purpose: Document sound packs and sound.pack, re-shoot the two-story parity set, and run the full gate that closes Part D.
type: chor
status: complete
priority: "2"
effort: S
created: "2026-10-28T20:08:17.294Z"
updated: "2026-10-28T23:47:37.106Z"
started: "2026-10-28T23:34:32.594Z"
completed: "2026-10-28T23:39:50.898Z"
links:
  repo:
    local: ~/classicy
    files:
      - docs/AGENT-REFERENCE.md
      - CLAUDE.md
      - .playwright-mcp/parity/part-D/after
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
  stories:
    - ["0031-c35", "depends"]
  plans:
    - ["0008-j5l", "included", ["6.1"]]
progress:
  "1":
    status: complete
  "2":
    status: complete
  "3":
    status: complete
  "4":
    status: complete
---

# D 6.1: Docs, parity, gate

## Problem Statement

Plan 0008-j5l's last section closes Part D: `docs/AGENT-REFERENCE.md` still documents `sound.name` (lines 913, 1052) and the deleted `ClassicySounds` record (§10, 1223-1228), and `CLAUDE.md:59` describes the Sound manager without the pack registry. Umbrella 0002-ldj requires each part to re-shoot its parity set and pass `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test` plus the build.

This story rewrites §10 as "Sound packs" (`ClassicySoundPack` shape, the registry functions, the 41-id `CLASSICY_SOUND_SPRITE_IDS` contract with Platinum fallback, boot/switch behavior, `ClassicySoundLoad { pack, disabled }`, `pnpm build:audio`), updates the theme table rows and the `CLAUDE.md` bullet, compares the two after-shots with ImageMagick, and runs the full gate including `pnpm build:source`. The plan has no separate final-verification phase; that gate lives here.

**Impact:** Without it consumers keep following docs that name a deleted module and field, and an accidental visual or bundle regression from D 2.1 through D 5.1 would ship unchecked.

## Steps

### 1: Write the docs

`docs/AGENT-REFERENCE.md` line 913 `sound: { pack: string; disabled: string[] }`; line 1052 `| sound.pack | a registered sound pack id (e.g. "platinum") |`; §10 Sound: replace the "Custom sound themes" paragraph (1223-1228) with "Sound packs": `ClassicySoundPack` shape (`{ id, name, packageId?, src: string[], sprite }`, `src` may be relative to the pack JSON, http(s) or data:), `registerClassicySoundPack` / `getClassicySoundPack` / `listClassicySoundPacks` / `useClassicySoundPacks`, `CLASSICY_SOUND_SPRITE_IDS` as the 41-id contract with the rule that missing ids fall back to Platinum (with the warning), boot/switch behavior (persisted `activeTheme.sound.pack`, reload on change, volume kept), `ClassicySoundLoad { pack, disabled }`, and `pnpm build:audio` producing a pack JSON per `assets/sounds/<name>/`. `CLAUDE.md:59` SoundManager bullet gains one sentence: the Howl is loaded from the registered pack named by `activeTheme.sound.pack` (`ClassicySoundPacks.ts`), reloaded on change, with Platinum as the sprite fallback. Then `grep -rn 'sound\.name\|ClassicySounds\b' docs CLAUDE.md` prints only the historical audit text in `docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md` (plan 0000-aud).

### 2: Shoot the parity set after and compare

`pnpm storybook`; same two ids into `.playwright-mcp/parity/part-D/after/`; `cd .playwright-mcp/parity/part-D && for f in before/*.png; do printf '%s ' "$(compare -metric AE "$f" "after/$(basename "$f")" null: 2>&1)"; echo "$f"; done`. Expected: `0` twice. Stop Storybook.

### 3: Full gate

`pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test && pnpm build:source` — Expected: all PASS; `grep -c '"pack":"platinum"' dist/classicy.es.js` ≥ 21 (themes.json is bundled) and `grep -c 'ClassicySounds' dist/classicy.es.js` is 0.

### 4: Commit

git add docs/AGENT-REFERENCE.md CLAUDE.md && git commit -m "docs(sound): sound packs, sound.pack and the sprite-id contract" (with the trailer).

## Acceptance Criteria

- [~] VERIFY: grep -rn 'sound\.name\|ClassicySounds\b' src docs/AGENT-REFERENCE.md docs/BUILDING-APPS.md CLAUDE.md | wc -l  # expect 0
- [x] [MANUAL] `compare -metric AE` prints 0 for both `desktop-desktop--default` and `dialogs-alert--note` before vs after.
- [x] `docs/AGENT-REFERENCE.md` §10 documents sound packs, the 41-id contract with Platinum fallback and `ClassicySoundLoad { pack, disabled }`; rows 913 and 1052 say `sound.pack`; `CLAUDE.md` names `ClassicySoundPacks.ts`.
- [x] VERIFY: pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test && pnpm build:source

## Files

- `docs/AGENT-REFERENCE.md` - :913,1052,1188-1230 sound packs
- `CLAUDE.md` - :59 SoundManager bullet
- `.playwright-mcp/parity/part-D/after` - after screenshots (gitignored)

## Work Log

### 2026-10-28T23:35:52.062Z - pnpm lint blocked by pre-existing drift in untouched ClassicyScreenSaverWarp.tsx; fixed at part close-out (criterion 4 set not_applicable; tsc, pnpm test and build:source passed, dist has 21 "pack":"platinum" and no ClassicySounds)

### 2026-10-28T23:35:52.142Z - Implemented in commits 8b624d2..1b9a079, task review clean. Parity: raw AE 313/251 was the live menu-bar clock only (48x10 px); with that region masked AE is 0/0 (ruled equivalent). Criterion 1 left open: the sound.name/ClassicySounds grep is 0 over docs and CLAUDE.md but prints 8 in src (refusal test, migration code and migration test, all intentional). The criterion text needs a docs-only grep or an explicit waiver.

### 2026-10-28T23:39:50.233Z - Literal grep over-broad (9 hits: negative assertions and fixtures in *.test.ts(x), plus the mandated migration in ClassicyStateMigrations.ts); narrowed grep excluding *.test.ts(x) and ClassicyStateMigrations.ts = 0 (docs/AGENT-REFERENCE.md, docs/BUILDING-APPS.md and CLAUDE.md have 0 hits); intent met (controller ruling)

### 2026-10-28T23:47:37.027Z - pnpm lint passes repo-wide after 88ff181e6 (criterion 4 changed from not_applicable to done; controller verified lint 0, tsc 0, 3357/3357 tests)

### 2026-10-28T23:47:37.106Z - Whole-branch review fix wave 2bddbed76..88ff181e6 (loop stop across players; docs); merged a1a600a76
