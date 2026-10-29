---
id: 0006-dy6
title: 'Part I: Package events and display participation'
type: impl
status: in_progress
priority: "2"
effort: L
created: "2026-10-28T19:07:51.618Z"
updated: "2026-10-29T20:41:18.793Z"
tags: []
milestone: ""
due_date: ""
planned_start: ""
planned_end: ""
order: 0
links:
  repo:
    local: ~/classicy
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
  plans:
    - ["0002-ldj", "parent"]
    - ["0005-1b3", "depends"]
    - ["0000-aud", "included"]
progress:
  "0":
    status: pending
  "1":
    status: pending
  "1.1":
    status: complete
  "2":
    status: pending
  "2.1":
    status: complete
  "2.2":
    status: complete
  "2.3":
    status: in_progress
  "3":
    status: pending
  "3.1":
    status: pending
  "3.2":
    status: pending
  "4":
    status: pending
  "4.1":
    status: pending
  "5":
    status: pending
---

# Part I: Package events and display participation

## Summary

**Goal:** Every stateful Classicy component calls one hook, useClassicyAppearance(component, state, ref), that merges the active package's decorations onto its root and emits lifecycle events to the package's handlers; Platinum's feedback (click sounds, window collapse/zoom/move sounds, menu-item flash) moves out of component code into src/Appearance/Platinum/hooks.ts with Platinum pixel-identical.

**Problem:** Audit §3.3/§5 and §8.5: a package cannot participate in a component's state or display (D3, D18) — there is no hook surface; Platinum-specific feedback is hard-wired in components: 39 ClassicySoundPlay dispatches across Button, BevelButton, Placard, RadioInput, Tabs, Assistant, Menu and Window (ClassicyButton.tsx:151-190, ClassicyWindow.tsx:1084-1529, ClassicyMenu.tsx:309-369, …) and the menu-item flash class plus its animationend contract (ClassicyMenu.tsx:259-335, ClassicyMenu.scss:239-262) belong to the Platinum look, not to Classicy.

**Approach:** Implement the contract hook (pure function of state without package hooks; decorate() merged; emit() runs a handler synchronously with a sound-dispatch bridge and applies a returned decoration on the next render until the next decoration), wire it into 24 component roots in three groups, move the feedback into Platinum hooks with tests proving each behavior survives through the hook, and add one Storybook story per component rendering under a probe package that decorates and logs events.

---

# Part 2 — Implementation

