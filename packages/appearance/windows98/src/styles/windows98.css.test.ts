import path from "node:path";
import { compile, NodePackageImporter } from "sass";
import { describe, expect, it } from "vitest";
import { isSingleClassicyLayerBlock } from "../../../../../bin/classicyPackageCss";
import { CLASSICY_LAYER_ORDER } from "../../../../../bin/classicyStyleInjector";

// The Windows 98 package stylesheet as Sass compiles it: one
// `@layer classicy.package` block, every rule scoped under the Windows 98
// desktop root, so its look applies only while it is the active package
// (design 0014-ahm; the core's _package.scss), as Platinum's and System 7's
// are. No rule sits outside the scope: the package ships no screen savers.

const STYLESHEET = path.join(import.meta.dirname, "windows98.scss");
const WINDOWS98_SCOPE =
	/^\.classicyDesktop\[data-classicy-appearance=("?)windows98\1\](?=$|[\s.:#[>+~])/;

/** A selector list's selectors: its commas outside parentheses (`:is(a, b)`). */
const splitSelectors = (header: string) => {
	const selectors: string[] = [];
	let depth = 0;
	let start = 0;
	for (let i = 0; i < header.length; i++) {
		if (header[i] === "(") depth++;
		else if (header[i] === ")") depth--;
		else if (header[i] === "," && depth === 0) {
			selectors.push(header.slice(start, i).trim());
			start = i + 1;
		}
	}
	selectors.push(header.slice(start).trim());
	return selectors;
};

/**
 * Every style-rule selector in Sass's expanded output (through at-rules, not
 * into `@keyframes` steps), a multi-line selector list included.
 */
const selectorsOf = (css: string) => {
	const selectors: string[] = [];
	const stack: ("at" | "keyframes" | "rule")[] = [];
	let pending = "";
	for (const raw of css.split("\n")) {
		const line = raw.trim();
		if (!line || line.startsWith("/*")) continue;
		if (line === "}") {
			stack.pop();
			continue;
		}
		if (stack.at(-1) !== "rule" && line.endsWith(",")) {
			pending += `${line} `;
			continue;
		}
		if (line.endsWith("{")) {
			const header = `${pending}${line.slice(0, -1)}`.trim();
			pending = "";
			if (header.startsWith("@keyframes")) stack.push("keyframes");
			else if (header.startsWith("@")) stack.push("at");
			else {
				if (stack.at(-1) !== "keyframes")
					selectors.push(...splitSelectors(header));
				stack.push("rule");
			}
		}
	}
	return selectors;
};

describe("windows98.scss (compiled)", () => {
	const css = compile(STYLESHEET, {
		importers: [
			new NodePackageImporter(
				path.resolve(import.meta.dirname, "../../../../.."),
			),
		],
	}).css;

	it("is one @layer classicy.package block", () => {
		expect(css.startsWith("@layer classicy.package")).toBe(true);
		expect(
			isSingleClassicyLayerBlock(css, "classicy.package", CLASSICY_LAYER_ORDER),
		).toBe(true);
	});

	it("holds rules, every one scoped under the windows98 root", () => {
		const selectors = selectorsOf(css);
		expect(selectors.length).toBeGreaterThan(0);
		expect(selectors.filter((s) => !WINDOWS98_SCOPE.test(s))).toEqual([]);
	});

	// The selector scan itself, so "every one scoped" cannot hold vacuously.
	it("the scan catches an unscoped rule in a multi-line list", () =>
		expect(
			selectorsOf(
				".classicyDesktop[data-classicy-appearance=windows98] .a,\n.b {\n  color: red;\n}\n",
			).filter((s) => !WINDOWS98_SCOPE.test(s)),
		).toEqual([".b"]));

	// No `!important` (ClassicyCascade.repo.test.ts holds it for the whole
	// repo); no literal pixel length or color (the lint gates); a package
	// overrides Platinum from its layer, never by weight.
	it("declares no !important", () => expect(css).not.toContain("!important"));

	// The title-bar buttons stand in Windows' order, Close last and apart.
	it("orders the title-bar buttons minimize, maximize, close", () => {
		const order = (control: string) =>
			Number(
				new RegExp(
					`\\[data-classicy-control=${control}\\][^{]*\\{[^}]*order: (\\d+)`,
				).exec(css)?.[1],
			);
		expect(order("collapse")).toBeLessThan(order("zoom"));
		expect(order("zoom")).toBeLessThan(order("close"));
	});

	// The two core window hooks of the WIG audit's second pass (6.7 and 6.1),
	// each one rule keyed on the class the core sets: a zoomed window's
	// Maximize box shows Restore, and a window that cannot be sized wears the
	// dialog's three-ring fixed frame, its drag band and its placard corner
	// following.
	it("draws Restore on a zoomed window's zoom box and the fixed frame on a window that cannot be sized", () => {
		const selectors = selectorsOf(css);
		const has = (tail: string) =>
			selectors.some((selector) => selector.endsWith(tail));
		expect(
			has(
				".classicyWindow.expanded .classicyWindowTitleBar .classicyWindowZoomBox",
			),
		).toBe(true);
		expect(has(".classicyWindow.classicyWindowNoResize")).toBe(true);
		expect(has(".classicyWindow.classicyWindowNoResize.dragging::after")).toBe(
			true,
		);
		expect(
			has(".classicyWindow.classicyWindowNoResize .classicyWindowPlacardBar"),
		).toBe(true);
	});

	// The package pass of the audit's next round (13.7 and 13.10): a set image
	// well wears the WIG's option-set border, two solid rings inside its
	// client edge, WindowText outside ButtonHilight (Figure 13.13), as an
	// overlay over the picture, the dotted rectangle gone from the set state
	// and the base's solid accent outline cleared;
	// and the HyperCard editor's handles are Hilight squares in a one-ring
	// HilightText border (Ch.13 "Handles", pp.319-320).
	it("frames a set image well solid and fills the HyperCard handles from the highlight colors", () => {
		const selectors = selectorsOf(css);
		const has = (tail: string) =>
			selectors.some((selector) => selector.endsWith(tail));
		const block = (tail: string) =>
			new RegExp(
				`${tail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`,
			).exec(css)?.[1] ?? "";
		expect(has(":where(.classicyImageWell).selected::after")).toBe(true);
		// The set rule itself only clears the base's solid accent outline
		// (which would otherwise draw beside the rings); no dotted line.
		expect(has(":where(.classicyImageWell).selected")).toBe(true);
		const set = block(":where(.classicyImageWell).selected");
		expect(set).toContain("outline: none");
		expect(set).not.toContain("dotted");
		expect(set).not.toContain("box-shadow");
		const well = block(":where(.classicyImageWell).selected::after");
		expect(well).toContain(
			"inset 0 0 0 var(--window-border-size) var(--color-black)",
		);
		expect(well).toContain("var(--color-system-01)");
		expect(well).not.toContain("dotted");
		expect(has(".classicyHyperCardEditorHandle")).toBe(true);
		const handle = block(".classicyHyperCardEditorHandle");
		expect(handle).toContain("background: var(--color-highlight)");
		expect(handle).toContain(
			"box-shadow: inset 0 0 0 var(--window-border-size) var(--package-color-selection-text, var(--color-white))",
		);
	});

	// The shortcut overlay (shell32's #30, the package's `aliasBadge`) is a
	// whole icon-sized image with its arrow box at the bottom left, which
	// Windows drew over the whole icon: the badge takes the icon's size, where
	// the base draws a quarter of it, and the label stays upright.
	it("sizes the shortcut overlay to the icon and keeps its label upright", () => {
		const selectors = selectorsOf(css);
		const has = (tail: string) =>
			selectors.some((selector) => selector.endsWith(tail));
		const block = (tail: string) =>
			new RegExp(
				`${tail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`,
			).exec(css)?.[1] ?? "";
		expect(has("] .classicyDesktopIconAliasBadge")).toBe(true);
		expect(block("] .classicyDesktopIconAliasBadge")).toContain(
			"--alias-badge-size: var(--desktop-icon-size)",
		);
		expect(block(".classicyDesktopIconAlias > p")).toContain(
			"font-style: normal",
		);
	});

	// The cursors and the font (L3-C): the size grip shows Windows' diagonal
	// size cursor (`resizeNwse`, USER.EXE's IDC_SIZENWSE) at its hotspot, where
	// the base reads the Mac grow box's `resizeLr` (Windows' horizontal one),
	// and the desktop draws MS Sans Serif's recreation unsmoothed, as Windows
	// drew its bitmap face, where the base smooths the desktop's text.
	it("shows the diagonal size cursor over the grip and draws the interface font unsmoothed", () => {
		// Every block whose selector is exactly `selector`.
		const blocks = (selector: string) =>
			[
				...css.matchAll(
					new RegExp(
						`(?:^|\\n)\\s*${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`,
						"g",
					),
				),
			].map((match) => match[1] ?? "");
		expect(
			blocks(
				".classicyDesktop[data-classicy-appearance=windows98] .classicyWindow .classicyWindowResizer",
			).join("\n"),
		).toContain(
			'cursor: var(--classicy-cursor-resize-nwse, url("data:,")) var(--classicy-cursor-resize-nwse-hotspot, 16 16), nwse-resize;',
		);
		expect(
			blocks(".classicyDesktop[data-classicy-appearance=windows98]").join("\n"),
		).toContain("-webkit-font-smoothing: none;");
	});

	// The scroll-arrow hook of the audit's second pass (6.8 / 7.24): the core
	// sets `disabled` on the arrow at the end of its travel, and the package
	// embosses that one arrow as it embosses a fitting bar's, each rule after
	// the pressed rules so a held arrow at its end draws no press (WIG Ch.6
	// "Scroll Arrows", p.87).
	it("embosses a scroll arrow at the end of its travel", () => {
		const selectors = selectorsOf(css);
		const has = (tail: string) =>
			selectors.some((selector) => selector.endsWith(tail));
		for (const bar of ["Vertical", "Horizontal"]) {
			for (const arrow of ["Start", "End"]) {
				const disabled = `.classicyScrollBar${bar} .classicyScrollBarArrow${arrow}.disabled`;
				expect(has(disabled), disabled).toBe(true);
				expect(has(`${disabled}::before`), disabled).toBe(true);
				// After the pressed rule of the same weight.
				const pressed = `.classicyScrollBar${bar} .classicyScrollBarArrow${arrow}.pressed`;
				const at = (tail: string) =>
					selectors.findIndex((selector) => selector.endsWith(tail));
				expect(at(pressed), pressed).toBeGreaterThanOrEqual(0);
				expect(at(disabled)).toBeGreaterThan(at(pressed));
			}
		}
	});

	// The menu hooks of the audit's second pass (7.13 and 7.14 / 13.9): the
	// core marks an option item's gutter `classicyMenuItemBullet` beside the
	// check's class and the default item `default`; the package draws the
	// 6 x 6 bullet in the item's ink at the chosen option (embossed on a
	// disabled item, plain again while it is tracked, as the check is) and
	// the default item's title bold, on the title alone (WIG Ch.7 "Types of
	// Menu Items", pp.108-109, Figure 7.5).
	it("draws the option bullet and the bold default item in menus", () => {
		const selectors = selectorsOf(css);
		const has = (tail: string) =>
			selectors.some((selector) => selector.endsWith(tail));
		const at = (tail: string) =>
			selectors.findIndex((selector) => selector.endsWith(tail));
		const block = (tail: string) =>
			new RegExp(
				`${tail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`,
			).exec(css)?.[1] ?? "";
		const bullet = ".classicyMenuItemCheck.classicyMenuItemBullet";
		expect(has(`${bullet}::before`)).toBe(true);
		expect(block(`${bullet}::before`)).toContain("var(--pixel-unit)");
		expect(has(`${bullet}.checked::before`)).toBe(true);
		expect(block(`${bullet}.checked::before`)).toContain("currentColor");
		expect(has(`.classicyMenuItem.disabled ${bullet}.checked::before`)).toBe(
			true,
		);
		expect(
			has(
				`.classicyMenuItem.disabled:is(:hover, .open, :focus-visible) ${bullet}.checked::before`,
			),
		).toBe(true);
		// Each after the check's rule it stands in for.
		expect(at(`${bullet}.checked::before`)).toBeGreaterThan(
			at(".classicyMenuItemCheck.checked::before"),
		);
		expect(has(".classicyMenuItem.default > p")).toBe(true);
		expect(block(".classicyMenuItem.default > p")).toContain(
			"font-weight: bold",
		);
		// On the title alone: no rule bolds the item itself.
		expect(has(".classicyMenuItem.default")).toBe(false);
	});
});
