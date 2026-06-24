# Configurable Default State for `ClassicyAppManagerProvider`

**Date:** 2026-06-24
**Status:** Approved design, pending implementation
**Repo:** `github.com/robbiebyrd/classicy`

## Problem

The classicy desktop store is seeded from a hardcoded `DefaultAppManagerState`
(`ClassicyAppManager.ts`). Consuming apps cannot override any of those defaults —
clock start time, theme, sound volume, menus, etc. The motivating case: an app
(rt911) wants the menu-bar clock to boot at a fixed historical moment
(8:40 AM Eastern, 2001‑09‑11) instead of the real system time.

Today the only override path is to dispatch a change *after* mount from
application code, which is boilerplate the library should absorb.

## Key architectural constraint

The store is **not** created inside `ClassicyAppManagerProvider`. It is a
module-level zustand singleton built at import time in
`ClassicyAppManagerUtils.tsx`:

```ts
export const useAppManager = create<ClassicyStore>()(() => ({ ...getInitialState() }));
```

`getInitialState()` reads `localStorage["classicyDesktopState"]` **first**, and
falls back to `DefaultAppManagerState` only when no valid persisted state exists.
A 500ms-debounced subscriber persists the entire store on every change.

Consequence: a `defaultState` prop on the Provider cannot feed store *creation*
(the store already exists by the time the Provider renders). It must be applied
as a post-creation merge.

## Semantics: seed-only

Overrides fill blanks over `DefaultAppManagerState` and apply **only when there
is no persisted localStorage state**. A returning visitor with saved state keeps
it — overrides are ignored for them.

Accepted tradeoff for the clock use case: the first visit boots at the seeded
time, but once the clock ticks and persists, a reload resumes from the saved
time rather than snapping back to the seed. Clearing localStorage (or a manual
reset in the app's Controls) restores the seed. This keeps the design simple and
matches conventional "defaults" semantics.

## Chosen approach: Provider prop + one-time hydration effect

Rejected alternatives:

- **Pre-init config function** (`setClassicyDefaultOverrides`): no render flash,
  but relies on the consumer's call running before any classicy import triggers
  `create()`. Fragile under bundler ordering/tree-shaking. Rejected.
- **Lazy store creation**: clean prop-based config with no flash, but requires
  refactoring a core primitive that ~30 components depend on, with SSR/hydration
  risk. Out of proportion to the feature. Rejected (YAGNI).

The chosen approach is the smallest, safest change. Its only downside is a
single render frame showing the un-overridden default before the seed effect
fires (a brief flicker of "real now" on the clock), which is cosmetic and
invisible after first paint.

## Changes

All changes are in the classicy library.

### 1. `ClassicyAppManager.ts` — types + merge helper

```ts
export type DeepPartial<T> = T extends object
	? { [K in keyof T]?: DeepPartial<T[K]> }
	: T;

/**
 * Deep-merge `overrides` onto `base`, returning a new ClassicyStore.
 * Rules:
 *   - plain objects: merged recursively
 *   - arrays: the override array replaces the base array wholesale (no concat)
 *   - primitives: override wins
 *   - keys whose override value is `undefined`: skipped (base retained)
 *   - `base` is not mutated
 */
export function mergeClassicyState(
	base: ClassicyStore,
	overrides: DeepPartial<ClassicyStore>,
): ClassicyStore;
```

Array-replace (not concat) is intentional: seed values such as `systemMenu`
or `icons` should substitute the defaults, not append to them.

### 2. `ClassicyAppManagerUtils.tsx` — expose hydration source

`getInitialState()` already decides whether to use persisted state or defaults.
Record that decision so the Provider can know whether it may seed:

```ts
let hydratedFromStorage = false; // set true inside getInitialState() when persisted state is used
export const wasHydratedFromStorage = (): boolean => hydratedFromStorage;
```

### 3. `ClassicyAppManagerContext.tsx` — prop + seed effect

```ts
type ClassicyAppManagerProviderProps = {
	// ...existing props...
	defaultState?: DeepPartial<ClassicyStore>;
};

// inside the component body:
const seeded = useRef(false);
useEffect(() => {
	if (seeded.current || !defaultState || wasHydratedFromStorage()) return;
	seeded.current = true;
	useAppManager.setState((s) => mergeClassicyState(s, defaultState));
}, [defaultState]);
```

## Data flow

`app.tsx` passes `defaultState` → Provider mounts → effect checks
`wasHydratedFromStorage()` → if fresh (no persisted state), deep-merges the
override into the store (which at that point equals `DefaultAppManagerState`) →
the persistence subscriber saves the seeded state from then on.

## Error handling / edge cases

- `defaultState` omitted → effect is a no-op; behavior identical to today
  (fully backward compatible; prop is optional).
- Valid persisted state present → override skipped entirely (seed-only contract).
- SSR-safe: `getInitialState` already guards `typeof window`; the seed runs in a
  client-only `useEffect`.
- `base` is never mutated by `mergeClassicyState` (returns a fresh object), so
  `DefaultAppManagerState` stays pristine for other consumers/tests.

## Testing (vitest, alongside existing `*.test.ts`)

`mergeClassicyState`:
- nested object merge (e.g. only `DateAndTime.dateTime` set, siblings retained)
- array replacement (override array fully replaces base array)
- primitive override wins
- `undefined` override keys are skipped
- `base` argument is not mutated

Provider seeding:
- seeds the store when localStorage is empty
- does **not** override when localStorage holds valid persisted state

## Consumer usage (rt911 `packages/frontend/src/app.tsx`)

```tsx
<ClassicyAppManagerProvider
	defaultState={{
		System: { Manager: { DateAndTime: {
			dateTime: "2001-09-11T12:40:00.000Z", // 8:40 AM EDT (UTC-4)
			timeZoneOffset: "-4",
		}}},
	}}
>
```

`2001-09-11` fell in Eastern Daylight Time (UTC-4), so 8:40 AM Eastern is
`12:40` UTC. The store holds `dateTime` as a UTC ISO string plus a separate
`timeZoneOffset`, and the clock widget renders via UTC getters + the offset.

## Rollout

classicy is a published package (currently `0.9.8`, consumed via pnpm). Sequence:

1. Land the library change (this branch) + bump classicy version + publish.
2. Bump the classicy dependency in rt911.
3. Add the `defaultState` prop in rt911 `app.tsx`.

Publishing is the maintainer's call and is out of scope for the library code change.
