# ClassicyFileSystem Sync Adapter — Design

**Date:** 2026-07-20
**Status:** Approved

## Problem

`ClassicyFileSystem` lives entirely in the browser (in-memory tree seeded from
localStorage). Library consumers have no way to mirror it to a backend, sync it
across devices, or observe changes. We need an **optional adapter interface**
that can:

1. Receive a **full snapshot** of the tree whenever the filesystem is modified.
2. **Subscribe to granular updates** (a journal of semantic operations).
3. Keep local and remote copies verifiably **in sync** (hashing + sequence
   numbers), including a **two-way** read path at boot.

localStorage remains the primary storage: with no adapter registered, reads and
writes behave as today, and even with adapters, the system always reads locally.

Current obstacles found in exploration:

- **No mutation choke point.** `writeFile`/`mkDir`/`rmDir` exist, but callers
  also mutate directly — SimpleText sets `entry._type = nextType`, and
  `useClassicyFileSystem` assigns `fs.fs = withApplicationsFolder(...)`.
- **Persistence is scattered** — the constructor writes localStorage once and
  SimpleText calls `localStorage.setItem(fs.storageKey, fs.snapshot())` itself.
- **Derived folders** (Applications, System Folder → Extensions) are live-only
  overlays computed from the app store; syncing them would persist derived
  state that regenerates every boot.
- The fs instance is **rebuilt by a `useMemo`** whenever apps/extensions
  register, so adapters must live outside the instance.

## Decisions (from brainstorming)

| Question | Decision |
| --- | --- |
| Direction | Two-way: outbound updates + optional boot-time read path |
| Wiring | Global registry (`registerClassicyFileSystemAdapter`), matching `registerClassicyIcons` / `registerHyperCardSaveProvider` |
| Modes | Capability-based: one interface with optional `onChange` / `onSnapshot` / `reconcile` methods |
| Conflicts | Adapter decides via `reconcile()`; no reconciler (or any error) → local wins |
| Cadence | `onChange` immediate per mutation; `onSnapshot` + persist debounced (default 500 ms, configurable) |
| Change detection | Centralized mutation API (instrumented class methods), not Proxy or hash-polling |

## Design

### Adapter interface & registry

New file `src/SystemFolder/SystemResources/File/ClassicyFileSystemAdapter.ts`:

```ts
export interface ClassicyFileSystemJournalEntry {
    seq: number                                          // monotonic, persisted across sessions
    op: 'write' | 'mkdir' | 'rmdir' | 'meta' | 'load'
    path: string                                         // colon-separated; '' for 'load'
    data?: string                                        // file contents for 'write'
    metadata?: Partial<ClassicyFileSystemEntryMetadata>  // for 'meta'
    timestamp: string                                    // ISO 8601
}

export interface ClassicyFileSystemSnapshot {
    tree: ClassicyFileSystemEntry   // full tree, same shape localStorage holds
    hash: string                    // sha256 of the serialized tree
    seq: number                     // last journal seq included in this snapshot
    storageKey: string
    timestamp: string
}

export type ClassicyFileSystemReconcileResult =
    | { action: 'useLocal' }
    | { action: 'replace'; tree: ClassicyFileSystemEntry }

export interface ClassicyFileSystemAdapter {
    id: string
    onChange?(entry: ClassicyFileSystemJournalEntry): void | Promise<void>
    onSnapshot?(snapshot: ClassicyFileSystemSnapshot): void | Promise<void>
    reconcile?(local: ClassicyFileSystemSnapshot): Promise<ClassicyFileSystemReconcileResult>
}

export function registerClassicyFileSystemAdapter(
    adapter: ClassicyFileSystemAdapter,
    options?: { snapshotDebounceMs?: number },  // default 500
): void
export function unregisterClassicyFileSystemAdapter(id: string): void
export function getClassicyFileSystemAdapters(): ClassicyFileSystemAdapter[]
```

Module-level registry (a `Map` keyed by `id`; re-registering an id replaces
it), following the `HyperCardPlugins.ts` pattern. Consumers register at app
entry, before rendering. The interface is capability-based: the system calls
only the methods an adapter implements.

Consistency: every snapshot carries a sha256 hash (via `@noble/hashes`,
already a dependency) plus the last journal `seq`. Sequence gaps let a remote
detect missed deliveries (e.g. it was offline); hash mismatch detects
divergence. Either condition is grounds for the adapter to reconcile at next
boot.

### Mutation choke points & notification pipeline

Every `ClassicyFileSystem` mutation flows through a private notifier:

| Method | Journal entry |
| --- | --- |
| `writeFile(path, data)` | `{op: 'write', path, data}` |
| `mkDir(path)` | `{op: 'mkdir', path}` |
| `rmDir(path)` | `{op: 'rmdir', path}` |
| `load(data)` | `{op: 'load', path: ''}` |
| `setMetadata(path, patch)` *(new)* | `{op: 'meta', path, metadata: patch}` |

