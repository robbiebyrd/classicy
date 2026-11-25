import {
	type ClassicyAssetSource,
	type ClassicyAssetTree,
	type ClassicyCursorLeaf,
	type ClassicyCursorRole,
	type ClassicyFontFace,
	type ClassicyIconLeaf,
	type ClassicySystemArtKey,
	registerClassicyAssets,
	registerClassicyCursors,
	registerClassicyFonts,
	registerClassicySystemArt,
	registerClassicyWallpapers,
} from "@classicy/classicy";
import { WINDOWS98_FONT_FACES } from "./windows98Fonts.internal";
import {
	WINDOWS98_ICON_FILES,
	WINDOWS98_ICON_REUSE,
	WINDOWS98_OWN_ICON_FILES,
	type Windows98IconFiles,
} from "./windows98Icons";
import {
	WINDOWS98_DESKTOP_PATTERNS,
	WINDOWS98_WALLPAPERS,
	windows98WallpaperFile,
} from "./windows98Wallpapers";

// Windows 98's icons, system art, cursors, wallpapers, desktop patterns and
// fonts (docs/windows98-asset-inventory.md). The images are read from the
// Windows 98 Second Edition CD: its icon groups' 32 px and 16 px images,
// Internet Explorer 5's toolbar bitmaps, Explorer's Start flag, the About
// box's Windows logo, Web View's sky and the wallpaper bitmaps, each a
// lossless WebP of the resource's own pixels (bin/classicyWebp.ts), the
// desktop patterns `shell.inf` lists, drawn from their bytes, and USER.EXE's
// system cursors, PNG (the format every browser takes for a CSS cursor). The
// fonts are 98.css's pixel recreation of MS Sans Serif
// (windows98Fonts.internal.ts).
//
// The glyphs Windows drew in the scheme's colors (the caption buttons'
// marks, scroll arrows, check marks, radio dots, menu and pop-up arrows,
// the slider's thumb: Marlett and DrawFrameControl) stay pixel art in the
// package's stylesheet, drawn from theme tokens, so every color scheme
// draws them in its own colors; the system art keys they stand for are left
// unregistered, as are the keys Windows has no image for (the inventory's
// "System art" section names each).

const WINDOWS98 = "windows98";

// Plain (query-less) imports, so the build emits each file to dist/assets
// instead of inlining it (`noInlineAppearanceAssetsPlugin`, vite.config.ts),
// each under its own name (every name in icons/ and art/ is unique).
const iconFiles = import.meta.glob("./icons/*.webp", {
	eager: true,
	import: "default",
}) as Record<string, string>;
const artFiles = import.meta.glob("./art/*.webp", {
	eager: true,
	import: "default",
}) as Record<string, string>;
const cursorFiles = import.meta.glob("./cursors/*.png", {
	eager: true,
	import: "default",
}) as Record<string, string>;
const wallpaperFiles = import.meta.glob("./wallpapers/*.webp", {
	eager: true,
	import: "default",
}) as Record<string, string>;
const fontFiles = import.meta.glob("./fonts/*.woff2", {
	eager: true,
	import: "default",
}) as Record<string, string>;

/**
 * The emitted URL of a file in icons/ by its stem (`"shell32-4-32"`), or
 * `""` when there is none (which the registries report as an invalid source).
 */
export const windows98IconFile = (stem: string): ClassicyAssetSource =>
	iconFiles[`./icons/${stem}.webp`] ?? "";

/** The emitted URL of a file in art/ by its stem, or `""`. */
const art = (stem: string): ClassicyAssetSource =>
	artFiles[`./art/${stem}.webp`] ?? "";

/** A key's leaf: its image with its own 16 px one, where the group has one. */
const iconLeaf = ({ src, small }: Windows98IconFiles): ClassicyIconLeaf =>
	small
		? { src: windows98IconFile(src), small: windows98IconFile(small) }
		: { src: windows98IconFile(src) };

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

/** The icon tree: every key with files, every reuse, the package's own. */
const iconTree = (): ClassicyAssetTree => {
	const tree: ClassicyAssetTree = {};
	for (const [key, files] of Object.entries(WINDOWS98_ICON_FILES))
		setLeaf(tree, key, iconLeaf(files));
	for (const [key, target] of Object.entries(WINDOWS98_ICON_REUSE)) {
		const files = WINDOWS98_ICON_FILES[target];
		if (files) setLeaf(tree, key, iconLeaf(files));
	}
	for (const [key, files] of Object.entries(WINDOWS98_OWN_ICON_FILES))
		setLeaf(tree, key, iconLeaf(files));
	return tree;
};

/**
 * Windows 98's icons, one tree for every theme (the schemes recolor the
 * chrome, never an icon). A key the inventory marks "core" is left out, so
 * it resolves to the default package's image; a core icon URL stored for a
 * key this tree registers draws Windows 98's image while the package is
 * active (`resolveClassicyIconImage`), and its 16 px image at the small size.
 */
registerClassicyAssets("icons", WINDOWS98, iconTree());

