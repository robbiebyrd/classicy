import { readFileSync } from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";
import { compile, NodePackageImporter } from "sass";
import { describe, expect, it } from "vitest";
import platinum from "../platinum.json";

// Platinum's determinate progress bar is Mac OS 8.5's Appearance progress
// bar, as 8.5's startup screen draws it (the 8.5 audit's F12; Infinite
// Mac's Power Macintosh 9500). The compiled sheet's layers are laid out here
// at the startup bar's 160 x 12 and compared with 8.5's pixels: a bar
// filled 53 of its 158 pixels (`platinum-85-startup-progress.png`) and a
// full one (`platinum-85-startup-parade.png`), the frame at x 240-399, y
// 338-349 of each, its well around it.

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
const BAR = `${P} .classicyProgressDeterminate`;

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
const colors = platinum.defaults.color;
const ramp = colors.families.grayRamp as Record<string, number>;
const knobs = platinum.defaults.measurements.progressBar;

/** An ink, as Platinum's defaults resolve it; undefined for transparent. */
const ink = (value: string): string | undefined => {
	if (value === "transparent") return undefined;
	const name = /var\((--[a-z0-9-]+)/.exec(value)?.[1] ?? "";
	const theme = /^--color-theme-0(\d)$/.exec(name);
	if (theme) return hex(colors.theme[Number(theme[1]) - 1]);
	const system = /^--color-system-0(\d)$/.exec(name);
	if (system) return hex(colors.system[Number(system[1]) - 1]);
	if (name === "--color-black") return hex(colors.black);
	if (name === "--color-white") return hex(colors.white);
	const step = /^--package-color-gray-ramp-step-?([0-9a-z])$/.exec(name);
	if (step) return hex(ramp[`step${step[1].toUpperCase()}`]);
	throw new Error(`unknown ink ${value}`);
};

/** A length in px, `100%` being `full`. */
const length = (value: string, full: number): number => {
	const expression = value
		.replaceAll("var(--progress-bar-pixel)", `${knobs.pixel}`)
		.replaceAll(
			"var(--window-border-size)",
			`${platinum.defaults.measurements.window.borderSize}`,
		)
		.replaceAll("100%", `${full}`)
		.replaceAll("calc", "")
		.replaceAll("px", "");
	if (!/^[\d\s.+\-*/()]+$/.test(expression))
		throw new Error(`cannot read ${value}`);
	return Function(`return (${expression});`)() as number;
};

type Grid = (string | undefined)[][];
const grid = (w: number, h: number, fill?: string): Grid =>
	Array.from({ length: h }, () => Array.from({ length: w }, () => fill));

/** Paints a `background` value's layers (the last one first) into `into`
 * at (`ox`, `oy`), its box `w` x `h`. */
const paintBackground = (
	value: string,
	into: Grid,
	ox: number,
	oy: number,
	w: number,
	h: number,
) => {
	const layers = splitTop(value, ",").reverse();
	for (const layer of layers) {
		if (!layer.startsWith("linear-gradient(")) {
			const color = ink(layer);
			for (let y = 0; y < h; y++)
				for (let x = 0; x < w; x++) into[oy + y][ox + x] = color;
			continue;
		}
		let depth = 0;
		let end = 0;
		for (let i = 0; i < layer.length; i++) {
			if (layer[i] === "(") depth++;
			else if (layer[i] === ")" && --depth === 0) {
				end = i + 1;
				break;
			}
		}
		const gradient = splitTop(
			layer.slice("linear-gradient(".length, end - 1),
			",",
		);
		// A layer with no position or size fills the box.
		const [position, size] = layer.slice(end).trim()
			? splitTop(layer.slice(end), "/")
			: ["0 0", "100% 100%"];
		const [px, py] = splitTop(position, " ");
		const [sw, sh] = splitTop(size.replace("no-repeat", ""), " ");
		const lw = length(sw, w);
		const lh = length(sh, h);
		const at = (v: string, room: number) => (v === "top" ? 0 : length(v, room));
		const lx = at(px, w - lw);
		const ly = at(py, h - lh);
		// Each row's color: a solid gradient, or `to bottom` with hard stops.
		const stops =
			gradient[0] === "to bottom"
				? gradient.slice(1).map((stop) => {
						const [color, from, to] = splitTop(stop, " ");
						return {
							color: ink(color),
							from: length(from, lh),
							to: length(to, lh),
						};
					})
				: [{ color: ink(gradient[0]), from: 0, to: lh }];
		for (let y = 0; y < lh; y++) {
			const stop = stops.find((s) => y + 0.5 >= s.from && y + 0.5 < s.to);
			if (!stop || stop.color === undefined) continue;
			for (let x = 0; x < lw; x++) {
				const gx = ox + lx + x;
				const gy = oy + ly + y;
				if (gx >= ox && gx < ox + w && gy >= oy && gy < oy + h)
					into[gy][gx] = stop.color;
			}
		}
	}
};

/** The four sides (top, right, bottom, left) of a `padding` or `inset`. */
const sides = (value: string): [number, number, number, number] => {
	const v = splitTop(value, " ").map((part) => length(part, 0));
	const [t, r = t, b = t, l = r] = v;
	return [t, r, b, l];
};

/** The base sheet's `progress[value]` rule: what Platinum's must override. */
const baseCss = compile(
	path.join(
		CORE_SRC,
		"SystemFolder/SystemResources/ProgressBar/ClassicyProgressBar.scss",
	),
).css.replace(/\n\s+/g, "\n");
const baseProgress = (() => {
	const head = "\n.classicyProgress progress[value] {\n";
	const at = `\n${baseCss}`.indexOf(head);
	const body = `\n${baseCss}`.slice(
		at + head.length,
		`\n${baseCss}`.indexOf("\n}", at),
	);
	return Object.fromEntries(
		body
			.split(";\n")
			.map((line) =>
				line.split(":").map((part) => part.trim().replace(/;$/, "")),
			)
			.filter(([name]) => name),
	) as Record<string, string>;
})();

/** The startup bar filled `fill` of its 158 pixels, its well included,
 * over the panel's `face`. Every box is placed from the compiled rules: the
 * indicator's padding (the well), the progress element's border (the
 * frame), padding and box-sizing (where the track and the fill start), the
 * base sheet's value where Platinum's sheet declares none. */
const drawBar = (fill: number, face: string): Grid => {
	const indicator = rule(BAR);
	const progress = rule(`${BAR} progress[value]`);
	// The native bar is never drawn: the pseudo-elements are the bar.
	expect(progress.appearance).toBe("none");
	const [wellTop, wellRight, wellBottom, wellLeft] = sides(
		indicator.padding ?? "0",
	);
	const [padTop, padRight, padBottom, padLeft] = sides(
		progress.padding ?? baseProgress.padding,
	);
	const [borderWidth, borderStyle, borderColor] = splitTop(
		progress.border,
		" ",
	);
	expect(borderStyle).toBe("solid");
	const frame = length(borderWidth, 0);
	// `width`/`height` set the border box only when the rule says so (the
	// indicator is `max-content`, so the well grows with a content box).
	const borderBox = progress["box-sizing"] === "border-box";
	const extraX = borderBox ? 0 : frame + frame + padLeft + padRight;
	const extraY = borderBox ? 0 : frame + frame + padTop + padBottom;
	const fw = knobs.startupWidth + extraX;
	const fh = knobs.startupHeight + extraY;
	const W = wellLeft + fw + wellRight;
	const H = wellTop + fh + wellBottom;
	const out = grid(W, H);
	paintBackground(indicator.background, out, 0, 0, W, H);
	for (let y = wellTop; y < wellTop + fh; y++)
		for (let x = wellLeft; x < wellLeft + fw; x++) out[y][x] = ink(borderColor);
	// The element's own face (Firefox's track) inside the frame, then the
	// pseudo-elements in its content box.
	const cx = wellLeft + frame;
	const cy = wellTop + frame;
	paintBackground(
		progress.background,
		out,
		cx,
		cy,
		fw - frame - frame,
		fh - frame - frame,
	);
	const ox = cx + padLeft;
	const oy = cy + padTop;
	const iw = fw - frame - frame - padLeft - padRight;
	const ih = fh - frame - frame - padTop - padBottom;
	paintBackground(
		rule(`${BAR} progress[value]::-webkit-progress-bar`).background,
		out,
		ox,
		oy,
		iw,
		ih,
	);
	const value = rule(`${BAR} progress[value]::-webkit-progress-value`);
	// The end line and the track's shadow, right after the fill, clipped
	// by the frame (first listed on top).
	for (const shadow of splitTop(value["box-shadow"], ",").reverse()) {
		const [dx, , , , color] = splitTop(shadow, " ");
		const shift = length(dx, 0);
		for (let x = Math.max(0, shift); x < Math.min(iw, fill + shift); x++)
			for (let y = 0; y < ih; y++) out[oy + y][ox + x] = ink(color);
	}
	if (fill > 0) paintBackground(value.background, out, ox, oy, fill, ih);
	return out.map((row) => row.map((c) => c ?? face));
};

const capture = (name: string) => {
	const png = PNG.sync.read(readFileSync(path.join(CAPTURES, name)));
	return (x: number, y: number) => {
		const i = (y * png.width + x) * 4;
		return hex((png.data[i] << 16) | (png.data[i + 1] << 8) | png.data[i + 2]);
	};
};
const region = (at: (x: number, y: number) => string) =>
	Array.from({ length: 14 }, (_, y) =>
		Array.from({ length: 162 }, (_, x) => at(239 + x, 337 + y)),
	);

describe("Platinum's progress bar (Mac OS 8.5)", () => {
	it("sizes the startup screen's bar at 8.5's 160 x 12, centered", () => {
		expect(knobs.startupWidth).toBe(160);
		expect(knobs.startupHeight).toBe(12);
		expect(knobs.pixel).toBe(1);
		const startup = `${P} .classicyStartupScreenProgress .classicyProgressDeterminate`;
		expect(rule(startup)).toEqual({ width: "max-content", margin: "0 auto" });
		expect(rule(`${startup} progress[value]`)).toEqual({
			width: "var(--progress-bar-startup-width)",
			height: "var(--progress-bar-startup-height)",
		});
	});

	// The box model the drawing above reads, pinned too (integration review
	// G round 5, finding 10): the well's one pixel around the frame, the
	// native bar off, the frame inside the element's box, and no base
	// padding (`0 var(--window-border-size)`) between the frame and the fill.
	it("lays the bar's boxes out as 8.5's: well, frame, then the fill", () => {
		expect(rule(BAR)["box-sizing"]).toBe("border-box");
		expect(rule(BAR).padding).toBe("var(--progress-bar-pixel)");
		const progress = rule(`${BAR} progress[value]`);
		expect(progress.appearance).toBe("none");
		expect(progress["box-sizing"]).toBe("border-box");
		expect(progress.padding).toBe("0");
		expect(baseProgress.padding).toBe("0 var(--window-border-size)");
	});

	it("draws Firefox's fill and track as Chromium's", () => {
		const value = rule(`${BAR} progress[value]::-webkit-progress-value`);
		expect(rule(`${BAR} progress[value]::-moz-progress-bar`)).toEqual(value);
		expect(rule(`${BAR} progress[value]`).background).toBe(
			rule(`${BAR} progress[value]::-webkit-progress-bar`).background,
		);
		expect(rule(`${BAR} progress[value]`).overflow).toBe("hidden");
	});

	it("draws 8.5's bar filled 53 of 158 pixels, pixel for pixel", () => {
		const at = capture("platinum-85-startup-progress.png");
		expect(region(at)).toEqual(drawBar(53, "#DDDDDD"));
	});

	it("draws 8.5's full bar, pixel for pixel", () => {
		const at = capture("platinum-85-startup-parade.png");
		expect(region(at)).toEqual(drawBar(158, "#DDDDDD"));
	});
});
