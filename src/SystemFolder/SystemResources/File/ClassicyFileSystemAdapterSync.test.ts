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
