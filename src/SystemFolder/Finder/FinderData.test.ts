import { describe, expect, it } from "vitest";
import {
	isFinderData,
	type FinderData,
} from "@/SystemFolder/Finder/FinderContext";

describe("isFinderData", () => {
	it("returns true for an empty object (all fields optional)", () => {
		const data: FinderData = {};
		expect(isFinderData(data)).toBe(true);
	});

	it("returns true when openPaths is a string array", () => {
		const data: FinderData = { openPaths: ["/Users/a", "/Users/b"] };
		expect(isFinderData(data)).toBe(true);
	});

	it("returns true when showAboutThisComputer is boolean", () => {
		const data: FinderData = { showAboutThisComputer: true };
		expect(isFinderData(data)).toBe(true);
	});

	it("returns false when openPaths is not an array", () => {
		expect(isFinderData({ openPaths: "not-an-array" })).toBe(false);
	});

	it("returns false when showAboutThisComputer is not boolean or undefined", () => {
		expect(isFinderData({ showAboutThisComputer: "yes" })).toBe(false);
	});

	it("returns false for null", () => {
		expect(isFinderData(null as unknown as Record<string, unknown>)).toBe(false);
	});

	it("narrows the type so openPaths is accessible without casting", () => {
		const data: Record<string, unknown> = { openPaths: ["/Users/a"] };
		if (isFinderData(data)) {
			const paths: string[] | undefined = data.openPaths;
			expect(paths).toEqual(["/Users/a"]);
		} else {
			throw new Error("Expected isFinderData to return true");
		}
	});
});
