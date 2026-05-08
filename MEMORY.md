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

## Known Gaps / Potential Issues
- No `useShallow` usage anywhere in the codebase — some selectors returning objects could benefit from it
- Persistence writes synchronously on every state change — no debounce; could be improved for high-frequency events (window dragging, resizing)
- `subscribeWithSelector` not used — current pattern (full-state subscribe) is fine for persistence
