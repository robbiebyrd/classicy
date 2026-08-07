import path from "node:path";
import * as sass from "sass";
import { describe, expect, it } from "vitest";
import themes from "@/SystemFolder/ControlPanels/AppearanceManager/styles/themes.json";

/**
 * The window's grow box is the scroll bars' corner square. Its size and its
 * inset therefore have to be derived from the same variables the scroll bars
 * are, or the two drift apart as soon as a theme changes one of them — which is
 * exactly what happened when the resizer sized itself off --window-padding-size:
 * a 17.5x17 grip against a 16x16 gutter, sitting ~2px low and ~2px right of the
 * corner it was meant to fill.
 *
 * jsdom does no layout, so this asserts the invariant on the compiled
 * stylesheet instead: resolve the declarations against the default theme's
 * measurements and check the numbers a browser would compute.
 */

// vitest's root is the repo root (vitest.config.ts sets none), and jsdom leaves
// import.meta.url as a non-file URL, so resolve from the project root.
const css = sass.compile(
	path.resolve(
		process.cwd(),
		"src/SystemFolder/SystemResources/Window/ClassicyWindow.scss",
	),
	{ style: "expanded" },
).css;

const rule = (selector: string): Record<string, string> => {
	// Declaration blocks in `expanded` output are one property per line. Match
	// the selector at the start of a line so `.classicyWindow {` can't be found
	// inside `.classicyWindowUtility {`.
	const match = css.match(
		new RegExp(
			`^${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\{\\n([^}]*)\\n\\}`,
			"m",
		),
	);
	if (!match) throw new Error(`rule not found: ${selector}`);
	const declarations: Record<string, string> = {};
	for (const line of match[1].split("\n")) {
		const colon = line.indexOf(":");
		if (colon === -1) continue;
		declarations[line.slice(0, colon).trim()] = line
			.slice(colon + 1)
			.trim()
			.replace(/;$/, "");
	}
	return declarations;
};

const resizer = rule(".classicyWindow .classicyWindowResizer");
const window_ = rule(".classicyWindow");

// The default theme's window measurements, as ClassicyAppearanceManager emits
// them onto the desktop root.
const defaultTheme = themes.find((theme) => theme.id === "default");
if (!defaultTheme) throw new Error("themes.json has no `default` theme");
const measurements = defaultTheme.measurements.window;
const vars: Record<string, string> = {
	"--window-border-size": `${measurements.borderSize}px`,
	"--window-control-size": `${measurements.controlSize}px`,
	"--window-padding-size": `${measurements.paddingSize}px`,
	"--window-scrollbar-size": `${measurements.scrollbarSize}px`,
	"--window-frame-inset": window_["--window-frame-inset"],
};

