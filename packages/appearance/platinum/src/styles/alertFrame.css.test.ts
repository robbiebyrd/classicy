import { readFileSync } from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";
import { compile, NodePackageImporter } from "sass";
import { describe, expect, it } from "vitest";

// Story 0236-2f8: Platinum's movable alert box draws the frame of HIGOS8
// p.61, Figure 3-4 (the 1:1 bitmap the PDF embeds, kept in
// resources/screenshots/higos8/), pixel for pixel. The background layers of
// the title bar and the contents are laid out here on the figure's boxes and
// compared with the figure's pixels, each read as the role its color plays.

const PLATINUM_SRC = path.resolve(import.meta.dirname, "..");
const CORE_SRC = path.resolve(import.meta.dirname, "../../../../../src");
const FIGURES = path.resolve(
	import.meta.dirname,
	"../../resources/screenshots/higos8",
);

const css = compile(path.join(PLATINUM_SRC, "styles", "platinum.scss"), {
	loadPaths: [CORE_SRC, PLATINUM_SRC],
	importers: [new NodePackageImporter()],
}).css;
const flat = css.replace(/,\s*\n\s*/g, ", ").replace(/\n\s+/g, "\n");
const P = ".classicyDesktop[data-classicy-appearance=platinum]";
const ALERT = `${P} .classicyWindow.classicyAlertMovableWindow`;
const TITLE = `${ALERT} > .classicyWindowTitleBar`;
const CONTENTS = `${ALERT} > .classicyWindowContentsModal`;

/** The declarations of the first rule whose selector list is `selector`. */
const rule = (selector: string): Record<string, string> => {
	const at = flat.indexOf(`\n${selector} {\n`);
	if (at < 0) throw new Error(`no rule for ${selector}`);
	const body = flat.slice(at + selector.length + 4, flat.indexOf("}", at));
	const props: Record<string, string> = {};
	for (const line of body.split(";\n")) {
		const colon = line.indexOf(":");
		if (colon > 0)
			props[line.slice(0, colon).trim()] = line
				.slice(colon + 1)
				.trim()
				.replace(/;$/, "");
	}
	return props;
};

/** `value` split at its commas outside parentheses. */
const layers = (value: string): string[] => {
	const out: string[] = [];
	let depth = 0;
	let start = 0;
	for (let i = 0; i < value.length; i++) {
		if (value[i] === "(") depth++;
		else if (value[i] === ")") depth--;
		else if (value[i] === "," && depth === 0) {
			out.push(value.slice(start, i).trim());
			start = i + 1;
		}
	}
	out.push(value.slice(start).trim());
	return out;
};

// The colors the frame uses, as the roles the figure's palette plays.
const LIGHT = "color-mix(in srgb, var(--color-error), white 67%)";
const DARK = "color-mix(in srgb, var(--color-error), white 49%)";
const TITLE_FACE = "color-mix(in srgb, var(--color-error), white 80%)";
const ROLE_OF_COLOR: Record<string, string> = {
	[LIGHT]: "L",
	[DARK]: "D",
	[TITLE_FACE]: "F",
	"var(--color-white)": "W",
	"var(--color-system-04)": "G",
};
// Each figure's palette (the 1997 PDF's, then its 1996 draft's), as roles.
const ROLE_OF_FIGURE: Record<string, string> = {
	"000000": "K",
	FFFFFF: "W",
	A9A9A9: "G",
	FDABA9: "L",
	FC7D78: "D",
	FFACAA: "L",
	FF7F7A: "D",
	// The title bar's face, and the window's: the box's own background color.
	FED6D5: "F",
	E3E4E4: "F",
	FFD7D6: "F",
	E4E4E4: "F",
};

const roleOf = (color: string): string => {
	const role = ROLE_OF_COLOR[color.trim()];
	if (!role) throw new Error(`unknown color ${color}`);
	return role;
};

// One length, at border size `b`: `0`, the border variable, the frame width
// (two borders, the `--control-frame-width` derivation), or one of them
// negated.
const length = (token: string, b: number): number => {
	const t = token.trim();
	if (t === "0") return 0;
	if (t === "var(--window-border-size)") return b;
	if (t === "var(--control-frame-width)") return 2 * b;
	const negated = t.match(/^calc\((var\([\w-]+\)) \* -1\)$/);
	if (negated) return -length(negated[1], b);
	throw new Error(`unknown length ${t}`);
};

