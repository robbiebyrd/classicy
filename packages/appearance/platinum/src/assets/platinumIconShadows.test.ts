import { readFileSync } from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";
import { describe, expect, it } from "vitest";
import { decodeClassicyWebp } from "../../../../../bin/classicyWebp";

// Mac OS 8.5 draws its system icons with 8-bit masks (Icon Services,
// TN1142: "Deep (8 bit) masks allow for the specification of transparent
// drawing effects"), where 8.1's 1-bit masks drew the Trash's drop shadow
// as opaque #222222, #444444 and #555555 pixels (the 8.5 audit's F10). The
// Trash art (empty and full) and the generic folder, 32 px and 16 px, carry
// 8.5's graded shadows: each composited over the background of an 8.5
// capture draws that capture's pixels.
//
// Every other icon of the core tree that Platinum draws and Mac OS 8.5 also
// draws (integration review G round 5, findings 4 and 5) was captured in
// 8.5 (Infinite Mac's Power Macintosh 9500) over two flat backgrounds, a
// Finder window's white and the button view's #CCCCCC face (the desktop's
// #9999CC and the list's #DDDDDD for the Trash, a copy of the preferences
// file and the 16 px folder), so each pixel's alpha and color are solved,
// not inferred: composited over both, the art draws both captures. Some
// 8.5 draws with an 8-bit mask (a graded shadow), some still with a 1-bit
// mask, their dark pixels its own opaque shadow or body; each is graded by
// its capture.

const ROOT = path.resolve(import.meta.dirname, "../../../../..");
const CAPTURES = path.resolve(
	import.meta.dirname,
	"../../resources/screenshots",
);

type Image = { width: number; height: number; data: ArrayLike<number> };

const webp = async (file: string): Promise<Image> =>
	decodeClassicyWebp(
		new Uint8Array(readFileSync(path.join(import.meta.dirname, file))),
	);
const png = (file: string): Image => PNG.sync.read(readFileSync(file));

/** The icon composited over `bg` and the capture at (`ox`, `oy`), each
 * pixel's largest channel difference. */
const worstDifference = (
	icon: Image,
	capture: Image,
	ox: number,
	oy: number,
	bg: [number, number, number],
): number => {
	let worst = 0;
	for (let y = 0; y < icon.height; y++)
		for (let x = 0; x < icon.width; x++) {
			const i = (y * icon.width + x) * 4;
			const j = ((oy + y) * capture.width + ox + x) * 4;
			const a = icon.data[i + 3];
			for (let k = 0; k < 3; k++) {
				const drawn = Math.round(
					(icon.data[i + k] * a + bg[k] * (255 - a)) / 255,
				);
				worst = Math.max(worst, Math.abs(drawn - capture.data[j + k]));
			}
		}
	return worst;
};

const alphaLevels = (icon: Image) => {
	const levels = new Set<number>();
	for (let i = 3; i < icon.data.length; i += 4) levels.add(icon.data[i]);
	return levels.size;
};

const DESKTOP: [number, number, number] = [0x99, 0x99, 0xcc];

