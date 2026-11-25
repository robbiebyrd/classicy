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
		expect(plain).toContain("color: var(--color-black)");
		expect(plain).toContain("background-color: transparent");
		const dimmed = block(`${keyedMenus} .classicyMenuItem.disabled${resting}`);
		expect(dimmed).toContain("color: var(--color-system-05)");
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
	it("underlines an access key in the menus, the menu bar and the control labels", () => {
		const block = (tail: string) =>
			new RegExp(
				`${tail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`,
			).exec(css)?.[1] ?? "";
		for (const owner of [".classicyMenuItem", ".classicyControlLabel"]) {
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
	// (7.27).
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
	});
});
