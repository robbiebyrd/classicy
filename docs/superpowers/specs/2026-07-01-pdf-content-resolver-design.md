# Generic Filesystem Content Resolver (Phase 1 of 3) — Design Spec

**Date:** 2026-07-01
**Status:** Approved design, pending implementation
**Repo:** `github.com/robbiebyrd/classicy`

## Problem

PDF Viewer's two seeded demo files (`docs/superpowers/specs/2026-06-30-pdf-viewer-design.md`)
currently store their content location in `_data` as a plain URL string, fetched
directly by `pdfjs-dist`. This conflates two genuinely different things under
one field: `_data` is documented as "the contents of the file"
(`ClassicyFileSystemEntryMetadata`), but for these entries it actually holds a
*reference* to content, not the content itself.

We want `ClassicyFileSystemEntry` to properly distinguish the two:

- `_url` — an actual URL to fetch the entry's content from.
- `_data` — the entry's content itself, embedded directly, as compressed
  base64.

This is Phase 1 of a three-phase effort. PDF Viewer is the only consumer in
this phase; `SimpleText` (plain-text `_data`) and `QuickTime`
(JSON-blob-in-`_data` for video/audio) each need their own separate design —
their existing `_data` conventions don't reduce to "URL or embedded bytes"
cleanly, and retrofitting them is out of scope here. See "Follow-on phases"
below.

## Key architectural constraint

The resolution logic (`_data` vs `_url`, with `_data` taking precedence) must
stay genuinely reusable by any future file-opening app — not embedded inside
`PDFViewer.tsx`. But the actual *decoding* of `_data` into a usable value
differs per consumer (PDF Viewer wants raw bytes for `pdfjs-dist`; a future
`SimpleText` migration would want UTF-8 text) — decoding is not generic and
stays in each consumer's own code.

A second constraint: `PDFViewerDocument`'s loading `useEffect` must stay keyed
on **primitive** values (strings), not on a resolver-output object or on
decoded bytes. A freshly constructed object or `Uint8Array` has a new identity
every render even when its content is unchanged, which would re-trigger the
PDF load (and, worse, an async gzip decompression) on every single render.
Resolution therefore only ever produces strings; decoding happens inside the
effect, at the point of use, keyed on those strings.

## Chosen approach: two-layer resolver, no new dependency

**Layer 1 — `base64Compression.ts`** (`SystemResources/Utils/`): a fully
generic byte-level utility, with zero knowledge of filesystems or PDFs.
Compresses arbitrary bytes with gzip (via the native `CompressionStream`/
`DecompressionStream` Web APIs — available in Node 18+ and all target
browsers) and encodes/decodes them as URL-safe base64
(RFC 4648 §5 — `-`/`_` alphabet, no padding).

**Layer 2 — `ClassicyFileSystemContentResolver.ts`**
(`SystemResources/File/`): generic to `ClassicyFileSystemEntry`, not to any
one app. Reads `_data`/`_url` and returns a discriminated union describing
which one to use (`_data` wins if both are present) — pure string-level logic,
no decoding.

We evaluated pulling in `base64-compressor` (github.com/eliot-akira/base64-compressor,
MIT licensed) instead of writing Layer 1 ourselves — its `encodeBinary`/
`decodeBinary` do exactly this. Rejected: it's a very thin wrapper (~20 lines)
around the same native Web APIs we'd call directly, has zero runtime
dependencies of its own, but is low-adoption (7 GitHub stars) and hasn't been
updated since January 2024. Since `classicy` is itself a published library,
every dependency we add ships to every consumer's install — not worth it for
logic this small. Rejected reimplementing it as JSON-value encode/decode
(the library's other pair, `encode`/`decode`) too: nothing in this phase needs
to compress arbitrary JS objects, only binary file content.

## Changes

### 1. `src/SystemFolder/SystemResources/Utils/base64Compression.ts` (new)

```ts
export async function compressToBase64(data: Uint8Array | ArrayBuffer): Promise<string>;
export async function decompressFromBase64(base64url: string): Promise<Uint8Array>;
```

Internals: `gzipCompress`/`gzipDecompress` via `new Blob([bytes]).stream().pipeThrough(new CompressionStream("gzip"))`
(and `DecompressionStream` for the reverse), then `new Response(stream).arrayBuffer()`.
Base64url encode/decode via `btoa`/`atob` plus `+`/`-`, `/`/`_`, padding-strip
translation (RFC 4648 §5) — no new dependency.

### 2. `src/SystemFolder/SystemResources/File/ClassicyFileSystemContentResolver.ts` (new)

```ts
export type ClassicyFileSystemEntrySource =
	| { kind: "url"; url: string }
	| { kind: "data"; data: string } // compressed + base64url-encoded
	| { kind: "none" };

export function resolveFileSystemEntrySource(
	entry: ClassicyFileSystemEntry | undefined,
): ClassicyFileSystemEntrySource;
```

`_data` wins if both `_url` and `_data` are non-empty strings; falls back to
`_url`; `{kind: "none"}` if neither is set or `entry` is `undefined`.

### 3. `src/SystemFolder/SystemResources/File/ClassicyFileSystemModel.ts`

Update `_url`'s doc comment from "The URL if the file is a 'shortcut' type" to
"The URL to fetch this entry's content from (also used for shortcut
targets)" — it's no longer shortcut-only.

### 4. `src/SystemFolder/PDFViewer/PDFViewer.tsx`

Replace the inline `entry?._data` URL read with the resolver, passing two
primitive props to `PDFViewerDocument`:

```tsx
const entry = fs.resolve(filePath);
const source = resolveFileSystemEntrySource(entry);
// ...
<PDFViewerDocument
	url={source.kind === "url" ? source.url : ""}
	data={source.kind === "data" ? source.data : undefined}
/>
```