**Architecture:** Implements audit §9 Phase 7 (§8.5, D3, D18, D23) under umbrella plan 0002-ldj, contract section 'appearance hook and events' (types already exist in src/Appearance/ClassicyAppearancePackage.ts from part B; the registry, useActiveClassicyAppearancePackage and the Platinum package are part B's). Depends on parts A (CLASSICY_STATE, classicyStateClasses, CLASSICY_COMPONENT in src/Appearance/vocabulary/ClassicyVocabulary.ts, bare state classes already on component roots) and B. For agentic workers: use superpowers:subagent-driven-development or superpowers:executing-plans task-by-task; steps use checkbox syntax.

**Tech Stack:** TypeScript 5.9, React 19 hooks (useState/useRef/useCallback/useEffect), zod (none new), SCSS (the menu flash keyframes move into the Platinum package), vitest 5 + jsdom + @testing-library/react (renderHook, act, fireEvent, userEvent), Storybook 10 (`storybook/actions` for the event log), Playwright + ImageMagick compare.

## Constraints

- Pixel-identical: every existing Storybook story compares AE 0 before vs after; the new AppearanceHooks stories are additions and are not compared.
- Before every commit: pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test; vitest does not type-check, so tsc is mandatory.
- classicyLog, never console.*: the sound bridge warns with subsystem "ClassicyAppearance" when a sound is requested outside a handler.
- Barrels: pnpm generate-barrels after adding src/Appearance/useClassicyAppearance.ts, src/Appearance/ClassicyAppearanceSound.ts and src/Appearance/Platinum/hooks.ts; never hand-edit src/index.ts.
- Contract names verbatim; local names: playClassicyAppearanceSound, runWithClassicyAppearanceSoundDispatch (ClassicyAppearanceSound.ts), platinumAppearanceHooks (hooks.ts), installClassicyAppearanceProbe (test helper), ClassicyAppearanceProbe (Storybook helper). Component names passed to the hook are the PascalCase file names (Button, BevelButton, Checkbox, RadioInput, PopUpMenu, ComboBox, Input, ListBox, Slider, Placard, Tabs, Disclosure, Tree, Table, Link, FileInput, Window, Alert, Menu, MenuItem, DesktopIcon, Icon, ControlStrip, Assistant); any of these missing from CLASSICY_COMPONENT is added to src/Appearance/vocabulary/ClassicyVocabulary.json and regenerated in 1.1 Step 5.
- Error beeps (ClassicySoundPlayError in Window, Alert, Assistant) and the boot sound stay in Classicy: they are behavior (the alert sound preference), not look.
- Commits end with Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>; one commit per section at minimum.
- American English spelling (color, behavior, gray, center, normalize).
- Review focus: (1) a handler returning void must not clear a previous decoration, a handler returning {} must — 1.1 Step 1; (2) sounds must still reach the component's own useSoundDispatch (tests mock it) — 1.1 Step 1 bridge test and 3.1 Step 1; (3) the menu-item action must run exactly once whether animationend (any name), the 400 ms fallback, or both fire — 3.2 Step 1; (4) mount/unmount emit once per mount, not once per render — 1.1 Step 1; (5) wiring must not add DOM attributes when the package returns nothing (parity) — 2.1 Step 5.

## Files

| File | Change | Responsibility |
|---|---|---|
| `src/Appearance/useClassicyAppearance.ts` | create | The contract hook: state classes + decorate() + last emitted decoration; emit() with synchronous handler invocation, mount/unmount emission. |
| `src/Appearance/ClassicyAppearanceSound.ts` | create | Sound bridge: playClassicyAppearanceSound(sound, { interrupt? }) usable from package handlers; runWithClassicyAppearanceSoundDispatch scopes it to the emitting component's useSoundDispatch. |
| `src/Appearance/__tests__/appearanceProbe.tsx` | create | installClassicyAppearanceProbe(): registers a 'probe' package that decorates every component and records every event; activates it in the store. |
| `src/Appearance/Platinum/hooks.ts` | create | platinumAppearanceHooks: the sound and flash feedback table, registered as the Platinum package's hooks. |
| `src/Appearance/Platinum/index.ts` | modify | Passes hooks: platinumAppearanceHooks to registerClassicyAppearancePackage. |
| `src/Appearance/Platinum/styles/components/_Menu.scss` | modify | Receives .classicyMenuItemFlash and classicyMenuItemFlashKeyframes from ClassicyMenu.scss. |
| `src/SystemFolder/SystemResources/{Button,BevelButton,Checkbox,RadioInput,PopUpMenu,ComboBox,Input,ListBox,Slider,Placard,Tabs,Disclosure,Tree,Table,Link,FileInput,Window,Alert,Menu,Desktop,Icon,ControlStrip,Assistant}/*.tsx` | modify | Root calls useClassicyAppearance; emits events; feedback sound dispatches removed (3.1/3.2). |
| `src/SystemFolder/SystemResources/Menu/ClassicyMenu.scss` | modify | Flash class and keyframes removed (moved to Platinum). |
| `src/SystemFolder/SystemResources/Window/ClassicyWindow.titlebar.test.tsx, ClassicyWindow.mouseup.test.tsx, src/SystemFolder/SystemResources/Assistant/ClassicyAssistant.test.tsx, src/SystemFolder/HyperCard/Editor/HyperCardScriptBuilder.textCommit.test.tsx` | modify | Import @/Appearance/Platinum so the sprites they assert still play through the hook. |
| `src/Appearance/Platinum/styles/platinum.css.test.ts` | modify | Scope assertion skips keyframe step selectors. |
| `storybook/.storybook/ClassicyAppearanceProbe.tsx` | create | Story-level probe package (outline decoration, storybook/actions event log) and the <ClassicyAppearanceProbe> wrapper that activates it. |
| `src/SystemFolder/SystemResources/*/Classicy*.stories.tsx (23 files)` | modify | One AppearanceHooks story per wired component. |
| `docs/AGENT-REFERENCE.md, CLAUDE.md` | modify | Hook surface, event table, Platinum hooks, sound bridge. |

## Phase 0: Parity baseline

- [ ] Start Storybook in the background (`pnpm storybook`; note the port).
- [ ] `curl -s http://localhost:<port>/index.json | python3 -I -c 'import json,sys; d=json.load(sys.stdin); print("\n".join(sorted(e["id"] for e in d["entries"].values() if e["type"]=="story")))' > .playwright-mcp/parity/part-i/stories.txt` (the full set).
- [ ] Playwright: each `iframe.html?id=<id>&viewMode=story` at 1024×768, networkidle + 500 ms → `.playwright-mcp/parity/part-i/before/<id>.png`.
- [ ] `ls .playwright-mcp/parity/part-i/before | wc -l` equals the story count. No commit.

**Validation:** `ls .playwright-mcp/parity/part-i/before | wc -l`

## Phase 1: The hook and the sound bridge

### 1.1: useClassicyAppearance, ClassicyAppearanceSound, the test probe

**Files:**
- Create: `src/Appearance/useClassicyAppearance.ts`
- Create: `src/Appearance/ClassicyAppearanceSound.ts`
- Create: `src/Appearance/__tests__/appearanceProbe.tsx`
- Modify: `src/Appearance/vocabulary/ClassicyVocabulary.json`
- Test: `src/Appearance/useClassicyAppearance.test.tsx`
- Test: `src/Appearance/ClassicyAppearanceSound.test.ts`

**Depends on:** 0

**Interfaces:**
- Consumes: useActiveClassicyAppearancePackage, registerClassicyAppearancePackage, resetClassicyAppearancePackagesForTests, ClassicyAppearance* types (part B, src/Appearance/ClassicyAppearancePackage.ts); classicyStateClasses, CLASSICY_COMPONENT, ClassicyComponentName, ClassicyState (part A); useSoundDispatch (ClassicySoundManagerContext.tsx:33 — default context value is a no-op dispatch, ClassicySoundManagerUtils.tsx:153-155); useAppManager; classicyLog.
- Produces: useClassicyAppearance.ts: `export function useClassicyAppearance<E extends HTMLElement = HTMLElement>(component: ClassicyComponentName, state: Partial<Record<ClassicyState, boolean>>, ref?: RefObject<E | null>): { className: string; style?: CSSProperties; attrs: Record<string, string>; emit: (event: ClassicyAppearanceEvent, detail?: unknown) => void }` — the contract signature with the ref parameter generic so a RefObject<HTMLButtonElement | null> is accepted. Semantics: `className` = [classicyStateClasses(state), decorate(component, state)?.className, emitted?.className] joined by one space, empty entries dropped ("" when all empty); `style` = { ...decorate.style, ...emitted.style } or undefined when both absent; `attrs` = { ...decorate.attrs, ...emitted.attrs } (always an object). `emit(event, detail)`: looks up `hooks.on?.[component]?.[event]` on the *current* active package (ref-held so emit identity is stable per component); when absent returns; otherwise calls it synchronously inside runWithClassicyAppearanceSoundDispatch(soundDispatch, …) with `{ component, event, element: ref?.current ?? null, state: <latest state>, detail }`; a returned object (even `{}`) becomes the new emitted decoration via setState (skipped after unmount); `undefined`/void leaves the previous one in place (D23: cleared by the *next decoration*). A package switch (active package id changes) clears the emitted decoration. The hook emits `mount` once after the first commit and `unmount` from that effect's cleanup (deps []), through the same emit so a handler may decorate on mount. Without an active package hook the result is a pure function of `state`: className === classicyStateClasses(state), style undefined, attrs {}. ClassicyAppearanceSound.ts: `export function playClassicyAppearanceSound(sound: string, options?: { interrupt?: boolean }): void` dispatches `{ type: options?.interrupt ? "ClassicySoundPlayInterrupt" : "ClassicySoundPlay", sound }` through the dispatch installed by the enclosing `runWithClassicyAppearanceSoundDispatch<T>(dispatch: Dispatch<ClassicySoundAction>, fn: () => T): T` (a module-level stack; restored in finally); called with no enclosing run it logs `classicyLog("warn", "ClassicyAppearance", "playClassicyAppearanceSound was called outside an appearance handler; ignored.")` and returns. appearanceProbe.tsx: `installClassicyAppearanceProbe(options?: { on?: Partial<Record<ClassicyAppearanceEvent, ClassicyAppearanceHandler>> }): { events: Array<{ component: ClassicyComponentName; event: ClassicyAppearanceEvent; detail: unknown }>; uninstall: () => void }` — registers `{ id: "probe", name: "Probe", css: "", defaults: { ...getTheme("default"), package: "probe" }, layout: <Platinum layout>, hooks: { decorate: (c, s) => ({ className: `probe-${c}`, attrs: { "data-probe-state": classicyStateClasses(s) } }), on: <for every key of CLASSICY_COMPONENT, for every event: a recorder that pushes { component, event, detail } then delegates to options.on?.[event]> } }` and sets `System.Manager.Appearance.packageId` to "probe" through useAppManager.setState; uninstall restores "platinum" and calls resetClassicyAppearancePackagesForTests. ClassicyVocabulary.json: the component list contains every name in the constraints' list (add the missing ones; part A's generator rebuilds CLASSICY_COMPONENT).

- [ ] **Step 1: Write the failing hook tests** — useClassicyAppearance.test.tsx (resetClassicyAppearancePackagesForTests + packageId "platinum" in beforeEach; useSoundDispatch mocked to a vi.fn `soundSpy` via vi.mock of ClassicySoundManagerContext): `is a pure function of state without package hooks` (nothing registered; renderHook(() => useClassicyAppearance("Button", { pressed: true, disabled: false })) → className "pressed", style undefined, attrs deep-equals {}; act(() => result.current.emit("press")) → className still "pressed"); `merges decorate() into className, style and attrs` (probe installed → className "pressed probe-Button", attrs { "data-probe-state": "pressed" }; a probe variant whose decorate returns style { outline: "1px" } → style deep-equals it); `emit calls the handler with the context` (probe with on.press = vi.fn → called once with { component: "Button", event: "press", element: null, state: { pressed: true, disabled: false }, detail: 7 } when emit("press", 7)); `passes the ref element` (ref = { current: document.createElement("button") } → ctx.element toBe it); `applies a returned decoration on the next render and clears it on the next decoration` (press handler returns { className: "flash" } → after act(emit("press")) className "pressed probe-Button flash"; release handler returns {} → after act(emit("release")) className "pressed probe-Button"); `a handler side effect without a return leaves the decoration unchanged` (release handler returns undefined after the press → "flash" still present); `emits mount once and unmount once` (probe events after render: exactly one { event: "mount" }; rerender twice → still one; unmount → one { event: "unmount" }); `clears the emitted decoration when the package changes` (after "flash", setState packageId "platinum" with a platinum stub registered → no "flash"); `the sound bridge dispatches through the component's sound dispatch` (press handler calls playClassicyAppearanceSound("ClassicyButtonClickDown") → soundSpy called with { type: "ClassicySoundPlay", sound: "ClassicyButtonClickDown" }; with { interrupt: true } → type "ClassicySoundPlayInterrupt"). ClassicyAppearanceSound.test.ts: `warns and ignores a sound outside a handler` (log sink spy sees one warn; no throw); `restores the previous dispatch after a nested run` (nested runWithClassicyAppearanceSoundDispatch(a, () => run(b, …)) → after the inner run, play goes to a).
- [ ] **Step 2: Run them to verify they fail** — Expected: FAIL — modules not found. — `pnpm exec vitest run src/Appearance/useClassicyAppearance.test.tsx src/Appearance/ClassicyAppearanceSound.test.ts`
- [ ] **Step 3: Implement ClassicyAppearanceSound.ts and useClassicyAppearance.ts per the Interfaces block** — The bridge is a module-level array used as a stack (`push` before fn, `pop` in finally; `playClassicyAppearanceSound` reads the top). The hook keeps `hooksRef`, `stateRef`, `mountedRef`; `emit` is a useCallback on [component, soundDispatch, ref]; mount/unmount use a separate effect with [] deps that reads `emitRef.current`.
- [ ] **Step 4: Implement the probe helper** — src/Appearance/__tests__/appearanceProbe.tsx per the Interfaces block; its own smoke test lives in the hook test (`merges decorate() …` uses it).
- [ ] **Step 5: Add missing component names to the vocabulary and regenerate** — Expected: CLASSICY_COMPONENT has every name from the constraints' list (grep the generated ClassicyVocabulary.ts); the top barrel exports the two new modules. — `pnpm generate-barrels && pnpm exec tsc --noEmit -p .`
- [ ] **Step 6: Run tests to verify they pass** — Expected: PASS. — `pnpm exec vitest run src/Appearance`
- [ ] **Step 7: Lint, type-check, commit** — git add src/Appearance src/index.ts && git commit -m "feat(appearance): useClassicyAppearance hook and package sound bridge" (with the trailer) — `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`

**Validation:** `pnpm exec vitest run src/Appearance/useClassicyAppearance.test.tsx`

## Phase 2: Wire the hook into every component root

### 2.1: Controls group 1: Button, BevelButton, Checkbox, RadioInput, PopUpMenu, ComboBox, Input, ListBox

**Files:**
- Modify: `src/SystemFolder/SystemResources/Button/ClassicyButton.tsx`
- Modify: `src/SystemFolder/SystemResources/BevelButton/ClassicyBevelButton.tsx`
- Modify: `src/SystemFolder/SystemResources/Checkbox/ClassicyCheckbox.tsx`
- Modify: `src/SystemFolder/SystemResources/RadioInput/ClassicyRadioInput.tsx`
- Modify: `src/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu.tsx`
- Modify: `src/SystemFolder/SystemResources/ComboBox/ClassicyComboBox.tsx`
- Modify: `src/SystemFolder/SystemResources/Input/ClassicyInput.tsx`
- Modify: `src/SystemFolder/SystemResources/ListBox/ClassicyListBox.tsx`
- Test: `src/SystemFolder/SystemResources/Button/ClassicyButton.appearance.test.tsx`
- Test: `src/SystemFolder/SystemResources/BevelButton/ClassicyBevelButton.appearance.test.tsx`
- Test: `src/SystemFolder/SystemResources/Checkbox/ClassicyCheckbox.appearance.test.tsx`
- Test: `src/SystemFolder/SystemResources/RadioInput/ClassicyRadioInput.appearance.test.tsx`
- Test: `src/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu.appearance.test.tsx`
- Test: `src/SystemFolder/SystemResources/ComboBox/ClassicyComboBox.appearance.test.tsx`
- Test: `src/SystemFolder/SystemResources/Input/ClassicyInput.appearance.test.tsx`
- Test: `src/SystemFolder/SystemResources/ListBox/ClassicyListBox.appearance.test.tsx`

**Depends on:** 1.1

**Interfaces:**
- Consumes: useClassicyAppearance, installClassicyAppearanceProbe (1.1); the bare state classes part A placed on each root (the `classicyStateClasses(...)` call on the root is replaced by `appearance.className`, so no state class is emitted twice).
- Produces: Wiring pattern for every component: `const appearance = useClassicyAppearance("<Name>", { …states }, rootRef)`; root gets `className={classNames(<existing classes>, appearance.className)}`, `style={{ ...existingStyle, ...appearance.style }}` only when the root already had a style prop or appearance.style is set, and `{...appearance.attrs}` spread last; events via `appearance.emit`. Per component (root element → states → events): Button (ClassicyButton.tsx:171-199 `<button class=classicyButton>`, an internal `buttonRef` merged with the forwarded ref via a callback ref) → { pressed: depressed || keyActive, disabled, default: isDefault } → press on onMouseDown and the keydown branch at :149, release on onMouseUp and keyup at :158, click in onHandleFunc (:140). BevelButton (:440-470 `<button class=classicyBevelButton>`, buttonRef) → { pressed, checked: onState, mixed, disabled, open: popupOpen } → press/release at :480-495, click in onHandleFunc, open in the popup-open path at :328-335 (detail { trigger }), close when popupOpen turns false. Checkbox (:121-131 `<input class=classicyCheckbox>`; add an inputRef) → { checked: check, mixed, disabled, default: isDefault } → change in handleOnClick (:93-99, detail { checked: !check }). RadioInput (:132-136 `<div class=classicyRadioInputGroup>`; groupRef) → { disabled } → press/release at :165-205 on both the input and the label (detail { itemId }), change when `check` changes (detail { itemId }). PopUpMenu (:486-492 `<div class=classicyPopUpMenu>`, wrapperRef) → { open, disabled } → open/close around setOpen(true)/setOpen(false) at :243/:255, change on selection (detail { value }). ComboBox (:349-353 `<div class=classicyComboBox>`; add rootRef) → { open, disabled } → open/close when its list opens/closes, change on commit (detail { value }). Input (:140-160 `<input class=classicyInput>`, the forwarded ref merged as for Button) → { default: isDefault, disabled } → focus/blur on onFocus/onBlur, change in handleOnChangeFunc (detail { value }). ListBox (:186-189 `<div class=classicyListBox>`; add rootRef) → { disabled } → select on option click (detail { value }), focus/blur on the root.

- [ ] **Step 1: Write the failing component appearance tests** — One `<Name>.appearance.test.tsx` per component, each with `installClassicyAppearanceProbe()` in beforeEach and `uninstall` in afterEach. Assertions (root = the element named above): `carries the probe decoration and state classes` — root.classList contains `probe-<Name>` and the expected bare state class (Button rendered with depressed → "pressed"; BevelButton on → "checked"; Checkbox checked → "checked"; RadioInput disabled → "disabled"; PopUpMenu disabled → "disabled"; ComboBox disabled → "disabled"; Input isDefault → "default"; ListBox disabled → "disabled") and `data-probe-state` equals the joined state classes. `emits its events` — Button: fireEvent.mouseDown/mouseUp/click → events (after "mount") equal [press, release, click]; BevelButton (mode toggle): mouseDown/mouseUp/click → [press, release, click]; Checkbox: click → [{ event: "change", detail: { checked: true } }]; RadioInput (two items): mouseDown/mouseUp on item b's input → [press { itemId: "b" }, release { itemId: "b" }] and click → change { itemId: "b" }; PopUpMenu: click the button → open, pick an option → [change { value }, close]; ComboBox: focus+type → open, Enter → [change, close]; Input: focus, type "a", blur → [focus, change { value: "a" }, blur]; ListBox: click an option → select { value }. `adds nothing when the package returns nothing` — with uninstall() called first (Platinum stub without hooks): root has no `data-probe-state` attribute and no inline style.
- [ ] **Step 2: Run them to verify they fail** — Expected: FAIL — no probe class on the root. — `pnpm exec vitest run src/SystemFolder/SystemResources/{Button,BevelButton,Checkbox,RadioInput,PopUpMenu,ComboBox,Input,ListBox} -t appearance`
- [ ] **Step 3: Wire the eight components per the Interfaces block** — Keep the existing sound dispatches in place for now (3.1 removes them); the hook call sits beside the other hooks at the top of each component so the hook order is unconditional.
- [ ] **Step 4: Run the group's tests and the full suite** — Expected: PASS. — `pnpm exec vitest run src/SystemFolder/SystemResources/{Button,BevelButton,Checkbox,RadioInput,PopUpMenu,ComboBox,Input,ListBox} && pnpm test`
- [ ] **Step 5: Parity for the group's stories** — Re-shoot ids starting with controls-button, controls-bevelbutton, controls-checkbox, controls-radioinput, controls-popupmenu, controls-combobox, controls-input, controls-listbox into `.playwright-mcp/parity/part-i/after/`; `compare -metric AE` → 0 each (the wiring adds no attribute and no style under Platinum).
- [ ] **Step 6: Lint, type-check, commit** — git commit -m "feat(appearance): wire useClassicyAppearance into the push, bevel, check, radio, pop-up, combo, input and list controls" (with the trailer) — `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`

**Validation:** `pnpm exec vitest run src/SystemFolder/SystemResources/{Button,BevelButton,Checkbox,RadioInput,PopUpMenu,ComboBox,Input,ListBox} -t appearance`

### 2.2: Controls group 2: Slider, Placard, Tabs, Disclosure, Tree, Table, Link, FileInput

**Files:**
- Modify: `src/SystemFolder/SystemResources/Slider/ClassicySlider.tsx`
- Modify: `src/SystemFolder/SystemResources/Placard/ClassicyPlacard.tsx`
- Modify: `src/SystemFolder/SystemResources/Tabs/ClassicyTabs.tsx`
- Modify: `src/SystemFolder/SystemResources/Disclosure/ClassicyDisclosure.tsx`
- Modify: `src/SystemFolder/SystemResources/Tree/ClassicyTree.tsx`
- Modify: `src/SystemFolder/SystemResources/Table/ClassicyTable.tsx`
- Modify: `src/SystemFolder/SystemResources/Link/ClassicyLink.tsx`
- Modify: `src/SystemFolder/SystemResources/FileInput/ClassicyFileInput.tsx`
- Test: `src/SystemFolder/SystemResources/Slider/ClassicySlider.appearance.test.tsx`
- Test: `src/SystemFolder/SystemResources/Placard/ClassicyPlacard.appearance.test.tsx`
- Test: `src/SystemFolder/SystemResources/Tabs/ClassicyTabs.appearance.test.tsx`
- Test: `src/SystemFolder/SystemResources/Disclosure/ClassicyDisclosure.appearance.test.tsx`
- Test: `src/SystemFolder/SystemResources/Tree/ClassicyTree.appearance.test.tsx`
- Test: `src/SystemFolder/SystemResources/Table/ClassicyTable.appearance.test.tsx`
- Test: `src/SystemFolder/SystemResources/Link/ClassicyLink.appearance.test.tsx`
- Test: `src/SystemFolder/SystemResources/FileInput/ClassicyFileInput.appearance.test.tsx`

**Depends on:** 2.1

**Interfaces:**
- Consumes: The 2.1 wiring pattern and test shape.
- Produces: Slider (ClassicySlider.tsx:281-293 `<input class=classicySlider>`, inputRef :208) → { disabled, dragging, hover: highlighted } → dragStart when `dragging` becomes true, dragEnd at :249, change in handleChange (detail { value }). Placard (:101-104 commonProps root `.classicyPlacard`; add rootRef on the button/div that carries commonProps) → { pressed, disabled, open } → press/release at :133-145, click in handleClick, open/close around setOpen (detail { menu: hasMenu }). Tabs (:307 `<div class=classicyTabContainer>`; add rootRef) → {} → press in pressTab (:145, detail { tabId }), select in selectTab (:139, detail { tabId }), change in stepScroll (:219, detail { scroll: direction }). Disclosure (:104 `<div class=classicyDisclosure>`; add rootRef) → { expanded: open } → expand/collapse in setOpenState. Tree (:525 `<ul class=classicyTree>`; add rootRef) → {} → select in the onSelectNode path (detail { nodeId }), expand/collapse in toggle (:162, detail { nodeId, open }). Table (:448 `<div class=classicyTableContainer>`; add rootRef) → {} → select on row click (detail { rowId }), change on header sort click (:489-491, detail { columnId, desc }). Link (`<a class=classicyLink>`; add ref) → { disabled } → click. FileInput (root `.classicyFileInput`; add rootRef) → { error: hasError, disabled } → change (detail { fileName }).

- [ ] **Step 1: Write the failing component appearance tests** — Same two/three tests per component as 2.1 with these exact expectations: Slider (disabled) → "disabled"; fireEvent.change to 40 → change { value: 40 }. Placard (interactive) → mouseDown/mouseUp → [press, release]; with menu, click → open. Tabs → mouseDown on tab 2 → press { tabId: 1 }; click → select { tabId: 1 }. Disclosure (open) → "expanded"; click header → collapse; click again → expand. Tree → click a branch row → expand { nodeId, open: true }. Table (sortable column) → click header → change { columnId, desc: false }. Link (disabled) → "disabled"; click (enabled) → click. FileInput → "error" when rendered with an error, change { fileName: "a.txt" } on a file selection.
- [ ] **Step 2: Run them to verify they fail** — Expected: FAIL. — `pnpm exec vitest run src/SystemFolder/SystemResources/{Slider,Placard,Tabs,Disclosure,Tree,Table,Link,FileInput} -t appearance`
- [ ] **Step 3: Wire the eight components per the Interfaces block** — Sound dispatches stay until 3.1.
- [ ] **Step 4: Run the group's tests and the full suite** — Expected: PASS. — `pnpm exec vitest run src/SystemFolder/SystemResources/{Slider,Placard,Tabs,Disclosure,Tree,Table,Link,FileInput} && pnpm test`
- [ ] **Step 5: Parity for the group's stories** — Re-shoot controls-slider*, controls-placard*, controls-tabs*, controls-disclosure*, controls-tree*, controls-table*, controls-link*, controls-fileinput* → AE 0 each.
- [ ] **Step 6: Lint, type-check, commit** — git commit -m "feat(appearance): wire useClassicyAppearance into sliders, placards, tabs, disclosures, trees, tables, links and file inputs" (with the trailer) — `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`

**Validation:** `pnpm exec vitest run src/SystemFolder/SystemResources/{Slider,Placard,Tabs,Disclosure,Tree,Table,Link,FileInput} -t appearance`

### 2.3: Surfaces: Window, Alert, Menu, MenuItem, DesktopIcon, Icon, ControlStrip, Assistant

**Files:**
- Modify: `src/SystemFolder/SystemResources/Window/ClassicyWindow.tsx`
- Modify: `src/SystemFolder/SystemResources/Alert/ClassicyAlert.tsx`
- Modify: `src/SystemFolder/SystemResources/Menu/ClassicyMenu.tsx`
- Modify: `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon.tsx`
- Modify: `src/SystemFolder/SystemResources/Icon/ClassicyIcon.tsx`
- Modify: `src/SystemFolder/SystemResources/ControlStrip/ClassicyControlStrip.tsx`
- Modify: `src/SystemFolder/SystemResources/Assistant/ClassicyAssistant.tsx`
- Test: `src/SystemFolder/SystemResources/Window/ClassicyWindow.appearance.test.tsx`
- Test: `src/SystemFolder/SystemResources/Alert/ClassicyAlert.appearance.test.tsx`
- Test: `src/SystemFolder/SystemResources/Menu/ClassicyMenu.appearance.test.tsx`
- Test: `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon.appearance.test.tsx`
- Test: `src/SystemFolder/SystemResources/Icon/ClassicyIcon.appearance.test.tsx`
- Test: `src/SystemFolder/SystemResources/ControlStrip/ClassicyControlStrip.appearance.test.tsx`
- Test: `src/SystemFolder/SystemResources/Assistant/ClassicyAssistant.appearance.test.tsx`

**Depends on:** 2.2

**Interfaces:**
- Consumes: The 2.1 pattern; the window test harness of ClassicyWindow.titlebar.test.tsx (windowsRecord, mocked store); the menu test setup of ClassicyMenu.test.tsx.
- Produces: Window (ClassicyWindow.tsx:1620-1660 `<div class=classicyWindow>`, windowRef) → { active: modal || isActive(), inactive: !(modal || isActive()), focused: ws.focused, collapsed: ws.collapsed, dragging: ws.moving, error: modal && type === "error" } → focus inside the `!ws.focused` branch of setActive (:1203-1217); collapse/expand in setCollapse (:1278-1298) and once in collapseOrExpandAll (:1245, the clicked window only); zoom in setZoomFlag when playSound is true (:1404-1415, detail { zoomed: toZoom }); close in finishClose (:1529); dragStart where ClassicyWindowMoveIdle plays (:1084); change with detail { kind: "move" } where ClassicyWindowMoveMoving plays (:1108) and { kind: "resize" } in the resize branch; dragEnd where ClassicyWindowMoveStop is interrupted (:984 document mouseup and :1135 stopChangeWindow — once per gesture, guarded by the existing refs). Alert (:264-271 `<div class=classicyAlert>`, contentRef) → { error: type === "error" } → open on mount (via the hook's mount), close in the button path that calls onClose (:165). Menu (:157 `<ul class=<navClass>>`; add listRef) → { open: menuBarActive } → open/close when the menu's open child changes. MenuItem (ClassicyMenuItemComponent :177-183, `<li class=classicyMenuItem>` :371-379, itemRef) → { disabled: menuItem.disabled, open: isOpen, pressed: isFlashing } → press in handleClick's leaf branch (:310-320, where the flash starts), release in finishFlash (:270-285), open in the submenu-open branch (:304-309), focus on onFocus/onMouseOver (:355-365), blur on onBlur/onMouseOut (:366-370). DesktopIcon (ClassicyDesktopIcon.tsx:442-449 `<div class=classicyDesktopIcon>`, iconRef :198) → { selected: active, open, dragging } → select when ClassicyDesktopIconFocus is dispatched (:227/:316), open in launchIcon (:421), dragStart in startDrag when dragging starts (:329), dragEnd in stopChangeIcon (:301). Icon (ClassicyIcon.tsx:274-278 `<div class=classicyIcon>`, iconRef :156) → { selected: active, dragging } → select in toggleFocus (:296), open in doDoubleClick (:306), dragStart/dragEnd as DesktopIcon. ControlStrip (:505-512 `<div class=classicyControlStrip>`, stripRef :269) → { collapsed } → collapse/expand in setCollapsed (:243), dragStart/dragEnd around the tab/collapse-box drags (:334-375). Assistant (root `.classicyAssistant`; add rootRef) → {} → change in changePage (:146-152, detail { page: next }).

- [ ] **Step 1: Write the failing surface appearance tests** — Window (titlebar harness; a window record focused: false): root has probe-Window and "inactive"; click → focus; collapse-box click → collapse; expand → expand; zoom-box click → zoom { zoomed: true }; close-box click → close; title-bar mousedown + 10 px mousemove + mouseup → [dragStart, change { kind: "move" }…, dragEnd] with exactly one dragEnd. Alert: probe-Alert + "error" for type error; mount → open; default button click → close. Menu: `li.classicyMenuItem` has probe-MenuItem; click a leaf → press, then (waitFor) release exactly once; mouseOver/mouseOut → focus, blur; a submenu parent click → open. DesktopIcon: probe-DesktopIcon; mousedown → select; double-click → open. Icon: mousedown → select; double-click → open. ControlStrip: tab click → collapse; again → expand. Assistant: Next click → change { page: 1 }.
- [ ] **Step 2: Run them to verify they fail** — Expected: FAIL. — `pnpm exec vitest run src/SystemFolder/SystemResources/{Window,Alert,Menu,Desktop,Icon,ControlStrip,Assistant} -t appearance`
- [ ] **Step 3: Wire the seven files per the Interfaces block** — In ClassicyMenu.tsx keep `isFlashing` as the pending-action flag and keep adding the `classicyMenuItemFlash` class for now (3.2 moves it); the existing sound dispatches stay until 3.1/3.2.
- [ ] **Step 4: Run the surfaces' tests and the full suite** — Expected: PASS (every pre-existing Window/Menu test unchanged). — `pnpm exec vitest run src/SystemFolder/SystemResources/{Window,Alert,Menu,Desktop,Icon,ControlStrip,Assistant} && pnpm test`
- [ ] **Step 5: Parity for the surfaces' stories** — Re-shoot desktop-window*, desktop-desktop*, desktop-desktopicon*, desktop-menu*, desktop-menubar*, desktop-controlstrip*, dialogs-alert*, dialogs-assistant*, controls-icon* → AE 0 each.
- [ ] **Step 6: Lint, type-check, commit** — git commit -m "feat(appearance): wire useClassicyAppearance into windows, alerts, menus, icons, the control strip and the assistant" (with the trailer) — `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`

**Validation:** `pnpm exec vitest run src/SystemFolder/SystemResources/{Window,Alert,Menu,Desktop,Icon,ControlStrip,Assistant} -t appearance`

## Phase 3: Platinum feedback moves into package hooks

### 3.1: Control click sounds: Button, BevelButton, Placard, RadioInput, Tabs, Assistant

**Files:**
- Create: `src/Appearance/Platinum/hooks.ts`
- Modify: `src/Appearance/Platinum/index.ts`
- Modify: `src/SystemFolder/SystemResources/Button/ClassicyButton.tsx`
- Modify: `src/SystemFolder/SystemResources/BevelButton/ClassicyBevelButton.tsx`
- Modify: `src/SystemFolder/SystemResources/Placard/ClassicyPlacard.tsx`
- Modify: `src/SystemFolder/SystemResources/RadioInput/ClassicyRadioInput.tsx`
- Modify: `src/SystemFolder/SystemResources/Tabs/ClassicyTabs.tsx`
- Modify: `src/SystemFolder/SystemResources/Assistant/ClassicyAssistant.tsx`
- Modify: `src/SystemFolder/SystemResources/Assistant/ClassicyAssistant.test.tsx`
- Modify: `src/SystemFolder/HyperCard/Editor/HyperCardScriptBuilder.textCommit.test.tsx`
- Test: `src/Appearance/Platinum/hooks.test.ts`
- Test: `src/Appearance/Platinum/hooks.controls.test.tsx`

**Depends on:** 2.3

**Interfaces:**
- Consumes: playClassicyAppearanceSound, runWithClassicyAppearanceSoundDispatch (1.1); the wired emits (2.1-2.3); registerClassicyAppearancePackage (part B).
- Produces: hooks.ts: `export const platinumAppearanceHooks: ClassicyAppearanceHooks = { on: { Button: { press: sound("ClassicyButtonClickDown"), release: sound("ClassicyButtonClickUp") }, BevelButton: { press: sound("ClassicyButtonClickDown"), release: sound("ClassicyButtonClickUp"), open: sound("ClassicyMenuOpen") }, Placard: { press: sound("ClassicyButtonClickDown"), release: sound("ClassicyButtonClickUp") }, RadioInput: { press: sound("ClassicyInputRadioClickDown"), release: sound("ClassicyInputRadioClickUp") }, Tabs: { press: sound("ClassicyTabClickDown"), select: sound("ClassicyTabClickUp"), change: sound("ClassicyTabClickUp") }, Assistant: { change: sound("ClassicyTabClickUp") }, …(3.2 adds Window, Menu, MenuItem) } }` where `const sound = (sprite: string, interrupt = false): ClassicyAppearanceHandler => () => { playClassicyAppearanceSound(sprite, { interrupt }); }` (returns void — side effect only). index.ts passes `hooks: platinumAppearanceHooks`. Removed from components: ClassicyButton.tsx:151, :160, :183-190 (the `player` and useSoundDispatch import go when no call remains); ClassicyBevelButton.tsx:333, :484-487, :494; ClassicyPlacard.tsx:133-145; ClassicyRadioInput.tsx:171-205 (four dispatches); ClassicyTabs.tsx:140, :146, :219; ClassicyAssistant.tsx:150 (the error beep at :157 stays). ClassicyAssistant.test.tsx and HyperCardScriptBuilder.textCommit.test.tsx add `import "@/Appearance/Platinum";` as their first import so the sprite still plays.

- [ ] **Step 1: Write the failing hook-table and behavior-survival tests** — hooks.test.ts: `maps every control event to its Platinum sprite` — for each row of [["Button","press","ClassicyButtonClickDown"],["Button","release","ClassicyButtonClickUp"],["BevelButton","open","ClassicyMenuOpen"],["Placard","press","ClassicyButtonClickDown"],["RadioInput","press","ClassicyInputRadioClickDown"],["RadioInput","release","ClassicyInputRadioClickUp"],["Tabs","press","ClassicyTabClickDown"],["Tabs","select","ClassicyTabClickUp"],["Tabs","change","ClassicyTabClickUp"],["Assistant","change","ClassicyTabClickUp"]]: `runWithClassicyAppearanceSoundDispatch(spy, () => platinumAppearanceHooks.on[c][e](ctx))` returns undefined and spy was called with { type: "ClassicySoundPlay", sound }. hooks.controls.test.tsx (imports @/Appearance/Platinum; useSoundDispatch mocked to `soundSpy`; packageId platinum): `a push button still clicks down and up` (render ClassicyButton; mouseDown → soundSpy { ClassicySoundPlay, ClassicyButtonClickDown }; mouseUp → ClickUp; keyDown Enter → ClickDown); `a bevel button opening its menu still plays MenuOpen`; `a radio item still clicks` (mouseDown on item input → ClassicyInputRadioClickDown); `a tab press and select still click` (mouseDown → TabClickDown; click → TabClickUp); `the component source no longer dispatches the sprite` (readFileSync of the six component files contains no `ClassicySoundPlay"` with a feedback sprite — regex /sound: "Classicy(Button|InputRadio|Tab|Menu)/ absent).
- [ ] **Step 2: Run them to verify they fail** — Expected: FAIL — hooks.ts missing; the source assertion fails. — `pnpm exec vitest run src/Appearance/Platinum/hooks.test.ts src/Appearance/Platinum/hooks.controls.test.tsx`
- [ ] **Step 3: Create hooks.ts, register it, remove the component dispatches, add the two test imports** — Per the Interfaces block; then `pnpm generate-barrels`.
- [ ] **Step 4: Run the new tests and the full suite** — Expected: PASS — including the pre-existing Button/BevelButton/Placard/RadioInput tests that mock useSoundDispatch to a bare vi.fn (they never asserted the sprite). — `pnpm exec vitest run src/Appearance/Platinum && pnpm test`
- [ ] **Step 5: Verify in the running example** — `verify` skill: in the example app with sound unmuted, click a push button, a bevel button and a radio item — the click-down/up sprites play as before, and the browser console shows no `[ClassicyAppearance]` warning from the sound bridge.
- [ ] **Step 6: Lint, type-check, commit** — git commit -m "refactor(appearance): control click sounds move into Platinum package hooks" (with the trailer) — `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`

**Validation:** `pnpm exec vitest run src/Appearance/Platinum/hooks.test.ts src/Appearance/Platinum/hooks.controls.test.tsx`

### 3.2: Window feedback and the menu-item flash

**Files:**
- Modify: `src/Appearance/Platinum/hooks.ts`
- Modify: `src/Appearance/Platinum/styles/components/_Menu.scss`
- Modify: `src/Appearance/Platinum/styles/platinum.css.test.ts`
- Modify: `src/SystemFolder/SystemResources/Window/ClassicyWindow.tsx`
- Modify: `src/SystemFolder/SystemResources/Menu/ClassicyMenu.tsx`
- Modify: `src/SystemFolder/SystemResources/Menu/ClassicyMenu.scss`
- Modify: `src/SystemFolder/SystemResources/Window/ClassicyWindow.titlebar.test.tsx`
- Modify: `src/SystemFolder/SystemResources/Window/ClassicyWindow.mouseup.test.tsx`
- Test: `src/Appearance/Platinum/hooks.test.ts`
- Test: `src/Appearance/Platinum/hooks.surfaces.test.tsx`
- Test: `src/SystemFolder/SystemResources/Menu/ClassicyMenu.test.tsx`

**Depends on:** 3.1

**Interfaces:**
- Consumes: The Window and MenuItem emits (2.3); _Menu.scss (part B).
- Produces: hooks.ts additions: `Window: { focus: sound("ClassicyWindowFocus"), collapse: sound("ClassicyWindowCollapse"), expand: sound("ClassicyWindowExpand"), zoom: (ctx) => { playClassicyAppearanceSound((ctx.detail as { zoomed: boolean }).zoomed ? "ClassicyWindowZoomMaximize" : "ClassicyWindowZoomMinimize"); }, close: sound("ClassicyWindowClose"), dragStart: sound("ClassicyWindowMoveIdle"), change: (ctx) => { if ((ctx.detail as { kind: string })?.kind === "move") playClassicyAppearanceSound("ClassicyWindowMoveMoving"); }, dragEnd: sound("ClassicyWindowMoveStop", true) }`, `MenuItem: { press: (ctx) => { playClassicyAppearanceSound("ClassicyMenuItemClick"); return { className: "classicyMenuItemFlash" }; }, release: () => ({}), open: sound("ClassicyMenuOpen"), focus: sound("ClassicyMenuItemHover"), blur: sound("ClassicyMenuItemBlur") }`. ClassicyWindow.tsx: delete the dispatches at :984 (interrupt), :1084, :1108, :1135 (interrupt), :1208, :1245-1248, :1281, :1291, :1410-1414, :1529; keep :1226, :1568, :1576 (error beeps). ClassicyMenu.tsx: delete :309, :314, :358, :363, :366, :369; stop adding `classicyMenuItemFlash` in the className (:378) — the class now arrives through appearance.className from the press decoration and is removed by the release decoration (`{}`); `handleAnimationEnd` (:331-334) calls finishFlash whenever `isFlashing` is true, regardless of `e.animationName` (the keyframes name is Platinum's); the FLASH_ACTION_FALLBACK_MS timer (:239-241) stays. ClassicyMenu.scss:239-262 (`.classicyMenuItemFlash` and `@keyframes classicyMenuItemFlashKeyframes`) move verbatim into the `menu` mixin of _Menu.scss. platinum.css.test.ts `every rule is scoped under the platinum root`: selector lines matching /^\s*(\d+%|from|to)\s*\{/ (keyframe steps) are skipped. ClassicyWindow.titlebar.test.tsx and ClassicyWindow.mouseup.test.tsx add `import "@/Appearance/Platinum";` first (they assert ClassicyWindowMoveIdle / MoveStop).

- [ ] **Step 1: Write the failing tests** — hooks.test.ts additions: `maps window events to sprites` (rows: focus→ClassicyWindowFocus, collapse→ClassicyWindowCollapse, expand→ClassicyWindowExpand, close→ClassicyWindowClose, dragStart→ClassicyWindowMoveIdle; zoom with detail { zoomed: true } → ClassicyWindowZoomMaximize, { zoomed: false } → ClassicyWindowZoomMinimize; change { kind: "move" } → ClassicyWindowMoveMoving and { kind: "resize" } → spy not called; dragEnd → { type: "ClassicySoundPlayInterrupt", sound: "ClassicyWindowMoveStop" }); `a menu item press plays the click and returns the flash decoration` (press → spy ClassicyMenuItemClick, return deep-equals { className: "classicyMenuItemFlash" }); `a menu item release clears the flash` (release returns {}). hooks.surfaces.test.tsx (imports @/Appearance/Platinum; soundSpy; titlebar harness): `collapse still plays its sound through the hook` (collapse-box click → soundSpy ClassicyWindowCollapse); `zoom still plays` (zoom-box click → ZoomMaximize); `the flash class comes from the package and goes away when the action runs` (render ClassicyMenu with a leaf; click → li.classList contains classicyMenuItemFlash; waitFor onClickFunc called once → classList no longer contains it); `animationend of any name finishes the flash exactly once` (click, fireEvent.animationEnd(li, { animationName: "somethingElse" }) → onClickFunc called once; after 600 ms still once); `component sources no longer dispatch the window and menu sprites` (readFileSync of ClassicyWindow.tsx has no /sound: "ClassicyWindow(Focus|Collapse|Expand|Zoom|Close|Move)/; ClassicyMenu.tsx has no /ClassicyMenu(Open|Item)/ in a ClassicySoundPlay dispatch; ClassicyMenu.scss has no `classicyMenuItemFlash`).
- [ ] **Step 2: Run them to verify they fail** — Expected: FAIL. — `pnpm exec vitest run src/Appearance/Platinum`
- [ ] **Step 3: Extend hooks.ts, strip ClassicyWindow.tsx and ClassicyMenu.tsx, move the flash CSS, adjust the two window tests and the css test** — Per the Interfaces block.
- [ ] **Step 4: Run the Platinum, Window and Menu tests, then the full suite** — Expected: PASS — ClassicyMenu.test.tsx `runs a leaf item's action exactly once when animationend also fires` and `…even when animationend never fires` still pass. — `pnpm exec vitest run src/Appearance/Platinum src/SystemFolder/SystemResources/Window src/SystemFolder/SystemResources/Menu && pnpm test`
- [ ] **Step 5: Parity: window and menu stories** — Re-shoot desktop-window*, desktop-menu*, desktop-menubar*, dialogs-alert*, controls-contextualmenu* → AE 0 each (the flash is transient and never in a still).
- [ ] **Step 6: Lint, type-check, commit** — git commit -m "refactor(appearance): window feedback sounds and the menu-item flash move into Platinum hooks" (with the trailer) — `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`

**Validation:** `pnpm exec vitest run src/Appearance/Platinum src/SystemFolder/SystemResources/Menu`

## Phase 4: Storybook: the hook surface per component

### 4.1: Probe package and one AppearanceHooks story per wired component

**Files:**
- Create: `storybook/.storybook/ClassicyAppearanceProbe.tsx`
- Modify: `src/SystemFolder/SystemResources/Button/ClassicyButton.stories.tsx`
- Modify: `src/SystemFolder/SystemResources/BevelButton/ClassicyBevelButton.stories.tsx`
- Modify: `src/SystemFolder/SystemResources/Checkbox/ClassicyCheckbox.stories.tsx`
- Modify: `src/SystemFolder/SystemResources/RadioInput/ClassicyRadioInput.stories.tsx`
- Modify: `src/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu.stories.tsx`
- Modify: `src/SystemFolder/SystemResources/ComboBox/ClassicyComboBox.stories.tsx`
- Modify: `src/SystemFolder/SystemResources/Input/ClassicyInput.stories.tsx`
- Modify: `src/SystemFolder/SystemResources/ListBox/ClassicyListBox.stories.tsx`
- Modify: `src/SystemFolder/SystemResources/Slider/ClassicySlider.stories.tsx`
- Modify: `src/SystemFolder/SystemResources/Placard/ClassicyPlacard.stories.tsx`
- Modify: `src/SystemFolder/SystemResources/Tabs/ClassicyTabs.stories.tsx`
- Modify: `src/SystemFolder/SystemResources/Disclosure/ClassicyDisclosure.stories.tsx`
- Modify: `src/SystemFolder/SystemResources/Tree/ClassicyTree.stories.tsx`
- Modify: `src/SystemFolder/SystemResources/Table/ClassicyTable.stories.tsx`
- Modify: `src/SystemFolder/SystemResources/Link/ClassicyLink.stories.tsx`
- Modify: `src/SystemFolder/SystemResources/FileInput/ClassicyFileInput.stories.tsx`
- Modify: `src/SystemFolder/SystemResources/Window/ClassicyWindow.stories.tsx`
- Modify: `src/SystemFolder/SystemResources/Alert/ClassicyAlert.stories.tsx`
- Modify: `src/SystemFolder/SystemResources/Menu/ClassicyMenu.stories.tsx`
- Modify: `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon.stories.tsx`
- Modify: `src/SystemFolder/SystemResources/Icon/ClassicyIcon.stories.tsx`
- Modify: `src/SystemFolder/SystemResources/ControlStrip/ClassicyControlStrip.stories.tsx`
- Modify: `src/SystemFolder/SystemResources/Assistant/ClassicyAssistant.stories.tsx`
- Modify: `docs/AGENT-REFERENCE.md`
- Modify: `CLAUDE.md`
- Test: `src/Appearance/ClassicyAppearanceProbe.story.test.tsx`

**Depends on:** 3.2

**Interfaces:**
- Consumes: registerClassicyAppearancePackage, useAppManager; `action` from "storybook/actions"; the Storybook frame already writes data-classicy-appearance from the store (part B 2.1).
- Produces: ClassicyAppearanceProbe.tsx: at module scope registers `{ id: "storybook-probe", name: "Storybook Probe", css: PROBE_CSS, defaults: { ...getTheme("default"), package: "storybook-probe" }, presets: [], layout: <Platinum layout>, hooks: { decorate: (c, s) => ({ className: "sbProbe", attrs: { "data-sb-state": classicyStateClasses(s) } }), on: <every CLASSICY_COMPONENT key × every event → (ctx) => { action(`${ctx.component}.${ctx.event}`)(ctx.detail ?? null); if (ctx.event === "press") return { className: "sbProbePressed" }; if (ctx.event === "release") return {}; }> } }` with `PROBE_CSS = '@layer classicy.package { .classicyDesktop[data-classicy-appearance="storybook-probe"] .sbProbe { outline: 1px dashed #ff00ff; outline-offset: 1px; } .classicyDesktop[data-classicy-appearance="storybook-probe"] .sbProbePressed { outline-color: #00aa00; } }'`; exports `ClassicyAppearanceProbe: FC<{ children }>` that sets packageId "storybook-probe" in a useLayoutEffect on mount and restores "platinum" on unmount, rendering children inside a note `<p>` reading `Rendered under the "storybook-probe" package: Platinum CSS is off (structure only — audit §8.2), every root is outlined by decorate(), and every emitted event is logged in the Actions panel.`. Each story file gains `export const AppearanceHooks: Story = { render: (args) => (<ClassicyAppearanceProbe><Component {...args} /></ClassicyAppearanceProbe>), parameters: { docs: { description: { story: "The package hook surface: decorations from decorate() (magenta outline; green while pressed) and the events the component emits (Actions panel)." } } } }` using that file's default-story args (desktop stories wrap their existing StoryApp/window render).

- [ ] **Step 1: Write the failing probe test** — src/Appearance/ClassicyAppearanceProbe.story.test.tsx (the root vitest config has no `@sb` alias, so the test imports the module by relative path `../../storybook/.storybook/ClassicyAppearanceProbe`): `registers the probe package` (getClassicyAppearancePackage("storybook-probe") defined, css starts with "@layer classicy.package"); `activates on mount and restores platinum on unmount` (render <ClassicyAppearanceProbe><span/></ClassicyAppearanceProbe> → store packageId "storybook-probe"; unmount → "platinum"); `decorates and logs` (render a ClassicyButton inside → button has class sbProbe and data-sb-state; mouseDown → class sbProbePressed; mouseUp → gone).
- [ ] **Step 2: Run it to verify it fails** — Expected: FAIL — module not found. (If `storybook/actions` cannot resolve under vitest from the root workspace, mock it with vi.mock("storybook/actions", () => ({ action: () => () => {} })).) — `pnpm exec vitest run src/Appearance/ClassicyAppearanceProbe.story.test.tsx`
- [ ] **Step 3: Create the probe module and add the 23 AppearanceHooks stories** — Per the Interfaces block; story ids become `<title>--appearance-hooks`.
- [ ] **Step 4: Run the probe test and build Storybook** — Expected: PASS and a clean build; open controls-button--appearance-hooks: the button renders unstyled with a magenta outline; pressing it turns the outline green and logs Button.press / Button.release / Button.click in Actions. — `pnpm exec vitest run src/Appearance/ClassicyAppearanceProbe.story.test.tsx && pnpm build:storybook`
- [ ] **Step 5: Document the hook** — docs/AGENT-REFERENCE.md: under the Appearance Packages subsection add `useClassicyAppearance(component, state, ref)` with its return shape, the 16 events, the decoration precedence (state classes → decorate → last emitted), D23 semantics (void keeps, {} clears), `playClassicyAppearanceSound(sound, { interrupt })` for handlers, and the Platinum hooks table (component → event → sprite). CLAUDE.md `### Theming`: one paragraph: components call `useClassicyAppearance` on their root; feedback sounds and the menu flash are Platinum hooks (`src/Appearance/Platinum/hooks.ts`), never component code; error beeps stay in components.
- [ ] **Step 6: Lint, type-check, commit** — git commit -m "docs(appearance): AppearanceHooks stories under a probe package; document the hook" (with the trailer) — `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`

**Validation:** `pnpm build:storybook`

## Phase 5: Final verification

- [ ] `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test` → all PASS; record the count.
- [ ] `grep -rn 'ClassicySoundPlay"' src/SystemFolder/SystemResources --include=*.tsx | grep -v test | grep -vE 'PlayError|ClassicyBoot'` → prints nothing (every feedback sprite now lives in src/Appearance/Platinum/hooks.ts).
- [ ] `pnpm build:source` → PASS; `grep -c classicyMenuItemFlashKeyframes dist/classicy.css` → 0 (the keyframes ship in the Platinum css string, not in base).
- [ ] Re-shoot every id in `.playwright-mcp/parity/part-i/stories.txt` into `after/` and compare: AE 0 for all; the 23 new `--appearance-hooks` ids are not in the list and are checked by eye in 4.1 Step 4.
- [ ] Stop the background Storybook / dev servers.

**Validation:** `for f in .playwright-mcp/parity/part-i/before/*.png; do compare -metric AE "$f" ".playwright-mcp/parity/part-i/after/$(basename $f)" null: 2>&1; echo " $f"; done | grep -v '^0 ' | wc -l  # expect 0`

## Acceptance Criteria

- [ ] useClassicyAppearance matches the 0002-ldj signature; with no package hooks it returns { className: classicyStateClasses(state), style: undefined, attrs: {} } and emit is a no-op; decorate() output is merged; a decoration returned by a handler is applied on the next render and replaced only by the next returned decoration (void keeps it, {} clears it); mount/unmount emit once per mount.
- [ ] 24 component roots (Button, BevelButton, Checkbox, RadioInput, PopUpMenu, ComboBox, Input, ListBox, Slider, Placard, Tabs, Disclosure, Tree, Table, Link, FileInput, Window, Alert, Menu, MenuItem, DesktopIcon, Icon, ControlStrip, Assistant) call the hook, pass the states listed in 2.1-2.3, and emit the listed events; a package returning nothing adds no DOM attribute or style.
- [ ] src/Appearance/Platinum/hooks.ts holds every feedback sprite mapping and the menu-item flash decoration; no component under src/SystemFolder/SystemResources dispatches a feedback sprite (error beeps and the boot sound excepted); the flash CSS lives in the Platinum package and the item action runs exactly once for animationend of any name, the fallback timer, or both.
- [ ] Each wired component has an `AppearanceHooks` story rendering under the storybook-probe package with decorations visible and events logged.
- [ ] Every pre-existing Storybook story compares AE 0 before vs after; pnpm lint, tsc, test and build:source pass.

## Self-Review

| Requirement | Delivered by |
|---|---|
| §9 Phase 7 item 1 / §8.5: one hook in every component root; handlers registered per component and event by the package | 1.1 Steps 1-3; 2.1-2.3 Step 3 |
| Contract: className = state classes + decorate() + last emitted decoration; D23 next-render application and clearing | 1.1 Step 1 (`applies a returned decoration…`, `a handler side effect without a return…`) |
| Task tests: pure function of state; decorate merged; emit context + next-render decoration; side effect without return leaves className unchanged | 1.1 Step 1 |
| §9 Phase 7 item 2: window collapse/zoom feedback, menu-item flash, button press sounds move into Platinum hooks, each with a survival test | 3.1 Steps 1-3; 3.2 Steps 1-3 |
| §9 Phase 7 item 3: a Storybook story per component showing the hook surface | 4.1 Steps 3-4 |
| Audit §8.2 structure-only render is visible | 4.1 (the probe package turns Platinum CSS off) |
| Platinum pixel-identical | Phase 0; 2.1-2.3 Step 5; 3.2 Step 5; Phase 5 |

**Placeholder scan:** No TBDs; every component step names its root, ref, states, events and source lines (as of main 9601617ee — re-verify after parts A and B).
**Residual risk:** Handlers run during React event handlers and effects; a package handler that throws would break the component — the hook does not catch, by design (a package bug should surface). Tests that mock the app-manager store with fixtures lacking packageId fall back to the registered Platinum package, which is the intended path; a test that mocks useAppManager to a non-selector function would make the hook throw and needs a `System.Manager.Appearance.packageId` in its fixture.

## Next Steps

1. Part J's Packages tab lets a user pick a package whose hooks then replace Platinum's at runtime; the probe story is the manual proof until then.
2. Part E can route the flash keyframes' colors through --classicy-art/--color tokens as part of its art extraction.
3. A second package (Windows 3.11) would register its own hooks table against the same event names.
