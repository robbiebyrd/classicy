#!/usr/bin/env node
// Writes System 7's icons, system art and cursors (plan 0018-dbd §4.1) and
// its alert sounds (§4.2) from a System 7.5.5 install, and prints the
// Standard window and control color tables, so the owner can redo the export
// (docs/system7-asset-inventory.md, "Reproducing the files"). A dev tool, not
// shipped and not run by any build: its output is committed.
//
//   node packages/appearance/system7/bin/export-assets.mjs \
//     <raw> <decoded> <reference> [<out>]
//
// <raw>        resource_dasm's raw export of the install
//              (`--skip-decode --save-raw=yes --filename-format=txdirs`), the
//              folder holding `System Folder/` and `Apple Extras/`
// <decoded>    resource_dasm's default export of the install's System file
//              (the `System.rsrc_PICT_<id>.bmp` startup-screen pictures)
// <reference>  the System 7.5 reference screenshots
//              (docs/system7-reference-screenshots.md)
// <out>        the package's src/assets (default: beside this script)
//
// Every PNG it writes is exactly its native size, RGBA, with no color profile
// (bin/png.mjs), and is deterministic: a rerun on the same inputs rewrites
// the same bytes. It prints each cursor's hotspot, the System file's `wctb` 0
// and `cctb` 0, and every file it writes. The sounds are WAV sources for the
// audio pipeline: rebuild the sprite sheet from them with
// `pnpm build:audio` (bin/make_audio_sprites.sh).

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { argv, exit } from "node:process";
import { inflateSync } from "node:zlib";
import {
	decodeClut,
	decodeCursor,
	decodeIcon,
	decodeIcon8,
	decodeIconList,
	findResource,
	readResources,
	standardClut8,
} from "./macResources.mjs";
import {
	decodeSound,
	encodeWav,
	renderSquareWave,
	SQUARE_WAVE_SYNTH,
} from "./macSound.ts";
import { encodePng } from "./png.mjs";

const [rawRoot, decodedRoot, referenceRoot, outArg] = argv.slice(2);
if (!rawRoot || !decodedRoot || !referenceRoot) {
	console.error("usage: export-assets.mjs <raw> <decoded> <reference> [<out>]");
	exit(2);
}
const here = dirname(new URL(import.meta.url).pathname);
const out = resolve(outArg ?? join(here, "..", "src", "assets"));
const platinumAssets = resolve(here, "..", "..", "platinum", "src", "assets");
const clut = standardClut8();

const SYSTEM = "System Folder/System.rsrc";
const FINDER = "System Folder/Finder.rsrc";
const CP = "System Folder/Control Panels";
const AMI = "System Folder/Apple Menu Items";
const EXT = "System Folder/Extensions";
const CSM = "System Folder/Control Strip Modules";
const CSM_OFF = "System Folder/Control Strip Modules (Disabled";

/**
 * Every exported icon: its file stem (the key path in kebab case, the
 * inventory's File column) and the resource family it comes from. `size: 16`
 * exports the small family only (Control Strip modules); `alert` is an
 * `ICON` (32 px, 1-bit, no mask), `crop` a 32 px cell from a reference
 * screenshot where no file in the install holds the 32 px family (the small
 * family still comes from `small`).
 */
