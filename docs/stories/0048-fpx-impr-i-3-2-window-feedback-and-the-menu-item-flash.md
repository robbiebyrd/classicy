---
id: 0048-fpx
title: 'I 3.2: Window feedback and the menu-item flash'
purpose: Move the window feedback sounds and the menu-item flash (class, keyframes and click sound) out of component code into Platinum hooks and the Platinum _Menu partial, keeping the item action exactly-once.
type: impr
status: in_progress
priority: "2"
effort: M
created: "2026-10-28T20:19:44.230Z"
updated: "2026-10-30T01:12:19.716Z"
started: "2026-10-30T01:12:18.062Z"
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
      - src/Appearance/Platinum/styles/components/_Menu.scss
      - src/Appearance/Platinum/styles/platinum.css.test.ts
      - src/SystemFolder/SystemResources/Window/ClassicyWindow.tsx
      - src/SystemFolder/SystemResources/Menu/ClassicyMenu.tsx
      - src/SystemFolder/SystemResources/Menu/ClassicyMenu.scss
      - src/SystemFolder/SystemResources/Window/ClassicyWindow.titlebar.test.tsx
      - src/SystemFolder/SystemResources/Window/ClassicyWindow.mouseup.test.tsx
      - src/Appearance/Platinum/hooks.test.ts
      - src/Appearance/Platinum/hooks.surfaces.test.tsx
      - src/SystemFolder/SystemResources/Menu/ClassicyMenu.test.tsx
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
  stories:
    - ["0083-v8n", "blocks"]
    - ["0047-mst", "depends"]
  plans:
    - ["0006-dy6", "included", ["3.2"]]
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

# I 3.2: Window feedback and the menu-item flash

## Problem Statement

Audit §9 Phase 7 item 2 and §8.5 (umbrella 0002-ldj): the window collapse/zoom/focus/close/move sounds (ClassicyWindow.tsx:984, :1084, :1108, :1135, :1208, :1245-1248, :1281, :1291, :1410-1414, :1529) and the menu feedback (ClassicyMenu.tsx:309, :314, :358, :363, :366, :369 plus the `classicyMenuItemFlash` class at :378 and its CSS at ClassicyMenu.scss:239-262) are Platinum look living in component code. They move into `platinumAppearanceHooks` (Window and MenuItem entries) and the Platinum `_Menu.scss` partial; the flash is the first use of D23 — the MenuItem `press` handler plays ClassicyMenuItemClick and returns `{ className: "classicyMenuItemFlash" }`, `release` returns `{}` to clear it.

