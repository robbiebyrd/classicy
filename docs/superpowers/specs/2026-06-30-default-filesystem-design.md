# Configurable Default Filesystem for `ClassicyAppManagerProvider`

**Date:** 2026-06-30
**Status:** Approved design, pending implementation
**Repo:** `github.com/robbiebyrd/classicy`

## Problem

`ClassicyFileSystem` (`src/SystemFolder/SystemResources/File/ClassicyFileSystem.ts`)
is a standalone class — not part of the Zustand `ClassicyStore` — that backs the
virtual filesystem used by Finder and SimpleText. `Finder.tsx` and `SimpleText.tsx`
each independently do:

```ts
const fs = useMemo(() => new ClassicyFileSystem(), []);
```

With no arguments, both fall back to the hardcoded `DefaultFSContent`
(`DefaultClassicyFileSystem.ts`) and the shared `"classicyStorage"` localStorage
key. There is currently no way for a consuming app to configure what filesystem
content a fresh visitor sees — unlike the Zustand desktop state, which already
supports this via the `defaultState` prop
(see `2026-06-24-configurable-default-state-design.md`).

This is the filesystem analog of that feature: let a consumer pass a default
filesystem tree into `ClassicyAppManagerProvider`, with a choice of merging it
onto Classicy's built-in defaults or using it exclusively in place of them.

## Key architectural difference from `defaultState`

`defaultState` required `useRef` + `wasHydratedFromStorage()` bookkeeping because
the Zustand store is a **module-level singleton created once at import time** —
by the time the Provider mounts and could apply an override, the store already
exists, possibly already hydrated from `localStorage`.

`ClassicyFileSystem` has no such constraint: it is **freshly constructed by each
consuming component** (`Finder.tsx`, `SimpleText.tsx`) via `useMemo`, and its
constructor *already* gates on `localStorage` internally:

```ts
constructor(storageKey = "classicyStorage", defaultFS: any = DefaultFSContent, separator = ":") {
  this.fs = defaultFS;
  const retrieved = localStorage.getItem(this.storageKey);
  if (retrieved) {
    const parsed = JSON.parse(retrieved);
    if (isValidFileSystemEntry(parsed)) this.fs = parsed; // defaultFS discarded
  }
  // ...persist this.fs
}
```

Consequence: seed-only semantics (a fresh visitor sees the configured default;
a returning visitor with persisted state keeps it) fall out of this existing
behavior automatically. We only need to decide **what tree is offered as the
constructor's `defaultFS` argument** — no additional hydration-tracking code is
needed, unlike the `defaultState` feature.

## Chosen approach: Context + shared `useClassicyFileSystem()` hook

`ClassicyAppManagerProvider` exposes a new React context carrying the consumer's
configured default filesystem tree and mode. A new hook resolves the effective
tree (merged or exclusive) and constructs the `ClassicyFileSystem` instance.
`Finder.tsx` and `SimpleText.tsx` switch from constructing `ClassicyFileSystem`
inline to calling this hook, so any future app gets the same behavior for free.

This mirrors the existing `ClassicyAnalyticsPrefixContext` pattern already used
by this same Provider for prefixing analytics events
(`useClassicyAnalytics.ts`), so it's consistent with how the Provider already
hands cross-cutting config down to consumers without threading props manually.

### Rejected alternatives

- **Context only, no shared hook** — `Finder.tsx`/`SimpleText.tsx` each read the
  context directly and inline their own merge/exclusive resolution before
  constructing `ClassicyFileSystem`. Avoids one new file, but duplicates the
  resolution logic at every call site, growing with each future app that adopts
  `ClassicyFileSystem`. Rejected for DRY.
- **Resolution inside the `ClassicyFileSystem` class itself** — not viable: it's
  a plain class and cannot call `useContext`. The resolved value would still
  need to be computed in a component and passed into the constructor, so this
  doesn't remove any wiring — it just relocates where the merge happens.
  Rejected.

## Changes

All changes are in the classicy library.

### 1. New shared deep-merge utility

Extract the existing `mergeClassicyState` algorithm (array-replace, recursive
object merge, `undefined`-skip, no base mutation) into a generic utility so it
can be reused for filesystem trees without duplicating the algorithm.

`src/SystemFolder/SystemResources/Utils/deepMerge.ts` (new):

```ts
export type DeepPartial<T> = T extends object
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T;

/**
 * Deep-merge `overrides` onto a structural clone of `base`.
 * Plain objects merge recursively; arrays and primitives from `overrides`
 * replace the base value wholesale; `undefined` override values are skipped;
 * `base` is never mutated.
 */
export function deepMergeReplacingArrays<T>(
  base: T,
  overrides: DeepPartial<T>,
): T;
```

`ClassicyAppManager.ts`'s `mergeClassicyState` becomes a thin typed wrapper
around this util (re-exports `DeepPartial<ClassicyStore>` for backward
compatibility with existing imports). Behavior and existing tests for
`mergeClassicyState` are unchanged.

### 2. `ClassicyFileSystem.ts` — merge helper

```ts
export function mergeClassicyFileSystemEntries(
  base: ClassicyFileSystemEntry,
  overrides: ClassicyFileSystemEntry,
): ClassicyFileSystemEntry {
  return deepMergeReplacingArrays(base, overrides);
}
```

### 3. New file: `ClassicyFileSystemContext.tsx`

