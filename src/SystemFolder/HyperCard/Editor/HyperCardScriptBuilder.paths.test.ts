import { describe, expect, it } from "vitest";
import {
	type HCActionPath,
	listAt,
	withListAt,
} from "@/SystemFolder/HyperCard/Editor/HyperCardScriptBuilder";
import type {
	HCAction,
	HCEventHandlers,
} from "@/SystemFolder/HyperCard/HyperCardModel";

const handlers = (): HCEventHandlers => ({
	onMouseUp: [
		{
			do: "if",
			condition: "true",
			then: [{ do: "go", to: "next" }],
			else: [{ do: "go", to: "prev" }],
		},
	],
});

describe("listAt / withListAt branch guard", () => {
	it("navigates a valid branch hop", () => {
		const path: HCActionPath = {
			event: "onMouseUp",
			hops: [{ index: 0, branch: "then" }],
		};
		expect(listAt(handlers(), path)).toEqual([{ do: "go", to: "next" }]);
	});

	it("replaces a nested list at a valid branch hop", () => {
		const path: HCActionPath = {
			event: "onMouseUp",
			hops: [{ index: 0, branch: "else" }],
		};
		const next: HCAction[] = [{ do: "go", to: "first" }];
		const result = withListAt(handlers(), path, next);
		expect(listAt(result, path)).toEqual(next);
	});

	// The branch union is compile-time only. A hostile path — e.g. one parsed
	// from untrusted stack data by a future caller — must not turn the bracket
	// assignment into a prototype-pollution sink.
	it("ignores a __proto__ hop instead of polluting Object.prototype", () => {
		const evil: HCActionPath = {
			event: "onMouseUp",
			hops: [{ index: 0, branch: "__proto__" as unknown as "then" }],
		};
		const before = handlers();
		expect(listAt(before, evil)).toEqual([]);
		const result = withListAt(before, evil, [{ do: "go", to: "last" }]);
		expect(result).toEqual(before);
		expect(({} as Record<string, unknown>)["0"]).toBeUndefined();
		expect(Object.prototype).not.toHaveProperty("0");
	});
});
