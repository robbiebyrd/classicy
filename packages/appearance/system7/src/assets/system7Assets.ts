import {
	type ClassicyFontFace,
	registerClassicyFonts,
} from "@classicy/classicy";
import { SYSTEM7_FONT_FACES } from "./system7Fonts.internal";

const SYSTEM7 = "system7";

// System 7 registers no system art, cursors, icons or wallpapers yet: the
// owner exports them from System 7.5 (docs/system7-asset-inventory.md), and
// they register here in plan 0018-dbd §4.1, the color art as the base tree
// and the 1-bit art as the `bw` variant. Until then every asset read falls
// through to the default package's (Platinum's, when it is registered), as
// for any key a package leaves out.

const fontModules = import.meta.glob("./fonts/*.woff2", {
	eager: true,
	import: "default",
}) as Record<string, string>;

/**
 * System 7's bundled faces, woff2 only, from the list
 * dist/classicy-system7.fonts.css is built from. Importing this module (a side
 * effect, listed in `package.json` `sideEffects`) registers them.
 */
registerClassicyFonts(
	SYSTEM7,
	SYSTEM7_FONT_FACES.map(
		({ family, file, weight, style }): ClassicyFontFace => ({
			family,
			src: fontModules[`./fonts/${file}.woff2`] ?? "",
			weight,
			style,
		}),
	),
);
