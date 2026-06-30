import { describe, expect, it } from "vitest";
import {
	isPDFViewerData,
	type PDFViewerData,
} from "@/SystemFolder/PDFViewer/PDFViewerUtils";

describe("isPDFViewerData", () => {
	it("returns true for a valid PDFViewerData shape", () => {
		const data: PDFViewerData = { openFiles: [] };
		expect(isPDFViewerData(data)).toBe(true);
	});

	it("returns true when openFiles contains paths", () => {
		const data: PDFViewerData = {
			openFiles: ["Macintosh HD:Documents:Sample.pdf"],
		};
		expect(isPDFViewerData(data)).toBe(true);
	});

	it("returns false when openFiles is not an array", () => {
		expect(isPDFViewerData({ openFiles: "not-an-array" })).toBe(false);
	});

	it("returns false when openFiles key is missing", () => {
		expect(isPDFViewerData({})).toBe(false);
	});

	it("returns false for null", () => {
		expect(isPDFViewerData(null as unknown as Record<string, unknown>)).toBe(
			false,
		);
	});
});