const ICONS = [
	["applications-stickies-app", `${AMI}/Stickies.rsrc`, 128],
	["applications-stickies-notes", `${AMI}/Stickies.rsrc`, 129],
	["applications-simpletext-app", "Apple Extras/SimpleText.rsrc", 128],
	["control-panels-appearance-manager-app", `${CP}/Color.rsrc`, -4064],
	[
		"control-panels-control-strip-manager-app",
		`${CP}/Control Strip.rsrc`,
		-4064,
	],
	[
		"control-panels-date-time-manager-date-time-manager",
		`${CP}/Date & Time.rsrc`,
		-4064,
	],
	["control-panels-keyboard-app", `${CP}/Keyboard.rsrc`, -4064],
	["control-panels-location-app", `${CP}/Map.rsrc`, -4064],
	["control-panels-sound-manager-app", `${CP}/Sound.rsrc`, -4064],
	["control-panels-sound-manager-stt", `${CP}/Speech.rsrc`, -4047],
	["control-panels-sound-manager-tts", `${EXT}/Speech Manager.rsrc`, -4064],
	[
		"system-control-strip-file-sharing",
		`${CSM_OFF}/File Sharing.rsrc`,
		257,
		{ size: 16 },
	],
	["system-control-strip-module-file", `${CSM}/Monitor Resolution.rsrc`, 128],
	[
		"system-control-strip-sleep",
		`${CSM_OFF}/Sleep Now.rsrc`,
		256,
		{ size: 16 },
	],
	["system-control-strip-sound", `${CSM}/Sound Volume.rsrc`, 256, { size: 16 }],
	["system-colors-extension", `${EXT}/Color Picker.rsrc`, 128],
	["system-desktop-desktop", SYSTEM, -3992, { size: 16 }],
	["system-drives-cdrom", SYSTEM, -3987, { size: 16 }],
	[
		"system-drives-disk",
		SYSTEM,
		-3995,
		{ crop: ["color-desktop-menubar-icons.png", 584, 28] },
	],
	["system-drives-floppy-pc", `${CP}/PC Exchange.rsrc`, -4048],
	["system-drives-floppy", SYSTEM, -3998],
	[
		"system-drives-network-drive",
		SYSTEM,
		-3972,
		{ crop: ["color-desktop-menubar-icons.png", 584, 80] },
	],
	["system-extensions-apple-guide", `${EXT}/Apple Guide.rsrc`, 128],
	["system-extensions-apple-share", `${EXT}/AppleShare.rsrc`, -4080],
	["system-extensions-ethernet", `${EXT}/EtherTalk Phase 2.rsrc`, 128],
	["system-extensions-quicktime", `${EXT}/QuickTime™.rsrc`, -19071],
	["system-files-application", SYSTEM, -3996],
	["system-files-document", SYSTEM, -4000],
	["system-files-edition", SYSTEM, -3989],
	["system-files-file-text", "Apple Extras/SimpleText.rsrc", 129],
	["system-files-note", `${AMI}/Note Pad.rsrc`, 129],
	["system-files-photo", "Apple Extras/SimpleText.rsrc", 131],
	["system-files-preferences", SYSTEM, -3971],
	["system-files-script", "Apple Extras/AppleScript™/Script Editor.rsrc", 129],
	["system-files-sound", FINDER, 14000],
	["system-files-stationary-black", SYSTEM, -3985],
	["system-folders-apple-menu-item", SYSTEM, -3982],
	["system-folders-control-panels", SYSTEM, -3976],
	["system-folders-directory", SYSTEM, -3999],
	["system-folders-extensions", SYSTEM, -3973],
	["system-folders-folder-printers", SYSTEM, -3975],
	["system-folders-fonts", SYSTEM, -3968],
	["system-folders-preferences", SYSTEM, -3974],
	["system-folders-startup-items", SYSTEM, -3981],
	["system-folders-suitcase-system", SYSTEM, -16494],
	["system-folders-suitcase", FINDER, 15500],
	["system-folders-system", SYSTEM, -3983],
	["system-network-chooser", `${AMI}/Chooser.rsrc`, -15904],
	["system-network-network-local", `${CP}/Network.rsrc`, -4064],
	["system-network-user-directory", `${CP}/Users & Groups.rsrc`, 128],
	["system-quicktime-movie", "Apple Extras/SimpleText.rsrc", 133],
	["system-sherlock-sherlock", `${AMI}/Find File.rsrc`, 128],
	["system-clipboard", SYSTEM, -16509],
	["system-error", SYSTEM, 0, { alert: true }],
	["system-extension", SYSTEM, -16415],
	["system-help", `${EXT}/Apple Guide.rsrc`, 130],
	["system-info", SYSTEM, 1, { alert: true }],
	["system-mac", SYSTEM, -16482],
	["system-macos", FINDER, 3967],
	["system-printer", `${EXT}/LaserWriter 8.rsrc`, -4096],
	["system-question", SYSTEM, -5696],
	["system-warn", SYSTEM, 2, { alert: true }],
];

const written = [];
const write = (file, img) => {
	const path = join(out, file);
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, encodePng(img));
	written.push(file);
};
/**
 * A PNG copied with only the chunks that hold its pixels (`IHDR`, `PLTE`,
 * `tRNS`, `IDAT`, `IEND`), so no color-space chunk (`iCCP`, `gAMA`,
 * `cHRM`, `sRGB`) corrects its stored values and no metadata (an editor's
 * timestamp) rides along, as the export's own files.
 */
