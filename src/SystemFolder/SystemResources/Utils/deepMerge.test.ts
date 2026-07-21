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

	// Menus carry onClickFunc handlers and live in the app-manager store, so
	// merging store state routes functions through here. structuredClone throws
	// DataCloneError on functions; the clone must pass them through by reference.
	it("preserves a function handler nested in base", () => {
		const handler = () => "clicked";
		const base = { menu: [{ id: "cleanup", onClickFunc: handler }] };
		const merged = deepMergeReplacingArrays(base, { menu: base.menu });
		expect(merged.menu[0].onClickFunc).toBe(handler);
		expect(merged.menu[0].onClickFunc()).toBe("clicked");
	});

	it("preserves a function handler arriving in an override", () => {
		const handler = () => "saved";
		const base: { window: { title: string; onSaveFunc?: () => string } } = {
			window: { title: "Untitled" },
		};
		const merged = deepMergeReplacingArrays(base, {
			window: { onSaveFunc: handler },
		});
		expect(merged.window.onSaveFunc).toBe(handler);
		expect(merged.window.title).toBe("Untitled");
	});

	it("still deep-clones exotic objects rather than aliasing them", () => {
		// The anti-aliasing guarantee that motivated structuredClone must hold:
		// a Date in base must be copied, not shared, into the result.
		const base = { at: new Date("2001-09-11T12:40:00.000Z") };
		const merged = deepMergeReplacingArrays(base, {});
		expect(merged.at).not.toBe(base.at);
		expect(merged.at.getTime()).toBe(base.at.getTime());
	});
});
