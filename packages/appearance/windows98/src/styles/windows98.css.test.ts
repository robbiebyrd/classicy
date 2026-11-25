import path from "node:path";
import { compile, NodePackageImporter } from "sass";
import { describe, expect, it } from "vitest";
import { isSingleClassicyLayerBlock } from "../../../../../bin/classicyPackageCss";
import { CLASSICY_LAYER_ORDER } from "../../../../../bin/classicyStyleInjector";
import windows98 from "../windows98.json";

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
		// The top bar of the "?" (1, 0) 4 wide, moved to (6, 2).
		expect(box).toContain(
			"calc(var(--pixel-unit) * 6) calc(var(--pixel-unit) * 2)/calc(var(--pixel-unit) * 4) var(--pixel-unit)",
		);
		const pressed = block(
			".classicyWindow .classicyWindowTitleBar .classicyWindowHelpBox:active",
		);
		expect(pressed).toContain(
			"calc(var(--pixel-unit) * 7) calc(var(--pixel-unit) * 3)/calc(var(--pixel-unit) * 4) var(--pixel-unit)",
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
			const task = block("=windows98] .classicyTaskbarTask");
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
			// The up-down control's triangles: black at rest, embossed dimmed.
			expect(block("=windows98] .classicyTaskbarPagerUp")).toContain(
				"linear-gradient(var(--color-black), var(--color-black)) calc(var(--pixel-unit) * 5) calc(var(--pixel-unit) * 6)/calc(var(--pixel-unit) * 5) var(--pixel-unit) no-repeat",
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
});
