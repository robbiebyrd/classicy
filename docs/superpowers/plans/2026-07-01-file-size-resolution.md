# Async File Size Resolution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `ClassicyFileSystem` report a real size for `_url`-only file entries (via HTTP `HEAD`, cached onto `_size`) and the true *uncompressed* size for gzip+base64 `_data` entries, and update the two UI consumers (the Finder file-browser table and Finder folder windows) to render progressively while those sizes resolve asynchronously.

**Architecture:** `size()`, `calculateSizeDir()`, `statFile()`, and `statDir()` on `ClassicyFileSystem` become `Promise`-returning. `statDir()` is split into a synchronous `statDirShell()` (count/name/path/type — no network) plus an awaited `calculateSizeDir()` call, so callers can render immediately and patch in the resolved size later. Both UI consumers lift resolved sizes into their own state (not into isolated per-cell components) so table sorting and the Finder header both see real values once resolved.

**Tech Stack:** TypeScript, React 18, Vitest, `@testing-library/react`, native `fetch`/`AbortSignal.timeout`, `CompressionStream`/`DecompressionStream` (via the existing `base64Compression.ts` utility).

## Global Constraints

- No new npm dependencies — use native `fetch`, `AbortSignal.timeout`, and the existing `base64Compression.ts` utility.
- `_data`-based entries that aren't valid gzip (legacy/plain-text `_data`) must keep working exactly as today — no landing-order dependency on the separate `_data` compression/content-resolver effort (already merged as of this plan, but `size()` must not assume every `_data` value is compressed).
- A resolved `_url` size is cached onto `entry._size` (mutates the live tree via the reference `resolve()` returns); a *failed* resolution is never cached, so it can be retried later.
- No UI call site may block its own rendering on a network round trip — synchronously-available data renders immediately; sizes patch in as they resolve.
- `calculateSizeDir()` sums exactly these `_type` values: `File`, `TextFile`, `Markdown`, `Pdf` — not `Directory`/`Drive` (containers) and not `Shortcut`/`AppShortcut` (out of scope for this plan).
- Tests use Vitest (`describe`/`it`/`expect`/`vi`) and, for components/hooks, `@testing-library/react`'s `render`/`renderHook`/`screen`/`waitFor`, matching existing test files in the same directories.

---

### Task 1: `ClassicyFileSystem.size()` — uncompressed `_data` sizing + `_url` HEAD resolution

**Files:**
- Modify: `src/SystemFolder/SystemResources/File/ClassicyFileSystem.ts:162-182` (the `size` method), plus its imports at the top of the file.
- Test: `src/SystemFolder/SystemResources/File/ClassicyFileSystem.test.ts`

**Interfaces:**
- Consumes: `decompressFromBase64(base64url: string): Promise<Uint8Array>` and `compressToBase64(data: Uint8Array | ArrayBuffer): Promise<string>` from `@/SystemFolder/SystemResources/Utils/base64Compression` (test-only, to build fixtures).
- Produces: `async size(path: ClassicyPathOrFileSystemEntry): Promise<number>` — every later task and consumer awaits this.

- [ ] **Step 1: Write the failing tests**

Add to `src/SystemFolder/SystemResources/File/ClassicyFileSystem.test.ts` (add the import at the top alongside the existing imports, and a new `describe` block anywhere after the existing ones):

```ts
import { compressToBase64 } from "@/SystemFolder/SystemResources/Utils/base64Compression";
```

