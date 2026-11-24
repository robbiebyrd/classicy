import { readFileSync } from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";
import { compile, NodePackageImporter } from "sass";
import { describe, expect, it } from "vitest";
import platinum from "../platinum.json";

// Story 0236-2f8: Platinum's alert boxes draw the frame of HIGOS8 pp.61-64
// pixel for pixel. A movable alert box (Figures 3-4, 3-6, 3-7 and 3-8) has
// a beveled red title bar and two rings around its contents; a fixed one
// (Figure 3-5, and Mac OS 8.1's Finder alerts) has no title bar and the same
// two rings inside its black border. The PDF prints Figures 3-4, 3-5 and 3-7
// in a palette lifted from the screen's, and Figures 3-6 and 3-8 in the
// screen's own, which Mac OS 8.1 draws. The frame's layers are laid out here
// on the figures' boxes (kept in resources/screenshots/higos8/) and compared
// with the figures' pixels: by the role each color plays against every
// figure, and color for color against Figures 3-6 and 3-8.

const PLATINUM_SRC = path.resolve(import.meta.dirname, "..");
const CORE_SRC = path.resolve(import.meta.dirname, "../../../../../src");
const RESOURCES = path.resolve(
	import.meta.dirname,
	"../../resources/screenshots",
);
const FIGURES = path.join(RESOURCES, "higos8");

const css = compile(path.join(PLATINUM_SRC, "styles", "platinum.scss"), {
	loadPaths: [CORE_SRC, PLATINUM_SRC],
	importers: [new NodePackageImporter()],
}).css;
const flat = css.replace(/,\s*\n\s*/g, ", ").replace(/\n\s+/g, "\n");
const P = ".classicyDesktop[data-classicy-appearance=platinum]";
const ALERT = `${P} .classicyWindow.classicyAlertMovableWindow`;
const FIXED = `${P} .classicyWindow.classicyWindowRed`;
const TITLE = `${ALERT} > .classicyWindowTitleBar`;
const CONTENTS = `${ALERT} > .classicyWindowContentsModal`;
const FIXED_CONTENTS = `${FIXED} > .classicyWindowContentsModal`;
// The two alert boxes' contents share one rule.
const BOTH_CONTENTS = `${CONTENTS}, ${FIXED_CONTENTS}`;
const STRIPES = `${ALERT} .classicyWindowTitleBar .classicyWindowTitle`;

/**
 * The declarations of every rule whose selector list is `selector`, merged
 * in source order (a later rule's declaration wins, as in the cascade).
 */
