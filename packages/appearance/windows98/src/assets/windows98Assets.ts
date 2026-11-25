import {
	type ClassicyAssetSource,
	type ClassicyAssetTree,
	type ClassicyIconLeaf,
	type ClassicySystemArtKey,
	registerClassicyAssets,
	registerClassicySystemArt,
} from "@classicy/classicy";
import {
	WINDOWS98_ICON_FILES,
	WINDOWS98_ICON_REUSE,
	WINDOWS98_OWN_ICON_FILES,
	type Windows98IconFiles,
} from "./windows98Icons";

// Windows 98's icons and system art (docs/windows98-asset-inventory.md),
// read from the Windows 98 Second Edition CD: its icon groups' 32 px and
// 16 px images, Internet Explorer 5's toolbar bitmaps, Explorer's Start
// flag, the About box's Windows logo and Web View's sky, each a lossless
// WebP of the resource's own pixels (bin/classicyWebp.ts).
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
