// @vitest-environment node

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
