import {
	type ClassicyAppearanceLayout,
	registerClassicyAppearancePackage,
} from "@/Appearance/ClassicyAppearancePackage";
// Registers Platinum's sound pack: the package's defaults are a Platinum
// theme, and a theme's `sound.pack` must name a registered pack.
import "../../packages/appearance/platinum/src/assets/sounds/platinum";
import { getTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";

/** The test package's id. */
export const TEST_TASKBAR_PACKAGE_ID = "test-taskbar";

/**
 * A Windows-shell arrangement (plan 0020-w98 §1): menus in each window, as a
 * taskbar requires, and a taskbar along the desktop's bottom. Every other
 * window behavior keeps the core's default, so a test sees the taskbar alone.
 */
export const TEST_TASKBAR_LAYOUT: ClassicyAppearanceLayout = {
	window: { growBoxCorner: "bottom-right" },
	menuBar: { placement: "window" },
	desktop: { iconGridOrigin: "top-left" },
	taskbar: { startLabel: "Start" },
};

/** The id of the test package that minimizes (`TEST_MINIMIZE_LAYOUT`). */
export const TEST_MINIMIZE_PACKAGE_ID = "test-taskbar-minimize";

/**
 * `TEST_TASKBAR_LAYOUT` whose collapse box minimizes (`window.collapse:
 * "minimize"`, plan 0020-w98 §5 "Minimize"), which the schema allows only
 * beside a taskbar. Register it with
 * `registerTestTaskbarPackage(TEST_MINIMIZE_LAYOUT, TEST_MINIMIZE_PACKAGE_ID)`.
 */
export const TEST_MINIMIZE_LAYOUT: ClassicyAppearanceLayout = {
	...TEST_TASKBAR_LAYOUT,
	window: { ...TEST_TASKBAR_LAYOUT.window, collapse: "minimize" },
};

/**
 * Registers `test-taskbar` (or `id`), an Appearance Package with no CSS whose
 * layout is `layout` (`TEST_TASKBAR_LAYOUT` by default). Tests that call it
 * reset the registry afterwards (`resetClassicyAppearancePackagesForTests`)
 * and put Platinum back.
 */
export const registerTestTaskbarPackage = (
	layout: ClassicyAppearanceLayout = TEST_TASKBAR_LAYOUT,
	id: string = TEST_TASKBAR_PACKAGE_ID,
): void => {
	registerClassicyAppearancePackage({
		id,
		name: "Taskbar",
		css: "",
		defaults: { ...getTheme("default"), id: `${id}-default`, package: id },
		layout,
	});
};

/** The id of the test package that maximizes (`TEST_MAXIMIZE_LAYOUT`). */
export const TEST_MAXIMIZE_PACKAGE_ID = "test-maximize";

/**
 * Windows 98's window behavior from plan 0020-w98 step 6: the zoom box
 * maximizes (`window.zoom: "maximize"`) and a double-click on the caption
 * zooms (`window.titleDoubleClick: "zoom"`), with the menu bar on the screen
 * and no taskbar, as the package declares them before its shell lands. Every
 * other window behavior keeps the core's default. Register it with
 * `registerTestTaskbarPackage(TEST_MAXIMIZE_LAYOUT, TEST_MAXIMIZE_PACKAGE_ID)`.
 */
export const TEST_MAXIMIZE_LAYOUT: ClassicyAppearanceLayout = {
	window: {
		growBoxCorner: "bottom-right",
		zoom: "maximize",
		titleDoubleClick: "zoom",
	},
	menuBar: { placement: "screen" },
	desktop: { iconGridOrigin: "top-left" },
};