const copy = (from, file) => {
	const bytes = readFileSync(from);
	const chunks = [bytes.subarray(0, 8)];
	for (let at = 8; at < bytes.length; ) {
		const end = at + 12 + bytes.readUInt32BE(at);
		const type = bytes.toString("latin1", at + 4, at + 8);
		if (["IHDR", "PLTE", "tRNS", "IDAT", "IEND"].includes(type))
			chunks.push(bytes.subarray(at, end));
		at = end;
	}
	const path = join(out, file);
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, Buffer.concat(chunks));
	written.push(file);
};

const resourceCache = new Map();
const resources = (file) => {
	if (!resourceCache.has(file))
		resourceCache.set(file, readResources(join(rawRoot, file)));
	return resourceCache.get(file);
};
const need = (file, type, id) => {
	const r = findResource(resources(file), type, id);
	if (!r) throw new Error(`${file}: no ${type} ${id}`);
	return r.data;
};
const has = (file, type, id) => !!findResource(resources(file), type, id);

// --- Images -----------------------------------------------------------

/** An RGBA image of `width` × `height`, every pixel transparent. */
const blank = (width, height) => ({
	width,
	height,
	pixels: Buffer.alloc(width * height * 4),
});

/**
 * A PNG's pixels: 8-bit, non-interlaced RGB or RGBA (the screenshots) or
 * gray or gray with alpha (Platinum's resize cursors).
 */
const readPng = (file) => {
	const bytes = readFileSync(file);
	let at = 8;
	let width = 0;
	let height = 0;
	let channels = 0;
	let colorType = 0;
	const idat = [];
	while (at < bytes.length) {
		const length = bytes.readUInt32BE(at);
		const type = bytes.toString("latin1", at + 4, at + 8);
		const data = bytes.subarray(at + 8, at + 8 + length);
		if (type === "IHDR") {
			width = data.readUInt32BE(0);
			height = data.readUInt32BE(4);
			if (data[8] !== 8 || data[12] !== 0)
				throw new Error(`${file}: not 8-bit, non-interlaced`);
			colorType = data[9];
			channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[colorType];
			if (!channels) throw new Error(`${file}: not gray, RGB or their alpha`);
		} else if (type === "IDAT") idat.push(data);
		at += 12 + length;
	}
	const raw = inflateSync(Buffer.concat(idat));
	const stride = width * channels;
	const rows = Buffer.alloc(height * stride);
	for (let y = 0; y < height; y++) {
		const filter = raw[y * (stride + 1)];
		for (let x = 0; x < stride; x++) {
			const value = raw[y * (stride + 1) + 1 + x];
			const a = x >= channels ? rows[y * stride + x - channels] : 0;
			const b = y > 0 ? rows[(y - 1) * stride + x] : 0;
			const c =
				x >= channels && y > 0 ? rows[(y - 1) * stride + x - channels] : 0;
			const p = a + b - c;
			const predictor = [
				0,
				a,
				b,
				(a + b) >> 1,
				Math.abs(p - a) <= Math.abs(p - b) && Math.abs(p - a) <= Math.abs(p - c)
					? a
					: Math.abs(p - b) <= Math.abs(p - c)
						? b
						: c,
			][filter];
			rows[y * stride + x] = (value + predictor) & 0xff;
		}
	}
	const img = blank(width, height);
	for (let i = 0; i < width * height; i++) {
		const at = i * channels;
		const gray = colorType === 0 || colorType === 4;
		img.pixels.set(
			[
				rows[at],
				rows[gray ? at : at + 1],
				rows[gray ? at : at + 2],
				colorType === 4 ? rows[at + 1] : colorType === 6 ? rows[at + 3] : 255,
			],
			i * 4,
		);
		// A transparent pixel is 0,0,0,0 whatever color it stored, as in
		// every file the export decodes.
		if (img.pixels[i * 4 + 3] === 0) img.pixels.fill(0, i * 4, i * 4 + 4);
	}
	return img;
};

