import path from "node:path";
import * as sass from "sass";
import { describe, expect, it } from "vitest";
import platinumJson from "@/Appearance/Platinum/platinum.json";
import {
	getTheme,
	getThemeVars,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";

/**
 * HIG 2.10: tab labels are the 12 pt / 10 pt system font, not the 14 px body
 * scale applied flat. Classicy's `--ui-font-size` is its stand-in for the 12 pt
 * system font, so the standard (`medium`) tab tracks it directly and the
 * compact (`small`) tab is that size scaled by the HIG's own 10:12 ratio.
 *
 * jsdom does no layout and the component test mocks the stylesheet away, so this
 * asserts the invariant on the compiled CSS instead: resolve each tab's
 * `font-size` against the default theme's `--ui-font-size` and check the pixels.
 */

// vitest's root is the repo root; resolve the entry from there (see the window
// resizer test for the same idiom).
const css = sass.compile(
	path.resolve(
		process.cwd(),
		"src/SystemFolder/SystemResources/Tabs/ClassicyTabs.scss",
	),
	{ style: "expanded" },
).css;

const fontSizeOf = (selector: string): string => {
	// A selector can head more than one block (e.g. a grouped `height` rule and
	// the standalone `font-size` rule), so scan every block it heads and return
	// the `font-size` from whichever one declares it.
	const blocks = css.matchAll(
		new RegExp(
			`^${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\{\\n([^}]*)\\n\\}`,
			"gm",
		),
	);
	let found = false;
	for (const block of blocks) {
		found = true;
		for (const line of block[1].split("\n")) {
			const colon = line.indexOf(":");
			if (colon === -1) continue;
			if (line.slice(0, colon).trim() === "font-size") {
				return line
					.slice(colon + 1)
					.trim()
					.replace(/;$/, "");
			}
		}
	}
	throw new Error(
		found ? `no font-size in rule: ${selector}` : `rule not found: ${selector}`,
	);
};

// The default theme's UI font size, as ClassicyAppearance emits it.
const defaultTheme = platinumJson.presets.find(
	(theme) => theme.id === "default",
);
if (!defaultTheme) throw new Error("platinum.json has no `default` preset");
const uiFontSize = defaultTheme.typography.uiSize;

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

// Every variable getThemeVars emits for the default theme: the UI font size
// and its named steps (`--ui-font-size-compact`, `--ui-font-size-large`, …).
const themeVars = getThemeVars(getTheme("default")) as Record<string, string>;

/**
 * Resolve a font-size declaration — `var(--ui-font-size)`, a named step such
 * as `var(--ui-font-size-compact)`, or a `calc()` over them — to pixels.
 */
const px = (value: string): number => {
	const expression = value
		.replace(/var\(\s*(--[\w-]+)\s*\)/g, (_, name: string) => {
			const resolved = themeVars[name];
			if (resolved === undefined) throw new Error(`undefined var: ${name}`);
			return `(${resolved})`;
		})
		.replace(/calc\(/g, "(")
		.replace(/px/g, "")
		.trim();
	if (!/^[\d\s.+\-*/()]+$/.test(expression)) {
		throw new Error(`not a resolvable length: ${value} -> ${expression}`);
	}
	return evaluate(expression);
};

describe("tab label type scale (HIG 2.10)", () => {
	const medium = px(fontSizeOf(".classicyTabButton"));
	const small = px(fontSizeOf(".classicyTabsSizeSmall .classicyTabButton"));
	const large = px(fontSizeOf(".classicyTabsSizeLarge .classicyTabButton"));

	it("sets the standard tab to the system UI font (the 12 pt peg)", () => {
		expect(medium).toBe(uiFontSize);
	});

	it("scales the compact tab by the HIG's 10:12 ratio to the standard tab", () => {
		expect(small).toBeCloseTo((uiFontSize * 10) / 12, 5);
		// ~11.67 px on the default theme, not the old over-shrunk ~9.3 px.
		expect(small).toBeGreaterThan(uiFontSize / 1.5);
		expect(small).toBeLessThan(medium);
	});

	it("keeps the small:standard ratio exactly 10:12", () => {
		expect(small / medium).toBeCloseTo(10 / 12, 5);
	});

	it("still scales every size from --ui-font-size (no hard-coded px)", () => {
		// Each size is a function of the theme's UI font, so a theme that changes
		// its UI size carries the tabs with it rather than pinning them to 12/10px.
		for (const selector of [
			".classicyTabButton",
			".classicyTabsSizeSmall .classicyTabButton",
			".classicyTabsSizeLarge .classicyTabButton",
		]) {
			// The UI font itself or one of its named steps (getThemeVars derives
			// those from the same --ui-font-size input).
			expect(fontSizeOf(selector)).toMatch(/var\(--ui-font-size(-[a-z]+)?\)/);
		}
		// The large tab stays the existing Classicy extension (no HIG equivalent).
		expect(large).toBeGreaterThan(medium);
	});
});
