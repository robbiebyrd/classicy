import path from "node:path";
import { compile, NodePackageImporter } from "sass";
import { describe, expect, it } from "vitest";
import { isSingleClassicyLayerBlock } from "../../../../../bin/classicyPackageCss";
import { CLASSICY_LAYER_ORDER } from "../../../../../bin/classicyStyleInjector";

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
});
