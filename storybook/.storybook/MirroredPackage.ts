// The "mirrored" Appearance Package: Storybook only, never shipped. It is the
// proof that every arrangement slot works, and the template for a package
// that rearranges Classicy:
//   - `layout` flips all three declarations from Platinum's (grow box
//     bottom-left, menus in each window, desktop icons from the top left);
//   - mirrored.scss is Platinum's look, rescoped, plus CSS `order` and flex
//     flips on the part attributes (data-classicy-control, -role, -part).
// preview.tsx imports this module, so it registers once per Storybook
// session and is listed with the registered packages ("(Storybook test)").
// Only stories with `parameters.classicy.appearancePackage: "mirrored"`
// (`mirroredParameters`) switch to it; the decorator resets the store for
// every desktop story, so the switch never outlives its story.
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
