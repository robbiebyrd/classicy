# ClassicyFileSystem Sync Adapter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An optional global-registry adapter interface that receives journal entries and debounced full snapshots from `ClassicyFileSystem`, with a two-way boot-time reconcile path — while localStorage stays the primary store.

**Architecture:** All mutations funnel through instrumented `ClassicyFileSystem` methods that append sequenced journal entries, notify `onChange` adapters immediately, and schedule a debounced persist + `onSnapshot`. A module-level registry (mirroring `HyperCardPlugins.ts`) holds adapters. Boot reconciliation runs once per storageKey in `useClassicyFileSystem`; a tree replacement persists then bumps a Zustand `fsVersion` counter so the fs rebuilds through the normal seed-from-localStorage path.

**Tech Stack:** TypeScript, React 18 hooks, Zustand (existing store), `@noble/hashes` (existing dep), Vitest (+ jsdom default env, @testing-library/react).

**Spec:** `docs/superpowers/specs/2026-07-20-filesystem-adapter-design.md`

## Global Constraints

- Package manager is **pnpm**. Tests: `pnpm vitest run <file>` (full suite: `pnpm test`).
- Lint ONLY touched files: `pnpm exec biome check --write <paths>` — never `pnpm lint:fix` repo-wide (it reformats ~70 untouched files).
- Never edit `index.ts` barrel files — barrelsby regenerates them (`pnpm build:source` runs `generate-barrels`). New non-test `.ts` files are auto-exported.
- Indentation is **tabs**; match surrounding code style (biome).
- Default vitest environment is **jsdom** (localStorage available). `ClassicyFileSystem.test.ts` is pinned to node env (`// @vitest-environment node`) — do NOT add localStorage-dependent tests there; new sync tests go in a new jsdom file.
- Console error prefix convention: `[ClassicyFileSystem] ...`.
- Commit after every task with the trailer `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

## File Map

| File | Role |
| --- | --- |
| Create `src/SystemFolder/SystemResources/File/ClassicyFileSystemAdapter.ts` | Adapter types, registry, hook invoker, debounce resolution, pagehide flush registry |
| Create `src/SystemFolder/SystemResources/File/ClassicyFileSystemAdapter.test.ts` | Registry + invoker unit tests |
| Create `src/SystemFolder/SystemResources/File/ClassicyFileSystemAdapterSync.test.ts` | Journal / debounce / flush / reconcile tests (jsdom) |
| Modify `src/SystemFolder/SystemResources/File/ClassicyFileSystem.ts` | seq, notifier, persist(), setMetadata, applyDerivedTree, buildSnapshot, flush, reconcileWithAdapters |
| Modify `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager.tsx` | `fsVersion` field + bump event case |
| Modify `src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.ts` | `fsVersion: 0` default |
| Modify `src/SystemFolder/ControlPanels/AppManager/ClassicyReducerRouting.test.ts` | Bump-event routing test |
| Modify `src/SystemFolder/SystemResources/File/ClassicyFileSystemContext.tsx` | applyDerivedTree migration, fsVersion invalidation key, reconcile effect |
| Modify `src/SystemFolder/SystemResources/File/ClassicyFileSystemContext.test.tsx` | fsVersion rebuild + reconcile effect tests |
| Modify `src/SystemFolder/SimpleText/SimpleText.tsx` | `toggleFileType` → `fs.setMetadata` |
| Modify `CLAUDE.md` | Document the adapter API |

---

### Task 1: Adapter types, registry, and safe hook invoker

**Files:**
- Create: `src/SystemFolder/SystemResources/File/ClassicyFileSystemAdapter.ts`
- Test: `src/SystemFolder/SystemResources/File/ClassicyFileSystemAdapter.test.ts`

**Interfaces:**
- Consumes: `ClassicyFileSystemEntry`, `ClassicyFileSystemEntryMetadata` from `ClassicyFileSystemModel.ts` (existing).
- Produces (used by Tasks 2–6):
  - `interface ClassicyFileSystemJournalEntry { seq: number; op: 'write'|'mkdir'|'rmdir'|'meta'|'load'; path: string; data?: string; metadata?: Partial<ClassicyFileSystemEntryMetadata>; timestamp: string }`
  - `interface ClassicyFileSystemSnapshot { tree: ClassicyFileSystemEntry; hash: string; seq: number; storageKey: string; timestamp: string }`
  - `type ClassicyFileSystemReconcileResult = { action: 'useLocal' } | { action: 'replace'; tree: ClassicyFileSystemEntry }`
  - `interface ClassicyFileSystemAdapter { id: string; onChange?; onSnapshot?; reconcile? }`
  - `registerClassicyFileSystemAdapter(adapter, options?: { snapshotDebounceMs?: number }): void`
  - `unregisterClassicyFileSystemAdapter(id: string): void`
  - `getClassicyFileSystemAdapters(): ClassicyFileSystemAdapter[]`
  - `getClassicyFileSystemSnapshotDebounceMs(): number` (min across adapters, default 500)
  - `invokeClassicyFileSystemAdapterHook(adapter, 'onChange'|'onSnapshot', payload): void`
  - `registerClassicyFileSystemPendingFlush(flush: () => void): void`, `unregisterClassicyFileSystemPendingFlush(flush): void` (pagehide flush set)

- [ ] **Step 1: Write the failing test**

Create `src/SystemFolder/SystemResources/File/ClassicyFileSystemAdapter.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	type ClassicyFileSystemAdapter,
	getClassicyFileSystemAdapters,
	getClassicyFileSystemSnapshotDebounceMs,
	invokeClassicyFileSystemAdapterHook,
	registerClassicyFileSystemAdapter,
	unregisterClassicyFileSystemAdapter,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemAdapter";

const makeAdapter = (id: string): ClassicyFileSystemAdapter => ({ id });

afterEach(() => {
	for (const adapter of getClassicyFileSystemAdapters()) {
		unregisterClassicyFileSystemAdapter(adapter.id);
	}
	vi.restoreAllMocks();
});

describe("ClassicyFileSystemAdapter registry", () => {
	it("registers and enumerates adapters in registration order", () => {
		registerClassicyFileSystemAdapter(makeAdapter("a"));
		registerClassicyFileSystemAdapter(makeAdapter("b"));
		expect(getClassicyFileSystemAdapters().map((a) => a.id)).toEqual([
			"a",
			"b",
		]);
	});

	it("re-registering an id replaces the previous adapter", () => {
		const first = makeAdapter("dup");
		const second = makeAdapter("dup");
		registerClassicyFileSystemAdapter(first);
		registerClassicyFileSystemAdapter(second);
		const adapters = getClassicyFileSystemAdapters();
		expect(adapters).toHaveLength(1);
		expect(adapters[0]).toBe(second);
	});

	it("unregister removes the adapter", () => {
		registerClassicyFileSystemAdapter(makeAdapter("gone"));
		unregisterClassicyFileSystemAdapter("gone");
		expect(getClassicyFileSystemAdapters()).toHaveLength(0);
	});
});

