// The colors Windows 98's screen savers offered and drew, by the names its
// common dialogs gave them, as 0xRRGGBB.

/**
 * The sixteen colors of the Font dialog's Color list (ChooseFont), which
 * Scrolling Marquee's Format Text button opened, and of Mystify Your Mind's
 * color lists: the VGA palette.
 */
export const WINDOWS98_VGA_COLORS = {
	Black: 0x000000,
	Maroon: 0x800000,
	Green: 0x008000,
	Olive: 0x808000,
	Navy: 0x000080,
	Purple: 0x800080,
	Teal: 0x008080,
	Gray: 0x808080,
	Silver: 0xc0c0c0,
	Red: 0xff0000,
	Lime: 0x00ff00,
	Yellow: 0xffff00,
	Blue: 0x0000ff,
	Fuchsia: 0xff00ff,
	Aqua: 0x00ffff,
	White: 0xffffff,
} as const;

export type Windows98VgaColorName = keyof typeof WINDOWS98_VGA_COLORS;

/** The VGA colors' names, in the Font dialog's order. */
export const WINDOWS98_VGA_COLOR_NAMES = Object.keys(WINDOWS98_VGA_COLORS) as [
	Windows98VgaColorName,
	...Windows98VgaColorName[],
];

/**
 * The default palette (GetStockObject(DEFAULT_PALETTE)), its twenty static
 * colors in index order: Scrolling Marquee's Background color list, and the
 * colors Flying Windows drew its flags in (PALETTEINDEX(1) to (14)). The four
 * the VGA palette lacks carry the names Windows' color tools gave them.
 */
export const WINDOWS98_DEFAULT_PALETTE = [
	["Black", 0x000000],
	["Maroon", 0x800000],
	["Green", 0x008000],
	["Olive", 0x808000],
	["Navy", 0x000080],
	["Purple", 0x800080],
	["Teal", 0x008080],
	["Silver", 0xc0c0c0],
	["Money Green", 0xc0dcc0],
	["Sky Blue", 0xa6caf0],
	["Cream", 0xfffbf0],
	["Medium Gray", 0xa0a0a4],
	["Gray", 0x808080],
	["Red", 0xff0000],
	["Lime", 0x00ff00],
	["Yellow", 0xffff00],
	["Blue", 0x0000ff],
	["Fuchsia", 0xff00ff],
	["Aqua", 0x00ffff],
	["White", 0xffffff],
] as const satisfies ReadonlyArray<readonly [string, number]>;

export type Windows98PaletteColorName =
	(typeof WINDOWS98_DEFAULT_PALETTE)[number][0];

/** The default palette's names, in index order. */
export const WINDOWS98_PALETTE_COLOR_NAMES = WINDOWS98_DEFAULT_PALETTE.map(
	([name]) => name,
) as [Windows98PaletteColorName, ...Windows98PaletteColorName[]];

/** A palette color's value by its name (black for an unknown name). */
export const windows98PaletteColor = (name: string): number =>
	WINDOWS98_DEFAULT_PALETTE.find(([n]) => n === name)?.[1] ?? 0;

/** A VGA color's value by its name (black for an unknown name). */
export const windows98VgaColor = (name: string): number =>
	Object.hasOwn(WINDOWS98_VGA_COLORS, name)
		? WINDOWS98_VGA_COLORS[name as Windows98VgaColorName]
		: 0;

/** `0xRRGGBB` as a CSS color, `#rrggbb`. */
export const windows98CssColor = (rgb: number): string =>
	`#${(rgb & 0xffffff).toString(16).padStart(6, "0")}`;
