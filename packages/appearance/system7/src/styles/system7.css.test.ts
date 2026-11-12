import { readFileSync } from "node:fs";
import path from "node:path";
import { compile, NodePackageImporter } from "sass";
import { describe, expect, it } from "vitest";
import { isSingleClassicyLayerBlock } from "../../../../../bin/classicyPackageCss";
import { CLASSICY_LAYER_ORDER } from "../../../../../bin/classicyStyleInjector";

// The System 7 package stylesheet as Sass compiles it: one
// `@layer classicy.package` block, every rule scoped under the System 7
// desktop root but the screen savers', so its look applies only while it is
// the active package (design 0014-ahm; the core's _package.scss), as
// Platinum's does (platinum.css.test.ts).

const STYLESHEET = path.join(import.meta.dirname, "system7.scss");
const SYSTEM7_SCOPE =
	/^\.classicyDesktop\[data-classicy-appearance=("?)system7\1\](?=$|[\s.:#[>+~])/;

/**
 * A fixed modal holding a window of its own, under the `id` package root:
 * each rule a fixed modal keys on must reach its own title bar and contents
 * only (child combinators), never a window nested in its content.
 */
const nestedWindowInFixedModal = (id: string) => {
	document.body.innerHTML = `
<div class="classicyDesktop" data-classicy-appearance="${id}">
  <div class="classicyWindow classicyWindowModal classicyWindowModalFixed">
    <div class="classicyWindowTitleBar" id="ownBar"></div>
    <div class="classicyWindowContentsModal" id="ownContents">
      <div class="classicyWindowContentsInner classicyWindowContentsModalInner">
        <div class="classicyWindow classicyWindowModal">
          <div class="classicyWindowTitleBar" id="nestedBar"></div>
          <div class="classicyWindowContentsModal" id="nestedContents"></div>
        </div>
      </div>
    </div>
  </div>
</div>`;
	const el = (elementId: string) =>
		document.getElementById(elementId) as HTMLElement;
	return {
		ownBar: el("ownBar"),
		ownContents: el("ownContents"),
		nestedBar: el("nestedBar"),
		nestedContents: el("nestedContents"),
	};
};

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

describe("system7.scss (compiled)", () => {
	const css = compile(STYLESHEET, {
		importers: [new NodePackageImporter()],
	}).css;

	it("is one @layer classicy.package block", () => {
		expect(css.startsWith("@layer classicy.package")).toBe(true);
		expect(
			isSingleClassicyLayerBlock(css, "classicy.package", CLASSICY_LAYER_ORDER),
		).toBe(true);
	});

	// But the screen savers' (plan 0018-dbd §3.8): keyed on their own
	// classes, at the layer's root, as in Platinum's sheet
	// (system7ScreenSavers.css.test.ts).
	it("holds rules, every one scoped under the system7 root, but the screen savers'", () => {
		const selectors = selectorsOf(css);
		const unscoped = selectors.filter((s) => !SYSTEM7_SCOPE.test(s));
		expect(selectors.length).toBeGreaterThan(unscoped.length);
		expect(unscoped.length).toBeGreaterThan(0);
		expect(
			unscoped.filter(
				(selector) =>
					!/^\.classicySaver[A-Z]/.test(selector) &&
					// The savers' reduced-motion pause (_screenSavers.scss).
					!/^#classicy-screen-saver-overlay( \*)?$/.test(selector),
			),
		).toEqual([]);
	});

	// The selector scan itself, so "every one scoped" cannot hold vacuously.
	it("the scan catches an unscoped rule in a multi-line list", () =>
		expect(
			selectorsOf(
				".classicyDesktop[data-classicy-appearance=system7] .a,\n.b {\n  color: red;\n}\n",
			).filter((s) => !SYSTEM7_SCOPE.test(s)),
		).toEqual([".b"]));

	it("hides the collapse box, which System 7 windows lack", () =>
		expect(css).toMatch(
			/\.classicyDesktop\[data-classicy-appearance=system7\] \.classicyWindowTitleBar \[data-classicy-control=collapse\] \{\s*display: none;\s*\}/,
		));

	// The declarations of every rule whose selector list holds exactly
	// `<system7 root> <rest>` (expanded output: one selector per line).
	const rule = (rest: string) => {
		const selector = `.classicyDesktop[data-classicy-appearance=system7] ${rest}`;
		return [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
			.filter(([, header]) => splitSelectors(header).includes(selector))
			.map(([, , declarations]) => declarations)
			.join("\n");
	};
	const layersOf = (declarations: string, ink: string) =>
		declarations.split(`linear-gradient(${ink}, ${ink})`).length - 1;

	// Plan 0018-dbd §3.2: the window chrome, from the 7.5 captures.
	describe("windows", () => {
		it("frames a window in one pixel with a one-pixel drop shadow and no frame ring", () => {
			const frame = rule(".classicyWindow");
			expect(frame).toMatch(/padding: 0;/);
			expect(frame).toMatch(
				/border: var\(--window-border-size\) solid var\(--color-window-border\);/,
			);
			expect(frame).toMatch(
				/box-shadow: var\(--window-border-size\) var\(--window-border-size\) 0 0 var\(--color-black\);/,
			);
		});

		it("draws the racing stripes on the active title bar only", () => {
			expect(rule(".classicyWindow.active .classicyWindowTitleBar")).toMatch(
				/repeating-linear-gradient\(var\(--color-system-06\) 0 var\(--title-bar-stripe-height\)/,
			);
			const bar = rule(".classicyWindow .classicyWindowTitleBar");
			expect(bar).toMatch(/border-bottom: var\(--window-border-size\) solid/);
			expect(bar).not.toContain("gradient");
		});

		it("grays an inactive window's frame and drops the base sheet's dimming filter", () => {
			const inactive = rule(".classicyWindow.inactive");
			expect(inactive).toMatch(/border-color: var\(--color-system-07\);/);
			expect(inactive).toMatch(/filter: none;/);
		});

		it("draws the pressed boxes' starburst and the windoid box's cross in one-pixel rectangles", () => {
			expect(
				layersOf(
					rule(
						".classicyWindow .classicyWindowTitleBar .classicyWindowCloseBox:active",
					),
					"var(--color-black)",
				),
			).toBe(12);
			expect(
				layersOf(
					rule(
						".classicyWindow.classicyWindowUtility .classicyWindowTitleBar .classicyWindowCloseBox:active",
					),
					"var(--color-black)",
				),
			).toBe(8);
		});

		it("draws the size box's two squares on its cell, glyph-less when inactive", () => {
			expect(
				layersOf(
					rule(".classicyWindow .classicyWindowResizer"),
					"var(--color-theme-07)",
				),
			).toBe(2);
			expect(rule(".classicyWindow .classicyWindowResizerDimmed")).toMatch(
				/background: var\(--color-window-document\);/,
			);
		});

		it("hides the proxy icon, which System 7 titles lack", () =>
			expect(
				rule(".classicyWindow .classicyWindowTitleBar .classicyWindowIcon"),
			).toMatch(/display: none;/));

		// The frame-edge drag handles are shared behavior: System 7 keeps them,
		// on its one-pixel frame, never over the contents or the scroll bars.
		it("keeps the frame-edge drag handles, on the frame and no deeper than it", () => {
			expect(css).not.toMatch(
				/classicyWindowFrameEdge[^{]*\{[^}]*display: none/,
			);
			for (const [edge, depth, side] of [
				["top", "height", "top"],
				["bottom", "height", "bottom"],
				["left", "width", "left"],
				["right", "width", "right"],
			]) {
				const sized = rule(`.classicyWindow .classicyWindowFrameEdge-${edge}`);
				expect(sized, edge).toMatch(
					new RegExp(`${depth}: var\\(--window-border-size\\);`),
				);
				expect(sized, edge).toMatch(
					new RegExp(
						`${side}: calc\\(var\\(--window-border-size\\) \\* -1\\);`,
					),
				);
			}
		});

		// The Finder's header (`*-finder-window-fits-active.png`): a white
		// strip of whole pixels over a double rule, which the contents give up.
		it("draws a window header as a white strip over a double rule, which the contents give up", () => {
			const header = rule(".classicyWindow .classicyWindowHeader");
			expect(header).toMatch(/height: var\(--window-header-height\);/);
			expect(header).toMatch(
				/border-bottom: var\(--window-header-rule\) double var\(--color-black\);/,
			);
			expect(header).toMatch(/background: var\(--color-window-document\);/);
			expect(
				rule(
					".classicyWindow .classicyWindowContents.classicyWindowContentsWithHeader",
				),
			).toMatch(
				/height: calc\(100% - var\(--window-title-bar-height\) \+ var\(--window-border-size\) - var\(--window-header-height\) - var\(--window-header-rule\)\);/,
			);
		});

		it("draws the standalone frame as an active document window's chrome", () => {
			expect(rule(".classicyWindowFrame")).toMatch(
				/box-shadow: var\(--window-border-size\) var\(--window-border-size\) 0 0 var\(--color-black\);/,
			);
			const bar = rule(".classicyWindowFrame > .classicyWindowTitleBar");
			expect(bar).toMatch(
				/repeating-linear-gradient\(var\(--color-system-06\) 0 var\(--title-bar-stripe-height\)/,
			);
			expect(bar).toMatch(/inset .* var\(--color-theme-02\);/);
			expect(bar).toMatch(/padding: 0;/);
			expect(
				rule(
					".classicyWindowFrame > .classicyWindowTitleBar .classicyWindowIcon",
				),
			).toMatch(/display: none;/);
			expect(rule(".classicyWindowFrameBody")).toMatch(
				/background: var\(--color-window-document\);/,
			);
		});

		it("draws a resizable windoid's size box", () =>
			expect(
				layersOf(
					rule(".classicyWindow.classicyWindowUtility .classicyWindowResizer"),
					"var(--color-theme-07)",
				),
			).toBe(1));

		it("lays the window's scroll bars over the frame by one pixel", () =>
			expect(
				rule(
					".classicyWindow .classicyWindowContents > .classicyScrollAreaBody > .classicyScrollBarVertical",
				),
			).toMatch(/margin: calc\(var\(--window-border-size\) \* -1\)/));
	});

	// Plan 0018-dbd §3.3: the menus, menu bar and pop-up menus, from the 7.5
	// captures.
	describe("menus", () => {
		const MENUS =
			":is(.classicyMenu, .classicySubMenu, .classicyContextMenu, .classicyContextSubMenu)";
		const TITLES =
			":is(.classicyDesktopMenu > .classicyMenuItem, .classicyDesktopMenu > .classicyMenuItemBalloonAnchor > .classicyMenuItem)";
		const ROOT = ".classicyDesktop[data-classicy-appearance=system7]";
		const rootDeclarations = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
			.filter(([, header]) => header.trim() === ROOT)
			.map(([, , declarations]) => declarations)
			.join("\n");

		it("frames every menu in one black pixel on white, its shadow three pixels in from the corner", () => {
			const frame = rule(MENUS);
			expect(frame).toMatch(
				/border: var\(--window-border-size\) solid var\(--color-black\);/,
			);
			expect(frame).toMatch(/background: var\(--color-white\);/);
			expect(frame).toMatch(/box-shadow: none;/);
			expect(frame).toMatch(/min-width: 0;/);
			expect(rule(`${MENUS}::after`)).toMatch(
				/top: var\(--menu-frame-shadow-start\);[\s\S]*width: var\(--window-border-size\);/,
			);
			expect(rule(`${MENUS}::before`)).toMatch(
				/left: var\(--menu-frame-shadow-start\);[\s\S]*height: var\(--window-border-size\);/,
			);
		});

		it("inverts a tracked item and an open title, black in both themes", () => {
			for (const tracked of [
				`${MENUS} .classicyMenuItem:hover`,
				`${MENUS} .classicyMenuItem.open`,
				`${TITLES}.open`,
				".classicyPopUpMenuListItemHighlight",
			]) {
				const declarations = rule(tracked);
				expect(declarations, tracked).toMatch(/color: var\(--color-white\);/);
				expect(declarations, tracked).toMatch(
					/background-color: var\(--color-black\);/,
				);
			}
			// A title highlights only while its menu is open.
			expect(rule(`${TITLES}:hover`)).toMatch(/background-color: transparent;/);
		});

		it("draws dimmed items and dividers in the dimmed ink through the dither", () => {
			const dimmed = rule(`${MENUS} .classicyMenuItem.disabled > p`);
			expect(dimmed).toMatch(/color: var\(--color-theme-06\);/);
			expect(dimmed).toMatch(
				/mask-image: var\(--classicy-art-dither-checker\)/,
			);
			expect(rule(`${MENUS} .classicyMenuItem.disabled:hover`)).toMatch(
				/background-color: transparent;/,
			);
			const divider = rule(`${MENUS} .classicySeparatorHorizontal`);
			expect(divider).toMatch(/background-color: var\(--color-theme-06\);/);
			expect(divider).toMatch(
				/mask-image: var\(--classicy-art-dither-checker\)/,
			);
			expect(divider).toMatch(/height: var\(--window-border-size\);/);
			expect(divider).toMatch(/margin: var\(--menu-item-divider-top\) 0/);
			expect(rule(".classicyPopUpMenuGroupHeader")).toMatch(
				/color: var\(--color-theme-06\);/,
			);
		});

		// The vocabulary's mixins mask with the `ditherChecker` art, which System
		// 7 draws in CSS: a 2 x 2 checker, sized by the theme's dither knob.
		it("draws the dither's checker tile itself", () =>
			expect(rootDeclarations).toMatch(
				/--classicy-art-dither-checker: conic-gradient\(var\(--color-black\) 0 25%, transparent 0 50%, var\(--color-black\) 0 75%, transparent 0\);/,
			));

		it("sets items on the 16 px pitch, the title at the mark column's inset", () => {
			const item = rule(`${MENUS} .classicyMenuItem`);
			expect(item).toMatch(/height: var\(--menu-item-height\);/);
			expect(item).toMatch(/padding: 0 0 0 var\(--menu-item-text-inset\);/);
			expect(item).toMatch(/line-height: var\(--menu-item-line-height\);/);
			expect(item).toMatch(/flex-wrap: nowrap;/);
			expect(
				rule(`${MENUS} .classicyMenuItem .classicyMenuItemKeyboardShortcut`),
			).toMatch(/min-width: var\(--menu-item-shortcut-width\);/);
		});

		it("draws the checkmark, the submenu triangle and the pop-up triangle on the pixel grid", () => {
			expect(
				layersOf(
					rule(".classicyMenuItemCheck.checked::before"),
					"currentColor",
				),
			).toBe(10);
			expect(
				layersOf(
					rule(".classicyPopUpMenuCheck.checked::before"),
					"currentColor",
				),
			).toBe(10);
			expect(
				layersOf(
					rule(`${MENUS} .classicyMenuItemChildMenuIndicator::after`),
					"currentColor",
				),
			).toBe(6);
			expect(
				layersOf(rule(".classicyPopUpMenuIndicator"), "var(--color-black)"),
			).toBe(6);
		});

		it("overlaps a submenu on its parent menu's right side", () =>
			expect(
				rule(
					`${MENUS} .classicyMenuWrapper > :is(.classicySubMenu, .classicyContextSubMenu)`,
				),
			).toMatch(
				/margin: calc\(var\(--window-border-size\) \* -1\) 0 0 calc\(var\(--menu-frame-submenu-overlap\) \* -1\);/,
			));

		it("blinks a chosen item black and white", () => {
			expect(rule(".classicyMenuItemFlash")).toMatch(
				/animation-name: classicySystem7MenuItemFlash;/,
			);
			expect(css).toMatch(/@keyframes classicySystem7MenuItemFlash \{/);
		});

		it("draws the bar white over its black line, under the screen's rounded corners", () => {
			const bar = rule(".classicyDesktopMenu");
			expect(bar).toMatch(/height: var\(--menu-bar-height\);/);
			expect(bar).toMatch(
				/border-bottom: var\(--window-border-size\) solid var\(--color-black\);/,
			);
			expect(bar).toMatch(/border-radius: 0;/);
			// Four rows a corner (runs of 5, 3, 2 and 1 x 2), both corners.
			expect(layersOf(bar, "var(--color-black)")).toBe(8);
			const title = rule(TITLES);
			expect(title).toMatch(
				/border-top: var\(--menu-bar-highlight-top\) solid transparent;/,
			);
			expect(title).toMatch(/background-clip: padding-box;/);
			expect(
				rule(`${TITLES} > .classicyMenuWrapper > .classicySubMenu`),
			).toMatch(/border-top: 0;/);
		});

		it("puts Help between the clock and the Application menu", () => {
			expect(rule(".classicyDesktopMenu > [data-classicy-part=help]")).toMatch(
				/order: 55;/,
			);
			expect(
				rule(".classicyDesktopMenu > :has(> [data-classicy-part=help])"),
			).toMatch(/order: 55;/);
		});

		it("inverts an open pop-up's title and hides its triangle", () => {
			expect(
				rule(
					".classicyPopUpMenuWrapper > .classicyControlLabelHolder.open .classicyControlLabel",
				),
			).toMatch(/background-color: var\(--color-black\);/);
			expect(rule(".classicyPopUpMenuIndicator.open")).toMatch(
				/background: none;/,
			);
			expect(rule(".classicyPopUpMenuButton")).toMatch(
				/border: var\(--window-border-size\) solid var\(--color-black\);/,
			);
			expect(rule(".classicyPopUpMenuList")).toMatch(/clip-path: polygon\(/);
		});
	});

	// Plan 0018-dbd §3.4: modal dialogs, alerts and push buttons, from the
	// 7.5 captures (Standard File, the Copy dialog, the alerts, the pressed
	// buttons) and the HIG (pp.185-207).
	describe("dialogs, alerts and buttons", () => {
		const MODAL = ".classicyWindow.classicyWindowModal";
		const FRAME =
			"calc(var(--dialog-frame-bevel) + var(--dialog-frame-band) + var(--dialog-frame-bevel))";

		it("frames a modal in the double frame, its outer bevel dark-sided on top, with no drop shadow", () => {
			const modal = rule(MODAL);
			expect(modal).toMatch(/padding: 0;/);
			const shadow = modal.match(/box-shadow: ([^;]*);/)?.[1] ?? "";
			const layers = shadow.split(/,(?![^(]*\))/).map((l) => l.trim());
			expect(layers).toEqual([
				"inset calc(var(--dialog-frame-bevel) * -1) calc(var(--dialog-frame-bevel) * -1) 0 0 var(--color-theme-04)",
				"inset var(--dialog-frame-bevel) var(--dialog-frame-bevel) 0 0 var(--color-theme-02)",
				"inset 0 0 0 calc(var(--dialog-frame-bevel) + var(--dialog-frame-band)) var(--color-system-02)",
			]);
			expect(rule(`${MODAL}.dragging`)).toMatch(/box-shadow: none;/);
		});

		it("lines the contents in black inside the inner bevel, its light side on top", () => {
			const contents = rule(".classicyWindow .classicyWindowContentsModal");
			expect(contents).toMatch(
				/border: var\(--dialog-frame-line\) solid var\(--color-black\);/,
			);
			expect(contents).toMatch(/padding: 0;/);
			const shadow = contents.match(/box-shadow: ([^;]*);/)?.[1] ?? "";
			const layers = shadow.split(/,(?![^(]*\))/).map((l) => l.trim());
			expect(layers).toHaveLength(4);
			expect(
				layers.slice(0, 3).every((l) => l.endsWith("--color-theme-02)")),
			).toBe(true);
			expect(layers[3]).toBe(
				"0 0 0 var(--dialog-frame-bevel) var(--color-theme-04)",
			);
			expect(contents).toContain(
				`margin: var(--dialog-frame-bevel) ${FRAME} ${FRAME};`,
			);
		});

		it("drops a fixed modal's title bar and closes the frame over its contents", () => {
			expect(
				rule(
					".classicyWindow.classicyWindowModalFixed > .classicyWindowTitleBar",
				),
			).toMatch(/display: none;/);
			expect(
				rule(
					".classicyWindow.classicyWindowModalFixed > .classicyWindowContentsModal",
				),
			).toContain(`margin: ${FRAME};`);
		});

		// Its own title bar and contents only: a window nested in a fixed
		// modal's content keeps its bar and its contents' layout.
		it("reaches only the fixed modal's own title bar and contents", () => {
			const fixedRules = selectorsOf(css).filter((selector) =>
				selector.includes("classicyWindowModalFixed"),
			);
			const dom = nestedWindowInFixedModal("system7");
			const matched = (el: HTMLElement) =>
				fixedRules.filter((selector) => el.matches(selector));
			expect(matched(dom.ownBar)).not.toEqual([]);
			expect(matched(dom.ownContents)).not.toEqual([]);
			expect(matched(dom.nestedBar)).toEqual([]);
			expect(matched(dom.nestedContents)).toEqual([]);
		});

		it("stripes a movable modal's bar across its width, with no line of its own", () => {
			expect(rule(".classicyWindow .classicyWindowTitleBarModal")).toMatch(
				/border-bottom: none;/,
			);
			expect(
				rule(".classicyWindow.active .classicyWindowTitleBarModal"),
			).toMatch(
				/var\(--title-bar-modal-stripe-inset\) center\/calc\(100% - var\(--title-bar-modal-stripe-inset\) - var\(--title-bar-modal-stripe-inset\)\)/,
			);
		});

		// The dialogs that pad themselves are named by the class the core sets
		// on the modal's inner area (classicyWindowContentsSelfPadded), not
		// found with `:has()`, so browsers without `:has()` (Firefox 113-120)
		// give them one inset too.
		it("insets every modal's items the HIG's 13 pixels, except the dialogs that pad themselves", () => {
			const inner = rule(".classicyWindowContentsModalInner");
			expect(inner).toMatch(/padding: var\(--dialog-frame-inset\);/);
			expect(inner).toMatch(/box-sizing: border-box;/);
			expect(
				rule(
					".classicyWindowContentsModalInner.classicyWindowContentsSelfPadded",
				),
			).toMatch(/padding: 0;/);
			expect(
				selectorsOf(css).filter(
					(selector) =>
						selector.includes("classicyWindowContentsModalInner") &&
						selector.includes(":has("),
				),
			).toEqual([]);
		});

		// HIG p.193: alerts have no title, and System 7 no movable alert. The
		// base sheet tints an error modal's and a movable alert's title bar red
		// (background-color, in classicy.base); every System 7 title bar sets
		// its own from this layer, which wins, and nothing here draws red.
		it("draws no red title bar", () => {
			expect(rule(".classicyWindow .classicyWindowTitleBar")).toMatch(
				/background-color: var\(--color-window-document\);/,
			);
			expect(css).not.toContain("--color-error");
		});

		it("sets an alert's text in one style and lays it out on the HIG's 13 and 23 pixel grid", () => {
			const alert = rule(".classicyAlert");
			expect(alert).toMatch(
				/padding: var\(--alert-layout-text-top\) var\(--alert-layout-edge\) var\(--alert-layout-edge\) var\(--alert-layout-icon-inset\);/,
			);
			expect(rule(".classicyAlert .classicyAlertIcon")).toMatch(
				/margin-top: calc\(var\(--alert-layout-icon-top\) - var\(--alert-layout-text-top\)\);/,
			);
			for (const part of [".classicyAlertLabel", ".classicyAlertMessage"]) {
				const text = rule(`.classicyAlert ${part}`);
				expect(text, part).toMatch(/font-weight: normal;/);
				expect(text, part).toMatch(/font-size: var\(--ui-font-size\);/);
				expect(text, part).toMatch(
					/line-height: var\(--alert-layout-line-height\);/,
				);
			}
			expect(
				rule(".classicyAlert .classicyAlertButtons .classicyButton"),
			).toMatch(/margin: 0;/);
		});

		// FrameRoundRect's corners: four sides and two rectangles a corner for
		// the button, four sides and six rectangles a corner for the ring.
		it("draws the push button and its default ring as pixel art, not a radius", () => {
			const button = rule(".classicyButton");
			expect(button).toMatch(/border: none;/);
			expect(button).toMatch(/border-radius: 0;/);
			expect(layersOf(button, "var(--color-black)")).toBe(4 + 4 * 2);
			expect(layersOf(button, "var(--color-white)")).toBe(3);
			expect(
				layersOf(
					rule(":where(.classicyButton).default::after"),
					"var(--color-black)",
				),
			).toBe(4 + 4 * 6);
			expect(rule(":where(.classicyButton).default::after")).toMatch(
				/inset: calc\(calc\(var\(--window-box-pixel\) \+ var\(--button-default-ring\)\) \* -1\);/,
			);
		});

		it("inverts a pressed button, its face black under a white label", () => {
			const pressed = rule(":where(.classicyButton).pressed");
			expect(pressed).toBe(rule(".classicyButton:active:not(:disabled)"));
			expect(layersOf(pressed, "var(--color-black)")).toBe(4 + 4 * 2 + 3);
			expect(pressed).toMatch(/color: var\(--color-white\);/);
		});

		it("dims only the label, in the dimmed ink through the dither, and dithers a dimmed default ring", () => {
			// Only where a background clips to text: elsewhere the label is
			// plain dimmed ink and no label layer covers the frame.
			expect(css).toMatch(
				/@supports \(background-clip: text\) \{\s*\.classicyDesktop\[data-classicy-appearance=system7\] \.classicyButton:disabled \{[^}]*background-clip: text,/,
			);
			expect(css).not.toMatch(
				/\}\s*\.classicyDesktop\[data-classicy-appearance=system7\] \.classicyButton:disabled \{[^}]*background-clip/,
			);
			expect(css).toMatch(
				/\.classicyButton:disabled \{\s*color: var\(--color-theme-06\);\s*\}/,
			);
			const dimmed = rule(".classicyButton:disabled");
			expect(dimmed).toMatch(/color: transparent;/);
			expect(dimmed).toMatch(
				/linear-gradient\(var\(--color-theme-06\), var\(--color-theme-06\)\)/,
			);
			expect(dimmed).toMatch(
				/var\(--dither-tile-size\) var\(--dither-tile-size\)/,
			);
			const clip = dimmed.match(/background-clip: ([^;]*);/)?.[1].split(", ");
			// The label's two layers to the glyphs, every frame and face layer
			// to the box: one value a layer, so the list never repeats.
			expect(clip?.slice(0, 2)).toEqual(["text", "text"]);
			expect(clip?.slice(2)).toEqual(Array(4 + 4 * 2 + 3).fill("border-box"));
			expect(layersOf(dimmed, "var(--color-black)")).toBe(4 + 4 * 2);
			expect(rule(":where(.classicyButton).default:disabled::after")).toMatch(
				/mask: var\(--classicy-art-dither-checker\)/,
			);
		});

		it("marks a focused button only for the keyboard, outside the default ring", () => {
			expect(rule(".classicyButton:focus")).toMatch(/outline: none;/);
			const mark = rule(".classicyButton:focus-visible");
			expect(mark).toMatch(
				/outline: calc\(var\(--window-box-pixel\) \* 2\) solid var\(--color-black\);/,
			);
			expect(mark).toMatch(/outline-offset: var\(--window-box-pixel\);/);
			expect(rule(":where(.classicyButton).default:focus-visible")).toMatch(
				/outline-offset: calc\(calc\(var\(--window-box-pixel\) \+ var\(--button-default-ring\)\) \+ var\(--window-box-pixel\)\);/,
			);
		});
	});

	// Plan 0018-dbd §3.5: the controls, black on white in both themes.
	describe("controls", () => {
		const BLACK = "var(--color-black)";
		const DIM = "var(--color-theme-06)";
		const dithered = (declarations: string) =>
			/mask-image: var\(--classicy-art-dither-checker\)/.test(declarations);

		it("pins the browser's accent and list markers to black, not the theme's tinge", () => {
			expect(css).toMatch(
				/\.classicyDesktop\[data-classicy-appearance=system7\],\s*\.classicyDesktop\[data-classicy-appearance=system7\] \* \{\s*accent-color: var\(--color-black\);\s*\}/,
			);
			expect(rule("*::marker")).toMatch(/color: currentColor;/);
		});

		it("inverts selected text in both themes, over the base sheet's theme-02", () => {
			const selection = rule("*::selection");
			expect(selection).toMatch(/color: var\(--color-white\);/);
			expect(selection).toMatch(/background: var\(--color-highlight\);/);
		});

		it("draws the checkbox as a framed 12 px box, an X of 18 pixels when on, framed twice when pressed", () => {
			const box = rule(".classicyCheckbox");
			expect(box).toMatch(/width: var\(--check-box-size\);/);
			expect(box).toMatch(
				/border: var\(--window-box-pixel\) solid var\(--color-black\);/,
			);
			expect(box).toMatch(/border-radius: 0;/);
			expect(layersOf(rule(".classicyCheckbox:checked"), BLACK)).toBe(18);
			expect(rule(".classicyCheckbox:active:not(:disabled)")).toMatch(
				/box-shadow: inset 0 0 0 var\(--window-box-pixel\) var\(--color-black\);/,
			);
			expect(layersOf(rule(".classicyCheckbox.mixed"), BLACK)).toBe(1);
		});

		// Mixed is its own state: the dash wins over the X, checked or not,
		// dimmed or not (same specificity, later in the sheet).
		it("draws a mixed box's dash over a checked box's X, dimmed or not", () => {
			const at = (selector: string) =>
				css.indexOf(
					`.classicyDesktop[data-classicy-appearance=system7] ${selector} {`,
				);
			expect(at(".classicyCheckbox.mixed")).toBeGreaterThan(
				at(".classicyCheckbox:checked"),
			);
			expect(at(".classicyCheckbox.mixed:disabled")).toBeGreaterThan(
				at(".classicyCheckbox:disabled:checked"),
			);
			expect(at(".classicyCheckbox:checked")).toBeGreaterThan(0);
			expect(at(".classicyCheckbox:disabled:checked")).toBeGreaterThan(0);
			expect(layersOf(rule(".classicyCheckbox.mixed:disabled"), DIM)).toBe(1);
		});

		it("draws the radio button's circle, its pressed ring and its dot as pixel art", () => {
			const wrapper = rule(".classicyRadioInputWrapper");
			expect(wrapper).toMatch(/border-radius: 0;/);
			expect(layersOf(wrapper, BLACK)).toBe(12);
			expect(
				layersOf(
					rule(".classicyRadioInputWrapper:has(> .classicyRadioInput:active)"),
					BLACK,
				),
			).toBe(14);
			expect(layersOf(rule(".classicyRadioInput"), BLACK)).toBe(3);
		});

		it("dims a checkbox, a radio button and a label through the dither in the dimmed ink", () => {
			const box = rule(".classicyCheckbox:disabled");
			expect(box).toMatch(/border-color: var\(--color-theme-06\);/);
			expect(dithered(box)).toBe(true);
			expect(layersOf(rule(".classicyCheckbox:disabled:checked"), DIM)).toBe(
				18,
			);
			const radio = rule(":where(.classicyRadioInputWrapper).disabled");
			expect(layersOf(radio, DIM)).toBe(12);
			expect(dithered(radio)).toBe(true);
			const label = rule(":where(.classicyControlLabel).disabled");
			expect(label).toMatch(/color: var\(--color-theme-06\);/);
			expect(dithered(label)).toBe(true);
		});

		it("draws the little arrows in a round-cornered frame, the pressed half inverted", () => {
			const box = rule(".classicyLittleArrows");
			expect(box).toMatch(/width: var\(--little-arrows-width\);/);
			expect(box).toMatch(/height: var\(--little-arrows-height\);/);
			// The frame's four sides and its four corner pixels.
			expect(layersOf(box, BLACK)).toBe(4 + 4);
			const up = ".classicyLittleArrows .classicyLittleArrowsButton";
			expect(layersOf(rule(up), BLACK)).toBe(5);
			expect(rule(`${up} img`)).toMatch(/visibility: hidden;/);
			const pressed = rule(`${up}:active:not(:disabled)`);
			expect(pressed).toMatch(/var\(--color-black\);$/m);
			expect(layersOf(pressed, "var(--color-white)")).toBe(5);
			expect(
				dithered(
					rule(
						".classicyLittleArrows:not(:has(> .classicyLittleArrowsButton:enabled))",
					),
				),
			).toBe(true);
		});

		it("draws the channel slider: its caps, runs and checker, and a capsule thumb", () => {
			const track = rule(".classicySlider::-webkit-slider-runnable-track");
			expect(track).toMatch(/height: var\(--channel-slider-channel\);/);
			// Both caps (10 rectangles each), four runs, seven checker columns.
			expect(layersOf(track, "var(--system7-slider-ink)")).toBe(10 + 10 + 4);
			expect(track.split("repeating-linear-gradient(").length - 1).toBe(7);
			const thumb = rule(".classicySlider::-webkit-slider-thumb");
			expect(layersOf(thumb, "var(--system7-slider-ink)")).toBe(10);
			expect(layersOf(thumb, "var(--color-white)")).toBe(3);
			expect(rule(".classicySliderTrackGroup")).toMatch(
				/--slider-thumb-height: var\(--channel-slider-thumb-across\);/,
			);
			expect(rule(":where(.classicySlider).disabled")).toMatch(
				/--system7-slider-ink: var\(--color-theme-06\);/,
			);
		});

		// The horizontal slider is the thumb's box tall; the vertical one keeps
		// the base sheet's 100%, its container's height, after it.
		it("sizes a horizontal slider by its thumb and lets a vertical one fill its container", () => {
			expect(rule(".classicySlider")).toMatch(
				/height: var\(--channel-slider-thumb-across\);/,
			);
			const vertical = rule(".classicySliderInputVertical");
			expect(vertical).toMatch(/height: 100%;/);
			expect(vertical).toMatch(/width: var\(--channel-slider-thumb-across\);/);
			const at = (selector: string) =>
				css.indexOf(
					`.classicyDesktop[data-classicy-appearance=system7] ${selector} {`,
				);
			expect(at(".classicySliderInputVertical")).toBeGreaterThan(
				at(".classicySlider"),
			);
			// With ticks: a row again, its track layer the stack's height.
			expect(rule(".classicySliderStackVertical")).toMatch(
				/flex-direction: row;/,
			);
			expect(
				rule(".classicySliderStackVertical > .classicySliderTrackLayer"),
			).toMatch(/height: 100%;/);
		});

		it("draws the outline triangle on the pixel grid, turning about a whole pixel", () => {
			const triangle = rule(".classicyTriangle");
			expect(triangle).toMatch(/width: var\(--outline-triangle-size\);/);
			expect(triangle).toMatch(/transform-box: border-box;/);
			expect(triangle).toMatch(
				/transform-origin: calc\(var\(--window-box-pixel\) \* 6\) calc\(var\(--window-box-pixel\) \* 5\);/,
			);
			expect(layersOf(triangle, BLACK)).toBe(10);
			expect(layersOf(triangle, "var(--color-theme-03)")).toBe(10);
			expect(rule(".classicyTriangle polygon")).toMatch(/display: none;/);
			expect(layersOf(rule(":active > .classicyTriangle"), BLACK)).toBe(6);
		});

		it("frames a text field in one black pixel, with no bevel or focus ring, its selection inverted", () => {
			const field = rule(".classicyInput");
			expect(rule(".classicySpinner")).toMatch(
				/height: var\(--edit-field-height\);/,
			);
			expect(field).toMatch(
				/border: var\(--window-box-pixel\) solid var\(--color-black\);/,
			);
			expect(field).toMatch(/box-shadow: none;/);
			expect(field).toMatch(/height: var\(--edit-field-height\);/);
			expect(rule(".classicyInput:focus-visible")).toMatch(/box-shadow: none;/);
			expect(rule(".classicyInput::selection")).toMatch(
				/background-color: var\(--color-highlight\);/,
			);
			expect(dithered(rule(".classicyInput:disabled"))).toBe(true);
			expect(rule(".classicyTextEditor:focus-visible")).toMatch(
				/box-shadow: none;/,
			);
			expect(rule(".classicyRichTextEditor:focus-visible")).toMatch(
				/box-shadow: none;/,
			);
			expect(rule(".classicyComboBoxIndicator")).toMatch(
				/width: var\(--combo-box-indicator-width\);/,
			);
		});

		it("frames a list in one black pixel and inverts its selected row", () => {
			const list = rule(".classicyListBox");
			expect(list).toMatch(
				/--classicy-listbox-row-height: var\(--list-box-row-height\);/,
			);
			expect(list).toMatch(
				/border: var\(--window-box-pixel\) solid var\(--color-black\);/,
			);
			expect(rule(".classicyListBoxViewport")).toMatch(/box-shadow: none;/);
			const selected = rule(":where(.classicyListBoxOption).selected");
			expect(selected).toMatch(/color: var\(--color-white\);/);
			expect(selected).toMatch(/background-color: var\(--color-highlight\);/);
		});

		it("dims a pop-up's text and triangle but keeps its frame", () => {
			expect(rule(":where(.classicyPopUpMenu).disabled")).toMatch(
				/background-image: none;/,
			);
			expect(
				dithered(
					rule(
						":where(.classicyPopUpMenuButton).disabled .classicyPopUpMenuValue",
					),
				),
			).toBe(true);
			expect(
				layersOf(
					rule(
						":where(.classicyPopUpMenuButton).disabled .classicyPopUpMenuIndicator",
					),
					DIM,
				),
			).toBe(6);
		});

		it("dots the group box and separator, and paints the legend on white", () => {
			const group = rule(".classicyControlGroupFieldsetPrimary");
			expect(group.split("repeating-linear-gradient(").length - 1).toBe(4);
			expect(group).toMatch(/background-origin: border-box;/);
			expect(rule(".classicyControlGroupLegend")).toMatch(
				/background-color: var\(--color-white\);/,
			);
			const separator = rule(".classicySeparatorHorizontal");
			// A menu's divider keeps its own line (_Menu.scss).
			expect(
				rule(
					":is(.classicyMenu, .classicySubMenu, .classicyContextMenu, .classicyContextSubMenu) .classicySeparatorHorizontal",
				),
			).toMatch(/background-image: none;/);
			// Color's gray pair, sized away in 1-bit; 1-bit's dots, sized
			// away in color.
			expect(separator).toMatch(
				/var\(--color-theme-06\) 50%, var\(--color-system-06\) 0\) left top ?\/ ?calc\(calc\(var\(--window-box-pixel\) \* 2\) - var\(--dither-tile-size\)\)/,
			);
			expect(separator).toMatch(
				/transparent 50%, var\(--color-system-06\) 0\) left top ?\/ ?var\(--dither-tile-size\)/,
			);
		});

		it("draws the progress bar and meter flat in a black frame, #444444 on #CCCCFF in color", () => {
			const bar = rule(".classicyProgress progress[value]");
			expect(bar).toMatch(/height: var\(--progress-height\);/);
			expect(bar).toMatch(
				/border: var\(--window-box-pixel\) solid var\(--color-black\);/,
			);
			expect(bar).toMatch(/background: var\(--color-theme-02\);/);
			expect(
				rule(".classicyProgress progress[value]::-webkit-progress-value"),
			).toMatch(
				/background: color-mix\(in srgb, var\(--color-theme-05\), var\(--color-system-07\)\);/,
			);
			expect(rule(".classicyMeter")).toMatch(
				/background: var\(--color-theme-02\);/,
			);
			expect(
				rule(
					".classicyProgressIndeterminate progress[value]::-webkit-progress-value",
				),
			).toMatch(/mask: none;/);
		});

		it("draws links black and the Mac OS 8 controls flat, never in the tinge", () => {
			expect(rule(".classicyLink")).toMatch(/color: var\(--color-black\);/);
			expect(dithered(rule(":where(.classicyLink).disabled"))).toBe(true);
			for (const control of [
				".classicyBevelButton:not(.classicyControlStrip *)",
				".classicyPlacard",
				".classicyImageWell",
			]) {
				const face = rule(control);
				expect(face).toMatch(/background-color: var\(--color-white\);/);
				expect(face).toMatch(/box-shadow: none;/);
			}
			// No control reads the tinge the base sheets draw faces and rings
			// with (#666699, #BBBBBB, #AAAAAA in System 7 Color).
			for (const control of [
				".classicyCheckbox",
				".classicyRadioInputWrapper",
				".classicyLittleArrows",
				".classicyInput",
				".classicyListBox",
				".classicyBevelButton:not(.classicyControlStrip *)",
				".classicyPlacard",
				".classicyImageWell",
				".classicyMeter",
				".classicyLink",
				".classicyTextEditor:focus-visible",
				".classicyRichTextEditor:focus-visible",
				".classicyProgress progress[value]",
			])
				expect(rule(control)).not.toMatch(
					/--color-theme-04|--color-system-0[2-4]\)/,
				);
		});
	});

	// Plan 0018-dbd §3.6: the scroll bars, from the 7.5 Finder, SimpleText and
	// Scrapbook captures.
	describe("scroll bars", () => {
		const BLACK = "var(--color-black)";
		const INK = "var(--system7-arrow-ink)";
		const FILL = "var(--system7-arrow-fill)";
		const IN_WINDOW =
			".classicyWindow .classicyWindowContents > .classicyScrollAreaBody > .classicyScrollBarVertical";
		const FOOT =
			".classicyWindow .classicyWindowContents > .classicyScrollAreaFoot > .classicyScrollBarHorizontal";
		const count = (declarations: string, text: string) =>
			declarations.split(text).length - 1;

		it("outlines a bar in four black layers over a white face, the sides on a window's frame left out", () => {
			const bar = rule(".classicyScrollBar");
			expect(bar).toMatch(
				/border: var\(--window-box-pixel\) solid transparent;/,
			);
			expect(layersOf(bar, BLACK)).toBe(4);
			expect(count(bar, "no-repeat border-box")).toBe(4);
			expect(bar).toMatch(/var\(--color-window-document\) padding-box;/);
			for (const side of ["top", "right", "bottom", "left"])
				expect(bar).toMatch(
					new RegExp(
						`--system7-bar-off-${side}: calc\\(var\\(--window-box-pixel\\) - var\\(--window-box-pixel\\)\\);`,
					),
				);
			// The vertical bar lies on the line above it and the frame at its
			// right; the horizontal one on the frame at its left and bottom.
			const vertical = rule(IN_WINDOW);
			expect(vertical).toMatch(
				/--system7-bar-off-top: var\(--window-border-size\);/,
			);
			expect(vertical).toMatch(
				/--system7-bar-off-right: var\(--window-border-size\);/,
			);
			expect(vertical).not.toMatch(/--system7-bar-off-(bottom|left)/);
			const horizontal = rule(FOOT);
			expect(horizontal).toMatch(
				/--system7-bar-off-bottom: var\(--window-border-size\);/,
			);
			expect(horizontal).toMatch(
				/--system7-bar-off-left: var\(--window-border-size\);/,
			);
			expect(horizontal).not.toMatch(/--system7-bar-off-(top|right)/);
		});

		it("shares a list's frame on three sides", () =>
			expect(
				rule(
					".classicyListBox > .classicyScrollAreaBody > .classicyScrollBarVertical",
				),
			).toMatch(
				/margin: calc\(var\(--window-box-pixel\) \* -1\) calc\(var\(--window-box-pixel\) \* -1\) calc\(var\(--window-box-pixel\) \* -1\) 0;/,
			));

		it("draws each arrow in 20 outline and 16 fill pixels' runs, its far half moved out by the spread", () => {
			for (const [arrow, toward] of [
				[".classicyScrollBarVertical .classicyScrollBarArrowStart", "+"],
				[".classicyScrollBarVertical .classicyScrollBarArrowEnd", "+"],
				[".classicyScrollBarHorizontal .classicyScrollBarArrowStart", "-"],
				[".classicyScrollBarHorizontal .classicyScrollBarArrowEnd", "+"],
			] as const) {
				const declarations = rule(arrow);
				expect(layersOf(declarations, INK), arrow).toBe(20);
				expect(layersOf(declarations, FILL), arrow).toBe(16);
				expect(
					count(declarations, `${toward} var(--system7-arrow-spread)`),
					arrow,
				).toBeGreaterThan(0);
			}
			// Up: the ten outline and eight fill runs right of the tip's column.
			expect(
				count(
					rule(".classicyScrollBarVertical .classicyScrollBarArrowStart"),
					"+ var(--system7-arrow-spread)",
				),
			).toBe(18);
			// Left: the whole glyph moves out (36 runs), the lower half down.
			expect(
				count(
					rule(".classicyScrollBarHorizontal .classicyScrollBarArrowStart"),
					"- var(--system7-arrow-spread)",
				),
			).toBe(36);
			expect(
				rule(".classicyScrollBarVertical .classicyScrollBarArrow"),
			).toMatch(
				/height: calc\(var\(--window-scrollbar-size\) - var\(--window-box-pixel\)\);/,
			);
		});

		it("gives the arrows the 7.5 face and inks, and the scroll bar knobs their per-theme shapes", () => {
			const bar = rule(".classicyScrollBar");
			expect(bar).toMatch(/--system7-arrow-ink: var\(--color-theme-07\);/);
			expect(bar).toMatch(/--system7-arrow-fill: var\(--color-theme-03\);/);
			expect(bar).toMatch(/--system7-arrow-face: var\(--color-system-01\);/);
			expect(bar).toMatch(/--system7-arrow-shadow: var\(--color-system-06\);/);
			expect(bar).toMatch(/--system7-arrow-bevel: var\(--scroll-bar-bevel\);/);
			expect(bar).toMatch(
				/--system7-arrow-spread: var\(--scroll-bar-arrow-spread\);/,
			);
			expect(bar).toMatch(/--system7-scroll-line: var\(--color-black\);/);
			expect(
				rule(".classicyScrollBarVertical .classicyScrollBarArrowStart"),
			).toMatch(
				/border-bottom: var\(--window-box-pixel\) solid var\(--system7-scroll-line\);/,
			);
		});

		it("fills a pressed arrow black, but not while there is nothing to scroll", () => {
			const pressed = rule(
				".classicyScrollBar:not(.fits, .inactive) .classicyScrollBarArrow.pressed",
			);
			expect(pressed).toMatch(/--system7-arrow-ink: var\(--color-black\);/);
			expect(pressed).toMatch(/--system7-arrow-fill: var\(--color-black\);/);
		});

		it("dots the track 25%, fixed to the screen, over the light gray", () => {
			const track = rule(".classicyScrollBarTrack");
			expect(count(track, "conic-gradient(from 270deg")).toBe(2);
			expect(count(track, "fixed")).toBe(2);
			expect(track).toMatch(/var\(--color-system-06\) 25%/);
			expect(track).toMatch(/var\(--color-system-01\);$/m);
		});

		it("fixes the scroll box at the knob's length, its grip as wide as the theme's", () => {
			for (const [thumb, min, max] of [
				[
					".classicyScrollBarVertical .classicyScrollBarThumb",
					"min-height",
					"max-height",
				],
				[
					".classicyScrollBarHorizontal .classicyScrollBarThumb",
					"min-width",
					"max-width",
				],
			] as const) {
				const box = rule(thumb);
				expect(box).toMatch(
					new RegExp(`${min}: var\\(--scroll-bar-box-length\\);`),
				);
				expect(box).toMatch(
					new RegExp(`${max}: var\\(--scroll-bar-box-length\\);`),
				);
				// Leading line, trailing line and far side, near side, the
				// line inside the leading one, four ridges, their first line and
				// their face.
				expect(layersOf(box, "var(--color-system-07)"), thumb).toBe(1);
				expect(layersOf(box, "var(--color-theme-07)"), thumb).toBe(2);
				expect(layersOf(box, "var(--color-window-border-outset)"), thumb).toBe(
					1,
				);
				expect(layersOf(box, "var(--color-theme-04)"), thumb).toBe(4);
				expect(layersOf(box, "var(--color-theme-03)"), thumb).toBe(1);
				expect(layersOf(box, "var(--color-theme-02)"), thumb).toBe(2);
				expect(count(box, "var(--scroll-bar-grip)"), thumb).toBe(6);
				expect(box).toMatch(/var\(--color-system-04\);$/m);
			}
		});

		// The box stays put while the drag outline follows the pointer
		// (layout.scrollBar.thumbDrag "onRelease", HIG p.165).
		it("draws the drag outline dotted, leaving the dragged box as it is", () => {
			const outline = rule(".classicyScrollBar .classicyScrollBarDragOutline");
			expect(outline).toMatch(
				/border: var\(--window-box-pixel\) dotted var\(--color-black\);/,
			);
			expect(outline).toMatch(/background: none;/);
			expect(rule(".classicyScrollBar .classicyScrollBarThumb.dragging")).toBe(
				"",
			);
		});

		it("draws a bar with nothing to scroll with hollow 1-bit-shaped arrows and a plain track", () => {
			const fits = rule(".classicyScrollBar.fits");
			expect(fits).toMatch(/--system7-arrow-ink: var\(--color-system-06\);/);
			expect(fits).toMatch(/--system7-arrow-fill: var\(--color-theme-01\);/);
			expect(fits).toMatch(/--system7-arrow-face: var\(--color-theme-01\);/);
			expect(fits).toMatch(/--system7-arrow-light: var\(--color-theme-01\);/);
			expect(fits).toMatch(/--system7-arrow-bevel: 0;/);
			expect(fits).toMatch(
				/--system7-arrow-spread: var\(--window-box-pixel\);/,
			);
			expect(fits).toMatch(/--system7-scroll-line: var\(--color-system-06\);/);
			expect(rule(".classicyScrollBar.fits .classicyScrollBarTrack")).toMatch(
				/background: var\(--color-theme-01\);/,
			);
		});

		it("leaves an inactive bar its outline alone, and an inactive window's header undimmed", () => {
			expect(rule(".classicyScrollBar.inactive > *")).toMatch(
				/visibility: hidden;/,
			);
			expect(rule(".classicyWindowHeaderDimmed")).toMatch(/opacity: 1;/);
		});

		// Where two bars meet outside a window, an empty white cell with its
		// own outer lines; in a window the cell is under the size box, and its
		// outer lines are the frame's.
		it("draws the corner cell's outer lines, leaving them to a window's frame", () => {
			const corner = rule(".classicyScrollAreaCorner");
			expect(corner).toMatch(
				/border-right: var\(--window-box-pixel\) solid var\(--color-black\);/,
			);
			expect(corner).toMatch(
				/border-bottom: var\(--window-box-pixel\) solid var\(--color-black\);/,
			);
			expect(corner).toMatch(
				/background: var\(--color-window-document\) padding-box;/,
			);
			const inWindow = rule(
				".classicyWindow .classicyWindowContents > .classicyScrollAreaFoot > .classicyScrollAreaCorner",
			);
			expect(inWindow).toMatch(/border-color: transparent;/);
			expect(inWindow).toMatch(
				/margin-right: calc\(var\(--window-border-size\) \* -1\);/,
			);
		});
	});

	// Plan 0018-dbd §3.7: the desktop, its icons, the Control Strip, the tab
	// control and the Appearance Manager, from the 7.5 desktop captures and
	// the Control Strip panel's own bitmaps.
	describe("desktop, icons, Control Strip and tabs", () => {
		const CORE_BACKGROUND = [
			/background-color: var\(--desktop-background-color\);/,
			/background-image: var\(--desktop-background-image\);/,
			/background-repeat: var\(--desktop-background-repeat\);/,
			/background-position: var\(--desktop-background-position\);/,
			/background-size: var\(--desktop-background-size\);/,
			/image-rendering: pixelated;/,
		];

		// The pattern is the theme's desktop picture (the core draws it); the
		// sheet only keeps its pixels whole at a fractional zoom.
		it("leaves the desktop's background to the core, drawing its picture's pixels whole", () => {
			const ROOT = ".classicyDesktop[data-classicy-appearance=system7]";
			const rootRules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
				.filter(([, header]) => header.trim() === ROOT)
				.map(([, , declarations]) => declarations)
				.join("\n");
			expect(rootRules).toMatch(/image-rendering: pixelated;/);
			expect(rootRules).not.toMatch(/background/);
			expect(rule("> *")).toMatch(/image-rendering: auto;/);
		});

		it("draws the desktop under the startup screen", () => {
			const startup = rule(".classicyStartupScreen");
			for (const declaration of CORE_BACKGROUND)
				expect(startup).toMatch(declaration);
		});

		it("previews the desktop itself in the Appearance Manager, on a white panel", () => {
			const preview = rule(".classicyAppearanceManagerDesktopPreview");
			for (const declaration of CORE_BACKGROUND)
				expect(preview).toMatch(declaration);
			expect(preview).toMatch(
				/border: var\(--window-border-size\) solid var\(--color-black\);/,
			);
			expect(preview).toMatch(/object-position: -200vw 0;/);
			expect(rule(".classicyAppearanceManagerContent")).toMatch(
				/background-color: var\(--color-window-document\);/,
			);
		});

		const FAMILIES = [
			[
				".classicyDesktopIcon",
				".classicyDesktopIconMaskOuter",
				".classicyDesktopIconMask",
			],
			[".classicyIcon", ".classicyIconMaskOuter", ".classicyIconMask"],
		] as const;

		it("draws an icon at its own size with an opaque Geneva label, inverted when selected", () => {
			for (const [root, outer, mask] of FAMILIES) {
				const box = rule(
					`${root} ${outer}:not(.classicyDesktopIconAliasBadge)`,
				);
				expect(box).toMatch(/width: var\(--desktop-icon-size\);/);
				expect(box).toMatch(/height: var\(--desktop-icon-size\);/);
				expect(box).toMatch(/mask-size: 100% 100%;/);
				expect(box).toMatch(/background: none;/);
				expect(
					rule(
						`${root} ${outer}:not(.classicyDesktopIconAliasBadge) > ${mask}`,
					),
				).toMatch(/mask-size: 100% 100%;/);
				const label = rule(`${root} p`);
				expect(label).toMatch(/margin-top: 0;/);
				expect(label).toMatch(
					/padding: var\(--icon-label-text-top\) var\(--icon-label-pad\) 0;/,
				);
				expect(label).toMatch(/white-space: nowrap;/);
				expect(label).toMatch(
					/line-height: calc\(var\(--icon-label-height\) - var\(--icon-label-text-top\)\);/,
				);
				expect(label).toMatch(/background: var\(--color-white\);/);
				const selected = rule(`${root}.selected p`);
				expect(selected).toMatch(/color: var\(--color-white\);/);
				expect(selected).toMatch(/background: var\(--color-black\);/);
			}
		});

		it("inverts a selected icon in 1-bit and darkens it in color, by the iconSelection.invert knob", () => {
			for (const [root, outer] of FAMILIES) {
				const invert = rule(`${root}.selected ${outer}::after`);
				expect(invert).toMatch(
					/linear-gradient\(var\(--color-white\), var\(--color-white\)\) left top\/var\(--icon-selection-invert\) var\(--icon-selection-invert\);/,
				);
				expect(invert).toMatch(/mix-blend-mode: difference;/);
				const darken = rule(`${root}.selected:not(.open) ${outer}::before`);
				expect(darken).toMatch(
					/color-mix\(in srgb, var\(--color-black\) 50%, transparent\)/,
				);
				expect(darken).toMatch(
					/left top\/calc\(var\(--window-box-pixel\) - var\(--icon-selection-invert\)\)/,
				);
				expect(rule(`${root}.selected ${outer} img`)).toMatch(/filter: none;/);
				// The overlays exist on every mask pair, the alias badge's too.
				expect(rule(`${root} ${outer}::after`)).toMatch(/content: "";/);
			}
			expect(css).not.toMatch(/dither-tile-size\)[^;]*\n?[^;]*difference/);
		});

		it("draws an opened icon's shape outlined in black, its inside eroded a pixel and dotted 25%", () => {
			for (const [root, outer, mask] of FAMILIES) {
				expect(rule(`${root}.open ${outer}`)).toMatch(
					/background: var\(--color-black\);/,
				);
				const inside = rule(`${root}.open ${outer} ${mask}`);
				expect(inside.split("var(--classicy-icon-mask)").length - 1).toBe(5);
				expect(inside).toMatch(
					/mask-position: 0 0, var\(--window-box-pixel\) 0, calc\(0% - var\(--window-box-pixel\)\) 0, 0 var\(--window-box-pixel\), 0 calc\(0% - var\(--window-box-pixel\)\);/,
				);
				expect(inside).toMatch(/mask-composite: intersect;/);
				expect(inside).toMatch(
					/var\(--classicy-art-halftone, none\) left top\/calc\(var\(--window-box-pixel\) \* 8\) calc\(var\(--window-box-pixel\) \* 8\)/,
				);
				expect(inside).toMatch(
					/--system7-icon-open-face: var\(--color-theme-04\);/,
				);
				expect(inside).toMatch(
					/left top\/var\(--icon-selection-invert\) var\(--icon-selection-invert\)/,
				);
				expect(inside).toMatch(/backdrop-filter: none;/);
				expect(rule(`${root}.selected.open ${outer} ${mask}`)).toMatch(
					/--system7-icon-open-face: var\(--color-theme-07\);/,
				);
			}
		});

		it("bevels the strip's cells by the theme's bevel width on the strip's face", () => {
			const BEVEL = "var(--control-strip-bevel-width)";
			const raised = rule(".classicyControlStripCell");
			expect(raised).toMatch(/, var\(--color-system-02\);$/m);
			expect(layersOf(raised, "var(--color-white)")).toBe(2);
			expect(layersOf(raised, "var(--color-system-04)")).toBe(2);
			expect(layersOf(raised, "var(--color-system-05)")).toBe(2);
			expect(raised).toContain(BEVEL);
			expect(raised).not.toMatch(/\* [0-9]/);
			expect(
				rule(
					".classicyControlStrip .classicyBevelButton.classicyControlStripModule",
				),
			).toBe(raised);
			const recessed = rule(".classicyControlStripScroll:disabled");
			expect(layersOf(recessed, "var(--color-system-05)")).toBe(2);
			expect(layersOf(recessed, "var(--color-white)")).toBe(2);
			const pressed = rule(".classicyControlStripCell:active:not(:disabled)");
			expect(layersOf(pressed, "var(--color-system-06)")).toBe(4);
			expect(pressed).toMatch(/, var\(--color-system-04\);$/m);
		});

		it("draws the pixel-art token n, the slider's inner ring, in theme-07", () =>
			expect(rule(".classicyPixeln")).toMatch(
				/fill: var\(--color-theme-07\);/,
			));

		it("frames a module's pop-up as a menu, its face the strip's with a white top and left", () => {
			const panel = rule(
				".classicyBevelButtonPopup.classicyBevelButtonPopupPanel",
			);
			expect(panel).toMatch(
				/border: var\(--window-border-size\) solid var\(--color-black\);/,
			);
			expect(layersOf(panel, "var(--color-white)")).toBe(2);
			expect(panel).toMatch(/var\(--color-system-02\);/);
			expect(
				rule(".classicyBevelButtonPopup.classicyBevelButtonPopupPanel::after"),
			).toMatch(/top: var\(--menu-frame-shadow-start\);/);
		});

		it("draws a tab as a box of black lines on white, the chosen one open into its white panel", () => {
			const BLACK = "var(--color-black)";
			const tab = rule(".classicyTabButtonWrapper");
			expect(tab).toMatch(/clip-path: none;/);
			// Top, two corner pixels, two sides, and the panel's line under it.
			expect(layersOf(tab, BLACK)).toBe(6);
			expect(tab).toMatch(/0 100%\/100% var\(--window-box-pixel\)/);
			const chosen = rule(
				".classicyTabButtonWrapper:has(.classicyTabButton.selected)",
			);
			expect(layersOf(chosen, BLACK)).toBe(5);
			expect(chosen).not.toMatch(/0 100%\/100%/);
			expect(
				rule(".classicyTabButtonWrapper + .classicyTabButtonWrapper"),
			).toMatch(/margin-left: calc\(0% - var\(--window-box-pixel\)\);/);
			expect(rule(".classicyTabsSizeSmall .classicyTabButton")).toMatch(
				/font-size: var\(--ui-font-size\);/,
			);
			expect(rule(".classicyTabActiveContent")).toMatch(
				/background-color: var\(--color-white\);/,
			);
			expect(
				rule(".classicyTabScrollButton:disabled .classicyTabScrollGlyph"),
			).toMatch(/mask-image: var\(--classicy-art-dither-checker\)/);
		});
	});

	it("uses no !important (the cascade layers decide)", () =>
		expect(readFileSync(STYLESHEET, "utf8")).not.toContain("!important"));
});
