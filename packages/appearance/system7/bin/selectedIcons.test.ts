import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
	classicyPixelsEqual,
	decodeClassicyWebp,
	encodeClassicyWebp,
} from "../../../../bin/classicyWebp";
import {
	darken,
	screenColor,
	selectedColor,
	selectedIcon,
	selectedIconWebp,
} from "./selectedIcons.mjs";

// Story 0197-s0z: System 7 draws a selected color icon through a darkened
// color table (IconUtils' Darken), in the 8-bit screen's colors (the
// inverse table's nearest entry by cell). The pairs are every color the 7.5
// captures show an icon both ways in: the Sound control panel
// (`color-menu-help-and-selected-icon.png`) and AppleShare
// (`color-chooser-dimmed-default-button.png`).
const CAPTURED: Record<string, string> = {
	"000000": "000000",
	"333366": "000033",
	"444444": "222222",
	"555555": "222222",
	"6666cc": "000066",
	"777777": "333333",
	"9999ff": "333366",
	aaaaaa: "555555",
	bbbbbb: "555555",
	ccccff: "333366",
	dddddd: "666666",
	eeeeee: "777777",
	ffcc99: "663333",
	ffffff: "777777",
};

const rgb = (hex: string) =>
	[0, 2, 4].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
const hex = (color: number[]) =>
	color.map((v) => v.toString(16).padStart(2, "0")).join("");

const assets = path.join(__dirname, "..", "src", "assets", "icons");

describe("System 7's selected color icons", () => {
	it("darkens as IconUtils' Darken: halved, the two smaller components halved again unless gray", () => {
		expect(darken([0xffff, 0xffff, 0xffff])).toEqual([0x7fff, 0x7fff, 0x7fff]);
		expect(darken([0xcccc, 0xcccc, 0xffff])).toEqual([0x3333, 0x3333, 0x7fff]);
		expect(darken([0xffff, 0xcccc, 0x9999])).toEqual([0x7fff, 0x3333, 0x2666]);
		// Two larger components within 512 of each other: only the smallest.
		expect(darken([0xffff, 0xffff, 0x9999])).toEqual([0x7fff, 0x7fff, 0x2666]);
		// Within 512 of each other: gray, halved only.
		expect(darken([0x8000, 0x8100, 0x8000])).toEqual([0x4000, 0x4080, 0x4000]);
	});

	it("draws a darkened color as the 8-bit table's entry nearest it by inverse-table cell", () => {
		// Nearer #333399 in RGB, but in cell (3, 3, 7) #333366's cell is.
		expect(hex(screenColor([0x3333, 0x3333, 0x7fff]))).toBe("333366");
	});

	it("draws every captured pair", () => {
		for (const [from, to] of Object.entries(CAPTURED))
			expect(hex(selectedColor(rgb(from))), from).toBe(to);
	});

	it("leaves a clear pixel clear", () => {
		const img = {
			width: 2,
			height: 1,
			pixels: Buffer.from([0xff, 0xff, 0xff, 0xff, 0, 0, 0, 0]),
		};
		expect([...selectedIcon(img).pixels]).toEqual([
			0x77, 0x77, 0x77, 0xff, 0, 0, 0, 0,
		]);
	});

	// The committed icons are lossless WebP (plan 0019-fb7 §6.5).
	const read = (size: string, variant: string, file: string) =>
		new Uint8Array(readFileSync(path.join(assets, variant, size, file)));
	const pairs = ["16", "32"].flatMap((size) => {
		const color = readdirSync(path.join(assets, "color", size)).sort();
		return color.map((file) => [size, file] as const);
	});

	it("commits a selected rendering for every color icon, and no other", () => {
		for (const size of ["16", "32"])
			expect(readdirSync(path.join(assets, "selected", size)).sort()).toEqual(
				readdirSync(path.join(assets, "color", size)).sort(),
			);
		expect(pairs.length).toBeGreaterThan(100);
		for (const [, file] of pairs) expect(file).toMatch(/\.webp$/);
	});

	it("the committed selected icon decodes to selectedIcon(the decoded color icon)", async () => {
		for (const [size, file] of pairs) {
			const color = await decodeClassicyWebp(read(size, "color", file));
			const { pixels } = selectedIcon({
				width: color.width,
				height: color.height,
				pixels: Buffer.from(color.data),
			});
			expect(
				classicyPixelsEqual(
					await decodeClassicyWebp(read(size, "selected", file)),
					{ width: color.width, height: color.height, data: pixels },
				),
				`${size}/${file}`,
			).toBe(true);
		}
	}, 120_000);

	it("re-encoding it reproduces the committed bytes", async () => {
		for (const [size, file] of pairs) {
			const committed = read(size, "selected", file);
			const reencoded = await encodeClassicyWebp(
				await decodeClassicyWebp(committed),
				{ lossless: true },
			);
			expect(Buffer.from(reencoded).equals(committed), `${size}/${file}`).toBe(
				true,
			);
			// And the script, run directly, writes the same bytes from the
			// committed color icon.
			expect(
				Buffer.from(await selectedIconWebp(read(size, "color", file))).equals(
					committed,
				),
				`${size}/${file} from its color icon`,
			).toBe(true);
		}
	}, 120_000);
});