```ts
describe("ClassicyFileSystem.size", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("returns the uncompressed byte length for gzip+base64 _data", async () => {
		const cfs = new ClassicyFileSystem("test-size-data-compressed");
		const original = new TextEncoder().encode("hello world, this is a test file");
		const encoded = await compressToBase64(original);
		const entry = {
			_type: ClassicyFileSystemEntryFileType.File,
			_data: encoded,
		};
		await expect(cfs.size(entry)).resolves.toBe(original.byteLength);
	});

	it("falls back to raw Blob-length for _data that isn't valid gzip", async () => {
		const cfs = new ClassicyFileSystem("test-size-data-plain");
		const entry = {
			_type: ClassicyFileSystemEntryFileType.File,
			_data: "hello",
		};
		await expect(cfs.size(entry)).resolves.toBe(5);
	});

	it("returns a pre-set _size on a _url entry without calling fetch", async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);
		const cfs = new ClassicyFileSystem("test-size-url-cached");
		const entry = {
			_type: ClassicyFileSystemEntryFileType.File,
			_url: "https://example.com/file.pdf",
			_size: 42,
		};
		await expect(cfs.size(entry)).resolves.toBe(42);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("resolves size via HEAD for a _url entry with no _size, and caches it onto the entry", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			headers: new Headers({ "Content-Length": "1024" }),
		});
		vi.stubGlobal("fetch", fetchMock);
		const cfs = new ClassicyFileSystem("test-size-url-head");
		const entry = {
			_type: ClassicyFileSystemEntryFileType.File,
			_url: "https://example.com/file.pdf",
		};
		await expect(cfs.size(entry)).resolves.toBe(1024);
		expect(entry._size).toBe(1024);
		expect(fetchMock).toHaveBeenCalledWith(
			"https://example.com/file.pdf",
			expect.objectContaining({ method: "HEAD", signal: expect.any(AbortSignal) }),
		);
	});

	it("returns -1 and does not cache when the HEAD request fails", async () => {
		const fetchMock = vi.fn().mockRejectedValue(new Error("network error"));
		vi.stubGlobal("fetch", fetchMock);
		const cfs = new ClassicyFileSystem("test-size-url-fail");
		const entry = {
			_type: ClassicyFileSystemEntryFileType.File,
			_url: "https://example.com/file.pdf",
		};
		await expect(cfs.size(entry)).resolves.toBe(-1);
		expect(entry._size).toBeUndefined();
	});

	it("returns -1 when the HEAD response has no Content-Length", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			headers: new Headers(),
		});
		vi.stubGlobal("fetch", fetchMock);
		const cfs = new ClassicyFileSystem("test-size-url-no-length");
		const entry = {
			_type: ClassicyFileSystemEntryFileType.File,
			_url: "https://example.com/file.pdf",
		};
		await expect(cfs.size(entry)).resolves.toBe(-1);
	});

	it("sums a directory's children concurrently, excluding one that fails to resolve", async () => {
		const fetchMock = vi.fn().mockRejectedValue(new Error("unreachable"));
		vi.stubGlobal("fetch", fetchMock);
		const cfs = new ClassicyFileSystem("test-size-dir-mixed");
		const entry = {
			_type: ClassicyFileSystemEntryFileType.Directory,
			"a.txt": { _type: ClassicyFileSystemEntryFileType.File, _data: "hello" },
			"b.pdf": {
				_type: ClassicyFileSystemEntryFileType.File,
				_url: "https://example.com/b.pdf",
			},
		};
		await expect(cfs.size(entry)).resolves.toBe(5);
	});
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run src/SystemFolder/SystemResources/File/ClassicyFileSystem.test.ts -t "ClassicyFileSystem.size"`
Expected: FAIL — `size` currently returns a number synchronously, so `.resolves` assertions and the `_url`/HEAD behavior don't exist yet (e.g. "expected -1 to be 1024" or similar mismatches, and the pre-set `_size`/HEAD-caching assertions fail).

- [ ] **Step 3: Implement the async `size()` method**

Add this import near the top of `src/SystemFolder/SystemResources/File/ClassicyFileSystem.ts` (alongside the existing imports, e.g. right after the `deepMergeReplacingArrays` import):

```ts
import { decompressFromBase64 } from "@/SystemFolder/SystemResources/Utils/base64Compression";
```

Replace the existing `size` method (`src/SystemFolder/SystemResources/File/ClassicyFileSystem.ts:162-182`) with:

```ts
async size(path: ClassicyPathOrFileSystemEntry): Promise<number> {
	const entry = typeof path === "string" ? this.resolve(path) : path;

	if (!entry) return -1;

	if ("_data" in entry) {
		try {
			const bytes = await decompressFromBase64(String(entry._data));
			return bytes.byteLength;
		} catch {
			return new Blob(String(entry._data).split("")).size;
		}
	}

	if (typeof entry._size === "number") {
		return entry._size;
	}

	if (typeof entry._url === "string") {
		try {
			const response = await fetch(entry._url, {
				method: "HEAD",
				signal: AbortSignal.timeout(8000),
			});
			const contentLength = response.headers.get("Content-Length");
			if (response.ok && contentLength !== null) {
				const resolvedSize = Number(contentLength);
				if (!Number.isNaN(resolvedSize)) {
					entry._size = resolvedSize;
					return resolvedSize;
				}
			}
		} catch {
			// network error, CORS block, or timeout — fall through to -1, uncached
		}
		return -1;
	}

	if (entry._type === ClassicyFileSystemEntryFileType.Directory) {
		const childEntries = Object.entries(entry).filter(
			([key, child]) =>
				!key.startsWith("_") &&
				Boolean((child as ClassicyFileSystemEntry)?._type),
		);
		const childSizes = await Promise.all(
			childEntries.map(([, child]) => this.size(child as ClassicyFileSystemEntry)),
		);
		return childSizes.reduce(
			(total, childSize) => (childSize > 0 ? total + childSize : total),
			0,
		);
	}

	return -1;
}
```

This preserves the original directory branch's behavior exactly (any child with a truthy `_type`, at any file type, recursed via `this.size`) — just made async and concurrent via `Promise.all` instead of a synchronous loop. **This inline loop is temporary:** Task 2 replaces it with a one-line delegation to `calculateSizeDir()` once that method is broadened to match all real file types, eliminating the duplicate traversal. Leave it as written here for Task 1 — do not pre-emptively delegate.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm vitest run src/SystemFolder/SystemResources/File/ClassicyFileSystem.test.ts -t "ClassicyFileSystem.size"`
Expected: PASS (7 tests).

