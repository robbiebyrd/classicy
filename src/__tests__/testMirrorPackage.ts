import {
	type ClassicyAppearanceLayout,
	registerClassicyAppearancePackage,
} from "@/Appearance/ClassicyAppearancePackage";
import { getTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";

/** The test package's id. */
export const TEST_MIRROR_PACKAGE_ID = "test-mirror";

/**
 * Every arrangement flipped from Platinum's: grow box bottom-left, menus in
 * each window, desktop icons laid out from the top left.
 */
export const TEST_MIRROR_LAYOUT: ClassicyAppearanceLayout = {
	window: { growBoxCorner: "bottom-left" },
	menuBar: { placement: "window" },
	desktop: { iconGridOrigin: "top-left" },
};

/**
 * Registers `test-mirror`, an Appearance Package with no CSS whose layout is
 * `TEST_MIRROR_LAYOUT`. Tests that call it reset the registry afterwards
 * (`resetClassicyAppearancePackagesForTests`) and put Platinum back.
 */
export const registerTestMirrorPackage = (): void => {
	registerClassicyAppearancePackage({
		id: TEST_MIRROR_PACKAGE_ID,
		name: "Mirror",
		css: "",
		defaults: {
			...getTheme("default"),
			id: "test-mirror-default",
			package: TEST_MIRROR_PACKAGE_ID,
		},
		layout: TEST_MIRROR_LAYOUT,
	});
};
