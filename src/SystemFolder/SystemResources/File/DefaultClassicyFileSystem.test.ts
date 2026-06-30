import { describe, expect, it } from "vitest";
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";

describe("DefaultClassicyFileSystem Pdf seed data", () => {
	it("seeds a Sample.pdf document with the Pdf file type and a URL", () => {
		const fs = new ClassicyFileSystem();
		const entry = fs.resolve("Macintosh HD:Documents:Sample.pdf");

		expect(entry?._type).toBe(ClassicyFileSystemEntryFileType.Pdf);
		expect(entry?._mimeType).toBe("application/pdf");
		expect(typeof entry?._data).toBe("string");
		expect(entry?._data as string).toMatch(/^https?:\/\//);
	});
});
