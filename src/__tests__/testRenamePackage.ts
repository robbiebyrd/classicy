import { registerClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackage";
import { CLASSICY_DEFAULT_APPEARANCE_LAYOUT } from "@/Appearance/useClassicyAppearanceLayout";
// Registers Platinum's sound pack: the package's defaults are a Platinum
// theme, and a theme's `sound.pack` must name a registered pack.
import "../../packages/appearance/platinum/src/assets/sounds/platinum";
import { getTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";

/** The test package's id. */
export const TEST_RENAME_PACKAGE_ID = "test-rename";

/** The icon `test-rename` gives Movie Player: a 1x1 black square. */
export const TEST_RENAMED_ICON =
	"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1'%3E%3Crect width='1' height='1'/%3E%3C/svg%3E";

/** The icon `test-rename` gives the startup disk with `desktopIcons`: a 2x2 black square. */
export const TEST_STARTUP_DISK_ICON =
	"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='2' height='2'%3E%3Crect width='2' height='2'/%3E%3C/svg%3E";

/** The `desktopIcons` `test-rename` declares when asked to. */
export const TEST_DESKTOP_ICONS = {
	trash: {
		name: "Wastebasket",
		description: "Holds what you throw away.",
	},
	startupDisk: {
		name: "This Computer",
		icon: TEST_STARTUP_DISK_ICON,
		description: "Shows what is on this computer.",
	},
} as const;

/**
 * Registers `test-rename`, an Appearance Package with no CSS and Platinum's
 * layout whose `apps` renames and re-icons Movie Player (with balloon copy)
 * and renames the host app `TV.app`; with `{ desktopIcons: true }`, its
 * `desktopIcons` also relabels the Trash and the startup disk
 * (`TEST_DESKTOP_ICONS`). Tests that call it reset the registry afterwards
 * (`resetClassicyAppearancePackagesForTests`) and put Platinum back.
 */
export const registerTestRenamePackage = (
	options: { desktopIcons?: boolean } = {},
): void => {
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
		...(options.desktopIcons ? { desktopIcons: TEST_DESKTOP_ICONS } : {}),
	});
};
