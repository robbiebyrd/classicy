# PDF Content Resolver Implementation Plan (Phase 1 of 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let `ClassicyFileSystemEntry` distinguish "fetch content from this URL" (`_url`) from "here is the content, embedded" (`_data`, compressed + base64url-encoded), starting with PDF Viewer as the first consumer of a genuinely generic resolver.

**Architecture:** A byte-level compression utility (gzip + URL-safe base64, native Web APIs, no new dependency) sits under a filesystem-entry-level resolver (`_data` vs `_url`, `_data` wins). PDF Viewer consumes both: the resolver picks a source, then decodes/decompresses at the point of use inside its loading effect, keyed on primitive strings so a fresh render never re-triggers a reload.

**Tech Stack:** TypeScript, native `CompressionStream`/`DecompressionStream` (Node 18+ and target browsers), `pdfjs-dist` (existing dependency), Vitest + `@testing-library/react`.

**Spec:** `docs/superpowers/specs/2026-07-01-pdf-content-resolver-design.md`

## Global Constraints

- Precedence: when an entry has both `_data` and `_url` set, `_data` wins.
- No new npm dependency — compression/encoding is implemented locally using native `CompressionStream`/`DecompressionStream`, not the `base64-compressor` package.
- Base64 encoding is RFC 4648 §5 URL-safe (`-`/`_` alphabet, no `+`/`/`/`=` padding).
- `PDFViewerDocument`'s loading `useEffect` must stay keyed on primitive string props (`url`, `data`) only — never on a resolver-output object or decoded `Uint8Array`, since those get a fresh identity every render.
- `SimpleText` and `QuickTime` (`.mov`/`.mp3`) are explicitly out of scope for this phase — do not modify their file-opening logic or fixtures.
- The existing `Sample.pdf`/`Sample 2.pdf` URL values (`https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf` and `https://raw.githubusercontent.com/mozilla/pdf.js/master/test/pdfs/hello_world_rotated.pdf`) must be preserved exactly — only the field they live under changes, from `_data` to `_url`.
- Work happens directly on `main` per the current workflow for this effort — no feature branch/PR.

---

### Task 1: Base64 gzip compression utility

**Files:**
- Create: `src/SystemFolder/SystemResources/Utils/base64Compression.ts`
- Test: `src/SystemFolder/SystemResources/Utils/base64Compression.test.ts`

**Interfaces:**
- Produces: `export async function compressToBase64(data: Uint8Array | ArrayBuffer): Promise<string>` and `export async function decompressFromBase64(base64url: string): Promise<Uint8Array>` — consumed by Task 3 (`PDFViewerDocument.tsx`) and Task 4 (`DefaultClassicyFileSystem.test.ts`, and the one-off fixture-generation script).

- [ ] **Step 1: Write the failing tests**