/** A BMP's pixels (resource_dasm's 24- or 32-bit output, RGBA byte order). */
const readBmp = (file) => {
	const b = readFileSync(file);
	const offset = b.readUInt32LE(10);
	const width = b.readInt32LE(18);
	const h = b.readInt32LE(22);
	const bpp = b.readUInt16LE(28);
	const height = Math.abs(h);
	const stride = Math.ceil((width * bpp) / 32) * 4;
	const img = blank(width, height);
	for (let y = 0; y < height; y++)
		for (let x = 0; x < width; x++) {
			const o = offset + (h > 0 ? height - 1 - y : y) * stride + (x * bpp) / 8;
			const d = (y * width + x) * 4;
			// 32-bit: R, G, B, A (bitfields ff, ff00, ff0000, ff000000); 24-bit: B, G, R.
			const rgb =
				bpp === 32 ? [b[o], b[o + 1], b[o + 2]] : [b[o + 2], b[o + 1], b[o]];
			img.pixels.set([...rgb, bpp === 32 ? b[o + 3] : 255], d);
		}
	return img;
};

const pixel = (img, x, y) => [
	...img.pixels.subarray((y * img.width + x) * 4, (y * img.width + x) * 4 + 4),
];
const setPixel = (img, x, y, rgba) =>
	img.pixels.set(rgba, (y * img.width + x) * 4);

/** `img`'s `width` × `height` pixels at `x`, `y`. */
const crop = (img, x, y, width, height) => {
	const part = blank(width, height);
	for (let j = 0; j < height; j++)
		for (let i = 0; i < width; i++)
			setPixel(part, i, j, pixel(img, x + i, y + j));
	return part;
};

const isColor = (rgba, [r, g, b]) =>
	rgba[0] === r && rgba[1] === g && rgba[2] === b;
const WHITE = [255, 255, 255];
const BLACK = [0, 0, 0];

/** Every pixel `test` accepts, made transparent. */
const clearWhere = (img, test) => {
	for (let y = 0; y < img.height; y++)
		for (let x = 0; x < img.width; x++)
			if (test(pixel(img, x, y), x, y)) setPixel(img, x, y, [0, 0, 0, 0]);
	return img;
};

/**
 * The white pixels connected to the crop's edge, made transparent: the
 * outside of a shape whose inside is white too (the slider thumb).
 */
const clearOutside = (img) => {
	const seen = new Set();
	const stack = [];
	for (let x = 0; x < img.width; x++) stack.push([x, 0], [x, img.height - 1]);
	for (let y = 0; y < img.height; y++) stack.push([0, y], [img.width - 1, y]);
	while (stack.length) {
		const [x, y] = stack.pop();
		const key = y * img.width + x;
		if (x < 0 || y < 0 || x >= img.width || y >= img.height || seen.has(key))
			continue;
		seen.add(key);
		if (!isColor(pixel(img, x, y), WHITE)) continue;
		setPixel(img, x, y, [0, 0, 0, 0]);
		stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
	}
	return img;
};

// --- Icons ------------------------------------------------------------

/**
 * A 32 px desktop icon from a color screenshot: the cell at `x`, `y`, every
 * pixel that is not black or white (the gray desktop pattern) transparent.
 * Only for 1-bit icons (the volume icons a driver supplies), which a color
 * screen draws in black and white.
 */
const cropIcon = ([file, x, y]) =>
	clearWhere(
		crop(readPng(join(referenceRoot, file)), x, y, 32, 32),
		(p) => !isColor(p, BLACK) && !isColor(p, WHITE),
	);

for (const [stem, file, id, options = {}] of ICONS) {
	const png = `${stem}.png`;
	if (options.alert) {
		const icon = decodeIcon(need(file, "ICON", id));
		write(`icons/color/32/${png}`, icon);
		write(`icons/bw/32/${png}`, icon);
		continue;
	}
	if (options.size !== 16) {
		if (options.crop) {
			const icon = cropIcon(options.crop);
			write(`icons/color/32/${png}`, icon);
			write(`icons/bw/32/${png}`, icon);
		} else {
			const list = need(file, "ICN#", id);
			const bw = decodeIconList(list, 32);
			write(`icons/bw/32/${png}`, bw);
			write(
				`icons/color/32/${png}`,
				has(file, "icl8", id)
					? decodeIcon8(need(file, "icl8", id), list, clut, 32)
					: bw,
			);
		}
	}
	if (has(file, "ics#", id)) {
		const list = need(file, "ics#", id);
		const bw = decodeIconList(list, 16);
		write(`icons/bw/16/${png}`, bw);
		write(
			`icons/color/16/${png}`,
			has(file, "ics8", id)
				? decodeIcon8(need(file, "ics8", id), list, clut, 16)
				: bw,
		);
	}
}

