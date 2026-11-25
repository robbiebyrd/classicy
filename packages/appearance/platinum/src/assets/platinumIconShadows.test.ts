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
});
