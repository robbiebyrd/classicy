#!/usr/bin/env node
// Writes System 7's desktop pattern tiles and the Control Strip's pixel art
// (plan 0018-dbd §3.7) from System 7.5.5's own resources, decoded by
// resource_dasm, so the owner can redo them (docs/system7-asset-inventory.md,
// "Desktop pattern" and "Control Strip" under Reproducing the files). A dev
// tool, not shipped and not run by any build: its output is committed.
//
//   node packages/appearance/system7/bin/export-pixel-art.mjs \
//     <system> <control-strip> [<out>]
//
// <system>         resource_dasm's export of the System file's `ppat`s
//                  (`--target-type=ppat`), holding `System.rsrc_ppat_16*.bmp`
// <control-strip>  resource_dasm's export of the Control Strip control panel
//                  (no filter), holding `Control Strip.rsrc_PICT_*.bmp` and
//                  `Control Strip.rsrc_ics*_*.bmp`
// <out>            the package's src/assets (default: beside this script)
//
// It writes the two desktop pattern PNGs into wallpapers/ and the pixel-art
// rows into pixelart/, and rewrites the same bytes on a rerun. Every color it
// meets must be in its table: an unknown one stops it.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { argv, exit } from "node:process";
import { readBmp } from "./bmp.mjs";
import { encodePng } from "./png.mjs";

const [systemRoot, stripRoot, outArg] = argv.slice(2);
if (!systemRoot || !stripRoot) {
	console.error("usage: export-pixel-art.mjs <system> <control-strip> [<out>]");
	exit(2);
}
const here = dirname(new URL(import.meta.url).pathname);
const out = resolve(outArg ?? join(here, "..", "src", "assets"));

const hex = (img, x, y) => {
	const o = (y * img.width + x) * 4;
	const [r, g, b, a] = img.pixels.subarray(o, o + 4);
	const rgb = [r, g, b]
		.map((v) => v.toString(16).padStart(2, "0"))
		.join("")
		.toUpperCase();
	return { rgb, clear: a === 0 };
};

/** `img`'s `width` × `height` pixels at `x`, `y`. */
const crop = (img, x, y, width, height) => {
	const part = { width, height, pixels: Buffer.alloc(width * height * 4) };
	for (let j = 0; j < height; j++)
		img.pixels.copy(
			part.pixels,
			j * width * 4,
			((y + j) * img.width + x) * 4,
			((y + j) * img.width + x + width) * 4,
		);
	return part;
};

// --- Desktop pattern -------------------------------------------------------

// System `ppat` 16, the 7.5 default desktop pattern. Its pixel map holds
// #5F5F5F and #9F9F9F, which a 256-color screen draws as the table's
// #666666 and #AAAAAA (`color-desktop-menubar-icons.png`, MWD 4); its 1-bit
// pattern is the black-and-white 50% checker (CIC "default 1-bit desktop
// pattern").
const SCREEN = { "5F5F5F": [0x66, 0x66, 0x66], "9F9F9F": [0xaa, 0xaa, 0xaa] };
const ONE_BIT = { "000000": [0, 0, 0], FFFFFF: [0xff, 0xff, 0xff] };

const pattern = (file, table) => {
	const img = readBmp(join(systemRoot, file));
	const tile = { ...img, pixels: Buffer.alloc(img.pixels.length) };
	for (let y = 0; y < img.height; y++)
		for (let x = 0; x < img.width; x++) {
			const { rgb } = hex(img, x, y);
			const color = table[rgb];
			if (!color) throw new Error(`${file}: color #${rgb} at ${x},${y}`);
			tile.pixels.set([...color, 0xff], (y * img.width + x) * 4);
		}
	return tile;
};

const wallpapers = join(out, "wallpapers");
mkdirSync(wallpapers, { recursive: true });
for (const [file, tile] of [
	["desktop-gray.png", pattern("System.rsrc_ppat_16.bmp", SCREEN)],
	["desktop-gray-bw.png", pattern("System.rsrc_ppat_16_bitmap.bmp", ONE_BIT)],
]) {
	writeFileSync(join(wallpapers, file), encodePng(tile));
	console.log(`wrote wallpapers/${file}`);
}

// --- Control Strip ----------------------------------------------------------

