import {
	getAllThemes,
	getTheme,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import {
	CLASSICY_DEFAULT_APPEARANCE_LAYOUT,
	CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID,
} from "./ClassicyAppearanceDefaults";
import type { ClassicyAppearancePackage } from "./ClassicyAppearancePackage";

// Store-free, so useClassicyAppearance (wired into every control) can read
// the fallback without loading the app manager's store; re-exported from
// ClassicyAppearancePackage.ts, its contract home. Built at module
// evaluation: ClassicyAppearance has no runtime edge back to the Appearance
// modules, so the themes are always initialized here whichever module a
// bundle evaluates first (ClassicyAppearancePackage.test.tsx loads each entry
// point into a fresh module graph).

/**
 * Platinum's structure without its look: the Platinum defaults, presets and
 * layout, and no CSS or hooks. Returned only while no package is registered
 * at all (lone-component tests, a host that never loads Platinum). Frozen
 * shallowly: `defaults` and `presets` are the shared built-in theme objects.
 */
export const CLASSICY_FALLBACK_APPEARANCE_PACKAGE: ClassicyAppearancePackage =
	Object.freeze({
		id: CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID,
		name: "Platinum",
		css: "",
		defaults: getTheme("default"),
		presets: getAllThemes(),
		layout: CLASSICY_DEFAULT_APPEARANCE_LAYOUT,
	});
