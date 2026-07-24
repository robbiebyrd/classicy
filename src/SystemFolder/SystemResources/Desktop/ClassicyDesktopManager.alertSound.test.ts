import { describe, expect, it } from "vitest";
import type { ClassicyStore } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { classicyDesktopEventHandler } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager";

// The handler mutates the store in place (matches sibling desktop-event tests).
// Only the Appearance slice is exercised by ClassicyDesktopChangeAlertSound.
function makeStore(alertSound?: string): ClassicyStore {
	return {
		System: {
			Manager: {
				Appearance: { availableThemes: [], activeTheme: {}, alertSound },
			},
		},
	} as unknown as ClassicyStore;
}

describe("classicyDesktopEventHandler — ClassicyDesktopChangeAlertSound", () => {
	it("writes the selected alert sound into Appearance state", () => {
		const ds = makeStore("ClassicyAlertSosumi");
		classicyDesktopEventHandler(ds, {
			type: "ClassicyDesktopChangeAlertSound",
			alertSound: "ClassicyAlertQuack",
		});
		expect(ds.System.Manager.Appearance.alertSound).toBe("ClassicyAlertQuack");
	});

	it("ignores a non-string payload", () => {
		const ds = makeStore("ClassicyAlertSosumi");
		classicyDesktopEventHandler(ds, {
			type: "ClassicyDesktopChangeAlertSound",
		});
		expect(ds.System.Manager.Appearance.alertSound).toBe("ClassicyAlertSosumi");
	});

	it("seeds the default alert sound in the initial store", () => {
		expect(DefaultAppManagerState.System.Manager.Appearance.alertSound).toBe(
			"ClassicyAlertSosumi",
		);
	});
});