describe("Platinum's system icons' shadows (Mac OS 8.5)", () => {
	it.each([
		["art/trash-empty.webp", "mac-os-8.5/platinum-85-trash-empty.png"],
		["art/trash-full.webp", "mac-os-8.5/platinum-85-trash-full.png"],
	])("%s draws 8.5's translucent shadow over the desktop", async (art, capture) => {
		const icon = await webp(art);
		expect(icon.width).toBe(32);
		// Graded, not a 1-bit mask.
		expect(alphaLevels(icon)).toBeGreaterThan(2);
		// The Trash at x 576-607, y 412-443 over the desktop's #9999CC:
		// within one level (the mask's 8 bits round the blend).
		expect(
			worstDifference(
				icon,
				png(path.join(CAPTURES, capture)),
				576,
				412,
				DESKTOP,
			),
		).toBeLessThanOrEqual(1);
	});

	it("8.1's Trash drew its shadow opaque, which 8.5's does not", () => {
		const at = (file: string, x: number, y: number) => {
			const image = png(path.join(CAPTURES, file));
			const i = (y * image.width + x) * 4;
			return [image.data[i], image.data[i + 1], image.data[i + 2]];
		};
		// The shadow's darkest pixel, below and right of the can.
		expect(at("mac-os-8.1/platinum-81-9500-trash-empty.png", 596, 435)).toEqual(
			[0x22, 0x22, 0x22],
		);
		expect(at("mac-os-8.5/platinum-85-trash-empty.png", 596, 435)).toEqual([
			0x3f, 0x3f, 0x4c,
		]);
	});

	it("the generic folder draws 8.5's, its shadow graded, over a Finder window's white", () => {
		const icon = png(
			path.join(ROOT, "assets/img/icons/system/folders/directory.png"),
		);
		expect(alphaLevels(icon)).toBeGreaterThan(2);
		// "Web Pages" in 8.5's icon view, x 179-210, y 200-231.
		expect(
			worstDifference(
				icon,
				png(path.join(CAPTURES, "mac-os-8.5/platinum-85-folder-icon-view.png")),
				179,
				200,
				[0xff, 0xff, 0xff],
			),
		).toBe(0);
	});

	it("the small generic folder draws 8.5's, its shadow graded, over a list's sorted column", async () => {
		const icon = await webp("art/folder-small.webp");
		expect(icon.width).toBe(16);
		expect(alphaLevels(icon)).toBeGreaterThan(2);
		// "Web Pages" in 8.5's list view, x 35-50, y 223-238, over the sorted
		// column's #DDDDDD.
		expect(
			worstDifference(
				icon,
				png(path.join(CAPTURES, "mac-os-8.5/platinum-85-folder-list-view.png")),
				35,
				223,
				[0xdd, 0xdd, 0xdd],
			),
		).toBe(0);
	});

	// [art, 8.5's item, first capture, its background, place, second
	// capture, its background, place, graded (8-bit mask) or 1-bit].
	type Row = [
		string,
		string,
		string,
		string,
		[number, number],
		string,
		string,
		[number, number],
		"graded" | "1-bit",
	];
	const S = "mac-os-8.5/platinum-85-icons-";
	const CORE = "assets/img/icons/system/";
	const ROWS: Row[] = [
		// System Folder: icon view over white, button view over #CCCCCC.
		[
			`${CORE}clipboard.png`,
			"Clipboard",
			"system-folder",
			"FFFFFF",
			[478, 72],
			"system-folder-buttons",
			"CCCCCC",
			[463, 80],
			"graded",
		],
		[
			`${CORE}folders/suitcase-system.png`,
			"System",
			"system-folder-2",
			"FFFFFF",
			[478, 340],
			"system-folder-buttons-2",
			"CCCCCC",
			[463, 362],
			"graded",
		],
		[
			`${CORE}folders/suitecase-system.png`,
			"System",
			"system-folder-2",
			"FFFFFF",
			[478, 340],
			"system-folder-buttons-2",
			"CCCCCC",
			[463, 362],
			"graded",
		],
		[
			`${CORE}system-resources.png`,
			"System Resources (and the Finder, the same icon)",
			"system-folder-2",
			"FFFFFF",
			[350, 404],
			"system-folder-buttons-3",
			"CCCCCC",
			[335, 394],
			"graded",
		],
		[
			`${CORE}folders/folder-apple.png`,
			"Apple Menu Items",
			"system-folder",
			"FFFFFF",
			[222, 72],
			"system-folder-buttons",
			"CCCCCC",
			[207, 80],
			"graded",
		],
		[
			`${CORE}folders/folder-extensions.png`,
			"Extensions",
			"system-folder",
			"FFFFFF",
			[478, 200],
			"system-folder-buttons",
			"CCCCCC",
			[463, 251],
			"graded",
		],
		[
			`${CORE}folders/folder-fonts.png`,
			"Fonts",
			"system-folder",
			"FFFFFF",
			[478, 264],
			"system-folder-buttons",
			"CCCCCC",
			[463, 336],
			"graded",
		],
		[
			`${CORE}folders/folder-preferences.png`,
			"Preferences",
			"system-folder",
			"FFFFFF",
			[350, 392],
			"system-folder-buttons-2",
			"CCCCCC",
			[335, 193],
			"graded",
		],
		[
			`${CORE}folders/folder-printers.png`,
			"PrintMonitor Documents",
			"system-folder",
			"FFFFFF",
			[478, 392],
			"system-folder-buttons-2",
			"CCCCCC",
			[463, 193],
			"graded",
		],
		// Macintosh HD.
		[
			`${CORE}folders/folder-system.png`,
			"System Folder",
			"hd",
			"FFFFFF",
			[179, 136],
			"hd-buttons",
			"CCCCCC",
			[179, 104],
			"graded",
		],
		[
			`${CORE}folders/directory.png`,
			"Web Pages (a plain folder)",
			"hd",
			"FFFFFF",
			[179, 200],
			"hd-buttons",
			"CCCCCC",
			[179, 190],
			"graded",
		],
		// A preferences file, over white and, copied, over the desktop.
		[
			`${CORE}files/preferences.png`,
			"Apple Menu Options Prefs",
			"preferences",
			"FFFFFF",
			[65, 72],
			"preferences-desktop",
			"9999CC",
			[585, 248],
			"graded",
		],
		// Extensions, Apple Menu Items, Applications, Control Panels.
		[
			`${CORE}extensions/apple-share.png`,
			"AppleShare",
			"extensions",
			"FFFFFF",
			[73, 264],
			"extensions-buttons",
			"CCCCCC",
			[73, 336],
			"1-bit",
		],
		[
			`${CORE}extensions/apple-guide.png`,
			"Apple Guide",
			"extensions",
			"FFFFFF",
			[457, 136],
			"extensions-buttons",
			"CCCCCC",
			[457, 165],
			"1-bit",
		],
		[
			`${CORE}extensions/ethernet.png`,
			"Apple Built-In Ethernet",
			"extensions",
			"FFFFFF",
			[329, 72],
			"extensions-buttons",
			"CCCCCC",
			[329, 80],
			"1-bit",
		],
		[
			`${CORE}extensions/context-menus.png`,
			"Contextual Menu Extension",
			"extensions",
			"FFFFFF",
			[329, 328],
			"extensions-buttons",
			"CCCCCC",
			[329, 421],
			"1-bit",
		],
		[
			`${CORE}extensions/fm-radio.png`,
			"FM Radio Extension",
			"extensions-2",
			"FFFFFF",
			[457, 214],
			"extensions-buttons-2",
			"CCCCCC",
			[457, 303],
			"1-bit",
		],
		[
			`${CORE}extensions/apple-vision.png`,
			"SystemAV",
			"extensions-3",
			"FFFFFF",
			[73, 212],
			"extensions-buttons-3",
			"CCCCCC",
			[73, 211],
			"1-bit",
		],
		[
			`${CORE}extensions/date-and-time.png`,
			"Time Synchronizer",
			"extensions-3",
			"FFFFFF",
			[457, 212],
			"extensions-buttons-3",
			"CCCCCC",
			[457, 211],
			"1-bit",
		],
		[
			`${CORE}sherlock/search.png`,
			"Sherlock",
			"apple-menu-items",
			"FFFFFF",
			[43, 392],
			"apple-menu-items-buttons",
			"CCCCCC",
			[43, 367],
			"1-bit",
		],
		[
			`${CORE}network/network-local.png`,
			"Network Browser",
			"applications",
			"FFFFFF",
			[194, 200],
			"applications-buttons",
			"CCCCCC",
			[194, 251],
			"1-bit",
		],
		[
			`${CORE}quicktime/control-panel.png`,
			"QuickTime Settings",
			"control-panels",
			"FFFFFF",
			[434, 392],
			"control-panels-buttons",
			"CCCCCC",
			[434, 364],
			"1-bit",
		],
		[
			`${CORE}network/controlpanel-internet.png`,
			"Internet",
			"control-panels",
			"FFFFFF",
			[306, 264],
			"control-panels-buttons",
			"CCCCCC",
			[306, 193],
			"1-bit",
		],
		// Platinum's own art: the Trash over the desktop and its button view,
		// the 16 px folder over white (small icons) and the list's sorted column.
		[
			"art/trash-empty.webp",
			"Trash",
			"desktop",
			"9999CC",
			[576, 412],
			"desktop-buttons",
			"CCCCCC",
			[578, 420],
			"graded",
		],
		[
			"art/trash-full.webp",
			"Trash (full)",
			"desktop-trash-full",
			"9999CC",
			[576, 412],
			"desktop-trash-full-buttons",
			"CCCCCC",
			[576, 420],
			"graded",
		],
		[
			"art/folder-small.webp",
			"Web Pages, 16 px",
			"hd-small",
			"FFFFFF",
			[213, 69],
			"hd-list",
			"DDDDDD",
			[35, 223],
			"graded",
		],
	];
	const rgb = (hex: string): [number, number, number] => [
		Number.parseInt(hex.slice(0, 2), 16),
		Number.parseInt(hex.slice(2, 4), 16),
		Number.parseInt(hex.slice(4, 6), 16),
	];
	const load = async (art: string): Promise<Image> =>
		art.endsWith(".webp") ? webp(art) : png(path.join(ROOT, art));

	it.each(
		ROWS,
	)("%s draws 8.5's %s over both of its captures' backgrounds", async (art, _item, a, bgA, [
		ax,
		ay,
	], b, bgB, [bx, by], mask) => {
		const icon = await load(art);
		const first = png(path.join(CAPTURES, `${S}${a}.png`));
		const second = png(path.join(CAPTURES, `${S}${b}.png`));
		// Within one level (a faint pixel's two composites round apart).
		expect(worstDifference(icon, first, ax, ay, rgb(bgA))).toBeLessThanOrEqual(
			1,
		);
		expect(worstDifference(icon, second, bx, by, rgb(bgB))).toBeLessThanOrEqual(
			1,
		);
		if (mask === "graded") expect(alphaLevels(icon)).toBeGreaterThan(2);
		else expect(alphaLevels(icon)).toBeLessThanOrEqual(2);
	});

	// Icons 8.5 draws over one background only, where a graded shadow would
	// show as pixels the art leaves transparent: the caution alert's icon
	// over the alert's #DDDDDD and the Color Picker's pickers over its white
	// list. Each draws its capture exactly, 1-bit as 8.5 has it.
	it.each([
		[`${CORE}warn.png`, "empty-trash-alert", "DDDDDD", [156, 100]],
		[`${CORE}colors/picker-crayon.png`, "color-picker", "FFFFFF", [100, 151]],
		[`${CORE}colors/picker-hex.png`, "color-picker-2", "FFFFFF", [100, 210]],
	] as const)("%s draws 8.5's capture over its one background", (art, capture, bg, [
		x,
		y,
	]) => {
		const icon = png(path.join(ROOT, art));
		expect(
			worstDifference(
				icon,
				png(path.join(CAPTURES, `${S}${capture}.png`)),
				x,
				y,
				rgb(bg),
			),
		).toBe(0);
		expect(alphaLevels(icon)).toBeLessThanOrEqual(2);
	});
});