// Splits `inset var(--x) calc(var(--x) * -1) 0 0 color-mix(…)` into words,
// a `var(…)`, `calc(…)` or `color-mix(…)` one word.
const words = (value: string): string[] =>
	value.match(/(?:calc|var|color-mix)\((?:[^()]|\([^()]*\))*\)|\S+/g) ?? [];

/**
 * The box `w` x `h` as it paints itself: its face (`F`), its inset box
 * shadows (the last painted first; `inset X Y 0 0 color`, X and Y equal: a
 * band of |X| along the top and left, or the bottom and right), then its
 * `::before` and `::after` (absolutely placed squares), a role a pixel.
 */
const paint = (selector: string, w: number, h: number, b = 1) => {
	const grid = Array.from({ length: h }, () => Array<string>(w).fill("F"));
	const shadows = layers(rule(selector)["box-shadow"]);
	for (let i = shadows.length - 1; i >= 0; i--) {
		const [inset, x, y, blur, spread, color] = words(shadows[i]);
		expect([inset, blur, spread]).toEqual(["inset", "0", "0"]);
		const dx = length(x, b);
		expect(length(y, b)).toBe(dx);
		const role = roleOf(color);
		for (let py = 0; py < h; py++)
			for (let px = 0; px < w; px++) {
				const band = dx > 0 ? px < dx || py < dx : px >= w + dx || py >= h + dx;
				if (band) grid[py][px] = role;
			}
	}
	const both = rule(`${selector}::before, ${selector}::after`);
	expect(both.position).toBe("absolute");
	expect(both.content).toBe('""');
	const pw = length(both.width, b);
	const ph = length(both.height, b);
	for (const pseudo of ["::before", "::after"]) {
		const at = rule(`${selector}${pseudo}`);
		const x0 =
			at.left !== undefined ? length(at.left, b) : w - pw - length(at.right, b);
		const y0 =
			at.top !== undefined ? length(at.top, b) : h - ph - length(at.bottom, b);
		const role = roleOf(both["background-color"]);
		for (let py = y0; py < y0 + ph; py++)
			for (let px = x0; px < x0 + pw; px++) grid[py][px] = role;
	}
	return grid;
};

// A figure, a role a pixel (`?` for a color the frame does not use).
const readFigure = (file: string): string[][] => {
	const png = PNG.sync.read(readFileSync(path.join(FIGURES, file)));
	return Array.from({ length: png.height }, (_, y) =>
		Array.from({ length: png.width }, (_, x) => {
			const i = (y * png.width + x) * 4;
			const hex = [0, 1, 2]
				.map((c) => png.data[i + c].toString(16).padStart(2, "0"))
				.join("")
				.toUpperCase();
			return ROLE_OF_FIGURE[hex] ?? "?";
		}),
	);
};
// HIGOS8 p.61, Figure 3-4 (a caution alert), the window at the image's
// corner; the 1996 draft's p.13, Figure 9 (a stop alert), one pixel in.
const figure = readFigure("figure-3-4-movable-alert.png");
const draft = readFigure("draft-1996-figure-9-movable-alert.png");

/** The pixels of `grid` within `ring` of its edges, as rows of roles. */
const edges = (grid: string[][], ring: number) =>
	grid.map((row, y) =>
		row
			.map((role, x) =>
				x < ring ||
				y < ring ||
				x >= row.length - ring ||
				y >= grid.length - ring
					? role
					: ".",
			)
			.join(""),
	);

// The figure's boxes: the window is 374 x 131 (its drop shadow outside), a
// black border round it; the title bar fills rows 1-20 inside it, a black
// line (the contents' top border) row 21, the contents' padding box rows
// 22-129.
const sub = (
	x0: number,
	y0: number,
	w: number,
	h: number,
	from: string[][] = figure,
) => from.slice(y0, y0 + h).map((row) => row.slice(x0, x0 + w));

