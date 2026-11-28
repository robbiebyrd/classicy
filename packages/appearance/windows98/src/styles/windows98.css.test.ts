import path from "node:path";
import { classicyAssetVarName } from "@classicy/classicy";
import { compile, NodePackageImporter } from "sass";
import { describe, expect, it } from "vitest";
import { isSingleClassicyLayerBlock } from "../../../../../bin/classicyPackageCss";
import { CLASSICY_LAYER_ORDER } from "../../../../../bin/classicyStyleInjector";
import windows98 from "../windows98.json";

// The Windows 98 package stylesheet as Sass compiles it: one
// `@layer classicy.package` block, every rule scoped under the Windows 98
// desktop root, so its look applies only while it is the active package
// (design 0014-ahm; the core's _package.scss), as Platinum's and System 7's
// are, but the screen savers', keyed on their own classes at the layer's
// root, since the overlay is a portal (_screenSavers.scss).

const STYLESHEET = path.join(import.meta.dirname, "windows98.scss");
// A rule may be keyed on the What's This? mode's class on the document
// element above the root (`html.classicyWhatsThisMode`, set only under the
// package's `balloonHelp.contextHelp`): still scoped under the root.
const WINDOWS98_SCOPE =
	/^(?:html\.classicyWhatsThisMode )?\.classicyDesktop\[data-classicy-appearance=("?)windows98\1\](?=$|[\s.:#[>+~])/;

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

	it("holds rules, every one scoped under the windows98 root, but the screen savers'", () => {
		const selectors = selectorsOf(css);
		const unscoped = selectors.filter((s) => !WINDOWS98_SCOPE.test(s));
		expect(selectors.length).toBeGreaterThan(unscoped.length);
		expect(unscoped).toEqual([
			".classicySaverBlankScreen",
			".classicySaverCurvesAndColors",
			".classicySaverFlyingThroughSpace",
			".classicySaverFlyingWindows",
			".classicySaverMystify",
			".classicySaverPipes",
			".classicySaverScrollingMarquee",
			".classicySaverWindows98Canvas",
			// The savers' reduced-motion pause (_screenSavers.scss).
			"#classicy-screen-saver-overlay",
			"#classicy-screen-saver-overlay *",
		]);
	});

	// The savers' rules: each root over the overlay, its canvas over the root
	// drawn whole pixels; no saver sets the cursor (the overlay hides the
	// pointer) or the play state; the sheet ends with its own reduced-motion
	// pause, after every saver rule, as Platinum's and System 7's do.
	it("lays the screen savers' canvases over the overlay, whole pixels, and ends with the reduced-motion pause", () => {
		const saverCss = css.slice(css.indexOf(".classicySaverBlankScreen"));
		expect(saverCss).toMatch(
			/\.classicySaverWindows98Canvas \{[^}]*inset: 0;[^}]*image-rendering: pixelated;/,
		);
		expect(saverCss).not.toMatch(/cursor:/);
		const pause =
			/@media \(prefers-reduced-motion: reduce\) \{\s*#classicy-screen-saver-overlay,\s*#classicy-screen-saver-overlay \* \{\s*animation-play-state: paused;\s*\}\s*\}\s*\}\s*$/;
		expect(css).toMatch(pause);
		expect(saverCss.replace(pause, "")).not.toMatch(/animation-play-state/);
	});

	// A desktop picture is drawn whole pixels, as Windows drew a bitmap; the
	// desktop's children draw their own way, but its icons, which the base
	// draws pixelated (a package-layer `auto` on them would beat the base's
	// rule and blur them). The Desktop tab's preview shows the desktop's own
	// background (its color under its tiled picture), so a pattern previews
	// tiled in the scheme's color.
	it("draws the desktop's picture whole pixels and previews it tiled", () => {
		const scope = ".classicyDesktop[data-classicy-appearance=windows98]";
		expect(css).toContain(`${scope} {\n    image-rendering: pixelated;`);
		expect(css).toContain(
			`${scope} > :not(.classicyDesktopIcon) {\n    image-rendering: auto;`,
		);
		// No other rule sets the desktop's children back to `auto`.
		expect(
			[...css.matchAll(/([^{}]*)\{[^{}]*image-rendering: auto;/g)].map(
				(match) => (match[1] ?? "").trim(),
			),
		).toEqual([`${scope} > :not(.classicyDesktopIcon)`]);
		const preview = new RegExp(
			`${scope.replace(/[.[\]]/g, "\\$&")} \\.classicyAppearanceManagerDesktopPreview \\{([^}]*)\\}`,
		).exec(css)?.[1];
		for (const declaration of [
			"object-fit: none;",
			"object-position: 100vw 100vh;",
			"background-color: var(--desktop-background-color);",
			"background-image: var(--desktop-background-image);",
			"background-repeat: var(--desktop-background-repeat);",
			"background-position: var(--desktop-background-position);",
			"background-size: var(--desktop-background-size);",
			"image-rendering: pixelated;",
		])
			expect(preview, declaration).toContain(declaration);
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

	// A desktop icon's label is the list view's (comctl32 LVS_ICON): wrapped
	// within the 75 px icon spacing, a long word broken between characters,
	// two lines at most with an ellipsis unless the icon has the focus, whose
	// label is drawn whole over its neighbors; a large scheme's label stays
	// on the desktop.
	it("wraps a desktop icon's label within the icon spacing, two lines unless focused", () => {
		const block = (tail: string) =>
			new RegExp(
				`${tail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`,
			).exec(css)?.[1] ?? "";
		const label = block("] .classicyDesktopIcon p");
		expect(label).toContain("width: max-content");
		expect(label).toContain(
			"max-width: calc(var(--desktop-icon-cell) + var(--desktop-icon-padding))",
		);
		expect(label).toContain("overflow-wrap: anywhere");
		expect(label).toContain("-webkit-line-clamp: 2");
		expect(label).toContain("overflow: hidden");
		expect(label).toContain("flex-shrink: 0");
		expect(block("] .classicyDesktopIcon:focus")).toContain("z-index: 11");
		const focused = block("] .classicyDesktopIcon:focus p");
		expect(focused).toContain("-webkit-line-clamp: unset");
		expect(focused).toContain("overflow: visible");
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

	// The shell addendum's B4 (audit 4.4; WIG Ch.4 "Mouse Pointers", p.23,
	// Table 4.1; Ch.6 "Moving Windows", p.83): a move shows the arrow and a
	// grip resize keeps the diagonal size pointer, where the base shows its
	// grabbing hand for both.
	it("keeps the arrow through a move and the diagonal size pointer through a grip resize", () => {
		const blocks = (selector: string) =>
			[
				...css.matchAll(
					new RegExp(
						`(?:^|\\n|\\})\\s*${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`,
						"g",
					),
				),
			].map((match) => match[1] ?? "");
		const root = ".classicyDesktop[data-classicy-appearance=windows98]";
		expect(blocks(`${root} .classicyWindow.dragging`).join("\n")).toContain(
			'cursor: var(--classicy-cursor-arrow, url("data:,")) var(--classicy-cursor-arrow-hotspot, 0 0), default;',
		);
		expect(
			blocks(
				`${root} .classicyWindow.classicyWindowResizing .classicyWindowResizer`,
			).join("\n"),
		).toContain(
			'cursor: var(--classicy-cursor-resize-nwse, url("data:,")) var(--classicy-cursor-resize-nwse-hotspot, 16 16), nwse-resize;',
		);
		// The idle grip keeps its rule.
		expect(
			blocks(`${root} .classicyWindow .classicyWindowResizer`).join("\n"),
		).toContain("nwse-resize");
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

	// Plan 0020-w98 E3: a dialog's Help ("?") box, the core's help box, is a
	// caption button like Close, just left of it (Close apart by its gap),
	// its mark the 6 x 9 question mark at (5, 2) and one pixel further down
	// and right while pressed.
	it("draws the help box as a caption button left of Close", () => {
		const order = (control: string) =>
			Number(
				new RegExp(
					`\\[data-classicy-control=${control}\\][^{]*\\{[^}]*order: (\\d+)`,
				).exec(css)?.[1],
			);
		expect(order("help")).toBeGreaterThan(order("zoom"));
		expect(order("help")).toBeLessThan(order("close"));
		// Every rule whose selector list ends with `tail`, its bodies joined.
		const block = (tail: string) =>
			[
				...css.matchAll(
					new RegExp(
						`${tail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`,
						"g",
					),
				),
			]
				.map((m) => m[1])
				.join("\n");
		const box = block(
			".classicyWindow .classicyWindowTitleBar .classicyWindowHelpBox",
		);
		expect(box).toContain("var(--color-black)");
		expect(box).toContain("var(--color-system-03)");
		// The top bar of the "?" (1, 0) 4 wide, moved to (6, 2) of the marks'
		// grid, which the button centers on itself.
		expect(box).toContain(
			"calc(var(--windows98-mark-x) + calc(var(--pixel-unit) * 6)) calc(var(--windows98-mark-y) + calc(var(--pixel-unit) * 2))/calc(var(--pixel-unit) * 4) var(--pixel-unit)",
		);
		// One device pixel down and right while pressed, whatever the grid.
		const pressed = block(
			".classicyWindow .classicyWindowTitleBar .classicyWindowHelpBox:active",
		);
		expect(pressed).toContain(
			"calc(calc(var(--windows98-mark-x) + var(--window-border-size)) + calc(var(--pixel-unit) * 6)) calc(calc(var(--windows98-mark-y) + var(--window-border-size)) + calc(var(--pixel-unit) * 2))/calc(var(--pixel-unit) * 4) var(--pixel-unit)",
		);
	});

	// L2-F's per-scheme caption (plan 0020-w98 integration): the caption
	// buttons' marks are pixel art on a 16 x 14 grid centered on the button,
	// each grid pixel the scheme's `--title-bar-mark-unit` (2 px in a button
	// 24 or more tall, where Marlett draws the marks at twice their size:
	// Wine's `draw_frame_caption` sizes the glyph to the button), inked in
	// ButtonText (DFC_CAPTION's COLOR_BTNTEXT); the title in the scheme's
	// caption font; the gap under the caption one row (SM_CYCAPTION is
	// iCaptionHeight + 1).
	it("centers and scales the caption marks, inks them in ButtonText and sets the caption font", () => {
		const block = (tail: string) =>
			[
				...css.matchAll(
					new RegExp(
						`${tail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`,
						"g",
					),
				),
			]
				.map((m) => m[1])
				.join("\n");
		const boxes = block(
			".classicyWindow .classicyWindowTitleBar .classicyWindowHelpBox",
		);
		expect(boxes).toContain(
			"--pixel-unit: var(--title-bar-mark-unit, var(--window-border-size));",
		);
		expect(boxes).toContain(
			"--windows98-mark-x: calc((var(--title-bar-button-width) - calc(var(--pixel-unit) * 16)) / 2);",
		);
		expect(boxes).toContain(
			"--windows98-mark-y: calc((var(--title-bar-button-height) - calc(var(--pixel-unit) * 14)) / 2);",
		);
		for (const box of ["Close", "Zoom", "Collapse", "Help"]) {
			const look = block(
				`.classicyWindow .classicyWindowTitleBar .classicyWindow${box}Box`,
			);
			expect(look, box).toContain(
				"linear-gradient(var(--package-color-text-button, var(--color-black)), var(--package-color-text-button, var(--color-black)))",
			);
			expect(look, box).not.toMatch(
				/linear-gradient\(var\(--color-black\), var\(--color-black\)\)/,
			);
		}
		const title = block(
			".classicyWindowTitleBar .classicyWindowTitle .classicyWindowTitleText",
		);
		expect(title).toContain(
			"font-family: var(--package-font-caption, var(--ui-font))",
		);
		expect(title).toContain(
			"font-size: var(--package-font-caption-size, var(--ui-font-size))",
		);
		expect(title).toContain(
			"font-weight: var(--package-font-caption-weight, bold)",
		);
		expect(
			block(
				".classicyWindowTitleBar .classicyWindowTitle .classicyWindowTitleText > p",
			),
		).toContain("font: inherit");
		expect(block("] .classicyWindow .classicyWindowTitleBar")).toContain(
			"margin: 0 0 var(--title-bar-gap)",
		);
	});

	// L2-F's sizing border: a sizable window's frame is SM_CXFRAME, the
	// scheme's `--sizing-border-frame` (3 plus iBorderWidth), set as its
	// `--window-frame-inset` (so the core's padding, frame edges, grip, drag
	// band and keyboard sizing follow it), with iBorderWidth of ActiveBorder
	// (InactiveBorder behind an inactive window) between the two-pixel edge
	// and the last ring of ButtonFace (Wine's `draw_nc_frame`); a dialog and
	// a window that cannot be sized keep the edge alone, after the inactive
	// rule.
	it("draws the sizing border from the scheme's width and ActiveBorder colors", () => {
		const selectors = selectorsOf(css);
		const last = (tail: string) =>
			selectors.findLastIndex((selector) => selector.endsWith(tail));
		const blocks = (selector: string) =>
			[
				...css.matchAll(
					new RegExp(
						`(?:^|\\n)\\s*${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`,
						"g",
					),
				),
			].map((match) => match[1] ?? "");
		const scope = ".classicyDesktop[data-classicy-appearance=windows98]";
		const window = blocks(`${scope} .classicyWindow`).join("\n");
		expect(window).toContain(
			"--window-frame-inset: var(--sizing-border-frame, calc(calc(calc(var(--window-border-size) + var(--window-border-size)) + var(--window-border-size)) + var(--window-border-size)));",
		);
		const band = (color: string) =>
			`inset 0 0 0 calc(calc(var(--window-border-size) + var(--window-border-size)) + var(--sizing-border-width, var(--window-border-size))) var(--package-color-sizing-border-${color}, var(--color-system-03))`;
		expect(window).toContain(band("active"));
		const inactive = blocks(`${scope} .classicyWindow.inactive`).join("\n");
		expect(inactive).toContain(band("inactive"));
		const fixed = blocks(
			`${scope} .classicyWindow.classicyWindowModal,\n  ${scope} .classicyWindow.classicyWindowNoResize`,
		).join("\n");
		expect(fixed).toContain("box-shadow:");
		expect(fixed).not.toContain("sizing-border");
		expect(last(".classicyWindow.classicyWindowNoResize")).toBeGreaterThan(
			last(".classicyWindow.inactive"),
		);
	});

	// A tool window (L2-F, the 98.js report's 2.4): its caption carries its
	// title in the small caption font (the core draws it under
	// `window.utilityTitle`), and its one Close is 11 x 11 in a cell the
	// caption's height plus two wide at the bar's end, centered (Wine's
	// `draw_close_button`: (SM_CYSMCAPTION - 12) / 2 down, 3 px in from the
	// right in Windows Standard), its X drawn one pixel a grid pixel.
	// L2-F's glyph rule: a disabled Control Strip scroll arrow is embossed
	// as DrawFrameControl embosses a DFCS_INACTIVE glyph, ButtonShadow over
	// a ButtonHilight copy, never GrayText (text's color, green in High
	// Contrast).
	it("embosses the Control Strip's disabled arrows in ButtonShadow", () => {
		for (const arrow of [
			".classicyControlStripScrollStart:disabled",
			".classicyControlStripScroll:not(.classicyControlStripScrollStart):disabled",
		]) {
			const look =
				new RegExp(
					`${arrow.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`,
				).exec(css)?.[1] ?? "";
			expect(look, arrow).toContain(
				"linear-gradient(var(--color-system-05), var(--color-system-05))",
			);
			expect(look, arrow).toContain(
				"linear-gradient(var(--color-system-01), var(--color-system-01))",
			);
			expect(look, arrow).not.toContain("--package-color-text-gray");
		}
	});

	it("titles a tool window in the small caption font and centers its 11 x 11 Close", () => {
		const block = (tail: string) =>
			[
				...css.matchAll(
					new RegExp(
						`${tail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`,
						"g",
					),
				),
			]
				.map((m) => m[1])
				.join("\n");
		const bar = ".classicyWindow.classicyWindowUtility .classicyWindowTitleBar";
		expect(block(bar)).toContain("padding-right: 0");
		const title = block(`${bar} .classicyWindowTitle .classicyWindowTitleText`);
		expect(title).toContain(
			"font-family: var(--package-font-small-caption, var(--ui-font))",
		);
		expect(title).toContain(
			"font-size: var(--package-font-small-caption-size, var(--ui-font-size))",
		);
		const cell = block(`${bar} .classicyWindowControlBox`);
		expect(cell).toContain(
			"width: calc(var(--window-utility-title-bar-height) + calc(var(--window-border-size) + var(--window-border-size)))",
		);
		expect(cell).toContain("justify-content: center");
		const close = block(`${bar} .classicyWindowCloseBox`);
		expect(close).toContain("--pixel-unit: inherit");
		expect(close).toContain("width: var(--utility-title-bar-button-width)");
		// The X's top-left run at (2, 3), from the button's corner.
		expect(close).toContain(
			"calc(var(--pixel-unit) * 2) calc(var(--pixel-unit) * 3)/calc(var(--pixel-unit) * 2) var(--pixel-unit)",
		);
	});

	// Plan 0020-w98 §6 (`dialog.caption: "titled"`): a dialog that cannot
	// close draws its Close box `disabled`, raised, its X embossed in
	// ButtonShadow over a ButtonHilight copy one pixel down and right
	// (DrawFrameControl's DFCS_INACTIVE caption button, Wine's
	// `draw_frame_caption`), and never pressed (Wine's `track_close_button`
	// tracks no press on a grayed Close); the palette's small Close likewise.
	it("draws an unavailable Close box embossed and never pressed", () => {
		const selectors = selectorsOf(css);
		const at = (tail: string) =>
			selectors.findIndex((selector) => selector.endsWith(tail));
		const block = (tail: string) =>
			new RegExp(
				`${tail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`,
			).exec(css)?.[1] ?? "";
		for (const root of [
			".classicyWindow",
			".classicyWindow.classicyWindowUtility",
		]) {
			const box = `${root} .classicyWindowTitleBar .classicyWindowCloseBox`;
			const disabled = `${box}.disabled`;
			expect(at(disabled), disabled).toBeGreaterThanOrEqual(0);
			expect(at(`${disabled}:active`), disabled).toBeGreaterThanOrEqual(0);
			// After the box's own pressed rule, which it overrides.
			expect(at(`${disabled}:active`)).toBeGreaterThan(at(`${box}:active`));
			const look = block(`${disabled}:active`);
			expect(look).toContain("var(--color-system-05)");
			expect(look).toContain("var(--color-system-01)");
			expect(look).not.toContain("var(--color-black)");
			// Raised, not pressed: ButtonDkShadow is the outer ring's bottom
			// and right (pressed, it would be ButtonHilight there).
			expect(look).toMatch(
				/box-shadow: inset calc\(var\(--window-border-size\) \* -1\) calc\(var\(--window-border-size\) \* -1\) var\(--color-system-07\)/,
			);
		}
	});

	// Plan 0020-w98 §7, step 17: a window's menu bar is the band Windows 98
	// draws under the caption (WIG Ch.7 "The Menu Bar and Drop-down Menus",
	// p.97, Figure 7.1; Wine's `calc_menu_bar_size`, `DrawMenuBarTemp` and
	// `NC_DoNCPaint`): ButtonFace, a row above the titles
	// `--menu-bar-title-height` (iMenuHeight, 18) tall, SM_CYMENU in all
	// (19 px in Windows Standard; the client area starts at the bar's height,
	// so the line drawn at its bottom lies under the client edge), where the
	// core's derived `--window-menu-bar-height` is 21; a host's
	// `--classicy-window-menu-bar-height` still wins, as the base sheet reads
	// it. The contents below give up the same band.
	it("draws a window's menu bar as Windows 98's SM_CYMENU band", () => {
		const selectors = selectorsOf(css);
		const has = (tail: string) =>
			selectors.some((selector) => selector.endsWith(tail));
		const block = (tail: string) =>
			new RegExp(
				`${tail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`,
			).exec(css)?.[1] ?? "";
		const band =
			"var(--classicy-window-menu-bar-height, calc(var(--menu-bar-title-height) + var(--window-border-size)))";
		for (const root of [
			".classicyWindow.classicyWindowWithMenuBar",
			".classicyWindow:has(> .classicyWindowMenuBar)",
		]) {
			expect(has(`${root} > .classicyWindowMenuBar`), root).toBe(true);
			expect(block(`${root} > .classicyWindowMenuBar`)).toContain(
				`height: ${band}`,
			);
			expect(block(`${root} .classicyWindowContents`)).toContain(`- ${band})`);
			expect(
				block(
					`${root} .classicyWindowContents.classicyWindowContentsWithHeader`,
				),
			).toContain(`- ${band})`);
		}
		expect(css).not.toContain("--window-menu-bar-height");
		// The list: flat ButtonFace, a row of face above the titles and none
		// below, no side padding; a forced screen bar's list is the same band.
		const list = block(
			":is(.classicyWindowMenuBar, .classicyDesktopMenuBar) .classicyDesktopMenu",
		);
		expect(list).toContain("padding: var(--window-border-size) 0 0;");
		// MenuText, the scheme's ButtonText (white in High Contrast #1, where
		// WindowText is yellow).
		expect(list).toContain(
			"color: var(--package-color-text-button, var(--color-black))",
		);
		expect(list).toContain("background-color: var(--color-system-03)");
		expect(list).toContain("box-shadow: none");
		expect(list).toContain("border-radius: 0");
		expect(block(".classicyDesktopMenuBar .classicyDesktopMenu")).toContain(
			"height: calc(var(--menu-bar-title-height) + var(--window-border-size))",
		);
		expect(block("=windows98] .classicyWindowMenuBar")).toContain(
			"background-color: var(--color-system-03)",
		);
	});

	// Its titles, as Wine's `MENU_DrawMenuItem` draws a menu bar's: the
	// scheme's menu font (its own `<p>` inheriting it) in MenuText (the
	// `text` family's ButtonText) with one average character each side; nothing under the pointer alone
	// (Windows 98's menu bar tracks no hover; the raised title is Explorer's
	// command bar, os-gui's note); open or tracked by the keyboard, one
	// sunken ring (BDR_SUNKENOUTER: ButtonShadow at the top and left,
	// ButtonHilight at the bottom and right, the bottom-right ring over the
	// corners as DrawEdge draws it), the text MenuText on the face and in
	// place, no Hilight band and no focus rectangle; unavailable, GrayText
	// embossed, and sunken in GrayText alone when the keyboard reaches it;
	// the pull-down from the title's bottom-left corner.
	it("draws the menu titles flat, sunken while open, embossed when unavailable", () => {
		const selectors = selectorsOf(css);
		const at = (tail: string) =>
			selectors.findIndex((selector) => selector.endsWith(tail));
		const block = (tail: string) =>
			new RegExp(
				`${tail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`,
			).exec(css)?.[1] ?? "";
		const title =
			":is(.classicyWindowMenuBar, .classicyDesktopMenuBar) :is(.classicyDesktopMenu > .classicyMenuItem, .classicyDesktopMenu > .classicyMenuItemBalloonAnchor > .classicyMenuItem)";
		const plain = block(title);
		expect(plain).toContain("padding: 0 var(--menu-item-padding-x)");
		expect(plain).toContain("height: 100%");
		const menuText =
			"color: var(--package-color-text-button, var(--color-black))";
		expect(plain).toContain(menuText);
		expect(plain).toContain(
			"font-family: var(--package-font-menu, var(--ui-font))",
		);
		expect(plain).toContain(
			"font-size: var(--package-font-menu-size, var(--ui-font-size))",
		);
		expect(plain).toContain(
			"font-weight: var(--package-font-menu-weight, normal)",
		);
		expect(block(`${title} > p`)).toContain("font: inherit");
		expect(plain).toContain("background-color: transparent");
		expect(plain).toContain("box-shadow: none");
		const hover = block(`${title}:hover`);
		expect(hover).toContain("background-color: transparent");
		expect(hover).toContain(menuText);
		expect(hover).not.toContain("box-shadow");
		// The open rule and the keyboard's share one block: `:focus-visible`,
		// and the title the keyboard tracks (the core's `focused` root list
		// and the title's focus, B8), last in the list.
		const keyed =
			":is(.classicyDesktopMenu.focused > .classicyMenuItem:focus, .classicyDesktopMenu.focused > .classicyMenuItemBalloonAnchor > .classicyMenuItem:focus)";
		expect(at(`${title}.open`)).toBeGreaterThanOrEqual(0);
		expect(at(`${title}:focus-visible`)).toBeGreaterThanOrEqual(0);
		const open = block(`${title}${keyed}`);
		expect(open).toContain(
			"box-shadow: inset calc(var(--window-border-size) * -1) calc(var(--window-border-size) * -1) var(--color-system-01), inset var(--window-border-size) var(--window-border-size) var(--color-system-05)",
		);
		expect(open).toContain("outline: none");
		expect(open).toContain(menuText);
		expect(open).toContain("background-color: transparent");
		// The text one pixel down and right, as ReactOS's MENU_DrawMenuItem
		// offsets a highlighted, ungrayed menu bar item's (B8); the sunken
		// rule itself moves nothing.
		const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(
			([, head, body]) => ({ selectors: splitSelectors(head.trim()), body }),
		);
		const openRules = rules.filter((rule) =>
			rule.selectors.some((selector) => selector.endsWith(`${title}.open`)),
		);
		expect(openRules).toHaveLength(1);
		expect(openRules[0].body).not.toMatch(
			/\b(top|left|transform|translate|padding):/,
		);
		const pushed = block(
			`${title}:is(.open, :focus-visible, ${keyed.slice(4, -1)}):not(.disabled) > p`,
		);
		expect(pushed).toContain("position: relative");
		expect(pushed).toContain("top: var(--window-border-size)");
		expect(pushed).toContain("left: var(--window-border-size)");
		// No Hilight band and no checker on any menu bar title.
		const titleRules = rules.filter((rule) =>
			rule.selectors.some((selector) => selector.includes(title)),
		);
		expect(titleRules.length).toBeGreaterThan(5);
		for (const rule of titleRules)
			expect(rule.body, rule.selectors.join(", ")).not.toMatch(
				/--color-highlight|--package-color-selection-text|repeating-conic-gradient/,
			);
		// GrayText, the scheme's own (the `text` family), ButtonShadow its
		// fallback.
		const disabled = block(`${title}.disabled`);
		expect(disabled).toContain(
			"color: var(--package-color-text-gray, var(--color-system-05))",
		);
		expect(disabled).toContain(
			"text-shadow: var(--window-border-size) var(--window-border-size) 0 var(--color-system-01)",
		);
		// After the hover rule of the same weight, so a hovered one stays gray.
		expect(at(`${title}.disabled`)).toBeGreaterThan(at(`${title}:hover`));
		const reached = block(
			`${title}.disabled:is(.open, :focus-visible, ${keyed.slice(4, -1)})`,
		);
		expect(reached).toContain(
			"color: var(--package-color-text-gray, var(--color-system-05))",
		);
		expect(reached).toContain("text-shadow: none");
		const wrapper = block(`${title} > .classicyMenuWrapper`);
		expect(wrapper).toContain("top: 100%");
		expect(wrapper).toContain("left: 0");
	});

	// Shell addendum B12 (WIG Ch.9 "Display Layout", p.187, Figure 9.6): an
	// inactive window's bar is drawn as an active one's. No rule reads the
	// window's `inactive` state on the bar, its titles or an access key, so
	// the titles stay MenuText with their keys underlined; the base's
	// inactive-window filter is undone; nothing hot-tracks (a hovered title
	// is plain); only a disabled title is embossed.
	it("draws an inactive window's menu bar as an active one's", () => {
		const selectors = selectorsOf(css);
		const block = (tail: string) =>
			new RegExp(
				`${tail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`,
			).exec(css)?.[1] ?? "";
		const inactiveOnBar = selectors.filter(
			(selector) =>
				/\.inactive|:not\(\.active\)/.test(selector) &&
				/classicyWindowMenuBar|classicyDesktopMenu|classicyMenuItem|access-key/.test(
					selector,
				),
		);
		expect(inactiveOnBar).toEqual([]);
		const scope = ".classicyDesktop[data-classicy-appearance=windows98]";
		expect(block(`${scope} .classicyWindow.inactive`)).toContain(
			"filter: none",
		);
		const title =
			":is(.classicyWindowMenuBar, .classicyDesktopMenuBar) :is(.classicyDesktopMenu > .classicyMenuItem, .classicyDesktopMenu > .classicyMenuItemBalloonAnchor > .classicyMenuItem)";
		const hover = block(`${title}:hover`);
		expect(hover).toContain(
			"color: var(--package-color-text-button, var(--color-black))",
		);
		expect(hover).not.toContain("box-shadow");
		expect(block(".classicyMenuItem [data-classicy-part=access-key]")).toMatch(
			/text-decoration/,
		);
		// GrayText is a disabled title's alone.
		const gray = selectors.filter(
			(selector) =>
				selector.includes(title) &&
				/--package-color-text-gray/.test(block(selector)),
		);
		expect(gray.length).toBeGreaterThan(0);
		for (const selector of gray) expect(selector).toContain(".disabled");
	});

	// Every menu bar rule is scoped under a window's bar, a forced screen
	// bar or the taskbar's status area, so none reaches the taskbar's own
	// parts (its `clock` and `extensions`), and the taskbar dress the screen
	// bar wore before the shell (the Apple title as Start, the Application
	// menu as the pressed task button, the clock's pane) is gone: the
	// taskbar's look is its own.
	it("scopes every menu bar rule under a bar or the taskbar's tray", () => {
		const selectors = selectorsOf(css);
		const menuBarClass = /\.classicyDesktopMenu(?![A-Za-z]*Bar\b)[A-Za-z]*/;
		// A menu rule that names the bar only to leave it out
		// (`:not(.classicyDesktopMenu)`) is no menu bar rule.
		const unscoped = selectors.filter(
			(selector) =>
				menuBarClass.test(selector.replace(/:not\([^()]*\)/g, "")) &&
				!/(\.classicyDesktopMenuBar|\.classicyWindowMenuBar|\.classicyTaskbarTray)[\s,)]/.test(
					selector,
				),
		);
		expect(unscoped).toEqual([]);
		expect(
			selectors.filter((selector) =>
				/\[data-classicy-part="?(apple|switcher|extensions|clock)/.test(
					selector,
				),
			),
		).toEqual([]);
		expect(
			selectors.filter((selector) =>
				/classicyDesktopMenu(Apple|Time)\b/.test(selector),
			),
		).toEqual([]);
		const has = (tail: string) =>
			selectors.some((selector) => selector.endsWith(tail));
		expect(has(".classicyTaskbarTray .classicyDesktopMenuExtensions")).toBe(
			true,
		);
		expect(
			has(".classicyTaskbarTray .classicyDesktopMenuExtensionTrigger img"),
		).toBe(true);
	});

	// Plan 0020-w98 §5 (`window.zoom: "maximize"`): a primary window with
	// Minimize or Maximize alone draws the other `disabled` beside it, as
	// Windows 95/98 draws the two as a pair (Wine's `NC_DrawCaption`: "In
	// win95 the two buttons are always there"): raised, its mark embossed in
	// ButtonShadow over a ButtonHilight copy, never pressed, as the
	// unavailable Close is.
	it("draws a lone Minimize's or Maximize's missing partner embossed and never pressed", () => {
		const selectors = selectorsOf(css);
		const at = (tail: string) =>
			selectors.findIndex((selector) => selector.endsWith(tail));
		const block = (tail: string) =>
			new RegExp(
				`${tail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`,
			).exec(css)?.[1] ?? "";
		for (const name of ["Zoom", "Collapse"]) {
			const box = `.classicyWindow .classicyWindowTitleBar .classicyWindow${name}Box`;
			const disabled = `${box}.disabled`;
			expect(at(disabled), disabled).toBeGreaterThanOrEqual(0);
			expect(at(`${disabled}:active`), disabled).toBeGreaterThanOrEqual(0);
			// After the box's own pressed rule, which it overrides.
			expect(at(`${disabled}:active`)).toBeGreaterThan(at(`${box}:active`));
			const look = block(`${disabled}:active`);
			expect(look).toContain("var(--color-system-05)");
			expect(look).toContain("var(--color-system-01)");
			expect(look).not.toContain("var(--color-black)");
			expect(look).toMatch(
				/box-shadow: inset calc\(var\(--window-border-size\) \* -1\) calc\(var\(--window-border-size\) \* -1\) var\(--color-system-07\)/,
			);
		}
	});

	// The taskbar (plan 0020-w98 §7; WIG Ch.3 "The Taskbar", "The Start
	// Button", "Window Buttons" and "The Status Area", pp.15-16, Figure 3.1;
	// Ch.10 "Taskbar Integration", pp.211-212, Figure 10.2), drawn as Windows
	// 98 draws it (Wine's comctl32 and DrawEdge tables, ReactOS's explorer).
	describe("the taskbar", () => {
		const selectors = selectorsOf(css);
		const at = (tail: string) =>
			selectors.findIndex((selector) => selector.endsWith(tail));
		const block = (tail: string) =>
			new RegExp(
				`${tail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`,
			).exec(css)?.[1] ?? "";
		const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(
			([, head, body]) => ({ selectors: splitSelectors(head.trim()), body }),
		);
		const rulesOn = (pattern: RegExp) =>
			rules.filter((rule) => rule.selectors.some((s) => pattern.test(s)));
		const B = "var(--window-border-size)";
		const B2 = `calc(${B} + ${B})`;
		const NEG_B = `calc(${B} * -1)`;
		const NEG_B2 = `calc(${B2} * -1)`;
		// The soft raised edge (a push button's, `b.raised`) and the soft
		// sunken one (`b.pressed`), as DrawEdge's BF_SOFT tables draw
		// EDGE_RAISED and EDGE_SUNKEN.
		const RAISED = `box-shadow: inset ${NEG_B} ${NEG_B} var(--color-system-07), inset ${B} ${B} var(--color-system-01), inset ${NEG_B2} ${NEG_B2} var(--color-system-05), inset ${B2} ${B2} var(--color-system-02)`;
		const PUSHED = `box-shadow: inset ${NEG_B} ${NEG_B} var(--color-system-01), inset ${B} ${B} var(--color-system-07), inset ${NEG_B2} ${NEG_B2} var(--color-system-02), inset ${B2} ${B2} var(--color-system-05)`;
		const CHECKER =
			"background: repeating-conic-gradient(var(--color-system-01) 0 25%, var(--color-system-03) 0 50%) 0 0/calc(var(--pixel-unit) * 2) calc(var(--pixel-unit) * 2)";
		const SHIFT = `translate: ${B} ${B}`;

		// The bar: 28 px of ButtonFace, the raised edge on its top (a
		// ButtonLight row over a ButtonHilight row, DrawEdge EDGE_RAISED
		// BF_TOP), its contents 2 px above the bottom and as far under the
		// edge, its sides 2 px in.
		it("draws the bar with its raised top edge", () => {
			const bar = block("=windows98] .classicyTaskbar");
			expect(bar).toContain("height: var(--taskbar-height)");
			expect(bar).toContain(
				`padding: calc(var(--taskbar-height) - var(--taskbar-button-height) - ${B2}) ${B2} ${B2}`,
			);
			expect(bar).toContain("background: var(--color-system-03)");
			expect(bar).toContain(
				`box-shadow: inset 0 ${B} var(--color-system-02), inset 0 ${B2} var(--color-system-01)`,
			);
			expect(bar).toContain("font-family: var(--ui-font)");
			expect(bar).toContain("font-size: var(--ui-font-size)");
		});

		// Plan 0020-w98 E4: docked to another edge, the raised edge lies on
		// the side facing the desktop (DrawEdge EDGE_RAISED on that side: its
		// bottom and right rows dark, its top and left light), and down a side
		// the bar is the Start button's width with its edge and margins, the
		// regions stacked.
		it("draws the bar's raised edge on the side facing the desktop on every edge", () => {
			const top = block("=windows98] .classicyTaskbar.classicyTaskbarEdgeTop");
			expect(top).toContain(
				`padding: ${B2} ${B2} calc(var(--taskbar-height) - var(--taskbar-button-height) - ${B2})`,
			);
			expect(top).toContain(
				`box-shadow: inset 0 ${NEG_B} var(--color-system-07), inset 0 ${NEG_B2} var(--color-system-05)`,
			);
			const left = block(
				"=windows98] .classicyTaskbar.classicyTaskbarEdgeLeft",
			);
			expect(left).toContain(
				`padding: ${B2} calc(var(--taskbar-height) - var(--taskbar-button-height) - ${B2}) ${B2} ${B2}`,
			);
			expect(left).toContain(
				`box-shadow: inset ${NEG_B} 0 var(--color-system-07), inset ${NEG_B2} 0 var(--color-system-05)`,
			);
			const right = block(
				"=windows98] .classicyTaskbar.classicyTaskbarEdgeRight",
			);
			expect(right).toContain(
				`padding: ${B2} ${B2} ${B2} calc(var(--taskbar-height) - var(--taskbar-button-height) - ${B2})`,
			);
			expect(right).toContain(
				`box-shadow: inset ${B} 0 var(--color-system-02), inset ${B2} 0 var(--color-system-01)`,
			);
			const side = block(
				"=windows98] .classicyTaskbar.classicyTaskbarVertical",
			);
			expect(side).toContain(
				"width: calc(var(--taskbar-start-button-width) + var(--taskbar-height) - var(--taskbar-button-height))",
			);
			expect(side).toContain("height: auto");
		});

		it("stacks the regions down a side taskbar, each window button the buttons' height", () => {
			const item = block(
				"=windows98] .classicyTaskbarVertical .classicyTaskbarTasksPaged > li",
			);
			expect(item).toContain("flex: 0 0 auto");
			expect(item).toContain("min-height: var(--taskbar-button-height)");
			expect(
				block("=windows98] .classicyTaskbarVertical .classicyTaskbarStart"),
			).toContain("margin-bottom: var(--taskbar-start-gap)");
			const gripper = block(
				"=windows98] .classicyTaskbarVertical .classicyTaskbarGripper",
			);
			expect(gripper).toContain("height: var(--taskbar-gripper-width)");
			const clock = block(
				"=windows98] .classicyTaskbarVertical .classicyTaskbarClock",
			);
			expect(clock).toContain("width: 100%");
			expect(clock).toContain("height: var(--taskbar-button-height)");
		});

		// The Start button: a raised push button at least 54 wide, 22 tall,
		// its label bold, the gap before the window buttons; pushed in while
		// its menu is open, the contents a pixel down and right, never the
		// checker (a pushed button, not a checked one); the focus rectangle
		// three pixels in.
		it("draws the Start button raised, and pushed in without the checker while open", () => {
			const start = block("=windows98] .classicyTaskbarStart");
			expect(start).toContain("min-width: var(--taskbar-start-button-width)");
			expect(start).toContain("margin-right: var(--taskbar-start-gap)");
			expect(start).toContain("height: var(--taskbar-button-height)");
			expect(start).toContain("padding: 0 var(--taskbar-button-padding-x)");
			expect(start).toContain("gap: var(--taskbar-icon-gap)");
			expect(start).toContain("background: var(--color-system-03)");
			expect(start).toContain(RAISED);
			expect(start).not.toContain("margin: 0");
			const open = block(".classicyTaskbarStart:is(.open, :active)");
			expect(open).toContain(PUSHED);
			expect(open).not.toContain("background");
			expect(block(".classicyTaskbarStart:is(.open, :active) > *")).toContain(
				SHIFT,
			);
			for (const rule of rulesOn(/\.classicyTaskbarStart\b/))
				expect(rule.body, rule.selectors.join(", ")).not.toContain(
					"repeating-conic-gradient",
				);
			expect(block(".classicyTaskbarStartLabel")).toContain(
				"font-weight: bold",
			);
			expect(block(".classicyTaskbarStart:focus-visible")).toContain(
				`outline-offset: calc(calc(${B2} + ${B}) * -1)`,
			);
		});

		// The Start glyph: the package's own 16 x 14 pixel art (no Microsoft
		// flag), a small window from the theme's tokens, each package color
		// read with a core token behind it.
		it("draws the Start glyph as pixel art from the window tokens", () => {
			const glyph = block(".classicyTaskbarStartIcon");
			expect(glyph).toContain("width: calc(var(--pixel-unit) * 16)");
			expect(glyph).toContain("height: calc(var(--pixel-unit) * 14)");
			for (const ink of [
				"var(--color-system-07)",
				"var(--color-system-03)",
				"var(--package-color-title-bar-active, var(--color-highlight))",
				"var(--package-color-title-bar-active-gradient, var(--color-highlight))",
				"var(--package-color-title-bar-text, var(--color-white))",
				"var(--color-window-document)",
			])
				expect(glyph).toContain(`linear-gradient(${ink}, ${ink})`);
			expect(glyph).not.toMatch(/url\(/);
			// The outline is the bottom layer, the whole 16 x 14 box.
			expect(glyph).toMatch(
				/linear-gradient\(var\(--color-system-07\), var\(--color-system-07\)\) 0 0\/calc\(var\(--pixel-unit\) \* 16\) calc\(var\(--pixel-unit\) \* 14\) no-repeat;\s*$/,
			);
		});

		// The package's own Start flag (Explorer's bitmap 143, its
		// `appleMenu` art), 16 x 16 from the variable the desktop publishes
		// for that key, whole pixels at any zoom, while the button's glyph
		// carries `classicyTaskbarStartFlag`; the pixel-art window stays the
		// glyph without it.
		it("draws the Start flag 16 x 16 from the published appleMenu art", () => {
			const flag = block(".classicyTaskbarStartIcon.classicyTaskbarStartFlag");
			const name = classicyAssetVarName("systemArt", "appleMenu");
			expect(name).toBe("--classicy-art-apple-menu");
			expect(flag).toContain(
				`background: var(${name}, none) 0 0/calc(var(--pixel-unit) * 16) calc(var(--pixel-unit) * 16) no-repeat`,
			);
			expect(flag).toContain("height: calc(var(--pixel-unit) * 16)");
			expect(flag).toContain("image-rendering: pixelated");
		});

		// A window button: an even share of the row up to 160 and never
		// under 22, 3 px apart; raised at rest; pushed in on a plain face
		// while held; the active window's pushed in over the
		// ButtonHilight/ButtonFace checker with its title bold (comctl32's
		// selected TCS_BUTTONS item), after the held rule so a press on it
		// keeps the checker; a minimized window's an ordinary raised button;
		// nothing under the pointer.
		it("draws the window buttons raised, the active one pushed in over the checker", () => {
			const item = block(".classicyTaskbarTasks > li");
			expect(item).toContain("flex: 0 1 var(--taskbar-button-max-width)");
			expect(item).toContain("min-width: var(--taskbar-button-min-width)");
			const list = block(".classicyTaskbarTasks");
			expect(list).toContain("gap: var(--taskbar-button-gap)");
			expect(list).toContain("padding-right: var(--taskbar-button-gap)");
			expect(list).toContain("overflow: hidden");
			// The shell addendum's B5: the inner edge's size cursors, and the
			// window buttons in rows once the bar is sized taller.
			const sizer = block("=windows98] .classicyTaskbarSizer");
			expect(sizer).toContain(
				"height: calc(var(--taskbar-height) - var(--taskbar-button-height) - ",
			);
			expect(sizer).toContain(
				'cursor: var(--classicy-cursor-resize-ud, url("data:,")) var(--classicy-cursor-resize-ud-hotspot, 15 16), ns-resize',
			);
			expect(
				block(".classicyTaskbarVertical > .classicyTaskbarSizer"),
			).toContain(
				'cursor: var(--classicy-cursor-resize-lr, url("data:,")) var(--classicy-cursor-resize-lr-hotspot, 16 16), ew-resize',
			);
			expect(block(".classicyTaskbar.classicyTaskbarRows")).toContain(
				"height: auto",
			);
			const rowsGrid = block(".classicyTaskbarTasks.classicyTaskbarTasksRows");
			expect(rowsGrid).toContain("display: grid");
			expect(rowsGrid).toContain(
				"grid-template-rows: repeat(var(--classicy-taskbar-rows), var(--taskbar-button-height))",
			);
			expect(rowsGrid).toContain("var(--classicy-taskbar-columns)");
			expect(rowsGrid).toContain(
				"minmax(var(--taskbar-button-min-width), var(--taskbar-button-max-width))",
			);
			const task = block("=windows98] .classicyTaskbarTask");
			// The shell addendum's B10: the keyboard's focus is the dotted
			// rectangle three pixels in, inside the bevel, on the window
			// buttons, Quick Launch's buttons and the tray's icons alike.
			expect(block(".classicyTaskbarTask:focus-visible")).toContain(
				`outline-offset: calc(calc(${B2} + ${B}) * -1)`,
			);
			expect(
				block(".classicyTaskbarQuickLaunchButton:focus-visible"),
			).toContain(" dotted ");
			expect(block(".classicyTaskbarTrayIcon:focus-visible")).toContain(
				" dotted ",
			);
			expect(task).toContain("height: var(--taskbar-button-height)");
			expect(task).toContain("padding: 0 var(--taskbar-button-padding-x)");
			expect(task).toContain(RAISED);
			expect(block(".classicyTaskbarTaskIcon")).toContain(
				"width: var(--icon-small-size)",
			);
			const pressed = block(".classicyTaskbarTask.pressed");
			expect(pressed).toContain(PUSHED);
			expect(pressed).not.toContain("background");
			expect(block(".classicyTaskbarTask.pressed > *")).toContain(SHIFT);
			const active = block(".classicyTaskbarTask.active");
			expect(active).toContain(CHECKER);
			expect(active).toContain(PUSHED);
			// comctl32's `TAB_EraseTabInterior`: the checker only where
			// ButtonHilight is the Window color, else solid Scrollbar, spread
			// under the pushed bevel by the scheme's switch (the last
			// box-shadow, so it wins over the mixin's).
			expect(active).toMatch(
				/box-shadow: inset calc\(var\(--window-border-size\) \* -1\) calc\(var\(--window-border-size\) \* -1\) var\(--color-system-01\), inset var\(--window-border-size\) var\(--window-border-size\) var\(--color-system-07\), [^;]*, inset 0 0 0 calc\(var\(--taskbar-solid-active\) \* 10000\) var\(--package-color-scroll-bar-track, var\(--color-system-03\)\);/,
			);
			expect(block(".classicyTaskbarTask.active > *")).toContain(SHIFT);
			expect(
				block(".classicyTaskbarTask.active .classicyTaskbarTaskLabel"),
			).toContain("font-weight: bold");
			expect(at(".classicyTaskbarTask.active")).toBeGreaterThan(
				at(".classicyTaskbarTask.pressed"),
			);
			expect(rulesOn(/\.classicyTaskbarTask\.collapsed/)).toEqual([]);
			expect(
				rulesOn(/\.classicyTaskbar(Start|Task|TrayIcon)\b[^ ]*:hover/),
			).toEqual([]);
		});

		// A window whose app asks for attention (plan 0020-w98 E3, B17; WIG
		// Ch.10 "Message Notification", p.212): raised, its interior Hilight
		// and its title HilightText (comctl32's TCIS_HIGHLIGHTED button),
		// toggling with the plain face three times, 530 ms a phase, then held;
		// not animated under reduced motion; before the held press, which
		// pushes it in on that face.
		it("flashes an attention button Hilight three times, then holds it", () => {
			const attention = block("=windows98] .classicyTaskbarTaskAttention");
			expect(attention).toContain("background: var(--color-highlight)");
			expect(attention).toContain(
				"color: var(--package-color-selection-text, var(--color-white))",
			);
			expect(attention).toContain(
				"animation: classicyWindows98TaskAttention 1060ms step-end 3",
			);
			expect(attention).not.toContain("box-shadow");
			const frames =
				/@keyframes classicyWindows98TaskAttention\s*\{([\s\S]*?\})\s*\}/.exec(
					css,
				)?.[1] ?? "";
			expect(frames).toMatch(
				/0%\s*\{[^}]*background: var\(--color-highlight\)/,
			);
			expect(frames).toMatch(
				/50%,\s*100%\s*\{[^}]*background: var\(--color-system-03\)/,
			);
			expect(css).toMatch(
				/@media \(prefers-reduced-motion: reduce\)\s*\{[^{}]*\.classicyTaskbarTaskAttention\s*\{\s*animation: none;/,
			);
			expect(at(".classicyTaskbarTaskAttention")).toBeGreaterThan(
				at("=windows98] .classicyTaskbarTask"),
			);
			expect(at(".classicyTaskbarTask.pressed")).toBeGreaterThan(
				at(".classicyTaskbarTaskAttention"),
			);
		});

		// The status area: a pane the buttons' height in one sunken ring
		// (BDR_SUNKENOUTER), its icons flat in 20 px cells with no bevel at
		// rest, held or open, the menu bar extensions at the same pitch and
		// plain under the pointer, and the clock 5 px in from either side.
		it("draws the status area as one sunken ring of flat icons and the clock", () => {
			const tray = block("=windows98] .classicyTaskbarTray");
			expect(tray).toContain("height: var(--taskbar-button-height)");
			expect(tray).toContain("padding: 0 var(--taskbar-tray-padding-x)");
			expect(tray).toContain(
				`box-shadow: inset ${NEG_B} ${NEG_B} var(--color-system-01), inset ${B} ${B} var(--color-system-05);`,
			);
			const icon = block("=windows98] .classicyTaskbarTrayIcon");
			expect(icon).toContain("width: var(--taskbar-tray-icon-pitch)");
			expect(icon).toContain("background: transparent");
			expect(icon).toContain("box-shadow: none");
			const image = block(".classicyTaskbarTrayIcon img");
			expect(image).toContain("width: var(--taskbar-tray-icon-size)");
			expect(image).toContain("height: var(--taskbar-tray-icon-size)");
			for (const rule of rulesOn(/\.classicyTaskbarTrayIcon\b/))
				expect(rule.body, rule.selectors.join(", ")).not.toMatch(
					/box-shadow: inset|repeating-conic-gradient/,
				);
			expect(rulesOn(/\.classicyTaskbarTrayIcon(\.open|:active)/)).toEqual([]);
			const extension = block(
				".classicyTaskbarTray .classicyDesktopMenuExtension",
			);
			expect(extension).toContain("width: var(--taskbar-tray-icon-pitch)");
			const hovered = block(
				".classicyTaskbarTray .classicyDesktopMenuExtension:hover",
			);
			expect(hovered).toContain("background: transparent");
			expect(hovered).toContain("color: var(--color-black)");
			expect(
				block(".classicyTaskbarTray .classicyDesktopMenuExtensionTrigger img"),
			).toContain("width: var(--taskbar-tray-icon-size)");
			const clock = block(".classicyTaskbarClock");
			expect(clock).toContain("padding: 0 var(--taskbar-clock-padding-x)");
			expect(clock).toContain("font-size: var(--ui-font-size)");
			expect(clock).toContain("font-variant-numeric: tabular-nums");
		});

		// The bands (plan 0020-w98 E1): each band's gripper comctl32's rebar
		// draws (`GRIPPER_WIDTH` 3 of BDR_RAISEDINNER on ButtonFace,
		// `REBAR_PRE_GRIPPER` 2 before it and inset 2 from the row's top and
		// bottom, `REBAR_ALWAYS_SPACE` 4 after it); Quick Launch's band ending
		// `REBAR_POST_CHILD` 4 after its toolbar, its buttons flat toolbar
		// buttons 23 wide (BDR_RAISEDINNER under the pointer, BDR_SUNKENOUTER
		// pressed there, the icon a pixel down and right), Show Desktop's
		// glyph pixel art from the theme's tokens; and the window buttons, past
		// one row, at their least width beside the up-down control (16 wide,
		// the buttons' height, its two buttons _LittleArrows.scss's).
		it("draws the grippers, Quick Launch's flat buttons and the window buttons' up/down control", () => {
			const THIN_RAISED = `box-shadow: inset ${B} ${B} var(--color-system-01), inset ${NEG_B} ${NEG_B} var(--color-system-05)`;
			const THIN_SUNKEN = `box-shadow: inset ${B} ${B} var(--color-system-05), inset ${NEG_B} ${NEG_B} var(--color-system-01)`;
			const gripper = block("=windows98] .classicyTaskbarGripper");
			expect(gripper).toContain("width: var(--taskbar-gripper-width)");
			expect(gripper).toContain(
				"height: calc(var(--taskbar-button-height) - var(--taskbar-gripper-inset) - var(--taskbar-gripper-inset))",
			);
			expect(gripper).toContain(
				"margin: 0 var(--taskbar-gripper-gap) 0 var(--taskbar-gripper-inset)",
			);
			expect(gripper).toContain("background: var(--color-system-03)");
			expect(gripper).toContain(THIN_RAISED);
			const band = block("=windows98] .classicyTaskbarQuickLaunch");
			expect(band).toContain("height: var(--taskbar-button-height)");
			expect(band).toContain("padding-right: var(--taskbar-band-end-gap)");
			const button = block("=windows98] .classicyTaskbarQuickLaunchButton");
			expect(button).toContain(
				"width: var(--taskbar-quick-launch-button-width)",
			);
			expect(button).toContain("background: transparent");
			expect(button).toContain("box-shadow: none");
			expect(block(".classicyTaskbarQuickLaunchButton:hover")).toContain(
				THIN_RAISED,
			);
			expect(block(".classicyTaskbarQuickLaunchButton:hover:active")).toContain(
				THIN_SUNKEN,
			);
			expect(
				block(".classicyTaskbarQuickLaunchButton:hover:active > *"),
			).toContain(SHIFT);
			expect(
				block(".classicyTaskbarQuickLaunchButton:focus-visible"),
			).toContain(`outline-offset: calc(${B} * -1)`);
			expect(block(".classicyTaskbarQuickLaunchIcon")).toContain(
				"width: var(--icon-small-size)",
			);
			const glyph = block(".classicyTaskbarShowDesktopIcon");
			expect(glyph).toContain("width: calc(var(--pixel-unit) * 16)");
			for (const ink of [
				"var(--color-system-07)",
				"var(--desktop-background-color)",
				"var(--color-system-05)",
				"var(--color-window-document)",
				"var(--package-color-title-bar-active, var(--color-highlight))",
				"var(--color-black)",
			])
				expect(glyph).toContain(`linear-gradient(${ink}, ${ink})`);
			expect(glyph).not.toMatch(/url\(/);
			// Past one row: every button at its least width.
			expect(block(".classicyTaskbarTasksPaged > li")).toContain(
				"flex: 0 0 var(--taskbar-button-min-width)",
			);
			expect(at(".classicyTaskbarTasksPaged > li")).toBeGreaterThan(
				at(".classicyTaskbarTasks > li"),
			);
			const pager = block("=windows98] .classicyTaskbarPager");
			expect(pager).toContain("width: var(--window-scrollbar-size)");
			expect(pager).toContain("height: var(--taskbar-button-height)");
			expect(pager).toContain("margin-right: var(--taskbar-button-gap)");
			const arrows = block(
				"=windows98] .classicyTaskbarPagerUp,\n  .classicyDesktop[data-classicy-appearance=windows98] .classicyTaskbarPagerDown",
			);
			expect(arrows).toContain(RAISED);
			// The up-down control's triangles: ButtonText (the scheme's `text`
			// family, black its fallback) at rest, embossed dimmed.
			expect(block("=windows98] .classicyTaskbarPagerUp")).toContain(
				"linear-gradient(var(--package-color-text-button, var(--color-black)), var(--package-color-text-button, var(--color-black))) calc(var(--pixel-unit) * 5) calc(var(--pixel-unit) * 6)/calc(var(--pixel-unit) * 5) var(--pixel-unit) no-repeat",
			);
			const dimmed = block(".classicyTaskbarPagerDown:disabled");
			expect(dimmed).toContain(
				"linear-gradient(var(--color-system-05), var(--color-system-05))",
			);
			expect(dimmed).toContain(
				"linear-gradient(var(--color-system-01), var(--color-system-01))",
			);
			expect(block(".classicyTaskbarPagerUp:active:not(:disabled)")).toContain(
				`box-shadow: inset 0 0 0 ${B} var(--color-system-05)`,
			);
		});
	});

	// The Start menu and the status area's pop-ups (plan 0020-w98 §3 and §7;
	// WIG Ch.3 "The Start Button", p.15): one dialog frame around the
	// banner and the items, the banner's gradient and upward text from the
	// package's `startMenu` colors, 32 px icons on 32 px rows at the first
	// level and the menus' 16 px ones in every submenu, and a tray icon's
	// panel in the same dialog frame.
	describe("the Start menu and the tray's pop-ups", () => {
		const selectors = selectorsOf(css);
		const block = (tail: string) =>
			new RegExp(
				`${tail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`,
			).exec(css)?.[1] ?? "";
		const B = "var(--window-border-size)";
		const B2 = `calc(${B} + ${B})`;
		const NEG_B = `calc(${B} * -1)`;
		const NEG_B2 = `calc(${B2} * -1)`;
		// The dialog frame (WS_DLGFRAME, DS_MODALFRAME): the window edge's
		// two rings (EDGE_RAISED) and one ring of ButtonFace inside them,
		// SM_CXDLGFRAME 3: _Menu.scss's menu frame.
		const DIALOG_FRAME = [
			`padding: calc(${B2} + ${B})`,
			"background: var(--color-system-03)",
			`box-shadow: inset ${NEG_B} ${NEG_B} var(--color-system-07), inset ${B} ${B} var(--color-system-02), inset ${NEG_B2} ${NEG_B2} var(--color-system-05), inset ${B2} ${B2} var(--color-system-01)`,
		];
		const FIRST_LEVEL =
			".classicyStartMenu > .classicyMenuWrapper > .classicyContextMenu";

		it("draws one dialog frame around the banner and the items, the menu's own cleared", () => {
			const surface = block(
				"=windows98] .classicyBevelButtonPopup.classicyStartMenu",
			);
			for (const declaration of DIALOG_FRAME)
				expect(surface).toContain(declaration);
			const list = block(`=windows98] ${FIRST_LEVEL}`);
			expect(list).toContain("padding: 0");
			expect(list).toContain("box-shadow: none");
			// After the menus' frame (_Menu.scss), which it outranks.
			expect(
				selectors.findIndex((selector) => selector.endsWith(` ${FIRST_LEVEL}`)),
			).toBeGreaterThan(
				selectors.findIndex((selector) =>
					selector.endsWith(
						":is(.classicyMenu, .classicySubMenu, .classicyContextMenu, .classicyContextSubMenu)",
					),
				),
			);
			expect(
				block(
					".classicyStartMenu > .classicyMenuWrapper > .classicyMenuScrollShadow",
				),
			).toContain("box-shadow: none");
		});

		// Windows 98 SE's explorer.exe bitmap 157, drawn smooth from the
		// package's colors (each with a core token behind it, for a theme
		// of another package): navy above the 98th row from the foot, blue
		// from the 52nd to the 28th, back toward navy in the foot's row; the
		// text white, the title bold and the edition regular, set up from
		// the foot (the banner turned half a turn, so its own top is the
		// menu's bottom).
		it("draws the banner's gradient and upward text from the startMenu colors", () => {
			const BANNER =
				"var(--package-color-start-menu-banner, var(--color-highlight))";
			const GRADIENT =
				"var(--package-color-start-menu-banner-gradient, var(--color-highlight))";
			const banner = block("=windows98] .classicyStartMenuBanner");
			expect(banner).toContain(
				`background: linear-gradient(color-mix(in srgb, ${BANNER} 15%, ${GRADIENT}) 0, ${BANNER} calc(var(--pixel-unit) * 28), ${BANNER} calc(var(--pixel-unit) * 52), ${GRADIENT} calc(var(--pixel-unit) * 98))`,
			);
			expect(banner).toContain(
				"color: var(--package-color-start-menu-banner-text, var(--color-white))",
			);
			expect(banner).toContain("width: var(--start-menu-banner-width)");
			expect(banner).toContain("padding: var(--start-menu-banner-inset) 0 0");
			expect(banner).toContain("font-family: var(--ui-font)");
			expect(banner).toContain("font-size: var(--start-menu-banner-font-size)");
			expect(banner).toContain("line-height: var(--start-menu-banner-width)");
			expect(banner).toContain("writing-mode: vertical-rl");
			expect(banner).toContain("rotate: 180deg");
			expect(banner).toContain("justify-content: flex-start");
			expect(block(".classicyStartMenuBannerTitle")).toContain(
				"font-weight: bold",
			);
			expect(block(".classicyStartMenuBannerEdition")).toContain(
				"font-weight: normal",
			);
			// Every package color read carries a core token behind it.
			const reads = [
				...css.matchAll(
					/var\((--package-color-start-menu-[a-z-]+)(, var\(--color-[a-z0-9-]+\))?\)/g,
				),
			];
			expect(new Set(reads.map(([, name]) => name))).toEqual(
				new Set([
					"--package-color-start-menu-banner",
					"--package-color-start-menu-banner-gradient",
					"--package-color-start-menu-banner-text",
				]),
			);
			for (const [, name, fallback] of reads)
				expect(fallback, name).toBeDefined();
		});

		// The package's own banner (Explorer's bitmap 157, `startMenuBanner`)
		// upright at the banner's foot, the space above it its first row
		// stretched (Explorer's StretchBlt of row 0 over a BitBlt at the
		// foot): one border image, its 1-row top slice over all but the last
		// 232 pixels, its middle at its own size below; the gradient, the
		// turn and the text's inset gone.
		it("draws the banner bitmap at the foot with its first row stretched above", () => {
			const art = block(".classicyStartMenuBanner.classicyStartMenuBannerArt");
			const name = classicyAssetVarName("systemArt", "startMenuBanner");
			expect(name).toBe("--classicy-art-start-menu-banner");
			expect(art).toContain(
				`border-image: var(${name}, none) 1 0 0 0 fill/calc(100% - var(--pixel-unit) * 232) 0 0 0 stretch`,
			);
			expect(art).toContain("background: none");
			expect(art).toContain("padding: 0");
			expect(art).toContain("rotate: none");
			expect(art).toContain("image-rendering: pixelated");
		});

		// The first level's rows are the large icons' height, each icon 2 px
		// in and 4 px before its label; the rule reaches the menu's own
		// rows alone, so every submenu keeps the menus' small icons.
		it("sets 32 px icons on 32 px rows at the first level, and the menus' 16 px ones in its submenus", () => {
			const row = block(`=windows98] ${FIRST_LEVEL} > .classicyMenuItem`);
			expect(row).toContain("height: var(--start-menu-item-height)");
			expect(row).toContain(
				"padding: 0 var(--menu-item-padding-x) 0 var(--start-menu-icon-inset)",
			);
			const icon = block(`${FIRST_LEVEL} > .classicyMenuItem > p > img`);
			expect(icon).toContain("width: var(--start-menu-icon-size)");
			expect(icon).toContain("height: var(--start-menu-icon-size)");
			expect(icon).toContain("margin-right: var(--start-menu-icon-gap)");
			// Only the first level: no knob of the family reaches a submenu.
			for (const selector of selectors.filter((s) =>
				/\.classicyStartMenu\b/.test(s),
			))
				expect(selector, selector).not.toMatch(/classicyContextSubMenu/);
			const submenuIcon = block(
				":is(.classicyMenu, .classicySubMenu, .classicyContextMenu, .classicyContextSubMenu) .classicyMenuItem img",
			);
			expect(submenuIcon).toContain("width: var(--icon-small-size)");
			expect(submenuIcon).toContain("height: var(--icon-small-size)");
		});

		// Plan 0020-w98 E4: "Show small icons in Start menu" gives the first
		// level a submenu's rows and 16 px icons.
		it("gives the first level a submenu's rows and icons under small icons", () => {
			const small =
				".classicyStartMenu.classicyStartMenuSmallIcons > .classicyMenuWrapper > .classicyContextMenu";
			const row = block(`=windows98] ${small} > .classicyMenuItem`);
			expect(row).toContain("height: auto");
			expect(row).toContain(
				"padding: calc(var(--pixel-unit) * 3) var(--menu-item-padding-x)",
			);
			const icon = block(`${small} > .classicyMenuItem > p > img`);
			expect(icon).toContain("width: var(--icon-small-size)");
			expect(icon).toContain("height: var(--icon-small-size)");
			expect(icon).toContain("margin-right: var(--layout-item-gap)");
		});

		// A tray icon's panel (the Sound slider) wears the dialog frame, as
		// Windows 98's tray volume pop-up (sndvol32, DS_MODALFRAME) did; it
		// outranks the bevel pop-up panel's own rule, which comes later.
		it("draws a tray icon's panel in the dialog frame, over the bevel pop-up panel's", () => {
			const tray =
				".classicyBevelButtonPopup.classicyBevelButtonPopupPanel.classicyTaskbarTrayPopup";
			const panel = block(`=windows98] ${tray}`);
			for (const declaration of DIALOG_FRAME)
				expect(panel).toContain(declaration);
			expect(
				block(
					"=windows98] .classicyBevelButtonPopup.classicyBevelButtonPopupPanel",
				),
			).toContain(`padding: ${B2}`);
			// A module's menu is every menu's: no rule of its own.
			expect(
				selectors.filter(
					(s) => /\.classicyTaskbarTrayPopup\b/.test(s) && !s.endsWith(tray),
				),
			).toEqual([]);
		});
	});

	// Plan 0020-w98 E2: the shell's own dialogs at Windows 98 SE's shell32
	// templates (dialog units at MS Sans Serif 8, as `shellDialog` knobs), the
	// dim behind Shut Down and Log Off, and the screens Stand by and Shut
	// down leave.
	describe("the shell's dialogs and power screens", () => {
		// The selector lists on one line each, so a list reads as written.
		const flat = css.replace(/,\n\s*/g, ", ");
		const block = (tail: string) =>
			new RegExp(
				`${tail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`,
			).exec(flat)?.[1] ?? "";
		const knobs = (
			windows98 as unknown as {
				defaults: { measurements: Record<string, Record<string, number>> };
			}
		).defaults.measurements.shellDialog;
		const kebab = (key: string) =>
			key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

		it("reads only the shellDialog knobs the package declares, every one of them", () => {
			const read = new Set(
				[...css.matchAll(/var\((--shell-dialog-[a-z-]+)\)/g)].map(
					([, name]) => name,
				),
			);
			expect(read).toEqual(
				new Set(
					Object.keys(knobs).map((key) => `--shell-dialog-${kebab(key)}`),
				),
			);
			// The templates' widths: 211, 227 and 188 dialog units.
			expect(knobs.shutDownWidth).toBe(317);
			expect(knobs.runWidth).toBe(341);
			expect(knobs.logOffWidth).toBe(282);
		});

		it("draws Shut Down 317 wide, its choices under the question and its 78 px buttons from under the text", () => {
			const root = block("=windows98] .classicyShellDialogShutDown");
			expect(root).toContain("width: var(--shell-dialog-shut-down-width)");
			expect(root).toContain(
				"padding: var(--layout-dialog-edge) var(--layout-dialog-edge) var(--shell-dialog-shut-down-bottom)",
			);
			expect(
				block(".classicyShellDialogShutDown .classicyShellDialogOptions"),
			).toContain("gap: var(--shell-dialog-option-gap)");
			expect(
				block(
					".classicyShellDialogShutDown .classicyShellDialogButtons > .classicyButton",
				),
			).toContain("min-width: var(--shell-dialog-shut-down-button-width)");
			expect(
				block(
					"=windows98] .classicyShellDialogShutDown .classicyShellDialogButtons",
				),
			).toContain("gap: var(--shell-dialog-button-gap)");
			expect(css).toMatch(
				/\.classicyShellDialogShutDown \.classicyShellDialogButtons \{\s*justify-content: flex-start;\s*margin-left: var\(--shell-dialog-shut-down-buttons-inset\);/,
			);
		});

		it("draws Run 341 wide, its buttons right-aligned at the margin in Windows' order", () => {
			expect(block("=windows98] .classicyShellDialogRun")).toContain(
				"width: var(--shell-dialog-run-width)",
			);
			expect(
				block(
					".classicyShellDialogRun .classicyShellDialogButtons > .classicyButton.default, .classicyDesktop[data-classicy-appearance=windows98] .classicyShellDialogRun .classicyShellDialogButtons > [data-classicy-role=default]",
				),
			).toContain("order: 10");
			expect(css).not.toMatch(
				/\.classicyShellDialogRun \.classicyShellDialogButtons \{[^}]*justify-content/,
			);
			expect(
				block(".classicyShellDialogRun .classicyShellDialogField"),
			).toContain("gap: var(--shell-dialog-run-body-gap)");
		});

		it("draws Log Off 282 wide, its icon at (12, 10) and Yes and No 65 px from under the question", () => {
			const root = block("=windows98] .classicyShellDialogLogOff");
			expect(root).toContain(
				"padding: var(--shell-dialog-log-off-top) var(--shell-dialog-log-off-side) var(--shell-dialog-log-off-bottom)",
			);
			expect(
				block(".classicyShellDialogLogOff .classicyShellDialogIcon"),
			).toContain("margin-top: 0");
			expect(
				block(
					".classicyShellDialogLogOff .classicyShellDialogButtons > .classicyButton",
				),
			).toContain("width: var(--shell-dialog-log-off-button-width)");
		});

		it("dims the screen with a 50% checker of black and draws LOGOS.SYS orange on black", () => {
			const constants = block(
				"=windows98] .classicyShellDialogDim, .classicyDesktop[data-classicy-appearance=windows98] .classicyPowerScreen",
			);
			expect(constants).toContain("--windows98-shell-black: #000000");
			expect(constants).toContain("--windows98-shell-safe-text: #ff8000");
			expect(block("=windows98] .classicyShellDialogDim")).toContain(
				"background: repeating-conic-gradient(var(--windows98-shell-black) 0% 25%, transparent 0% 50%) 0 0/calc(var(--pixel-unit) * 2) calc(var(--pixel-unit) * 2)",
			);
			// The screen's own rule, not the constants' list it ends.
			const screen = block(
				"\n  .classicyDesktop[data-classicy-appearance=windows98] .classicyPowerScreen",
			);
			expect(screen).toContain("color: var(--windows98-shell-safe-text)");
			expect(screen).toContain("background: var(--windows98-shell-black)");
			expect(block("=windows98] .classicyPowerScreenMessage")).toContain(
				"font-weight: bold",
			);
		});
	});

	// Menu keyboard navigation (the audit's 7.7): the core marks the root
	// list `focused` while the keyboard moved the tracking last, until the
	// pointer moves. The pointer-alone rules stand down then, and an item
	// under a resting pointer shows plain (a dimmed one embossed again, its
	// mark and arrow too), so the keyboard's item is the one band, as
	// Windows moves its one selection (WIG Ch.7 "Menu Items", p.106).
	it("tracks the keyboard's menu item alone while the keyboard moved last", () => {
		const selectors = selectorsOf(css);
		const has = (tail: string) =>
			selectors.some((selector) => selector.endsWith(tail));
		const block = (tail: string) =>
			new RegExp(
				`${tail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`,
			).exec(css)?.[1] ?? "";
		const menus =
			":is(.classicyMenu, .classicySubMenu, .classicyContextMenu, .classicyContextSubMenu)";
		const keyed = ":where(.classicyMenuWrapper > .focused)";
		const keyedMenus = `:is(${keyed}${menus}, ${keyed} ${menus})`;
		const resting = ":hover:not(:focus-visible, .open)";
		// The pointer-alone rules exclude a keyed tree.
		expect(
			has(
				`${menus}:hover .classicyMenuItem:not(:hover, .open, ${keyed} *):focus-visible`,
			),
		).toBe(true);
		expect(
			has(
				`${menus}:hover .classicyMenuItem.disabled:not(:hover, .open, ${keyed} *):focus-visible`,
			),
		).toBe(true);
		expect(
			has(`${menus}:hover .classicyMenuItem:not(:hover, .open):focus-visible`),
		).toBe(false);
		// A resting pointer's item is plain, a dimmed one embossed.
		const plain = block(`${keyedMenus} .classicyMenuItem${resting}`);
		// MenuText, the scheme's ButtonText (WindowText behind it).
		expect(plain).toContain(
			"color: var(--package-color-text-button, var(--color-black))",
		);
		expect(plain).toContain("background-color: transparent");
		const dimmed = block(`${keyedMenus} .classicyMenuItem.disabled${resting}`);
		// GrayText, ButtonShadow behind it.
		expect(dimmed).toContain(
			"color: var(--package-color-text-gray, var(--color-system-05))",
		);
		expect(dimmed).toContain("text-shadow:");
		expect(dimmed).toContain("background-color: transparent");
		for (const mark of [
			".classicyMenuItemCheck.checked::before",
			".classicyMenuItemCheck.classicyMenuItemBullet.checked::before",
		])
			expect(
				block(`${keyedMenus} .classicyMenuItem.disabled${resting} ${mark}`),
			).toContain("var(--color-system-01)");
		expect(
			block(
				`${keyedMenus} .classicyMenuItemChildMenuIndicator.disabled${resting}::after`,
			),
		).toContain("var(--color-system-01)");
	});

	// Access keys (the audit's 7.1 and 8.9): the core wraps an access key's
	// character in `data-classicy-part="access-key"` in a menu title, a menu
	// item or a control label; the package underlines it in the text's ink, a
	// pixel thick, a pixel below the baseline, as Windows 95/98's DrawText
	// draws a prefixed character (WIG Ch.7 "Menu Titles", p.106, Figure 7.4;
	// Ch.8 "Navigation in Secondary Windows", pp.148-149).
	it("underlines an access key in the menus, the menu bar, the control labels, the push buttons and the tabs", () => {
		const block = (tail: string) =>
			new RegExp(
				`${tail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`,
			).exec(css)?.[1] ?? "";
		// The labels' rule draws a check box's and an option button's too
		// (ClassicyControlLabels); a push button and a tab carry their own
		// (the remaining chapters' audit's 4.11; WIG Ch.4 "Access Keys",
		// p.27; Appendix B Table B.5, p.360).
		for (const owner of [
			".classicyMenuItem",
			".classicyControlLabel",
			".classicyButton",
			".classicyTabButton",
		]) {
			const rule = block(`${owner} [data-classicy-part=access-key]`);
			expect(rule, owner).toContain("text-decoration-line: underline");
			expect(rule, owner).toContain("text-decoration-color: currentColor");
			expect(rule, owner).toContain(
				"text-decoration-thickness: var(--window-border-size)",
			);
			expect(rule, owner).toContain(
				"text-underline-offset: var(--window-border-size)",
			);
		}
		// One rule for every menu, the bar's titles included: not scoped to the
		// pull-downs.
		expect(
			selectorsOf(css).filter((selector) =>
				selector.endsWith(" .classicyMenuItem [data-classicy-part=access-key]"),
			),
		).toEqual([
			".classicyDesktop[data-classicy-appearance=windows98] .classicyMenuItem [data-classicy-part=access-key]",
		]);
	});

	// The rules keyed on the hooks of the WIG audit's controls pass: a check
	// list's check boxes (7.25), an inactive window's selections (6.4 /
	// 13.8), a meter's zone patterns (14.5) and a ToolTip at the pointer
	// (7.27); and the split view's (6.12 / 6.13).
	describe("the controls' hooks", () => {
		const scope = ".classicyDesktop[data-classicy-appearance=windows98]";
		const rule = (selector: string) => {
			// The declarations of every rule whose selector list holds
			// `selector`, in source order.
			const full = `${scope} ${selector}`;
			let declarations = "";
			let at = css.indexOf(full);
			while (at >= 0) {
				const open = css.indexOf("{", at);
				const header = css.slice(
					Math.max(css.lastIndexOf("}", at), css.lastIndexOf("{", at)) + 1,
					open,
				);
				if (splitSelectors(header.trim()).includes(full))
					declarations += css.slice(open + 1, css.indexOf("}", open));
				at = css.indexOf(full, open);
			}
			return declarations;
		};

		// WIG Ch.7 "Extended and Multiple Selection List Boxes" (pp.122-123,
		// Figure 7.15); Ch.13 "Flat Appearance" (p.309): the flat 13-px box,
		// a ButtonShadow ring outside a ButtonFace one on Window white, the
		// 7 x 7 check while the row is chosen; the chosen row itself plain.
		it("draws a check list's flat check boxes and leaves its chosen rows plain", () => {
			const box = rule(
				".classicyListBoxOption > [data-classicy-part=list-check]",
			);
			expect(box).toContain("display: block");
			expect(box).toContain("width: var(--checkbox-size)");
			expect(box).toContain("height: var(--checkbox-size)");
			expect(box).toContain("background: var(--color-window-document)");
			expect(box).toContain(
				"inset 0 0 0 var(--window-border-size) var(--color-system-05)",
			);
			expect(box).toContain(
				"inset 0 0 0 calc(var(--window-border-size) + var(--window-border-size)) var(--color-system-03)",
			);
			const checked = rule(
				":where(.classicyListBoxOption).selected > [data-classicy-part=list-check]",
			);
			// The check's top pixel, three in from the right of its 7 columns,
			// and its bottom one, over Window white.
			expect(checked).toContain(
				"linear-gradient(var(--color-black), var(--color-black)) calc(var(--pixel-unit) * 9) calc(var(--pixel-unit) * 3)/var(--pixel-unit) var(--pixel-unit) no-repeat",
			);
			expect(checked).toContain(
				"calc(var(--pixel-unit) * 5) calc(var(--pixel-unit) * 9)/var(--pixel-unit) var(--pixel-unit) no-repeat",
			);
			expect(checked.trim().endsWith("var(--color-window-document);")).toBe(
				true,
			);
			const dimmed = rule(
				":where(.classicyListBoxOption).disabled.selected > [data-classicy-part=list-check]",
			);
			expect(dimmed).toContain("linear-gradient(var(--color-system-05)");
			expect(dimmed.trim().endsWith("var(--color-system-03);")).toBe(true);
			expect(
				rule(
					":where(.classicyListBox).disabled .classicyListBoxOption > [data-classicy-part=list-check]",
				),
			).toContain("background: var(--color-system-03)");
			const row = rule(
				".classicyListBoxCheckboxes :where(.classicyListBoxOption).selected",
			);
			expect(row).toContain("color: var(--color-black)");
			expect(row).toContain("background-color: transparent");
			expect(
				rule(
					".classicyListBoxCheckboxes :where(.classicyListBoxOption).selected:focus",
				),
			).toContain("outline-color: var(--color-black)");
			// A plain list box keeps its Hilight in an inactive window (user32's
			// LISTBOX): no rule reads `inactive` on the list.
			expect(
				selectorsOf(css).some((selector) =>
					/\.classicyListBox(?:[.:][\w-]+)*\.inactive/.test(selector),
				),
			).toBe(false);
		});

		// WIG Ch.6 "Activating and Deactivating Windows" (p.81); Ch.13
		// "Highlighting" (p.318); comctl32's LVS_SHOWSELALWAYS and
		// TVS_SHOWSELALWAYS: ButtonFace under WindowText, the icon unblended,
		// no focus rectangle.
		it("draws an inactive window's list view, tree and icon selections in ButtonFace", () => {
			const list =
				".classicyTableContainer:not(.classicyFileBrowserViewTableContainer)";
			for (const [selector, property] of [
				[`${list}.inactive :where(.classicyTableRow).selected`, "background"],
				[
					".classicyFileBrowserViewTableContainer.inactive :where(.classicyFileBrowserViewTableRow).selected .classicyFileBrowserViewTableRowIconLabel",
					"background",
				],
				[
					".classicyTree.inactive :where(.classicyTreeNodeLabelHolder:not(.classicyFileOpenDialogWell *)).selected .classicyTreeNodeLabel",
					"background-color",
				],
			]) {
				const declarations = rule(selector);
				expect(declarations, selector).toContain("color: var(--color-black)");
				expect(declarations, selector).toContain(
					`${property}: var(--color-system-03)`,
				);
			}
			for (const selector of [
				`${list}.inactive:focus :where(.classicyTableRow).focused`,
				".classicyFileBrowserViewTableContainer.inactive:focus :where(.classicyFileBrowserViewTableRow).focused .classicyFileBrowserViewTableRowIconLabel",
				".classicyTree.inactive .classicyTreeNodeLabelHolder:not(.classicyFileOpenDialogWell *):focus .classicyTreeNodeLabel",
			])
				expect(rule(selector), selector).toContain("outline: none");
			expect(
				rule(
					".classicyFileBrowserViewTableContainer.inactive :where(.classicyFileBrowserViewTableRow).selected .classicyFileBrowserViewTableDisclosure::after",
				),
			).toContain("content: none");
			const icon =
				".classicyIcon.inactive.selected:not(.classicyFileDropTarget)";
			expect(
				rule(
					`${icon} .classicyIconMaskOuter:not(.classicyIconSelectedImage)::after`,
				),
			).toContain("background: none");
			const label = rule(`${icon} p`);
			expect(label).toContain("color: var(--color-black)");
			expect(label).toContain("background: var(--color-system-03)");
			expect(label).toContain("outline: none");
		});

		// WIG Ch.14 "Visual Disabilities" (p.329); Ch.13 "Color as a
		// Secondary Form of Information" (p.298): a pattern over the zone's
		// color, the continuous fill masked to its blocks.
		it("patterns a meter's warning zones so they read without their color", () => {
			const stipple =
				"repeating-conic-gradient(var(--color-black) 0 25%, transparent 0 100%) 0 0/calc(var(--pixel-unit) * 2) calc(var(--pixel-unit) * 2)";
			const checker =
				"repeating-conic-gradient(var(--color-black) 0 25%, transparent 0 50%) 0 0/calc(var(--pixel-unit) * 2) calc(var(--pixel-unit) * 2)";
			for (const part of [".classicyMeterFill", ".classicyMeterSegmentOn"]) {
				expect(rule(`.classicyMeterSuboptimal ${part}`), part).toContain(
					`background: ${stipple}, var(--classicy-meter-fill)`,
				);
				expect(rule(`.classicyMeterBad ${part}`), part).toContain(
					`background: ${checker}, var(--classicy-meter-fill)`,
				);
			}
			for (const zone of [".classicyMeterSuboptimal", ".classicyMeterBad"])
				expect(rule(`${zone} .classicyMeterFill`), zone).toContain(
					"mask-image: repeating-linear-gradient(to right, var(--color-black) 0 var(--progress-bar-block-width)",
				);
			// The optimal zone stays solid: no pattern keyed on it.
			expect(
				selectorsOf(css).some((selector) =>
					selector.includes(".classicyMeterOptimal ."),
				),
			).toBe(false);
		});

		// WIG Ch.6 "Splitting Windows" (pp.93-94, Figures 6.11 and 6.12): a
		// closed split's split box is a raised ButtonFace box, and a moving
		// split bar the halftone tracker, ButtonFace checked with its
		// inverse (the audit's 6.12 / 6.13).
		it("draws a split box raised and a moving split bar in the halftone", () => {
			const box = rule(".classicySplitViewSplitBox");
			expect(box).toContain("background-color: var(--color-system-03)");
			expect(box).toMatch(
				/box-shadow: inset calc\(var\(--window-border-size\) \* -1\) calc\(var\(--window-border-size\) \* -1\) var\(--color-system-07\), inset var\(--window-border-size\) var\(--window-border-size\) var\(--color-system-01\)/,
			);
			expect(rule(".classicySplitViewDivider.dragging")).toContain(
				"background: repeating-conic-gradient(var(--color-system-07) 0 25%, var(--color-system-03) 0 50%) 0 0/calc(var(--pixel-unit) * 2) calc(var(--pixel-unit) * 2)",
			);
			// The divider at rest stays flat ButtonFace.
			expect(rule(".classicySplitViewDivider")).toContain(
				"background-color: var(--color-system-03)",
			);
		});

		// The Finder and dialogs' hooks: a label being edited (a slow second
		// click on a selected item's label, or F2) is the list view's edit
		// control, WindowText on Window in a one-pixel WindowFrame border; a
		// drag across empty space, in either view (the list view's under
		// `fileBrowser.regionSelect`, the audit's 5.12), draws DrawFocusRect's
		// dotted rectangle, XORed over what lies under it (white dots under
		// `difference`); and the Open dialog's list, flowing in columns
		// (`fileDialog.listFlow`), sets them Wine's TRAILING_LABEL_PADDING (12)
		// apart.
		it("draws a label being edited, the selection rectangle and the dialog list's columns", () => {
			const field = rule(".classicyIcon .classicyIconRename");
			expect(field).toContain(
				"border: var(--window-border-size) solid var(--color-black)",
			);
			expect(field).toContain("background: var(--color-window-document)");
			expect(field).toContain("color: var(--color-black)");
			expect(field).toContain("outline: none");
			const marquee = rule(".classicyFileBrowserSelect");
			expect(marquee).toContain(
				"border: var(--window-border-size) dotted var(--color-white)",
			);
			expect(marquee).toContain("outline: none");
			expect(marquee).toContain("mix-blend-mode: difference");
			expect(
				rule(".classicyFileOpenDialogWellColumns .classicyTree"),
			).toContain("column-gap: var(--layout-group-gap)");
			// The keyboard's place is the selection and its label's dotted
			// focus rectangle, never the browser's ring on the icon (the base
			// sheet takes it from a selected icon alone).
			expect(rule(".classicyIcon:focus-visible")).toContain("outline: none");
		});

		// Explorer's Rename and New (the remaining chapters' audit's 5.40 and
		// 10.3; WIG Ch.5 "Creation Operations", p.69): a name edited in the
		// details view or on the desktop is the list view's edit control too,
		// WindowText on Window in a one-pixel WindowFrame border, where the
		// name was.
		it("draws a name being edited in the list view and on the desktop as the edit control", () => {
			for (const selector of [
				".classicyFileBrowserViewTableRowContainer .classicyFileBrowserViewTableRename",
				".classicyDesktopIcon .classicyDesktopIconRename",
			]) {
				const field = rule(selector);
				expect(field, selector).toContain(
					"border: var(--window-border-size) solid var(--color-black)",
				);
				expect(field, selector).toContain(
					"background: var(--color-window-document)",
				);
				expect(field, selector).toContain("color: var(--color-black)");
				expect(field, selector).toContain("outline: none");
			}
			expect(rule(".classicyDesktopIcon .classicyDesktopIconRename")).toContain(
				"font-size: var(--desktop-icon-font-size)",
			);
		});

		// WIG Ch.5 "Keyboard Selection" (p.43), "Selection Feedback" (p.36);
		// comctl32's LVIS_FOCUSED (the audit's 5.15): the dotted focus
		// rectangle lies on the focus item's label alone, while it has the
		// focus, WindowText (the desktop's text color on the desktop) or
		// HilightText over a highlighted label; a selected label, or a
		// folder under a drag, takes the highlight and no rectangle.
		it("rings the focus icon's label alone, never every selected label", () => {
			for (const [icon, ink] of [
				[".classicyIcon", "var(--color-black)"],
				[
					".classicyDesktopIcon",
					"var(--package-color-desktop-text, var(--color-white))",
				],
			]) {
				const focused = rule(`${icon}:focus p`);
				expect(focused, icon).toContain(
					`outline: var(--window-border-size) dotted ${ink}`,
				);
				expect(focused, icon).toContain(
					"outline-offset: calc(var(--window-border-size) * -1)",
				);
				expect(rule(`${icon}.selected:focus p`), icon).toContain(
					"outline-color: var(--package-color-selection-text, var(--color-white))",
				);
				for (const state of [".selected", ".classicyFileDropTarget"]) {
					const label = rule(`${icon}${state} p`);
					expect(label, `${icon}${state}`).toContain(
						"background: var(--color-highlight)",
					);
					expect(label, `${icon}${state}`).not.toContain("outline");
				}
			}
			// No browser ring on an icon in a window, focused or not.
			expect(rule(".classicyIcon:focus-visible")).toContain("outline: none");
		});

		// WIG Ch.5 "Command Method Transfers" (p.66): "the system displays
		// icons in a checkerboard dither" while Cut waits for a Paste
		// (LVIS_CUT; the remaining chapters' audit's 5.28): a window's icon
		// takes a two-pixel checker of the Window color, a desktop icon of the
		// Background, in the selection layer the highlight's blend uses, and a
		// list row's icon is faded to half; the selected blend's rule, more
		// specific, stands over a selected cut icon.
		it("dithers a cut icon with its field's color, and fades a cut row's icon", () => {
			expect(
				rule(".classicyIcon.classicyFileCut .classicyIconMaskOuter::after"),
			).toContain(
				"background: repeating-conic-gradient(var(--color-window-document) 0 25%, transparent 0 50%) 0 0/calc(var(--pixel-unit) * 2) calc(var(--pixel-unit) * 2)",
			);
			expect(
				rule(
					".classicyDesktopIcon.classicyFileCut .classicyDesktopIconMaskOuter::after",
				),
			).toContain(
				"background: repeating-conic-gradient(var(--desktop-background-color) 0 25%, transparent 0 50%) 0 0/calc(var(--pixel-unit) * 2) calc(var(--pixel-unit) * 2)",
			);
			expect(
				rule(
					".classicyFileBrowserViewTableRowContainer.classicyFileCut .classicyFileBrowserViewTableRowIcon",
				),
			).toContain("opacity: 0.5");
		});

		// WIG Ch.5 "Direct Manipulation Transfers" (p.67), Figures 5.16 and
		// 5.17; Ch.4 Table 4.1 (the audit's 5.37, 4.6 / 5.32, 5.34): the arrow
		// over everything while a file drag lasts, then the pointer of the
		// drop effect the core publishes on the desktop root
		// (`data-classicy-drop`): no-drop where nothing takes it, the copy and
		// shortcut pointers. Keyed on the root's id, so they outrank every
		// element's own pointer, and after every other pointer rule.
		it("draws the arrow during a file drag, and the drop effect's pointer", () => {
			const root = `${scope}#classicyDesktop`;
			const ruleAt = (full: string) => {
				let declarations = "";
				let at = css.indexOf(full);
				while (at >= 0) {
					const open = css.indexOf("{", at);
					const header = css.slice(
						Math.max(css.lastIndexOf("}", at), css.lastIndexOf("{", at)) + 1,
						open,
					);
					if (splitSelectors(header.trim()).includes(full))
						declarations += css.slice(open + 1, css.indexOf("}", open));
					at = css.indexOf(full, open);
				}
				return declarations;
			};
			const dragging = `${root}[data-classicy-drop]`;
			expect(ruleAt(dragging)).toContain("cursor: default");
			expect(ruleAt(`${dragging} *`)).toContain("cursor: default");
			// The refused drop's pointer is Windows 98's own Unavailable (the
			// `notAllowed` role, USER.EXE's cursor 110), the host's `no-drop`
			// behind it; USER.EXE has no copy or link pointer.
			const notAllowed =
				'cursor: var(--classicy-cursor-not-allowed, url("data:,")) var(--classicy-cursor-not-allowed-hotspot, 0 0), no-drop';
			for (const [value, cursor] of [
				["none", notAllowed],
				["copy", "cursor: copy"],
				["link", "cursor: alias"],
			]) {
				const effect = `${root}[data-classicy-drop=${value}]`;
				const flatRule = (text: string) => text.replace(/\s+/g, " ");
				expect(flatRule(ruleAt(effect))).toContain(cursor);
				expect(flatRule(ruleAt(`${effect} *`))).toContain(cursor);
				expect(css.indexOf(effect)).toBeGreaterThan(css.indexOf(dragging));
			}
			// After every other pointer rule in the sheet: only its own four
			// follow the first.
			expect(css.slice(css.indexOf(dragging)).match(/cursor:/g)).toHaveLength(
				4,
			);
		});

		// WIG Ch.5 "Direct Manipulation Transfers" (p.67), LVIS_DROPHILITED
		// (the audit's 5.38): the details view's folder row under a drag is
		// drawn as a selected one, the name in Hilight and the icon dithered,
		// the base's darkening withdrawn.
		it("draws a list row under a file drag as selected", () => {
			const row =
				".classicyFileBrowserViewTableRowContainer.classicyFileDropTarget";
			expect(rule(row)).toContain("filter: none");
			const label = rule(`${row} .classicyFileBrowserViewTableRowIconLabel`);
			expect(label).toContain(
				"color: var(--package-color-selection-text, var(--color-white))",
			);
			expect(label).toContain("background: var(--color-highlight)");
			expect(
				rule(`${row} .classicyFileBrowserViewTableDisclosure::after`),
			).toContain(
				"background: repeating-conic-gradient(var(--color-highlight) 0 25%, transparent 0 50%)",
			);
		});

		// WIG Ch.5 "Region Selection" (p.42); Windows 98 as shipped,
		// DrawFocusRect's XOR (the audit's 5.14): the desktop's rectangle is
		// one-pixel white dots under `difference`, inverting what lies under
		// them, over the icons (10) and under the windows (20), no outline;
		// and a press that has not moved draws nothing (5.13).
		it("XORs the desktop's selection rectangle over the icons, and hides it until the pointer moves", () => {
			const marquee = rule(".classicyDesktopSelect");
			expect(marquee).toContain(
				"border: var(--window-border-size) dotted var(--color-white)",
			);
			expect(marquee).toContain("outline: none");
			expect(marquee).toContain("mix-blend-mode: difference");
			expect(marquee).toContain("z-index: 11");
			expect(marquee).not.toContain("--package-color-desktop-text");
			expect(
				rule(".classicyDesktopSelect.classicyDesktopSelectEmpty"),
			).toContain("display: none");
		});

		// WIG Ch.7 "Tooltip Controls" (p.133); Wine's TOOLTIPS_Show: 20 below
		// the cursor's hot spot, or 2 above the control.
		it("puts a ToolTip at the pointer under the cursor, or clear of its control above it", () => {
			expect(rule(".classicyBalloonHelpPointerBelow")).toContain(
				"margin-top: var(--tooltip-pointer-offset)",
			);
			expect(rule(".classicyBalloonHelpPointerAbove")).toContain(
				"margin-bottom: calc(var(--pixel-unit) * 2)",
			);
		});

		// The look and the schemes (L2-F): the audit's 7.23 and 14.3, and the
		// per-scheme data re-sourced from Windows 98 SE's SHELL2.INF.
		describe("the schemes' look", () => {
			const scope = ".classicyDesktop[data-classicy-appearance=windows98]";
			const rule = (selector: string) => {
				let declarations = "";
				const full = `${scope} ${selector}`;
				const re = /([^{}]+)\{([^{}]*)\}/g;
				for (const match of css.matchAll(re)) {
					const selectors = splitSelectors(match[1].trim());
					if (selectors.includes(full)) declarations += match[2];
				}
				return declarations;
			};

			// Figure 7.34 (WIG Ch.7 "Toolbars and Status Bars", p.136): Windows
			// 95's toolbar buttons raised at rest; Windows 98's flat (TBSTYLE_FLAT).
			// One knob, `--toolbar-rest-bevel`, the rest bevel's ring width: the
			// raised bevel at rest, one raised ring under the mouse only where the
			// rest bevel is flat, the second sunken ring pressed only where it is
			// raised.
			it("draws a toolbar button's bevel from the rest-bevel knob, flat at 0 and raised at 1", () => {
				const rest = rule(".classicyButtonToolbar .classicyBevelButton");
				expect(rest).toContain(
					"box-shadow: inset calc(var(--toolbar-rest-bevel) * -1) calc(var(--toolbar-rest-bevel) * -1) var(--color-system-07), inset var(--toolbar-rest-bevel) var(--toolbar-rest-bevel) var(--color-system-01)",
				);
				const hot = rule(
					".classicyButtonToolbar .classicyBevelButton:not(.disabled):hover",
				);
				expect(hot).toContain(
					"inset max(0px, var(--window-border-size) - var(--toolbar-rest-bevel)) max(0px, var(--window-border-size) - var(--toolbar-rest-bevel)) var(--color-system-01)",
				);
				const down = rule(
					".classicyButtonToolbar .classicyBevelButton.disabled.checked",
				);
				expect(down).toContain(
					"box-shadow: inset var(--window-border-size) var(--window-border-size) var(--color-system-05), inset calc(var(--window-border-size) * -1) calc(var(--window-border-size) * -1) var(--color-system-01), inset calc(var(--window-border-size) + var(--toolbar-rest-bevel)) calc(var(--window-border-size) + var(--toolbar-rest-bevel)) var(--color-system-07)",
				);
				// The embossed image of a disabled button is drawn whole.
				expect(
					rule(
						".classicyBevelButton.disabled .classicyBevelButtonIcon.classicyIconDimmedImage",
					),
				).toContain("opacity: 1");
			});

			// Wine's DEFWND_ControlColor: the checker only where ButtonHilight is
			// Window, else the solid Scrollbar brush, inverted (DSTINVERT) where
			// the track is held.
			it("fills a solid track with the Scrollbar color and inverts it where it is held", () => {
				const track = rule(".classicyScrollBarTrack");
				expect(track).toContain(
					"background: repeating-conic-gradient(var(--color-system-01) 0 25%, var(--color-system-03) 0 50%)",
				);
				expect(track).toContain(
					"box-shadow: inset 0 0 0 calc(var(--scroll-bar-solid-track) * 10000) var(--package-color-scroll-bar-track, var(--color-system-03))",
				);
				const under = rule(".classicyScrollBarTrack.pressed::before");
				expect(under).toContain(
					"background: repeating-conic-gradient(var(--color-black) 0 25%, var(--color-system-07) 0 50%)",
				);
				expect(under).toContain(
					"box-shadow: inset 0 0 0 calc(var(--scroll-bar-solid-track) * 10000) var(--package-color-scroll-bar-track, var(--color-system-03))",
				);
				const over = rule(".classicyScrollBarTrack.pressed::after");
				expect(over).toContain(
					"box-shadow: inset 0 0 0 calc(var(--scroll-bar-solid-track) * 10000) var(--color-white)",
				);
				expect(over).toContain("mix-blend-mode: difference");
				for (const pseudo of ["::before", "::after"])
					expect(
						rule(
							`.classicyScrollBarVertical .classicyScrollBarTrack.pressed${pseudo}`,
						),
						pseudo,
					).toContain("top: var(--classicy-scroll-page-start)");
			});

			// Each scheme's fonts: the menu's in the menus, the message box's in a
			// message box, the icon's under the icons; each behind the UI font.
			it("sets the menus, message boxes and icon labels in the scheme's fonts", () => {
				const menus = rule(
					":is(.classicyMenu, .classicySubMenu, .classicyContextMenu, .classicyContextSubMenu):not(.classicyDesktopMenu)",
				);
				expect(menus).toContain(
					"font-family: var(--package-font-menu, var(--ui-font))",
				);
				expect(menus).toContain(
					"font-size: var(--package-font-menu-size, var(--ui-font-size))",
				);
				expect(menus).toContain(
					"font-weight: var(--package-font-menu-weight, normal)",
				);
				const message = rule(".classicyAlert .classicyAlertMessage");
				expect(message).toContain(
					"font-family: var(--package-font-message, var(--ui-font))",
				);
				expect(message).toContain(
					"font-size: var(--package-font-message-size, var(--ui-font-size))",
				);
				expect(css).toMatch(
					/font-family: var\(--package-font-icon, var\(--ui-font\)\);\s*font-size: var\(--desktop-icon-font-size\);\s*font-weight: var\(--package-font-icon-weight, normal\)/,
				);
			});

			// ButtonText and GrayText take their own tokens (High Contrast #1's
			// ButtonText is white beside a yellow WindowText; every High Contrast
			// GrayText is green), a disabled control's glyph and a disabled
			// button's label ButtonShadow (DFCS_INACTIVE, DSS_DISABLED).
			it("draws button inks in ButtonText, disabled text in GrayText and disabled glyphs in ButtonShadow", () => {
				expect(rule(".classicyButton")).toContain(
					"color: var(--package-color-text-button, var(--color-black))",
				);
				expect(rule(".classicyTabButton")).toContain(
					"color: var(--package-color-text-button, var(--color-black))",
				);
				expect(rule(".classicyButton:disabled")).toContain(
					"color: var(--color-system-05)",
				);
				const embossed = rule(
					".classicyScrollBarVertical.fits .classicyScrollBarArrowStart::before",
				);
				expect(embossed).toContain("var(--color-system-05)");
				expect(embossed).not.toContain("--package-color-text-gray");
				expect(css).toContain(
					"color: var(--package-color-text-gray, var(--color-system-05))",
				);
			});

			// WIG Ch.14 "Color" (p.334): under forced colors the package keeps its
			// drawing and takes the user's system colors.
			it("keeps every control drawn under forced colors, in the system colors", () => {
				const start = css.indexOf("@media (forced-colors: active)");
				expect(start).toBeGreaterThan(-1);
				const block = css.slice(start);
				expect(block).toContain(
					`${scope},\n    ${scope} * {\n      forced-color-adjust: none;`,
				);
				expect(block).toMatch(
					/color: CanvasText;\s*background-color: Canvas;\s*background-image: none;/,
				);
				// Outside it, text with no color of its own is WindowText.
				expect(css).toContain(
					`${scope} {\n    color: var(--color-black);\n  }`,
				);
				for (const declaration of [
					"--color-system-01: ButtonBorder",
					"--color-system-02: ButtonFace",
					"--color-system-03: ButtonFace",
					"--color-system-05: ButtonBorder",
					"--color-system-07: ButtonText",
					"--color-black: CanvasText",
					"--color-window-document: Canvas",
					"--color-highlight: Highlight",
					"--package-color-selection-text: HighlightText",
					"--package-color-text-button: ButtonText",
					"--package-color-text-gray: GrayText",
					"--package-color-title-bar-active: Highlight",
					"--package-color-title-bar-text: HighlightText",
					"--package-color-help-jump: LinkText",
					"--scroll-bar-solid-track: 0px",
				])
					expect(block, declaration).toContain(declaration);
				// Last in the sheet, so its tokens win over nothing they must not.
				expect(css.lastIndexOf("@media (forced-colors: active)")).toBe(start);
			});
		});
	});

	// The remaining chapters' audit's L4-J1: HyperCard's armed part tool
	// (1.3), the wizard (1.5, 12.23) and the Help topic window (12.17, 12.19,
	// 12.20), each rule keyed on a class the core already sets.
	describe("the assistant, the Help topic window and HyperCard's armed tool", () => {
		const scope = ".classicyDesktop[data-classicy-appearance=windows98]";
		// The declarations of every rule whose selector list holds `selector`.
		const rule = (selector: string) => {
			const full = `${scope} ${selector}`;
			let declarations = "";
			let at = css.indexOf(full);
			while (at >= 0) {
				const open = css.indexOf("{", at);
				const header = css.slice(
					Math.max(css.lastIndexOf("}", at), css.lastIndexOf("{", at)) + 1,
					open,
				);
				if (splitSelectors(header.trim()).includes(full))
					declarations += css.slice(open + 1, css.indexOf("}", open));
				at = css.indexOf(full, open);
			}
			return declarations;
		};
		const etched =
			"inset 0 calc(var(--window-border-size) * -1) var(--color-system-01), inset 0 calc(calc(var(--window-border-size) + var(--window-border-size)) * -1) var(--color-system-05)";
		const flat = (text: string) => text.replace(/\s+/g, " ");

		// WIG Ch.13 "Option-Set Appearance" (pp.304-305), Figure 13.12: the
		// armed entry is a latched toolbar button, the pressed rings round the
		// ButtonHilight / ButtonFace checker, its label WindowText.
		it("latches HyperCard's armed part tool: the checker in the pressed rings", () => {
			const armed = flat(rule(".classicyHyperCardPaletteEntry.selected"));
			expect(armed).toContain("color: var(--color-black)");
			expect(armed).toContain(
				"background: repeating-conic-gradient(var(--color-system-01) 0 25%, var(--color-system-03) 0 50%) 0 0/calc(var(--pixel-unit) * 2) calc(var(--pixel-unit) * 2)",
			);
			// `b.pressed`: ButtonHilight outside at the bottom and right,
			// ButtonDkShadow at the top and left.
			expect(armed).toContain(
				"inset calc(var(--window-border-size) * -1) calc(var(--window-border-size) * -1) var(--color-system-01)",
			);
			expect(armed).toContain(
				"inset var(--window-border-size) var(--window-border-size) var(--color-system-07)",
			);
			// An idle entry keeps the base's look.
			expect(rule(".classicyHyperCardPaletteEntry")).toBe("");
		});

		// WIG Ch.12 "Guidelines for Writing Text for Wizards" (pp.289-290),
		// Figures 12.17 and 12.18; Ch.1 "Consistency" (p.2): a dialog face,
		// the title band ruled off by the etched line, the etched line above
		// the buttons, Back and Next first and touching (comctl32's
		// template), push-button sized, and no page number.
		it("draws the assistant as a wizard: a ButtonFace page, etched lines, Back and Next first", () => {
			expect(rule(".classicyAssistant")).toContain("color: var(--color-black)");
			expect(flat(rule(".classicyAssistantHeader"))).toContain(
				`box-shadow: ${etched}`,
			);
			expect(rule(".classicyAssistantBody")).toContain(
				"background: var(--color-system-03)",
			);
			const footer = flat(rule(".classicyAssistantFooter"));
			expect(footer).toContain("justify-content: flex-end");
			expect(footer).toContain("column-gap: 0");
			expect(footer).toContain("background: var(--color-system-03)");
			expect(footer).toContain(
				"border-top: var(--window-border-size) solid var(--color-system-05)",
			);
			expect(footer).toContain(
				"box-shadow: inset 0 var(--window-border-size) var(--color-system-01)",
			);
			expect(footer).toContain("--classicy-pager-band: var(--color-system-03)");
			const nav = rule(".classicyAssistantNav");
			expect(nav).toContain("order: 1");
			expect(nav).toContain("column-gap: 0");
			expect(rule(".classicyAssistantBack")).toContain("margin-inline-end: 0");
			expect(rule(".classicyAssistantNext")).toContain(
				"margin-inline-start: 0",
			);
			const buttons = rule(".classicyAssistantFooterButtons");
			expect(buttons).toContain("order: 2");
			expect(buttons).toContain("column-gap: 0");
			expect(rule(".classicyAssistantPageIndicator")).toContain(
				"display: none",
			);
			const push = rule(
				".classicyAssistantFooter .classicyButton.classicyButtonSmall",
			);
			expect(push).toContain("min-height: var(--push-button-height)");
			expect(push).toContain("min-width: var(--button-min-width)");
		});

		// WIG Ch.12 "Task Topic Windows" (p.280), "Nonscrolling Regions"
		// (p.283), "Jumps" (p.283): the topic on InfoWindow in the UI font, a
		// WindowFrame line under the title band in the etched line's place, a
		// ButtonFace footer, and a green jump that leaves an unavailable one
		// embossed.
		it("draws the Help topic window on InfoWindow, its title band ruled, its jumps green", () => {
			for (const part of [
				".classicyAssistantHeader",
				".classicyAssistantBody",
			]) {
				const face = rule(`.appleGuideWindow ${part}`);
				expect(face, part).toContain(
					"color: var(--package-color-tooltip-text, var(--color-black))",
				);
				expect(face, part).toContain(
					"background: var(--package-color-tooltip-face, var(--color-window-document))",
				);
				expect(face, part).toContain("font-family: var(--ui-font), sans-serif");
			}
			const band = rule(".appleGuideWindow .classicyAssistantHeader");
			expect(band).toContain(
				"border-bottom: var(--window-border-size) solid var(--color-window-border)",
			);
			expect(band).toContain("box-shadow: none");
			// After the wizard's header rule, so the line takes its place.
			expect(
				css.indexOf(`${scope} .appleGuideWindow .classicyAssistantHeader`),
			).toBeGreaterThan(css.indexOf(`${scope} .classicyAssistantHeader {`));
			const footer = rule(".appleGuideWindow .classicyAssistantFooter");
			expect(footer).toContain("background: var(--color-system-03)");
			expect(footer).toContain("--classicy-pager-band: var(--color-system-03)");
			expect(rule(".appleGuideWindow .classicyLink:not(.disabled)")).toContain(
				"color: var(--package-color-help-jump, var(--color-theme-04))",
			);
			// The jump rule comes after the placard partial's link rules, and
			// no rule colors an unavailable jump green.
			expect(
				css.indexOf(`${scope} .appleGuideWindow .classicyLink`),
			).toBeGreaterThan(css.indexOf(`${scope} :where(.classicyLink).disabled`));
			expect(css).not.toMatch(/[^(]\.disabled[^{]*\{[^}]*help-jump/);
		});

		// WIG Ch.12 "Task Topic Windows" (p.280), Figure 12.10: Help Topics,
		// Back and Options touching on a ButtonFace band, push-button sized,
		// a WindowFrame line between the band and the topic.
		it("draws the Help topic window's command buttons as Figure 12.10's band", () => {
			const band = flat(rule(".appleGuideButtonBar"));
			expect(band).toContain("background: var(--color-system-03)");
			expect(band).toContain(
				"border-bottom: var(--window-border-size) solid var(--color-window-border)",
			);
			const button = rule(".appleGuideButtonBar > .classicyButton");
			expect(button).toContain("min-height: var(--push-button-height)");
			expect(button).toContain("min-width: var(--button-min-width)");
			expect(button).toContain("margin: 0");
		});

		// WIG Ch.12 "The Help Topics Browser" and "The Help Topic Tabs"
		// (pp.284-288), Figure 12.13; winhlp32.exe's DIALOG 909 and 112, in
		// dialog units of MS Sans Serif 8: the tab control and the buttons 4
		// units (6 px) in and apart, the Contents page 12 units right of the
		// tab's edge and 27 below its top, the prompt over a tree view with
		// the client edge and no lines or buttons.
		it("lays out the Help Topics browser as winhlp32's dialog", () => {
			const dialog = flat(rule(".classicyHelpTopics"));
			expect(dialog).toContain("row-gap: calc(var(--pixel-unit) * 6)");
			expect(dialog).toContain("padding: calc(var(--pixel-unit) * 6)");
			expect(dialog).toContain("color: var(--color-black)");
			expect(dialog).toContain("font-family: var(--ui-font), sans-serif");
			expect(dialog).toContain("font-size: var(--ui-font-size)");
			const page = flat(rule(".classicyHelpTopicsContents"));
			expect(page).toContain("row-gap: calc(var(--pixel-unit) * 14)");
			expect(page).toContain(
				"padding: calc(var(--pixel-unit) * 9) calc(var(--pixel-unit) * 8) calc(var(--pixel-unit) * 4) calc(var(--pixel-unit) * 6)",
			);
			const list = flat(rule(".classicyHelpTopicsList"));
			expect(list).toContain(
				"padding: calc(var(--window-border-size) + var(--window-border-size))",
			);
			expect(list).toContain("background: var(--color-window-document)");
			expect(list).toContain("box-shadow: inset");
			expect(rule(".classicyHelpTopicsListViewport")).toContain(
				"box-shadow: none",
			);
			expect(
				rule(".classicyHelpTopicsList .classicyTreeNodeDisclosure"),
			).toContain("display: none");
			// No hierarchy lines in its tree, as in Standard File's well.
			expect(css).toContain(
				".classicyTreeNodeRow:not(.classicyFileOpenDialogWell *, .classicyHelpTopicsList *)",
			);
			expect(css).toContain(
				".classicyTreeGroup:not(.classicyFileOpenDialogWell *, .classicyHelpTopicsList *)",
			);
			expect(rule(".classicyHelpTopicsButtons")).toContain(
				"column-gap: calc(var(--pixel-unit) * 6)",
			);
			const button = rule(".classicyHelpTopicsButtons > .classicyButton");
			expect(button).toContain("min-height: var(--push-button-height)");
			expect(button).toContain("min-width: var(--button-min-width)");
			expect(button).toContain("margin: 0");
		});
	});

	// What's This? (`balloonHelp.contextHelp` "whatsThis", the audit's 12.2
	// and 12.3; WIG Ch.12 "Context-Sensitive Help", pp.273-275): the help
	// pointer over the active window while the mode is on, in this layer so
	// it beats the package's own `cursor: default` on its controls, and the
	// pop-up's shadow, Figure 12.3's: the box moved `--tooltip-shadow` right
	// and down behind it, a one-pixel checker of WindowFrame and transparent.
	describe("What's This?", () => {
		const scope = ".classicyDesktop[data-classicy-appearance=windows98]";
		const rule = (selector: string) => {
			const at = css.indexOf(`${selector} {`);
			return at < 0 ? "" : css.slice(at, css.indexOf("}", at));
		};
		const flat = (text: string) => text.replace(/\s+/g, " ");

		it("shows the help pointer over the active window in the mode, over the controls' own cursor", () => {
			const pointer = flat(
				rule(`html.classicyWhatsThisMode ${scope} .classicyWindow.active *`),
			);
			expect(pointer).toContain(
				'cursor: var(--classicy-cursor-help, url("data:,")) var(--classicy-cursor-help-hotspot, 0 0), help',
			);
			expect(
				css.includes(
					`html.classicyWhatsThisMode ${scope} .classicyWindow.active,`,
				),
			).toBe(true);
			// After the controls' `cursor: default`, at a greater weight.
			expect(
				css.indexOf(`html.classicyWhatsThisMode ${scope}`),
			).toBeGreaterThan(css.indexOf(`${scope} .classicyButton {`));
		});

		it("shadows the context-sensitive Help pop-up as Figure 12.3 does", () => {
			expect(rule(`${scope} .classicyBalloonHelpContext`)).toContain(
				"position: relative",
			);
			const shadow = flat(rule(`${scope} .classicyBalloonHelpContext::after`));
			expect(shadow).toContain('content: ""');
			expect(shadow).toContain("position: absolute");
			expect(shadow).toContain("z-index: -1");
			expect(shadow).toContain("inset: calc(var(--window-border-size) * -1)");
			expect(shadow).toContain(
				"transform: translate(var(--tooltip-shadow), var(--tooltip-shadow))",
			);
			expect(shadow).toContain(
				"background: repeating-conic-gradient(var(--color-window-border) 0 25%, transparent 0 50%) 0 0/calc(var(--pixel-unit) * 2) calc(var(--pixel-unit) * 2)",
			);
		});
	});

	// ToolTips (the WIG audit's 12.7 and 12.10; WIG Ch.12 "Tooltips", p.276,
	// Figures 12.5 and 12.6; Ch.7 "Tooltip Controls", p.133): a tip's title
	// is its first line in the same weight with no gap (Figure 12.5's icon
	// help), and the rich text editor's toolbar tips (MDXEditor's Radix
	// tooltips, opened in the desktop) are ToolTips, the balloon's box.
	describe("ToolTips", () => {
		const scope = ".classicyDesktop[data-classicy-appearance=windows98]";
		const rule = (selector: string) => {
			const at = css.indexOf(`${selector} {`);
			return at < 0 ? "" : css.slice(at, css.indexOf("}", at));
		};

		it("sets a tip's title as its first line, plain, with no gap", () => {
			const title = rule(
				`${scope} .classicyBalloonHelp .classicyBalloonHelpTitle`,
			);
			expect(title).toContain("font-weight: normal");
			expect(title).toContain("margin-bottom: 0");
		});

		it("draws the rich text editor's toolbar tips as ToolTips", () => {
			const box = [
				"min-width: 0",
				"padding: var(--tooltip-padding-y) var(--tooltip-padding-x)",
				"border: var(--window-border-size) solid var(--color-window-border)",
				"border-radius: 0",
				"color: var(--package-color-tooltip-text, var(--color-black))",
				"background: var(--package-color-tooltip-face, var(--color-window-document))",
			];
			const tip = rule(
				`${scope} .classicyRichTextEditorPopups [data-radix-popper-content-wrapper] > *`,
			);
			for (const declaration of [
				...box,
				"font-family: var(--ui-font)",
				"font-size: var(--ui-font-size)",
				"line-height: 1.3",
				"white-space: nowrap",
			])
				expect(tip).toContain(declaration);
			// The same box as the balloon's.
			const balloon = rule(`${scope} .classicyBalloonHelp`);
			for (const declaration of box) expect(balloon).toContain(declaration);
		});
	});

	// The audit's L4-K findings, each rule pinned: Windows' pointers where
	// the base shows the hand, the slashed circle or the Mac's one-way
	// arrows (4.1, 4.2; WIG Ch.4 "Mouse Pointers", pp.23-24, Table 4.1), the
	// busy pointers (4.5), no extensions parade (1.16), a chosen menu item's
	// 1 ms animation (1.19 / 4.7), the message box's Help push button
	// (12.14) and a shortcut's badge in windows (11.2).
	describe("pointers, the chosen item, the Help button and shortcuts' badges", () => {
		const scope = ".classicyDesktop[data-classicy-appearance=windows98]";
		const rule = (selector: string) => {
			const at = css.indexOf(`${selector} {`);
			return at < 0 ? "" : css.slice(at, css.indexOf("}", at));
		};
		const flat = (text: string) => text.replace(/\s+/g, " ");
		const registry = (role: string, keyword: string, hotspot: string) =>
			`cursor: var(--classicy-cursor-${role}, url("data:,")) var(--classicy-cursor-${role}-hotspot, ${hotspot}), ${keyword}`;
		const ARROW = registry("arrow", "default", "0 0");

		it.each([
			[".classicyListBoxOption,"],
			[".classicyTreeNodeSelectable"],
			[".classicyFileBrowserViewTableDisclosureTriangle"],
			[".classicyTabScrollButton"],
			[".classicyPagerArrow"],
			[".classicySlider"],
			[".classicySlider::-webkit-slider-thumb"],
			[".classicySlider::-moz-range-thumb"],
			[".classicyColorPickerCrayon"],
		])("takes the arrow over %s", (selector) => {
			const last = selector.endsWith(",");
			// Each partial's rule comes last in it, after the look's own.
			const at = css.lastIndexOf(`${scope} ${selector}${last ? "" : " {"}`);
			expect(at).toBeGreaterThan(-1);
			const block = css.slice(at, css.indexOf("}", at));
			expect(flat(block)).toContain(ARROW);
		});

		it("lists the tree's rows and the swatches with them", () => {
			expect(css).toContain(`${scope} .classicyTreeNodeBranch,`);
			expect(css).toContain(`${scope} .classicyColorPickerSwatch,`);
		});

		it("keeps the two-headed sizing pointers on the split dividers, during a drag too", () => {
			const lr = registry("resize-lr", "col-resize", "8 8");
			const ud = registry("resize-ud", "row-resize", "8 8");
			expect(
				flat(
					rule(
						`${scope} .classicySplitViewHorizontal > .classicySplitViewDivider`,
					),
				),
			).toContain(lr);
			expect(
				flat(
					rule(
						`${scope} .classicySplitViewVertical > .classicySplitViewDivider`,
					),
				),
			).toContain(ud);
			expect(
				flat(
					rule(
						`${scope} .classicySplitView:is([data-drag-direction=l], [data-drag-direction=r]) .classicySplitViewSplitBox`,
					),
				),
			).toContain(lr);
			expect(
				flat(
					rule(
						`${scope} .classicySplitView:is([data-drag-direction=u], [data-drag-direction=d]) .classicySplitViewSplitBox`,
					),
				),
			).toContain(ud);
		});

		it("shows the busy pointers and no extensions parade", () => {
			expect(flat(rule(`${scope} .classicyStartupScreen`))).toContain(
				registry("watch", "wait", "8 8"),
			);
			expect(rule(`${scope} .classicyStartupScreenExtensions`)).toContain(
				"display: none",
			);
			// Windows 98's own Working in Background (the `appStarting` role,
			// USER.EXE's cursor 111), the host's `progress` behind it.
			expect(flat(rule(`${scope} .pdfViewerDocumentLoading`))).toContain(
				registry("app-starting", "progress", "0 0"),
			);
		});

		it("gives a chosen menu item a 1 ms animation that draws nothing", () => {
			expect(
				rule(`${scope} .classicyMenuItem.windows98MenuItemChosen`),
			).toContain("animation: windows98MenuItemChosen 1ms steps(1, end)");
			const at = css.indexOf("@keyframes windows98MenuItemChosen {");
			expect(at).toBeGreaterThan(-1);
			expect(
				flat(css.slice(at, css.indexOf("}", css.indexOf("}", at) + 1))),
			).toMatch(/to \{ opacity: 1; \}/);
		});

		it("draws the message box's Help button as a 75 x 23 push button with its word", () => {
			const button = `${scope} .classicyAlertButtons .classicyBevelButton.classicyAlertHelpButton`;
			const face = rule(button);
			for (const declaration of [
				"box-sizing: border-box",
				"width: auto",
				"min-width: var(--button-min-width)",
				"height: var(--push-button-height)",
				"padding: 0 var(--button-text-padding)",
				"background: var(--color-system-03)",
				"box-shadow:",
			])
				expect(face).toContain(declaration);
			const label = rule(`${button}::after`);
			expect(label).toContain("content: attr(aria-label)");
			expect(label).toContain("font-size: var(--ui-font-size)");
			expect(label).toContain("color: var(--color-black)");
			expect(rule(`${button}:focus-visible`)).toContain("outline:");
			const pressed = `${button}:not(.disabled):is(:active, .pressed)`;
			expect(rule(pressed)).toContain("background: var(--color-system-03)");
			const step = rule(`${pressed}::after`);
			expect(step).toContain("top: var(--window-border-size)");
			expect(step).toContain("left: var(--window-border-size)");
			expect(rule(`${button}.disabled::after`)).toContain(
				"color: var(--package-color-text-gray, var(--color-system-05))",
			);
		});

		it("lays a shortcut's badge over its image in the icon view and the list view", () => {
			const box = rule(`${scope} .classicyIcon .classicyIconImage`);
			expect(box).toContain("position: relative");
			expect(box).toContain("width: var(--desktop-icon-size)");
			expect(box).toContain("height: var(--desktop-icon-size)");
			const badge = rule(
				`${scope} .classicyIcon .classicyIconMaskOuter.classicyIconAliasBadge`,
			);
			expect(badge).toContain("position: absolute");
			expect(badge).toContain("inset: 0");
			const row = rule(
				`${scope} .classicyFileBrowserViewTableRowContainer > .classicyIconImage`,
			);
			expect(row).toContain("position: relative");
			expect(row).toContain("margin: 0");
			const rowBadge = rule(
				`${scope} .classicyFileBrowserViewTableRowContainer > .classicyIconImage > .classicyIconAliasBadge`,
			);
			expect(rowBadge).toContain("position: absolute");
			expect(rowBadge).toContain(
				"width: var(--classicy-file-browser-icon-size)",
			);
			expect(rowBadge).toContain("left: var(--file-browser-list-icon-spacing)");
		});
	});

	describe("the status bar, Taskbar Properties' preview and the icons' labels", () => {
		const scope = ".classicyDesktop[data-classicy-appearance=windows98]";
		const rule = (selector: string) => {
			const at = css.indexOf(`${selector} {`);
			return at < 0 ? "" : css.slice(at, css.indexOf("}", at));
		};
		const flat = (text: string) => text.replace(/\s+/g, " ");

		it("draws a folder window's status bar as comctl32's, its parts sunken", () => {
			const bar = rule(
				`${scope} .classicyWindow .classicyWindowHeader.classicyWindowHeaderStatus`,
			);
			expect(bar).toContain("box-shadow: none");
			expect(bar).toContain("align-items: stretch");
			const part = flat(
				rule(`${scope} .classicyWindow .classicyWindowStatusPart`),
			);
			expect(part).toContain(
				"inset var(--window-border-size) var(--window-border-size) var(--color-system-05)",
			);
			expect(part).toContain("var(--color-system-01)");
			expect(
				rule(`${scope} .classicyWindow .classicyWindowStatusPart:first-child`),
			).toContain("flex: 1 1 0");
		});

		it("places the preview's pieces as explorer's dialog 6 does, from its art", () => {
			const frame = rule(`${scope} .classicyTaskbarPropertiesPreview`);
			expect(frame).toContain("width: calc(var(--pixel-unit) * 274)");
			expect(frame).toContain("height: calc(var(--pixel-unit) * 130)");
			for (const piece of ["StartMenu", "Taskbar", "NoClock", "Window"])
				expect(
					rule(`${scope} .classicyTaskbarPropertiesPreview${piece}`),
					piece,
				).toContain("background-color");
			expect(css).toContain("var(--classicy-art-taskbar-preview, none)");
			expect(css).toContain("var(--classicy-art-taskbar-preview-shadow, none)");
		});

		it("cuts a desktop label to the whole lines its icon's cell holds", () => {
			expect(flat(css)).toContain(
				"-webkit-line-clamp: max(1, tan(atan2(var(--desktop-icon-grid-row-gap) - calc(var(--pixel-unit) * 6), calc(var(--desktop-icon-font-size) + calc(var(--pixel-unit) * 2)))) - 0.5)",
			);
		});
	});
});
