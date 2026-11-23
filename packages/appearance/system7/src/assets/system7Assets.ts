import {
	type ClassicyAssetSource,
	type ClassicyAssetTree,
	type ClassicyFontFace,
	type ClassicyIconLeaf,
	ClassicyIcons,
	type ClassicySystemArtKey,
	encodeClassicyPixelArtRows,
	registerClassicyAssets,
	registerClassicyCursors,
	registerClassicyFonts,
	registerClassicySelectedIconImages,
	registerClassicySystemArt,
	registerClassicyWallpapers,
} from "@classicy/classicy";
// The masks: the dither checker (`classicy-dither`, HIG p.60), the title
// bar's racing stripes and the windoid's drag-bar dots, each the mask of a
// token layer (_Window.scss), and the 1-bit Apple and Help titles' art, the
// mask of an open title's inversion layer (_MenuBar.scss; the color titles'
// layer draws nothing, so their art stays a file). `mask-image` URLs are
// fetched in CORS mode, so a host serving dist/assets from another origin
// without CORS headers would lose them: as `data:` URIs they need no fetch,
// as Platinum's halftone (ruling E17). The six raster masks are WebP
// (`data:image/webp`, plan 0019-fb7 §6.5), like every raster file here but
// the cursors. The files are still emitted by the art glob below.
import appleMenuBw from "./art/bw/apple-menu.webp?inline";
import helpMenuTitleBw from "./art/bw/help-button.webp?inline";
import windowStripesBw from "./art/bw/window-stripes.webp?inline";
import windowUtilityTextureBw from "./art/bw/window-utility-texture.webp?inline";
import windowStripes from "./art/color/window-stripes.webp?inline";
import windowUtilityTexture from "./art/color/window-utility-texture.webp?inline";
import ditherChecker from "./art/dither-checker.svg?inline";
import controlStripCollapse from "./pixelart/control-strip-collapse.txt?raw";
import controlStripCollapseBw from "./pixelart/control-strip-collapse-bw.txt?raw";
import controlStripModuleArrow from "./pixelart/control-strip-module-arrow.txt?raw";
import controlStripScrollLeft from "./pixelart/control-strip-scroll-left.txt?raw";
import controlStripScrollLeftBw from "./pixelart/control-strip-scroll-left-bw.txt?raw";
import controlStripScrollLeftDisabled from "./pixelart/control-strip-scroll-left-disabled.txt?raw";
import controlStripScrollRight from "./pixelart/control-strip-scroll-right.txt?raw";
import controlStripScrollRightBw from "./pixelart/control-strip-scroll-right-bw.txt?raw";
import controlStripScrollRightDisabled from "./pixelart/control-strip-scroll-right-disabled.txt?raw";
import controlStripTab from "./pixelart/control-strip-tab.txt?raw";
import controlStripTabBw from "./pixelart/control-strip-tab-bw.txt?raw";
// Docked right, 7.5.5's own tab (not the left one mirrored: its grip a
// column apart), read from `*-755-controlstrip-right.png` with the left
// tab's colors as its tokens.
import controlStripTabRight from "./pixelart/control-strip-tab-right.txt?raw";
import controlStripTabRightBw from "./pixelart/control-strip-tab-right-bw.txt?raw";
// Standard File's New button draws "New" and this folder, black at both
// depths (`*-dialog-standardfile-save.png`, columns 452-467).
import newFolderGlyph from "./pixelart/new-folder-glyph.txt?raw";
import popUpSliderThumb from "./pixelart/popup-slider-thumb.txt?raw";
import popUpSliderThumbBw from "./pixelart/popup-slider-thumb-bw.txt?raw";
import popUpSliderTrack from "./pixelart/popup-slider-track.txt?raw";
import popUpSliderTrackBw from "./pixelart/popup-slider-track-bw.txt?raw";
import { SYSTEM7_FONT_FACES } from "./system7Fonts.internal";
import { SYSTEM7_ICON_FILES, SYSTEM7_ICON_REUSE } from "./system7Icons";