/**
 * Windows 98's system art: the keys whose image Windows drew from a bitmap
 * or an icon. The Start flag (Explorer's bitmap 143, its `#C0C0C0` ground
 * made clear, as Windows mapped it to the button face) is the Apple menu's
 * title, drawn as the Start button; the Recycle Bin, empty and full, is the
 * Trash; the shortcut overlay (shell32's #30, an arrow box at the bottom left
 * of a clear 32 x 32 image, which Windows drew over the whole icon) is the
 * alias badge, sized to the icon by the package's stylesheet; the "Microsoft
 * Windows" logo of the About Windows box (shell32's bitmap 130, its ground
 * made clear) is the startup and About logo; the open and closed folders'
 * 16 px images are the file dialog's.
 */
export const WINDOWS98_SYSTEM_ART: Readonly<
	Partial<Record<ClassicySystemArtKey, ClassicyAssetSource>>
> = {
	appleMenu: art("explorer-bitmap-143"),
	trashEmpty: windows98IconFile("shell32-32-32"),
	trashFull: windows98IconFile("shell32-33-32"),
	aliasBadge: windows98IconFile("shell32-30-32"),
	startupLogo: art("shell32-bitmap-130"),
	aboutLogo: art("shell32-bitmap-130"),
	openFolderIcon: windows98IconFile("shell32-5-16"),
	fileDialogFolderIcon: windows98IconFile("shell32-4-16"),
};

registerClassicySystemArt(WINDOWS98, WINDOWS98_SYSTEM_ART);

/** The emitted URL of a file in cursors/ by its stem, or `""`. */
const cursorFile = (stem: string): ClassicyAssetSource =>
	cursorFiles[`./cursors/${stem}.png`] ?? "";

/** A USER.EXE cursor (`user-cursor-<id>.png`) at the resource's own hotspot. */
const userCursor = (
	id: number,
	hotspot: readonly [x: number, y: number],
): ClassicyCursorLeaf => ({ src: cursorFile(`user-cursor-${id}`), hotspot });

const horizontalResize = userCursor(107, [16, 16]);
const verticalResize = userCursor(108, [15, 16]);

/**
 * Windows 98's cursors by role: USER.EXE's system cursors (its
 * `RT_GROUP_CURSOR` resources, 32 x 32 and 1-bit), each at the hotspot the
 * resource declares. Normal Select is the arrow; Busy, the static hourglass,
 * the watch; Link Select, the pointing hand Windows 98 added (IDC_HAND, the
 * PDF viewer's pan tool); Text Select the I-beam and Precision Select the
 * cross, both drawn black (every pixel of theirs inverts the screen, which a
 * CSS cursor cannot); the four two-way size cursors resize. Windows had no
 * one-way size cursors (a window edge at its limit kept the two-way arrow),
 * so `resizeU` and `resizeD` draw the vertical one and `resizeL` and
 * `resizeR` the horizontal one. Help Select, the arrow with a question mark,
 * is the What's This? pointer (`help`). The package's stylesheet gives the size grip
 * the diagonal cursor (`resizeNwse`), as Windows did, where the base reads the
 * Mac grow box's `resizeLr`.
 */
export const WINDOWS98_CURSORS: Readonly<
	Record<ClassicyCursorRole, ClassicyCursorLeaf>
> = {
	arrow: userCursor(100, [0, 0]),
	watch: userCursor(102, [16, 16]),
	hand: userCursor(114, [5, 0]),
	ibeam: userCursor(101, [15, 16]),
	crosshair: userCursor(103, [15, 16]),
	resizeLr: horizontalResize,
	resizeUd: verticalResize,
	resizeNwse: userCursor(105, [16, 16]),
	resizeNesw: userCursor(106, [16, 16]),
	resizeU: verticalResize,
	resizeD: verticalResize,
	resizeL: horizontalResize,
	resizeR: horizontalResize,
	help: userCursor(112, [5, 7]),
};

registerClassicyCursors(WINDOWS98, WINDOWS98_CURSORS);

/**
 * Windows 98's wallpapers, then its desktop patterns (windows98Wallpapers.ts),
 * each under its identity filename, the one a theme names in
 * `desktop.backgroundImage`. The Appearance Manager's Desktop tab lists them,
 * after the default package's, while Windows 98 is active. No theme names one:
 * every Windows 98 preset keeps its scheme's plain Background, as Windows
 * Standard's teal desktop had no wallpaper and the pattern (None). A pattern
 * is black on clear, so the desktop's color shows between its black bits.
 */
registerClassicyWallpapers(
	WINDOWS98,
	[...WINDOWS98_WALLPAPERS, ...WINDOWS98_DESKTOP_PATTERNS].map(
		({ label, file }) => ({
			name: label,
			src: wallpaperFiles[`./wallpapers/${windows98WallpaperFile(file)}`] ?? "",
			file,
		}),
	),
);

/**
 * Windows 98's interface face, "Pixelated MS Sans Serif" regular and bold,
 * woff2 only, from the list dist/classicy-windows98.fonts.css is built from.
 * Importing this module (a side effect, listed in `package.json`
 * `sideEffects`) registers them. Each names its `file`, which no other
 * package ships, so the faces are Windows 98's alone.
 */
registerClassicyFonts(
	WINDOWS98,
	WINDOWS98_FONT_FACES.map(
		({ family, file, weight, style }): ClassicyFontFace => ({
			family,
			src: fontFiles[`./fonts/${file}.woff2`] ?? "",
			weight,
			style,
			file,
		}),
	),
);
