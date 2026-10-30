import path from "node:path";
import * as sass from "sass";
import { describe, expect, it } from "vitest";

/**
 * The window's arrangement is structure, read from the base stylesheet: the
 * title bar's parts are ordered by explicit `order` values keyed on
 * `data-classicy-control` (so a package can reorder them by overriding the
 * numbers), and the grow box follows the desktop root's
 * `data-classicy-grow-box` corner. jsdom does no layout, so this pins the
 * compiled rules.
 */

// vitest's root is the repo root, and jsdom leaves import.meta.url as a
// non-file URL, so resolve from the project root.
const css = sass.compile(
	path.resolve(
		process.cwd(),
		"src/SystemFolder/SystemResources/Window/ClassicyWindow.scss",
	),
	{ style: "expanded" },
).css;

const rule = (selector: string): Record<string, string> => {
	// Sass writes an attribute value that is a valid identifier without its
	// quotes (`[data-classicy-control=close]`); a browser reads both forms the
	// same, so look the selector up the way Sass wrote it.
	const compiled = selector.replace(/="([A-Za-z_][\w-]*)"\]/g, "=$1]");
	// Declaration blocks in `expanded` output are one property per line. Match
	// the selector at the start of a line so a longer selector that ends the
	// same way is never found instead.
	const match = css.match(
		new RegExp(
			`^${compiled.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\{\\n([^}]*)\\n\\}`,
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

const titleBar = ".classicyWindow .classicyWindowTitleBar";
const resizer = ".classicyWindow .classicyWindowResizer";

describe("ClassicyWindow.scss arrangement", () => {
	it("orders the title-bar parts explicitly", () => {
		expect(rule(`${titleBar} [data-classicy-control="close"]`).order).toBe(
			"10",
		);
		expect(rule(`${titleBar} .classicyWindowTitle`).order).toBe("20");
		expect(rule(`${titleBar} [data-classicy-control="zoom"]`).order).toBe("30");
		expect(rule(`${titleBar} [data-classicy-control="collapse"]`).order).toBe(
			"40",
		);
	});

	// Each corner rule moves only the axes its corner flips, so the other axis
	// keeps the default (bottom-right) placement: whole-rule equality pins
	// that bottom-left sets no top/bottom and top-right no left/right.
	it("moves the grip by the desktop's grow-box attribute", () => {
		expect(rule(`[data-classicy-grow-box="bottom-left"] ${resizer}`)).toEqual({
			left: "var(--window-border-size)",
			right: "auto",
		});
		expect(rule(`[data-classicy-grow-box="top-right"] ${resizer}`)).toEqual({
			top: "var(--window-border-size)",
			bottom: "auto",
		});
		expect(rule(`[data-classicy-grow-box="top-left"] ${resizer}`)).toEqual({
			left: "var(--window-border-size)",
			right: "auto",
			top: "var(--window-border-size)",
			bottom: "auto",
		});
	});

	// F 7.1 (F 3.1 review carry-forward): the grip's two drawn edges continue
	// the scroll bars' outer lines on the content side of the grip, so they
	// follow the corner: a left corner draws the vertical edge on the grip's
	// right (nudged out by a border, mirroring the bottom-right nudge), a top
	// corner draws the horizontal edge along the grip's bottom. Dimmed, the
	// moved edges take the dimmed color too. (Sass writes `*=left` unquoted.)
	it("mirrors the grip's edges with its corner", () => {
		expect(rule(`[data-classicy-grow-box*=left] ${resizer}::before`)).toEqual({
			left: "auto",
			right: "calc(var(--window-border-size) * -1)",
			"border-left": "none",
			"border-right": "var(--window-border-size) solid var(--color-black)",
		});
		expect(rule(`[data-classicy-grow-box*=top] ${resizer}::before`)).toEqual({
			top: "auto",
			bottom: "0",
			"border-top": "none",
			"border-bottom": "var(--window-border-size) solid var(--color-black)",
		});
		expect(
			rule(
				"[data-classicy-grow-box*=left] .classicyWindow .classicyWindowResizerDimmed::before",
			),
		).toEqual({ "border-right-color": "var(--color-system-05)" });
		expect(
			rule(
				"[data-classicy-grow-box*=top] .classicyWindow .classicyWindowResizerDimmed::before",
			),
		).toEqual({ "border-bottom-color": "var(--color-system-05)" });
	});

	it("stripe spans can be hidden by a package", () => {
		expect(css).not.toMatch(
			/classicyWindowTitle(Left|Center|Right)[^}]*display:[^;]*!important/,
		);
	});
});
