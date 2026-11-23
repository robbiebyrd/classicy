#!/usr/bin/env node
// System 7's selected color icons (story 0197-s0z), pre-rendered, because
// no CSS filter draws them exactly. A selected icon is drawn through a
// darkened copy of its color table: System 7's Icon Utilities (IconUtils.c,
// `MakeClut` and `Darken`, David Collins, 7.0) darken every entry the icon
// uses, and Color QuickDraw draws each darkened color in the screen's
// nearest color, the 8-bit system table's entry its inverse table holds.
//
// - `Darken`: every 16-bit component halved; then, unless the color is gray
//   (its components within 512 of each other), the smallest component and
//   the smaller of the other two halved again (the larger alone when they
//   are not within 512), so the value halves and the saturation stays.
// - The inverse table (`MakeITable`, the Color Manager's default resolution,
//   4 bits a component): a color falls in the cell of its components' top
//   four bits, and each cell holds the table entry whose own cell is
//   nearest. So a darkened color draws as the entry nearest it in cells,
//   not in RGB: #CCCCFF darkens to (#3333, #3333, #7FFF), cell (3, 3, 7),
//   and draws #333366 (cell 3, 3, 6), never #333399 (3, 3, 9) though that
//   is the nearer in RGB.
//
// Checked against the 7.5 captures: every one of the Sound control panel's
// twelve colors in `color-menu-help-and-selected-icon.png` and the AppleShare
// icon's six in `color-chooser-dimmed-default-button.png` (AE 0).
//
// Imported by bin/export-assets.mjs, which writes `icons/selected/<size>/`
// beside each `icons/color/<size>/` icon it exports. Run directly, it
// writes them from the committed color icons, the same bytes: each is
// lossless WebP (plan 0019-fb7 §6.5), decoded and encoded by the repo's
// pinned libwebp (bin/classicyWebp.ts), as the export writes them:
//
//   node packages/appearance/system7/bin/selectedIcons.mjs [<assets>]

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { argv } from "node:process";
import { fileURLToPath } from "node:url";
import {
	decodeClassicyWebp,
	encodeClassicyWebp,
} from "../../../../bin/classicyWebp.ts";
import { standardClut8 } from "./macResources.mjs";

const ACCEPTABLE_DELTA = 2 * 256;

/** IconUtils' `CompareComponent`: 0 within 512, else the signed difference. */
const compare = (a, b) => {
	const difference = a - b;
	return difference < ACCEPTABLE_DELTA && difference > -ACCEPTABLE_DELTA
		? 0
		: difference;
};

/** IconUtils' `Darken`, on 16-bit components `[red, green, blue]`. */
export const darken = (rgb16) => {
	const c = rgb16.map((v) => v >> 1);
	let smallest = 0;
	let notSmallest1 = 1;
	let notSmallest2 = 2;
	if (
		compare(c[smallest], c[notSmallest1]) === 0 &&
		compare(c[smallest], c[notSmallest2]) === 0
	)
		return c;
	if (compare(c[smallest], c[notSmallest1]) > 0)
		[smallest, notSmallest1] = [notSmallest1, smallest];
	if (compare(c[smallest], c[notSmallest2]) > 0)
		[smallest, notSmallest2] = [notSmallest2, smallest];
	c[smallest] >>= 1;
	const compareValue = compare(c[notSmallest1], c[notSmallest2]);
	if (compareValue < 0) c[notSmallest1] >>= 1;
	else if (compareValue > 0) c[notSmallest2] >>= 1;
	return c;
};

const CLUT = standardClut8();
const cell = (v16) => v16 >> 12;
const CLUT_CELLS = CLUT.map((rgb) => rgb.map((v) => cell(v * 257)));

/**
 * The 8-bit table's entry a 16-bit color draws as: the entry whose cell is
 * nearest the color's (squared distance in cells), the lower table index on
 * a tie.
 */
export const screenColor = (rgb16) => {
	const at = rgb16.map(cell);
	let best = 0;
	let bestDistance = Number.POSITIVE_INFINITY;
	CLUT_CELLS.forEach((entry, index) => {
		const distance = entry.reduce((sum, v, i) => sum + (v - at[i]) ** 2, 0);
		if (distance < bestDistance) {
			best = index;
			bestDistance = distance;
		}
	});
	return CLUT[best];
};

/** The color an icon's 8-bit color draws as when the icon is selected. */
export const selectedColor = ([r, g, b]) =>
	screenColor(darken([r * 257, g * 257, b * 257]));

/** `img` (`{ width, height, pixels }`, RGBA) as its selected rendering: every
 * opaque pixel's color darkened, the clear ones left clear. */
export const selectedIcon = (img) => {
	const pixels = Buffer.from(img.pixels);
	for (let i = 0; i < pixels.length; i += 4) {
		if (pixels[i + 3] === 0) continue;
		pixels.set(selectedColor([pixels[i], pixels[i + 1], pixels[i + 2]]), i);
	}
	return { width: img.width, height: img.height, pixels };
};

/**
 * A color icon's WebP bytes as its selected rendering's: decoded, every
 * color darkened (`selectedIcon`), and encoded lossless, as the export
 * writes every icon.
 */
export const selectedIconWebp = async (colorWebp) => {
	const { width, height, data } = await decodeClassicyWebp(colorWebp);
	const { pixels } = selectedIcon({ width, height, pixels: Buffer.from(data) });
	return encodeClassicyWebp(
		{ width, height, data: pixels },
		{ lossless: true },
	);
};

// Run directly: every committed color icon's selected rendering.
if (resolve(argv[1] ?? "") === fileURLToPath(import.meta.url)) {
	const here = dirname(fileURLToPath(import.meta.url));
	const assets = resolve(argv[2] ?? join(here, "..", "src", "assets"));
	for (const size of ["16", "32"]) {
		const from = join(assets, "icons", "color", size);
		const to = join(assets, "icons", "selected", size);
		mkdirSync(to, { recursive: true });
		for (const file of readdirSync(from).filter((f) => f.endsWith(".webp"))) {
			writeFileSync(
				join(to, file),
				await selectedIconWebp(new Uint8Array(readFileSync(join(from, file)))),
			);
			console.log(`wrote icons/selected/${size}/${file}`);
		}
	}
}
