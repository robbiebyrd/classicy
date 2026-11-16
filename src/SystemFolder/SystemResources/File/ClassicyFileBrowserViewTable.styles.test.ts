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

// Story 0197-s0z, fix round 3: a selected item's icon darkens by a filter
// unless it draws the active package's own selected image (System 7's),
// which ClassicyIconImage marks `classicyIconSelectedImage`.
describe("the Finder list view's selected icon", () => {
	it("darkens only an icon that draws no selected image", () => {
		expect(
			rule(
				":where(.classicyFileBrowserViewTableRow).selected .classicyFileBrowserViewTableRowIcon:not(.classicyIconSelectedImage)",
			),
		).toEqual({ filter: "contrast(0.75) brightness(0.5)" });
		expect(css).not.toMatch(
			/\.selected \.classicyFileBrowserViewTableRowIcon \{/,
		);
	});
});

// The row pitch: a theme's optional `fileBrowserList.rowPadding` is the
// space above and below a row's icon and label (Platinum: 1, HIGOS8
// Fig. 2-24's 18 px rows around 16 px icons); without it the icon spacing
// stays all round, as before.
describe("the Finder list view's row pitch", () => {
	const SPACING = "var(--file-browser-list-icon-spacing)";
	const BLOCK = `var(--file-browser-list-row-padding, ${SPACING})`;

	it("pads a row's icon and label above and below by the theme's row padding, else the icon spacing", () => {
		expect(rule(".classicyFileBrowserViewTableRowIcon").margin).toBe(
			`${BLOCK} ${SPACING}`,
		);
		expect(rule(".classicyFileBrowserViewTableRowIconLabel").padding).toBe(
			`${BLOCK} ${SPACING}`,
		);
	});
});
