import { describe, expect, it } from "vitest";
import type { ClassicyStore } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { classicyDesktopEventHandler } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager";

// The handler mutates the store in place (matches sibling desktop-event tests).
// Only the Appearance slice is exercised by ClassicyDesktopSetSmartScrolling.
function makeStore(smartScrolling?: boolean): ClassicyStore {
	return {
		System: {
			Manager: {
				Appearance: { availableThemes: [], activeTheme: {}, smartScrolling },
			},
		},
	} as unknown as ClassicyStore;
}

describe("classicyDesktopEventHandler — ClassicyDesktopSetSmartScrolling", () => {
	it("turns Smart Scrolling off", () => {
		const ds = makeStore(true);
		classicyDesktopEventHandler(ds, {
			type: "ClassicyDesktopSetSmartScrolling",
			smartScrolling: false,
		});
		expect(ds.System.Manager.Appearance.smartScrolling).toBe(false);
	});

	it("turns Smart Scrolling back on", () => {
		const ds = makeStore(false);
		classicyDesktopEventHandler(ds, {
			type: "ClassicyDesktopSetSmartScrolling",
			smartScrolling: true,
		});
		expect(ds.System.Manager.Appearance.smartScrolling).toBe(true);
	});

	it("ignores a non-boolean payload", () => {
		const ds = makeStore(true);
		classicyDesktopEventHandler(ds, {
			type: "ClassicyDesktopSetSmartScrolling",
		});
		expect(ds.System.Manager.Appearance.smartScrolling).toBe(true);
	});

	it("seeds Smart Scrolling on in the initial store (Mac OS 8.0 default)", () => {
		expect(
			DefaultAppManagerState.System.Manager.Appearance.smartScrolling,
		).toBe(true);
	});
});
