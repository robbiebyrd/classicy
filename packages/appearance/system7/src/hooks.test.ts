import { playClassicyAppearanceSound } from "@classicy/classicy";
import { describe, expect, it, vi } from "vitest";
import { system7AppearanceHooks } from "./hooks";

// System 7 had no interface feedback sounds (design 0017-6me): no handler of
// its hooks plays one. The core's player is replaced by a spy for this file,
// so a handler that imported and called it would be caught here (a spy on
// the module namespace from the test could not see a call made through the
// handler's own import binding).
vi.mock("@classicy/classicy", async (importOriginal) => ({
	...(await importOriginal<typeof import("@classicy/classicy")>()),
	playClassicyAppearanceSound: vi.fn(),
}));

describe("System 7's hooks", () => {
	it("play no sound, whatever they handle", () => {
		const on = system7AppearanceHooks.on ?? {};
		let handlers = 0;
		for (const [component, events] of Object.entries(on))
			for (const [event, handler] of Object.entries(events ?? {})) {
				for (const input of ["pointer", "keyboard"])
					(handler as (ctx: unknown) => unknown)({
						component,
						event,
						detail: { itemId: "x", input },
					});
				handlers++;
			}
		expect(handlers).toBeGreaterThan(0);
		expect(vi.mocked(playClassicyAppearanceSound)).not.toHaveBeenCalled();
	});
});