const SYSTEM7 = "system7";

/**
 * The variant the 1-bit theme ("System 7") draws (`assetVariant` in
 * system7.json); the color theme draws the base tree.
 */
export const SYSTEM7_BW_VARIANT = "bw";

type Variant = "color" | "bw";

// Plain (query-less) imports, so the build emits each file to dist/assets
// instead of inlining it (`noInlineAppearanceAssetsPlugin`, vite.config.ts),
// under a name that keeps its folder (`system7AssetFileName`). The icons and
// the raster art are lossless WebP (plan 0019-fb7 §6.5); the cursors stay
// PNG.
const iconFiles = import.meta.glob("./icons/*/*/*.webp", {
	eager: true,
	import: "default",
}) as Record<string, string>;
const artFiles = import.meta.glob("./art/**/*.{webp,svg}", {
	eager: true,
	import: "default",
}) as Record<string, string>;
const cursorFiles = import.meta.glob("./cursors/*.png", {
	eager: true,
	import: "default",
}) as Record<string, string>;

/**
 * An icon's leaf in one variant: its 32 px image with its own 16 px one
 * (System 7's small icons are drawn, not scaled). A family with no 16 px
 * image scales its 32 px one; one with only a 16 px image (a Control Strip
 * module, and the desktop and CD-ROM, whose 32 px icons are not in the
 * System file) draws that at every size.
 */
const iconLeaf = (variant: Variant, stem: string): ClassicyIconLeaf => {
	const large = iconFiles[`./icons/${variant}/32/${stem}.webp`];
	const small = iconFiles[`./icons/${variant}/16/${stem}.webp`];
	const src = large ?? small ?? "";
	return small ? { src, small } : { src };
};

/** A dotted key's leaf set into `tree`, creating its namespaces. */
const setLeaf = (
	tree: ClassicyAssetTree,
	key: string,
	leaf: ClassicyIconLeaf,
): void => {
	const segments = key.split(".");
	let node = tree;
	for (const segment of segments.slice(0, -1)) {
		node[segment] ??= {};
		node = node[segment] as ClassicyAssetTree;
	}
	node[segments[segments.length - 1] ?? ""] = leaf;
};

/** One variant's icon tree: every exported key and every reuse. */
const iconTree = (variant: Variant): ClassicyAssetTree => {
	const tree: ClassicyAssetTree = {};
	for (const [key, stem] of Object.entries(SYSTEM7_ICON_FILES))
		setLeaf(tree, key, iconLeaf(variant, stem));
	for (const [key, target] of Object.entries(SYSTEM7_ICON_REUSE))
		setLeaf(tree, key, iconLeaf(variant, SYSTEM7_ICON_FILES[target] ?? ""));
	return tree;
};

/**
 * System 7's icons, exported from System 7.5.5 (docs/system7-asset-
 * inventory.md): the 8-bit families as the base tree (System 7 Color) and
 * the 1-bit ones as the `bw` variant (System 7). Every key the core icon
 * tree has and the inventory marks "core" is left to the core's image.
 */
registerClassicyAssets("icons", SYSTEM7, iconTree("color"));
registerClassicyAssets("icons", SYSTEM7, iconTree("bw"), {
	variant: SYSTEM7_BW_VARIANT,
});

/**
 * Every color icon image's selected rendering (story 0197-s0z): System 7
 * drew a selected color icon through a darkened copy of its color table, in
 * the 8-bit screen's colors (bin/selectedIcons.mjs), which no CSS filter
 * draws exactly, so each is pre-rendered, `icons/selected/<size>/<stem>.webp`
 * beside `icons/color/<size>/<stem>.webp`. The 1-bit icons invert instead
 * (the stylesheet), and have none.
 */
export const SYSTEM7_SELECTED_ICON_IMAGES: Readonly<Record<string, string>> =
	Object.fromEntries(
		Object.entries(iconFiles).flatMap(([file, url]) => {
			const match = /^\.\/icons\/color\/(\d+)\/(.+)$/.exec(file);
			const selected =
				match && iconFiles[`./icons/selected/${match[1]}/${match[2]}`];
			return selected ? [[url, selected]] : [];
		}),
	);
