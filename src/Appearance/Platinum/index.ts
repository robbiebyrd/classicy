// The Platinum Appearance Package (Mac OS 8). Importing this module registers
// it; ClassicyDesktop imports it, so `import "classicy"` is enough.
//
// Hand-written, not a barrelsby barrel (it carries no barrelsby header, so
// `generate-barrels` never purges it). barrelsby treats it as this folder's
// barrel, so the top barrel re-exports this file in place of the modules
// below it: re-export their public names here, or src/index.ts loses them.

import type { ClassicyAppearanceLayout } from "@/Appearance/ClassicyAppearancePackage";
import { registerClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackageRegistry";
import { classicyKnobsToSchema } from "@/Appearance/ClassicyAppearancePackageSchema";
import {
	getAllThemes,
	getTheme,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
// Both register at module load: the Platinum assets (system art, cursors,
// wallpapers, fonts) and the Platinum sound pack. The sound pack must come
// first, since the package below is validated and a theme's `sound.pack` must
// name a registered pack. The package lists them; it never registers them a
// second time.
import "./assets/platinumAssets";
import { platinumSoundPack } from "./assets/sounds/platinum";
import platinumJson from "./platinum.json";
import platinumCss from "./styles/platinum.scss?inline";

export * from "./assets/platinumAssets";
export * from "./assets/sounds/platinum";

/** The Platinum package's id. */
export const PLATINUM_APPEARANCE_PACKAGE_ID = "platinum";

// The themes are platinum.json's, as getAllThemes() serves them (wallpapers
// resolved for this build, metrics and package filled): the same objects as
// the store's built-in list and CLASSICY_FALLBACK_APPEARANCE_PACKAGE, so a
// switch to Platinum activates a theme whose wallpaper loads.
registerClassicyAppearancePackage({
	id: PLATINUM_APPEARANCE_PACKAGE_ID,
	name: platinumJson.name,
	defaults: getTheme(platinumJson.defaults.id),
	presets: getAllThemes(),
	css: platinumCss,
	options: classicyKnobsToSchema(platinumJson.knobs),
	layout: platinumJson.layout as ClassicyAppearanceLayout,
	sounds: [platinumSoundPack],
});
