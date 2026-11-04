import { describe, expect, it } from "vitest";
import {
	PARITY_FIREFOX_CASES,
	PARITY_FORCED_STATES,
} from "./parityForcedMatrix.ts";

describe("PARITY_FORCED_STATES", () => {
	const names = PARITY_FORCED_STATES.map((m) => `${m.story}__${m.state}`);

	it("keeps the 67 states of the post-b baseline", () =>
		expect(names).toHaveLength(67));

	it("names every state uniquely, since each name is a dump file", () =>
		expect(new Set(names).size).toBe(names.length));

	it("gives every op something to do", () => {
		for (const m of PARITY_FORCED_STATES)
			for (const op of m.ops)
				expect(
					op.click || (op.sel && (op.add || op.remove || op.set || op.force)),
				).toBeTruthy();
	});
});

describe("PARITY_FIREFOX_CASES", () => {
	it("keeps the 6 Firefox reads of the post-b baseline", () =>
		expect(PARITY_FIREFOX_CASES).toHaveLength(6));
});
