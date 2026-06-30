import { describe, expect, it } from "vitest";
import { deepMergeReplacingArrays } from "@/SystemFolder/SystemResources/Utils/deepMerge";

describe("deepMergeReplacingArrays", () => {
	it("merges a nested primitive without touching siblings", () => {
		const base = { a: { x: 1, y: 2 }, b: 3 };
		const merged = deepMergeReplacingArrays(base, { a: { x: 99 } });
		expect(merged.a.x).toBe(99);
		expect(merged.a.y).toBe(2);
		expect(merged.b).toBe(3);
	});

	it("replaces arrays wholesale rather than concatenating", () => {
		const base = { list: [1, 2, 3] };
		const merged = deepMergeReplacingArrays(base, { list: [9] });
		expect(merged.list).toEqual([9]);
	});

	it("override primitive wins over base", () => {
		const base = { count: 1 };
		const merged = deepMergeReplacingArrays(base, { count: 42 });
		expect(merged.count).toBe(42);
	});

	it("skips override keys whose value is undefined", () => {
		const base = { name: "base-name" };
		const merged = deepMergeReplacingArrays(base, { name: undefined });
		expect(merged.name).toBe("base-name");
	});

	it("does not mutate the base argument", () => {
		const base = { a: { x: 1 } };
		const before = base.a.x;
		deepMergeReplacingArrays(base, { a: { x: 99 } });
		expect(base.a.x).toBe(before);
	});

	it("does not alias array overrides into the result", () => {
		const overrideArr = [9];
		const base = { list: [1, 2, 3] };
		const merged = deepMergeReplacingArrays(base, { list: overrideArr });
		merged.list.push(99);
		expect(overrideArr).toEqual([9]);
	});
});
