---
id: 0047-mst
title: 'I 3.1: Control click sounds: Button, BevelButton, Placard, RadioInput, Tabs, Assistant'
purpose: Move the control click sounds out of component code into src/Appearance/Platinum/hooks.ts, proving through the hook that every sprite still plays.
type: impr
status: complete
priority: "2"
effort: M
created: "2026-10-28T20:18:59.762Z"
updated: "2026-10-30T01:16:23.933Z"
started: "2026-10-30T00:22:15.861Z"
completed: "2026-10-30T01:16:23.933Z"
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
      - src/Appearance/Platinum/hooks.ts
      - src/Appearance/Platinum/index.ts
      - src/SystemFolder/SystemResources/Button/ClassicyButton.tsx
      - src/SystemFolder/SystemResources/BevelButton/ClassicyBevelButton.tsx
      - src/SystemFolder/SystemResources/Placard/ClassicyPlacard.tsx
      - src/SystemFolder/SystemResources/RadioInput/ClassicyRadioInput.tsx
      - src/SystemFolder/SystemResources/Tabs/ClassicyTabs.tsx
      - src/SystemFolder/SystemResources/Assistant/ClassicyAssistant.tsx
      - src/SystemFolder/SystemResources/Assistant/ClassicyAssistant.test.tsx
      - src/SystemFolder/HyperCard/Editor/HyperCardScriptBuilder.textCommit.test.tsx
      - src/Appearance/Platinum/hooks.test.ts
      - src/Appearance/Platinum/hooks.controls.test.tsx
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
  stories:
    - ["0083-v8n", "blocks"]
    - ["0046-ukg", "depends"]
  plans:
    - ["0006-dy6", "included", ["3.1"]]
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
  "6":
    status: pending
---

# I 3.1: Control click sounds: Button, BevelButton, Placard, RadioInput, Tabs, Assistant

## Problem Statement

Audit §9 Phase 7 item 2 (D3, umbrella 0002-ldj): Platinum-specific feedback that lives in component code moves into package hooks. The control click sounds — ClassicyButton.tsx:151, :160, :183-190; ClassicyBevelButton.tsx:333, :484-487, :494; ClassicyPlacard.tsx:133-145; ClassicyRadioInput.tsx:171-205; ClassicyTabs.tsx:140, :146, :219; ClassicyAssistant.tsx:150 — become entries of `platinumAppearanceHooks` in `src/Appearance/Platinum/hooks.ts`, registered as the Platinum package's `hooks`, where `const sound = (sprite: string, interrupt = false): ClassicyAppearanceHandler => () => { playClassicyAppearanceSound(sprite, { interrupt }); }`. The error beep at ClassicyAssistant.tsx:157 stays (behavior, not look).

Two existing tests assert these sprites (ClassicyAssistant.test.tsx, HyperCardScriptBuilder.textCommit.test.tsx) and gain `import "@/Appearance/Platinum";` as their first import; the Button/BevelButton/Placard/RadioInput tests that mock useSoundDispatch to a bare vi.fn never asserted the sprite and pass unchanged.

