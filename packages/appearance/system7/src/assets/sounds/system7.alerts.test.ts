import { describe, expect, it } from "vitest";
import { getClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackageRegistry";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import {
	classicyPackAlerts,
	classicyPackDefaultAlert,
	resolveClassicyAlertSound,
} from "@/SystemFolder/ControlPanels/SoundManager/ClassicyAlertSounds";
import { getClassicySoundPack } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundPacks";

// The pack declares its own alerts (plan 0018-dbd §4.2), so a host loading
// both packages offers System 7's six under System 7, never Platinum's.

const SIX = [
	{ value: "ClassicyAlertDroplet", label: "Droplet" },
	{ value: "ClassicyAlertIndigo", label: "Indigo" },
	{ value: "ClassicyAlertQuack", label: "Quack" },
	{ value: "ClassicyAlertSimpleBeep", label: "Simple Beep" },
	{ value: "ClassicyAlertSosumi", label: "Sosumi" },
	{ value: "ClassicyAlertWildEep", label: "Wild Eep" },
];

describe("System 7's alerts beside Platinum", () => {
	it("are System 7's own six, Simple Beep the default, while System 7 is active", async () => {
		await import("../../../../platinum/src/index");
		await import("../../index");
		expect(getClassicyAppearancePackage("platinum")).toBeDefined();

		dispatch({
			type: "ClassicyDesktopChangeAppearancePackage",
			packageId: "system7",
		});
		const appearance = useAppManager.getState().System.Manager.Appearance;
		expect(appearance.packageId).toBe("system7");
		for (const themeId of ["system7", "system7-color"]) {
			dispatch({ type: "ClassicyDesktopChangeTheme", activeTheme: themeId });
			const theme =
				useAppManager.getState().System.Manager.Appearance.activeTheme;
			expect(theme.id).toBe(themeId);
			const pack = getClassicySoundPack(theme.sound.pack);
			expect(pack?.id).toBe("system7");
			// What the Appearance Manager's Sound tab lists, and what plays.
			expect(classicyPackAlerts(pack)).toEqual(SIX);
			expect(classicyPackDefaultAlert(pack)).toBe("ClassicyAlertSimpleBeep");
			expect(resolveClassicyAlertSound(pack, "ClassicyAlertTabitha")).toBe(
				"ClassicyAlertSimpleBeep",
			);
			expect(resolveClassicyAlertSound(pack, "ClassicyAlertQuack")).toBe(
				"ClassicyAlertQuack",
			);
		}
	}, 60_000);
});
