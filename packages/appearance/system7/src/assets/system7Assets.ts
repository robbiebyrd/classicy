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
	registerClassicySystemArt,
} from "@classicy/classicy";
// The dither checker is a mask (`classicy-dither`, HIG p.60), and
// `mask-image` URLs are fetched in CORS mode: as a `data:` URI (a
// `currentColor` shape, not color-encoded) it needs no fetch, as Platinum's
// halftone (ruling E17). The file is still emitted by the art glob below.
import ditherChecker from "./art/dither-checker.svg?inline";
import controlStripCollapse from "./pixelart/control-strip-collapse.txt?raw";
import controlStripModuleArrow from "./pixelart/control-strip-module-arrow.txt?raw";
import controlStripScrollLeft from "./pixelart/control-strip-scroll-left.txt?raw";
import controlStripScrollLeftDisabled from "./pixelart/control-strip-scroll-left-disabled.txt?raw";
import controlStripScrollRight from "./pixelart/control-strip-scroll-right.txt?raw";
import controlStripScrollRightDisabled from "./pixelart/control-strip-scroll-right-disabled.txt?raw";
import controlStripTab from "./pixelart/control-strip-tab.txt?raw";
import popUpSliderThumb from "./pixelart/popup-slider-thumb.txt?raw";
import popUpSliderTrack from "./pixelart/popup-slider-track.txt?raw";
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
// under a name that keeps its folder (`system7AssetFileName`).
const iconFiles = import.meta.glob("./icons/*/*/*.png", {
	eager: true,
	import: "default",
}) as Record<string, string>;
const artFiles = import.meta.glob("./art/**/*.{png,svg}", {
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
	const large = iconFiles[`./icons/${variant}/32/${stem}.png`];
	const small = iconFiles[`./icons/${variant}/16/${stem}.png`];
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
 * The emitted URL of a file in art/ (`"sad-mac.png"`) or one of its variant
 * folders (`"color/apple-menu.png"`), or `""` when there is none (which
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
	appleMenu: art("color/apple-menu.png"),
	sadMac: art("sad-mac.png"),
	startupLogo: art("color/startup-logo.png"),
	trashEmpty: art("color/trash-empty.png"),
	trashFull: art("color/trash-full.png"),
	// System 7 has no alias badge (an alias shows only its italic name).
	aliasBadge: art("alias-badge.svg"),
	// The Help menu's title, the balloon (HIG p.52, fig 4-2), is System 7's
	// nearest help glyph.
	helpButton: art("color/help-button.png"),
	helpMenuTitle: art("color/help-button.png"),
	aboutLogo: ClassicyIcons.classicy.logo,
	aboutBackground: art("about-background.svg"),
	windowStripes: art("color/window-stripes.png"),
	// System 7 has no red stripes; nothing reads them.
	windowStripesRed: art("color/window-stripes.png"),
	windowUtilityTexture: art("color/window-utility-texture.png"),
	windowGrip: art("color/window-grip.png"),
	windowDither: art("window-dither.svg"),
	zoomGlyph: art("color/zoom-glyph.png"),
	collapseGlyph: art("collapse-glyph.svg"),
	submenuArrow: art("color/submenu-arrow.png"),
	popupArrows: art("color/popup-arrows.png"),
	sliderThumb: art("color/slider-thumb.png"),
	sliderThumbRect: art("color/slider-thumb.png"),
	sliderStrikes: art("slider-strikes.svg"),
	tabOutline: art("tab-outline.svg"),
	halftone: art("halftone.svg"),
	halftoneLarge: ClassicyIcons.ui.halftoneLarge,
	quickTimeThumbSlider: ClassicyIcons.system.quicktime.thumbSlider,
	quickTimeVolumeSlider: ClassicyIcons.system.quicktime.volumeSlider,
	// The Control Strip (Control Strip 1.x, the same strip Mac OS 8 kept;
	// the Control Strip panel's own glyphs, ics -4045 to -4047, match these
	// rows) and the pop-up slider, flat in System 7's 1 px black.
	controlStripTab: pixelArt(controlStripTab),
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
	appleMenu: art("bw/apple-menu.png"),
	startupLogo: art("bw/startup-logo.png"),
	trashEmpty: art("bw/trash-empty.png"),
	trashFull: art("bw/trash-full.png"),
	helpButton: art("bw/help-button.png"),
	helpMenuTitle: art("bw/help-button.png"),
	windowStripes: art("bw/window-stripes.png"),
	windowStripesRed: art("bw/window-stripes.png"),
	windowUtilityTexture: art("bw/window-utility-texture.png"),
	windowGrip: art("bw/window-grip.png"),
	zoomGlyph: art("bw/zoom-glyph.png"),
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
