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
	// p.97, Figure 7.1; Wine's `MENU_MenuBarCalcSize`, `DrawMenuBarTemp` and
	// `NC_DoNCPaint`): ButtonFace, the titles `--menu-bar-title-height` (18)
	// tall between a row above and a row below, 20 px in all, where the
	// core's derived `--window-menu-bar-height` is 21; a host's
	// `--classicy-window-menu-bar-height` still wins, as the base sheet reads
	// it. The contents below give up the same band.
	it("draws a window's menu bar as Windows 98's 20 px band", () => {
		const selectors = selectorsOf(css);
		const has = (tail: string) =>
			selectors.some((selector) => selector.endsWith(tail));
		const block = (tail: string) =>
			new RegExp(
				`${tail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`,
			).exec(css)?.[1] ?? "";
		const band =
			"var(--classicy-window-menu-bar-height, calc(var(--menu-bar-title-height) + calc(var(--window-border-size) + var(--window-border-size))))";
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
		// The list: flat ButtonFace, a row of face above and below the titles,
		// no side padding; a forced screen bar's list is the same band.
		const list = block(
			":is(.classicyWindowMenuBar, .classicyDesktopMenuBar) .classicyDesktopMenu",
		);
		expect(list).toContain("padding: var(--window-border-size) 0");
		expect(list).toContain("background-color: var(--color-system-03)");
		expect(list).toContain("box-shadow: none");
		expect(list).toContain("border-radius: 0");
		expect(block(".classicyDesktopMenuBar .classicyDesktopMenu")).toContain(
			"height: calc(var(--menu-bar-title-height) + calc(var(--window-border-size) + var(--window-border-size)))",
		);
		expect(block("=windows98] .classicyWindowMenuBar")).toContain(
			"background-color: var(--color-system-03)",
		);
	});

	// Its titles, as Wine's `MENU_DrawMenuItem` draws a menu bar's: MenuText
	// with one average character each side; nothing under the pointer alone
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
		expect(plain).toContain("color: var(--color-black)");
		expect(plain).toContain("background-color: transparent");
		expect(plain).toContain("box-shadow: none");
		const hover = block(`${title}:hover`);
		expect(hover).toContain("background-color: transparent");
		expect(hover).toContain("color: var(--color-black)");
		expect(hover).not.toContain("box-shadow");
		// The open rule and the keyboard's share one block.
		expect(at(`${title}.open`)).toBeGreaterThanOrEqual(0);
		const open = block(`${title}:focus-visible`);
		expect(open).toContain(
			"box-shadow: inset calc(var(--window-border-size) * -1) calc(var(--window-border-size) * -1) var(--color-system-01), inset var(--window-border-size) var(--window-border-size) var(--color-system-05)",
		);
		expect(open).toContain("outline: none");
		expect(open).toContain("color: var(--color-black)");
		expect(open).toContain("background-color: transparent");
		// The text stays where it is: the shared rule is the only one keyed on
		// an open title, and it moves nothing.
		const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(
			([, head, body]) => ({ selectors: splitSelectors(head.trim()), body }),
		);
		const openRules = rules.filter((rule) =>
			rule.selectors.some((selector) => selector.includes(`${title}.open`)),
		);
		expect(openRules).toHaveLength(1);
		expect(openRules[0].body).not.toMatch(
			/\b(top|left|transform|translate|padding):/,
		);
		// No Hilight band and no checker on any menu bar title.
		const titleRules = rules.filter((rule) =>
			rule.selectors.some((selector) => selector.includes(title)),
		);
		expect(titleRules.length).toBeGreaterThan(5);
		for (const rule of titleRules)
			expect(rule.body, rule.selectors.join(", ")).not.toMatch(
				/--color-highlight|--package-color-selection-text|repeating-conic-gradient/,
			);
		const disabled = block(`${title}.disabled`);
		expect(disabled).toContain("color: var(--color-system-05)");
		expect(disabled).toContain(
			"text-shadow: var(--window-border-size) var(--window-border-size) 0 var(--color-system-01)",
		);
		// After the hover rule of the same weight, so a hovered one stays gray.
		expect(at(`${title}.disabled`)).toBeGreaterThan(at(`${title}:hover`));
		const reached = block(`${title}.disabled:is(.open, :focus-visible)`);
		expect(reached).toContain("color: var(--color-system-05)");
		expect(reached).toContain("text-shadow: none");
		const wrapper = block(`${title} > .classicyMenuWrapper`);
		expect(wrapper).toContain("top: 100%");
		expect(wrapper).toContain("left: 0");
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
		const unscoped = selectors.filter(
			(selector) =>
				menuBarClass.test(selector) &&
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
});
