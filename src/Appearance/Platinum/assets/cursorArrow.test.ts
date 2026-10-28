import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SIZE = 16;

const svg = readFileSync(
	join(process.cwd(), "src/Appearance/Platinum/assets/art/cursor-arrow.svg"),
	"utf8",
);

/** The pixels painted by the `<g fill="…">` group, as "x,y" keys. */
const pixels = (fill: string): Set<string> => {
	const group = svg.match(new RegExp(`<g fill="${fill}">(.*?)</g>`))?.[1] ?? "";
	const out = new Set<string>();
	for (const rect of group.matchAll(
		/<rect x="(\d+)" y="(\d+)" width="(\d+)" height="1"\/>/g,
	)) {
		const [x, y, width] = [rect[1], rect[2], rect[3]].map(Number);
		for (let i = 0; i < width; i++) out.add(`${x + i},${y}`);
	}
	return out;
};

describe("Platinum cursor-arrow.svg", () => {
	const black = pixels("#000");
	const white = pixels("#fff");

	it("is a 16x16 crispEdges drawing with both layers painted", () => {
		expect(svg).toContain('viewBox="0 0 16 16"');
		expect(svg).toContain('shape-rendering="crispEdges"');
		expect(black.size).toBeGreaterThan(0);
		expect(white.size).toBeGreaterThan(0);
	});

	it("puts the arrow's tip on the hotspot (1,1)", () => {
		expect(black.has("1,1")).toBe(true);
		expect([...black].some((key) => key.endsWith(",0"))).toBe(false);
	});

	it("never paints black and white on the same pixel", () => {
		for (const key of black) expect(white.has(key)).toBe(false);
	});

	it("outlines the black arrow in white on every edge", () => {
		// Every in-canvas 4-neighbor of a black pixel is black or white, never
		// transparent. (A neighbor off the 16px canvas has nothing to draw.)
		for (const key of black) {
			const [x, y] = key.split(",").map(Number);
			for (const [dx, dy] of [
				[1, 0],
				[-1, 0],
				[0, 1],
				[0, -1],
			]) {
				const nx = x + dx;
				const ny = y + dy;
				if (nx < 0 || ny < 0 || nx >= SIZE || ny >= SIZE) continue;
				const neighbor = `${nx},${ny}`;
				expect(
					black.has(neighbor) || white.has(neighbor),
					`(${x},${y}) borders transparency at (${nx},${ny})`,
				).toBe(true);
			}
		}
	});
});
