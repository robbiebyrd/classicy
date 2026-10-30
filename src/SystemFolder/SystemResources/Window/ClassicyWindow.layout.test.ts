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

	it("moves the grip by the desktop's grow-box attribute", () => {
		const bl = rule(`[data-classicy-grow-box="bottom-left"] ${resizer}`);
		expect(bl.left).toBe("var(--window-border-size)");
		expect(bl.right).toBe("auto");
		const tl = rule(`[data-classicy-grow-box="top-left"] ${resizer}`);
		expect(tl.top).toBe("var(--window-border-size)");
		expect(tl.bottom).toBe("auto");
	});

	it("stripe spans can be hidden by a package", () => {
		expect(css).not.toMatch(
			/classicyWindowTitle(Left|Center|Right)[^}]*display:[^;]*!important/,
		);
	});
});
