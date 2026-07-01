# Async File Size Resolution for `_url`/`_data` Entries — Design Spec

**Date:** 2026-07-01
**Status:** Approved design, pending implementation
**Repo:** `github.com/robbiebyrd/classicy`

## Problem

`ClassicyFileSystem.size(path)` only knows how to compute a size for entries
that carry `_data` (`new Blob(String(entry._data).split("")).size`) or
directories (recursive sum of children). An entry with only `_url` set (per
the Phase 1 content-resolver design,
`docs/superpowers/specs/2026-07-01-pdf-content-resolver-design.md`) has no
local bytes to measure and today falls through to `-1` ("unknown"), even
though the remote server usually knows the size and can report it via HTTP
`HEAD`.

We want `_url`-only entries to report a real size: use `_size` from metadata
if already present, otherwise resolve it over the network via `HEAD` and
remember it.

Separately, once `_data` becomes gzip + base64url-compressed content (the
Phase 1 resolver work, in flight in parallel), sizing it by raw string length
would report the *compressed* size. We want the *uncompressed* size — the
size a user actually cares about — decoded rather than measured off the wire
format.

## Key architectural constraint

`size()` is synchronous today, and is called directly inside render paths in
two places: `ClassicyFileBrowserViewTable.tsx`'s `fileList` `useMemo`, and
`Finder.tsx`'s `getHeaderString`/`fs.statDir(p)` call inside a `.map()` during
JSX construction. An HTTP `HEAD` call is inherently async, so making `_url`
sizing possible means introducing an async boundary somewhere. We're making
`size()` (and its callers `calculateSizeDir`, `statFile`, `statDir`) return
`Promise<number>` outright, rather than adding a parallel async-only method —
this keeps one source of truth for "the size of this entry" instead of two
diverging implementations. The consumers absorb the async boundary by
rendering synchronously-available data immediately and patching resolved
sizes in as they arrive (see "Consumer changes" below) — no call site blocks
its own rendering on a network round trip.

## Chosen approach

### 1. `src/SystemFolder/SystemResources/File/ClassicyFileSystem.ts`

`size()` becomes `async size(path): Promise<number>`, checked in this order:

1. **`_data` present** — try `decompressFromBase64(entry._data as string)`
   (from `base64Compression.ts`) and return `bytes.byteLength`, the
   *uncompressed* size. If decompression throws (data isn't valid gzip —
   covers today's legacy PDFViewer URL-string `_data` and plain-text
   SimpleText `_data`, both of which predate/are outside the compression
   work), fall back to the existing
   `new Blob(String(entry._data).split("")).size` calculation. This means
   `size()` works correctly today and automatically starts reporting true
   uncompressed size once the Phase 1 compression work lands — no landing-
   order dependency between the two efforts.
2. **`_size` already a number** — return it as-is (this is "the size as
   provided in the metadata").
3. **`_url` present (and no `_data`)** — `fetch(url, { method: "HEAD", signal:
   AbortSignal.timeout(8000) })`. On success with a numeric `Content-Length`:
   mutate `entry._size` in place (writes through to the live tree, since
   `resolve()` returns a direct reference, not a clone) and return it — this
   caches the result so future calls for the same entry never re-fetch. On
   any failure (network error, CORS block, non-2xx, missing/non-numeric
   `Content-Length`, or the 8s timeout) — return `-1`, **without** caching the
   failure, so a later call (e.g. the next time a Finder folder is opened)
   can retry.
4. **`_type === Directory`** — delegate to `calculateSizeDir`.
5. Otherwise — `-1` (unchanged).

`calculateSizeDir(path)` becomes `async calculateSizeDir(path): Promise<number>`.
It still walks all descendant `_type: "file"` entries, but resolves them
concurrently via `Promise.all(...)` instead of a synchronous loop, and sums
only non-negative results — matches today's `childSize > 0` filtering, so one
unreachable `_url` file or undecodable `_data` doesn't poison the whole
folder's total.

`statFile(path)` and `statDir(path)` become `Promise`-returning, `await`-ing
the now-async `size`/`calculateSizeDir` calls internally. Their other fields
(`_count`, `_countHidden`, `_name`, `_path`, `_type`, filtered metadata) are
unaffected and remain cheap/synchronous in origin.

### 2. `src/SystemFolder/SystemResources/File/ClassicyFileBrowserViewTable.tsx`

The size column is sortable
(`columnHelper.accessor((row) => row._size, ...)`), so resolved sizes must
live in the actual row data TanStack Table sorts on — not in an isolated
per-cell component's local state, which sorting can't see.

- `fileList` changes from `useMemo` to `useState` + `useEffect`. The effect
  builds the row list synchronously first (same field-copying logic as
  today; `_size` left as whatever's already cached on the entry, or
  `undefined` if not), calls `setFileList(initial)` immediately so the table
  renders right away, then for any row still missing a resolved size, calls
  `fs.size(entry)` per row and patches just that row's `_size` into state as
  each resolves — matched by `_path` so a stale resolution can't clobber a
  newer list after `path`/`fs` changes.
- Size cell rendering: `_size === undefined` → `"Calculating…"`;
  `_size === -1` → `"—"`; otherwise `fs.formatSize(_size)`.
- Sorting behaves correctly throughout: rows re-sort as each size streams in,
  same as any progressively-loading table.

### 3. `src/SystemFolder/Finder/Finder.tsx`

- The per-path window render (`finderData.openPaths.map((p) => ...)`) can no
  longer call `fs.statDir(p)` synchronously inline, since a folder containing
  even one broken/unreachable `_url` file would otherwise delay the *entire
  window* from appearing while `calculateSizeDir`'s `Promise.all` waits on
  it.
- `statDir`'s field-building splits into a synchronous shell (today's
  `_count`/`_countHidden`/`_name`/`_path`/`_type`/filtered metadata — none of
  which need network I/O) computed immediately so the window opens instantly,
  and the `_size` field resolved separately via `calculateSizeDir` in a
  `useEffect`, patched into local component state once ready.
