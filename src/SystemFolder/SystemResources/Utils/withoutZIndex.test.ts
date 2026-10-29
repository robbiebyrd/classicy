import { describe, expect, it } from "vitest";
import { withoutZIndex } from "@/SystemFolder/SystemResources/Utils/withoutZIndex";

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
});