// --- System art -------------------------------------------------------

const ref = (file) => readPng(join(referenceRoot, file));

// The Trash (System -3993, -3984): the desktop's 32 px icon, no 16 px file.
for (const [name, id] of [
	["trash-empty", -3993],
	["trash-full", -3984],
]) {
	const list = need(SYSTEM, "ICN#", id);
	write(
		`art/color/${name}.png`,
		decodeIcon8(need(SYSTEM, "icl8", id), list, clut, 32),
	);
	write(`art/bw/${name}.png`, decodeIconList(list, 32));
}

// The Apple and Help menu titles. On a color screen the menu bar draws the
// System's small icons (`ics8` -16386, the rainbow Apple; `ics8` -16490, the
// balloon), which match the screenshots pixel for pixel at 15,1 and 580,2;
// on a 1-bit screen the Help title is `ics#` -16490 and the Apple is
// Chicago's apple character, cropped from the same 16 × 16 cell.
const ics8 = (file, id) =>
	decodeIcon8(need(file, "ics8", id), need(file, "ics#", id), clut, 16);
write("art/color/apple-menu.png", ics8(SYSTEM, -16386));
write(
	"art/bw/apple-menu.png",
	clearWhere(crop(ref("bw-desktop-menubar-icons.png"), 15, 1, 16, 16), (p) =>
		isColor(p, WHITE),
	),
);
write("art/color/help-button.png", ics8(SYSTEM, -16490));
write(
	"art/bw/help-button.png",
	decodeIconList(need(SYSTEM, "ics#", -16490), 16),
);

// The startup screen's "Mac OS" panel (System PICT -16503 at 256 colors,
// -16501 in black and white), cropped to the panel's black frame.
for (const [variant, id] of [
	["color", -16503],
	["bw", -16501],
]) {
	const pict = readBmp(join(decodedRoot, `System.rsrc_PICT_${id}.bmp`));
	// The picture has a 1 px black border of its own; the panel's frame is
	// the next black line in from each side (scanned along the middle row,
	// then down a column just inside the panel's left edge).
	const black = (x, y) => isColor(pixel(pict, x, y), BLACK);
	const inward = (from, step, at) => {
		let i = from;
		while (black(...at(i))) i += step;
		while (!black(...at(i))) i += step;
		return i;
	};
	const midY = pict.height >> 1;
	const left = inward(0, 1, (i) => [i, midY]);
	const right = inward(pict.width - 1, -1, (i) => [i, midY]);
	const top = inward(0, 1, (i) => [left + 2, i]);
	const bottom = inward(pict.height - 1, -1, (i) => [left + 2, i]);
	write(
		`art/${variant}/startup-logo.png`,
		crop(pict, left, top, right - left + 1, bottom - top + 1),
	);
}

// The title-bar stripes: a 16 × 15 tile from an active window's title bar,
// rows 2–16 below the top frame line (y 81), between the close box and the
// title.
write(
	"art/color/window-stripes.png",
	crop(ref("color-finder-window-fits-active.png"), 80, 83, 16, 15),
);
write(
	"art/bw/window-stripes.png",
	crop(ref("bw-finder-window-fits-active.png"), 80, 83, 16, 15),
);

// The floating window's drag-bar texture: one dot in every 3 × 3 (rows 4, 7
// and 10 below the frame line, measured on Apple Guide's window), so the
// tile is one 3 × 3 period, its dot top left.
write(
	"art/color/window-utility-texture.png",
	crop(ref("color-floating-appleguide.png"), 108, 97, 3, 3),
);
write(
	"art/bw/window-utility-texture.png",
	crop(ref("bw-floating-appleguide.png"), 108, 97, 3, 3),
);

// The size box cell: inside the vertical bar's left line (x 412), the
// horizontal bar's top line (y 282) and the frame (x 427, y 297).
write(
	"art/color/window-grip.png",
	crop(ref("color-finder-window-fits-active.png"), 413, 283, 14, 14),
);
write(
	"art/bw/window-grip.png",
	crop(ref("bw-finder-window-fits-active.png"), 413, 283, 14, 14),
);