describe("Platinum's movable alert frame (HIGOS8 Figure 3-4)", () => {
	it("reads the figure as Figure 3-4: a black border, a title bar and two rings below it", () => {
		expect(figure).toHaveLength(132);
		expect(figure[0]).toHaveLength(375);
		// The border, the line under the title bar and the drop shadow.
		for (let x = 0; x <= 373; x++) {
			expect(figure[0][x]).toBe("K");
			expect(figure[21][x]).toBe("K");
			expect(figure[130][x]).toBe("K");
		}
		for (let y = 0; y <= 130; y++) {
			expect(figure[y][0]).toBe("K");
			expect(figure[y][373]).toBe("K");
		}
		for (let x = 2; x <= 374; x++) expect(figure[131][x]).toBe("K");
		for (let y = 2; y <= 131; y++) expect(figure[y][374]).toBe("K");
	});

	it("draws the title bar's bevel: white top and left, light red bottom and right, its face at the far corners", () => {
		expect(edges(paint(TITLE, 372, 20), 1)).toEqual(
			edges(sub(1, 1, 372, 20), 1),
		);
	});

	it("draws the contents' two rings: the red bevel outside, the white and gray one inside", () => {
		expect(rule(CONTENTS).position).toBe("relative");
		const painted = paint(CONTENTS, 372, 108);
		const expected = edges(sub(1, 22, 372, 108), 2);
		expect(edges(painted, 2)).toEqual(expected);
		// Spot checks of the figure itself: light red owns the outer ring's
		// top and left, both far corners included; the inner ring's far
		// corners are light red too.
		expect(expected[0]).toBe("L".repeat(372));
		expect(expected[107]).toBe(`L${"D".repeat(371)}`);
		expect(expected[1]).toBe(`L${"W".repeat(369)}LD`);
		expect(expected[106]).toBe(`LL${"G".repeat(369)}D`);
	});

	it("draws the 1996 draft's stop alert frame (Figure 9) the same, pixel for pixel", () => {
		// The draft's window is one pixel in, and two rows taller.
		expect(edges(sub(2, 2, 372, 20, draft), 1)).toEqual(
			edges(sub(1, 1, 372, 20), 1),
		);
		expect(draft[22].slice(1, 375).every((role) => role === "K")).toBe(true);
		expect(edges(paint(CONTENTS, 372, 109), 2)).toEqual(
			edges(sub(2, 23, 372, 109, draft), 2),
		);
	});

	it("follows the border size: each ring a border wide", () => {
		const b = 2;
		const grid = paint(CONTENTS, 40, 30, b);
		const at = (x: number, y: number) => grid[y][x];
		for (const [x, y, role] of [
			[0, 0, "L"],
			[1, 1, "L"],
			[39, 0, "L"],
			[0, 29, "L"],
			[39, 29, "D"],
			[38, 28, "D"],
			[20, 28, "D"],
			[2, 2, "W"],
			[3, 3, "W"],
			[37, 2, "L"],
			[36, 3, "L"],
			[2, 27, "L"],
			[36, 20, "G"],
			[20, 26, "G"],
			[35, 26, "G"],
			[20, 20, "F"],
		] as const)
			expect(at(x, y), `${x},${y}`).toBe(role);
		const bar = paint(TITLE, 40, 20, b);
		expect([bar[1][1], bar[18][38], bar[0][39], bar[19][0]]).toEqual([
			"W",
			"L",
			"F",
			"F",
		]);
	});

	it("mixes the figure's reds from the error token", () => {
		// The error red, #FF0000 in Platinum's themes, mixed with white as
		// `color-mix(in srgb, …)` does: the figure's green, and its red and
		// blue within its print palette's few levels.
		const mix = (pct: number) => [255, 255 * pct, 255 * pct].map(Math.round);
		expect(mix(0.67)).toEqual([255, 171, 171]);
		expect(mix(0.49)).toEqual([255, 125, 125]);
		const close = (a: number[], b: number[]) =>
			a.every((v, i) => Math.abs(v - b[i]) <= 5);
		expect(close(mix(0.67), [0xfd, 0xab, 0xa9])).toBe(true);
		expect(close(mix(0.49), [0xfc, 0x7d, 0x78])).toBe(true);
	});

	it("leaves every other window's frame alone: only the movable alert's own parts use the reds", () => {
		const owners = (color: string) =>
			[...flat.matchAll(/\n([^\n{]+) \{\n([^}]*)\}/g)]
				.filter((m) => m[2].includes(color))
				.map((m) => m[1]);
		expect(owners(LIGHT)).toEqual([
			TITLE,
			CONTENTS,
			`${CONTENTS}::before, ${CONTENTS}::after`,
		]);
		expect(owners(DARK)).toEqual([CONTENTS]);
	});
});
