import { afterEach, describe, expect, it, vi } from "vitest";
import type { ClassicyStore } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";

/**
 * A state a storage adapter hands back may have been saved by an older build
 * on another device: it must be migrated exactly as the same state loaded
 * from this browser's localStorage (story 0229-ymq).
 */

const legacyWindow = (id: string, extra: Record<string, unknown> = {}) => ({
	id,
	closed: false,
	size: [400, 300],
	position: [20, 20],
	minimumSize: [100, 100],
	...extra,
});

/** Desktop state as builds before 1.0 and before custom themes saved it. */
function olderBuildState(): Record<string, unknown> {
	return {
		System: {
			Manager: {
				Applications: {
					apps: {
						// 0.x: windows as an array, a drag in progress saved.
						"Notes.app": {
							id: "Notes.app",
							name: "Notes",
							icon: "",
							open: true,
							windows: [
								legacyWindow("a", { zOrder: 1, dragging: true }),
								legacyWindow("b", { resizing: true, position: [70, 80] }),
							],
						},
					},
				},
				Desktop: {
					selectedIcons: [],
					icons: [],
					systemMenu: [],
					appMenu: [],
					selectBox: { size: [0, 0], start: [0, 0], active: false },
					disableBalloonHelp: false,
				},
				Appearance: {
					// Before built-ins were references: the built-in saved
					// whole, edited in place (v0.83 and earlier).
					activeTheme: {
						id: "default",
						name: "My Edited Default",
						color: { black: "#123456" },
					},
					// A list a build before the "never persisted" rule saved.
					availableThemes: [{ id: "stale", name: "Stale" }],
					// A custom theme from before measurements, with a wallpaper
					// path no build serves and a font size out of range.
					customThemes: [
						{
							id: "custom",
							name: "Custom",
							package: "platinum",
							typography: { ui: "Charcoal", uiSize: 200 },
							desktop: { backgroundImage: "/legacy/wallpapers/default.png" },
						},
					],
				},
				DateAndTime: {
					show: true,
					dateTime: "2001-09-11T12:46:00.000Z",
					timeZoneOffset: "-4",
					militaryTime: false,
					displaySeconds: true,
					displayPeriod: true,
					displayDay: true,
					displayLongDay: false,
					flashSeparators: false,
				},
			},
		},
	};
}

/** The store's state as JSON (the store holds menu functions). */
const asJson = (state: ClassicyStore) => JSON.parse(JSON.stringify(state));

/** A fresh page: Platinum first, as a host's entry imports it, then the store. */
async function freshPage() {
	vi.resetModules();
	await import("@classicy/appearance-platinum");
	const utils = await import(
		"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils"
	);
	const sync = await import(
		"@/SystemFolder/ControlPanels/AppManager/ClassicyStateAdapter"
	);
	return { utils, sync };
}

afterEach(() => {
	vi.resetModules();
	localStorage.clear();
});

describe("adopting a state saved by an older build", () => {
	it("migrates it as the local load would", async () => {
		// This browser saved it.
		localStorage.setItem(
			"classicyDesktopState",
			JSON.stringify(olderBuildState()),
		);
		const local = await freshPage();
		const loaded = asJson(local.utils.useAppManager.getState());
		local.utils.stopAppManagerPersistence();
		localStorage.clear();

		// Another device saved it; this one boots with nothing and adopts it.
		const remote = await freshPage();
		remote.sync.registerClassicyStateAdapter({
			id: "remote",
			reconcile: async () => ({
				action: "replace",
				state: olderBuildState() as never,
			}),
		});
		await expect(remote.sync.reconcileClassicyState()).resolves.toBe(true);
		const adopted = asJson(remote.utils.useAppManager.getState());
		remote.utils.stopAppManagerPersistence();

		expect(adopted).toEqual(loaded);

		// And it was migrated, not taken as is.
		const { Applications, Appearance, DateAndTime } = adopted.System.Manager;
		const windows = Applications.apps["Notes.app"].windows;
		expect(Array.isArray(windows)).toBe(false);
		expect(Object.keys(windows)).toEqual(["a", "b"]);
		expect(windows.b.position).toEqual([70, 80]);
		expect("dragging" in windows.a).toBe(false);
		expect("resizing" in windows.b).toBe(false);
		// The edited built-in gives way to the preset, from the code.
		expect(Appearance.activeTheme.name).not.toBe("My Edited Default");
		expect(Appearance.activeTheme.package).toBe("platinum");
		expect(Appearance.availableThemes).toEqual([]);
		const custom = Appearance.customThemes[0];
		expect(custom.desktop.backgroundImage).toBe("default.png");
		expect(custom.typography.uiSize).toBe(72);
		expect(custom.measurements?.window).toBeDefined();
		expect(DateAndTime.dateTime).toBe("2001-09-11T12:46:00.000Z");
		expect(remote.utils.wasHydratedFromStorage()).toBe(true);
	});
});
