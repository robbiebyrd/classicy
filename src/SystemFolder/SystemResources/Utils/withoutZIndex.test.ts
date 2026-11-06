import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { withoutZIndex } from "@/SystemFolder/SystemResources/Utils/withoutZIndex.internal";

describe("withoutZIndex", () => {
	it("drops zIndex and keeps every other key", () => {
		expect(withoutZIndex({ zIndex: 9, opacity: 0.5, left: 4 })).toEqual({
			opacity: 0.5,
			left: 4,
		});
	});

	it("returns the same object when there is no zIndex", () => {
		const style = { opacity: 0.5 };
		expect(withoutZIndex(style)).toBe(style);
	});

	it("passes undefined through", () => {
		expect(withoutZIndex(undefined)).toBeUndefined();
	});

	// Kept internal (0082-lgo k): a helper for the components whose state
	// classes own stacking, not API. It never shipped in a release, and the
	// barrel skips `.internal.ts` modules.
	it("is not exported from the package root", () => {
		expect(
			readFileSync(resolve(process.cwd(), "src/index.ts"), "utf8"),
		).not.toContain("withoutZIndex");
	});
});
