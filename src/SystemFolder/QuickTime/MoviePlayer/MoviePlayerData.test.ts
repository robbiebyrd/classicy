import { describe, expect, it } from "vitest";
import {
	isMoviePlayerData,
	type MoviePlayerData,
} from "@/SystemFolder/QuickTime/MoviePlayer/MoviePlayerUtils";

describe("isMoviePlayerData", () => {
	it("returns true for a valid MoviePlayerData shape", () => {
		const data: MoviePlayerData = { openFiles: [] };
		expect(isMoviePlayerData(data)).toBe(true);
	});

	it("returns true when openFiles contains documents", () => {
		const data: MoviePlayerData = {
			openFiles: [{ url: "http://example.com/a.mp4", name: "Movie", type: "video" }],
		};
		expect(isMoviePlayerData(data)).toBe(true);
	});

	it("returns false when openFiles is not an array", () => {
		expect(isMoviePlayerData({ openFiles: "not-an-array" })).toBe(false);
	});

	it("returns false when openFiles key is missing", () => {
		expect(isMoviePlayerData({})).toBe(false);
	});

	it("returns false for null", () => {
		expect(isMoviePlayerData(null as unknown as Record<string, unknown>)).toBe(false);
	});

	it("returns false for a plain string value", () => {
		expect(isMoviePlayerData({ openFiles: 42 })).toBe(false);
	});

	it("narrows the type so openFiles is accessible without casting", () => {
		const data: Record<string, unknown> = { openFiles: [] };
		if (isMoviePlayerData(data)) {
			// TypeScript should allow this without a cast
			const files: import("@/SystemFolder/QuickTime/MoviePlayer/MoviePlayerUtils").MoviePlayerOpenFile[] =
				data.openFiles;
			expect(files).toHaveLength(0);
		} else {
			throw new Error("Expected isMoviePlayerData to return true");
		}
	});
});
