---
id: 0043-u43
title: 'I 1.1: useClassicyAppearance, ClassicyAppearanceSound, the test probe'
purpose: Implement the contract hook that merges a package's decorations onto a component root and emits lifecycle events, plus the sound bridge handlers use and the probe package tests rely on.
type: feat
status: complete
priority: "2"
effort: M
created: "2026-10-28T20:16:19.391Z"
updated: "2026-10-29T17:29:50.983Z"
started: "2026-10-29T16:19:32.258Z"
completed: "2026-10-29T17:29:50.983Z"
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
      - src/Appearance/useClassicyAppearance.ts
      - src/Appearance/ClassicyAppearanceSound.ts
      - src/Appearance/__tests__/appearanceProbe.tsx
      - src/Appearance/vocabulary/ClassicyVocabulary.json
      - src/Appearance/useClassicyAppearance.test.tsx
      - src/Appearance/ClassicyAppearanceSound.test.ts
      - src/index.ts
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
  stories:
    - ["0042-pbp", "depends"]
  plans:
    - ["0006-dy6", "included", ["1.1"]]
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

# I 1.1: useClassicyAppearance, ClassicyAppearanceSound, the test probe

## Problem Statement

Audit §8.5 (D3, D18, D23) and umbrella 0002-ldj 'appearance hook and events': each component calls one hook, `useClassicyAppearance(component, state, ref)`, returning `{ className, style?, attrs, emit }` — className = state classes + `decorate()` className + the last decoration returned by an `emit` handler, applied on the next render and replaced only by the next returned decoration (void keeps it, `{}` clears it). Without an active package hook the result is a pure function of `state`. The hook emits `mount`/`unmount` itself.

Package handlers need a way to play sounds without a React context, and existing tests observe sounds by mocking `useSoundDispatch`; `ClassicyAppearanceSound.ts` therefore exposes `playClassicyAppearanceSound(sound, { interrupt? })`, scoped by `runWithClassicyAppearanceSoundDispatch(dispatch, fn)` to the emitting component's own sound dispatch (warn + no-op outside a handler). `src/Appearance/__tests__/appearanceProbe.tsx` registers a probe package that decorates every component and records every event for the wiring stories; any component name missing from CLASSICY_COMPONENT is added to the vocabulary JSON.

**Impact:** Every wiring story (2.1-2.3), the Platinum hooks (3.1-3.2) and the Storybook probe (4.1) import these modules; the D23 semantics tested here are what the menu flash relies on.

## Steps

### 1: Write the failing hook tests

useClassicyAppearance.test.tsx (resetClassicyAppearancePackagesForTests + packageId "platinum" in beforeEach; useSoundDispatch mocked to a vi.fn `soundSpy` via vi.mock of ClassicySoundManagerContext): `is a pure function of state without package hooks` (nothing registered; renderHook(() => useClassicyAppearance("Button", { pressed: true, disabled: false })) → className "pressed", style undefined, attrs deep-equals {}; act(() => result.current.emit("press")) → className still "pressed"); `merges decorate() into className, style and attrs` (probe installed → className "pressed probe-Button", attrs { "data-probe-state": "pressed" }; a probe variant whose decorate returns style { outline: "1px" } → style deep-equals it); `emit calls the handler with the context` (probe with on.press = vi.fn → called once with { component: "Button", event: "press", element: null, state: { pressed: true, disabled: false }, detail: 7 } when emit("press", 7)); `passes the ref element` (ref = { current: document.createElement("button") } → ctx.element toBe it); `applies a returned decoration on the next render and clears it on the next decoration` (press handler returns { className: "flash" } → after act(emit("press")) className "pressed probe-Button flash"; release handler returns {} → after act(emit("release")) className "pressed probe-Button"); `a handler side effect without a return leaves the decoration unchanged` (release handler returns undefined after the press → "flash" still present); `emits mount once and unmount once` (probe events after render: exactly one { event: "mount" }; rerender twice → still one; unmount → one { event: "unmount" }); `clears the emitted decoration when the package changes` (after "flash", setState packageId "platinum" with a platinum stub registered → no "flash"); `the sound bridge dispatches through the component's sound dispatch` (press handler calls playClassicyAppearanceSound("ClassicyButtonClickDown") → soundSpy called with { type: "ClassicySoundPlay", sound: "ClassicyButtonClickDown" }; with { interrupt: true } → type "ClassicySoundPlayInterrupt"). ClassicyAppearanceSound.test.ts: `warns and ignores a sound outside a handler` (log sink spy sees one warn; no throw); `restores the previous dispatch after a nested run` (nested runWithClassicyAppearanceSoundDispatch(a, () => run(b, …)) → after the inner run, play goes to a).

### 2: Run them to verify they fail

`pnpm exec vitest run src/Appearance/useClassicyAppearance.test.tsx src/Appearance/ClassicyAppearanceSound.test.ts` — Expected: FAIL — modules not found.

### 3: Implement ClassicyAppearanceSound.ts and useClassicyAppearance.ts

