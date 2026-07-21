import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
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

	it("writeFile aborted by the prototype-pollution guard journals nothing", () => {
		const entries = collectEntries();
		const cfs = new ClassicyFileSystem("test-journal-proto-guard", seedTree());
		cfs.writeFile("Macintosh HD:__proto__:x", "payload");
		expect(entries.filter((e) => e.op === "write")).toHaveLength(0);
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

	it("two live instances sharing a storageKey never journal duplicate seqs", () => {
		const entries = collectEntries();
		const a = new ClassicyFileSystem("test-journal-shared-seq", seedTree());
		const b = new ClassicyFileSystem("test-journal-shared-seq", seedTree());
		a.mkDir("Macintosh HD:FromA");
		b.mkDir("Macintosh HD:FromB");
		a.mkDir("Macintosh HD:FromA2");
		const seqs = entries.map((e) => e.seq);
		expect(new Set(seqs).size).toBe(seqs.length);
		expect(seqs).toEqual([...seqs].sort((x, y) => x - y));
	});
});

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
		const setItemSpy = vi.spyOn(localStorage, "setItem");
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
		const readMe = (
			snap.tree["Macintosh HD"] as Record<
				string,
				Record<string, Record<string, unknown>>
			>
		).Documents["Read Me.txt"];
		expect(readMe._data).toBe("updated");
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
			JSON.parse(localStorage.getItem("test-pagehide") ?? "{}")["Macintosh HD"]
				.AlmostLost,
		).toBeDefined();

		// The flush consumed the pending entry — the timer must not double-fire.
		vi.advanceTimersByTime(500);
		expect(snapshots).toHaveLength(1);
	});

	it("a rebuild flushes the predecessor's pending mutation before seeding", () => {
		const cfs = new ClassicyFileSystem("test-rebuild-flush", seedTree());
		cfs.mkDir("Macintosh HD:AlmostLost");
		// Rebuild before the 500ms debounce fires — constructor must drain the
		// predecessor's pending flush, then seed from the updated localStorage.
		const rebuilt = new ClassicyFileSystem("test-rebuild-flush", seedTree());
		expect(rebuilt.resolve("Macintosh HD:AlmostLost")).toBeDefined();
	});
});

describe("reconcileWithAdapters", () => {
	const remoteTree = () => ({
		_type: ClassicyFileSystemEntryFileType.Directory,
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
