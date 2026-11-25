import { readFileSync } from "node:fs";
import path from "node:path";
import { dimClassicyIconPixels } from "@classicy/classicy";
import { PNG } from "pngjs";
import { describe, expect, it } from "vitest";
import { PLATINUM_ICON_DIMMING } from "./platinumIconDimming";

// Platinum dims an icon in a menu as Mac OS 8.5 does at true color (the 8.5
// audit's M10): halfway to white on QuickDraw's 16-bit components, each
// channel the high byte of (c * 257 + 65535) / 2, with no step to fewer bits
// and no palette. The references are the Apple menu's title at rest and
// dimmed under the Finder's Page Setup alert, on Infinite Mac's Power
// Macintosh 9500, in 8.5 and in 8.1 (which agrees: the screen's depth, not
// the release, set story 0214-c61's 4-bit, palette-snapped rule apart).

const SCREENSHOTS = path.resolve(
	import.meta.dirname,
	"../resources/screenshots",
);

const read = (file: string) =>
	PNG.sync.read(readFileSync(path.join(SCREENSHOTS, file)));

const hex = (data: ArrayLike<number>, i: number) =>
	`#${[data[i], data[i + 1], data[i + 2]]
		.map((c) => c.toString(16).padStart(2, "0"))
		.join("")
		.toUpperCase()}`;

/** Each pixel of the Apple title (x 17-28, rows 2-16) the alert dimmed, as
 * [at rest, dimmed]. */
const dimmedPixels = (rest: PNG, dimmed: PNG): [string, string][] => {
	const pairs: [string, string][] = [];
	for (let y = 2; y <= 16; y++)
		for (let x = 17; x <= 28; x++) {
			const i = (y * rest.width + x) * 4;
			const a = hex(rest.data, i);
			const b = hex(dimmed.data, i);
			if (a !== b) pairs.push([a, b]);
		}
	return pairs;
};

/** `color` dimmed by Platinum's rule. */
const dim = (color: string): string => {
	const n = Number.parseInt(color.slice(1), 16);
	const data = new Uint8ClampedArray([
		(n >> 16) & 255,
		(n >> 8) & 255,
		n & 255,
		255,
	]);
	const rule = PLATINUM_ICON_DIMMING.hiddenApp;
	if (!rule) throw new Error("Platinum declares no hiddenApp rule");
	dimClassicyIconPixels(data, rule);
	return hex(data, 0);
};

describe("Platinum's icon dimming (Mac OS 8.5)", () => {
	it("is a 50% blend toward white on 16-bit components, with no bits step and no palette", () => {
		expect(PLATINUM_ICON_DIMMING.hiddenApp).toEqual({
			blend: { color: "#FFFFFF", amount: 0.5, depth: 16 },
		});
		// The audit's values: 00 to 7F, 33 to 99, 44 to A2, BB to DD, CC to
		// E6, 99 to CC, and the hidden Stickies icon's (0x88 to 0xC4, 0xAA to
		// 0xD5).
		expect(dim("#000000")).toBe("#7F7F7F");
		expect(dim("#333333")).toBe("#999999");
		expect(dim("#444444")).toBe("#A2A2A2");
		expect(dim("#BBBBBB")).toBe("#DDDDDD");
		expect(dim("#CCCCCC")).toBe("#E6E6E6");
		expect(dim("#999999")).toBe("#CCCCCC");
		expect(dim("#888888")).toBe("#C4C4C4");
		expect(dim("#AAAAAA")).toBe("#D5D5D5");
		expect(dim("#FFFF00")).toBe("#FFFF7F");
		expect(dim("#00BB00")).toBe("#7FDD7F");
		expect(dim("#000088")).toBe("#7F7FC4");
	});

	for (const [release, rest, dimmed] of [
		[
			"8.5",
			"mac-os-8.5/platinum-85-apple-title.png",
			"mac-os-8.5/platinum-85-apple-title-dimmed.png",
		],
		[
			"8.1 (the same 9500)",
			"mac-os-8.1/platinum-81-9500-apple-title.png",
			"mac-os-8.1/platinum-81-9500-apple-title-dimmed.png",
		],
	] as const)
		it(`draws every pixel of ${release}'s Apple title dimmed under an alert`, () => {
			const pairs = dimmedPixels(read(rest), read(dimmed));
			// The rainbow Apple's 120 pixels the alert changed, in 29 colors.
			expect(pairs.length).toBe(120);
			expect(new Set(pairs.map(([a]) => a)).size).toBe(29);
			for (const [a, b] of pairs) expect(dim(a), a).toBe(b);
		});
});