Create `src/SystemFolder/SystemResources/Utils/base64Compression.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
	compressToBase64,
	decompressFromBase64,
} from "@/SystemFolder/SystemResources/Utils/base64Compression";

describe("base64Compression", () => {
	it("round-trips non-trivial binary data", async () => {
		const original = new TextEncoder().encode(
			"The quick brown fox jumps over the lazy dog. ".repeat(20),
		);
		const encoded = await compressToBase64(original);
		const decoded = await decompressFromBase64(encoded);
		expect(decoded).toEqual(original);
	});

	it("round-trips empty data", async () => {
		const original = new Uint8Array(0);
		const encoded = await compressToBase64(original);
		const decoded = await decompressFromBase64(encoded);
		expect(decoded).toEqual(original);
	});

	it("produces a URL-safe string with no +, /, or = characters", async () => {
		// Enough entropy that a naive standard-base64 encoding would almost
		// certainly contain at least one of +, /, or = somewhere.
		const original = crypto.getRandomValues(new Uint8Array(256));
		const encoded = await compressToBase64(original);
		expect(encoded).not.toMatch(/[+/=]/);
	});

	it("accepts an ArrayBuffer as well as a Uint8Array", async () => {
		const bytes = new TextEncoder().encode("hello");
		const buffer = bytes.buffer.slice(
			bytes.byteOffset,
			bytes.byteOffset + bytes.byteLength,
		);
		const encoded = await compressToBase64(buffer);
		const decoded = await decompressFromBase64(encoded);
		expect(decoded).toEqual(bytes);
	});

	it("rejects invalid base64 input", async () => {
		await expect(
			decompressFromBase64("not valid base64!! ***"),
		).rejects.toThrow();
	});

	it("rejects valid base64 that is not valid gzip data", async () => {
		const notGzipped = btoa("just some plain text, not gzip-compressed")
			.replace(/\+/g, "-")
			.replace(/\//g, "_")
			.replace(/=+$/, "");
		await expect(decompressFromBase64(notGzipped)).rejects.toThrow();
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/SystemFolder/SystemResources/Utils/base64Compression.test.ts`
Expected: FAIL — `Failed to resolve import "@/SystemFolder/SystemResources/Utils/base64Compression"` (module doesn't exist yet).

- [ ] **Step 3: Write the implementation**

Create `src/SystemFolder/SystemResources/Utils/base64Compression.ts`:

```ts
async function gzipCompress(bytes: Uint8Array): Promise<Uint8Array> {
	const stream = new Blob([bytes])
		.stream()
		.pipeThrough(new CompressionStream("gzip"));
	return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function gzipDecompress(bytes: Uint8Array): Promise<Uint8Array> {
	const stream = new Blob([bytes])
		.stream()
		.pipeThrough(new DecompressionStream("gzip"));
	return new Uint8Array(await new Response(stream).arrayBuffer());
}

function bytesToBase64Url(bytes: Uint8Array): string {
	let binary = "";
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary)
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");
}

function base64UrlToBytes(base64url: string): Uint8Array {
	const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
	const padding = (4 - (base64.length % 4)) % 4;
	const binary = atob(base64 + "=".repeat(padding));
	return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

/**
 * Gzip-compresses `data` and encodes it as a URL-safe base64 string
 * (RFC 4648 §5 — `-`/`_` alphabet, no padding).
 */
export async function compressToBase64(
	data: Uint8Array | ArrayBuffer,
): Promise<string> {
	const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
	const compressed = await gzipCompress(bytes);
	return bytesToBase64Url(compressed);
}

/**
 * Reverses `compressToBase64`: decodes a URL-safe base64 string and
 * gzip-decompresses it back to the original bytes.
 */
export async function decompressFromBase64(
	base64url: string,
): Promise<Uint8Array> {
	const compressed = base64UrlToBytes(base64url);
	return gzipDecompress(compressed);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/SystemFolder/SystemResources/Utils/base64Compression.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/SystemFolder/SystemResources/Utils/base64Compression.ts src/SystemFolder/SystemResources/Utils/base64Compression.test.ts
git commit -m "feat: add base64Compression gzip+base64url utility"
```

- [ ] **Step 6: Push**

```bash
git push origin main
```

---

### Task 2: Generic filesystem-entry content resolver

**Files:**
- Create: `src/SystemFolder/SystemResources/File/ClassicyFileSystemContentResolver.ts`
- Test: `src/SystemFolder/SystemResources/File/ClassicyFileSystemContentResolver.test.ts`
- Modify: `src/SystemFolder/SystemResources/File/ClassicyFileSystemModel.ts:27` (doc comment only)

**Interfaces:**
- Consumes: `ClassicyFileSystemEntry` type (`@/SystemFolder/SystemResources/File/ClassicyFileSystemModel`).
- Produces: `export type ClassicyFileSystemEntrySource = {kind:"url", url:string} | {kind:"data", data:string} | {kind:"none"}` and `export function resolveFileSystemEntrySource(entry: ClassicyFileSystemEntry | undefined): ClassicyFileSystemEntrySource` — consumed by Task 3 (`PDFViewer.tsx`).

- [ ] **Step 1: Write the failing tests**

Create `src/SystemFolder/SystemResources/File/ClassicyFileSystemContentResolver.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { resolveFileSystemEntrySource } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemContentResolver";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";

describe("resolveFileSystemEntrySource", () => {
	it("resolves to url when only _url is set", () => {
		const entry = {
			_type: ClassicyFileSystemEntryFileType.Pdf,
			_url: "https://example.com/sample.pdf",
		};
		expect(resolveFileSystemEntrySource(entry)).toEqual({
			kind: "url",
			url: "https://example.com/sample.pdf",
		});
	});

	it("resolves to data when only _data is set", () => {
		const entry = {
			_type: ClassicyFileSystemEntryFileType.Pdf,
			_data: "H4sIAAAAAAAA",
		};
		expect(resolveFileSystemEntrySource(entry)).toEqual({
			kind: "data",
			data: "H4sIAAAAAAAA",
		});
	});

	it("prefers _data over _url when both are set", () => {
		const entry = {
			_type: ClassicyFileSystemEntryFileType.Pdf,
			_url: "https://example.com/sample.pdf",
			_data: "H4sIAAAAAAAA",
		};
		expect(resolveFileSystemEntrySource(entry)).toEqual({
			kind: "data",
			data: "H4sIAAAAAAAA",
		});
	});

	it("resolves to none when neither is set", () => {
		const entry = { _type: ClassicyFileSystemEntryFileType.Pdf };
		expect(resolveFileSystemEntrySource(entry)).toEqual({ kind: "none" });
	});

	it("resolves to none when entry is undefined", () => {
		expect(resolveFileSystemEntrySource(undefined)).toEqual({ kind: "none" });
	});

	it("resolves to none when _url/_data are empty strings", () => {
		const entry = {
			_type: ClassicyFileSystemEntryFileType.Pdf,
			_url: "",
			_data: "",
		};
		expect(resolveFileSystemEntrySource(entry)).toEqual({ kind: "none" });
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/SystemFolder/SystemResources/File/ClassicyFileSystemContentResolver.test.ts`
Expected: FAIL — module doesn't exist yet.

- [ ] **Step 3: Write the implementation**

Create `src/SystemFolder/SystemResources/File/ClassicyFileSystemContentResolver.ts`:

```ts
import type { ClassicyFileSystemEntry } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";

export type ClassicyFileSystemEntrySource =
	| { kind: "url"; url: string }
	| { kind: "data"; data: string }
	| { kind: "none" };

/**
 * Resolves what content source an entry should be opened from. `_data`
 * (compressed + base64url-encoded bytes, see base64Compression.ts) takes
 * precedence over `_url` when both are present. Any app opening a file from
 * ClassicyFileSystem can use this instead of reading `_url`/`_data` directly.
 */
export function resolveFileSystemEntrySource(
	entry: ClassicyFileSystemEntry | undefined,
): ClassicyFileSystemEntrySource {
	if (typeof entry?._data === "string" && entry._data.length > 0) {
		return { kind: "data", data: entry._data };
	}
	if (typeof entry?._url === "string" && entry._url.length > 0) {
		return { kind: "url", url: entry._url };
	}
	return { kind: "none" };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/SystemFolder/SystemResources/File/ClassicyFileSystemContentResolver.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Update the `_url` doc comment**

In `src/SystemFolder/SystemResources/File/ClassicyFileSystemModel.ts`, replace line 27:

```ts
	// The URL if the file is a 'shortcut' type
```

with:

```ts
	// The URL to fetch this entry's content from (also used for shortcut targets)
```

- [ ] **Step 6: Run the full suite to confirm the comment-only change didn't break anything**

Run: `pnpm test`
Expected: PASS, same count as before this task.

- [ ] **Step 7: Commit**

```bash
git add src/SystemFolder/SystemResources/File/ClassicyFileSystemContentResolver.ts src/SystemFolder/SystemResources/File/ClassicyFileSystemContentResolver.test.ts src/SystemFolder/SystemResources/File/ClassicyFileSystemModel.ts
git commit -m "feat: add resolveFileSystemEntrySource generic content resolver"
```

- [ ] **Step 8: Push**

```bash
git push origin main
```

---

### Task 3: Wire PDF Viewer to the resolver and compression utility

**Files:**
- Modify: `src/SystemFolder/PDFViewer/PDFViewer.tsx`
- Modify: `src/SystemFolder/PDFViewer/PDFViewerDocument.tsx`
- Modify: `src/SystemFolder/PDFViewer/PDFViewerDocument.test.tsx`

**Interfaces:**
- Consumes: `resolveFileSystemEntrySource` (Task 2), `decompressFromBase64` (Task 1).
- Produces: `PDFViewerDocumentProps` gains `data?: string`, consumed nowhere else in this phase (SimpleText/QuickTime are out of scope).

- [ ] **Step 1: Write the failing tests**

In `src/SystemFolder/PDFViewer/PDFViewerDocument.test.tsx`, add this import after the existing `import { PDFViewerDocument } from "@/SystemFolder/PDFViewer/PDFViewerDocument";` line:

```ts
import { compressToBase64 } from "@/SystemFolder/SystemResources/Utils/base64Compression";
```

Append these tests inside the existing `describe("PDFViewerDocument", ...)` block, after the last existing `it(...)`:

```ts
	it("loads via the data prop, decoding it for real before calling getDocument", async () => {
		const compressed = await compressToBase64(
			new TextEncoder().encode("fake pdf bytes for testing"),
		);
		render(<PDFViewerDocument url="" data={compressed} />);
		expect(await screen.findByText("Page 1 of 3")).toBeInTheDocument();
		expect(getDocumentMock).toHaveBeenCalledTimes(1);
		const calledWith = getDocumentMock.mock.calls[0][0];
		expect(calledWith).toHaveProperty("data");
		expect(calledWith.data).toBeInstanceOf(Uint8Array);
		expect(new TextDecoder().decode(calledWith.data)).toBe(
			"fake pdf bytes for testing",
		);
	});

	it("prefers data over url when both are provided", async () => {
		const compressed = await compressToBase64(
			new TextEncoder().encode("data wins"),
		);
		render(
			<PDFViewerDocument
				url="http://example.com/sample.pdf"
				data={compressed}
			/>,
		);
		await screen.findByText("Page 1 of 3");
		const calledWith = getDocumentMock.mock.calls[0][0];
		expect(calledWith).toHaveProperty("data");
		expect(calledWith).not.toHaveProperty("url");
	});

	it("shows the error state when data fails to decompress", async () => {
		render(<PDFViewerDocument url="" data="not valid compressed data" />);
		expect(
			await screen.findByText("Couldn't load this PDF."),
		).toBeInTheDocument();
		expect(getDocumentMock).not.toHaveBeenCalled();
	});

	it("does not refire the loading effect when an equal data string is passed again across a re-render", async () => {
		const compressed = await compressToBase64(
			new TextEncoder().encode("stable content"),
		);
		const { rerender } = render(<PDFViewerDocument url="" data={compressed} />);
		await screen.findByText("Page 1 of 3");
		expect(getDocumentMock).toHaveBeenCalledTimes(1);
		// Same string value, but a fresh render (simulating a parent
		// re-render that recomputes `source.data` from scratch) — since the
		// prop is a primitive string, the effect must treat this as
		// "unchanged", not refire the load.
		rerender(<PDFViewerDocument url="" data={compressed} />);
		expect(getDocumentMock).toHaveBeenCalledTimes(1);
	});

	it("does not call getDocument if unmounted while data is still decompressing", async () => {
		const compressed = await compressToBase64(
			new TextEncoder().encode("unmount before decompress settles"),
		);
		const { unmount } = render(<PDFViewerDocument url="" data={compressed} />);
		// Unmount synchronously, right after render — before the in-flight
		// decompression (a genuinely async operation: Blob/CompressionStream
		// APIs never resolve synchronously) has any chance to settle. This is
		// the exact race the effect's `cancelled` check before creating the
		// pdf.js loading task exists to guard against.
		unmount();
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(getDocumentMock).not.toHaveBeenCalled();
		expect(mockLoadingTaskDestroy).not.toHaveBeenCalled();
	});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/SystemFolder/PDFViewer/PDFViewerDocument.test.tsx`
Expected: FAIL — `data` prop doesn't exist on `PDFViewerDocumentProps` yet (TypeScript error) and/or `getDocumentMock` is called with `{ url: "" }` instead of `{ data: ... }`.

- [ ] **Step 3: Update `PDFViewerDocument.tsx`**

Add this import after the existing `ClassicyControlLabel` import:

```ts
import { decompressFromBase64 } from "@/SystemFolder/SystemResources/Utils/base64Compression";
```

Change the props interface:

```ts
interface PDFViewerDocumentProps {
	url: string;
	data?: string;
}
```

Change the destructured props in the component signature:

```ts
export const PDFViewerDocument: FunctionalComponent<PDFViewerDocumentProps> = ({
	url,
	data,
}) => {
```

Replace this entire block (the loading effect):

```tsx
	// Load the document whenever the URL changes
	useEffect(() => {
		let cancelled = false;
		setDoc(null);
		setError(false);
		setPageError(false);
		setCurrentPage(1);
		// `destroy()` lives on the loading task (not the resolved
		// PDFDocumentProxy), and is safe to call whether the load is still
		// in flight or has already settled — it aborts network requests and
		// tears down the worker/transport either way. Keeping the task in a
		// closure variable (rather than relying on `doc` state, which lags
		// one render behind) means cleanup always tears down the instance
		// that *this* effect run created, exactly once.
		const loadingTask = getDocument({ url });
		loadingTask.promise
			.then((loadedDoc) => {
				if (!cancelled) setDoc(loadedDoc);
			})
			.catch(() => {
				if (!cancelled) setError(true);
			});
		return () => {
			cancelled = true;
			loadingTask.destroy();
		};
	}, [url]);
```

with:

```tsx
	// Load the document whenever the URL or embedded data changes. `data`
	// (compressed + base64url-encoded bytes) takes precedence over `url` when
	// both are set, matching resolveFileSystemEntrySource's precedence.
	useEffect(() => {
		let cancelled = false;
		let loadingTask: ReturnType<typeof getDocument> | null = null;
		setDoc(null);
		setError(false);
		setPageError(false);
		setCurrentPage(1);
		// Decompressing `data` is an extra async step before pdf.js's own
		// load even starts, so the whole thing runs inside one async IIFE.
		// `cancelled` is checked right after that await, before creating the
		// loading task, so a fast unmount/re-run during decompression never
		// creates an orphaned task with nothing to destroy it.
		(async () => {
			try {
				const source = data
					? { data: await decompressFromBase64(data) }
					: { url };
				if (cancelled) return;
				// `destroy()` lives on the loading task (not the resolved
				// PDFDocumentProxy), and is safe to call whether the load is
				// still in flight or has already settled — it aborts network
				// requests and tears down the worker/transport either way.
				// Keeping the task in a closure variable (rather than relying
				// on `doc` state, which lags one render behind) means cleanup
				// always tears down the instance that *this* effect run
				// created, exactly once.
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

- [ ] **Step 4: Run PDFViewerDocument tests to verify they pass**

Run: `pnpm vitest run src/SystemFolder/PDFViewer/PDFViewerDocument.test.tsx`
Expected: PASS (all tests in the file, including the 5 new ones — the pre-existing url-based tests must still pass unmodified).

- [ ] **Step 5: Update `PDFViewer.tsx`**

Add this import after the existing `ClassicyFileSystemEntryFileType` import:

```ts
import { resolveFileSystemEntrySource } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemContentResolver";
```

Replace this block:

```tsx
			{openFiles.map((filePath: string, idx: number) => {
				const entry = fs.resolve(filePath);
				const url = typeof entry?._data === "string" ? entry._data : "";
				const fileName = filePath.split(":").pop() || filePath;

				return (
					<ClassicyWindow
						key={`${appId}_file_${filePath}`}
						id={`${appId}_file_${filePath}`}
						title={fileName}
						appId={appId}
						initialSize={[500, 600]}
						initialPosition={[200 + idx * 30, 80 + idx * 30]}
						appMenu={appMenu}
						onCloseFunc={() => closeFile(filePath)}
					>
						<PDFViewerDocument url={url} />
					</ClassicyWindow>
				);
			})}
```

with:

```tsx
			{openFiles.map((filePath: string, idx: number) => {
				const entry = fs.resolve(filePath);
				const source = resolveFileSystemEntrySource(entry);
				const fileName = filePath.split(":").pop() || filePath;

				return (
					<ClassicyWindow
						key={`${appId}_file_${filePath}`}
						id={`${appId}_file_${filePath}`}
						title={fileName}
						appId={appId}
						initialSize={[500, 600]}
						initialPosition={[200 + idx * 30, 80 + idx * 30]}
						appMenu={appMenu}
						onCloseFunc={() => closeFile(filePath)}
					>
						<PDFViewerDocument
							url={source.kind === "url" ? source.url : ""}
							data={source.kind === "data" ? source.data : undefined}
						/>
					</ClassicyWindow>
				);
			})}
```

- [ ] **Step 6: Run the full suite**

Run: `pnpm test`
Expected: PASS, no regressions (the two pre-existing `DefaultClassicyFileSystem.test.ts` tests still reference `_data` for `Sample.pdf`/`Sample 2.pdf` at this point — that's expected and correct, since Task 4 hasn't moved those fixtures to `_url` yet).

- [ ] **Step 7: Commit**

```bash
git add src/SystemFolder/PDFViewer/PDFViewer.tsx src/SystemFolder/PDFViewer/PDFViewerDocument.tsx src/SystemFolder/PDFViewer/PDFViewerDocument.test.tsx
git commit -m "feat: wire PDFViewer to resolveFileSystemEntrySource and base64Compression"
```

- [ ] **Step 8: Push**

```bash
git push origin main
```

---

### Task 4: Migrate seed PDFs to `_url`, add a third `_data`-based sample

**Files:**
- Modify: `src/SystemFolder/SystemResources/File/DefaultClassicyFileSystem.ts`
- Modify: `src/SystemFolder/SystemResources/File/DefaultClassicyFileSystem.test.ts`

**Interfaces:**
- Consumes: `decompressFromBase64` (Task 1, only in the test file and the one-off generation script — not a runtime dependency of the fixture data itself).

- [ ] **Step 1: Write the failing tests**

Replace the full contents of `src/SystemFolder/SystemResources/File/DefaultClassicyFileSystem.test.ts` with:

```ts
import { describe, expect, it } from "vitest";
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import { decompressFromBase64 } from "@/SystemFolder/SystemResources/Utils/base64Compression";

describe("DefaultClassicyFileSystem Pdf seed data", () => {
	it("seeds a Sample.pdf document with the Pdf file type and a URL", () => {
		const fs = new ClassicyFileSystem();
		const entry = fs.resolve("Macintosh HD:Documents:Sample.pdf");

		expect(entry?._type).toBe(ClassicyFileSystemEntryFileType.Pdf);
		expect(entry?._mimeType).toBe("application/pdf");
		expect(typeof entry?._url).toBe("string");
		expect(entry?._url as string).toMatch(/^https?:\/\//);
	});

	// A second, distinct demo PDF is seeded so multi-window support (two
	// *different* PDFs open simultaneously) can actually be exercised in the
	// browser — re-opening the same path is correctly a no-op per
	// PDFViewerContext's dedup-by-path reducer, so a single seeded file can
	// never demonstrate multi-window on its own.
	it("seeds a second, distinct Sample 2.pdf document with its own URL", () => {
		const fs = new ClassicyFileSystem();
		const sample1 = fs.resolve("Macintosh HD:Documents:Sample.pdf");
		const sample2 = fs.resolve("Macintosh HD:Documents:Sample 2.pdf");

		expect(sample2?._type).toBe(ClassicyFileSystemEntryFileType.Pdf);
		expect(sample2?._mimeType).toBe("application/pdf");
		expect(typeof sample2?._url).toBe("string");
		expect(sample2?._url as string).toMatch(/^https?:\/\//);
		expect(sample2?._url).not.toBe(sample1?._url);
	});

	it("seeds a third demo PDF, Sample 3.pdf, with compressed embedded data instead of a URL", async () => {
		const fs = new ClassicyFileSystem();
		const entry = fs.resolve("Macintosh HD:Documents:Sample 3.pdf");

		expect(entry?._type).toBe(ClassicyFileSystemEntryFileType.Pdf);
		expect(entry?._mimeType).toBe("application/pdf");
		expect(entry?._url).toBeUndefined();
		expect(typeof entry?._data).toBe("string");

		const decoded = await decompressFromBase64(entry?._data as string);
		const magicBytes = new TextDecoder().decode(decoded.slice(0, 5));
		expect(magicBytes).toBe("%PDF-");
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/SystemFolder/SystemResources/File/DefaultClassicyFileSystem.test.ts`
Expected: FAIL — `Sample.pdf`/`Sample 2.pdf` still have their URL in `_data`, not `_url` (so `entry?._url` is `undefined`), and `Sample 3.pdf` doesn't exist yet.

- [ ] **Step 3: Generate the compressed base64 value for Sample 3.pdf**

This value can't be hand-computed — generate it by actually running gzip over real PDF bytes. Write this script to a temporary location **outside the repository** (e.g. `/tmp/generate-sample3-pdf.mjs`) — it's a one-time generator, not part of the shipped feature, and should not be committed:

```js
// One-time generator for Sample 3.pdf's compressed _data value. Run with
// `node`, copy the single printed line, then delete this file.

async function gzipCompress(bytes) {
	const stream = new Blob([bytes])
		.stream()
		.pipeThrough(new CompressionStream("gzip"));
	return new Uint8Array(await new Response(stream).arrayBuffer());
}

function bytesToBase64Url(bytes) {
	let binary = "";
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary)
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");
}

function buildMinimalPdf() {
	const objects = {};
	objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
	objects[2] =
		"<< /Type /Pages /Kids [3 0 R] /Count 1 /MediaBox [0 0 300 144] >>";
	objects[3] =
		"<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>";
	const streamText = "BT /F1 24 Tf 20 60 Td (Hello, Classicy!) Tj ET";
	objects[4] = `<< /Length ${Buffer.byteLength(streamText, "latin1")} >>\nstream\n${streamText}\nendstream`;
	objects[5] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";

	let pdf = "%PDF-1.4\n";
	const offsets = [0];
	for (let i = 1; i <= 5; i++) {
		offsets.push(Buffer.byteLength(pdf, "latin1"));
		pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`;
	}
	const xrefOffset = Buffer.byteLength(pdf, "latin1");
	pdf += "xref\n0 6\n0000000000 65535 f \n";
	for (let i = 1; i <= 5; i++) {
		pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
	}
	pdf += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
	return Buffer.from(pdf, "latin1");
}

const pdfBytes = buildMinimalPdf();
const compressed = await gzipCompress(new Uint8Array(pdfBytes));
console.log(bytesToBase64Url(compressed));
```

Run: `node /tmp/generate-sample3-pdf.mjs`
Expected: prints one line — a base64url string (no `+`/`/`/`=` characters). Copy this exact string; it's the literal value for `Sample 3.pdf`'s `_data` field in Step 4 below. Delete `/tmp/generate-sample3-pdf.mjs` afterward — it has no further purpose.

- [ ] **Step 4: Update `DefaultClassicyFileSystem.ts`**

Replace this block (the `"Sample.pdf"` and `"Sample 2.pdf"` entries):

```ts
			"Sample.pdf": {
				_type: ClassicyFileSystemEntryFileType.Pdf,
				_mimeType: "application/pdf",
				_icon: documentIcon,
				_data:
					"https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf",
			},
			"Sample 2.pdf": {
				_type: ClassicyFileSystemEntryFileType.Pdf,
				_mimeType: "application/pdf",
				_icon: documentIcon,
				_data:
					"https://raw.githubusercontent.com/mozilla/pdf.js/master/test/pdfs/hello_world_rotated.pdf",
			},
```

with (substituting the string printed by the Step 3 script in place of `PASTE_GENERATED_VALUE_FROM_STEP_3_HERE`):

```ts
			"Sample.pdf": {
				_type: ClassicyFileSystemEntryFileType.Pdf,
				_mimeType: "application/pdf",
				_icon: documentIcon,
				_url:
					"https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf",
			},
			"Sample 2.pdf": {
				_type: ClassicyFileSystemEntryFileType.Pdf,
				_mimeType: "application/pdf",
				_icon: documentIcon,
				_url:
					"https://raw.githubusercontent.com/mozilla/pdf.js/master/test/pdfs/hello_world_rotated.pdf",
			},
			"Sample 3.pdf": {
				_type: ClassicyFileSystemEntryFileType.Pdf,
				_mimeType: "application/pdf",
				_icon: documentIcon,
				_data: "PASTE_GENERATED_VALUE_FROM_STEP_3_HERE",
			},
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm vitest run src/SystemFolder/SystemResources/File/DefaultClassicyFileSystem.test.ts`
Expected: PASS (3 tests). If the `Sample 3.pdf` test fails on the `%PDF-` magic-byte assertion, the generated PDF bytes were malformed — re-run the Step 3 script (check for typos if you hand-transcribed the script) and replace the value again; do not weaken the test.

- [ ] **Step 6: Run the full suite**

Run: `pnpm test`
Expected: PASS, no regressions.

- [ ] **Step 7: Commit**

```bash
git add src/SystemFolder/SystemResources/File/DefaultClassicyFileSystem.ts src/SystemFolder/SystemResources/File/DefaultClassicyFileSystem.test.ts
git commit -m "feat: migrate seed PDFs to _url, add Sample 3.pdf using compressed _data"
```

- [ ] **Step 8: Push**

```bash
git push origin main
```

---

## Final verification

- [ ] **Run the full suite and build end-to-end**

Run: `pnpm test`
Expected: PASS, including all new tests from Tasks 1–4.

Run: `pnpm build:source`
Expected: 0 TypeScript errors, clean Vite build.

Run: `pnpm lint`
Expected: no new errors (pre-existing unrelated errors, if any, are untouched by this work).

- [ ] **Manually verify in a real browser**

Start the dev server per the project's documented workflow (`pnpm preview`, which builds then runs the `example/` app with the source watcher — `example/src/app.tsx` already mounts `<PDFViewer />`). Open Finder, navigate to `Macintosh HD:Documents`, and open all three: `Sample.pdf`, `Sample 2.pdf`, `Sample 3.pdf`. Confirm each renders its first page on a canvas with a working page counter and toolbar, and that the browser console shows no errors. `Sample 3.pdf` should show the single page of text "Hello, Classicy!".