// The zoom box glyph: the 11 × 11 box at 408,85 with only the inner
// square's right and bottom edges kept (its frame, face and bevel are the
// package's). The color box's square starts inside its bevel, a row and a
// column later than the 1-bit one's.
const zoomGlyph = (file, from) =>
	clearWhere(
		crop(ref(file), 408, 85, 11, 11),
		(_, x, y) =>
			!((x === 6 && y >= from && y <= 6) || (y === 6 && x >= from && x <= 6)),
	);
write(
	"art/color/zoom-glyph.png",
	zoomGlyph("color-finder-window-fits-active.png", 2),
);
write(
	"art/bw/zoom-glyph.png",
	zoomGlyph("bw-finder-window-fits-active.png", 1),
);

// The hierarchical-menu triangle, the pop-up menu's down triangle and the
// Sound panel's slider thumb: solid black or black-and-white shapes, the
// same at both depths, so one file in art/color serves both (the bw variant
// falls back to the base tree).
write(
	"art/color/submenu-arrow.png",
	clearWhere(
		crop(ref("color-menu-hierarchical-controlpanels.png"), 189, 73, 6, 11),
		(p) => isColor(p, WHITE),
	),
);
write(
	"art/color/popup-arrows.png",
	clearWhere(
		crop(ref("color-dialog-standardfile-open.png"), 369, 125, 11, 6),
		(p) => isColor(p, WHITE),
	),
);
write(
	"art/color/slider-thumb.png",
	clearOutside(
		crop(ref("color-controlpanel-sound-slider.png"), 163, 112, 23, 11),
	),
);

// The Sad Mac is ROM art, the same on every Mac: Platinum's file.
copy(join(platinumAssets, "art", "sad-mac.png"), "art/sad-mac.png");

// --- Cursors ----------------------------------------------------------

// System CURS 1 (I-beam), 2 (crosshair) and 4 (watch), with their hotspots.
for (const [role, id] of [
	["ibeam", 1],
	["crosshair", 2],
	["watch", 4],
]) {
	const { image, hotspot } = decodeCursor(need(SYSTEM, "CURS", id));
	write(`cursors/${role}.png`, image);
	console.log(
		`cursor ${role}: CURS ${id}, hotspot (${hotspot.x}, ${hotspot.y})`,
	);
}

// QuickDraw's arrow is in ROM; Platinum's cursor-arrow.svg holds its pixels
// as 1 × n rects in a white and a black group.
{
	const svg = readFileSync(
		join(platinumAssets, "art", "cursor-arrow.svg"),
		"utf8",
	);
	const arrow = blank(16, 16);
	for (const group of svg.matchAll(/<g fill="(#[0-9a-f]+)">(.*?)<\/g>/g)) {
		const rgba = group[1] === "#fff" ? [255, 255, 255, 255] : [0, 0, 0, 255];
		for (const r of group[2].matchAll(
			/x="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)"/g,
		)) {
			const [x, y, w, h] = r.slice(1).map(Number);
			for (let j = y; j < y + h; j++)
				for (let i = x; i < x + w; i++) setPixel(arrow, i, j, rgba);
		}
	}
	write("cursors/arrow.png", arrow);
}

// System 7 has no resize cursors: Platinum's, which are 1-bit in the same
// style, re-encoded as the export's own RGBA files (Platinum stores them as
// gray with alpha).
for (const role of ["lr", "ud", "u", "d", "l", "r"])
	write(
		`cursors/resize-${role}.png`,
		readPng(join(platinumAssets, "cursors", `cursor-resize-${role}.png`)),
	);

// Nor diagonal ones (nor has Platinum): a diagonal double arrow in the
// resize cursors' style, black on a 1 px white outline, through its hotspot
// at the center (8, 8): a 2 px shaft along the diagonal and a 5 px arrowhead
// at each end. ↗↙ is its mirror about x = 8, so the shaft still crosses 8, 8.
const diagonal = (mirror) => {
	const img = blank(16, 16);
	const ink = (x, y) =>
		(x >= 1 && y >= 1 && x + y <= 6) ||
		(x <= 14 && y <= 14 && x + y >= 24) ||
		(x >= 3 && x <= 13 && (x === y || x === y + 1));
	const black = (x, y) => ink(mirror ? 16 - x : x, y);
	for (let y = 0; y < 16; y++)
		for (let x = 0; x < 16; x++) {
			if (black(x, y)) setPixel(img, x, y, [0, 0, 0, 255]);
			else if (
				[-1, 0, 1].some((dy) => [-1, 0, 1].some((dx) => black(x + dx, y + dy)))
			)
				setPixel(img, x, y, [255, 255, 255, 255]);
		}
	return img;
};
write("cursors/resize-nwse.png", diagonal(false));
write("cursors/resize-nesw.png", diagonal(true));

