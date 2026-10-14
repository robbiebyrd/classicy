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

describe("classicyDesktopEventHandler — ClassicyDesktopChangeAlertVolume", () => {
	const setAlertVolume = (ds: ClassicyStore, alertVolume?: unknown) =>
		classicyDesktopEventHandler(ds, {
			type: "ClassicyDesktopChangeAlertVolume",
			alertVolume,
		});

	it("writes the alert volume into Appearance state", () => {
		const ds = makeStore();
		setAlertVolume(ds, 35);
		expect(ds.System.Manager.Appearance.alertVolume).toBe(35);
	});

	it("clamps to 0–100 and rounds to a whole percentage", () => {
		const ds = makeStore();
		setAlertVolume(ds, 140);
		expect(ds.System.Manager.Appearance.alertVolume).toBe(100);
		setAlertVolume(ds, -3);
		expect(ds.System.Manager.Appearance.alertVolume).toBe(0);
		setAlertVolume(ds, 49.5);
		expect(ds.System.Manager.Appearance.alertVolume).toBe(50);
	});

	it("ignores a missing, non-numeric or non-finite payload", () => {
		const ds = makeStore();
		ds.System.Manager.Appearance.alertVolume = 70;
		for (const bad of [undefined, "50", Number.NaN, Infinity]) {
			setAlertVolume(ds, bad);
			expect(ds.System.Manager.Appearance.alertVolume).toBe(70);
		}
	});

	it("seeds a 100% alert volume in the initial store", () => {
		expect(DefaultAppManagerState.System.Manager.Appearance.alertVolume).toBe(
			100,
		);
	});
});
