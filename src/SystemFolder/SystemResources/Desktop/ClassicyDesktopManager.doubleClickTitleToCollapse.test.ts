import { describe, expect, it } from "vitest";
import type { ClassicyStore } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { classicyDesktopEventHandler } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager";

// The handler mutates the store in place (matches sibling desktop-event tests).
// Only the Desktop slice is exercised by
// ClassicyDesktopSetDoubleClickTitleToCollapse.
function makeStore(doubleClickTitleToCollapse?: boolean): ClassicyStore {
	return {
		System: {
			Manager: {
				Desktop: { doubleClickTitleToCollapse },
			},
		},
	} as unknown as ClassicyStore;
}

describe("classicyDesktopEventHandler — ClassicyDesktopSetDoubleClickTitleToCollapse (#280)", () => {
	it("turns double-click-to-collapse off", () => {
		const ds = makeStore(true);
		classicyDesktopEventHandler(ds, {
			type: "ClassicyDesktopSetDoubleClickTitleToCollapse",
			doubleClickTitleToCollapse: false,
		});
		expect(ds.System.Manager.Desktop.doubleClickTitleToCollapse).toBe(false);
	});

	it("turns double-click-to-collapse back on", () => {
		const ds = makeStore(false);
		classicyDesktopEventHandler(ds, {
			type: "ClassicyDesktopSetDoubleClickTitleToCollapse",
			doubleClickTitleToCollapse: true,
		});
		expect(ds.System.Manager.Desktop.doubleClickTitleToCollapse).toBe(true);
	});

	it("ignores a missing payload", () => {
		const ds = makeStore(true);
		classicyDesktopEventHandler(ds, {
			type: "ClassicyDesktopSetDoubleClickTitleToCollapse",
		});
		expect(ds.System.Manager.Desktop.doubleClickTitleToCollapse).toBe(true);
	});

	it("ignores a non-boolean payload", () => {
		const ds = makeStore(true);
		classicyDesktopEventHandler(ds, {
			type: "ClassicyDesktopSetDoubleClickTitleToCollapse",
			doubleClickTitleToCollapse: "no",
		});
		expect(ds.System.Manager.Desktop.doubleClickTitleToCollapse).toBe(true);
	});

	it("seeds the setting on in the initial store", () => {
		expect(
			DefaultAppManagerState.System.Manager.Desktop.doubleClickTitleToCollapse,
		).toBe(true);
	});
});
