import { registerClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackage";
import { CLASSICY_DEFAULT_APPEARANCE_LAYOUT } from "@/Appearance/useClassicyAppearanceLayout";
import { getTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";

/** The test package's id. */
export const TEST_RENAME_PACKAGE_ID = "test-rename";

/** The icon `test-rename` gives Movie Player: a 1x1 black square. */
export const TEST_RENAMED_ICON =
	"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1'%3E%3Crect width='1' height='1'/%3E%3C/svg%3E";

/**
 * Registers `test-rename`, an Appearance Package with no CSS and Platinum's
 * layout whose `apps` renames and re-icons Movie Player (with balloon copy)
 * and renames the host app `TV.app`. Tests that call it reset the registry
 * afterwards (`resetClassicyAppearancePackagesForTests`) and put Platinum
 * back.
 */
export const registerTestRenamePackage = (): void => {
	registerClassicyAppearancePackage({
		id: TEST_RENAME_PACKAGE_ID,
		name: "Rename",
		css: "",
		defaults: {
			...getTheme("default"),
			id: "test-rename-default",
			package: TEST_RENAME_PACKAGE_ID,
		},
		layout: CLASSICY_DEFAULT_APPEARANCE_LAYOUT,
		apps: {
			"MoviePlayer.app": {
				name: "Media Player",
				icon: TEST_RENAMED_ICON,
				description: "Plays movies and sound.",
			},
			"TV.app": { name: "Television" },
		},
	});
};
