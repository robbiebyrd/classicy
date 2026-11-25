// Windows 98's wallpapers and desktop patterns, the files in ./wallpapers
// (docs/windows98-asset-inventory.md, "Wallpapers" and "Desktop patterns").
// windows98Assets.ts registers them (`registerClassicyWallpapers`), so the
// Appearance Manager's Desktop tab offers them in its Patterns pop-up while
// Windows 98 is active, as it offers every package's wallpapers.
//
// Data only: no side effect, so tests and docs read the lists without
// registering anything.

/**
 * A wallpaper or pattern: the Desktop tab's label, the identity filename a
 * theme holds in `desktop.backgroundImage` (and persists), and what Windows 98
 * shipped it as.
 */
export type Windows98Wallpaper = {
	readonly label: string;
	/** The identity filename; it ships as `windows98WallpaperFile(file)`. */
	readonly file: string;
};

/** A wallpaper: one of the CD's bitmaps, every pixel kept. */
export type Windows98WallpaperBitmap = Windows98Wallpaper & {
	/** The bitmap's name on the Windows 98 Second Edition CD (WIN98_22.CAB). */
	readonly cd: string;
	readonly width: number;
	readonly height: number;
};

/** A desktop pattern: eight rows of eight bits, `control.ini`'s bytes. */
export type Windows98DesktopPattern = Windows98Wallpaper & {
	/** Each row a byte, its most significant bit the leftmost pixel. */
	readonly rows: readonly number[];
};

/**
 * The file in ./wallpapers an identity filename ships as: its stem with
 * `.webp` (`clouds.bmp` is `clouds.webp`, `pattern-bricks.png` is
 * `pattern-bricks.webp`), as Platinum's and System 7's wallpapers are named.
 */
export const windows98WallpaperFile = (file: string): string =>
	file.replace(/\.(?:bmp|png)$/, ".webp");

/**
 * Windows 98 Second Edition's nineteen wallpapers, in the order its Display
 * control panel listed them (alphabetical): the eleven `shell.inf` installed
 * with Windows, the seven of Setup's Desktop Wallpaper component
 * (`applets.inf`: Clouds, Forest, Gold Weave, Metal Links, Red Blocks,
 * Sandstone, Stitches) and Setup (`setup.bmp`, copied to the Windows folder
 * by `copy2.inf`). Each label is the long name Setup installed the file under
 * (`thatch2.bmp` as "Black Thatch.bmp"); each identity filename is that name
 * in lower case with hyphens for its spaces, which Classicy's filenames
 * forbid, and Windows' own `.bmp`.
 */
export const WINDOWS98_WALLPAPERS: readonly Windows98WallpaperBitmap[] = [
	{
		label: "Black Thatch",
		file: "black-thatch.bmp",
		cd: "thatch2.bmp",
		width: 31,
		height: 30,
	},
	{
		label: "Blue Rivets",
		file: "blue-rivets.bmp",
		cd: "rivets2.bmp",
		width: 16,
		height: 16,
	},
	{
		label: "Bubbles",
		file: "bubbles.bmp",
		cd: "bubbles.bmp",
		width: 64,
		height: 64,
	},
	{
		label: "Carved Stone",
		file: "carved-stone.bmp",
		cd: "egypt.bmp",
		width: 32,
		height: 32,
	},
	{
		label: "Circles",
		file: "circles.bmp",
		cd: "circles.bmp",
		width: 32,
		height: 32,
	},
	{
		label: "Clouds",
		file: "clouds.bmp",
		cd: "clouds.bmp",
		width: 640,
		height: 480,
	},
	{
		label: "Forest",
		file: "forest.bmp",
		cd: "forest.bmp",
		width: 256,
		height: 256,
	},
	{
		label: "Gold Weave",
		file: "gold-weave.bmp",
		cd: "gator.bmp",
		width: 256,
		height: 256,
	},
	{
		label: "Houndstooth",
		file: "houndstooth.bmp",
		cd: "hounds.bmp",
		width: 27,
		height: 25,
	},
	{
		label: "Metal Links",
		file: "metal-links.bmp",
		cd: "mesh.bmp",
		width: 200,
		height: 180,
	},
	{
		label: "Pinstripe",
		file: "pinstripe.bmp",
		cd: "pstripe.bmp",
		width: 30,
		height: 32,
	},
	{
		label: "Red Blocks",
		file: "red-blocks.bmp",
		cd: "3dblocks.bmp",
		width: 54,
		height: 96,
	},
	{
		label: "Sandstone",
		file: "sandstone.bmp",
		cd: "sand.bmp",
		width: 256,
		height: 256,
	},
	{
		label: "Setup",
		file: "setup.bmp",
		cd: "setup.bmp",
		width: 640,
		height: 480,
	},
	{
		label: "Stitches",
		file: "stitches.bmp",
		cd: "weave2.bmp",
		width: 96,
		height: 96,
	},
	{
		label: "Straw Mat",
		file: "straw-mat.bmp",
		cd: "bamboo.bmp",
		width: 30,
		height: 32,
	},
	{
		label: "Tiles",
		file: "tiles.bmp",
		cd: "redtile.bmp",
		width: 32,
		height: 32,
	},
	{
		label: "Triangles",
		file: "triangles.bmp",
		cd: "pyramid2.bmp",
		width: 16,
		height: 16,
	},
	{
		label: "Waves",
		file: "waves.bmp",
		cd: "halftone.bmp",
		width: 32,
		height: 32,
	},
];

