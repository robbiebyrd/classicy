// The "mirrored" Appearance Package: Storybook only, never shipped. It is the
// proof that every arrangement slot works, and the template for a package
// that rearranges Classicy:
//   - `layout` flips all three declarations from Platinum's (grow box
//     bottom-left, menus in each window, desktop icons from the top left);
//   - mirrored.scss is Platinum's look, rescoped, plus CSS `order` and flex
//     flips on the part attributes (data-classicy-control, -role, -part).
// Only ./mirrored.ts imports this module, and only the six `Mirrored` story
// files import that, so the package registers only in a story iframe that
// has loaded one of them (ruling F-R6), never in every iframe. Stories with
// `parameters.classicy.appearancePackage: "mirrored"` (`mirroredParameters`)
// switch to it; the decorator resets the store when such a story leaves, so
// the switch never outlives its story.
import { registerClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackageRegistry";
import { getTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import mirroredCss from "./mirrored.scss?inline";

/** The mirrored package's id. */
export const MIRRORED_APPEARANCE_PACKAGE_ID = "mirrored";

registerClassicyAppearancePackage({
	id: MIRRORED_APPEARANCE_PACKAGE_ID,
	name: "Mirrored (Storybook test)",
	css: mirroredCss,
	defaults: {
		...getTheme("default"),
		id: "mirrored-default",
		name: "Mirrored",
		package: MIRRORED_APPEARANCE_PACKAGE_ID,
	},
	layout: {
		window: { growBoxCorner: "bottom-left" },
		menuBar: { placement: "window" },
		desktop: { iconGridOrigin: "top-left" },
	},
});