Classicy keeps the behavior: `isFlashing` stays the pending-action flag, the 400 ms FLASH_ACTION_FALLBACK_MS timer stays, and `handleAnimationEnd` (:331-334) calls finishFlash whenever `isFlashing` is true regardless of `e.animationName` (the keyframes name is now Platinum's). Error beeps (:1226, :1568, :1576) stay. The css scope test skips keyframe step selectors once the keyframes live in the package; ClassicyWindow.titlebar.test.tsx and ClassicyWindow.mouseup.test.tsx import @/Appearance/Platinum because they assert ClassicyWindowMoveIdle / MoveStop.

**Impact:** Without this move Platinum's window and menu feedback stays hard-wired, so a second package cannot replace it; the exactly-once action guarantee for menu items (animationend of any name, fallback timer, or both) is the regression risk this story's tests pin.

## Steps

### 1: Write the failing tests

hooks.test.ts additions: `maps window events to sprites` (rows: focus→ClassicyWindowFocus, collapse→ClassicyWindowCollapse, expand→ClassicyWindowExpand, close→ClassicyWindowClose, dragStart→ClassicyWindowMoveIdle; zoom with detail { zoomed: true } → ClassicyWindowZoomMaximize, { zoomed: false } → ClassicyWindowZoomMinimize; change { kind: "move" } → ClassicyWindowMoveMoving and { kind: "resize" } → spy not called; dragEnd → { type: "ClassicySoundPlayInterrupt", sound: "ClassicyWindowMoveStop" }); `a menu item press plays the click and returns the flash decoration` (press → spy ClassicyMenuItemClick, return deep-equals { className: "classicyMenuItemFlash" }); `a menu item release clears the flash` (release returns {}). hooks.surfaces.test.tsx (imports @/Appearance/Platinum; soundSpy; titlebar harness): `collapse still plays its sound through the hook` (collapse-box click → soundSpy ClassicyWindowCollapse); `zoom still plays` (zoom-box click → ZoomMaximize); `the flash class comes from the package and goes away when the action runs` (render ClassicyMenu with a leaf; click → li.classList contains classicyMenuItemFlash; waitFor onClickFunc called once → classList no longer contains it); `animationend of any name finishes the flash exactly once` (click, fireEvent.animationEnd(li, { animationName: "somethingElse" }) → onClickFunc called once; after 600 ms still once); `component sources no longer dispatch the window and menu sprites` (readFileSync of ClassicyWindow.tsx has no /sound: "ClassicyWindow(Focus|Collapse|Expand|Zoom|Close|Move)/; ClassicyMenu.tsx has no /ClassicyMenu(Open|Item)/ in a ClassicySoundPlay dispatch; ClassicyMenu.scss has no `classicyMenuItemFlash`).

### 2: Run them to verify they fail

`pnpm exec vitest run src/Appearance/Platinum` — Expected: FAIL.

### 3: Extend hooks.ts, strip ClassicyWindow.tsx and ClassicyMenu.tsx, move the flash CSS, adjust the two window tests and the css test

hooks.ts additions: `Window: { focus: sound("ClassicyWindowFocus"), collapse: sound("ClassicyWindowCollapse"), expand: sound("ClassicyWindowExpand"), zoom: (ctx) => { playClassicyAppearanceSound((ctx.detail as { zoomed: boolean }).zoomed ? "ClassicyWindowZoomMaximize" : "ClassicyWindowZoomMinimize"); }, close: sound("ClassicyWindowClose"), dragStart: sound("ClassicyWindowMoveIdle"), change: (ctx) => { if ((ctx.detail as { kind: string })?.kind === "move") playClassicyAppearanceSound("ClassicyWindowMoveMoving"); }, dragEnd: sound("ClassicyWindowMoveStop", true) }`, `MenuItem: { press: (ctx) => { playClassicyAppearanceSound("ClassicyMenuItemClick"); return { className: "classicyMenuItemFlash" }; }, release: () => ({}), open: sound("ClassicyMenuOpen"), focus: sound("ClassicyMenuItemHover"), blur: sound("ClassicyMenuItemBlur") }`. ClassicyWindow.tsx: delete the dispatches at :984 (interrupt), :1084, :1108, :1135 (interrupt), :1208, :1245-1248, :1281, :1291, :1410-1414, :1529; keep :1226, :1568, :1576. ClassicyMenu.tsx: delete :309, :314, :358, :363, :366, :369; stop adding `classicyMenuItemFlash` in the className (:378); `handleAnimationEnd` (:331-334) calls finishFlash whenever `isFlashing` is true regardless of `e.animationName`; the FLASH_ACTION_FALLBACK_MS timer (:239-241) stays. ClassicyMenu.scss:239-262 (`.classicyMenuItemFlash` and `@keyframes classicyMenuItemFlashKeyframes`) move verbatim into the `menu` mixin of _Menu.scss. platinum.css.test.ts `every rule is scoped under the platinum root`: selector lines matching /^\s*(\d+%|from|to)\s*\{/ are skipped. ClassicyWindow.titlebar.test.tsx and ClassicyWindow.mouseup.test.tsx add `import "@/Appearance/Platinum";` first.

### 4: Run the Platinum, Window and Menu tests, then the full suite

`pnpm exec vitest run src/Appearance/Platinum src/SystemFolder/SystemResources/Window src/SystemFolder/SystemResources/Menu && pnpm test` — Expected: PASS — ClassicyMenu.test.tsx `runs a leaf item's action exactly once when animationend also fires` and `…even when animationend never fires` still pass.

### 5: Parity: window and menu stories

Re-shoot desktop-window*, desktop-menu*, desktop-menubar*, dialogs-alert*, controls-contextualmenu* into `.playwright-mcp/parity/part-i/after/` → `compare -metric AE` 0 each (the flash is transient and never in a still).

### 6: Lint, type-check, commit

`pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`, then `git commit -m "refactor(appearance): window feedback sounds and the menu-item flash move into Platinum hooks"` with the trailer Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>.

## Acceptance Criteria

- [ ] VERIFY: pnpm exec vitest run src/Appearance/Platinum src/SystemFolder/SystemResources/Menu
- [ ] platinumAppearanceHooks holds the Window and MenuItem entries (flash decoration on press, {} on release); ClassicyWindow.tsx dispatches no window feedback sprite and ClassicyMenu.tsx no menu sprite or flash class; the flash CSS lives in the Platinum _Menu partial; error beeps remain.
- [ ] A menu item's action runs exactly once for animationend of any name, the 400 ms fallback timer, or both.
- [ ] VERIFY: pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test

## Files

- `src/Appearance/Platinum/hooks.ts` - Window and MenuItem entries
- `src/Appearance/Platinum/styles/components/_Menu.scss` - flash class and keyframes received
- `src/Appearance/Platinum/styles/platinum.css.test.ts` - keyframe steps skipped by the scope assertion
- `src/SystemFolder/SystemResources/Window/ClassicyWindow.tsx` - feedback sound dispatches removed
- `src/SystemFolder/SystemResources/Menu/ClassicyMenu.tsx` - sound dispatches and flash class removed; name-agnostic animationend
- `src/SystemFolder/SystemResources/Menu/ClassicyMenu.scss` - flash CSS removed
- `src/SystemFolder/SystemResources/Window/ClassicyWindow.titlebar.test.tsx` - imports @/Appearance/Platinum
- `src/SystemFolder/SystemResources/Window/ClassicyWindow.mouseup.test.tsx` - imports @/Appearance/Platinum
- `src/Appearance/Platinum/hooks.test.ts` - window and menu-item rows
- `src/Appearance/Platinum/hooks.surfaces.test.tsx` - create: survival and exactly-once tests
- `src/SystemFolder/SystemResources/Menu/ClassicyMenu.test.tsx` - existing exactly-once tests kept passing

## Work Log
### 2026-10-29T20:22:00.352Z - Moved one open [MANUAL] acceptance criterion to the program V&V ticket 0083-v8n (human verification and validation), where it is tracked and ticked. This story now closes on its automated criteria; 0083-v8n links back with `depends`.

### 2026-10-30T01:12:19.716Z - Started on feat/appearance-part-i-v2 at BASE ba5235cc6 (I 3.1), with I 3.1's task review running in parallel. Any review fixes are folded in or land after. The brief is the part-i ledger task-3.2-brief.md, which includes I-R14..I-R17 and the I 2.3 carry-forwards (own-target flash guard test, dead spacer branch). Parity: port 6023 against the post-B baseline.