describe("getClassicyFileSystemSnapshotDebounceMs", () => {
	it("defaults to 500 with no adapters", () => {
		expect(getClassicyFileSystemSnapshotDebounceMs()).toBe(500);
	});

	it("returns the minimum snapshotDebounceMs across adapters", () => {
		registerClassicyFileSystemAdapter(makeAdapter("slow"), {
			snapshotDebounceMs: 2000,
		});
		registerClassicyFileSystemAdapter(makeAdapter("fast"), {
			snapshotDebounceMs: 100,
		});
		expect(getClassicyFileSystemSnapshotDebounceMs()).toBe(100);
	});

	it("uses the 500 default for adapters that do not specify a debounce", () => {
		registerClassicyFileSystemAdapter(makeAdapter("plain"));
		expect(getClassicyFileSystemSnapshotDebounceMs()).toBe(500);
	});
});

describe("invokeClassicyFileSystemAdapterHook", () => {
	const entry = {
		seq: 1,
		op: "write" as const,
		path: "Macintosh HD:file.txt",
		data: "x",
		timestamp: "2026-07-20T00:00:00.000Z",
	};

	it("calls the hook with the payload", () => {
		const onChange = vi.fn();
		invokeClassicyFileSystemAdapterHook(
			{ id: "spy", onChange },
			"onChange",
			entry,
		);
		expect(onChange).toHaveBeenCalledWith(entry);
	});

	it("is a no-op when the adapter does not implement the hook", () => {
		expect(() =>
			invokeClassicyFileSystemAdapterHook({ id: "none" }, "onChange", entry),
		).not.toThrow();
	});

	it("catches synchronous throws and logs them", () => {
		const errorSpy = vi
			.spyOn(console, "error")
			.mockImplementation(() => undefined);
		invokeClassicyFileSystemAdapterHook(
			{
				id: "thrower",
				onChange: () => {
					throw new Error("boom");
				},
			},
			"onChange",
			entry,
		);
		expect(errorSpy).toHaveBeenCalledWith(
			'[ClassicyFileSystem] adapter "thrower" failed in onChange',
			expect.any(Error),
		);
	});

	it("catches async rejections and logs them", async () => {
		const errorSpy = vi
			.spyOn(console, "error")
			.mockImplementation(() => undefined);
		invokeClassicyFileSystemAdapterHook(
			{ id: "rejector", onChange: () => Promise.reject(new Error("async boom")) },
			"onChange",
			entry,
		);
		await vi.waitFor(() => {
			expect(errorSpy).toHaveBeenCalledWith(
				'[ClassicyFileSystem] adapter "rejector" failed in onChange',
				expect.any(Error),
			);
		});
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/SystemFolder/SystemResources/File/ClassicyFileSystemAdapter.test.ts`
Expected: FAIL — cannot resolve module `.../ClassicyFileSystemAdapter`.

- [ ] **Step 3: Write the implementation**

Create `src/SystemFolder/SystemResources/File/ClassicyFileSystemAdapter.ts`:

```ts
/**
 * ClassicyFileSystem sync adapter API — lets a host application mirror the
 * browser-local filesystem to a backend of its choosing. Capability-based:
 * implement any combination of onChange (journal mode), onSnapshot (snapshot
 * mode), and reconcile (two-way boot sync). Register at app entry, before
 * rendering, mirroring registerClassicyIcons / registerHyperCardSaveProvider.
 * With no adapters registered the filesystem behaves as before; localStorage
 * remains the primary store either way.
 *
 * Design: docs/superpowers/specs/2026-07-20-filesystem-adapter-design.md
 */

import type {
	ClassicyFileSystemEntry,
	ClassicyFileSystemEntryMetadata,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";

export interface ClassicyFileSystemJournalEntry {
	/** Monotonic sequence number, persisted across sessions (gap = missed delivery). */
	seq: number;
	op: "write" | "mkdir" | "rmdir" | "meta" | "load";
	/** Colon-separated path; '' for 'load' (wholesale replacement). */
	path: string;
	/** File contents, for op 'write'. */
	data?: string;
	/** Metadata patch, for op 'meta'. */
	metadata?: Partial<ClassicyFileSystemEntryMetadata>;
	/** ISO 8601. */
	timestamp: string;
}

export interface ClassicyFileSystemSnapshot {
	/** Full tree — the same shape localStorage holds. */
	tree: ClassicyFileSystemEntry;
	/** sha256 hex of the serialized tree (divergence check). */
	hash: string;
	/** Last journal seq included in this snapshot. */
	seq: number;
	storageKey: string;
	/** ISO 8601. */
	timestamp: string;
}

export type ClassicyFileSystemReconcileResult =
	| { action: "useLocal" }
	| { action: "replace"; tree: ClassicyFileSystemEntry };

export interface ClassicyFileSystemAdapter {
	id: string;
	/** Journal mode: called synchronously for every mutation. */
	onChange?(entry: ClassicyFileSystemJournalEntry): void | Promise<void>;
	/** Snapshot mode: called after the debounced persist settles. */
	onSnapshot?(snapshot: ClassicyFileSystemSnapshot): void | Promise<void>;
	/** Two-way boot sync: return useLocal to keep local, or replace with a tree. */
	reconcile?(
		local: ClassicyFileSystemSnapshot,
	): Promise<ClassicyFileSystemReconcileResult>;
}

const DEFAULT_SNAPSHOT_DEBOUNCE_MS = 500;

type RegisteredAdapter = {
	adapter: ClassicyFileSystemAdapter;
	snapshotDebounceMs: number;
};

const registry = new Map<string, RegisteredAdapter>();

export function registerClassicyFileSystemAdapter(
	adapter: ClassicyFileSystemAdapter,
	options?: { snapshotDebounceMs?: number },
): void {
	registry.set(adapter.id, {
		adapter,
		snapshotDebounceMs:
			options?.snapshotDebounceMs ?? DEFAULT_SNAPSHOT_DEBOUNCE_MS,
	});
}

export function unregisterClassicyFileSystemAdapter(id: string): void {
	registry.delete(id);
}

export function getClassicyFileSystemAdapters(): ClassicyFileSystemAdapter[] {
	return [...registry.values()].map((entry) => entry.adapter);
}

/** Effective delay for the shared persist/snapshot debounce timer. */
export function getClassicyFileSystemSnapshotDebounceMs(): number {
	const delays = [...registry.values()].map(
		(entry) => entry.snapshotDebounceMs,
	);
	return delays.length ? Math.min(...delays) : DEFAULT_SNAPSHOT_DEBOUNCE_MS;
}

/**
 * Run an adapter hook, isolating synchronous throws and async rejections so a
 * faulty adapter can never block local filesystem operation or other adapters.
 */
export function invokeClassicyFileSystemAdapterHook(
	adapter: ClassicyFileSystemAdapter,
	hook: "onChange" | "onSnapshot",
	payload: ClassicyFileSystemJournalEntry | ClassicyFileSystemSnapshot,
): void {
	const fn = adapter[hook] as
		| ((payload: unknown) => void | Promise<void>)
		| undefined;
	if (!fn) return;
	const logFailure = (error: unknown) =>
		console.error(
			`[ClassicyFileSystem] adapter "${adapter.id}" failed in ${hook}`,
			error,
		);
	try {
		void Promise.resolve(fn.call(adapter, payload)).catch(logFailure);
	} catch (error) {
		logFailure(error);
	}
}

// ---------------------------------------------------------------------------
// pagehide flush — a debounced persist could otherwise be lost when the tab
// closes inside the debounce window. Instances register their pending flush;
// a single lazily-attached pagehide listener drains the set synchronously.
// ---------------------------------------------------------------------------

const pendingFlushes = new Set<() => void>();
let pagehideListenerAttached = false;

export function registerClassicyFileSystemPendingFlush(
	flush: () => void,
): void {
	pendingFlushes.add(flush);
	if (!pagehideListenerAttached && typeof window !== "undefined") {
		pagehideListenerAttached = true;
		window.addEventListener("pagehide", () => {
			for (const pending of [...pendingFlushes]) {
				pending();
			}
		});
	}
}

export function unregisterClassicyFileSystemPendingFlush(
	flush: () => void,
): void {
	pendingFlushes.delete(flush);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/SystemFolder/SystemResources/File/ClassicyFileSystemAdapter.test.ts`
Expected: PASS (10 tests).

- [ ] **Step 5: Lint and commit**

```bash
pnpm exec biome check --write src/SystemFolder/SystemResources/File/ClassicyFileSystemAdapter.ts src/SystemFolder/SystemResources/File/ClassicyFileSystemAdapter.test.ts
git add src/SystemFolder/SystemResources/File/ClassicyFileSystemAdapter.ts src/SystemFolder/SystemResources/File/ClassicyFileSystemAdapter.test.ts
git commit -m "feat(fs): adapter types, registry, and safe hook invoker

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Journal notifications on every mutation (seq, notifier, setMetadata, applyDerivedTree)

**Files:**
- Modify: `src/SystemFolder/SystemResources/File/ClassicyFileSystem.ts`
- Test: `src/SystemFolder/SystemResources/File/ClassicyFileSystemAdapterSync.test.ts` (create)

**Interfaces:**
- Consumes (Task 1): `ClassicyFileSystemJournalEntry`, `getClassicyFileSystemAdapters`, `invokeClassicyFileSystemAdapterHook`.
- Produces:
  - `ClassicyFileSystem.setMetadata(path: string, patch: Partial<ClassicyFileSystemEntryMetadata>): boolean`
  - `ClassicyFileSystem.applyDerivedTree(tree: ClassicyFileSystemEntry): void`
  - `ClassicyFileSystem.persist(): void` (centralized localStorage write)
  - private `notifyMutation(op, path, extra?)`, private `seq` seeded from `` `${storageKey}:seq` ``
  - Instrumented: `writeFile`, `mkDir`, `rmDir`, `load` each journal their op.

**Note:** `writeFile` to a not-yet-existing path calls `mkDir` internally (existing behavior), so it emits a `mkdir` entry followed by the `write` entry — tests assert on the final entry.

- [ ] **Step 1: Write the failing tests**

Create `src/SystemFolder/SystemResources/File/ClassicyFileSystemAdapterSync.test.ts` (default jsdom env — do NOT add a `@vitest-environment node` pragma):

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	ClassicyFileSystem,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import {
	type ClassicyFileSystemJournalEntry,
	getClassicyFileSystemAdapters,
	registerClassicyFileSystemAdapter,
	unregisterClassicyFileSystemAdapter,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemAdapter";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";

const seedTree = () => ({
	_type: "directory",
	"Macintosh HD": {
		_type: ClassicyFileSystemEntryFileType.Drive,
		Documents: {
			_type: ClassicyFileSystemEntryFileType.Directory,
			"Read Me.txt": {
				_type: ClassicyFileSystemEntryFileType.TextFile,
				_data: "hello",
			},
		},
	},
});

function collectEntries(): ClassicyFileSystemJournalEntry[] {
	const entries: ClassicyFileSystemJournalEntry[] = [];
	registerClassicyFileSystemAdapter({
		id: "collector",
		onChange: (entry) => {
			entries.push(entry);
		},
	});
	return entries;
}

beforeEach(() => {
	localStorage.clear();
	// Fake timers file-wide: mutations schedule 500ms flush timers, and a test
	// must never be hit by a stale flush from a previous test firing mid-run.
	vi.useFakeTimers();
});

afterEach(() => {
	// Unregister BEFORE draining so stale flushes deliver to no one, then drain
	// the pending-flush set via pagehide so no instance carries state forward.
	for (const adapter of getClassicyFileSystemAdapters()) {
		unregisterClassicyFileSystemAdapter(adapter.id);
	}
	window.dispatchEvent(new Event("pagehide"));
	vi.useRealTimers();
	vi.restoreAllMocks();
});

describe("journal notifications", () => {
	it("writeFile journals a 'write' entry with path and data", () => {
		const entries = collectEntries();
		const cfs = new ClassicyFileSystem("test-journal-write", seedTree());
		cfs.writeFile("Macintosh HD:Documents:New.txt", "fresh content");
		const last = entries[entries.length - 1];
		expect(last.op).toBe("write");
		expect(last.path).toBe("Macintosh HD:Documents:New.txt");
		expect(last.data).toBe("fresh content");
		expect(typeof last.timestamp).toBe("string");
	});

	it("mkDir journals a 'mkdir' entry", () => {
		const entries = collectEntries();
		const cfs = new ClassicyFileSystem("test-journal-mkdir", seedTree());
		cfs.mkDir("Macintosh HD:Projects");
		expect(entries.map((e) => e.op)).toContain("mkdir");
		expect(entries[entries.length - 1].path).toBe("Macintosh HD:Projects");
	});

	it("rmDir journals a 'rmdir' entry", () => {
		const entries = collectEntries();
		const cfs = new ClassicyFileSystem("test-journal-rmdir", seedTree());
		cfs.rmDir("Macintosh HD:Documents:Read Me.txt");
		const last = entries[entries.length - 1];
		expect(last.op).toBe("rmdir");
		expect(last.path).toBe("Macintosh HD:Documents:Read Me.txt");
	});

	it("load journals a 'load' entry with empty path", () => {
		const entries = collectEntries();
		const cfs = new ClassicyFileSystem("test-journal-load", seedTree());
		cfs.load(JSON.stringify(seedTree()));
		const last = entries[entries.length - 1];
		expect(last.op).toBe("load");
		expect(last.path).toBe("");
	});

	it("setMetadata patches the entry and journals a 'meta' entry", () => {
		const entries = collectEntries();
		const cfs = new ClassicyFileSystem("test-journal-meta", seedTree());
		const ok = cfs.setMetadata("Macintosh HD:Documents:Read Me.txt", {
			_type: ClassicyFileSystemEntryFileType.Markdown,
		});
		expect(ok).toBe(true);
		expect(cfs.resolve("Macintosh HD:Documents:Read Me.txt")._type).toBe(
			ClassicyFileSystemEntryFileType.Markdown,
		);
		const last = entries[entries.length - 1];
		expect(last.op).toBe("meta");
		expect(last.metadata).toEqual({
			_type: ClassicyFileSystemEntryFileType.Markdown,
		});
	});

	it("setMetadata returns false and journals nothing for a missing path", () => {
		const entries = collectEntries();
		const cfs = new ClassicyFileSystem("test-journal-meta-missing", seedTree());
		expect(cfs.setMetadata("Macintosh HD:Nope.txt", { _label: "x" })).toBe(
			false,
		);
		expect(entries).toHaveLength(0);
	});

	it("seq is strictly increasing and persists across re-instantiation", () => {
		const entries = collectEntries();
		const cfs = new ClassicyFileSystem("test-journal-seq", seedTree());
		cfs.mkDir("Macintosh HD:A");
		cfs.mkDir("Macintosh HD:B");
		const seqs = entries.map((e) => e.seq);
		expect(seqs).toEqual([...seqs].sort((a, b) => a - b));
		expect(new Set(seqs).size).toBe(seqs.length);

		const reborn = new ClassicyFileSystem("test-journal-seq", seedTree());
		reborn.mkDir("Macintosh HD:C");
		expect(entries[entries.length - 1].seq).toBeGreaterThan(
			seqs[seqs.length - 1],
		);
	});

	it("applyDerivedTree replaces the tree without journaling", () => {
		const entries = collectEntries();
		const cfs = new ClassicyFileSystem("test-derived", seedTree());
		cfs.applyDerivedTree({
			...cfs.fs,
			Derived: { _type: ClassicyFileSystemEntryFileType.Directory },
		});
		expect(cfs.resolve("Derived")._type).toBe(
			ClassicyFileSystemEntryFileType.Directory,
		);
		expect(entries).toHaveLength(0);
	});

	it("a throwing onChange adapter blocks neither the mutation nor other adapters", () => {
		vi.spyOn(console, "error").mockImplementation(() => undefined);
		registerClassicyFileSystemAdapter({
			id: "thrower",
			onChange: () => {
				throw new Error("boom");
			},
		});
		const received: string[] = [];
		registerClassicyFileSystemAdapter({
			id: "receiver",
			onChange: (entry) => {
				received.push(entry.op);
			},
		});
		const cfs = new ClassicyFileSystem("test-journal-isolation", seedTree());
		cfs.mkDir("Macintosh HD:Survives");
		expect(cfs.resolve("Macintosh HD:Survives")).toBeDefined();
		expect(received).toContain("mkdir");
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/SystemFolder/SystemResources/File/ClassicyFileSystemAdapterSync.test.ts`
Expected: FAIL — `setMetadata` / `applyDerivedTree` are not functions; no `onChange` calls collected.

- [ ] **Step 3: Implement in `ClassicyFileSystem.ts`**

Add imports at the top (alongside existing ones):

```ts
import {
	type ClassicyFileSystemJournalEntry,
	getClassicyFileSystemAdapters,
	invokeClassicyFileSystemAdapterHook,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemAdapter";
```

Add a `seq` field and seed it in the constructor. Replace the constructor's inline persist block:

```ts
export class ClassicyFileSystem {
	storageKey: string;
	fs: ClassicyFileSystemEntry;
	separator: string;
	private seq: number = 0;
```

In the constructor, after `this.separator = separator;`, replace:

```ts
		try {
			localStorage.setItem(this.storageKey, this.snapshot());
		} catch (error) {
			console.error(
				"[ClassicyFileSystem] Failed to persist initial filesystem to localStorage.",
				error,
			);
		}
```

with:

```ts
		try {
			const storedSeq = Number(localStorage.getItem(`${this.storageKey}:seq`));
			if (Number.isFinite(storedSeq) && storedSeq > 0) {
				this.seq = storedSeq;
			}
		} catch {
			// non-browser environment — seq stays in-memory
		}
		this.persist();
```

Add the new methods to the class (after `snapshot()`):

```ts
	/** Centralized localStorage persistence — the only place the tree is written. */
	persist() {
		try {
			localStorage.setItem(this.storageKey, this.snapshot());
		} catch (error) {
			console.error(
				"[ClassicyFileSystem] Failed to persist filesystem to localStorage.",
				error,
			);
		}
	}

	private nextSeq(): number {
		this.seq += 1;
		try {
			localStorage.setItem(`${this.storageKey}:seq`, String(this.seq));
		} catch {
			// non-browser environment — seq stays in-memory
		}
		return this.seq;
	}

	/**
	 * Journal a mutation: sequence it, deliver to onChange adapters immediately.
	 * Every mutating method funnels through here — the sync choke point.
	 */
	private notifyMutation(
		op: ClassicyFileSystemJournalEntry["op"],
		path: string,
		extra: Pick<ClassicyFileSystemJournalEntry, "data" | "metadata"> = {},
	) {
		const entry: ClassicyFileSystemJournalEntry = {
			seq: this.nextSeq(),
			op,
			path,
			timestamp: new Date().toISOString(),
			...extra,
		};
		for (const adapter of getClassicyFileSystemAdapters()) {
			invokeClassicyFileSystemAdapterHook(adapter, "onChange", entry);
		}
	}

	/**
	 * Patch an entry's metadata through the journaled mutation path. Returns
	 * false (journaling nothing) when the path does not resolve.
	 */
	setMetadata(
		path: string,
		patch: Partial<ClassicyFileSystemEntryMetadata>,
	): boolean {
		const entry = this.resolve(path);
		if (!entry) return false;
		Object.assign(entry, patch);
		this.notifyMutation("meta", path, { metadata: patch });
		return true;
	}

	/**
	 * Replace the tree with a derived overlay (Applications / Extensions
	 * folders). Derived state regenerates from the app store every boot, so
	 * this intentionally neither journals nor notifies adapters.
	 */
	applyDerivedTree(tree: ClassicyFileSystemEntry) {
		this.fs = tree;
	}
```

`ClassicyFileSystemEntryMetadata` is already imported as a type in this file.

Instrument the existing mutators:

- `load(data)` — after `this.fs = parsed;` add `this.notifyMutation("load", "");`
- `writeFile(...)` — change the final line from `return updateObjProp(this.fs, data, path);` to:

```ts
		updateObjProp(this.fs, data, path);
		this.notifyMutation("write", path, { data });
```

- `rmDir(path)` — change body to:

```ts
	rmDir(path: string) {
		const result = this.deletePropertyPath(this.fs, path);
		this.notifyMutation("rmdir", path);
		return result;
	}
```

- `mkDir(path)` — after `this.fs = this.deepMerge(current, this.fs);` add `this.notifyMutation("mkdir", path);`

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/SystemFolder/SystemResources/File/ClassicyFileSystemAdapterSync.test.ts src/SystemFolder/SystemResources/File/ClassicyFileSystem.test.ts`
Expected: PASS — new suite green AND the existing node-env suite still green (constructor persist path unchanged in behavior).

- [ ] **Step 5: Lint and commit**

```bash
pnpm exec biome check --write src/SystemFolder/SystemResources/File/ClassicyFileSystem.ts src/SystemFolder/SystemResources/File/ClassicyFileSystemAdapterSync.test.ts
git add -A src/SystemFolder/SystemResources/File/
git commit -m "feat(fs): journal every mutation through a sequenced notifier

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Debounced persist + onSnapshot with pagehide flush

**Files:**
- Modify: `src/SystemFolder/SystemResources/File/ClassicyFileSystem.ts`
- Test: `src/SystemFolder/SystemResources/File/ClassicyFileSystemAdapterSync.test.ts` (extend)

**Interfaces:**
- Consumes (Task 1): `ClassicyFileSystemSnapshot`, `getClassicyFileSystemSnapshotDebounceMs`, `registerClassicyFileSystemPendingFlush`, `unregisterClassicyFileSystemPendingFlush`.
- Produces:
  - `ClassicyFileSystem.buildSnapshot(): ClassicyFileSystemSnapshot`
  - `ClassicyFileSystem.flushNow: () => void` (arrow property — cancels timer, persists, delivers `onSnapshot`)
  - `notifyMutation` now ends by calling private `scheduleFlush()`.

- [ ] **Step 1: Write the failing tests**

Append to `ClassicyFileSystemAdapterSync.test.ts`:

```ts
describe("debounced persist + snapshot", () => {
	it("N rapid writes produce N onChange calls but one persist and one onSnapshot", () => {
		vi.useFakeTimers();
		const changes: string[] = [];
		const snapshots: unknown[] = [];
		registerClassicyFileSystemAdapter({
			id: "burst",
			onChange: (entry) => {
				changes.push(entry.op);
			},
			onSnapshot: (snapshot) => {
				snapshots.push(snapshot);
			},
		});
		const cfs = new ClassicyFileSystem("test-debounce", seedTree());
		const setItemSpy = vi.spyOn(Storage.prototype, "setItem");
		cfs.mkDir("Macintosh HD:One");
		cfs.mkDir("Macintosh HD:Two");
		cfs.mkDir("Macintosh HD:Three");
		expect(changes).toHaveLength(3);
		expect(snapshots).toHaveLength(0);

		vi.advanceTimersByTime(500);
		expect(snapshots).toHaveLength(1);
		const treeWrites = setItemSpy.mock.calls.filter(
			([key]) => key === "test-debounce",
		);
		expect(treeWrites).toHaveLength(1);
	});

	it("snapshot payload carries the tree, a sha256 hash, the last seq, and the storageKey", () => {
		vi.useFakeTimers();
		const snapshots: Array<{
			tree: Record<string, unknown>;
			hash: string;
			seq: number;
			storageKey: string;
		}> = [];
		registerClassicyFileSystemAdapter({
			id: "inspect",
			onSnapshot: (snapshot) => {
				snapshots.push(snapshot);
			},
		});
		const cfs = new ClassicyFileSystem("test-snapshot-payload", seedTree());
		cfs.writeFile("Macintosh HD:Documents:Read Me.txt", "updated");
		vi.advanceTimersByTime(500);

		expect(snapshots).toHaveLength(1);
		const snap = snapshots[0];
		expect(snap.storageKey).toBe("test-snapshot-payload");
		expect(snap.hash).toMatch(/^[0-9a-f]{64}$/);
		expect(snap.seq).toBeGreaterThan(0);
		expect(
			(snap.tree["Macintosh HD"] as Record<string, Record<string, unknown>>)
				.Documents["Read Me.txt"],
		).toBe("updated");
	});

	it("honors a custom snapshotDebounceMs", () => {
		vi.useFakeTimers();
		const snapshots: unknown[] = [];
		registerClassicyFileSystemAdapter(
			{
				id: "fast",
				onSnapshot: (snapshot) => {
					snapshots.push(snapshot);
				},
			},
			{ snapshotDebounceMs: 50 },
		);
		const cfs = new ClassicyFileSystem("test-debounce-custom", seedTree());
		cfs.mkDir("Macintosh HD:Quick");
		vi.advanceTimersByTime(50);
		expect(snapshots).toHaveLength(1);
	});

	it("pagehide flushes a pending persist synchronously", () => {
		vi.useFakeTimers();
		const snapshots: unknown[] = [];
		registerClassicyFileSystemAdapter({
			id: "pagehide",
			onSnapshot: (snapshot) => {
				snapshots.push(snapshot);
			},
		});
		const cfs = new ClassicyFileSystem("test-pagehide", seedTree());
		cfs.mkDir("Macintosh HD:AlmostLost");
		expect(snapshots).toHaveLength(0);

		window.dispatchEvent(new Event("pagehide"));
		expect(snapshots).toHaveLength(1);
		expect(
			JSON.parse(localStorage.getItem("test-pagehide") ?? "{}")[
				"Macintosh HD"
			].AlmostLost,
		).toBeDefined();

		// The flush consumed the pending entry — the timer must not double-fire.
		vi.advanceTimersByTime(500);
		expect(snapshots).toHaveLength(1);
	});
});
```

Note the second test asserts `Documents["Read Me.txt"]` equals the raw string `"updated"` — `writeFile`'s `updateObjProp` replaces the entry with the string payload (existing behavior, not something this feature changes).

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/SystemFolder/SystemResources/File/ClassicyFileSystemAdapterSync.test.ts`
Expected: FAIL — no snapshots delivered; multiple tree writes.

- [ ] **Step 3: Implement in `ClassicyFileSystem.ts`**

Extend the adapter import:

```ts
import {
	type ClassicyFileSystemJournalEntry,
	type ClassicyFileSystemSnapshot,
	getClassicyFileSystemAdapters,
	getClassicyFileSystemSnapshotDebounceMs,
	invokeClassicyFileSystemAdapterHook,
	registerClassicyFileSystemPendingFlush,
	unregisterClassicyFileSystemPendingFlush,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemAdapter";
```

Add a timer field next to `seq`:

```ts
	private flushTimer: ReturnType<typeof setTimeout> | null = null;
```

At the end of `notifyMutation`, after the adapter loop, add:

```ts
		this.scheduleFlush();
```

Add the flush machinery (after `applyDerivedTree`):

```ts
	private scheduleFlush() {
		if (this.flushTimer !== null) {
			clearTimeout(this.flushTimer);
		}
		this.flushTimer = setTimeout(
			this.flushNow,
			getClassicyFileSystemSnapshotDebounceMs(),
		);
		registerClassicyFileSystemPendingFlush(this.flushNow);
	}

	/**
	 * Persist to localStorage and deliver onSnapshot immediately, cancelling any
	 * pending debounce. Arrow property so pagehide can call it detached.
	 */
	flushNow = () => {
		if (this.flushTimer !== null) {
			clearTimeout(this.flushTimer);
			this.flushTimer = null;
		}
		unregisterClassicyFileSystemPendingFlush(this.flushNow);
		this.persist();
		const snapshot = this.buildSnapshot();
		for (const adapter of getClassicyFileSystemAdapters()) {
			invokeClassicyFileSystemAdapterHook(adapter, "onSnapshot", snapshot);
		}
	};

	/** Deep-copied tree + sha256 hash + seq — the consistency envelope. */
	buildSnapshot(): ClassicyFileSystemSnapshot {
		const serialized = this.snapshot();
		return {
			tree: JSON.parse(serialized) as ClassicyFileSystemEntry,
			hash: bytesToHex(sha256(new TextEncoder().encode(serialized))),
			seq: this.seq,
			storageKey: this.storageKey,
			timestamp: new Date().toISOString(),
		};
	}
```

(`sha256` and `bytesToHex` are already imported at the top of the file.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/SystemFolder/SystemResources/File/ClassicyFileSystemAdapterSync.test.ts src/SystemFolder/SystemResources/File/ClassicyFileSystem.test.ts`
Expected: PASS.

- [ ] **Step 5: Lint and commit**

```bash
pnpm exec biome check --write src/SystemFolder/SystemResources/File/ClassicyFileSystem.ts src/SystemFolder/SystemResources/File/ClassicyFileSystemAdapterSync.test.ts
git add src/SystemFolder/SystemResources/File/ClassicyFileSystem.ts src/SystemFolder/SystemResources/File/ClassicyFileSystemAdapterSync.test.ts
git commit -m "feat(fs): debounced centralized persist + onSnapshot with pagehide flush

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Boot reconciliation — `reconcileWithAdapters()`

**Files:**
- Modify: `src/SystemFolder/SystemResources/File/ClassicyFileSystem.ts`
- Test: `src/SystemFolder/SystemResources/File/ClassicyFileSystemAdapterSync.test.ts` (extend)

**Interfaces:**
- Consumes: `isValidFileSystemEntry` (already imported in ClassicyFileSystem.ts), Task 3's `buildSnapshot`/`flushNow`.
- Produces: `ClassicyFileSystem.reconcileWithAdapters(): Promise<boolean>` — true iff an adapter replaced the tree (Task 6's hook dispatches the fsVersion bump on true).

- [ ] **Step 1: Write the failing tests**

Append to `ClassicyFileSystemAdapterSync.test.ts`:

```ts
describe("reconcileWithAdapters", () => {
	const remoteTree = () => ({
		_type: "directory",
		"Macintosh HD": {
			_type: ClassicyFileSystemEntryFileType.Drive,
			"FromRemote.txt": {
				_type: ClassicyFileSystemEntryFileType.TextFile,
				_data: "remote wins",
			},
		},
	});

	it("returns false and keeps local when the adapter says useLocal", async () => {
		registerClassicyFileSystemAdapter({
			id: "local-wins",
			reconcile: async () => ({ action: "useLocal" }),
		});
		const cfs = new ClassicyFileSystem("test-reconcile-local", seedTree());
		await expect(cfs.reconcileWithAdapters()).resolves.toBe(false);
		expect(cfs.resolve("Macintosh HD:Documents:Read Me.txt")).toBeDefined();
	});

	it("returns true, replaces the tree, and persists when the adapter says replace", async () => {
		registerClassicyFileSystemAdapter({
			id: "remote-wins",
			reconcile: async () => ({ action: "replace", tree: remoteTree() }),
		});
		const cfs = new ClassicyFileSystem("test-reconcile-replace", seedTree());
		await expect(cfs.reconcileWithAdapters()).resolves.toBe(true);
		expect(cfs.resolve("Macintosh HD:FromRemote.txt")._data).toBe(
			"remote wins",
		);
		expect(cfs.resolve("Macintosh HD:Documents")).toBeUndefined();
		const persisted = JSON.parse(
			localStorage.getItem("test-reconcile-replace") ?? "{}",
		);
		expect(persisted["Macintosh HD"]["FromRemote.txt"]._data).toBe(
			"remote wins",
		);
	});

	it("rejects an invalid replacement tree and keeps local", async () => {
		const errorSpy = vi
			.spyOn(console, "error")
			.mockImplementation(() => undefined);
		registerClassicyFileSystemAdapter({
			id: "invalid-remote",
			reconcile: async () => ({
				action: "replace",
				// biome-ignore lint/suspicious/noExplicitAny: intentionally malformed
				tree: {} as any,
			}),
		});
		const cfs = new ClassicyFileSystem("test-reconcile-invalid", seedTree());
		await expect(cfs.reconcileWithAdapters()).resolves.toBe(false);
		expect(cfs.resolve("Macintosh HD:Documents:Read Me.txt")).toBeDefined();
		expect(errorSpy).toHaveBeenCalled();
	});

	it("degrades to local when reconcile rejects", async () => {
		vi.spyOn(console, "error").mockImplementation(() => undefined);
		registerClassicyFileSystemAdapter({
			id: "broken",
			reconcile: async () => {
				throw new Error("network down");
			},
		});
		const cfs = new ClassicyFileSystem("test-reconcile-reject", seedTree());
		await expect(cfs.reconcileWithAdapters()).resolves.toBe(false);
	});

	it("first replace wins — later reconcilers are not consulted", async () => {
		const secondReconcile = vi.fn(async () => ({
			action: "useLocal" as const,
		}));
		registerClassicyFileSystemAdapter({
			id: "first",
			reconcile: async () => ({ action: "replace", tree: remoteTree() }),
		});
		registerClassicyFileSystemAdapter({
			id: "second",
			reconcile: secondReconcile,
		});
		const cfs = new ClassicyFileSystem("test-reconcile-order", seedTree());
		await expect(cfs.reconcileWithAdapters()).resolves.toBe(true);
		expect(secondReconcile).not.toHaveBeenCalled();
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/SystemFolder/SystemResources/File/ClassicyFileSystemAdapterSync.test.ts`
Expected: FAIL — `reconcileWithAdapters` is not a function.

- [ ] **Step 3: Implement in `ClassicyFileSystem.ts`**

Add after `buildSnapshot()`:

```ts
	/**
	 * Two-way boot sync: offer the local snapshot to each adapter implementing
	 * reconcile (registration order). The first 'replace' verdict wins: the
	 * validated tree is loaded, journaled as 'load', and flushed immediately.
	 * Returns true iff the tree was replaced. Errors and invalid trees degrade
	 * to keeping local — localStorage stays primary.
	 */
	async reconcileWithAdapters(): Promise<boolean> {
		const local = this.buildSnapshot();
		for (const adapter of getClassicyFileSystemAdapters()) {
			if (!adapter.reconcile) continue;
			try {
				const result = await adapter.reconcile(local);
				if (result?.action !== "replace") continue;
				if (!isValidFileSystemEntry(result.tree)) {
					console.error(
						`[ClassicyFileSystem] adapter "${adapter.id}" reconcile returned an invalid tree; keeping local`,
					);
					continue;
				}
				this.load(JSON.stringify(result.tree));
				this.flushNow();
				return true;
			} catch (error) {
				console.error(
					`[ClassicyFileSystem] adapter "${adapter.id}" failed in reconcile`,
					error,
				);
			}
		}
		return false;
	}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/SystemFolder/SystemResources/File/ClassicyFileSystemAdapterSync.test.ts`
Expected: PASS.

- [ ] **Step 5: Lint and commit**

```bash
pnpm exec biome check --write src/SystemFolder/SystemResources/File/ClassicyFileSystem.ts src/SystemFolder/SystemResources/File/ClassicyFileSystemAdapterSync.test.ts
git add src/SystemFolder/SystemResources/File/ClassicyFileSystem.ts src/SystemFolder/SystemResources/File/ClassicyFileSystemAdapterSync.test.ts
git commit -m "feat(fs): adapter-decided boot reconciliation with local-wins fallback

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: `fsVersion` store field + bump event

**Files:**
- Modify: `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager.tsx` (interface + reducer case)
- Modify: `src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.ts` (default state, near `disableBalloonHelp: false` around line 439)
- Test: `src/SystemFolder/ControlPanels/AppManager/ClassicyReducerRouting.test.ts` (extend)

**Interfaces:**
- Produces: `System.Manager.Desktop.fsVersion?: number` (default `0`) and event `{ type: "ClassicyDesktopFileSystemVersionBump" }` (no payload). Task 6 reads the field as a `useMemo` invalidation key and dispatches the event after a reconcile replace.

- [ ] **Step 1: Write the failing test**

In `ClassicyReducerRouting.test.ts`, inside the `describe` block for `ClassicyDesktop*` prefix routing (after the `ClassicyDesktopSetBalloonHelp` test), add:

```ts
	it("ClassicyDesktopFileSystemVersionBump routes to desktop handler — fsVersion increments", () => {
		const ds = makeStore();

		const once = classicyDesktopStateEventReducer(ds, {
			type: "ClassicyDesktopFileSystemVersionBump",
		});
		expect(once.System.Manager.Desktop.fsVersion).toBe(1);

		const twice = classicyDesktopStateEventReducer(once, {
			type: "ClassicyDesktopFileSystemVersionBump",
		});
		expect(twice.System.Manager.Desktop.fsVersion).toBe(2);
	});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/SystemFolder/ControlPanels/AppManager/ClassicyReducerRouting.test.ts`
Expected: FAIL — `fsVersion` is `undefined`.

- [ ] **Step 3: Implement**

In `ClassicyDesktopManager.tsx`, add to `ClassicyStoreSystemDesktopManager` (after `errorDialog`):

```ts
	/** Bumped when the filesystem tree is replaced out-of-band (adapter
	 * reconcile) so useClassicyFileSystem rebuilds from localStorage. */
	fsVersion?: number;
```

In the same file's reducer switch, after the `ClassicyDesktopCloseErrorDialog` case:

```ts
		case "ClassicyDesktopFileSystemVersionBump": {
			ds.System.Manager.Desktop.fsVersion =
				(ds.System.Manager.Desktop.fsVersion ?? 0) + 1;
			break;
		}
```

In `ClassicyAppManager.ts` `DefaultAppManagerState`, next to `disableBalloonHelp: false,` (~line 439):

```ts
				fsVersion: 0,
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/SystemFolder/ControlPanels/AppManager/ClassicyReducerRouting.test.ts`
Expected: PASS.

- [ ] **Step 5: Lint and commit**

```bash
pnpm exec biome check --write src/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager.tsx src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.ts src/SystemFolder/ControlPanels/AppManager/ClassicyReducerRouting.test.ts
git add src/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager.tsx src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.ts src/SystemFolder/ControlPanels/AppManager/ClassicyReducerRouting.test.ts
git commit -m "feat(store): fsVersion counter + ClassicyDesktopFileSystemVersionBump event

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: Hook integration — overlays via `applyDerivedTree`, `fsVersion` key, reconcile effect

**Files:**
- Modify: `src/SystemFolder/SystemResources/File/ClassicyFileSystemContext.tsx`
- Test: `src/SystemFolder/SystemResources/File/ClassicyFileSystemContext.test.tsx` (extend)

**Interfaces:**
- Consumes: Task 4 `fs.reconcileWithAdapters()`, Task 5 `fsVersion` + bump event, Task 2 `fs.applyDerivedTree`.
- Produces: `resetClassicyFileSystemReconciliation(storageKey?: string): void` (test helper export). The hook's public signature is unchanged.

- [ ] **Step 1: Write the failing tests**

Add to `ClassicyFileSystemContext.test.tsx`. New imports to merge into the existing import block:

```ts
import { waitFor } from "@testing-library/react";
import { afterEach } from "vitest";
import {
	getClassicyFileSystemAdapters,
	registerClassicyFileSystemAdapter,
	unregisterClassicyFileSystemAdapter,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemAdapter";
import { resetClassicyFileSystemReconciliation } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemContext";
```

New describe block at the end of the file:

```ts
describe("useClassicyFileSystem sync integration", () => {
	afterEach(() => {
		for (const adapter of getClassicyFileSystemAdapters()) {
			unregisterClassicyFileSystemAdapter(adapter.id);
		}
		resetClassicyFileSystemReconciliation();
	});

	it("rebuilds the filesystem when fsVersion is bumped", () => {
		const { result } = renderHook(() =>
			useClassicyFileSystem("test-fs-version-rebuild"),
		);
		const first = result.current;
		act(() => {
			dispatch({ type: "ClassicyDesktopFileSystemVersionBump" });
		});
		expect(result.current).not.toBe(first);
	});

	it("adopts a replacement tree from an adapter reconcile at boot", async () => {
		registerClassicyFileSystemAdapter({
			id: "test-reconcile-hook",
			reconcile: async () => ({
				action: "replace",
				tree: {
					_type: ClassicyFileSystemEntryFileType.Directory,
					"Macintosh HD": {
						_type: ClassicyFileSystemEntryFileType.Drive,
						"FromRemote.txt": {
							_type: ClassicyFileSystemEntryFileType.TextFile,
							_data: "remote",
						},
					},
				},
			}),
		});
		const { result } = renderHook(() =>
			useClassicyFileSystem("test-reconcile-hook-key"),
		);
		await waitFor(() => {
			expect(
				result.current.resolve("Macintosh HD:FromRemote.txt")?._data,
			).toBe("remote");
		});
	});

	it("runs reconciliation only once per storageKey across rebuilds", async () => {
		const reconcile = vi.fn(async () => ({ action: "useLocal" as const }));
		registerClassicyFileSystemAdapter({ id: "test-once", reconcile });
		renderHook(() => useClassicyFileSystem("test-reconcile-once"));
		await waitFor(() => {
			expect(reconcile).toHaveBeenCalledTimes(1);
		});
		act(() => {
			dispatch({ type: "ClassicyDesktopFileSystemVersionBump" });
		});
		await new Promise((resolve) => setTimeout(resolve, 20));
		expect(reconcile).toHaveBeenCalledTimes(1);
	});
});
```

Also merge `vi` into the vitest import of this file if not present.

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/SystemFolder/SystemResources/File/ClassicyFileSystemContext.test.tsx`
Expected: FAIL — `resetClassicyFileSystemReconciliation` not exported; fsVersion bump does not rebuild; reconcile never called.

- [ ] **Step 3: Implement in `ClassicyFileSystemContext.tsx`**

Update the react import and add the dispatch import:

```ts
import { createContext, useContext, useEffect, useMemo } from "react";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
```

Add module-level reconciliation tracking (above the hook):

```ts
// Reconciliation must run once per storageKey, not once per fs instance —
// rebuilds (app registration, fsVersion bumps) must not re-trigger it.
const reconciledStorageKeys = new Set<string>();

/** Test helper: allow reconciliation to run again. */
export function resetClassicyFileSystemReconciliation(storageKey?: string) {
	if (storageKey) {
		reconciledStorageKeys.delete(storageKey);
	} else {
		reconciledStorageKeys.clear();
	}
}
```

Inside `useClassicyFileSystem`, add the version selector next to the existing keys:

```ts
	// Invalidation key: bumped after an adapter reconcile replaces the tree, so
	// the fs rebuilds through the normal seed-from-localStorage path.
	const fsVersion = useAppManager(
		(s) => s.System.Manager.Desktop.fsVersion ?? 0,
	);
```

In the `useMemo`, replace the two raw overlay assignments:

```ts
		fs.fs = withApplicationsFolder(
			fs.fs,
			useAppManager.getState().System.Manager.Desktop.icons,
		);
```

becomes

```ts
		fs.applyDerivedTree(
			withApplicationsFolder(
				fs.fs,
				useAppManager.getState().System.Manager.Desktop.icons,
			),
		);
```

and

```ts
		fs.fs = withExtensionsFolder(
			fs.fs,
			Object.values(useAppManager.getState().System.Manager.Applications.apps),
		);
```

becomes

```ts
		fs.applyDerivedTree(
			withExtensionsFolder(
				fs.fs,
				Object.values(
					useAppManager.getState().System.Manager.Applications.apps,
				),
			),
		);
```

Append `fsVersion` to the `useMemo` dependency array (after `extensionAppsKey`).

After the `useMemo`, before `return fs;` — restructure the hook so the memo result is captured in a variable, the effect runs, and the variable is returned:

```ts
	const fs = useMemo(() => {
		/* ...existing body unchanged... */
	}, [
		defaultFileSystem,
		mode,
		storageKey,
		separator,
		appShortcutsKey,
		extensionAppsKey,
		fsVersion,
	]);

	// Two-way boot sync: offer the local snapshot to reconciling adapters once
	// per storageKey. A replace has already persisted; the bump rebuilds the fs
	// from localStorage so every consumer sees the adopted tree.
	useEffect(() => {
		if (reconciledStorageKeys.has(fs.storageKey)) return;
		reconciledStorageKeys.add(fs.storageKey);
		void fs.reconcileWithAdapters().then((replaced) => {
			if (replaced) {
				dispatch({ type: "ClassicyDesktopFileSystemVersionBump" });
			}
		});
	}, [fs]);

	return fs;
```

(The existing `return useMemo(...)` becomes `const fs = useMemo(...)`; keep the biome-ignore comment on the dependency array where it sits today.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/SystemFolder/SystemResources/File/ClassicyFileSystemContext.test.tsx src/SystemFolder/SystemResources/File/ClassicyFileSystemAdapterSync.test.ts`
Expected: PASS (existing context tests included).

- [ ] **Step 5: Lint and commit**

```bash
pnpm exec biome check --write src/SystemFolder/SystemResources/File/ClassicyFileSystemContext.tsx src/SystemFolder/SystemResources/File/ClassicyFileSystemContext.test.tsx
git add src/SystemFolder/SystemResources/File/ClassicyFileSystemContext.tsx src/SystemFolder/SystemResources/File/ClassicyFileSystemContext.test.tsx
git commit -m "feat(fs): boot reconciliation effect + fsVersion rebuild in useClassicyFileSystem

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: Migrate SimpleText to `setMetadata`

**Files:**
- Modify: `src/SystemFolder/SimpleText/SimpleText.tsx` (`toggleFileType`, ~lines 55-76)
- Test: `src/SystemFolder/SystemResources/File/ClassicyFileSystemAdapterSync.test.ts` (the Task 2 setMetadata tests already cover the journal path; this task adds none)

**Interfaces:**
- Consumes: Task 2 `fs.setMetadata(path, patch): boolean`.

- [ ] **Step 1: Replace the direct mutation**

In `SimpleText.tsx`, the `toggleFileType` callback currently reads:

```ts
			// Persist the new type onto the filesystem entry and save to localStorage
			const entry = fs.resolve(filePath);
			if (entry) {
				entry._type = nextType;
				try {
					localStorage.setItem(fs.storageKey, fs.snapshot());
				} catch (e) {
					console.error("[SimpleText] Failed to persist file type change", e);
				}
			}
```

Replace with:

```ts
			// Persist the new type through the journaled mutation path; the
			// centralized debounced persist handles localStorage.
			fs.setMetadata(filePath, { _type: nextType });
```

- [ ] **Step 2: Verify no localStorage writes remain in SimpleText**

Run: `grep -n "localStorage" src/SystemFolder/SimpleText/SimpleText.tsx`
Expected: no output.

- [ ] **Step 3: Run the SimpleText and filesystem suites**

Run: `pnpm vitest run src/SystemFolder/SimpleText src/SystemFolder/SystemResources/File`
Expected: PASS.

- [ ] **Step 4: Lint and commit**

```bash
pnpm exec biome check --write src/SystemFolder/SimpleText/SimpleText.tsx
git add src/SystemFolder/SimpleText/SimpleText.tsx
git commit -m "refactor(simpletext): persist type toggles via fs.setMetadata

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: Documentation + full verification

**Files:**
- Modify: `CLAUDE.md` (new section after "Contextual Menus")

**Interfaces:** none — docs and verification only.

- [ ] **Step 1: Add a CLAUDE.md section**

Insert after the "Contextual Menus" section:

````markdown
### File System Sync Adapters

`ClassicyFileSystem` is browser-local (localStorage-primary), but consumers can
mirror it to a backend by registering an adapter at app entry
(`src/SystemFolder/SystemResources/File/ClassicyFileSystemAdapter.ts`):

```ts
registerClassicyFileSystemAdapter({
    id: 'my-backend',
    onChange: (entry) => {},          // journal mode: every mutation, sequenced
    onSnapshot: (snapshot) => {},     // snapshot mode: debounced full tree + sha256 hash
    reconcile: async (local) => ({ action: 'useLocal' }),  // two-way boot sync
}, { snapshotDebounceMs: 500 })
```

All methods are optional (capability-based). Every mutation flows through
`writeFile`/`mkDir`/`rmDir`/`load`/`setMetadata` — never mutate `fs.fs` or
entries directly; use `fs.setMetadata(path, patch)` for metadata changes.
Snapshots carry a sha256 hash and a persisted monotonic `seq` for drift/gap
detection. At boot, `reconcile` may return
`{ action: 'replace', tree }` to adopt a remote tree (validated, persisted,
then rebuilt via the store's `fsVersion` bump); errors always degrade to
local-wins. Derived folders (Applications, Extensions) are applied via
`applyDerivedTree()` and never journal. Design spec:
`docs/superpowers/specs/2026-07-20-filesystem-adapter-design.md`.
````

- [ ] **Step 2: Full test suite**

Run: `pnpm test`
Expected: all tests pass (baseline was 1348; now higher).

- [ ] **Step 3: Build**

Run: `pnpm build:source`
Expected: clean tsc + vite build; barrelsby picks up `ClassicyFileSystemAdapter.ts` into the generated barrels (verify with `grep ClassicyFileSystemAdapter src/index.ts`).

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md src/index.ts src/SystemFolder/SystemResources/File/index.ts
git commit -m "docs: file system sync adapter API

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

(If barrel regeneration touched other `index.ts` files, include them.)

---

## Self-Review Notes

- **Spec coverage:** adapter interface/registry (T1), journal + choke points + setMetadata + derived-overlay exclusion (T2), debounced snapshot/persist + pagehide flush (T3), two-way reconcile with validation and local-wins degradation (T4), fsVersion rebuild path (T5-6), SimpleText migration (T7), docs (T8). Out-of-scope items from the spec (concrete adapters, CRDT merge, journal replay buffering) intentionally have no tasks.
- **Deviation from spec:** the spec says "on the server the notifier is a no-op"; the implementation instead guards only storage/window access (journal callbacks would fire in SSR if a mutation happened there, which none do). This preserves the spec's intent (no SSR crashes) while keeping the node-env test suite meaningful.
- **Type consistency check:** `ClassicyFileSystemJournalEntry.op` union matches `notifyMutation` callers; `flushNow` is an arrow property everywhere it is referenced detached (pagehide set, setTimeout); `reconcileWithAdapters` returns `Promise<boolean>` consumed by the Task 6 effect; event string `ClassicyDesktopFileSystemVersionBump` identical in T5 reducer, T5 test, T6 effect and tests.