registerClassicySelectedIconImages(SYSTEM7, SYSTEM7_SELECTED_ICON_IMAGES);

/**
 * The emitted URL of a file in art/ (`"sad-mac.webp"`) or one of its variant
 * folders (`"color/apple-menu.webp"`), or `""` when there is none (which
 * `registerClassicySystemArt` reports as an invalid source).
 */
const art = (name: string): ClassicyAssetSource =>
	artFiles[`./art/${name}`] ?? "";

const pixelArt = (text: string): ClassicyAssetSource =>
	encodeClassicyPixelArtRows(text.replace(/\r/g, "").split("\n"));

/**
 * System 7's system art, the color files: every `ClassicySystemArtKey`, so
 * a host that loads only System 7 finds each one. Exported or cropped from
 * System 7.5.5 (the Trash, the Apple and Help menu titles, the startup
 * panel, the title-bar stripes, the windoid texture, the size box, the zoom
 * glyph, the menu and pop-up triangles, the slider thumb), drawn (the
 * transparent stand-ins for parts System 7 lacks, the halftone, the menu
 * check and dash, the dither checker, the pixel art) or the core's (the
 * About logo, the pre-boot halftone, the QuickTime controller thumbs).
 *
 * The package's stylesheet still draws its windows, menus and controls
 * itself (Phase 3), so the stripes, texture, grip, zoom glyph, triangles,
 * slider and tab art register for hosts and the Appearance Manager; the
 * menu bar, the Trash, the startup and crash screens and the dither read
 * these.
 */
const SYSTEM7_ART: Readonly<
	Partial<Record<ClassicySystemArtKey, ClassicyAssetSource>>
> = {
	appleMenu: art("color/apple-menu.webp"),
	sadMac: art("sad-mac.webp"),
	startupLogo: art("color/startup-logo.webp"),
	trashEmpty: art("color/trash-empty.webp"),
	trashFull: art("color/trash-full.webp"),
	// System 7 has no alias badge (an alias shows only its italic name).
	aliasBadge: art("alias-badge.svg"),
	// The Help menu's title, the balloon (HIG p.52, fig 4-2), is System 7's
	// nearest help glyph.
	helpButton: art("color/help-button.webp"),
	helpMenuTitle: art("color/help-button.webp"),
	aboutLogo: ClassicyIcons.classicy.logo,
	aboutBackground: art("about-background.svg"),
	windowStripes,
	// System 7 has no red stripes; nothing reads them.
	windowStripesRed: windowStripes,
	windowUtilityTexture,
	windowGrip: art("color/window-grip.webp"),
	windowDither: art("window-dither.svg"),
	zoomGlyph: art("color/zoom-glyph.webp"),
	collapseGlyph: art("collapse-glyph.svg"),
	submenuArrow: art("color/submenu-arrow.webp"),
	popupArrows: art("color/popup-arrows.webp"),
	sliderThumb: art("color/slider-thumb.webp"),
	sliderThumbRect: art("color/slider-thumb.webp"),
	sliderStrikes: art("slider-strikes.svg"),
	tabOutline: art("tab-outline.svg"),
	halftone: art("halftone.svg"),
	halftoneLarge: ClassicyIcons.ui.halftoneLarge,
	quickTimeThumbSlider: ClassicyIcons.system.quicktime.thumbSlider,
	quickTimeVolumeSlider: ClassicyIcons.system.quicktime.volumeSlider,
	// The Control Strip (Control Strip 1.3.1, the 7.5 control panel's own
	// art: the collapse box and scroll arrows are its `ics8` -4045 to -4047,
	// the tab its picture of the strip's end, PICT -4044, and the pop-up
	// slider PICT -4045 and -4046), in the System 7 Color tokens nearest its
	// grays: the face #CCCCCC as `2` (#BBBBBB), #DDDDDD `1`, #AAAAAA `4`,
	// #888888 `5`, #555555 and #444444 `7`, #CCCCFF `b`, the slider's
	// #333366 `n`. Mac OS 8 kept the strip, so the shapes are Platinum's.
	controlStripTab: pixelArt(controlStripTab),
	controlStripTabRight: pixelArt(controlStripTabRight),
	newFolderGlyph: pixelArt(newFolderGlyph),
	// The folder pop-up's open folder (`*-dialog-standardfile-save.png`,
	// its 16 x 16 rect at 209,77): black at both depths.
	openFolderIcon: art("color/open-folder-icon.webp"),
	// Standard File's list draws its small folder two rows higher than the
	// Finder's (`*-755-dialog-standardfile-layout.png`, the folder rows' ink
	// two rows under the row's top): the folder icon moved up two rows.
	fileDialogFolderIcon: art("color/file-dialog-folder-icon.webp"),
	controlStripCollapse: pixelArt(controlStripCollapse),
	controlStripScrollLeft: pixelArt(controlStripScrollLeft),
	controlStripScrollLeftDisabled: pixelArt(controlStripScrollLeftDisabled),
	controlStripScrollRight: pixelArt(controlStripScrollRight),
	controlStripScrollRightDisabled: pixelArt(controlStripScrollRightDisabled),
	controlStripModuleArrow: pixelArt(controlStripModuleArrow),
	popUpSliderTrack: pixelArt(popUpSliderTrack),
	popUpSliderThumb: pixelArt(popUpSliderThumb),
	menuCheck: art("menu-check.svg"),
	menuDash: art("menu-dash.svg"),
	ditherChecker,
};

