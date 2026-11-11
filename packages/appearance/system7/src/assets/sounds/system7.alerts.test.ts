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

// The placeholder pack declares no alerts, so until the System 7.5 sounds
// land (plan 0018-dbd §4.2) it takes the default pack's: a host loading both
// packages offers Platinum's alerts under System 7, never an empty list.

describe("System 7's alerts beside Platinum", () => {
	it("are Platinum's, with Platinum's default, while System 7 is active", async () => {
		const { platinumSoundPack } = await import(
			"../../../../platinum/src/assets/sounds/platinum"
		);
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
			expect(classicyPackAlerts(pack)).toEqual(platinumSoundPack.alerts);
			expect(classicyPackAlerts(pack).length).toBeGreaterThan(0);
			expect(classicyPackDefaultAlert(pack)).toBe("ClassicyAlertSosumi");
			expect(resolveClassicyAlertSound(pack, "ClassicyAlertQuack")).toBe(
				"ClassicyAlertQuack",
			);
		}
	}, 60_000);
});
