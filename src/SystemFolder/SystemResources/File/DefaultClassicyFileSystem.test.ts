// @vitest-environment node

import { describe, expect, it } from "vitest";
import { validateStack } from "@/SystemFolder/HyperCard/HyperCardModel";
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import { decompressFromBase64 } from "@/SystemFolder/SystemResources/Utils/base64Compression";

describe("DefaultClassicyFileSystem Documents seed data", () => {
	it("seeds The Oregon Trail as a HyperCard stack that decodes and validates", async () => {
		const fs = new ClassicyFileSystem();
		const entry = fs.resolve("Macintosh HD:Documents:The Oregon Trail.stack");

		expect(entry?._type).toBe(ClassicyFileSystemEntryFileType.Stack);
		expect(entry?._url).toBeUndefined();
		expect(typeof entry?._data).toBe("string");

		// HyperCard's Finder loader reads `_data` exactly this way.
		const decoded = await decompressFromBase64(entry?._data as string);
		const result = validateStack(JSON.parse(new TextDecoder().decode(decoded)));
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.stack.name).toBe("The Oregon Trail");
	});

	it("seeds no sample PDFs or release notes", () => {
		const fs = new ClassicyFileSystem();

		expect(
			Object.keys(fs.resolve("Macintosh HD:Documents") ?? {})
				.filter((name) => !name.startsWith("_"))
				.sort(),
		).toEqual(["Read Me.txt", "The Oregon Trail.stack"]);
	});
});

describe("DefaultClassicyFileSystem system-file seed data", () => {
	it("marks the seeded Finder and System files as system files", () => {
		const fs = new ClassicyFileSystem();

		expect(fs.resolve("Macintosh HD:System Folder:Finder")?._system).toBe(true);
		expect(fs.resolve("Macintosh HD:System Folder:System")?._system).toBe(true);
	});

	it("does not mark unrelated seed entries as system files", () => {
		const fs = new ClassicyFileSystem();

		expect(
			fs.resolve("Macintosh HD:Documents:Read Me.txt")?._system,
		).toBeUndefined();
	});
});

describe("DefaultClassicyFileSystem Extensions folder", () => {
	it("seeds System Folder/Extensions as a directory", () => {
		const fs = new ClassicyFileSystem();
		const entry = fs.resolve("Macintosh HD:System Folder:Extensions");

		expect(entry?._type).toBe(ClassicyFileSystemEntryFileType.Directory);
	});
});