/**
 * The 1-bit art (the `bw` variant): each key whose 1-bit look differs. The
 * rest (the triangles and the thumb, black and white on both screens) fall
 * back to the base tree.
 */
const SYSTEM7_BW_ART: Readonly<
	Partial<Record<ClassicySystemArtKey, ClassicyAssetSource>>
> = {
	appleMenu: appleMenuBw,
	startupLogo: art("bw/startup-logo.webp"),
	trashEmpty: art("bw/trash-empty.webp"),
	trashFull: art("bw/trash-full.webp"),
	helpButton: art("bw/help-button.webp"),
	helpMenuTitle: helpMenuTitleBw,
	windowStripes: windowStripesBw,
	windowStripesRed: windowStripesBw,
	windowUtilityTexture: windowUtilityTextureBw,
	windowGrip: art("bw/window-grip.webp"),
	zoomGlyph: art("bw/zoom-glyph.webp"),
	fileDialogFolderIcon: art("bw/file-dialog-folder-icon.webp"),
	// The Control Strip's 1-bit art: the `ics#` glyphs and PICT -4043 and
	// -4048, black on white, with no bevel. The 1-bit disabled arrow is the
	// arrow itself, as the panel's 1-bit picture of the strip draws it.
	controlStripTab: pixelArt(controlStripTabBw),
	controlStripTabRight: pixelArt(controlStripTabRightBw),
	controlStripCollapse: pixelArt(controlStripCollapseBw),
	controlStripScrollLeft: pixelArt(controlStripScrollLeftBw),
	controlStripScrollLeftDisabled: pixelArt(controlStripScrollLeftBw),
	controlStripScrollRight: pixelArt(controlStripScrollRightBw),
	controlStripScrollRightDisabled: pixelArt(controlStripScrollRightBw),
	popUpSliderTrack: pixelArt(popUpSliderTrackBw),
	popUpSliderThumb: pixelArt(popUpSliderThumbBw),
};

registerClassicySystemArt(SYSTEM7, SYSTEM7_ART);
registerClassicySystemArt(SYSTEM7, SYSTEM7_BW_ART, {
	variant: SYSTEM7_BW_VARIANT,
});

const cursor = (name: string): ClassicyAssetSource =>
	cursorFiles[`./cursors/${name}.png`] ?? "";