- [ ] **Step 5: Run the full test suite to check for ripple breakage**

Run: `pnpm vitest run`
Expected: Failures in any existing test that calls `.size(` synchronously and asserts a plain number (none currently exist outside this file per prior codebase audit — `hash`/`readFile` tests are unaffected since they don't call `size`). If any other test fails here, note it — it means an untracked caller of `size()` exists; read it and fix the assertion to `await`/`.resolves` before proceeding to Step 6.

- [ ] **Step 6: Commit**

```bash
git add src/SystemFolder/SystemResources/File/ClassicyFileSystem.ts src/SystemFolder/SystemResources/File/ClassicyFileSystem.test.ts
git commit -m "feat: resolve _url file sizes via HTTP HEAD, uncompress _data sizes"
```

---

### Task 2: `ClassicyFileSystem.calculateSizeDir()` — async, concurrent, broadened to all file types; `size()` delegates to it

**Files:**
- Modify: `src/SystemFolder/SystemResources/File/ClassicyFileSystem.ts:283-307` (the `calculateSizeDir` method) and the `size()` method's directory branch written in Task 1.
- Test: `src/SystemFolder/SystemResources/File/ClassicyFileSystem.test.ts`

**Interfaces:**
- Consumes: `async size(path): Promise<number>` from Task 1.
- Produces: `async calculateSizeDir(path: ClassicyPathOrFileSystemEntry | string): Promise<number>` — Task 3's `statDir` awaits this, and (as of this task) `size()`'s own directory branch delegates to it instead of its own inline loop.

**Note:** `calculateSizeDir` previously only summed descendants whose `_type` was *exactly* `"file"` (`ClassicyFileSystemEntryFileType.File`) — a pre-existing gap that silently excluded `TextFile`/`Markdown`/`Pdf` entries from folder-size totals (e.g. the Finder header for a folder full of PDFs). This task fixes that by matching a fixed set of real content-bearing types — `File`, `TextFile`, `Markdown`, `Pdf` — while deliberately leaving `Directory`/`Drive` excluded (they're containers, not content) and `Shortcut`/`AppShortcut` excluded too (out of scope: nobody has asked for shortcut-referenced content to count toward a folder's size, and doing so would need its own design decision about whether a shortcut's size is the shortcut descriptor's own tiny size or the size of whatever it points to). This is a deliberate behavior change: folders containing `TextFile`/`Markdown`/`Pdf` entries will now report larger, more accurate totals than before.

Once `size()` delegates to `calculateSizeDir()` (Step 5 below), Task 1's own inline directory-summing loop is removed — this task is what eliminates that duplication.

- [ ] **Step 1: Write the failing tests**

Add to `src/SystemFolder/SystemResources/File/ClassicyFileSystem.test.ts`:

```ts
describe("ClassicyFileSystem.calculateSizeDir", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("sums File-type descendants at any nesting depth", async () => {
		const cfs = new ClassicyFileSystem("test-calc-size-nested", {
			_type: "directory",
			"Macintosh HD": {
				_type: ClassicyFileSystemEntryFileType.Drive,
				Documents: {
					_type: ClassicyFileSystemEntryFileType.Directory,
					"a.txt": {
						_type: ClassicyFileSystemEntryFileType.File,
						_data: "hello", // 5 bytes
					},
					Nested: {
						_type: ClassicyFileSystemEntryFileType.Directory,
						"b.txt": {
							_type: ClassicyFileSystemEntryFileType.File,
							_data: "hi", // 2 bytes
						},
					},
				},
			},
		});
		await expect(
			cfs.calculateSizeDir("Macintosh HD:Documents"),
		).resolves.toBe(7);
	});

	it("also sums TextFile, Markdown, and Pdf descendants (previously excluded)", async () => {
		const cfs = new ClassicyFileSystem("test-calc-size-all-types", {
			_type: "directory",
			"Macintosh HD": {
				_type: ClassicyFileSystemEntryFileType.Drive,
				Documents: {
					_type: ClassicyFileSystemEntryFileType.Directory,
					"a.txt": {
						_type: ClassicyFileSystemEntryFileType.TextFile,
						_data: "hello", // 5 bytes
					},
					"b.md": {
						_type: ClassicyFileSystemEntryFileType.Markdown,
						_data: "hi", // 2 bytes
					},
					"c.pdf": {
						_type: ClassicyFileSystemEntryFileType.Pdf,
						_data: "!!!", // 3 bytes
					},
				},
			},
		});
		await expect(
			cfs.calculateSizeDir("Macintosh HD:Documents"),
		).resolves.toBe(10);
	});

	it("excludes a descendant whose size can't be resolved from the total", async () => {
		const fetchMock = vi.fn().mockRejectedValue(new Error("unreachable"));
		vi.stubGlobal("fetch", fetchMock);
		const cfs = new ClassicyFileSystem("test-calc-size-fail", {
			_type: "directory",
			"Macintosh HD": {
				_type: ClassicyFileSystemEntryFileType.Drive,
				Documents: {
					_type: ClassicyFileSystemEntryFileType.Directory,
					"a.txt": {
						_type: ClassicyFileSystemEntryFileType.File,
						_data: "hello", // 5 bytes
					},
					"b.txt": {
						_type: ClassicyFileSystemEntryFileType.File,
						_url: "https://example.com/b.txt",
					},
				},
			},
		});
		await expect(
			cfs.calculateSizeDir("Macintosh HD:Documents"),
		).resolves.toBe(5);
	});
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run src/SystemFolder/SystemResources/File/ClassicyFileSystem.test.ts -t "ClassicyFileSystem.calculateSizeDir"`
Expected: FAIL — `calculateSizeDir` currently returns a number synchronously, not a `Promise` (`.resolves` assertions fail), and the `TextFile`/`Markdown`/`Pdf` test fails because the current matching only recognizes the literal `"file"` type.

- [ ] **Step 3: Implement the async, broadened `calculateSizeDir()` method**

Add this constant near the top of `src/SystemFolder/SystemResources/File/ClassicyFileSystem.ts`, alongside the existing `directoryIcon` constant (line 14):

```ts
const SUMMABLE_FILE_TYPES = new Set<string>([
	ClassicyFileSystemEntryFileType.File,
	ClassicyFileSystemEntryFileType.TextFile,
	ClassicyFileSystemEntryFileType.Markdown,
	ClassicyFileSystemEntryFileType.Pdf,
]);
```

Replace the existing `calculateSizeDir` method (`src/SystemFolder/SystemResources/File/ClassicyFileSystem.ts:283-307`) with:

```ts
async calculateSizeDir(
	path: ClassicyPathOrFileSystemEntry | string,
): Promise<number> {
	const gatherEntries = (
		entry: ClassicyFileSystemEntry,
	): ClassicyFileSystemEntry[] => {
		let results: ClassicyFileSystemEntry[] = [];
		for (const key of Object.keys(entry)) {
			if (key === "_type" && SUMMABLE_FILE_TYPES.has(entry[key])) {
				results.push(entry);
			} else if (typeof entry[key] === "object" && entry[key] !== null) {
				results = results.concat(
					gatherEntries(entry[key] as ClassicyFileSystemEntry),
				);
			}
		}
		return results;
	};

	const resolvedPath = typeof path === "string" ? this.resolve(path) : path;

	const matchingEntries = gatherEntries(resolvedPath);
	const sizes = await Promise.all(
		matchingEntries.map((entry) => this.size(entry)),
	);
	return sizes.reduce(
		(total, entrySize) => (entrySize > 0 ? total + entrySize : total),
		0,
	);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm vitest run src/SystemFolder/SystemResources/File/ClassicyFileSystem.test.ts -t "ClassicyFileSystem.calculateSizeDir"`
Expected: PASS (3 tests).

- [ ] **Step 5: Replace `size()`'s inline directory loop with delegation to `calculateSizeDir()`**

In `src/SystemFolder/SystemResources/File/ClassicyFileSystem.ts`, replace the directory branch inside `size()` (written in Task 1) —

```ts
	if (entry._type === ClassicyFileSystemEntryFileType.Directory) {
		const childEntries = Object.entries(entry).filter(
			([key, child]) =>
				!key.startsWith("_") &&
				Boolean((child as ClassicyFileSystemEntry)?._type),
		);
		const childSizes = await Promise.all(
			childEntries.map(([, child]) => this.size(child as ClassicyFileSystemEntry)),
		);
		return childSizes.reduce(
			(total, childSize) => (childSize > 0 ? total + childSize : total),
			0,
		);
	}
```

— with a one-line delegation:

```ts
	if (entry._type === ClassicyFileSystemEntryFileType.Directory) {
		return this.calculateSizeDir(entry);
	}
```

- [ ] **Step 6: Re-run Task 1's directory test plus the full suite**

Run: `pnpm vitest run src/SystemFolder/SystemResources/File/ClassicyFileSystem.test.ts`
Expected: PASS, including Task 1's "sums a directory's children concurrently, excluding one that fails to resolve" test (still passes — it only used `File`-type children, which `calculateSizeDir` still matches).

Run: `pnpm vitest run`
Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/SystemFolder/SystemResources/File/ClassicyFileSystem.ts src/SystemFolder/SystemResources/File/ClassicyFileSystem.test.ts
git commit -m "feat: broaden calculateSizeDir to all file types, dedupe size()'s directory branch"
```

---

### Task 3: `statFile()` async; split `statDir()` into `statDirShell()` (sync) + async size merge

**Files:**
- Modify: `src/SystemFolder/SystemResources/File/ClassicyFileSystem.ts:155-160` (`statFile`), `:335-358` (`statDir`).
- Test: `src/SystemFolder/SystemResources/File/ClassicyFileSystem.test.ts`

**Interfaces:**
- Consumes: `async size(path): Promise<number>` (Task 1), `async calculateSizeDir(path): Promise<number>` (Task 2).
- Produces: `async statFile(path: string): Promise<ClassicyFileSystemEntry | undefined>`, `statDirShell(path: string): ClassicyFileSystemEntry | undefined` (sync — no `_size` field), `async statDir(path: string): Promise<ClassicyFileSystemEntry | undefined>`. Task 5's Finder consumer calls `statDirShell` directly and `calculateSizeDir` (from Task 2) separately — it does not call `statDir`.

- [ ] **Step 1: Write the failing tests**

Add to `src/SystemFolder/SystemResources/File/ClassicyFileSystem.test.ts`:

```ts
describe("ClassicyFileSystem.statFile", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("awaits the resolved size and sets it on the returned entry", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			headers: new Headers({ "Content-Length": "2048" }),
		});
		vi.stubGlobal("fetch", fetchMock);
		const cfs = new ClassicyFileSystem("test-stat-file", {
			_type: "directory",
			"Macintosh HD": {
				_type: ClassicyFileSystemEntryFileType.Drive,
				"a.pdf": {
					_type: ClassicyFileSystemEntryFileType.Pdf,
					_url: "https://example.com/a.pdf",
				},
			},
		});
		const stated = await cfs.statFile("Macintosh HD:a.pdf");
		expect(stated?._size).toBe(2048);
	});
});