- `getHeaderString` shows `"Calculating…"` in place of
  `fs.formatSize(dir._size || 0)` until that state resolves.

## Data flow

For a `_url`-only file entry: `fs.size(entry)` → no `_data` → no cached
`_size` → `fetch(HEAD)` → `Content-Length` read → `entry._size` mutated in
place on the live tree → resolved number returned → consumer patches it into
its own render state → UI updates from `"Calculating…"` to the formatted
size. Every subsequent call for that same entry (same session) short-circuits
at step 2 (`_size` already present) with no further network calls.

For a `_data` file entry (once Phase 1 compression lands): `fs.size(entry)` →
`decompressFromBase64(entry._data)` → `bytes.byteLength` returned directly,
no caching needed since decompression is local/cheap and deterministic.

For a directory: `fs.calculateSizeDir(entry)` → gathers all `_type: "file"`
descendants → `Promise.all` resolves each via `fs.size()` (recursing into the
above two cases, or nested directories) → sum of non-negative results.

## Error handling / edge cases

- `_url` fetch throws synchronously-visible errors (CORS block, DNS failure,
  offline) → caught, `-1` returned, nothing cached — retryable next call.
- `_url` fetch succeeds but response isn't `ok`, or has no numeric
  `Content-Length` → `-1`, nothing cached — retryable (server might start
  reporting it later, e.g. after a config fix).
- `_url` fetch hangs (unresponsive host) → `AbortSignal.timeout(8000)` aborts
  it, surfacing as a caught error → `-1`, same as any other failure. Without
  this, a single bad host could leave a row stuck on `"Calculating…"`
  indefinitely.
- `Content-Length` is one of the CORS-safelisted response headers, so as long
  as the server allows the cross-origin request at all
  (`Access-Control-Allow-Origin` present), it's readable without the server
  needing `Access-Control-Expose-Headers`. A server that blocks CORS entirely
  (the scenario behind the recent "CORS-blocked second demo PDF URL" fix)
  makes `fetch` reject outright, already covered by the failure path above.
- `_data` present but not valid gzip (legacy PDFViewer URL-string `_data`,
  SimpleText plain-text `_data`) → `decompressFromBase64` throws → caught,
  falls back to today's raw Blob-length calculation. No behavior change for
  any entry that isn't using the new compressed-`_data` convention yet.
- Both `_url` and `_data` present on one entry → `_data` branch wins (checked
  first), matching the Phase 1 resolver's precedence.
- A directory containing a mix of resolvable and unresolvable `_url` files →
  total reflects only the resolvable ones (matches existing `childSize > 0`
  behavior for any unknown-size child today).
- Concurrent calls for the same `_url` entry before the first `HEAD`
  resolves (e.g. table re-render firing the effect again for the same row)
  are out of scope for de-duplication in this pass — each independently
  issues its own `HEAD` and both end up writing the same resolved value to
  `entry._size`; harmless but not optimally efficient. Worth revisiting only
  if it shows up as a real problem in practice.

## Testing (vitest, alongside existing `*.test.ts`)

`ClassicyFileSystem.test.ts` (extend/new): valid-gzip `_data` → decompressed
`byteLength`; non-gzip `_data` → Blob-length fallback; pre-set `_size` on a
`_url` entry → returned directly with no `fetch` call made; `_url` + mocked
successful `HEAD` (`Content-Length` header) → correct size *and*
`entry._size` mutated on the resolved object; `_url` + mocked failed/CORS
`HEAD` → `-1`, `entry._size` left unset; `_url` + `ok` response missing
`Content-Length` → `-1`; `_url` + mocked hang exceeding the timeout → `-1`;
directory type delegates to `calculateSizeDir` and sums recursively excluding
negative/failed children.

`ClassicyFileBrowserViewTable.test.tsx` (extend existing): mock `fs.size`
with a controllable/delayed promise; assert `"Calculating…"` renders first,
then the resolved formatted size (or `"—"` for `-1`); assert the size column
sort order reflects resolved values once settled, not just initial/cached
ones.

`Finder.test.tsx` (extend existing): mock `fs.calculateSizeDir`; assert the
folder window renders immediately (not gated on the size promise) and the
header shows `"Calculating…"` then updates once the mocked promise resolves.

## Rollout

Lands as its own commit(s) on `main` per the current workflow for this
effort, independent of (and without a landing-order dependency on) the
Phase 1 content-resolver / compression work landing in parallel.
