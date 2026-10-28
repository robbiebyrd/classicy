import {
	type ClassicyFontFace,
	registerClassicyCursors,
	registerClassicyFonts,
	registerClassicySystemArt,
	registerClassicyWallpapers,
} from "@/Appearance/ClassicyAssetRegistry";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import { ClassicyWallpapers } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyWallpapers";

const PLATINUM = "platinum";

const artModules = import.meta.glob("./art/*.{svg,png}", {
	eager: true,
	import: "default",
}) as Record<string, string>;

const art = (name: string): string => artModules[`./art/${name}`] ?? "";

/**
 * Platinum's system art. Importing this module (a side effect, listed in
 * `package.json` `sideEffects`) registers it; every consumer reads its art at
 * render time through the asset registry, so a host's own
 * `registerClassicySystemArt` replaces any key.
 *
 * Deliberately unregistered — Platinum has no art for them today:
 * `startupWordmark` (the wordmark is text), `paradeDefault` (the parade is
 * eleven icons, read through `getClassicyDefaultParadeIcons`), `menuCheck` and
 * `menuDash` (Unicode glyphs in `ClassicyMenu`). The title-bar caps and utility
 * stripes (`title-bar-left.svg`, `-right.svg`, `-utility.svg` and the red
 * pair) are decoded in `art/` but have no contract key yet.
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
	windowStripes: art("title-bar-center.svg"),
	windowStripesRed: art("title-bar-center-red.svg"),
	windowGrip: art("resizer.svg"),
	windowDither: art("corner-dither.svg"),
	zoomGlyph: art("zoom.svg"),
	collapseGlyph: art("collapse.svg"),
	triangle: art("triangle.svg"),
	downArrow: art("down-arrow.svg"),
	submenuArrow: art("triangle.svg"),
	popupArrows: art("down-arrow.svg"),
	sliderThumb: art("slider-thumb.svg"),
	sliderStrikes: art("slider-strikes.svg"),
	tabOutline: art("tab-outline.svg"),
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
