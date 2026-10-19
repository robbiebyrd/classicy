import path from "node:path";
import * as sass from "sass";
import { describe, expect, it } from "vitest";

/**
 * #271: Finder list windows drew two sets of scroll bars — the window's own
 * (always drawn since #262) and the generic table container's, which filled
 * the window absolutely and scrolled itself. The Finder variant must leave the
 * window contents box as the only scroller.
 *
 * jsdom does no layout, so (like ClassicyWindow.resizer.test.ts) this asserts
 * the invariants on the compiled stylesheet.
 */

// vitest's root is the repo root, and jsdom leaves import.meta.url as a
// non-file URL, so resolve from the project root.
const css = sass.compile(
	path.resolve(
		process.cwd(),
		"src/SystemFolder/SystemResources/File/ClassicyFileBrowserViewTable.scss",
	),
	{ style: "expanded" },
).css;

const rule = (selector: string): Record<string, string> => {
	// `expanded` output puts one declaration per line; anchor the selector at a
	// line start so a longer selector sharing its prefix can't match.
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

describe("Finder list view container styles (#271)", () => {
	const container = rule(
		".classicyFileBrowserViewTableContainer.classicyTableContainer",
	);

	it("does not scroll itself, so the window is the only scroller", () => {
		expect(container.overflow).toBe("visible");
	});

	it("is not absolutely positioned over the window contents", () => {
		expect(container.position).not.toBe("absolute");
	});

	it("grows with its rows rather than being pinned to the window height", () => {
		expect(container.height).not.toBe("100%");
		expect(container["min-height"]).toBe("100%");
	});

	it("drops the scroller-edge focus ring", () => {
		expect(
			rule(
				".classicyFileBrowserViewTableContainer.classicyTableContainer:focus",
			).outline,
		).toBe("0");
	});

	it("keeps keyboard-scrolled rows clear of the sticky header", () => {
		expect(
			rule(".classicyFileBrowserViewTableRow")["scroll-margin-top"],
		).toBeDefined();
	});
});
