import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import {
	ClassicyDefaultFileSystemContext,
	useClassicyFileSystem,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemContext";
import {
	ClassicyFileSystemEntryFileType,
	type ClassicyFileSystemTree,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import { DefaultFSContent } from "@/SystemFolder/SystemResources/File/DefaultClassicyFileSystem";
import {
	type ClassicyLogEntry,
	registerClassicyLogSink,
	unregisterClassicyLogSink,
} from "@/SystemFolder/SystemResources/Log/ClassicyLog";

// Story 0098: a fresh boot's live tree must be a copy of the defaults, never
// the defaults themselves, so one session's edits cannot leak into another
// storage key, a later boot with no storage, or Drive Setup.

/** DefaultFSContent as this file loaded it, before any test ran. */
const PRISTINE_DEFAULTS = structuredClone(DefaultFSContent);

/** Every object reachable from `tree`, the root included. */
const objectsIn = (tree: unknown, found = new Set<object>()): Set<object> => {
	if (tree !== null && typeof tree === "object" && !found.has(tree)) {
		found.add(tree);
		for (const child of Object.values(tree)) objectsIn(child, found);
	}
	return found;
};

/** The objects `a` and `b` have in common, at any depth. */
const sharedObjects = (a: unknown, b: unknown): object[] => {
	const inB = objectsIn(b);
	return [...objectsIn(a)].filter((object) => inB.has(object));
};

/** Edits of every kind, on entries the default tree seeds. */
const editDefaults = (fs: ClassicyFileSystem) => {
	fs.writeFile("Macintosh HD:Documents:Mine.txt", "mine");
	fs.setMetadata("Macintosh HD:Documents:Read Me.txt", { _label: "edited" });
	fs.setMetadata("Macintosh HD:Applications:Calculator", { _data: "my sums" });
	fs.rmDir("Macintosh HD:Documents:Release Notes.md");
	fs.move("Macintosh HD:Users:Guest", "Macintosh HD:Documents");
};

const hostTree = (): ClassicyFileSystemTree =>
	({
		"Host HD": {
			_type: ClassicyFileSystemEntryFileType.Drive,
			Notes: {
				_type: ClassicyFileSystemEntryFileType.Directory,
				"a.txt": {
					_type: ClassicyFileSystemEntryFileType.TextFile,
					_data: "host a",
				},
				Inner: {
					_type: ClassicyFileSystemEntryFileType.Directory,
					"b.txt": {
						_type: ClassicyFileSystemEntryFileType.TextFile,
						_data: "host b",
					},
				},
			},
		},
	}) as unknown as ClassicyFileSystemTree;

const editHost = (fs: ClassicyFileSystem) => {
	fs.writeFile("Host HD:Notes:Mine.txt", "mine");
	fs.setMetadata("Host HD:Notes:a.txt", { _label: "edited" });
	fs.rmDir("Host HD:Notes:Inner:b.txt");
	fs.move("Host HD:Notes:a.txt", "Host HD:Notes:Inner");
};

function wrapperFor(
	defaultFileSystem: ClassicyFileSystemTree,
	mode: "merge" | "exclusive",
) {
	return function Wrapper({ children }: { children: ReactNode }) {
		return (
			<ClassicyDefaultFileSystemContext.Provider
				value={{ defaultFileSystem, mode }}
			>
				{children}
			</ClassicyDefaultFileSystemContext.Provider>
		);
	};
}

describe("a fresh boot seeds a copy of the defaults (0098)", () => {
	it("shares no object with DefaultFSContent, at any depth", () => {
		const fs = new ClassicyFileSystem("seed-copy");
		expect(fs.fs).toEqual(PRISTINE_DEFAULTS);
		expect(sharedObjects(fs.fs, DefaultFSContent)).toEqual([]);
	});

	it("never changes DefaultFSContent, and another storage key sees untouched defaults", () => {
		editDefaults(new ClassicyFileSystem("seed-edited"));

		expect(DefaultFSContent).toEqual(PRISTINE_DEFAULTS);
		const other = new ClassicyFileSystem("seed-other");
		expect(other.fs).toEqual(PRISTINE_DEFAULTS);
		expect(other.resolve("Macintosh HD:Documents:Mine.txt")).toBeUndefined();
	});

	it("seeds untouched defaults again when a reload finds no storage", () => {
		const fs = new ClassicyFileSystem(
			"seed-reload",
			DefaultFSContent,
			":",
			[],
			0,
		);
		editDefaults(fs);
		fs.flushNow();
		localStorage.clear();

		const reloaded = new ClassicyFileSystem(
			"seed-reload",
			DefaultFSContent,
			":",
			[],
			1,
		);
		expect(reloaded.fs).toEqual(PRISTINE_DEFAULTS);
		expect(sharedObjects(reloaded.fs, DefaultFSContent)).toEqual([]);
		editDefaults(reloaded);
		expect(DefaultFSContent).toEqual(PRISTINE_DEFAULTS);
	});

	it("never lets a fresh boot's seed migration rewrite the defaults", () => {
		const readMe = PRISTINE_DEFAULTS["Macintosh HD"].Documents["Read Me.txt"];
		const fs = new ClassicyFileSystem("seed-migrated", DefaultFSContent, ":", [
			{
				op: "replace",
				path: "Macintosh HD:Documents:Read Me.txt",
				ifData: readMe._data,
				data: "migrated",
			},
		]);

		expect(fs.readFile("Macintosh HD:Documents:Read Me.txt")).toBe("migrated");
		expect(DefaultFSContent).toEqual(PRISTINE_DEFAULTS);
	});

	it("never changes a host's tree passed straight to the constructor", () => {
		const host = hostTree();
		const pristine = structuredClone(host);
		const fs = new ClassicyFileSystem("seed-host-direct", host);
		expect(sharedObjects(fs.fs, host)).toEqual([]);

		editHost(fs);

		expect(host).toEqual(pristine);
	});

	describe("a tree structuredClone refuses", () => {
		const logged: ClassicyLogEntry[] = [];
		afterEach(() => {
			unregisterClassicyLogSink("seed-fallback");
			logged.length = 0;
			vi.restoreAllMocks();
		});

		it("is copied as JSON, with a warning, instead of throwing", () => {
			vi.spyOn(console, "warn").mockImplementation(() => undefined);
			registerClassicyLogSink({
				id: "seed-fallback",
				onLog: (entry) => logged.push(entry),
			});
			const host = hostTree() as Record<string, Record<string, unknown>>;
			host["Host HD"]._onOpen = () => "a function";

			const fs = new ClassicyFileSystem("seed-uncloneable", host);

			expect(sharedObjects(fs.fs, host)).toEqual([]);
			expect(fs.fs).toEqual(JSON.parse(JSON.stringify(host)));
			expect(
				logged.filter(
					(entry) =>
						entry.level === "warn" && entry.subsystem === "ClassicyFileSystem",
				),
			).toHaveLength(1);
		});
	});
});

describe.each([
	"exclusive",
	"merge",
] as const)("a host's defaultFileSystem in %s mode (0098)", (mode) => {
	it("is unchanged by edits, and a second storage key seeds from it untouched", () => {
		const host = hostTree();
		const pristine = structuredClone(host);
		const wrapper = wrapperFor(host, mode);
		const { result } = renderHook(
			() => useClassicyFileSystem(`seed-${mode}-a`),
			{ wrapper },
		);

		act(() => {
			editHost(result.current);
			editDefaults(result.current);
		});
		expect(result.current.resolve("Host HD:Notes:Mine.txt")).toBeDefined();

		expect(host).toEqual(pristine);
		expect(DefaultFSContent).toEqual(PRISTINE_DEFAULTS);
		const { result: second } = renderHook(
			() => useClassicyFileSystem(`seed-${mode}-b`),
			{ wrapper },
		);
		expect(second.current.fs["Host HD"]).toEqual(pristine["Host HD"]);
	});
});
