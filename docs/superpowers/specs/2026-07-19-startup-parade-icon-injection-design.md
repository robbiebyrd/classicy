# Startup Parade Icon Injection — Design

**Date:** 2026-07-19
**Status:** Approved

## Problem

The startup-screen icon parade (`ClassicyStartupScreen`) is derived exclusively
from apps registered with `extension: true`. There is no way to show an icon in
the parade without creating a full extension — which carries side effects
(background `open: true`, hidden from the App Switcher, listed in System
Folder → Extensions). Hosts need:

1. **Manual insertion** — parade icons with no app behind them at all.
2. **App injection** — a regular `ClassicyApp` showing an icon in the parade
   (either its own `appIcon` or a specific other icon) without becoming an
   extension.

## Design

### Store slice

New manager slice in `ClassicyStore`:

```ts
export interface ClassicyBootParadeIcon {
    id: string;      // dedup key
    icon: string;    // any icon URL, including ClassicyIcons.* values
    name?: string;   // alt/title tooltip text
}

export interface ClassicyStoreSystemBootManager extends ClassicyStoreSystemManager {
    paradeIcons: ClassicyBootParadeIcon[];
}

// ClassicyStoreSystem.Manager gains:
Boot: ClassicyStoreSystemBootManager;
```

`DefaultAppManagerState` initializes `Boot: { paradeIcons: [] }`. Old persisted
states without a `Boot` key are handled by the existing
`mergeClassicyState(defaults, persisted)` hydration — missing keys fall back to
defaults.

**Session-only, not persisted.** `sanitizeStateForPersistence()` resets
`paradeIcons` to `[]` before writing to localStorage. Parade icons are
re-registered on every mount by whoever owns them; persisting them would create
stale-icon bugs (a host removes its `bootIcon` prop but the icon parades
forever). Since `mergeClassicyState` replaces arrays wholesale, a persisted
empty array hydrates as empty — correct.

### Events

Two new events, handled by a new `classicyBootEventHandler` in
`src/SystemFolder/SystemResources/Boot/ClassicyBootManager.ts` (mirrors the
`ClassicyDesktopManager` pattern):

- `ClassicyBootParadeIconAdd` — `{ type, id: string, icon: string, name?: string }`.
  If an entry with the same `id` exists, update it in place (preserving its
  original position); otherwise append. Missing/empty `id` or `icon` → no-op.
- `ClassicyBootParadeIconRemove` — `{ type, id: string }`. Removes the matching
  entry; unknown id → no-op.

Routing: `classicyDesktopStateEventReducer` gains a branch
`action.type.startsWith("ClassicyBootParadeIcon")` → `classicyBootEventHandler`,
placed with the other built-in prefix branches (before the plugin/generic
`ClassicyApp*` fallthrough). Note the branch must be checked before any prefix
that could shadow it; `ClassicyBoot` collides with nothing existing.

### Manual insertion

Host code dispatches directly:

```ts
dispatch({
    type: "ClassicyBootParadeIconAdd",
    id: "my-branding",
    icon: ClassicyIcons.system.colors.extension, // or any URL string
    name: "My Extension",
});
```

### ClassicyApp prop

`ClassicyApp` gains `bootIcon?: boolean | string`:

- `bootIcon` / `bootIcon={true}` → dispatch add with the app's own `icon`.
- `bootIcon="…"` (any icon URL string, including `ClassicyIcons.*` values,
  which are plain URL strings) → dispatch add with that icon.
- Dedup `id` is the app id; `name` is the app name.
- Dispatched in the existing mount `useEffect` alongside `ClassicyAppLoad`, so
  it registers before the splash's reveal math runs.
- **Real extensions ignore `bootIcon`** (`extension` prop set): they are already
  in the parade via the extension filter; honoring both would double-show them.

### Parade rendering

`ClassicyStartupScreen` merges the two sources — injected first, then
extensions (user decision):

```ts
const paradeIcons = useAppManager((s) => s.System.Manager.Boot.paradeIcons);
const merged = [
    ...paradeIcons.map((p) => ({ key: `parade:${p.id}`, icon: p.icon, name: p.name ?? "" })),
    ...extensions.map((e) => ({ key: `ext:${e.id}`, icon: e.icon, name: e.name })),
];
```

- Keys are prefixed (`parade:` / `ext:`) so a manual icon id can never collide
  with an app id in React keys.
- The existing reveal math (`duration / (N + 1)`) uses `merged.length`; the
  render loop maps over the merged list. No SCSS changes.

## Error handling

- Add with missing `id`/`icon`: no-op (guarded in handler).
- Remove of unknown id: no-op.
- Empty parade (no injected icons, no extensions): the extensions strip is not
  rendered — unchanged from today.

## Testing

- **Reducer** (`ClassicyBootManager.test.ts`): add appends; duplicate id
  updates in place preserving position; remove deletes; malformed actions
  no-op; routing test that the `ClassicyBootParadeIcon` prefix reaches the
  handler.
- **Persistence** (`ClassicyAppManagerUtils.test.ts`): sanitized state has
  `paradeIcons: []`.
- **ClassicyApp** (`ClassicyApp.test.tsx`): `bootIcon={true}` dispatches add
  with app icon; `bootIcon="url"` dispatches with that url; no prop → no
  dispatch; `extension` + `bootIcon` → no parade-add dispatch.
- **Startup screen** (`ClassicyStartupScreen.test.tsx`): injected icons render
  before extension icons; reveal timing uses merged count; injected-only and
  extensions-only cases.
