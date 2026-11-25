import { describe, expect, it } from "vitest";
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { ClassicyFileSystemEntryFileType as T } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";

// The test harness (src/__tests__/setup.ts) gives every case a fresh
// localStorage. A case that ends within the file system's 500 ms persist
// debounce leaves its write pending; the harness flushes it into that case's
// own storage first. Without that, the next case's first instance drained it
// into the fresh storage and read it back as its tree (CI on PR #347: Find
// File's Items Found test searched the previous case's 100 files).
describe("one case's file system, the next case's", () => {
	it("writes a file and ends with its persist still pending", () => {
		new ClassicyFileSystem().writeFile("Macintosh HD:Left Behind.txt", "x", {
			_type: T.TextFile,
		});
		expect(localStorage.getItem("classicyStorage")).not.toContain(
			"Left Behind.txt",
		);
	});

	it("starts from the defaults, not from the last case's pending write", () => {
		const fs = new ClassicyFileSystem();
		expect(fs.resolve("Macintosh HD:Left Behind.txt")).toBeUndefined();
		expect(localStorage.getItem("classicyStorage")).not.toContain(
			"Left Behind.txt",
		);
	});
});
