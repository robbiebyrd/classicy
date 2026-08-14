# Classicy Project Memory

## Project Identity
- React/TypeScript UI framework replicating Mac OS 8 (Platinum) interface
- Distributed as npm package (`classicy`), current version `0.9.0`
- Branch convention: no Jira prefix required; use descriptive branch names

## Key Dependency Versions
- zustand: ^5.0.11 (v5)
- immer: ^11.1.4 (standalone, NOT via zustand/middleware/immer)
- react: ^19.2.0 (peer dep)
- vitest: ^4.1.1 (test runner)
- biome: ^2.4.14 (linter/formatter, replaces ESLint)

## State Management Architecture
- **Store file**: `src/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils.tsx`
- **Store hook**: `useAppManager(selector)` — plain Zustand `create()`, no middleware
- **Dispatch**: `dispatch(action)` + `useAppManagerDispatch()` — module-level function, not in store
- **Reducer**: `classicyDesktopStateEventReducer` in `ClassicyAppManager.ts` — routes by action type prefix
- **Immer pattern**: Standalone `produce(currentState, draft => {...})` + `castDraft` inside `setState` callback — NOT using `zustand/middleware/immer`
- **Persistence**: Manual `useAppManager.subscribe()` → `localStorage.setItem(...)` via `startAppManagerPersistence()` — runs on every state change, no debounce

## Zustand v5 Key Facts (Researched 2026-05-08)
- Default equality: `Object.is` on selector result (via `useSyncExternalStoreWithSelector`)
- No selector memoization — selector runs on every store notification, result compared with `Object.is`
- `useShallow` (from `zustand/react/shallow`): wraps selector, compares result via shallow equality instead of `Object.is`; NOT currently used in this project
- `subscribeWithSelector` middleware: NOT used; enables `store.subscribe(selectorFn, callback)` — irrelevant since current persistence subscribes to full state
- `.find()` in selectors: safe to call; returns a new object reference each time — re-renders whenever the *containing array* reference changes (Immer ensures this on mutations)

## Current Selector Patterns in Codebase
- Primitives/booleans: `useAppManager(s => s.System.Manager.Desktop.disableBalloonHelp)` — correct, no useShallow needed
- Object slices: `useAppManager(s => s.System.Manager.Applications.apps[appId])` — returns whole app object; re-renders on any change to that app (Immer makes new reference on mutation)
- `.find()` in selector: `ClassicyDesktopIcon.tsx` uses `icons.find(i => i.appId === appId)` returning `icon?.location ?? null` (primitive) — safe
- `ClassicyWindow.tsx` selects entire app object then calls `.find()` outside selector — avoids returning new reference from selector
- Arrays selected directly: `useAppManager(s => s.System.Manager.Applications.apps["Finder.app"]?.windows)` — potential re-render risk if windows array reference changes on unrelated mutations

## ClassicySplitView (added 2026-08-14, commit d9a71b4f)
- `src/SystemFolder/SystemResources/SplitView/ClassicySplitView.tsx` — resizable 2–3 pane container, one axis (`direction: "horizontal" | "vertical"`); nest for grids
- Uncontrolled after mount: `defaultSizes` (pct, normalized) initial only; `onResize` per drag step, `onResizeCommit` once per gesture (persist seam)
- Divider = ARIA window-splitter (`role="separator"`, tabIndex 0, arrow keys ±1%); mouse drag uses document-level listeners (same idiom as ClassicyWindow)
- `minPaneSize` px (default 48) → clamped in exported pure fn `computeSplitViewSizes`
- Mouse + keyboard only (no touch/pointer events); 29 tests, Storybook stories included

## ScreenSaver Extension (added 2026-08-14)
- `src/SystemFolder/Extensions/ScreenSaver/` — extension `ScreenSaver.app` + registry (`registerClassicyScreenSaver`, replace-on-reregister) + `savers/` (12 After Dark ports; CSS MIT, images © Berkeley Systems — user accepted as fair use)
- Idle monitor: wall-clock refs + capture-phase listeners; NO store writes per event; transient `active` stripped in `sanitizeStateForPersistence`
- Actions: `ClassicyAppScreenSaver{Activate(scriptable),Deactivate,SetSaver,SetTimeout,SetEnabled,SetConfig}`; config validated vs saver zod schema
- Options UI two-tier: `configComponent` custom else schema-derived `ClassicyScreenSaverConfigForm` (number→spinner, bool→checkbox, enum→popup, string→input)
- Control panel `ControlPanels/ScreenSaverManager/`; overlay z-index 100001; `transparentBackground` savers reveal live desktop
- Gotcha: component vs registry type name collided in flat barrel → type is `ClassicyScreenSaverDefinition`

## ClassicyLog Facility (added 2026-08-14)
- `src/SystemFolder/SystemResources/Log/ClassicyLog.ts`: `classicyLog(level, subsystem, message, ...details)` + `registerClassicyLogSink({id, onLog?, onError?, onCrash?})` (replace-on-reregister) + `emitClassicyCrash`
- Swept ~40 console.* sites across 22 files to classicyLog; kept: debug-flag console.group dumps, CrashScreen console.error, sink-failure report
- Policy: sinks always delivered (prod too); console mirror dev-only for debug/info/warn, always for error; format `[Subsystem] message` (concatenated — 23 tests broke when prefix was a separate arg)
- Dev-gated console.error sites (DateTime handler) were promoted to always-console — deliberate

## Known Gaps / Potential Issues
- No `useShallow` usage anywhere in the codebase — some selectors returning objects could benefit from it
- Persistence writes synchronously on every state change — no debounce; could be improved for high-frequency events (window dragging, resizing)
- `subscribeWithSelector` not used — current pattern (full-state subscribe) is fine for persistence