/**
 * System 7's cursors, one set for both themes (the pointer stays black, HIG
 * p.260): the System's `CURS` 1, 2 and 4 at their own hotspots, QuickDraw's
 * arrow, and resize cursors in the same 1-bit style, centered. The hand is
 * the core's.
 */
registerClassicyCursors(SYSTEM7, {
	arrow: { src: cursor("arrow"), hotspot: [1, 1] },
	watch: { src: cursor("watch"), hotspot: [8, 8] },
	hand: ClassicyIcons.ui.cursors.hand,
	ibeam: { src: cursor("ibeam"), hotspot: [7, 4] },
	crosshair: { src: cursor("crosshair"), hotspot: [5, 5] },
	resizeLr: { src: cursor("resize-lr"), hotspot: [8, 8] },
	resizeUd: { src: cursor("resize-ud"), hotspot: [8, 8] },
	resizeNwse: { src: cursor("resize-nwse"), hotspot: [8, 8] },
	resizeNesw: { src: cursor("resize-nesw"), hotspot: [8, 8] },
	resizeU: { src: cursor("resize-u"), hotspot: [8, 8] },
	resizeD: { src: cursor("resize-d"), hotspot: [8, 8] },
	resizeL: { src: cursor("resize-l"), hotspot: [8, 8] },
	resizeR: { src: cursor("resize-r"), hotspot: [8, 8] },
});

const wallpaperFiles = import.meta.glob("./wallpapers/*.webp", {
	eager: true,
	import: "default",
}) as Record<string, string>;

/**
 * The file in ./wallpapers a wallpaper's identity filename ships as: its stem
 * with `.webp` (`desktop-gray.png` is `desktop-gray.webp`, plan 0019-fb7
 * §6.5). The converter that wrote them (`classicyWebpTarget`,
 * bin/convert-images-to-webp.ts) names them the same way; runtime code cannot
 * import bin/, so system7Webp.test.ts pins the two equal.
 */
export const system7WallpaperFile = (file: string): string =>
	file.replace(/\.png$/, ".webp");

/**
 * System 7's desktop patterns, the Desktop tab's label and the filename each
 * theme names in `desktop.backgroundImage`: System `ppat` 16, the 7.5
 * default desktop pattern, a 50% checker drawn as an 8 × 8 tile, its color
 * pixel map (#666666 and #AAAAAA, as a 256-color screen draws it) for "System
 * 7 Color" and its 1-bit pattern for "System 7" (bin/export-pixel-art.mjs).
 * Each `file` is the identity filename themes, saved states and theme files
 * name; it ships as `system7WallpaperFile(file)`.
 */
export const SYSTEM7_WALLPAPERS: ReadonlyArray<{
	label: string;
	file: string;
}> = [
	{ label: "Gray", file: "desktop-gray.png" },
	{ label: "Gray (Black & White)", file: "desktop-gray-bw.png" },
];

registerClassicyWallpapers(
	SYSTEM7,
	SYSTEM7_WALLPAPERS.map(({ label, file }) => ({
		name: label,
		src: wallpaperFiles[`./wallpapers/${system7WallpaperFile(file)}`] ?? "",
		file,
	})),
);

const fontModules = import.meta.glob("./fonts/*.woff2", {
	eager: true,
	import: "default",
}) as Record<string, string>;

/**
 * System 7's bundled faces, woff2 only, from the list
 * dist/classicy-system7.fonts.css is built from. Importing this module (a side
 * effect, listed in `package.json` `sideEffects`) registers them. Each names
 * its `file`, which is Platinum's name for the same bytes, so a host loading
 * both packages writes each face once (whichever registers first writes it).
 */
registerClassicyFonts(
	SYSTEM7,
	SYSTEM7_FONT_FACES.map(
		({ family, file, weight, style }): ClassicyFontFace => ({
			family,
			src: fontModules[`./fonts/${file}.woff2`] ?? "",
			weight,
			style,
			file,
		}),
	),
);
