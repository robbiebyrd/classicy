// The "renamed" Appearance Package: Storybook only, never shipped. It is the
// proof that a package's `apps` overrides reach every surface an app's name
// and icon are drawn on (desktop icon, Applications folder, App Switcher,
// Apple menu, About, window titles, startup parade, Control Strip), and the
// template for a package that renames or re-icons apps:
//   - `apps` shows Movie Player as "Media Player" with its own icon and
//     balloon copy, and the host app TV.app as "Television" with its own icon;
//   - `css` is Platinum's look, rescoped to this package, and `layout` and
//     `hooks` are Platinum's, so a story under it differs from Platinum only
//     in those names and icons (decision K-D8).
// Only ./renamed.ts imports this module, and only the story files that use
// the package import that, so the package registers only in a story iframe
// that has loaded one of them (ruling F-R6), never in every iframe.
// Platinum first: its registered stylesheet, layout and hooks are read here.
import "@classicy/appearance-platinum";
import { PLATINUM_APPEARANCE_PACKAGE_ID } from "@classicy/appearance-platinum";
import type { ClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackage";
import {
	getClassicyAppearancePackage,
	registerClassicyAppearancePackage,
} from "@/Appearance/ClassicyAppearancePackageRegistry";
import { getTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
// `?no-inline`: served as files, never `data:` URIs, so a drawn icon's `src`
// names the art it shows.
import mediaPlayerIcon from "./renamed-media-player.svg?no-inline";
import televisionIcon from "./renamed-television.svg?no-inline";

/** The renamed package's id. */
export const RENAMED_APPEARANCE_PACKAGE_ID = "renamed";

/**
 * Platinum's stylesheet under this package's scope: only the value of every
 * `data-classicy-appearance` attribute selector changes, quoted or not.
 */
export const rescopeToRenamed = (css: string): string =>
	css.replace(
		/(data-classicy-appearance=)(["']?)platinum\2/g,
		`$1$2${RENAMED_APPEARANCE_PACKAGE_ID}$2`,
	);

const platinumPackage = (): ClassicyAppearancePackage => {
	const platinum = getClassicyAppearancePackage(PLATINUM_APPEARANCE_PACKAGE_ID);
	if (!platinum) {
		throw new Error(
			"The renamed package is built on Platinum, which is not registered.",
		);
	}
	return platinum;
};

const platinum = platinumPackage();

registerClassicyAppearancePackage({
	id: RENAMED_APPEARANCE_PACKAGE_ID,
	name: "Renamed (Storybook test)",
	css: rescopeToRenamed(platinum.css),
	defaults: {
		...getTheme("default"),
		id: "renamed-default",
		name: "Renamed",
		package: RENAMED_APPEARANCE_PACKAGE_ID,
	},
	layout: platinum.layout,
	hooks: platinum.hooks,
	apps: {
		"MoviePlayer.app": {
			name: "Media Player",
			icon: mediaPlayerIcon,
			description: "Plays movies and sound.",
		},
		"TV.app": { name: "Television", icon: televisionIcon },
	},
});
