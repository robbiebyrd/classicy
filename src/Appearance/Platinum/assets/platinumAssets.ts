import {
	type ClassicyFontFace,
	registerClassicyCursors,
	registerClassicyFonts,
	registerClassicySystemArt,
	registerClassicyWallpapers,
} from "@/Appearance/ClassicyAssetRegistry";
import {
	platinumArt as art,
	PLATINUM_SYSTEM_ART,
} from "@/Appearance/Platinum/assets/art/platinumArt";
import { PLATINUM_PIXEL_ART } from "@/Appearance/Platinum/assets/pixelart/platinumPixelArt";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import { ClassicyWallpapers } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyWallpapers";

const PLATINUM = "platinum";

/**
 * Platinum's system art. Importing this module (a side effect, listed in
 * `package.json` `sideEffects`) registers it; every consumer reads its art at
 * render time through the asset registry, so a host's own
 * `registerClassicySystemArt` replaces any key. The window, menu, slider and
 * tab art is the data module `art/platinumArt.ts`, and the Control Strip and
 * pop-up slider pixel art (`ClassicyPixelArt` rows, `data:text/x-classicy-pixel-art`
 * sources) is the data module `pixelart/platinumPixelArt.ts`; both are spread
 * in here.
 *
 * Not registered (Platinum registers 36 of the 39 `ClassicySystemArtKey`s; the
 * rest resolve to `undefined`): `menuCheck` and `menuDash` are `::before`
 * glyphs in the Platinum package, so those keys have no file at all;
 * `aboutBackground` has no Platinum art. `triangle` and `downArrow` are aliases of `submenuArrow` and
 * `popupArrows`.
 */
registerClassicySystemArt(PLATINUM, {
	appleMenu: ClassicyIcons.system.apple,
	sadMac: art("sad-mac.png"),
	startupLogo: ClassicyIcons.system.macosSvg,
	trashEmpty: ClassicyIcons.system.desktop.trashEmpty,
	trashFull: ClassicyIcons.system.desktop.trashFull,
	aliasBadge: ClassicyIcons.system.alias,
	helpButton: ClassicyIcons.ui.helpButton,
	aboutLogo: ClassicyIcons.classicy.logo,
	// The halftones (program ruling G16): Part E owns only this art. `halftone`
	// (from PLATINUM_SYSTEM_ART, the open-icon dot pattern) and `halftoneLarge`
	// (the pre-boot screen's dither, the same file as the icon tree's
	// `ui.halftoneLarge`) are published as `--classicy-art-halftone` and
	// `--classicy-art-halftone-large`; the icon rules that read them are Part
	// G's. Never a color-encoded data URI.
	halftoneLarge: ClassicyIcons.ui.halftoneLarge,
	...PLATINUM_SYSTEM_ART,
	...PLATINUM_PIXEL_ART,
	triangle: PLATINUM_SYSTEM_ART.submenuArrow,
	downArrow: PLATINUM_SYSTEM_ART.popupArrows,
});

/**
 * Platinum's cursors by role. `ibeam`, `crosshair`, `resizeNwse` and
 * `resizeNesw` have no Platinum file and stay unregistered, so `setCursor`
 * leaves the browser's own cursor for them.
 */
registerClassicyCursors(PLATINUM, {
	arrow: art("cursor-arrow.svg"),
	watch: ClassicyIcons.ui.cursors.watch,
	hand: ClassicyIcons.ui.cursors.hand,
	resizeLr: ClassicyIcons.ui.cursors.resizeLr,
	resizeUd: ClassicyIcons.ui.cursors.resizeUd,
	resizeU: ClassicyIcons.ui.cursors.resizeU,
	resizeD: ClassicyIcons.ui.cursors.resizeD,
	resizeL: ClassicyIcons.ui.cursors.resizeL,
	resizeR: ClassicyIcons.ui.cursors.resizeR,
});

registerClassicyWallpapers(
	PLATINUM,
	ClassicyWallpapers.map((w) => ({ name: w.label, src: w.value })),
);

const fontModules = import.meta.glob("./fonts/*.woff2", {
	eager: true,
	import: "default",
}) as Record<string, string>;

const font = (
	family: string,
	file: string,
	weight?: string,
	style?: string,
): ClassicyFontFace => ({
	family,
	src: fontModules[`./fonts/${file}.woff2`] ?? "",
	weight,
	style,
});

/**
 * Platinum's thirteen bundled faces, woff2 only (baseline in every supported
 * browser). Registration order is the Fonts tab's order: Charcoal, ChicagoFLF,
 * Geneva, AppleGaramond, Monaco, then VCR OSD Mono ("Digital").
 */
registerClassicyFonts(PLATINUM, [
	font("Charcoal", "Charcoal-normal-normal"),
	font("ChicagoFLF", "ChicagoFLF-normal-normal"),
	font("Geneva", "Geneva-normal-normal"),
	font("Geneva", "Geneva-bold-normal", "bold"),
	font("Geneva", "Geneva-normal-italic", "normal", "italic"),
	font("AppleGaramond", "AppleGaramond-normal-normal"),
	font("AppleGaramond", "AppleGaramond-bold-normal", "bold"),
	font("AppleGaramond", "AppleGaramond-bold-italic", "bold", "italic"),
	font("AppleGaramond", "AppleGaramond-normal-italic", "normal", "italic"),
	font("AppleGaramond", "AppleGaramond-300-normal", "300"),
	font("AppleGaramond", "AppleGaramond-300-italic", "300", "italic"),
	font("Monaco", "Monaco-normal-normal"),
	font("VCR OSD Mono", "VCROSDMono-normal-normal"),
]);
