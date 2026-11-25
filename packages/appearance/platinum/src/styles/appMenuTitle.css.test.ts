import { readFileSync } from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";
import { compile, NodePackageImporter } from "sass";
import { describe, expect, it } from "vitest";
import platinum from "../platinum.json";

// Mac OS 8.5's Application menu title under Platinum (integration review G
// round 6, W14/W15/W16 and B3/B4; observed on Infinite Mac, the captures in
// resources/screenshots/mac-os-8.5/): the grip, then the front
// application's icon and name in a title as wide as that name, or its icon
// alone. The grip's art is laid out here from the compiled sheet and
// compared with 8.5's pixels, at rest and pressed; the title's geometry is
// the knobs', compared with where 8.5 draws each part.

const PLATINUM_SRC = path.resolve(import.meta.dirname, "..");
const CORE_SRC = path.resolve(import.meta.dirname, "../../../../../src");
const CAPTURES = path.resolve(
	import.meta.dirname,
	"../../resources/screenshots/mac-os-8.5",
);

const css = compile(path.join(PLATINUM_SRC, "styles", "platinum.scss"), {
	loadPaths: [CORE_SRC, PLATINUM_SRC],
	importers: [new NodePackageImporter()],
}).css;
const flat = css.replace(/,\s*\n\s*/g, ", ").replace(/\n\s+/g, "\n");
const P = ".classicyDesktop[data-classicy-appearance=platinum]";
const BAR = `${P} .classicyDesktopMenuBar .classicyDesktopMenu`;
const GRIP = `${P} .classicyDesktopMenuAppSwitcherGrip`;

