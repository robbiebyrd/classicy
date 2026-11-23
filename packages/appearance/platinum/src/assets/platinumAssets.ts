import {
	type ClassicyAssetTree,
	type ClassicyFontFace,
	ClassicyIcons,
	registerClassicyAssets,
	registerClassicyCursors,
	registerClassicyFonts,
	registerClassicySystemArt,
	registerClassicyWallpapers,
} from "@classicy/classicy";
// The raster art is WebP (plan 0019-fb7 §6.4), except the alias badge:
// Chromium draws seven of its nine translucent pixels one level darker from a
// WebP, so it stays a PNG (CLASSICY_WEBP_KEEP_ORIGINAL in
// bin/convert-images-to-webp.ts). The cursors stay PNG, the format every
// browser takes for a CSS cursor.
import aliasBadge from "./art/alias.png";
import appleMenu from "./art/apple.webp";
import folderSmall from "./art/folder-small.webp";
import helpButton from "./art/help-button.webp";
import { platinumArt as art, PLATINUM_SYSTEM_ART } from "./art/platinumArt";
import trashEmpty from "./art/trash-empty.webp";
import trashFull from "./art/trash-full.webp";
import resizeD from "./cursors/cursor-resize-d.png";
import resizeL from "./cursors/cursor-resize-l.png";
import resizeLr from "./cursors/cursor-resize-lr.png";
import resizeR from "./cursors/cursor-resize-r.png";
import resizeU from "./cursors/cursor-resize-u.png";
import resizeUd from "./cursors/cursor-resize-ud.png";
import watch from "./cursors/cursor-watch.png";
import { PLATINUM_PIXEL_ART } from "./pixelart/platinumPixelArt";
import { PLATINUM_FONT_FACES } from "./platinumFonts.internal";
import { PLATINUM_LEGACY_WALLPAPER_DIGESTS } from "./platinumLegacyWallpapers";
import {
	PLATINUM_WALLPAPERS,
	platinumWallpaperUrl,
} from "./platinumWallpapers";

const PLATINUM = "platinum";

/**
 * Platinum's system art. Importing this module (a side effect, listed in
 * `package.json` `sideEffects`) registers it; every consumer reads its art at
 * render time through the asset registry, so a host's own
 * `registerClassicySystemArt` replaces any key. The window, menu, slider and
 * tab art is the data module `art/platinumArt.ts`, and the Control Strip and
 * pop-up slider pixel art (`ClassicyPixelArt` rows, `data:text/x-classicy-pixel-art`
 * sources) is the data module `pixelart/platinumPixelArt.ts`; both are spread
 * in here. The Apple menu, trash, alias badge and help button are files in
 * the package's assets/art, moved out of the core's icon tree (plan 0015-kxa
 * §3.3); the startup and About logos and the large halftone stay the core's
 * icon-tree files, because the core draws them too (the screen saver's logos,
 * the pre-boot screen).
 *
 * Not registered (Platinum registers 36 of the 45 `ClassicySystemArtKey`s; the
 * rest resolve to `undefined`): `menuCheck` and `menuDash` are `::before`
 * glyphs in the Platinum package, so those keys have no file at all;
 * `aboutBackground` has no Platinum art; Platinum draws no dithers, so it has
 * no `ditherChecker`, and its Help menu title is the word, so it has no
 * `helpMenuTitle` (registering one would change its menu bar); docked right
 * its Control Strip mirrors the left tab, so it has no
 * `controlStripTabRight`; it labels New Folder in words and draws a folder
 * for the folder shown, so it has no `newFolderGlyph` or `openFolderIcon`,
 * and its file dialog's folders are the folder icon, so it has no
 * `fileDialogFolderIcon`.
 * `triangle`
 * and `downArrow` are aliases of `submenuArrow` and `popupArrows`:
 * `registerClassicySystemArt` registers each with its key, so they are not
 * listed here.
 */
registerClassicySystemArt(PLATINUM, {
	appleMenu,
	sadMac: art("sad-mac.webp"),
	startupLogo: ClassicyIcons.system.macosSvg,
	trashEmpty,
	trashFull,
	aliasBadge,
	// The "standard help icon" a Help button wears (HIGOS8 Ch.3 p.86): the
	// Apple Guide lightbulb "?", lifted pixel-for-pixel from Figure 3-36.
	helpButton,
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
});

/**
 * The list view's 16 px folder (HIGOS8 Fig. 2-24, p.38, and Fig. 2-43, p.51),
 * cut pixel for pixel from Fig. 2-24, as the generic folder's own small
 * image: drawn at 16 px and under (`resolveClassicyIconImage`), where the
 * core's 32 px folder, which stays the leaf's image, would be scaled.
 */
registerClassicyAssets("icons", PLATINUM, {
	system: {
		folders: {
			directory: {
				src: ClassicyIcons.system.folders.directory,
				small: folderSmall,
			},
		},
	},
} as ClassicyAssetTree);

/**
 * Platinum's cursors by role. `ibeam`, `crosshair`, `resizeNwse` and
 * `resizeNesw` have no Platinum file and stay unregistered, so `setCursor`
 * leaves the browser's own cursor for them. The watch and resize cursors are
 * files in the package's assets/cursors (plan 0015-kxa §3.3); the hand stays
 * the core's icon-tree file, which the PDF viewer's pan tool also draws.
 */
registerClassicyCursors(PLATINUM, {
	arrow: art("cursor-arrow.svg"),
	watch,
	hand: ClassicyIcons.ui.cursors.hand,
	resizeLr,
	resizeUd,
	resizeU,
	resizeD,
	resizeL,
	resizeR,
});

/**
 * Platinum's wallpapers by label, each with the filename themes name it by,
 * so a theme's `"azul_dark.png"` resolves through the registry, and the
 * digests of the `data:` URIs 2.x builds inlined it as, so a 2.x save maps
 * to the filename too. The source is the file's WebP (`azul_dark.webp`, plan
 * 0019-fb7 §6.4), whose name the wallpaper index maps back to the filename.
 */
registerClassicyWallpapers(
	PLATINUM,
	PLATINUM_WALLPAPERS.map(({ label, file }) => ({
		name: label,
		file,
		src: platinumWallpaperUrl(file),
		legacyDigests: PLATINUM_LEGACY_WALLPAPER_DIGESTS[file],
	})),
);

const fontModules = import.meta.glob("./fonts/*.woff2", {
	eager: true,
	import: "default",
}) as Record<string, string>;

/**
 * Platinum's thirteen bundled faces, woff2 only (baseline in every supported
 * browser), from the list dist/classicy-platinum.fonts.css is built from.
 * Each names its `file`, so another package shipping the same file (System
 * 7's five faces) shares its rule rather than writing it again.
 */
registerClassicyFonts(
	PLATINUM,
	PLATINUM_FONT_FACES.map(
		({ family, file, weight, style }): ClassicyFontFace => ({
			family,
			src: fontModules[`./fonts/${file}.woff2`] ?? "",
			weight,
			style,
			file,
		}),
	),
);
