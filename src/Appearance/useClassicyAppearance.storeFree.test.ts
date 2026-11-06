import { expect, it, vi } from "vitest";

// Components wire useClassicyAppearance; its runtime graph must not reach the
// app manager's store, so a component that never reads the store does not
// load the store, reducer and default state, and store mocks never matter.
const { storeLoads } = vi.hoisted(() => ({ storeLoads: { count: 0 } }));

vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	async (importOriginal) => {
		storeLoads.count += 1;
		return importOriginal();
	},
);

it("loads without evaluating the app manager's store module", async () => {
	vi.resetModules();
	storeLoads.count = 0;
	const hook = await import("@/Appearance/useClassicyAppearance");
	expect(typeof hook.useClassicyAppearance).toBe("function");
	expect(storeLoads.count).toBe(0);
});