// The panel's colors, as their pixel-art tokens (ClassicyPixelArt): System 7
// Color's nearest. The slider's pictures hold the 16-bit-derived values
// (#CECECE, #ADADAD, #CECEFF, #212121, #313163) of the same grays. `n` is
// remapped to `--color-theme-07` (#333366) by System 7's stylesheet.
const COLOR = {
	"000000": "K",
	FFFFFF: "W",
	CCCCCC: "2",
	CECECE: "2",
	DDDDDD: "1",
	AAAAAA: "4",
	ADADAD: "4",
	888888: "5",
	555555: "7",
	444444: "7",
	CCCCFF: "b",
	CECEFF: "b",
	222222: "K",
	212121: "K",
	313163: "n",
};
const BW = { "000000": "K", FFFFFF: "W" };
const OUTLINE = new Set(["000000", "212121", "222222"]);

// What lies outside a glyph, and so is clear: a pixel the bitmap leaves
// clear always; besides, by `outside`:
// - "right": right of the row's last outline pixel (the tab, whose picture
//   continues past its pointed end);
// - "around": left of the row's first outline pixel or right of its last
//   (the slider's capsules);
// - "face": the slider picture's face, #CECECE (the pop-up draws its own).
const rows = (file, geometry, table, outside) => {
	const [width, height, x0, y0] = geometry;
	const img = crop(readBmp(join(stripRoot, file)), x0, y0, width, height);
	const lines = [];
	for (let y = 0; y < height; y++) {
		const row = Array.from({ length: width }, (_, x) => hex(img, x, y));
		const dark = row.flatMap((p, x) => (OUTLINE.has(p.rgb) ? [x] : []));
		let line = "";
		row.forEach(({ rgb, clear }, x) => {
			const out =
				clear ||
				(outside === "right" && x > dark.at(-1)) ||
				(outside === "around" &&
					(dark.length === 0 || x < dark[0] || x > dark.at(-1))) ||
				(outside === "face" && rgb === "CECECE");
			if (out) {
				line += ".";
				return;
			}
			const token = table[rgb];
			if (!token) throw new Error(`${file}: color #${rgb} at ${x},${y}`);
			line += token;
		});
		lines.push(line);
	}
	return lines;
};

const pixelart = join(out, "pixelart");
const write = (name, lines) => {
	writeFileSync(join(pixelart, `${name}.txt`), lines.join("\n"));
	console.log(`wrote pixelart/${name}.txt`);
};
const strip = (kind, id) => `Control Strip.rsrc_${kind}_${id}.bmp`;

// The tab: columns 44-60 of the panel's picture of the strip's end.
write(
	"control-strip-tab",
	rows(strip("PICT", -4044), [17, 24, 44, 0], COLOR, "right"),
);
write(
	"control-strip-tab-bw",
	rows(strip("PICT", -4043), [17, 24, 44, 0], BW, "right"),
);
// The scroll arrows: each `ics` holds the enabled arrow in its left 8
// columns and the dimmed one in the next 8 (one bitmap for both in `ics#`).
for (const [id, side] of [
	[-4046, "right"],
	[-4047, "left"],
]) {
	write(
		`control-strip-scroll-${side}`,
		rows(strip("ics8", id), [8, 10, 0, 0], COLOR),
	);
	write(
		`control-strip-scroll-${side}-disabled`,
		rows(strip("ics8", id), [8, 10, 8, 0], COLOR),
	);
	write(
		`control-strip-scroll-${side}-bw`,
		rows(strip("ics#", id), [8, 10, 0, 0], BW),
	);
}
write(
	"control-strip-collapse",
	rows(strip("ics8", -4045), [8, 8, 0, 0], COLOR),
);
write(
	"control-strip-collapse-bw",
	rows(strip("ics#", -4045), [8, 8, 0, 0], BW),
);
// The pop-up slider: the 10 × 68 track at 4,3 and the 15 × 10 thumb at 1,0.
write(
	"popup-slider-track",
	rows(strip("PICT", -4046), [10, 68, 4, 3], COLOR, "face"),
);
write(
	"popup-slider-track-bw",
	rows(strip("PICT", -4048), [10, 68, 4, 3], BW, "around"),
);
write(
	"popup-slider-thumb",
	rows(strip("PICT", -4045), [15, 10, 1, 0], COLOR, "around"),
);
write(
	"popup-slider-thumb-bw",
	rows(strip("PICT", -4047), [15, 10, 1, 0], BW, "around"),
);