/** The declarations of the rule whose selector list is `selector`. */
const rule = (selector: string): Record<string, string> => {
	const head = `\n${selector} {\n`;
	const at = flat.indexOf(head);
	if (at < 0) throw new Error(`no rule for ${selector}`);
	const body = flat.slice(at + head.length, flat.indexOf("\n}", at));
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

/** `text` split on `separator` outside parentheses. */
const splitTop = (text: string, separator: string): string[] => {
	const parts: string[] = [];
	let depth = 0;
	let start = 0;
	for (let i = 0; i < text.length; i++) {
		const c = text[i];
		if (c === "(") depth++;
		else if (c === ")") depth--;
		else if (c === separator && depth === 0) {
			parts.push(text.slice(start, i).trim());
			start = i + 1;
		}
	}
	parts.push(text.slice(start).trim());
	return parts.filter((part) => part !== "");
};

const hex = (n: number) => `#${n.toString(16).padStart(6, "0").toUpperCase()}`;
const ramp = platinum.defaults.color.families.grayRamp as Record<
	string,
	number
>;
/** An ink, as Platinum's defaults resolve it. */
const ink = (value: string): string => {
	const name = /var\((--[a-z0-9-]+)/.exec(value)?.[1];
	if (name === "--color-white") return hex(platinum.defaults.color.white);
	if (name === "--color-system-02")
		return hex(platinum.defaults.color.system[1]);
	const step = /^--package-color-gray-ramp-step-?([0-9a-z])$/.exec(name ?? "");
	if (step) return hex(ramp[`step${step[1].toUpperCase()}`]);
	throw new Error(`unknown ink ${value}`);
};

/** A length on the grid (one grid pixel, `menu.markPixel`, is 1). */
const length = (value: string, whole: number): number => {
	const expr = value
		.replace(/var\(--menu-mark-pixel\)/g, "1")
		.replace(/100%/g, String(whole))
		.replace(/calc/g, "");
	if (!/^[\d\s+\-*/().]+$/.test(expr)) throw new Error(`length ${value}`);
	return Function(`return (${expr});`)() as number;
};

/**
 * The background's layers painted over `backdrop` (rows of colors) in a box
 * as big as it, top layer first as CSS paints them.
 */
const paint = (background: string, backdrop: string[][]): string[][] => {
	const height = backdrop.length;
	const width = backdrop[0].length;
	const grid = backdrop.map((row) => [...row]);
	for (const layer of splitTop(background, ",").reverse()) {
		const open = "linear-gradient(".length;
		let close = open;
		for (let depth = 1; depth > 0; close++)
			depth += layer[close] === "(" ? 1 : layer[close] === ")" ? -1 : 0;
		const rest = /^ (.*) no-repeat$/.exec(layer.slice(close));
		if (!layer.startsWith("linear-gradient(") || !rest)
			throw new Error(`layer ${layer}`);
		const color = ink(splitTop(layer.slice(open, close - 1), ",")[0]);
		const [position, size] = splitTop(rest[1], "/");
		const [x, y] = splitTop(position, " ");
		const [w, h] = splitTop(size, " ");
		const [x0, y0] = [length(x, width), length(y, height)];
		const [x1, y1] = [x0 + length(w, width), y0 + length(h, height)];
		for (let row = y0; row < y1; row++)
			for (let col = x0; col < x1; col++) grid[row][col] = color;
	}
	return grid;
};

const capture = (name: string) => {
	const png = PNG.sync.read(readFileSync(path.join(CAPTURES, name)));
	return (x: number, y: number) => {
		const i = (y * png.width + x) * 4;
		return hex((png.data[i] << 16) | (png.data[i + 1] << 8) | png.data[i + 2]);
	};
};
const columns = (
	at: (x: number, y: number) => string,
	x0: number,
	width: number,
	rows: number,
) =>
	Array.from({ length: rows }, (_, y) =>
		Array.from({ length: width }, (_, x) => at(x0 + x, y)),
	);

// The 8.5 bar's rows over the grip's height, the grip's box: its first row
// white, the rest the face; its #999999 row and its black line below.
const BAR_ROWS = 18;
const barBackdrop = () =>
	Array.from({ length: BAR_ROWS }, (_, y) =>
		Array.from({ length: 6 }, () => (y === 0 ? "#FFFFFF" : "#DDDDDD")),
	);

const finder = capture("platinum-85-appmenu-title-finder.png");
const pressed = capture("platinum-85-appmenu-grip-pressed.png");
const iconOnly = capture("platinum-85-appmenu-title-icon-only.png");
const blinkName = capture("platinum-85-appmenu-blink-name.png");
const blinkRequest = capture("platinum-85-appmenu-blink-request.png");
const knobs = platinum.defaults.measurements.menuBar;

describe("Platinum's Application menu title grip (Mac OS 8.5)", () => {
	it("is six grid pixels wide", () =>
		expect(rule(GRIP).width).toBe("calc(var(--menu-mark-pixel) * 6)"));

	it("draws 8.5's grip at rest, pixel for pixel (the Finder's, x 549-554)", () => {
		expect(paint(rule(GRIP).background, barBackdrop())).toEqual(
			columns(finder, 549, 6, BAR_ROWS),
		);
	});

	it("draws 8.5's pressed grip, pixel for pixel where the pointer leaves it", () => {
		const drawn = paint(rule(`${GRIP}.pressed`).background, barBackdrop());
		const held = columns(pressed, 549, 6, BAR_ROWS);
		// The pointer covers the lower left of the capture's grip from row 13.
		expect(drawn.slice(0, 13)).toEqual(held.slice(0, 13));
		expect(drawn.map((row) => row[5])).toEqual(held.map((row) => row[5]));
	});
});

describe("Platinum's Application menu title geometry (Mac OS 8.5)", () => {
	it("pads the title, sizes its icon and spaces its name by the menuBar knobs", () => {
		const bar = ".classicyDesktopMenuBar .classicyDesktopMenu";
		const title = rule(
			`${P} :is(${bar} > .classicyMenuItem, ${bar} > .classicyMenuItemBalloonAnchor > .classicyMenuItem).classicyDesktopMenuAppSwitcher`,
		);
		expect(title.padding).toBe(
			"0 var(--menu-bar-switcher-title-end) 0 var(--menu-bar-switcher-title-start)",
		);
		// The icon at `titleArtSize`, `switcherTitleGap` before the name; the
		// icon alone has no gap after it, so its box is 6 + 16 + 7 = 29
		// (integration review G round 6, finding 5).
		const switcher = `${P} :is(${bar} > .classicyMenuItem, ${bar} > .classicyMenuItemBalloonAnchor > .classicyMenuItem).classicyDesktopMenuAppSwitcher`;
		expect(rule(`${switcher} > p > img`)).toEqual({
			width: "var(--menu-bar-title-art-size)",
			height: "var(--menu-bar-title-art-size)",
			margin: "0 var(--menu-bar-switcher-title-gap) 0 0",
		});
		expect(rule(`${switcher}.collapsed > p > img`)).toEqual({
			"margin-right": "0",
		});
		expect(rule(BAR)["padding-right"]).toBe("var(--menu-bar-end-inset)");
		// Its menu's right side under the title's: the wrapper is the title's
		// content box, so the list reaches out by the title's end padding.
		expect(
			rule(
				`${P} :is(${bar} > .classicyMenuItem, ${bar} > .classicyMenuItemBalloonAnchor > .classicyMenuItem).classicyDesktopMenuAppSwitcher > .classicyMenuWrapper > .classicySubMenu`,
			).right,
		).toBe("calc(var(--menu-bar-switcher-title-end) * -1)");
		expect(rule(`${BAR} > .classicyMenuItem.classicyDesktopMenuTime`)).toEqual({
			"margin-right": "0",
			"padding-right": "var(--menu-bar-clock-end)",
		});
		// The clock's readout is the bar's one Tab stop: the grip's keyboard
		// ring, inside the bar (integration review G round 6, the clock as a
		// Tab stop). The readout's box is its text, so the ring is drawn
		// beside it, two pixels out on each side, within the item's paddings
		// (7.5 and 6), never over the ink (round 5, finding 2).
		const clock = `${BAR} > .classicyMenuItem.classicyDesktopMenuTime > button:focus-visible`;
		expect(rule(clock)).toEqual({ position: "relative", outline: "none" });
		expect(rule(`${clock}::after`)).toEqual({
			content: '""',
			position: "absolute",
			inset:
				"0 calc((var(--control-frame-width) + var(--control-frame-width)) * -1)",
			border: "var(--control-frame-width) solid var(--color-outline)",
			"pointer-events": "none",
		});
	});

	it("puts each part where 8.5 draws it with the Finder in front", () => {
		const D = 549; // the grip's left column
		const face = (x: number) => finder(x, 8) === "#DDDDDD";
		const inkColumns = (from: number, to: number) => {
			const xs: number[] = [];
			for (let x = from; x <= to; x++)
				for (let y = 1; y <= 17; y++)
					if (finder(x, y) !== "#DDDDDD") {
						xs.push(x);
						break;
					}
			return xs;
		};
		// The icon, 16 px, `switcherTitleStart` into the box after the grip.
		const icon = inkColumns(D + 6, D + 6 + knobs.switcherTitleStart + 16);
		expect(icon[0]).toBe(D + 6 + knobs.switcherTitleStart);
		expect(icon.at(-1)).toBe(D + 6 + knobs.switcherTitleStart + 15);
		expect(knobs.titleArtSize).toBe(16);
		// The name's ink `switcherTitleGap` after it (Charcoal's F has no left
		// bearing), and its last ink, plus the glyph's one-pixel advance and
		// `switcherTitleEnd`, ends the box `endInset` from the screen's edge.
		const name = inkColumns(D + 28, 625);
		expect(name[0]).toBe(
			D + 6 + knobs.switcherTitleStart + 16 + knobs.switcherTitleGap,
		);
		expect(name.at(-1)).toBe(640 - knobs.endInset - knobs.switcherTitleEnd - 2);
		expect(face(640 - knobs.endInset)).toBe(true);
		// The clock's last ink is seven pixels clear of the grip: its box ends
		// `clockEnd` before it, the last glyph's advance the seventh.
		const clock = inkColumns(400, D - 1);
		expect(D - 1 - (clock.at(-1) as number)).toBe(knobs.clockEnd + 1);
	});

	it("puts the icon alone in a 29-pixel box, 6 + 16 + 7, `endInset` from the screen's edge", () => {
		// The grip at x 594-599 (its first dot's ink at 596), the box 600-628
		// (open, its highlight runs 600-628: audit-85b `c4-icononly-open.png`).
		expect(iconOnly(596, 4)).toBe("#888888");
		const icon: number[] = [];
		for (let x = 600; x < 640; x++)
			for (let y = 1; y <= 17; y++)
				if (iconOnly(x, y) !== "#DDDDDD") {
					icon.push(x);
					break;
				}
		expect(icon[0]).toBe(600 + knobs.switcherTitleStart);
		expect(icon.filter((x) => x < 630).at(-1)).toBe(
			640 - knobs.endInset - knobs.switcherTitleEnd - 1,
		);
		expect(knobs.switcherTitleStart + 16 + knobs.switcherTitleEnd).toBe(29);
		// The clock follows the title: its last ink seven pixels of face
		// before the grip's white rule here too (ink to x 586, rule at 594;
		// 8.5 difference D24, which the same `clockEnd` gives).
		expect(iconOnly(594, 8)).toBe("#FFFFFF");
		let clock = -1;
		for (let x = 400; x < 594; x++)
			for (let y = 2; y <= 16; y++)
				if (iconOnly(x, y) !== "#DDDDDD") {
					clock = x;
					break;
				}
		expect(594 - 1 - clock).toBe(knobs.clockEnd + 1);
	});
});

// A Notification Manager request blinking over the Application menu's title
// (the 8.5 audit's F1; Script Editor's request from behind the Finder): the
// frames alternate between the Finder's icon and name and the request's
// 1-bit icon alone, centered in the title, whose width does not change.
describe("Platinum's Application menu title while a request blinks (Mac OS 8.5)", () => {
	const inkRuns = (
		at: (x: number, y: number) => string,
		from: number,
		to: number,
	) => {
		const runs: [number, number][] = [];
		for (let x = from; x <= to; x++) {
			let ink = false;
			for (let y = 1; y <= 17; y++) if (at(x, y) !== "#DDDDDD") ink = true;
			if (!ink) continue;
			const last = runs.at(-1);
			if (last && last[1] === x - 1) last[1] = x;
			else runs.push([x, x]);
		}
		return runs;
	};

	it("draws the request's icon alone where the base sheet centers it, the grip and clock unmoved", () => {
		// The Finder's frame: icon 561-576, name ink 582-620 (the title 555-628).
		const name = inkRuns(blinkName, 555, 628);
		expect(name[0]).toEqual([561, 576]);
		expect(name.at(-1)?.[1]).toBe(620);
		// The request's frame: the only ink in the title is the icon, 584-599.
		expect(inkRuns(blinkRequest, 555, 628)).toEqual([[584, 599]]);
		// The base sheet's rule: the icon at the middle of the title's
		// contents, rounded up, less half the icon (round(up, 50%) and
		// translateX(-50%)): contents from 555 + switcherTitleStart to the
		// name's advance, 621, before switcherTitleEnd.
		const box = [555, 628];
		const contentStart = box[0] + knobs.switcherTitleStart;
		const contentWidth = box[1] + 1 - knobs.switcherTitleEnd - contentStart;
		expect(contentWidth).toBe(61);
		expect(contentStart + Math.ceil(contentWidth / 2) - 16 / 2).toBe(584);
		// 8.5's Menu Manager: the title's left plus half its width less the
		// icon's, rounded down; the same pixel.
		expect(box[0] + Math.floor((box[1] + 1 - box[0] - 16) / 2)).toBe(584);
		// Outside the title the two frames are the same: the grip, the clock.
		for (let x = 0; x < 640; x++) {
			if (x >= 561 && x <= 620) continue;
			for (let y = 0; y < 20; y++)
				expect(blinkRequest(x, y), `${x},${y}`).toBe(blinkName(x, y));
		}
	});
});