const rule = (selector: string): Record<string, string> => {
	const props: Record<string, string> = {};
	const head = `\n${selector} {\n`;
	let at = flat.indexOf(head);
	if (at < 0) throw new Error(`no rule for ${selector}`);
	for (; at >= 0; at = flat.indexOf(head, at + 1)) {
		const body = flat.slice(at + head.length, flat.indexOf("}", at));
		for (const line of body.split(";\n")) {
			const colon = line.indexOf(":");
			if (colon > 0)
				props[line.slice(0, colon).trim()] = line
					.slice(colon + 1)
					.trim()
					.replace(/;$/, "");
		}
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

// The colors the frame uses, and the roles they play in the figures.
const LIGHT = "color-mix(in srgb, var(--color-error), white 60%)";
const DARK = "color-mix(in srgb, var(--color-error), white 40%)";
const SHADOW = "color-mix(in srgb, var(--color-system-04), black 10%)";
const TITLE_FACE = "color-mix(in srgb, var(--color-error), white 80%)";
const ROLE_OF_COLOR: Record<string, string> = {
	[LIGHT]: "L",
	[DARK]: "D",
	[SHADOW]: "G",
	[TITLE_FACE]: "F",
	"var(--color-white)": "W",
};

// Platinum's own values for the tokens the frame reads (its defaults; the
// 21 presets share them).
const hex = (value: number) => value.toString(16).padStart(6, "0");
const TOKENS: Record<string, string> = {
	"--color-error": hex(platinum.defaults.color.error),
	"--color-white": hex(platinum.defaults.color.white),
	"--color-system-04": hex(platinum.defaults.color.system[3]),
};
const MIX_TOWARD: Record<string, string> = { white: "ffffff", black: "000000" };

/**
 * A frame color as the browser paints it: a token, or a token mixed toward
 * white or black (`color-mix(in srgb, …)`, rounded to 8 bits), as RRGGBB.
 */
const resolve = (color: string): string => {
	const token = /^var\((--[\w-]+)\)$/.exec(color);
	if (token) return TOKENS[token[1]].toUpperCase();
	const mix =
		/^color-mix\(in srgb, var\((--[\w-]+)\), (white|black) (\d+)%\)$/.exec(
			color,
		);
	if (!mix) throw new Error(`unknown color ${color}`);
	const [a, b] = [TOKENS[mix[1]], MIX_TOWARD[mix[2]]];
	const p = Number(mix[3]) / 100;
	return [0, 2, 4]
		.map((i) => {
			const [ca, cb] = [a, b].map((c) =>
				Number.parseInt(c.slice(i, i + 2), 16),
			);
			return Math.round(ca * (1 - p) + cb * p)
				.toString(16)
				.padStart(2, "0");
		})
		.join("")
		.toUpperCase();
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
 * The box `w` x `h` as it paints itself: its face (`face`), its inset box
 * shadows (the last painted first; `inset X Y 0 0 color`, X and Y equal: a
 * band of |X| along the top and left, or the bottom and right), then its
 * `::before` and `::after` (absolutely placed squares), a color a pixel.
 * `selector` is the rule's selector list, whose pseudo-elements' shared
 * rule lists each part's `::before` and `::after` in turn, as Sass writes
 * them.
 */
const paintColors = (
	selector: string,
	w: number,
	h: number,
	b = 1,
	face = "face",
): string[][] => {
	const grid = Array.from({ length: h }, () => Array<string>(w).fill(face));
	const shadows = layers(rule(selector)["box-shadow"]);
	for (let i = shadows.length - 1; i >= 0; i--) {
		const [inset, x, y, blur, spread, color] = words(shadows[i]);
		expect([inset, blur, spread]).toEqual(["inset", "0", "0"]);
		const dx = length(x, b);
		expect(length(y, b)).toBe(dx);
		for (let py = 0; py < h; py++)
			for (let px = 0; px < w; px++) {
				const band = dx > 0 ? px < dx || py < dx : px >= w + dx || py >= h + dx;
				if (band) grid[py][px] = color;
			}
	}
	const parts = selector.split(", ");
	const both = rule(
		parts.flatMap((s) => [`${s}::before`, `${s}::after`]).join(", "),
	);
	expect(both.position).toBe("absolute");
	expect(both.content).toBe('""');
	const pw = length(both.width, b);
	const ph = length(both.height, b);
	for (const pseudo of ["::before", "::after"]) {
		const at = rule(parts.map((s) => `${s}${pseudo}`).join(", "));
		const x0 =
			at.left !== undefined ? length(at.left, b) : w - pw - length(at.right, b);
		const y0 =
			at.top !== undefined ? length(at.top, b) : h - ph - length(at.bottom, b);
		for (let py = y0; py < y0 + ph; py++)
			for (let px = x0; px < x0 + pw; px++)
				grid[py][px] = both["background-color"];
	}
	return grid;
};

/** The same, a role a pixel (`F` for the face). */
const paint = (selector: string, w: number, h: number, b = 1) =>
	paintColors(selector, w, h, b).map((row) =>
		row.map((color) => {
			if (color === "face") return "F";
			const role = ROLE_OF_COLOR[color];
			if (!role) throw new Error(`unknown color ${color}`);
			return role;
		}),
	);

/** The same, an RRGGBB a pixel (the face left as `face`). */
const paintHex = (selector: string, w: number, h: number) =>
	paintColors(selector, w, h).map((row) =>
		row.map((color) => (color === "face" ? color : resolve(color))),
	);

// Each palette's colors, as roles: the 1997 PDF's lifted palette (Figures
// 3-4, 3-5, 3-7), its 1996 draft's, the screen's (Figures 3-6, 3-8), and
// the screen's as Infinite Mac shows it (the README's display map).
const ROLE_OF_FIGURE: Record<string, string> = {
	"000000": "K",
	FFFFFF: "W",
	A9A9A9: "G",
	FDABA9: "L",
	FC7D78: "D",
	FFACAA: "L",
	FF7F7A: "D",
	"999999": "G",
	FF9999: "L",
	FF6666: "D",
	B3B3B3: "G",
	FFB3B3: "L",
	FF8787: "D",
	// The title bar's face, and the window's: the box's own background color.
	FED6D5: "F",
	E3E4E4: "F",
	FFD7D6: "F",
	E4E4E4: "F",
	FFCCCC: "F",
	DDDDDD: "F",
	E7E7E7: "F",
};

/** An image, an RRGGBB a pixel. */
const readHex = (file: string): string[][] => {
	const png = PNG.sync.read(readFileSync(file));
	return Array.from({ length: png.height }, (_, y) =>
		Array.from({ length: png.width }, (_, x) => {
			const i = (y * png.width + x) * 4;
			return [0, 1, 2]
				.map((c) => png.data[i + c].toString(16).padStart(2, "0"))
				.join("")
				.toUpperCase();
		}),
	);
};

/** An image, a role a pixel (`?` for a color the frame does not use). */
const roles = (image: string[][]) =>
	image.map((row) => row.map((color) => ROLE_OF_FIGURE[color] ?? "?"));

// HIGOS8 p.61, Figure 3-4 (a caution alert), p.62, Figure 3-6 (a note
// alert) and p.64, Figure 3-8 (a stop alert), each window at the image's
// corner; p.62, Figure 3-5 (a fixed alert), likewise; the 1996 draft's
// p.13, Figure 9 (a stop alert), one pixel in.
const figure34 = readHex(path.join(FIGURES, "figure-3-4-movable-alert.png"));
const figure35 = readHex(path.join(FIGURES, "figure-3-5-alert.png"));
const figure36 = readHex(path.join(FIGURES, "figure-3-6-note-alert.png"));
const figure38 = readHex(path.join(FIGURES, "figure-3-8-stop-alert.png"));
const draft = readHex(
	path.join(FIGURES, "draft-1996-figure-9-movable-alert.png"),
);
const figure = roles(figure34);
// Mac OS 8.1's Finder, putting away the startup disk (Infinite Mac): a fixed
// stop alert, its window's border box x 133-506, y 87-190.
const finder81 = readHex(
	path.join(
		RESOURCES,
		"mac-os-8.1",
		"platinum-81-finder-startup-disk-alert.png",
	),
);

/** The pixels of `grid` within `ring` of its edges, as rows (`.` inside). */
const edges = (grid: string[][], ring: number, join = "") =>
	grid.map((row, y) =>
		row
			.map((cell, x) =>
				x < ring ||
				y < ring ||
				x >= row.length - ring ||
				y >= grid.length - ring
					? cell
					: ".",
			)
			.join(join),
	);

// The figures' boxes: the window is 374 wide (its drop shadow outside), a
// black border around it; the title bar fills rows 1-20 inside it, a black
// line (the contents' top border) row 21, the contents' padding box rows
// 22 to the row above the bottom border.
const sub = (from: string[][], x0: number, y0: number, w: number, h: number) =>
	from.slice(y0, y0 + h).map((row) => row.slice(x0, x0 + w));

describe("Platinum's movable alert frame (HIGOS8 Figures 3-4, 3-6 and 3-8)", () => {
	it("reads Figure 3-4 as a black border, a title bar and two rings below it", () => {
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

	it("reads Figures 3-6 and 3-8 as Figure 3-4 in the screen's palette", () => {
		// Figure 3-6 is Figure 3-4's frame, role for role: its window is the
		// same size. Figure 3-8's is six rows taller.
		expect(edges(roles(figure36), 2)).toEqual(edges(figure, 2));
		expect(edges(sub(roles(figure38), 0, 0, 375, 22), 2)).toEqual(
			edges(sub(figure, 0, 0, 375, 22), 2),
		);
	});

	it("draws the title bar's bevel: white top and left, light red bottom and right, its face at the far corners", () => {
		expect(edges(paint(TITLE, 372, 20), 1)).toEqual(
			edges(sub(figure, 1, 1, 372, 20), 1),
		);
	});

	it("draws the contents' two rings: the red bevel outside, the white and gray one inside", () => {
		expect(rule(BOTH_CONTENTS).position).toBe("relative");
		const painted = paint(BOTH_CONTENTS, 372, 108);
		const expected = edges(sub(figure, 1, 22, 372, 108), 2);
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
		expect(edges(sub(roles(draft), 2, 2, 372, 20), 1)).toEqual(
			edges(sub(figure, 1, 1, 372, 20), 1),
		);
		expect(
			roles(draft)[22]
				.slice(1, 375)
				.every((role) => role === "K"),
		).toBe(true);
		expect(edges(paint(BOTH_CONTENTS, 372, 109), 2)).toEqual(
			edges(sub(roles(draft), 2, 23, 372, 109), 2),
		);
	});

	it("draws Figures 3-6 and 3-8's colors exactly: #FF9999, #FF6666, #999999, white and the #FFCCCC face", () => {
		for (const [name, image, height] of [
			["3-6", figure36, 131],
			["3-8", figure38, 137],
		] as const) {
			// The title bar's edge ring, its far corners included.
			expect(edges(paintHex(TITLE, 372, 20), 1, " "), name).toEqual(
				edges(sub(image, 1, 1, 372, 20), 1, " "),
			);
			// The contents' two rings.
			const contents = height - 23;
			expect(
				edges(paintHex(BOTH_CONTENTS, 372, contents), 2, " "),
				name,
			).toEqual(edges(sub(image, 1, 22, 372, contents), 2, " "));
		}
		expect([LIGHT, DARK, SHADOW, TITLE_FACE].map(resolve)).toEqual([
			"FF9999",
			"FF6666",
			"999999",
			"FFCCCC",
		]);
		// The title bar's face is the figures' (inside its bevel).
		expect(
			resolve(rule(`${ALERT} .classicyWindowTitleBar`)["background-color"]),
		).toBe(figure36[17][100]);
	});

	it("draws the title bar's stripes as Figures 3-6 and 3-8 do: white rows over dark red rows, white first", () => {
		// The art: six white rows, on the even rows of its 12, the odd rows
		// left clear for the band's own ground. Each row overhangs the
		// 12.01-wide box by 0.24 on either side, as the gray art's do, so a
		// tile's edge columns are fully covered: rows ending at the box drew
		// #FFFEFE at Firefox's tile seams over the ground.
		const svg = readFileSync(
			path.join(PLATINUM_SRC, "assets", "art", "title-bar-center-red.svg"),
			"utf8",
		);
		expect(svg).toContain('viewBox="0 0 12.01 12"');
		const rows = [
			...svg.matchAll(/<path\b[^>]*\bd="M-\.24,(\d+)h12\.49v1H-\.24v-1Z"/g),
		].map(([, y]) => Number(y));
		expect(rows).toEqual([0, 2, 4, 6, 8, 10]);
		expect(svg).toMatch(/\.cls-1 \{\s*fill: #fff;/);
		expect(svg).not.toMatch(/cls-2/);
		// The bands draw it over the dark red, from the theme.
		for (const selector of [
			`${STRIPES} .classicyWindowTitleCenter`,
			`${STRIPES} .classicyWindowTitleLeft, ${STRIPES} .classicyWindowTitleRight`,
		]) {
			const props = rule(selector);
			expect(props.background, selector).toBe(
				"var(--classicy-art-window-stripes-red)",
			);
			expect(props["background-color"], selector).toBe(DARK);
		}
		// The art fills each band's height (`auto 100%`, or contain for the
		// side bands' `auto`), and every band is as tall as the art's twelve
		// rows at a 12 px control size: the side bands by the base sheet's
		// `--window-control-size`, the title-less band (Figures 3-6 and 3-8
		// have no title) by the alert's own rule, so no band stretches the
		// rows over the base's fifteen-pixel `--window-title-stripe-height`.
		expect(rule(`${STRIPES} .classicyWindowTitleCenter`)).toMatchObject({
			"background-size": "auto 100%",
			height: "var(--window-control-size)",
		});
		const base = compile(
			path.join(
				CORE_SRC,
				"SystemFolder/SystemResources/Window/ClassicyWindow.scss",
			),
			{ loadPaths: [CORE_SRC] },
		)
			.css.replace(/,\s*\n\s*/g, ", ")
			.replace(/\n\s+/g, "\n");
		expect(base).toMatch(
			/\.classicyWindowTitleLeft, [^{]*\.classicyWindowTitleRight \{\n[^}]*height: var\(--window-control-size\);/,
		);
		// The figures' stripes: six white rows (window rows 4, 6, … 14) and
		// six dark red rows (5, 7, … 15), white first, in exactly the two
		// colors the art and its ground draw.
		for (const [name, image] of [
			["3-6", figure36],
			["3-8", figure38],
		] as const) {
			for (let y = 4; y <= 15; y++) {
				const run = image[y].slice(10, 360);
				expect(new Set(run), `${name} row ${y}`).toEqual(
					new Set([
						y % 2 === 0 ? resolve("var(--color-white)") : resolve(DARK),
					]),
				);
			}
		}
	});

	it("follows the border size: each ring a border wide", () => {
		const b = 2;
		const grid = paint(BOTH_CONTENTS, 40, 30, b);
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

	it("leaves every other window's frame alone: only the alert boxes' own parts use the reds", () => {
		const owners = (color: string) =>
			[...flat.matchAll(/\n([^\n{]+) \{\n([^}]*)\}/g)]
				.filter((m) => m[2].includes(color))
				.map((m) => m[1]);
		expect(owners(LIGHT)).toEqual([
			TITLE,
			BOTH_CONTENTS,
			`${CONTENTS}::before, ${CONTENTS}::after, ${FIXED_CONTENTS}::before, ${FIXED_CONTENTS}::after`,
		]);
		expect(owners(DARK)).toEqual([
			`${STRIPES} .classicyWindowTitleCenter`,
			`${STRIPES} .classicyWindowTitleLeft, ${STRIPES} .classicyWindowTitleRight`,
			BOTH_CONTENTS,
		]);
		expect(owners(SHADOW)).toEqual([BOTH_CONTENTS]);
	});
});

describe("Platinum's fixed alert frame (HIGOS8 Figure 3-5, Mac OS 8.1)", () => {
	it("reads Figure 3-5 and Mac OS 8.1's fixed alert alike: no title bar, the black border, then the two rings", () => {
		const fig = roles(figure35);
		const mac = roles(sub(finder81, 133, 87, 376, 106));
		for (const [name, image, height] of [
			["3-5", fig, 110],
			["8.1", mac, 104],
		] as const) {
			// The border, the rings right inside it, and the drop shadow two
			// pixels in.
			expect(image[0].slice(0, 374).join(""), name).toBe("K".repeat(374));
			expect(image[height - 1].slice(0, 374).join(""), name).toBe(
				"K".repeat(374),
			);
			expect(image[1].slice(1, 373).join(""), name).toBe("L".repeat(372));
			expect(image[height][2], name).toBe("K");
			expect(image[1][374], name).not.toBe("K");
			expect(image[2][374], name).toBe("K");
		}
	});

	it("draws no title bar, a black border and the movable box's rings", () => {
		// The fixed-modal rule drops every fixed modal's title bar, the
		// alert's included, and lets the contents fill the window.
		const fixedModal = `${P} .classicyWindow.classicyWindowModalFixed`;
		expect(rule(`${fixedModal} > .classicyWindowTitleBar`)).toEqual({
			display: "none",
		});
		expect(
			rule(`${fixedModal} > .classicyWindowContentsModal`)["border-top"],
		).toBe("none");
		expect(flat).not.toMatch(/classicyWindowModalFixed:not\(/);
		// The window's border stays the window's (black): no rule turns it
		// red, and the red bar's stripes are gone with the bar.
		expect(flat).not.toMatch(
			/\n[^\n{]*classicyWindowRed[^\n{]* \{\n[^}]*border-color: var\(--color-error\)/,
		);
		expect(flat).not.toMatch(/classicyWindowRed[^{,]*classicyWindowTitle/);
		// The rings, by role, on Figure 3-5's and Mac OS 8.1's contents.
		expect(edges(paint(BOTH_CONTENTS, 372, 108), 2)).toEqual(
			edges(sub(roles(figure35), 1, 1, 372, 108), 2),
		);
		expect(edges(paint(BOTH_CONTENTS, 372, 102), 2)).toEqual(
			edges(sub(roles(finder81), 134, 88, 372, 102), 2),
		);
	});
});
