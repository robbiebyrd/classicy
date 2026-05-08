import { describe, expect, it } from "vitest";
import {
	isPictureViewerData,
	type PictureViewerData,
} from "@/SystemFolder/QuickTime/PictureViewer/PictureViewerUtils";

describe("isPictureViewerData", () => {
	it("returns true for a valid PictureViewerData shape", () => {
		const data: PictureViewerData = { openFiles: [] };
		expect(isPictureViewerData(data)).toBe(true);
	});

	it("returns true when openFiles contains documents", () => {
		const data: PictureViewerData = {
			openFiles: [{ url: "http://example.com/img.png", name: "Image" }],
		};
		expect(isPictureViewerData(data)).toBe(true);
	});

	it("returns false when openFiles is not an array", () => {
		expect(isPictureViewerData({ openFiles: "not-an-array" })).toBe(false);
	});

	it("returns false when openFiles key is missing", () => {
		expect(isPictureViewerData({})).toBe(false);
	});

	it("returns false for null", () => {
		expect(isPictureViewerData(null as unknown as Record<string, unknown>)).toBe(false);
	});

	it("narrows the type so openFiles is accessible without casting", () => {
		const data: Record<string, unknown> = { openFiles: [] };
		if (isPictureViewerData(data)) {
			const files: import("@/SystemFolder/QuickTime/PictureViewer/PictureViewerUtils").QuickTimeImageDocument[] =
				data.openFiles;
			expect(files).toHaveLength(0);
		} else {
			throw new Error("Expected isPictureViewerData to return true");
		}
	});
});
