// Types for png.mjs, for the TypeScript tests that import it.

/** An image as the export handles it: RGBA bytes, row by row. */
export type RgbaImage = { width: number; height: number; pixels: Buffer };

/** `img` as deterministic PNG bytes (8-bit RGBA, no ancillary chunks). */
export declare const encodePng: (img: RgbaImage) => Buffer;

/** A PNG file's pixels: 8-bit, non-interlaced gray, RGB or their alpha. */
export declare const readPng: (file: string) => RgbaImage;