// --- Sounds -----------------------------------------------------------

// The six alerts the Sound control panel lists, from the System file's
// `snd ` resources, as WAV files named for their sprite ids, which
// bin/make_audio_sprites.sh builds into the pack's sprite sheet. The five
// sampled ones are written as stored: 8-bit unsigned mono at the header's
// rate, Apple's 11,127.27 and 22,254.55 Hz written as 11127 and 22254 (WAV
// rates are whole numbers), no resampling, trimming or fades. Simple Beep
// (`snd ` 1) holds no samples: it is square-wave synthesizer commands, which
// macSound.ts plays into 16-bit mono at 22,050 Hz.
const ALERTS = [
	["ClassicyAlertSimpleBeep", 1],
	["ClassicyAlertQuack", 5],
	["ClassicyAlertDroplet", 6],
	["ClassicyAlertIndigo", 7],
	["ClassicyAlertWildEep", 8],
	["ClassicyAlertSosumi", 9],
];
const writeWav = (file, wav) => {
	const path = join(out, file);
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, wav);
	written.push(file);
};
for (const [sprite, id] of ALERTS) {
	const sound = decodeSound(need(SYSTEM, "snd", id));
	let wav;
	if (sound.sampled) {
		const { sampleRate, samples } = sound.sampled;
		wav = encodeWav({ rate: Math.floor(sampleRate), bits: 8, samples });
		console.log(
			`snd ${id} -> ${sprite}: sampled, ${samples.length} samples at ${sampleRate.toFixed(2)} Hz`,
		);
	} else if (sound.synths.some((synth) => synth.id === SQUARE_WAVE_SYNTH)) {
		const samples = renderSquareWave(sound.commands, 22050);
		wav = encodeWav({ rate: 22050, bits: 16, samples });
		console.log(
			`snd ${id} -> ${sprite}: square-wave synthesizer, ${sound.commands.length} commands, ${samples.length} samples at 22050 Hz`,
		);
	} else throw new Error(`snd ${id}: neither sampled nor square-wave`);
	writeWav(`sounds/system7/sprites/${sprite}.wav`, wav);
	// HyperCard's `beep` plays ClassicyBeep: System 7's beep is the alert.
	if (sprite === "ClassicyAlertSimpleBeep")
		writeWav("sounds/system7/sprites/ClassicyBeep.wav", wav);
}

// --- Window colors ----------------------------------------------------

// The Standard window and control color tables (`wctb` 0, `cctb` 0: color
// tables whose entry values are part codes, Inside Macintosh: Macintosh
// Toolbox Essentials, "Window Manager" and "Control Manager"), printed as
// the high byte of each channel. The color theme's tokens are mapped from
// them by hand (docs/system7-asset-inventory.md, "Window colors").
const PARTS = {
	wctb: [
		"wContentColor",
		"wFrameColor",
		"wTextColor",
		"wHiliteColor",
		"wTitleBarColor",
		"wHiliteColorLight",
		"wHiliteColorDark",
		"wTitleBarLight",
		"wTitleBarDark",
		"wDialogLight",
		"wDialogDark",
		"wTingeLight",
		"wTingeDark",
	],
	cctb: [
		"cFrameColor",
		"cBodyColor",
		"cTextColor",
		"cThumbColor",
		"cFillPatColor",
		"cArrowsColorLight",
		"cArrowsColorDark",
		"cThumbLight",
		"cThumbDark",
		"cHiliteLight",
		"cHiliteDark",
		"cTitleBarLight",
		"cTitleBarDark",
		"cTingeLight",
		"cTingeDark",
	],
};
for (const [type, names] of Object.entries(PARTS)) {
	const table = decodeClut(need(SYSTEM, type, 0));
	table.forEach((rgb, part) => {
		const hex = rgb
			.map((c) => c.toString(16).padStart(2, "0"))
			.join("")
			.toUpperCase();
		console.log(`${type} 0 part ${part} ${names[part] ?? "?"}: #${hex}`);
	});
}

console.log(`${written.length} files written under ${out}`);
for (const file of written.sort()) console.log(`  ${file}`);