**Impact:** Until this story the sounds are dispatched twice (component and, once 3.2's hooks table exists, the package); after it, a second package can replace the click feedback by registering its own table.

## Steps

### 1: Write the failing hook-table and behavior-survival tests

hooks.test.ts: `maps every control event to its Platinum sprite` — for each row of [["Button","press","ClassicyButtonClickDown"],["Button","release","ClassicyButtonClickUp"],["BevelButton","open","ClassicyMenuOpen"],["Placard","press","ClassicyButtonClickDown"],["RadioInput","press","ClassicyInputRadioClickDown"],["RadioInput","release","ClassicyInputRadioClickUp"],["Tabs","press","ClassicyTabClickDown"],["Tabs","select","ClassicyTabClickUp"],["Tabs","change","ClassicyTabClickUp"],["Assistant","change","ClassicyTabClickUp"]]: `runWithClassicyAppearanceSoundDispatch(spy, () => platinumAppearanceHooks.on[c][e](ctx))` returns undefined and spy was called with { type: "ClassicySoundPlay", sound }. hooks.controls.test.tsx (imports @/Appearance/Platinum; useSoundDispatch mocked to `soundSpy`; packageId platinum): `a push button still clicks down and up` (render ClassicyButton; mouseDown → soundSpy { ClassicySoundPlay, ClassicyButtonClickDown }; mouseUp → ClickUp; keyDown Enter → ClickDown); `a bevel button opening its menu still plays MenuOpen`; `a radio item still clicks` (mouseDown on item input → ClassicyInputRadioClickDown); `a tab press and select still click` (mouseDown → TabClickDown; click → TabClickUp); `the component source no longer dispatches the sprite` (readFileSync of the six component files contains no `ClassicySoundPlay"` with a feedback sprite — regex /sound: "Classicy(Button|InputRadio|Tab|Menu)/ absent).

### 2: Run them to verify they fail

`pnpm exec vitest run src/Appearance/Platinum/hooks.test.ts src/Appearance/Platinum/hooks.controls.test.tsx` — Expected: FAIL — hooks.ts missing; the source assertion fails.

### 3: Create hooks.ts, register it, remove the component dispatches, add the two test imports

hooks.ts: `export const platinumAppearanceHooks: ClassicyAppearanceHooks = { on: { Button: { press: sound("ClassicyButtonClickDown"), release: sound("ClassicyButtonClickUp") }, BevelButton: { press: sound("ClassicyButtonClickDown"), release: sound("ClassicyButtonClickUp"), open: sound("ClassicyMenuOpen") }, Placard: { press: sound("ClassicyButtonClickDown"), release: sound("ClassicyButtonClickUp") }, RadioInput: { press: sound("ClassicyInputRadioClickDown"), release: sound("ClassicyInputRadioClickUp") }, Tabs: { press: sound("ClassicyTabClickDown"), select: sound("ClassicyTabClickUp"), change: sound("ClassicyTabClickUp") }, Assistant: { change: sound("ClassicyTabClickUp") } } }` (3.2 adds Window, Menu, MenuItem). index.ts passes `hooks: platinumAppearanceHooks`. Remove ClassicyButton.tsx:151, :160, :183-190 (drop `player`/useSoundDispatch when no call remains); ClassicyBevelButton.tsx:333, :484-487, :494; ClassicyPlacard.tsx:133-145; ClassicyRadioInput.tsx:171-205 (four dispatches); ClassicyTabs.tsx:140, :146, :219; ClassicyAssistant.tsx:150 (keep :157). ClassicyAssistant.test.tsx and HyperCardScriptBuilder.textCommit.test.tsx add `import "@/Appearance/Platinum";` first. Then `pnpm generate-barrels`.

### 4: Run the new tests and the full suite

`pnpm exec vitest run src/Appearance/Platinum && pnpm test` — Expected: PASS, including the pre-existing Button/BevelButton/Placard/RadioInput tests that mock useSoundDispatch to a bare vi.fn.

### 5: Verify in the running example

`verify` skill: in the example app with sound unmuted, click a push button, a bevel button and a radio item — the click-down/up sprites play as before, and the browser console shows no `[ClassicyAppearance]` warning from the sound bridge.

### 6: Lint, type-check, commit

`pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`, then `git commit -m "refactor(appearance): control click sounds move into Platinum package hooks"` with the trailer Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>.

## Acceptance Criteria

- [x] VERIFY: pnpm exec vitest run src/Appearance/Platinum/hooks.test.ts src/Appearance/Platinum/hooks.controls.test.tsx
- [x] platinumAppearanceHooks maps Button/BevelButton/Placard/RadioInput/Tabs/Assistant events to their sprites and is registered as the Platinum package's hooks; the six component files dispatch no feedback sprite (regex /sound: "Classicy(Button|InputRadio|Tab|Menu)/ absent) while the error beep stays.
- [x] VERIFY: pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test

## Files

- `src/Appearance/Platinum/hooks.ts` - create: platinumAppearanceHooks sound table
- `src/Appearance/Platinum/index.ts` - hooks registered
- `src/SystemFolder/SystemResources/Button/ClassicyButton.tsx` - click sound dispatches removed
- `src/SystemFolder/SystemResources/BevelButton/ClassicyBevelButton.tsx` - click and MenuOpen dispatches removed
- `src/SystemFolder/SystemResources/Placard/ClassicyPlacard.tsx` - click sound dispatches removed
- `src/SystemFolder/SystemResources/RadioInput/ClassicyRadioInput.tsx` - radio click dispatches removed
- `src/SystemFolder/SystemResources/Tabs/ClassicyTabs.tsx` - tab click dispatches removed
- `src/SystemFolder/SystemResources/Assistant/ClassicyAssistant.tsx` - page-change click dispatch removed; error beep kept
- `src/SystemFolder/SystemResources/Assistant/ClassicyAssistant.test.tsx` - imports @/Appearance/Platinum
- `src/SystemFolder/HyperCard/Editor/HyperCardScriptBuilder.textCommit.test.tsx` - imports @/Appearance/Platinum
- `src/Appearance/Platinum/hooks.test.ts` - create: sprite table tests
- `src/Appearance/Platinum/hooks.controls.test.tsx` - create: behavior-survival tests

## Work Log
### 2026-10-29T20:22:00.352Z - Moved one open [MANUAL] acceptance criterion to the program V&V ticket 0083-v8n (human verification and validation), where it is tracked and ticked. This story now closes on its automated criteria; 0083-v8n links back with `depends`.

### 2026-10-30T00:22:23.333Z - Started on feat/appearance-part-i-v2 (worktree part-i) at post-B base 24896dc30, where I's fallback package is replaced by B's CLASSICY_FALLBACK_APPEARANCE_PACKAGE. The implementer brief is the part-i ledger task-3.1-brief.md.

### 2026-10-30T01:12:10.922Z - Implemented at ba5235cc6 (pushed). Gate: lint, tsc, 4236/4236 tests (651 s, no timeouts), build:source with verify:dist. RED→GREEN 10/10. In the example app every sprite plays as before, with no [ClassicyAppearance] warning. Parity: 56/56 affected stories at AE 0 with identical computed dumps against post-B (port 6023). Out of brief: the ClassicySoundPacks.test.ts sprite scan now also reads hooks.ts, and the hooks module was added to the load-order test. Ruling I-R17 settles the Tabs arrow/Home/End question: those keys keep today's ClickUp-only behavior. The task review is in progress.

### 2026-10-30T01:16:21.233Z - Review APPROVED at ba5235cc6, with no Critical or Important findings. The per-input sound map matches emit by emit against the removed dispatches, there is no double-play, the error beep stays, the hooks table is registered once, and the sound-pack test edit tightens the guard. The controller re-ran the VERIFY tests: the 10 I 3.1 tests pass (the 5 failures in that run are I 3.2's uncommitted RED rows). The full gate was 4236/4236, reported by the implementer and accepted by the review. Minors: the stale doc comments and the cwd-relative readFileSync are folded into I 3.2; the Placard release muted by a mid-hold keydown is carried to the whole-branch review; the Tabs scroll-arrow component test is coverage only.