```ts
export type ClassicyDefaultFileSystemMode = "merge" | "exclusive";

type ClassicyDefaultFileSystemContextValue = {
  defaultFileSystem?: ClassicyFileSystemEntry;
  mode: ClassicyDefaultFileSystemMode;
};

export const ClassicyDefaultFileSystemContext =
  createContext<ClassicyDefaultFileSystemContextValue>({ mode: "merge" });

/**
 * Constructs a ClassicyFileSystem seeded from the nearest
 * ClassicyAppManagerProvider's defaultFileSystem/defaultFileSystemMode props,
 * falling back to DefaultFSContent when no provider (or no override) is present.
 */
export function useClassicyFileSystem(
  storageKey?: string,
  separator?: string,
): ClassicyFileSystem {
  const { defaultFileSystem, mode } = useContext(
    ClassicyDefaultFileSystemContext,
  );
  return useMemo(() => {
    const resolved = !defaultFileSystem
      ? DefaultFSContent
      : mode === "exclusive"
        ? defaultFileSystem
        : mergeClassicyFileSystemEntries(DefaultFSContent, defaultFileSystem);
    return new ClassicyFileSystem(storageKey, resolved, separator);
  }, [defaultFileSystem, mode, storageKey, separator]);
}
```

### 4. `ClassicyAppManagerContext.tsx` — props + context provider

```ts
type ClassicyAppManagerProviderProps = {
  // ...existing props...
  defaultFileSystem?: ClassicyFileSystemEntry;
  defaultFileSystemMode?: ClassicyDefaultFileSystemMode; // default "merge"
};

// inside the component body:
const fsContextValue = useMemo(
  () => ({ defaultFileSystem, mode: defaultFileSystemMode ?? "merge" }),
  [defaultFileSystem, defaultFileSystemMode],
);

// in the render tree:
<ClassicyDefaultFileSystemContext.Provider value={fsContextValue}>
  <ClassicySoundManagerProvider>{children}</ClassicySoundManagerProvider>
</ClassicyDefaultFileSystemContext.Provider>
```

### 5. `Finder.tsx` / `SimpleText.tsx` — adopt the hook

```diff
- const fs = useMemo(() => new ClassicyFileSystem(), []);
+ const fs = useClassicyFileSystem();
```

## Data flow

`app.tsx` passes `defaultFileSystem`/`defaultFileSystemMode` → Provider memoizes
them into context (no merge work yet) → `Finder.tsx`/`SimpleText.tsx` mount and
call `useClassicyFileSystem()` → the hook resolves the candidate tree (plain
default, merged, or exclusive replacement) → `new ClassicyFileSystem(...)` is
constructed with that candidate as `defaultFS` → the constructor's existing
localStorage check decides whether the candidate is actually used (fresh
visitor) or discarded in favor of persisted state (returning visitor).

Both `Finder.tsx` and `SimpleText.tsx` share the same default `"classicyStorage"`
key today and will continue to resolve to the same effective tree, consistent
with the current shared-filesystem behavior.

## Error handling / edge cases

- No `ClassicyAppManagerProvider` in the tree → `useContext` returns the
  context's default value (`{ mode: "merge" }`, no `defaultFileSystem`) →
  resolves to plain `DefaultFSContent`, byte-for-byte identical to today's
  behavior. Existing `ClassicyFileSystem` consumers outside a Provider are
  unaffected.
- `defaultFileSystem` omitted → mode is irrelevant; resolves to `DefaultFSContent`
  regardless of `defaultFileSystemMode`.
- `defaultFileSystemMode` omitted, `defaultFileSystem` set → defaults to
  `"merge"` (additive — never silently drops Classicy's built-in apps/files),
  matching `defaultState`'s "augment, don't replace" default.
- Returning visitor with valid `classicyStorage` data → both modes are moot;
  persisted state wins per the constructor's existing, unmodified logic.
- `deepMergeReplacingArrays`/`mergeClassicyFileSystemEntries` never mutate
  `DefaultFSContent` (same non-mutation guarantee as today's
  `mergeClassicyState`).

## Testing (vitest, alongside existing `*.test.ts`)

`deepMergeReplacingArrays` (new, in `Utils/deepMerge.test.ts`):
- nested object merge (sibling keys retained)
- array replacement (override array fully replaces base array)
- primitive override wins
- `undefined` override keys are skipped
- `base` argument is not mutated

`mergeClassicyState` / `mergeClassicyFileSystemEntries`: thin-wrapper tests
confirming each correctly delegates to `deepMergeReplacingArrays` with the
right types; existing `mergeClassicyState` test cases continue to pass
unmodified.

`useClassicyFileSystem` / `ClassicyFileSystemContext` (new
`ClassicyFileSystemContext.test.tsx`):
- no provider in tree → resolves to `DefaultFSContent`
- `defaultFileSystem` set, mode omitted → resolves to merge of
  `DefaultFSContent` and the override
- `defaultFileSystem` set, mode `"exclusive"` → resolves to exactly the
  override tree, no `DefaultFSContent` content present
- `defaultFileSystem` omitted → resolves to `DefaultFSContent` regardless of
  mode

No changes needed to `FinderData.test.ts` / `ClassicyFinderEventHandler.test.ts`
— neither renders the component tree or touches `ClassicyFileSystem`
construction.

## Consumer usage

```tsx
<ClassicyAppManagerProvider
  defaultFileSystem={{
    "Macintosh HD": {
      _type: ClassicyFileSystemEntryFileType.Drive,
      Documents: {
        _type: ClassicyFileSystemEntryFileType.Directory,
        "Welcome.txt": {
          _type: ClassicyFileSystemEntryFileType.TextFile,
          _data: "Hello from my app!",
        },
      },
    },
  }}
  defaultFileSystemMode="merge" // or "exclusive" to replace Classicy's defaults entirely
>
```

## Rollout

classicy is a published package consumed via pnpm. Land the library change on
this branch, bump the package version, and publish per the maintainer's usual
process — no specific downstream consumer is driving this change, so there's no
dependent-repo update sequence to coordinate.
