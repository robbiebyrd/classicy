// Types for selectedIcons.mjs, for the TypeScript tests that import it.
import type { RgbaImage } from "./png.mjs";

/** IconUtils' `Darken`, on 16-bit components `[red, green, blue]`. */
export declare const darken: (rgb16: number[]) => number[];

/** The 8-bit system table's entry a 16-bit color draws as. */
export declare const screenColor: (rgb16: number[]) => number[];

/** The color an icon's 8-bit color draws as when the icon is selected. */
export declare const selectedColor: (rgb: number[]) => number[];

/** `img` as its selected rendering. */
export declare const selectedIcon: (img: RgbaImage) => RgbaImage;