/**
 * Windows 98 Second Edition's nineteen desktop patterns, as `shell.inf`'s
 * `[patterns.inis]` writes them to `control.ini [Patterns]` (the OS as
 * shipped: Windows 3.1's thirteen, 50% Gray to Weave, are not among them but
 * Thatches). Windows drew a pattern's 1 bits black over the desktop color
 * (the scheme's Background) and its 0 bits in that color, laid from the
 * screen's top left. Each ships as an 8 x 8 tile whose 1 bits are opaque black
 * and whose 0 bits are clear, so the desktop's own color, which the base sheet
 * draws under its picture, shows through and the pattern follows every
 * scheme. Each label carries " Pattern", since Windows listed patterns and
 * wallpapers apart and Classicy's Desktop tab lists both in one pop-up (and
 * Triangles is both).
 */
export const WINDOWS98_DESKTOP_PATTERNS: readonly Windows98DesktopPattern[] = [
	{
		label: "Bricks Pattern",
		file: "pattern-bricks.png",
		rows: [187, 95, 174, 93, 186, 117, 234, 245],
	},
	{
		label: "Buttons Pattern",
		file: "pattern-buttons.png",
		rows: [170, 125, 198, 71, 198, 127, 190, 85],
	},
	{
		label: "Cargo Net Pattern",
		file: "pattern-cargo-net.png",
		rows: [120, 49, 19, 135, 225, 200, 140, 30],
	},
	{
		label: "Circuits Pattern",
		file: "pattern-circuits.png",
		rows: [82, 41, 132, 66, 148, 41, 66, 132],
	},
	{
		label: "Cobblestones Pattern",
		file: "pattern-cobblestones.png",
		rows: [40, 68, 146, 171, 214, 108, 56, 16],
	},
	{
		label: "Colosseum Pattern",
		file: "pattern-colosseum.png",
		rows: [130, 1, 1, 1, 171, 85, 170, 85],
	},
	{
		label: "Daisies Pattern",
		file: "pattern-daisies.png",
		rows: [30, 140, 216, 253, 191, 27, 49, 120],
	},
	{
		label: "Dizzy Pattern",
		file: "pattern-dizzy.png",
		rows: [62, 7, 225, 7, 62, 112, 195, 112],
	},
	{
		label: "Field Effect Pattern",
		file: "pattern-field-effect.png",
		rows: [86, 89, 166, 154, 101, 149, 106, 169],
	},
	{
		label: "Key Pattern",
		file: "pattern-key.png",
		rows: [254, 2, 250, 138, 186, 162, 190, 128],
	},
	{
		label: "Live Wire Pattern",
		file: "pattern-live-wire.png",
		rows: [239, 239, 14, 254, 254, 254, 224, 239],
	},
	{
		label: "Plaid Pattern",
		file: "pattern-plaid.png",
		rows: [240, 240, 240, 240, 170, 85, 170, 85],
	},
	{
		label: "Rounder Pattern",
		file: "pattern-rounder.png",
		rows: [215, 147, 40, 215, 40, 147, 213, 215],
	},
	{
		label: "Scales Pattern",
		file: "pattern-scales.png",
		rows: [225, 42, 37, 146, 85, 152, 62, 247],
	},
	{
		label: "Stone Pattern",
		file: "pattern-stone.png",
		rows: [174, 77, 239, 255, 8, 77, 174, 77],
	},
	{
		label: "Thatches Pattern",
		file: "pattern-thatches.png",
		rows: [248, 116, 34, 71, 143, 23, 34, 113],
	},
	{
		label: "Tile Pattern",
		file: "pattern-tile.png",
		rows: [69, 130, 1, 0, 1, 130, 69, 170],
	},
	{
		label: "Triangles Pattern",
		file: "pattern-triangles.png",
		rows: [135, 7, 6, 4, 0, 247, 231, 199],
	},
	{
		label: "Waffle's Revenge Pattern",
		file: "pattern-waffles-revenge.png",
		rows: [77, 154, 8, 85, 239, 154, 77, 154],
	},
];
