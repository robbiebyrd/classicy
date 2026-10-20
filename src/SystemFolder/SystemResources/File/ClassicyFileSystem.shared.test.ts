// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import {
	ClassicyFileSystem,
	getClassicyFileSystemVersion,
	subscribeClassicyFileSystem,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";

const seed = {
	_type: "directory",
	HD: {
		_type: ClassicyFileSystemEntryFileType.Drive,
		Docs: { _type: ClassicyFileSystemEntryFileType.Directory },
	},
};

describe("ClassicyFileSystem shared trees", () => {
	it("gives every instance for a storage key the same live tree", () => {
		const a = new ClassicyFileSystem("shared-a", seed);
		const b = new ClassicyFileSystem("shared-a", { _type: "directory" });
		a.mkDir("HD:Docs:New");
		expect(b.resolve("HD:Docs:New")).toBeDefined();
		expect(b.fs).toBe(a.fs);
	});

	it("keeps storage keys apart", () => {
		const a = new ClassicyFileSystem("shared-b1", seed);
		const b = new ClassicyFileSystem("shared-b2", seed);
		a.mkDir("HD:Docs:Only A");
		expect(b.resolve("HD:Docs:Only A")).toBeUndefined();
	});

	it("notifies subscribers of every mutation and counts them", () => {
		const fs = new ClassicyFileSystem("shared-c", seed);
		const listener = vi.fn();
		const unsubscribe = subscribeClassicyFileSystem("shared-c", listener);
		const before = getClassicyFileSystemVersion("shared-c");
		fs.mkDir("HD:Docs:One");
		fs.setMetadata("HD:Docs:One", { _label: "x" });
		fs.move("HD:Docs:One", "HD");
		expect(listener).toHaveBeenCalledTimes(3);
		expect(getClassicyFileSystemVersion("shared-c")).toBe(before + 3);
		unsubscribe();
		fs.mkDir("HD:Docs:Two");
		expect(listener).toHaveBeenCalledTimes(3);
	});

	it("does not notify for derived overlays", () => {
		const fs = new ClassicyFileSystem("shared-d", seed);
		const listener = vi.fn();
		subscribeClassicyFileSystem("shared-d", listener);
		fs.applyDerivedTree({ ...fs.fs });
		expect(listener).not.toHaveBeenCalled();
	});

	it("re-reads storage when constructed under a new epoch, for every instance", () => {
		const a = new ClassicyFileSystem("shared-e", seed, ":", [], 0);
		a.flushNow();
		// The stored tree is replaced behind the live one's back (as an adapter
		// reconcile or Drive Setup does)…
		localStorage.setItem(
			"shared-e",
			JSON.stringify({
				...seed,
				HD: { ...seed.HD, Restored: { _type: "directory" } },
			}),
		);
		// …the same epoch keeps the live tree…
		expect(
			new ClassicyFileSystem("shared-e", seed, ":", [], 0).resolve(
				"HD:Restored",
			),
		).toBeUndefined();
		// …and a new one reloads it, through the older instance too.
		new ClassicyFileSystem("shared-e", seed, ":", [], 1);
		expect(a.resolve("HD:Restored")).toBeDefined();
	});
});