The notifier, per mutation:

1. Increments `seq` (persisted at `` `${storageKey}:seq` `` so it is monotonic
   across sessions) and stamps an ISO timestamp.
2. Fires `onChange` on every registered adapter immediately.
3. Schedules the debounced tail: `persist()` — the now-centralized
   `localStorage.setItem(storageKey, snapshot())` — then `onSnapshot` with the
   fresh tree + hash + seq.

Migrations of existing direct-mutation sites:

- **SimpleText** `toggleFileType`: `entry._type = nextType` + manual
  `localStorage.setItem` → `fs.setMetadata(filePath, { _type: nextType })`.
- **Constructor**: its inline `localStorage.setItem` becomes `this.persist()`.
- **Derived overlays**: `useClassicyFileSystem`'s `fs.fs = withApplicationsFolder(...)`
  / `withExtensionsFolder(...)` assignments become an internal
  `applyDerivedTree(tree)` that neither journals nor notifies — overlay
  application never *triggers* sync. Snapshots serialize the whole current
  tree, so they mirror localStorage exactly (including overlays present at
  snapshot time — the same existing quirk noted in Out of scope).

Because `persist()` is debounced, a pending write could be lost if the tab
closes inside the debounce window. A `pagehide` listener flushes any pending
persist + snapshot synchronously (localStorage write always; `onSnapshot` is
fired but, being possibly async, delivery on shutdown is best-effort).

With zero adapters registered the only behavior change is that persistence is
debounced (with the `pagehide` flush) and centralized instead of scattered.

### Two-way reconciliation (boot flow)

`useClassicyFileSystem` gains a `useEffect` that runs once per fs instance:

1. Build the local `ClassicyFileSystemSnapshot` (tree, hash, seq).
2. For each adapter implementing `reconcile`, in registration order, await its
   verdict; the first `replace` wins and later reconcilers are skipped.
3. `{action: 'useLocal'}`, no reconcilers, or any error → done; local wins
   (localStorage stays primary).
4. `{action: 'replace', tree}` → validate with the existing
   `isValidFileSystemEntry`; if invalid, log and fall back to local. If valid:
   `fs.load(tree)` (journals `op: 'load'`), `persist()`, then bump a new
   `fsVersion` counter in the Zustand store.

`fsVersion` is a new invalidation key on the hook's `useMemo`. Bumping it
rebuilds the fs, which re-seeds from the just-updated localStorage and
re-applies the derived overlays through the normal path — runtime replacement
becomes indistinguishable from a fresh boot, so no component ever holds a
stale tree.

Reconciliation must not re-run for rebuilds triggered by its own `fsVersion`
bump or by app/extension registration: the effect tracks completion per
`storageKey` (module-level flag), not per instance identity.

### Error handling

- Every adapter callback is wrapped: synchronous throws caught, promise
  rejections `.catch`ed. Failures log
  `[ClassicyFileSystem] adapter "<id>" failed in <hook>` and never block local
  operation or other adapters.
- A failing or invalid `reconcile` degrades to `useLocal`.
- All localStorage/timer access stays behind the existing `typeof window`
  guards (SSR-safe); on the server the notifier is a no-op.

### Testing

Vitest, following `ClassicyFileSystem.test.ts` patterns:

- **Registry** — register, unregister, duplicate-id replacement, enumeration.
- **Journaling** — each op produces the right entry shape; seq is monotonic
  and survives re-instantiation (persisted seq key).
- **Debounce** (fake timers) — N rapid writes → N `onChange` calls but one
  `persist()` + one `onSnapshot`; custom `snapshotDebounceMs` honored.
- **Isolation** — a throwing adapter affects neither the filesystem nor a
  second registered adapter.
- **Reconcile** — useLocal path; replace path (validated, persisted,
  `fsVersion` bumped, overlays reapplied); invalid tree rejected; rejection →
  local wins; runs once per storageKey despite fs rebuilds.
- **Overlays** — `applyDerivedTree` produces no journal entries,
  notifications, or seq increments.
- **SimpleText** — type toggle goes through `setMetadata` and persists via the
  centralized path.

## Out of scope

- Concrete adapter implementations (REST, WebSocket, IndexedDB, …) — consumers
  bring their own; the example app may gain a demo adapter later.
- Merge-style conflict resolution (three-way merge, CRDTs). `reconcile` may
  return a merged tree via `replace`, but the library ships no merge logic.
- Journal persistence/replay buffering for offline adapters — adapters that
  miss entries recover via snapshot + reconcile.
- Stripping derived folders from localStorage persistence (existing quirk:
  post-boot persists include overlays; unchanged by this design).