### 5. `src/SystemFolder/PDFViewer/PDFViewerDocument.tsx`

`PDFViewerDocumentProps` gains `data?: string`. The loading effect wraps in an
async IIFE so decompression (an extra async step) can happen before the
pdf.js load starts, checking cancellation in between:

```tsx
useEffect(() => {
	let cancelled = false;
	let loadingTask: ReturnType<typeof getDocument> | null = null;
	setDoc(null); setError(false); setPageError(false); setCurrentPage(1);

	(async () => {
		try {
			const source = data ? { data: await decompressFromBase64(data) } : { url };
			if (cancelled) return;
			loadingTask = getDocument(source);
			const loadedDoc = await loadingTask.promise;
			if (!cancelled) setDoc(loadedDoc);
		} catch {
			if (!cancelled) setError(true);
		}
	})();

	return () => {
		cancelled = true;
		loadingTask?.destroy();
	};
}, [url, data]);
```

`data` truthy takes precedence over `url`, matching the resolver's precedence.

### 6. `src/SystemFolder/SystemResources/File/DefaultClassicyFileSystem.ts`

- `Sample.pdf` / `Sample 2.pdf`: move their URL from `_data` to `_url`.
  Otherwise unchanged.
- New `Sample 3.pdf`: `_type: Pdf`, `_mimeType: "application/pdf"`,
  `_icon: documentIcon`, `_data` set to the gzip + base64url-encoded bytes of
  a minimal single-page PDF. The compressed string can't be hand-computed —
  it's generated once during implementation by actually running
  `compressToBase64` over real minimal PDF bytes (e.g. via a throwaway
  Node/vitest script), and the resulting string is hardcoded into the fixture,
  the same way the two URL strings are hardcoded today.

## Data flow

`fs.resolve(filePath)` → `resolveFileSystemEntrySource(entry)` (cheap,
string-only, safe every render) → two primitive props → `PDFViewerDocument`'s
effect only does real work (decompression, network fetch, pdf.js parse) when
`url`/`data` actually change. For `data`: base64url-decode → gzip-decompress
→ `Uint8Array` → `pdfjs-dist`'s `getDocument({ data })`. For `url`: unchanged
from today, `getDocument({ url })`, fetched by pdf.js itself.

## Error handling / edge cases

- No entry, or entry with neither `_url` nor `_data` → `{kind: "none"}` →
  `url=""`, `data=undefined` → falls through to `getDocument({url: ""})`,
  which fails exactly as it does today → existing "Couldn't load this PDF."
  error state. No new code path.
- Malformed base64 in `_data` → `atob()` throws inside
  `decompressFromBase64` → caught by the effect's `try`/`catch` → same error
  state.
- Valid base64 but not valid gzip → `DecompressionStream` rejects → same
  catch → same error state.
- Fast unmount/path-change while decompression is in flight → `cancelled` is
  checked immediately after `await decompressFromBase64(...)`, before
  `getDocument()` is ever called, so no orphaned pdf.js task is created. If
  cancellation happens after `getDocument()` was already called, the existing
  `loadingTask?.destroy()` cleanup still applies.
- Both `_url` and `_data` present on one entry → `_data` wins, `_url` is
  silently ignored. Only matters for hand-authored/malformed fixtures; none
  of the three real seeded PDFs set both.
- `SimpleText` and other apps are entirely unaffected — they don't call the
  resolver and don't read `_url`; their existing plain-text `_data`
  convention is untouched by this phase.

## Testing (vitest, alongside existing `*.test.ts`)

`base64Compression.test.ts` (new): round-trip restores original bytes for
both empty and non-trivial input; output contains no `+`/`/`/`=` characters;
`decompressFromBase64` rejects on invalid base64 and on valid-base64-but-not-
gzip input.

`ClassicyFileSystemContentResolver.test.ts` (new): only `_url` set → `{kind:
"url", ...}`; only `_data` set → `{kind: "data", ...}`; both set → `_data`
wins; neither set, and `entry === undefined` → `{kind: "none"}`.

`PDFViewerDocument.test.tsx` (extend existing): a `data`-prop case that loads
successfully using a real tiny compressed PDF (exercises
`decompressFromBase64` for real, not mocked); a decompression-failure case
asserting the existing error UI; a case confirming the effect doesn't refire
when an equal `data` string is passed again across a re-render.

`DefaultClassicyFileSystem.test.ts` (update existing): the two current tests
assert `entry?._data` matches `/^https?:\/\//` for `Sample.pdf`/`Sample
2.pdf` — that assertion moves to `entry?._url`. New test for `Sample 3.pdf`:
`_data` is a string, and running it through `decompressFromBase64` yields
bytes starting with the PDF magic number (`%PDF`) — a real sanity check that
the hardcoded fixture is genuinely valid compressed PDF content.

## Follow-on phases (separate spec/plan/implementation cycles each)

1. **SimpleText**: migrate plain-text `_data` to compressed base64 (decode via
   `decompressFromBase64` + `TextDecoder`, encode on save via `writeFile`).
   Real design question: default text fixtures become unreadable base64 blobs
   in source instead of literal strings — worth deciding how to keep them
   authorable.
2. **QuickTime** (`.mov`/`.mp3`): `_data` today is a JSON blob (`url` +
   `name` + HLS `options` + `subtitlesUrl`) — the URL is nested inside JSON,
   not in `_url`, and actual media is never embedded as base64 (impractical
   file size). Needs a real decision about where the non-URL config
   (`options`, `subtitlesUrl`, `name`) lives once `url` moves to `_url`.

## Rollout

Committed directly to `main` per the current workflow for this effort (no
feature branch/PR) — each phase lands as its own set of commits before the
next phase starts, so `main` never sits in a half-migrated state between
phases.