`export function useClassicyAppearance<E extends HTMLElement = HTMLElement>(component: ClassicyComponentName, state: Partial<Record<ClassicyState, boolean>>, ref?: RefObject<E | null>): { className: string; style?: CSSProperties; attrs: Record<string, string>; emit: (event: ClassicyAppearanceEvent, detail?: unknown) => void }`. `className` = [classicyStateClasses(state), decorate(component, state)?.className, emitted?.className] joined by one space, empty entries dropped; `style` = { ...decorate.style, ...emitted.style } or undefined when both absent; `attrs` = { ...decorate.attrs, ...emitted.attrs }. `emit` looks up `hooks.on?.[component]?.[event]` on the current active package (ref-held), calls it synchronously inside runWithClassicyAppearanceSoundDispatch(soundDispatch, …) with `{ component, event, element: ref?.current ?? null, state: <latest>, detail }`; a returned object (even `{}`) becomes the emitted decoration via setState (skipped after unmount); void leaves the previous one. A package switch clears the emitted decoration. mount/unmount are emitted from an effect with [] deps reading `emitRef.current`. `export function playClassicyAppearanceSound(sound: string, options?: { interrupt?: boolean }): void` dispatches `{ type: options?.interrupt ? "ClassicySoundPlayInterrupt" : "ClassicySoundPlay", sound }` through the top of a module-level stack maintained by `runWithClassicyAppearanceSoundDispatch<T>(dispatch: Dispatch<ClassicySoundAction>, fn: () => T): T` (push before fn, pop in finally); with no enclosing run it logs `classicyLog("warn", "ClassicyAppearance", "playClassicyAppearanceSound was called outside an appearance handler; ignored.")`.

### 4: Implement the probe helper

src/Appearance/__tests__/appearanceProbe.tsx: `installClassicyAppearanceProbe(options?: { on?: Partial<Record<ClassicyAppearanceEvent, ClassicyAppearanceHandler>> }): { events: Array<{ component: ClassicyComponentName; event: ClassicyAppearanceEvent; detail: unknown }>; uninstall: () => void }` — registers `{ id: "probe", name: "Probe", css: "", defaults: { ...getTheme("default"), package: "probe" }, layout: <Platinum layout>, hooks: { decorate: (c, s) => ({ className: `probe-${c}`, attrs: { "data-probe-state": classicyStateClasses(s) } }), on: <for every key of CLASSICY_COMPONENT, for every event: a recorder that pushes { component, event, detail } then delegates to options.on?.[event]> } }` and sets `System.Manager.Appearance.packageId` to "probe" through useAppManager.setState; uninstall restores "platinum" and calls resetClassicyAppearancePackagesForTests. Its smoke test is the hook test `merges decorate() …`.

### 5: Add missing component names to the vocabulary and regenerate

Add to src/Appearance/vocabulary/ClassicyVocabulary.json any of Button, BevelButton, Checkbox, RadioInput, PopUpMenu, ComboBox, Input, ListBox, Slider, Placard, Tabs, Disclosure, Tree, Table, Link, FileInput, Window, Alert, Menu, MenuItem, DesktopIcon, Icon, ControlStrip, Assistant that CLASSICY_COMPONENT lacks; `pnpm generate-barrels && pnpm exec tsc --noEmit -p .` — Expected: the generated ClassicyVocabulary.ts has every name; the top barrel exports the two new modules.

### 6: Run tests to verify they pass

`pnpm exec vitest run src/Appearance` — Expected: PASS.

### 7: Lint, type-check, commit

`pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`, then `git add src/Appearance src/index.ts && git commit -m "feat(appearance): useClassicyAppearance hook and package sound bridge"` with the trailer Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>.

## Acceptance Criteria

- [x] VERIFY: pnpm exec vitest run src/Appearance/useClassicyAppearance.test.tsx
- [x] useClassicyAppearance matches the 0002-ldj signature; with no package hooks it returns { className: classicyStateClasses(state), style: undefined, attrs: {} } and emit is a no-op; a handler's returned decoration is applied on the next render and replaced only by the next returned decoration (void keeps it, {} clears it); mount/unmount emit once per mount.
- [x] playClassicyAppearanceSound dispatches through the emitting component's useSoundDispatch during a handler and warns via classicyLog outside one; CLASSICY_COMPONENT contains all 24 component names.
- [x] VERIFY: pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test

## Files

- `src/Appearance/useClassicyAppearance.ts` - create: the contract hook
- `src/Appearance/ClassicyAppearanceSound.ts` - create: sound bridge
- `src/Appearance/__tests__/appearanceProbe.tsx` - create: probe package helper
- `src/Appearance/vocabulary/ClassicyVocabulary.json` - missing component names added
- `src/Appearance/useClassicyAppearance.test.tsx` - create: hook tests
- `src/Appearance/ClassicyAppearanceSound.test.ts` - create: bridge tests
- `src/index.ts` - regenerated by barrelsby

## Work Log

### 2026-10-29T17:29:30.228Z - Done on feat/appearance-part-i, 7343d5f51..e0f358082: 3f722fa96 (useClassicyAppearance, ClassicyAppearanceSound bridge, the test probe, Menu in the vocabulary), b8566c7f2 (review round 1: optional-chained selector, unmount tracking, I-R13 handler/decorate try/catch, I-R5 attrs filter in the hook, store-free hook — CLASSICY_FALLBACK_APPEARANCE_PACKAGE moved to the store-free ClassicyAppearanceFallback.ts and re-exported, subscription tests, JSDoc), e0f358082 (review round 2: partial-store test proven able to fail, mount flag in a useLayoutEffect so re-mount layout emits apply, warn-once tests with resetClassicyAppearanceAttributeWarningsForTests, case-insensitive attrs filter). Reviews: first Needs fixes (I4 + minors), re-review Needs fixes (I1 M3), second re-review Approved (C0 I0 M0). Gate on e0f358082: lint, tsc, 332 files / 3930 tests, build:source + verify:dist; controller re-ran src/Appearance (29 files / 451 tests). CLASSICY_COMPONENT's wired names are pinned by ClassicyVocabulary.test.ts. Public API +2 names (the fallback module's re-export keeps identity; one @internal test reset). Carry-forward for I 2.x: a child that emits from its own layout effect using a parent's `emit` would still be dropped on a StrictMode/Activity re-mount (children's layout effects run first) — nothing does that today; don't introduce it. Completed ahead of its depends story 0042-pbp (I 0, the parity baseline, deferred until after Part B lands).