describe("ClassicyFileSystem.statDirShell", () => {
	it("returns count/name/path/type synchronously without touching _size, even with unresolved _url children", () => {
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);
		const cfs = new ClassicyFileSystem("test-stat-dir-shell", {
			_type: "directory",
			"Macintosh HD": {
				_type: ClassicyFileSystemEntryFileType.Drive,
				Documents: {
					_type: ClassicyFileSystemEntryFileType.Directory,
					"a.pdf": {
						_type: ClassicyFileSystemEntryFileType.Pdf,
						_url: "https://example.com/a.pdf",
					},
				},
			},
		});
		const shell = cfs.statDirShell("Macintosh HD:Documents");
		expect(shell?._name).toBe("Documents");
		expect(shell?._path).toBe("Macintosh HD:Documents");
		expect(shell?._type).toBe(ClassicyFileSystemEntryFileType.Directory);
		expect(shell?._count).toBe(1);
		expect(shell?._size).toBeUndefined();
		expect(fetchMock).not.toHaveBeenCalled();
		vi.unstubAllGlobals();
	});
});

describe("ClassicyFileSystem.statDir", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("returns the shell fields plus the awaited computed _size", async () => {
		const cfs = new ClassicyFileSystem("test-stat-dir", {
			_type: "directory",
			"Macintosh HD": {
				_type: ClassicyFileSystemEntryFileType.Drive,
				Documents: {
					_type: ClassicyFileSystemEntryFileType.Directory,
					"a.txt": {
						_type: ClassicyFileSystemEntryFileType.File,
						_data: "hello",
					},
				},
			},
		});
		const dir = await cfs.statDir("Macintosh HD:Documents");
		expect(dir?._name).toBe("Documents");
		expect(dir?._size).toBe(5);
	});
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run src/SystemFolder/SystemResources/File/ClassicyFileSystem.test.ts -t "statFile|statDirShell|statDir"`
Expected: FAIL — `statFile`/`statDir` currently return synchronously (so `await` on them yields the already-resolved-but-wrong value or throws on `._size` shape), and `statDirShell` doesn't exist yet (`cfs.statDirShell is not a function`).

- [ ] **Step 3: Implement `statFile()`, `statDirShell()`, and async `statDir()`**

Replace the existing `statFile` method (`src/SystemFolder/SystemResources/File/ClassicyFileSystem.ts:155-160`) with:

```ts
async statFile(path: string): Promise<ClassicyFileSystemEntry | undefined> {
	const item = this.resolve(path);
	if (!item) return undefined;
	item._size = await this.size(path);
	return item;
}
```

Replace the existing `statDir` method (`src/SystemFolder/SystemResources/File/ClassicyFileSystem.ts:335-358`) with these two methods:

```ts
statDirShell(path: string): ClassicyFileSystemEntry | undefined {
	const current: ClassicyFileSystemEntry = this.resolve(path);
	if (!current) {
		return undefined;
	}
	const metaData = this.filterMetadata(current, "only");

	const name = path.split(this.separator).slice(-1);

	const returnValue: ClassicyFileSystemEntry = {
		_count: this.countVisibleFiles(path),
		_countHidden: this.countInvisibleFilesInDir(path),
		_name: name[0],
		_path: path,
		_type: ClassicyFileSystemEntryFileType.Directory,
	};

	Object.entries(metaData).forEach(([key, value]) => {
		returnValue[key] = value;
	});

	return returnValue;
}

async statDir(path: string): Promise<ClassicyFileSystemEntry | undefined> {
	const shell = this.statDirShell(path);
	if (!shell) return undefined;
	const current = this.resolve(path);
	shell._size = await this.calculateSizeDir(current);
	return shell;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm vitest run src/SystemFolder/SystemResources/File/ClassicyFileSystem.test.ts -t "statFile|statDirShell|statDir"`
Expected: PASS (3 tests).

- [ ] **Step 5: Run the full test suite**

Run: `pnpm vitest run`
Expected: All tests pass. (This is the last change to `ClassicyFileSystem.ts` itself — Tasks 4 and 5 update its consumers.)

- [ ] **Step 6: Commit**

```bash
git add src/SystemFolder/SystemResources/File/ClassicyFileSystem.ts src/SystemFolder/SystemResources/File/ClassicyFileSystem.test.ts
git commit -m "feat: make statFile/statDir async, add statDirShell for sync folder metadata"
```

---

### Task 4: `ClassicyFileBrowserViewTable.tsx` — progressive size resolution with correct sorting

**Files:**
- Modify: `src/SystemFolder/SystemResources/File/ClassicyFileBrowserViewTable.tsx`
- Test: `src/SystemFolder/SystemResources/File/ClassicyFileBrowserViewTable.test.tsx` (new)

**Interfaces:**
- Consumes: `async size(entry): Promise<number>` (Task 1), `formatSize(bytes, measure?, decimals?): string` (unchanged, existing method), `filterByType(path): ClassicyFileSystemEntry` (unchanged, existing method).
- Produces: no new exports — this is a leaf UI consumer.

- [ ] **Step 1: Write the failing test**

Create `src/SystemFolder/SystemResources/File/ClassicyFileBrowserViewTable.test.tsx`:

```tsx
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ClassicyFileBrowserViewTable } from "@/SystemFolder/SystemResources/File/ClassicyFileBrowserViewTable";
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";

function deferred<T>() {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((r) => {
		resolve = r;
	});
	return { promise, resolve };
}

describe("ClassicyFileBrowserViewTable size column", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("shows Calculating… then the resolved size once size() resolves", async () => {
		const cfs = new ClassicyFileSystem("test-table-calculating", {
			_type: "directory",
			Documents: {
				_type: ClassicyFileSystemEntryFileType.Directory,
				"a.pdf": {
					_type: ClassicyFileSystemEntryFileType.Pdf,
					_url: "https://example.com/a.pdf",
				},
			},
		});
		const { promise, resolve } = deferred<number>();
		vi.spyOn(cfs, "size").mockReturnValue(promise);

		render(
			<ClassicyFileBrowserViewTable fs={cfs} path="Documents" appId="Finder.app" />,
		);

		expect(await screen.findByText("Calculating…")).toBeInTheDocument();

		resolve(2048);

		await waitFor(() => expect(screen.getByText("2 KB")).toBeInTheDocument());
	});

	it("shows — when size() resolves to -1", async () => {
		const cfs = new ClassicyFileSystem("test-table-unknown", {
			_type: "directory",
			Documents: {
				_type: ClassicyFileSystemEntryFileType.Directory,
				"a.pdf": {
					_type: ClassicyFileSystemEntryFileType.Pdf,
					_url: "https://example.com/a.pdf",
				},
			},
		});
		vi.spyOn(cfs, "size").mockResolvedValue(-1);

		render(
			<ClassicyFileBrowserViewTable fs={cfs} path="Documents" appId="Finder.app" />,
		);

		await waitFor(() => expect(screen.getByText("—")).toBeInTheDocument());
	});

	it("sorts rows by resolved size once all sizes settle", async () => {
		const cfs = new ClassicyFileSystem("test-table-sort", {
			_type: "directory",
			Documents: {
				_type: ClassicyFileSystemEntryFileType.Directory,
				"big.pdf": {
					_type: ClassicyFileSystemEntryFileType.Pdf,
					_url: "https://example.com/big.pdf",
				},
				"small.pdf": {
					_type: ClassicyFileSystemEntryFileType.Pdf,
					_url: "https://example.com/small.pdf",
				},
			},
		});
		vi.spyOn(cfs, "size").mockImplementation(async (entryOrPath) => {
			const entry =
				typeof entryOrPath === "string" ? cfs.resolve(entryOrPath) : entryOrPath;
			return entry._path?.endsWith("big.pdf") ? 9000 : 100;
		});

		render(
			<ClassicyFileBrowserViewTable fs={cfs} path="Documents" appId="Finder.app" />,
		);

		await waitFor(() =>
			expect(screen.getByText("8.79 KB")).toBeInTheDocument(),
		);

		fireEvent.click(screen.getByText("Size"));

		const rows = screen.getAllByRole("row").slice(1); // drop header row
		expect(rows[0]).toHaveTextContent("small.pdf");
		expect(rows[1]).toHaveTextContent("big.pdf");
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run src/SystemFolder/SystemResources/File/ClassicyFileBrowserViewTable.test.tsx`
Expected: FAIL — the current `fileList` `useMemo` calls `fs.size(metadata)` synchronously and stores whatever a `Promise` object stringifies/coerces to, so no `"Calculating…"`/`"—"`/formatted-size text ever appears (also `fs.size` isn't awaited so mocking it with `mockReturnValue(promise)` won't produce the expected UI states yet).

- [ ] **Step 3: Implement the state-lifted async `fileList` and size cell rendering**

In `src/SystemFolder/SystemResources/File/ClassicyFileBrowserViewTable.tsx`, update the React import (line 23-29) to add `useEffect`:

```ts
import {
	type FC as FunctionalComponent,
	memo,
	type RefObject,
	useEffect,
	useMemo,
	useState,
} from "react";
```

Replace the `fileList` `useMemo` block (lines 73-87) with:

```tsx
			const [fileList, setFileList] = useState<
				ClassicyFileSystemEntryMetadata[]
			>([]);

			useEffect(() => {
				let cancelled = false;

				const directoryItems = fs.filterByType(path);
				const initial = Object.entries(directoryItems).map(
					([filename, metadata]) => {
						const filtered = {} as Record<string, unknown>;
						for (const [key, value] of Object.entries(metadata)) {
							if (key.startsWith("_")) {
								filtered[key] = value;
							}
						}
						filtered._name = filename;
						filtered._path = `${path}:${filename}`;
						filtered._size =
							typeof metadata._size === "number" ? metadata._size : undefined;
						return filtered as ClassicyFileSystemEntryMetadata;
					},
				);
				setFileList(initial);

				initial.forEach((entry, index) => {
					if (typeof entry._size === "number") return;
					fs.size(entry).then((resolvedSize) => {
						if (cancelled) return;
						setFileList((prev) => {
							const next = [...prev];
							if (next[index]?._path === entry._path) {
								next[index] = { ...next[index], _size: resolvedSize };
							}
							return next;
						});
					});
				});

				return () => {
					cancelled = true;
				};
			}, [path, fs]);
```

Replace the `_size` column definition inside the `columns` `useMemo` (lines 118-129) with:

```tsx
					columnHelper.accessor((row) => row._size, {
						id: "_size",
						cell: (info) => {
							const value = info.getValue();
							return (
								<span>
									{value === undefined
										? "Calculating…"
										: value === -1
											? "—"
											: fs.formatSize(value)}
								</span>
							);
						},
						header: () => <span>Size</span>,
						enableResizing: true,
					}),
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run src/SystemFolder/SystemResources/File/ClassicyFileBrowserViewTable.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Run the full test suite**

Run: `pnpm vitest run`
Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/SystemFolder/SystemResources/File/ClassicyFileBrowserViewTable.tsx src/SystemFolder/SystemResources/File/ClassicyFileBrowserViewTable.test.tsx
git commit -m "feat: resolve file sizes progressively in the Finder file browser table"
```

---

### Task 5: `useFinderFolderSize` hook + `Finder.tsx` progressive folder-size header

**Files:**
- Create: `src/SystemFolder/Finder/useFinderFolderSize.ts`
- Test: `src/SystemFolder/Finder/useFinderFolderSize.test.ts` (new)
- Modify: `src/SystemFolder/Finder/Finder.tsx`

**Interfaces:**
- Consumes: `statDirShell(path): ClassicyFileSystemEntry | undefined` and `async calculateSizeDir(entry): Promise<number>` (Task 3/2), `resolve(path): ClassicyFileSystemEntry` (existing).
- Produces: `useFinderFolderSize(path: string, fs: ClassicyFileSystem): number | undefined` — a hook returning `undefined` while resolving, then the resolved (possibly `-1`) size.

**Note on scope:** `Finder.tsx` currently has no component-render test (`FinderData.test.ts` and `ClassicyFinderEventHandler.test.ts` only test standalone helper functions), and rendering it fully requires mocking the entire Zustand app-manager store plus a complete `Appearance.activeTheme.color` palette (consumed unconditionally by `ClassicyApp`). Standing up that scaffolding is out of scope for this plan. Instead, the new async-resolution logic is extracted into `useFinderFolderSize`, which is fully unit-testable on its own (this task's test), and `Finder.tsx`'s use of it is a small, easily-inspectable wiring change reviewed by reading the diff.

- [ ] **Step 1: Write the failing test**

Create `src/SystemFolder/Finder/useFinderFolderSize.test.ts`:

```ts
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useFinderFolderSize } from "@/SystemFolder/Finder/useFinderFolderSize";
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";

describe("useFinderFolderSize", () => {
	it("starts undefined, then resolves to the folder's computed size", async () => {
		const cfs = new ClassicyFileSystem("test-hook-folder-size", {
			_type: "directory",
			Documents: {
				_type: ClassicyFileSystemEntryFileType.Directory,
				"a.txt": {
					_type: ClassicyFileSystemEntryFileType.File,
					_data: "hello",
				},
			},
		});

		const { result } = renderHook(() =>
			useFinderFolderSize("Documents", cfs),
		);

		expect(result.current).toBeUndefined();

		await waitFor(() => expect(result.current).toBe(5));
	});

	it("re-resolves to the new folder's size when path changes", async () => {
		const cfs = new ClassicyFileSystem("test-hook-folder-size-path-change", {
			_type: "directory",
			Documents: {
				_type: ClassicyFileSystemEntryFileType.Directory,
				"a.txt": { _type: ClassicyFileSystemEntryFileType.File, _data: "hello" },
			},
			Downloads: {
				_type: ClassicyFileSystemEntryFileType.Directory,
				"b.txt": { _type: ClassicyFileSystemEntryFileType.File, _data: "hi" },
			},
		});

		const { result, rerender } = renderHook(
			({ path }) => useFinderFolderSize(path, cfs),
			{ initialProps: { path: "Documents" } },
		);
		await waitFor(() => expect(result.current).toBe(5));

		rerender({ path: "Downloads" });
		await waitFor(() => expect(result.current).toBe(2));
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run src/SystemFolder/Finder/useFinderFolderSize.test.ts`
Expected: FAIL — `Cannot find module '@/SystemFolder/Finder/useFinderFolderSize'`.

- [ ] **Step 3: Implement the hook**

Create `src/SystemFolder/Finder/useFinderFolderSize.ts`:

```ts
import { useEffect, useState } from "react";
import type { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";

export function useFinderFolderSize(
	path: string,
	fs: ClassicyFileSystem,
): number | undefined {
	const [size, setSize] = useState<number | undefined>(undefined);

	useEffect(() => {
		let cancelled = false;
		setSize(undefined);

		const entry = fs.resolve(path);
		if (entry) {
			fs.calculateSizeDir(entry).then((resolvedSize) => {
				if (!cancelled) setSize(resolvedSize);
			});
		}

		return () => {
			cancelled = true;
		};
	}, [path, fs]);

	return size;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run src/SystemFolder/Finder/useFinderFolderSize.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Wire the hook into `Finder.tsx`**

In `src/SystemFolder/Finder/Finder.tsx`, add the import (alongside the other `@/SystemFolder/Finder/*` imports, e.g. after the `FinderAboutThisComputer` import at line 19):

```ts
import { useFinderFolderSize } from "@/SystemFolder/Finder/useFinderFolderSize";
```

Add a new component right after `const FinderWindowMemo = memo(FinderWindow);` (line 157):

```tsx
type FinderFolderWindowProps = Omit<FinderWindowProps, "dir" | "op"> & {
	path: string;
};

const FinderFolderWindow: FunctionalComponent<FinderFolderWindowProps> = ({
	path,
	fs,
	...rest
}) => {
	const size = useFinderFolderSize(path, fs);
	const shell = fs.statDirShell(path);
	if (!shell) return null;

	return (
		<FinderWindowMemo
			{...rest}
			fs={fs}
			op={path}
			dir={{ ...shell, _size: size }}
		/>
	);
};

const FinderFolderWindowMemo = memo(FinderFolderWindow);
```

Replace the `getHeaderString` callback (lines 321-332) with:

```tsx
	const getHeaderString = useCallback(
		(dir: ClassicyFileSystemEntryMetadata) => {
			const sizeText =
				dir._size === undefined
					? "Calculating…"
					: dir._size === -1
						? "—"
						: fs.formatSize(dir._size);
			return (
				dir._count +
				" items" +
				(dir._countHidden ? ` (${dir._countHidden} hidden)` : "") +
				", " +
				sizeText
			);
		},
		[fs],
	);
```

Replace the folder-window render loop (lines 346-370) with:

```tsx
			{finderData.openPaths && finderData.openPaths.length > 0
				? finderData.openPaths.map((p: string, idx: number) => (
						<FinderFolderWindowMemo
							key={`${appName}_${p}`}
							path={p}
							appId={appId}
							idx={idx}
							closeFolder={closeFolder}
							closeAllFolders={closeAllFolders}
							handlePathSettingsChange={handlePathSettingsChange}
							openFolder={openFolder}
							openFile={openFile}
							pathSettings={pathSettings}
							getHeaderString={getHeaderString}
							fs={fs}
							disableBalloonHelp={disableBalloonHelp}
							toggleBalloonHelp={toggleBalloonHelp}
						/>
					))
				: null}
```

- [ ] **Step 6: Type-check and run the full test suite**

Run: `pnpm build:source`
Expected: Succeeds with no TypeScript errors (this both type-checks and confirms `FinderFolderWindowProps`'s `Omit<FinderWindowProps, "dir" | "op">` lines up with every prop `FinderFolderWindowMemo` is actually given).

Run: `pnpm vitest run`
Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/SystemFolder/Finder/useFinderFolderSize.ts src/SystemFolder/Finder/useFinderFolderSize.test.ts src/SystemFolder/Finder/Finder.tsx
git commit -m "feat: resolve Finder folder window sizes progressively via useFinderFolderSize"
```