/** Resolve var()/calc() the way a browser would, down to a number of pixels. */
const px = (value: string): number => {
	let expression = value.trim();
	for (let i = 0; i < 10 && expression.includes("var("); i++) {
		expression = expression.replace(
			/var\(\s*(--[\w-]+)\s*\)/g,
			(_, name: string) => {
				const resolved = vars[name];
				if (resolved === undefined) throw new Error(`undefined var: ${name}`);
				return `(${resolved})`;
			},
		);
	}
	expression = expression.replace(/calc\(/g, "(").replace(/px/g, "");
	if (!/^[\d\s.+\-*/()]+$/.test(expression)) {
		throw new Error(`not a resolvable length: ${value} -> ${expression}`);
	}
	return evaluate(expression);
};

/** Minimal +-*_/ and parentheses evaluator, so no eval/Function is needed. */
const evaluate = (input: string): number => {
	const tokens = input.match(/\d+\.?\d*|[+\-*/()]/g) ?? [];
	let at = 0;
	const expr = (): number => {
		let value = term();
		while (tokens[at] === "+" || tokens[at] === "-") {
			value = tokens[at++] === "+" ? value + term() : value - term();
		}
		return value;
	};
	const term = (): number => {
		let value = factor();
		while (tokens[at] === "*" || tokens[at] === "/") {
			value = tokens[at++] === "*" ? value * factor() : value / factor();
		}
		return value;
	};
	const factor = (): number => {
		if (tokens[at] === "(") {
			at++;
			const value = expr();
			at++; // ")"
			return value;
		}
		if (tokens[at] === "-") {
			at++;
			return -factor();
		}
		return Number(tokens[at++]);
	};
	return expr();
};

describe("window resizer / scroll bar alignment", () => {
	const gutter = measurements.scrollbarSize;
	// How far the contents box's *inner* edge sits from the window's padding
	// box: the grey frame ring, plus the contents box's own border.
	const innerCornerInset =
		px(window_.padding) + px(`var(--window-border-size)`);

	it("is exactly one scroll bar gutter square", () => {
		expect(px(resizer.width)).toBe(gutter);
		expect(px(resizer.height)).toBe(gutter);
	});

	it("counts its border inside that square, not on top of it", () => {
		// Without border-box the 1px top/left borders would push the grip a
		// pixel wider and taller than the gutter it has to match.
		expect(resizer["box-sizing"]).toBe("border-box");
	});

	it("sits flush in the contents box's inner bottom-right corner", () => {
		expect(px(resizer.right)).toBe(innerCornerInset);
		expect(px(resizer.bottom)).toBe(innerCornerInset);
	});

	it("does not offset itself with a margin", () => {
		expect(resizer.margin).toBeUndefined();
	});

	it("continues the scroll bar track's line rather than restating a shade", () => {
		// ::-webkit-scrollbar-track and ::-webkit-scrollbar-corner both draw this
		// line in --color-black; anything else changes shade at the junction.
		expect(resizer["border-top"]).toContain("var(--color-black)");
		expect(resizer["border-left"]).toContain("var(--color-black)");
	});

	it("keeps its bevel inside its own box", () => {
		// An outer shadow would spill over the scroll bars' black edges now that
		// the grip lands flush against them.
		expect(resizer["box-shadow"]).toContain("inset");
		expect(rule(".classicyWindowResizerDimmed")["box-shadow"]).toBe(
			"none !important",
		);
	});

	it("pins the placard bar to the same line at the other end", () => {
		// The placard shares the scroll bar gutter with the resizer, and had the
		// same drift: derived from --window-padding-size it sat 1.2px high and
		// 1.2px right of the gutter, with a margin-bottom papering over it.
		const placardBar = rule(".classicyWindowPlacardBar");
		expect(px(placardBar.height)).toBe(gutter);
		expect(px(placardBar.left)).toBe(innerCornerInset);
		expect(px(placardBar.bottom)).toBe(innerCornerInset);
		expect(placardBar["margin-bottom"]).toBeUndefined();
	});

	it("shrinks a placard control to the gutter it sits in", () => {
		// .classicyPlacard is an 18px --hig-control-height control standalone;
		// both it and its inline-block holder have to take the bar's height, or
		// it stands proud of the line.
		for (const selector of [
			".classicyWindowPlacardBar .classicyPlacardHolder",
			".classicyWindowPlacardBar .classicyPlacard",
		]) {
			expect(rule(selector).height).toBe("100%");
		}
		expect(
			rule(".classicyWindowPlacardBar .classicyPlacard")["min-height"],
		).toBe("0");
		// The holder must not stay inline-block: an inline-flex control inside it
		// would sit on a line box and drop a further pixel onto the baseline.
		expect(
			rule(".classicyWindowPlacardBar .classicyPlacardHolder").display,
		).toBe("flex");
	});

	it("tracks a windoid's narrower gutter without a size override", () => {
		// .classicyWindowUtility narrows --window-scrollbar-size; because the
		// resizer is sized from that variable, it must follow automatically.
		expect(css).not.toMatch(
			/\.classicyWindowUtility \.classicyWindowResizer \{[^}]*(width|height)/,
		);
		const utility = rule(".classicyWindowUtility");
		expect(utility["--window-scrollbar-size"]).toBeDefined();
		expect(px(utility["--window-scrollbar-size"])).toBeLessThan(gutter);
	});
});
