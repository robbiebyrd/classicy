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

	// The stripes are raster art masking the token (story 0211-4pl): a
	// gradient's edges blend at 125% and 150%, a nearest-neighbor mask's
	// do not, and the ink stays the theme's.
	const STRIPES =
		/mask: var\(--classicy-art-window-stripes\) left var\(--box-pixel\) ?\/ ?auto repeat-x;/;
	const stripesOf = (bar: string) => {
		const layer = rule(`${bar}::before`);
		expect(layer, bar).toMatch(STRIPES);
		expect(layer, bar).toMatch(/background-color: var\(--color-system-06\);/);
		expect(layer, bar).toMatch(/image-rendering: pixelated;/);
		expect(layer, bar).toMatch(/z-index: -1;/);
		expect(rule(bar), bar).toMatch(/isolation: isolate;/);
		return layer;
	};

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
			expect(
				stripesOf(".classicyWindow.active .classicyWindowTitleBar"),
			).toMatch(/inset: 0 var\(--title-bar-stripe-inset\);/);
			const bar = rule(".classicyWindow .classicyWindowTitleBar");
			expect(bar).toMatch(/border-bottom: var\(--window-border-size\) solid/);
			expect(bar).not.toContain("gradient");
			expect(css).not.toContain("--title-bar-stripe-height");
			expect(rule(".classicyWindow .classicyWindowTitleBar::before")).toBe("");
		});

		it("dots the windoid's drag bar with its raster tile, nearest-neighbor", () => {
			const center =
				".classicyWindow.classicyWindowUtility .classicyWindowTitleBar .classicyWindowTitle .classicyWindowTitleCenter";
			expect(rule(center)).toMatch(/isolation: isolate;/);
			expect(rule(center)).not.toContain("gradient");
			const dots = rule(`${center}::before`);
			expect(dots).toMatch(
				/mask: var\(--classicy-art-window-utility-texture\) var\(--box-pixel\) var\(--box-pixel\) ?\/ ?var\(--utility-title-bar-texture-width\) var\(--utility-title-bar-texture-height\) repeat;/,
			);
			expect(dots).toMatch(/background-color: var\(--color-theme-05\);/);
			// A pixel out above, below and to the left, on clear rows and
			// columns of the tile.
			expect(dots).toMatch(
				/inset: calc\(var\(--utility-title-bar-dot-inset\) - var\(--box-pixel\)\) 0 calc\(var\(--utility-title-bar-dot-inset\) - var\(--box-pixel\)\) calc\(var\(--box-pixel\) \* -1\);/,
			);
			expect(dots).toMatch(/image-rendering: pixelated;/);
			// And no racing stripes: the active bar's layer is off.
			expect(
				rule(
					".classicyWindow.classicyWindowUtility .classicyWindowTitleBar::before",
				),
			).toMatch(/content: none;/);
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
			expect(header).toMatch(/height: var\(--header-strip-height\);/);
			expect(header).toMatch(
				/border-bottom: var\(--header-strip-rule\) double var\(--color-black\);/,
			);
			expect(header).toMatch(/background: var\(--color-window-document\);/);
			expect(
				rule(
					".classicyWindow .classicyWindowContents.classicyWindowContentsWithHeader",
				),
			).toMatch(
				/height: calc\(100% - var\(--window-title-bar-height\) \+ var\(--window-border-size\) - var\(--header-strip-height\) - var\(--header-strip-rule\)\);/,
			);
		});

		// Story 0211-4pl: the rules above outrank the base sheet's, so a
		// window holding its own menu bar (ClassicyWindowMenuBar.scss) must
		// give up the bar's height here too, header or not, windoid or not.
		it("gives up a window's own menu bar too, under a header and in a windoid", () => {
			const bar =
				"var(--classicy-window-menu-bar-height, var(--window-menu-bar-height))";
			for (const root of [
				".classicyWindow.classicyWindowWithMenuBar",
				".classicyWindow:has(> .classicyWindowMenuBar)",
			]) {
				const height = (rest: string) =>
					/height: (calc\(.*\));/.exec(rule(`${root}${rest}`))?.[1] ?? "";
				const plain = height(" .classicyWindowContents");
				const header = height(
					" .classicyWindowContents.classicyWindowContentsWithHeader",
				);
				const windoid = height(
					".classicyWindowUtility .classicyWindowContents",
				);
				const windoidHeader = height(
					".classicyWindowUtility .classicyWindowContents.classicyWindowContentsWithHeader",
				);
				for (const h of [plain, header, windoid, windoidHeader])
					expect(h, root).toContain(`- ${bar})`);
				for (const h of [plain, header])
					expect(h, root).toContain("--window-title-bar-height");
				for (const h of [windoid, windoidHeader])
					expect(h, root).toContain("--window-utility-title-bar-height");
				for (const h of [header, windoidHeader]) {
					expect(h, root).toContain("--header-strip-height");
					expect(h, root).toContain("--header-strip-rule");
				}
				for (const h of [plain, windoid])
					expect(h, root).not.toContain("--header-strip");
			}
		});

		it("draws the standalone frame as an active document window's chrome", () => {
			expect(rule(".classicyWindowFrame")).toMatch(
				/box-shadow: var\(--window-border-size\) var\(--window-border-size\) 0 0 var\(--color-black\);/,
			);
			const bar = rule(".classicyWindowFrame > .classicyWindowTitleBar");
			stripesOf(".classicyWindowFrame > .classicyWindowTitleBar");
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

		// One blink a cycle: the chosen item turns back to black on white for
		// half of it, then inverts again. The hook (hooks.ts) sets how many
		// cycles run, three, System 7's default (General Controls' Menu
		// Blinking, HIG figure 7-9), as an inline animation-iteration-count.
		it("blinks a chosen item black and white, one blink a cycle", () => {
			const flash = rule(".classicyMenuItemFlash");
			expect(flash).toMatch(/animation-name: classicySystem7MenuItemFlash;/);
			// 40 ms off and 40 ms on: three blinks in 240 ms, inside the core's
			// 400 ms fallback with room for a slow engine's start.
			expect(flash).toMatch(/animation-duration: 0?\.08s;/);
			expect(flash).toMatch(/animation-timing-function: steps\(1, end\);/);
			const keyframes =
				/@keyframes classicySystem7MenuItemFlash \{([\s\S]*?)\n {2}\}/.exec(
					css,
				)?.[1] ?? "";
			const step = (at: string) =>
				new RegExp(`(?:^|\\n)\\s*${at} \\{([^}]*)\\}`).exec(keyframes)?.[1] ??
				"";
			// Off (unhighlighted) for the first half, on (inverted) after.
			expect(step("0%")).toMatch(/color: var\(--color-black\);/);
			expect(step("0%")).toMatch(/background-color: var\(--color-white\);/);
			expect(step("50%, 100%")).toMatch(/color: var\(--color-white\);/);
			expect(step("50%, 100%")).toMatch(
				/background-color: var\(--color-black\);/,
			);
			expect(keyframes.match(/\{/g)).toHaveLength(2);
		});

		it("draws the bar white over its black line, under the screen's rounded corners", () => {
			const bar = rule(".classicyDesktopMenu");
			expect(bar).toMatch(/height: var\(--menu-bar-height\);/);
			expect(bar).toMatch(
				/border-bottom: var\(--window-border-size\) solid var\(--color-black\);/,
			);
			expect(bar).toMatch(/border-radius: 0;/);
			// Its own insets at both ends, no window knob borrowed.
			expect(bar).toMatch(
				/padding: 0 var\(--menu-bar-end-inset\) 0 var\(--menu-bar-inset\);/,
			);
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

		// 7.5.5's Application menu title is the front application's small
		// icon alone, in a title 34 px wide (`*-755-appmenu-closed.png`,
		// story 0214-c61): the name is kept for screen readers, at no size.
		it("draws the Application menu's title as the front app's icon alone", () => {
			const switcher = rule(`${TITLES}.classicyDesktopMenuAppSwitcher`);
			expect(switcher).toMatch(
				/padding: 0 var\(--menu-bar-switcher-title-end\) 0 var\(--menu-bar-switcher-title-start\);/,
			);
			const p = rule(`${TITLES}.classicyDesktopMenuAppSwitcher > p`);
			expect(p).toMatch(/font-size: 0;/);
			const menu = rule(
				`${TITLES}.classicyDesktopMenuAppSwitcher > .classicyMenuWrapper > .classicySubMenu`,
			);
			expect(menu).toMatch(/right: 0;/);
			expect(menu).toMatch(/left: auto;/);
			// Open, its icon inverts with the highlight in 1-bit, by
			// menuBar.titleArtInvert as a number (review r1 item 1).
			expect(css).toContain(
				"filter: invert(tan(atan2(var(--menu-bar-title-art-invert), var(--box-pixel))));",
			);
			// A hidden application's icon in the menu is dimmed, through the
			// checker (review r0 Minor).
			const hidden = rule(".classicyDesktopMenuAppHidden > p > img");
			expect(hidden).toContain(
				"mask-image: var(--classicy-art-dither-checker)",
			);
			expect(hidden).toContain(
				"mask-size: var(--dither-tile-size) var(--dither-tile-size), auto;",
			);
			expect(css).toContain(
				"opacity: tan(atan2(var(--menu-item-hidden-icon-opacity), var(--menu-item-hidden-icon-opacity-scale)));",
			);
			const img = rule(`${TITLES}.classicyDesktopMenuAppSwitcher > p > img`);
			expect(img).toMatch(/width: var\(--menu-bar-title-art-size\);/);
			expect(img).toMatch(/margin: 0;/);
		});

		it("puts Help between the clock and the Application menu", () => {
			expect(rule(".classicyDesktopMenu > [data-classicy-part=help]")).toMatch(
				/order: 55;/,
			);
			expect(
				rule(".classicyDesktopMenu > :has(> [data-classicy-part=help])"),
			).toMatch(/order: 55;/);
		});

		// The Apple and Help titles are their art, 16 px, in the highlight
		// the captures measure (*-menu-hierarchical-controlpanels,
		// *-menu-help-and-selected-icon).
		it("draws the Apple and Help titles as their art at its own size", () => {
			const both = rule(
				`${TITLES}:is(.classicyDesktopMenuApple, .classicyDesktopMenuHelp) > p > img`,
			);
			expect(both).toMatch(/width: var\(--menu-bar-title-art-size\);/);
			expect(both).toMatch(/height: var\(--menu-bar-title-art-size\);/);
			expect(both).toMatch(/margin: 0;/);
			expect(rule(`${TITLES}.classicyDesktopMenuApple`)).toMatch(
				/padding: 0 var\(--menu-bar-apple-title-end\) 0 var\(--menu-bar-apple-title-start\);/,
			);
			expect(rule(`${TITLES}.classicyDesktopMenuHelp`)).toMatch(
				/padding: var\(--menu-bar-help-title-drop\) var\(--menu-bar-help-title-end\) 0 var\(--menu-bar-help-title-start\);/,
			);
		});

		// Open, the 1-bit art inverts with its highlight and the color art
		// draws unchanged: a white layer the art's shape, in `difference`,
		// tiled by its own knob, menuBar.titleArtInvert (1 px in 1-bit, none
		// in color), not the icons' iconSelection.invert.
		it("inverts an open Apple or Help title's art in 1-bit only", () => {
			for (const [title, art] of [
				[".classicyDesktopMenuApple", "--classicy-art-apple-menu"],
				[".classicyDesktopMenuHelp", "--classicy-art-help-menu-title"],
			]) {
				const overlay = rule(`${TITLES}${title}.open > p:has(> img)::after`);
				expect(overlay).toMatch(/mix-blend-mode: difference;/);
				expect(overlay).toMatch(
					/linear-gradient\(var\(--color-white\), var\(--color-white\)\) left top ?\/ ?var\(--menu-bar-title-art-invert\) var\(--menu-bar-title-art-invert\)/,
				);
				expect(overlay).not.toMatch(/icon-selection-invert/);
				expect(overlay).toContain(
					`mask: var(${art}, linear-gradient(transparent, transparent)) left top/100% 100% no-repeat;`,
				);
				expect(overlay).toMatch(/width: var\(--menu-bar-title-art-size\);/);
			}
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

		// The open pop-up's frame is declared once: no declaration of it is
		// overridden by a later one (story 0211-4pl, a frame mixin whose
		// border and shadow a later rule replaced).
		it("declares each of the open pop-up's properties once", () => {
			const properties = [
				...rule(".classicyPopUpMenuList").matchAll(/^\s*([a-z-]+):/gm),
			].map(([, property]) => property);
			expect(properties.length).toBeGreaterThan(5);
			expect(properties.filter((p, i) => properties.indexOf(p) !== i)).toEqual(
				[],
			);
		});

		// Story 0196-1i1: the focus ring left the base sheet; System 7 keeps
		// the one it drew, square (the base's rounding was Platinum's).
		it("rings a pop-up focused from the keyboard, square", () => {
			expect(rule(".classicyPopUpMenuButton:focus")).toMatch(
				/outline: var\(--color-outline\) solid var\(--control-frame-width\);/,
			);
			expect(rule(".classicyPopUpMenuButton:focus")).not.toMatch(
				/border-radius/,
			);
			expect(
				rule(".classicyPopUpMenuButton:focus:not(:focus-visible)"),
			).toMatch(/outline: none;/);
		});

		// A scrolling list clips its own shadow pseudo-elements: they are off,
		// and the frame's shadow is drawn on the sibling over the list in their
		// wrapper, its border the frame's, transparent (none on top under a
		// pull-down, which has no top line).
		it("draws a scrolling menu's frame shadow on its sibling, as the frame draws it", () => {
			expect(
				rule(
					":is(.classicyMenu, .classicySubMenu, .classicyContextMenu, .classicyContextSubMenu).classicyMenuListScrolls::after",
				),
			).toMatch(/display: none;/);
			expect(
				rule(
					":is(.classicyMenu, .classicySubMenu, .classicyContextMenu, .classicyContextSubMenu).classicyMenuListScrolls",
				),
			).not.toMatch(/box-shadow/);
			const sibling = rule(".classicyMenuScrollShadow");
			expect(sibling).toMatch(
				/border: var\(--window-border-size\) solid transparent;/,
			);
			expect(sibling).toMatch(/box-sizing: border-box;/);
			expect(rule(".classicyMenuScrollShadow::after")).toBe(
				rule(
					":is(.classicyMenu, .classicySubMenu, .classicyContextMenu, .classicyContextSubMenu)::after",
				),
			);
			expect(rule(".classicyMenuScrollShadow::before")).toBe(
				rule(
					":is(.classicyMenu, .classicySubMenu, .classicyContextMenu, .classicyContextSubMenu)::before",
				),
			);
			expect(css).toMatch(
				/> \.classicyMenuWrapper > \.classicyMenuScrollShadow \{\s*border-top: 0;/,
			);
		});

		// The menu's scroll indicator: the pop-up's 11 x 6 triangle on the
		// menu's white face, at the items' text inset (HIG p.78, as the
		// hierarchical Control Panels menu shows it).
		it("draws a pop-up menu's scroll indicators as solid triangles on white", () => {
			const arrow = rule(".classicyPopUpMenuScrollArrow");
			expect(arrow).toMatch(/background: var\(--color-white\);/);
			expect(arrow).toMatch(/justify-content: flex-start;/);
			const box = rule(".classicyPopUpMenuScrollArrow::before");
			expect(box).toMatch(/width: calc\(var\(--box-pixel\) \* 11\);/);
			expect(box).toMatch(/height: calc\(var\(--box-pixel\) \* 6\);/);
			for (const direction of ["Up", "Down"]) {
				const glyph = rule(`.classicyPopUpMenuScrollArrow${direction}::before`);
				expect(layersOf(glyph, "var(--color-black)"), direction).toBe(6);
			}
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
				stripesOf(".classicyWindow.active .classicyWindowTitleBarModal"),
			).toMatch(/inset: 0 var\(--title-bar-modal-stripe-inset\);/);
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

		// HIG p.201: "Place the Save button in the lower-right corner with the
		// Cancel button to its left. Place the Don't Save button left-aligned
		// with the message text." Arranged with `order` on the buttons' roles
		// (CLAUDE.md, Arrangement): every other button (Don't Save) before the
		// cancel and default ones, the first of them `alertLayout.
		// otherButtonInset` (73) from the inner line, as in SimpleText's
		// save-changes alert, the last pushing the safe buttons right.
		it("puts Don't Save at the left, under the message text, away from Save and Cancel", () => {
			const other =
				".classicyAlert .classicyAlertButtons .classicyButton[data-classicy-role=other]";
			expect(rule(other)).toMatch(/order: -1;/);
			expect(
				rule(
					`${other}:nth-child(1 of .classicyButton[data-classicy-role=other])`,
				),
			).toMatch(
				/margin-left: calc\(var\(--alert-layout-other-button-inset\) - var\(--alert-layout-icon-inset\)\);/,
			);
			expect(
				rule(
					`${other}:nth-last-child(1 of .classicyButton[data-classicy-role=other])`,
				),
			).toMatch(/margin-right: auto;/);
			// The safe buttons keep the list's order, default last.
			expect(css).not.toMatch(
				/\[data-classicy-role="?(default|cancel)"?\][^{]*\{[^}]*order:/,
			);
		});

		// A help button (HIGOS8 p.86; System 7's alerts had none, its help was
		// Balloon Help) is pinned at the far left, before Don't Save, and
		// takes no room when Don't Save is there: one auto margin, Don't
		// Save's, so the free space stays between it and the safe buttons
		// (fix round 1; two auto margins split it). Without a Don't Save, the
		// help button keeps the base sheet's auto margin; with one, Don't Save
		// follows it rather than its 73 px inset.
		it("pins a help button at the far left, Don't Save after it, the room after both", () => {
			const buttons = ".classicyAlert .classicyAlertButtons";
			expect(rule(`${buttons} .classicyAlertHelpButton`)).toMatch(/order: -2;/);
			// Keyed on the row's own classes (ClassicyAlert sets them from its
			// buttons), not `:has()`, which Firefox 113-120 lacks.
			expect(
				rule(
					`${buttons}.classicyAlertButtonsHaveOther > .classicyAlertHelpButton`,
				),
			).toMatch(/margin-right: 0;/);
			expect(
				rule(
					`${buttons}.classicyAlertButtonsHaveHelp > .classicyButton[data-classicy-role=other]:nth-child(1 of .classicyButton[data-classicy-role=other])`,
				),
			).toMatch(/margin-left: 0;/);
			expect(css).not.toMatch(/classicyAlertButtons[^{]*:has\(/);
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
				/inset: calc\(calc\(var\(--box-pixel\) \+ var\(--button-default-ring\)\) \* -1\);/,
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
				/outline: calc\(var\(--box-pixel\) \* 2\) solid var\(--color-black\);/,
			);
			expect(mark).toMatch(/outline-offset: var\(--box-pixel\);/);
			expect(rule(":where(.classicyButton).default:focus-visible")).toMatch(
				/outline-offset: calc\(calc\(var\(--box-pixel\) \+ var\(--button-default-ring\)\) \+ var\(--box-pixel\)\);/,
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
				/border: var\(--box-pixel\) solid var\(--color-black\);/,
			);
			expect(box).toMatch(/border-radius: 0;/);
			expect(layersOf(rule(".classicyCheckbox:checked"), BLACK)).toBe(18);
			expect(rule(".classicyCheckbox:active:not(:disabled)")).toMatch(
				/box-shadow: inset 0 0 0 var\(--box-pixel\) var\(--color-black\);/,
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

		// The checker keeps the pixels whose x + y is even, from the box's
		// border edge: all of the X's falling diagonal and none of its rising
		// one, which a dimmed checked box lost (story 0198-0kv). Simulated
		// here on the compiled mask: in 1-bit (a 2 px tile) each diagonal
		// keeps every other pixel; in color (no tile) the whole X shows.
		it("keeps both of a dimmed checked box's diagonals, each dotted, through the dither", () => {
			const declared = (rules: string, property: string) =>
				splitSelectors(
					new RegExp(`(?:^|\\n)\\s*${property}: ([^;]*);`).exec(rules)?.[1] ??
						"",
				);
			const masked = rule(".classicyCheckbox:disabled:checked:not(.mixed)");
			const images = declared(masked, "mask-image");
			const positions = declared(masked, "mask-position");
			const sizes = declared(masked, "mask-size");
			const repeats = declared(masked, "mask-repeat");
			const composites = declared(masked, "mask-composite");
			expect(images.length).toBe(12);
			for (const list of [positions, sizes, repeats])
				expect(list.length).toBe(images.length);
			// A length in grid pixels, with the theme's tile (2 or 0).
			const length = (value: string, tile: number): number => {
				if (value === "0") return 0;
				if (value === "var(--box-pixel)") return 1;
				if (value === "var(--dither-tile-size)") return tile;
				if (value === "min(var(--dither-tile-size), var(--box-pixel))")
					return Math.min(tile, 1);
				const m = /^calc\(var\(--box-pixel\) \* (\d+)\)$/.exec(value);
				if (!m) throw new Error(`not a grid length: ${value}`);
				return Number(m[1]);
			};
			// Space-separated values outside parentheses.
			const pair = (value: string) => {
				const out = [""];
				let depth = 0;
				for (const c of value) {
					if (c === "(") depth++;
					if (c === ")") depth--;
					if (c === " " && depth === 0) out.push("");
					else out[out.length - 1] += c;
				}
				return out.filter(Boolean);
			};
			// The 12 x 12 box's mask, pixel by pixel, composited bottom up.
			const mask = (tile: number) => {
				let result = new Set<string>();
				for (let i = images.length - 1; i >= 0; i--) {
					const [x, y] = pair(positions[i]).map((v) => length(v, tile));
					const [w, h] =
						sizes[i] === "auto"
							? [12, 12]
							: pair(sizes[i]).map((v) => length(v, tile));
					const layer = new Set<string>();
					for (let py = 0; py < 12; py++)
						for (let px = 0; px < 12; px++) {
							if (images[i] === "var(--classicy-art-dither-checker)") {
								// The tile is opaque where x + y is odd (art/dither-checker.svg).
								if (w > 0 && (px + py) % 2 === 1 && repeats[i] === "repeat")
									layer.add(`${px},${py}`);
							} else if (px >= x && px < x + w && py >= y && py < y + h)
								layer.add(`${px},${py}`);
						}
					if (i === images.length - 1) result = layer;
					else {
						const op = composites[i] ?? composites.at(-1);
						const next = new Set<string>();
						const all = new Set([...layer, ...result]);
						// The layer (source) over the mask below it (destination),
						// as CSS Masking defines each operator.
						for (const key of all) {
							const a = layer.has(key);
							const b = result.has(key);
							if (
								(op === "add" && (a || b)) ||
								(op === "subtract" && a && !b) ||
								(op === "intersect" && a && b) ||
								(op === "exclude" && a !== b)
							)
								next.add(key);
						}
						result = next;
					}
				}
				return result;
			};
			// The X, from the box's border edge (one pixel of frame).
			const falling = Array.from({ length: 10 }, (_, i) => `${i + 1},${i + 1}`);
			const rising = Array.from({ length: 10 }, (_, i) => `${10 - i},${i + 1}`);
			const shown = (tile: number, diagonal: string[]) =>
				diagonal.filter((key) => mask(tile).has(key));
			expect(shown(2, falling)).toEqual(["1,1", "3,3", "5,5", "7,7", "9,9"]);
			expect(shown(2, rising)).toEqual(["10,1", "8,3", "6,5", "4,7", "2,9"]);
			expect(shown(0, falling)).toEqual(falling);
			expect(shown(0, rising)).toEqual(rising);
			// The frame stays dithered: its pixels are the checker's.
			expect(mask(2).has("0,0")).toBe(true);
			expect(mask(2).has("1,0")).toBe(false);
			// Mixed dims its dash through the plain dither.
			expect(rule(".classicyCheckbox.mixed:disabled")).not.toMatch(/mask/);
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
			// Both caps (10 rectangles each), the far cap's five checker
			// pixels, four runs, seven checker columns.
			expect(layersOf(track, "var(--system7-slider-ink)")).toBe(
				10 + 10 + 5 + 4,
			);
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
			// The base sheet no longer dims by a filter (it is Platinum's).
			expect(rule(":where(.classicySlider).disabled")).not.toMatch(/filter/);
			// The base sheet resets Firefox's 0.5em thumb corner radius, which
			// clipped the capsule's corners; System 7 sets none back.
			expect(rule(".classicySlider::-moz-range-thumb")).not.toMatch(
				/border-radius/,
			);
		});

		// Story 0198-0kv: the Sound control panel's slider
		// (`*-controlpanel-sound-slider.png`) at any length. These decode the
		// compiled layers into rows of pixels ("#" ink) and compare them with
		// the capture's.
		describe("the channel slider, pixel for pixel", () => {
			const INK = "var(--system7-slider-ink)";
			// A length in grid pixels; `100%` is the box's `full` side.
			const length = (value: string, full: number): number => {
				const v = value.trim();
				if (v === "0") return 0;
				if (v === "var(--box-pixel)") return 1;
				if (v === "var(--channel-slider-thumb-stop)") return 5;
				let m = /^calc\(var\(--box-pixel\) \* (\d+)\)$/.exec(v);
				if (m) return Number(m[1]);
				m = /^calc\(100% - (.*)\)$/.exec(v);
				if (m) return full - length(m[1], full);
				m = /^calc\((.*) \+ var\(--channel-slider-thumb-stop\)\)$/.exec(v);
				if (m) return length(m[1], full) + 5;
				throw new Error(`not a grid length: ${v}`);
			};
			// Space-separated tokens outside parentheses.
			const tokens = (text: string) => {
				const out = [""];
				let depth = 0;
				for (const c of text.trim()) {
					if (c === "(") depth++;
					if (c === ")") depth--;
					if (c === " " && depth === 0) out.push("");
					else out[out.length - 1] += c;
				}
				return out.filter(Boolean);
			};
			// The rows a `w` x `h` box's background draws.
			const decode = (declarations: string, w: number, h: number) => {
				const background =
					/(?:^|\n)\s*background: ([^;]*);/.exec(declarations)?.[1] ?? "";
				const rows = Array.from({ length: h }, () => Array(w).fill("."));
				for (const layer of splitSelectors(background)) {
					// The gradient's arguments run to its matching parenthesis.
					const open = layer.indexOf("(");
					let close = open;
					for (let depth = 0; close < layer.length; close++) {
						if (layer[close] === "(") depth++;
						if (layer[close] === ")" && --depth === 0) break;
					}
					const m = /^(repeating-)?linear-gradient$/.test(layer.slice(0, open))
						? /^ (.*)\/(.*) no-repeat$/.exec(layer.slice(close + 1))
						: null;
					if (!m) throw new Error(`not a pixel layer: ${layer}`);
					const repeating = layer.startsWith("repeating-");
					const args = layer.slice(open + 1, close);
					const place = tokens(m[1]);
					const edge = (side: string, size: number, full: number) => {
						const i = place.indexOf(side);
						return i < 0 ? undefined : full - size - length(place[i + 1], full);
					};
					const [lw, lh] = tokens(m[2]);
					const sw = length(lw, w);
					const sh = length(lh, h);
					const left = place.indexOf("left");
					const top = place.indexOf("top");
					const x =
						left >= 0
							? length(place[left + 1], w)
							: (edge("right", sw, w) ?? 0);
					const y =
						top >= 0 ? length(place[top + 1], h) : (edge("bottom", sh, h) ?? 0);
					const across = args.startsWith("to right");
					if (!args.includes(INK) && !args.includes("--color-white"))
						throw new Error(`unknown ink: ${args}`);
					for (let j = y; j < y + sh; j++)
						for (let i = x; i < x + sw; i++) {
							// A repeating gradient inks its first pixel of every two.
							if (repeating && (across ? i - x : j - y) % 2 === 1) continue;
							rows[j][i] = args.includes(INK) ? "#" : "W";
						}
				}
				return rows.map((r) => r.join(""));
			};
			const turn = (rows: string[]) =>
				Array.from({ length: rows[0].length }, (_, x) =>
					rows.map((r) => r[x]).join(""),
				);

			// The capture's channel, read from its far (bottom) end; its near end
			// lies under the thumb, and is the art's own (the same curve, its
			// checker starting a column over).
			const FAR = [
				"....#####....",
				"..##.....##..",
				".#...###...#.",
				".#.###.###.#.",
				"#..##.#.##..#",
				"#.##.#.#.##.#",
			];
			const NEAR = [
				"....#####....",
				"..##.....##..",
				".#...###...#.",
				".#.##.#.##.#.",
				"#..#.#.#.#..#",
				"#.#.#.#.#.#.#",
			];
			const vertical = (length: number) =>
				decode(
					rule(".classicySliderInputVertical::-webkit-slider-runnable-track"),
					13,
					length,
				);

			it("ends the checker at the far cap as the capture does, at any length", () => {
				for (const length of [40, 41, 120, 121]) {
					const rows = vertical(length);
					expect(rows.slice(0, 6), `${length}`).toEqual(NEAR);
					// The cap's five rows are fixed art; the sixth is the checker's
					// own, in step with the capture on an even length.
					expect(rows.slice(-5).reverse(), `${length}`).toEqual(
						FAR.slice(0, 5),
					);
					if (length % 2 === 0)
						expect(rows.slice(-6).reverse(), `${length}`).toEqual(FAR);
					// Between the caps, a 50% checker.
					for (let y = 6; y < length - 6; y++)
						expect(rows[y], `${length}:${y}`).toBe(
							y % 2 === 0 ? "#.##.#.#.##.#" : "#.#.#.#.#.#.#",
						);
				}
			});

			it("draws the horizontal channel as the vertical one turned", () => {
				const horizontal = decode(
					rule(".classicySlider::-webkit-slider-runnable-track"),
					40,
					13,
				);
				expect(turn(horizontal)).toEqual(vertical(40));
			});

			// HIG figure 7-15: the thumb stops `channelSlider.thumbStop` (5)
			// pixels from each end, where the caps' curve ends. The thumb's box
			// is the capsule and that stop each side along the channel, so the
			// browser's travel ends there; nothing turns it.
			// The capsule lying across a vertical channel, as captured ("W" its
			// white inside).
			const LYING = [
				"..###################..",
				".#WWWWWWWWWWWWWWWWWWW#.",
				".#####################.",
				"#WWWWWWWWWWWWWWWWWWWWW#",
				"#WWWWWWWWWWWWWWWWWWWWW#",
				"#WWWWWWWWWWWWWWWWWWWWW#",
				"#WWWWWWWWWWWWWWWWWWWWW#",
				"#WWWWWWWWWWWWWWWWWWWWW#",
				".#####################.",
				".#WWWWWWWWWWWWWWWWWWW#.",
				"..###################..",
			];
			it("stops the thumb five pixels from each end, in both orientations", () => {
				const group = rule(".classicySliderTrackGroup");
				expect(group).toMatch(
					/--slider-thumb-width: calc\(var\(--channel-slider-thumb-along\) \+ var\(--channel-slider-thumb-stop\) \+ var\(--channel-slider-thumb-stop\)\);/,
				);
				expect(group).toMatch(
					/--slider-thumb-height: var\(--channel-slider-thumb-across\);/,
				);
				const verticalGroup = rule(".classicySliderTrackGroupVertical");
				expect(verticalGroup).toMatch(
					/--slider-thumb-width: var\(--channel-slider-thumb-across\);/,
				);
				expect(verticalGroup).toMatch(
					/--slider-thumb-height: calc\(var\(--channel-slider-thumb-along\) \+ var\(--channel-slider-thumb-stop\) \+ var\(--channel-slider-thumb-stop\)\);/,
				);
				for (const pseudo of ["::-webkit-slider-thumb", "::-moz-range-thumb"]) {
					// Horizontal: 21 along x 23 across, the capsule upright in
					// columns 5 to 15.
					const upright = decode(rule(`.classicySlider${pseudo}`), 21, 23);
					expect(upright.map((r) => r.slice(0, 5)).join("")).toMatch(/^\.+$/);
					expect(upright.map((r) => r.slice(16)).join("")).toMatch(/^\.+$/);
					expect(upright.map((r) => r.slice(5, 16))).toEqual(turn(LYING));
					// Vertical: 23 across x 21 along, the capsule lying in rows 5
					// to 15.
					const lying = decode(
						rule(`.classicySliderInputVertical${pseudo}`),
						23,
						21,
					);
					expect(lying.slice(0, 5).join("")).toMatch(/^\.+$/);
					expect(lying.slice(16).join("")).toMatch(/^\.+$/);
					expect(lying.slice(5, 16)).toEqual(LYING);
					// Drawn as seen: the base sheet's turns are undone.
					expect(rule(`.classicySlider${pseudo}`)).toMatch(/transform: none;/);
				}
				// Centered across the channel: the box overhangs it each side.
				expect(
					rule(".classicySliderInputVertical::-webkit-slider-thumb"),
				).toMatch(
					/margin: 0 0 0 calc\(var\(--channel-slider-thumb-overhang\) \* -1\);/,
				);
			});

			// The ticks start at the channel's edge, past its outer line (Sound:
			// the line and five pixels), not past the thumb's overhang.
			it("hangs the ticks from the channel's edge", () => {
				expect(rule(".classicySliderTick")).toMatch(
					/top: calc\(var\(--channel-slider-thumb-overhang\) \* -1\);/,
				);
				const vertical = rule(
					".classicySliderStackVertical .classicySliderTick",
				);
				expect(vertical).toMatch(
					/left: calc\(var\(--channel-slider-thumb-overhang\) \* -1\);/,
				);
				// A vertical tick is placed up its rail by `bottom` (the base
				// sheet's): the horizontal one's `top` is undone.
				expect(vertical).toMatch(/top: auto;/);
			});
		});

		// Fix round 2: the ticks' and their labels' ink left the base sheet;
		// System 7 draws its own, black, dimmed through the dither.
		it("inks its ticks and their labels black, and dims ticks through the dither", () => {
			expect(rule(".classicySliderTick")).toMatch(
				/background: var\(--color-black\);/,
			);
			expect(rule(".classicySliderTickLabel")).toMatch(
				/color: var\(--color-black\);/,
			);
			expect(
				rule(":where(.classicySliderTicks).disabled .classicySliderTick"),
			).toMatch(/background: var\(--color-theme-06\);/);
			expect(dithered(rule(":where(.classicySliderTicks).disabled"))).toBe(
				true,
			);
		});

		// The horizontal slider is the thumb's box tall; the vertical one keeps
		// the base sheet's length after it: the slider's minimum on its own,
		// growing to fill its container, and its stack's height in a stack.
		it("sizes a horizontal slider by its thumb and lets a vertical one fill its container", () => {
			expect(rule(".classicySlider")).toMatch(
				/height: var\(--channel-slider-thumb-across\);/,
			);
			const vertical = rule(".classicySliderInputVertical");
			expect(vertical).toMatch(/height: var\(--slider-vertical-min-height\);/);
			expect(
				rule(".classicySliderStackVertical .classicySliderInputVertical"),
			).toMatch(/height: 100%;/);
			expect(vertical).toMatch(/width: var\(--channel-slider-thumb-across\);/);
			const at = (selector: string) =>
				css.indexOf(
					`.classicyDesktop[data-classicy-appearance=system7] ${selector} {`,
				);
			expect(at(".classicySliderInputVertical")).toBeGreaterThan(
				at(".classicySlider"),
			);
			// With ticks, the stack's layout is the base sheet's (story
			// 0194-5bs): nothing to correct here.
			expect(rule(".classicySliderStackVertical")).toBe("");
			expect(
				rule(".classicySliderStackVertical > .classicySliderTrackLayer"),
			).toBe("");
		});

		it("draws the outline triangle on the pixel grid, turning about a whole pixel", () => {
			const triangle = rule(".classicyTriangle");
			expect(triangle).toMatch(/width: var\(--outline-triangle-size\);/);
			expect(triangle).toMatch(/transform-box: border-box;/);
			expect(triangle).toMatch(
				/transform-origin: calc\(var\(--box-pixel\) \* 6\) calc\(var\(--box-pixel\) \* 5\);/,
			);
			expect(layersOf(triangle, BLACK)).toBe(10);
			// The checker is System 7's own color, #9999FF in color (the 7.5
			// Finder's), white in 1-bit: the package color
			// outlineTriangle.checker, not theme-03 (#9999CC).
			expect(
				layersOf(
					triangle,
					"var(--package-color-outline-triangle-checker, var(--color-theme-03))",
				),
			).toBe(10);
			expect(layersOf(triangle, "var(--color-theme-03)")).toBe(0);
			// …falling back to theme-03 for a theme of another package.
			expect(rule(".classicyTriangle polygon")).toMatch(/display: none;/);
			expect(layersOf(rule(":active > .classicyTriangle"), BLACK)).toBe(6);
		});

		it("frames a text field in one black pixel, with no bevel or focus ring, its selection inverted", () => {
			const field = rule(".classicyInput");
			expect(rule(".classicySpinner")).toMatch(
				/height: var\(--edit-field-height\);/,
			);
			expect(field).toMatch(
				/border: var\(--box-pixel\) solid var\(--color-black\);/,
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
				/border: var\(--box-pixel\) solid var\(--color-black\);/,
			);
			expect(rule(".classicyListBoxViewport")).toMatch(/box-shadow: none;/);
			const selected = rule(":where(.classicyListBoxOption).selected");
			expect(selected).toMatch(/color: var\(--color-white\);/);
			expect(selected).toMatch(/background-color: var\(--color-highlight\);/);
		});

		// Story 0196-1i1: the base sheet no longer dims the box with a
		// gradient, so there is nothing to drop.
		it("dims a pop-up's text and triangle but keeps its frame", () => {
			expect(rule(":where(.classicyPopUpMenu).disabled")).toBe("");
			expect(rule(".classicyPopUpMenu.disabled")).toBe("");
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
				/var\(--color-theme-06\) 50%, var\(--color-system-06\) 0\) left top ?\/ ?calc\(calc\(var\(--box-pixel\) \* 2\) - var\(--dither-tile-size\)\)/,
			);
			expect(separator).toMatch(
				/transparent 50%, var\(--color-system-06\) 0\) left top ?\/ ?var\(--dither-tile-size\)/,
			);
		});

		it("draws the progress bar and meter flat in a black frame, #444444 on #CCCCFF in color", () => {
			const bar = rule(".classicyProgress progress[value]");
			expect(bar).toMatch(/height: var\(--progress-height\);/);
			expect(bar).toMatch(
				/border: var\(--box-pixel\) solid var\(--color-black\);/,
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
			expect(bar).toMatch(/border: var\(--box-pixel\) solid transparent;/);
			expect(layersOf(bar, BLACK)).toBe(4);
			expect(count(bar, "no-repeat border-box")).toBe(4);
			expect(bar).toMatch(/var\(--color-window-document\) padding-box;/);
			for (const side of ["top", "right", "bottom", "left"])
				expect(bar).toMatch(
					new RegExp(
						`--system7-bar-off-${side}: calc\\(var\\(--box-pixel\\) - var\\(--box-pixel\\)\\);`,
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
				/margin: calc\(var\(--box-pixel\) \* -1\) calc\(var\(--box-pixel\) \* -1\) calc\(var\(--box-pixel\) \* -1\) 0;/,
			));

		it("draws Standard File's own list as the list: black frame, no bevel, its bar on the frame", () => {
			expect(rule(".classicyFileOpenDialogWell")).toMatch(
				/border: var\(--box-pixel\) solid var\(--color-black\);/,
			);
			expect(rule(".classicyFileOpenDialogWellViewport")).toMatch(
				/box-shadow: none;/,
			);
			expect(
				rule(
					".classicyFileOpenDialogWell > .classicyScrollAreaBody > .classicyScrollBarVertical",
				),
			).toMatch(
				/margin: calc\(var\(--box-pixel\) \* -1\) calc\(var\(--box-pixel\) \* -1\) calc\(var\(--box-pixel\) \* -1\) 0;/,
			);
		});

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
				/height: calc\(var\(--window-scrollbar-size\) - var\(--box-pixel\)\);/,
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
				/border-bottom: var\(--box-pixel\) solid var\(--system7-scroll-line\);/,
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
		it("draws the drag outline as a black ring under the track's dots, leaving the dragged box as it is", () => {
			const outline = rule(".classicyScrollBar .classicyScrollBarDragOutline");
			expect(outline).toMatch(/border: 0;/);
			expect(layersOf(outline, "var(--color-black)")).toBe(4);
			const dots = rule(
				".classicyScrollBar .classicyScrollBarDragOutline::after",
			);
			// The track's two dot layers, fixed to the screen like the track's.
			expect(dots.match(/conic-gradient/g)).toHaveLength(2);
			expect(dots.match(/ fixed/g)).toHaveLength(2);
			expect(dots).toMatch(/mask-composite: exclude;/);
			expect(dots).toMatch(/padding: var\(--box-pixel\);/);
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
			expect(fits).toMatch(/--system7-arrow-spread: var\(--box-pixel\);/);
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
				/border-right: var\(--box-pixel\) solid var\(--color-black\);/,
			);
			expect(corner).toMatch(
				/border-bottom: var\(--box-pixel\) solid var\(--color-black\);/,
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
			// The image starts past the box's right and bottom edges, so no
			// picture, however large, reaches into it (story 0211-4pl: a
			// negative offset left a wide picture's right end inside).
			expect(preview).toMatch(/object-fit: none;/);
			expect(preview).toMatch(/object-position: 100vw 100vh;/);
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
					/left top\/calc\(var\(--box-pixel\) - var\(--icon-selection-invert\)\)/,
				);
				expect(rule(`${root}.selected ${outer} img`)).toMatch(/filter: none;/);
				// A color icon draws its pre-rendered selected image instead
				// (story 0197-s0z), so the half-black layer stands down over it.
				const part = `${outer.replace("MaskOuter", "SelectedImage")}`;
				const own = rule(`${root}.selected:not(.open) ${outer}${part}::before`);
				expect(own).toMatch(/background: none;/);
				// The overlays exist on every mask pair, the alias badge's too.
				expect(rule(`${root} ${outer}::after`)).toMatch(/content: "";/);
			}
			expect(css).not.toMatch(/dither-tile-size\)[^;]*\n?[^;]*difference/);
		});

		// Story 0197-s0z: a Finder list view's selected small icon is an
		// `<img>`, so the same knob drives its filter: tan(atan2(knob, 1 px))
		// is 1 in 1-bit (inverted, no darkening) and 0 in color (the base
		// sheet's contrast(0.75) brightness(0.5), unchanged).
		it("inverts a selected list-view icon in 1-bit by the same knob, and never one drawing its selected image", () => {
			const N = "tan(atan2(var(--icon-selection-invert), var(--box-pixel)))";
			expect(
				rule(
					".classicyFileBrowserViewTableRow.selected .classicyFileBrowserViewTableRowIcon:not(.classicyIconSelectedImage)",
				).trim(),
			).toBe(
				`filter: invert(${N}) contrast(max(0.75, ${N})) brightness(max(0.5, ${N}));`,
			);
			// No other rule filters the row's icon: one drawing its
			// pre-rendered selected image keeps it as drawn.
			const filtered = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter(
				([, header, declarations]) =>
					header.includes("classicyFileBrowserViewTableRowIcon") &&
					/filter:/.test(declarations),
			);
			expect(filtered).toHaveLength(1);
		});

		// The declaration's `var()` hides `tan()` and `atan2()` from a browser
		// without them until computed-value time, where the filter would
		// become `none` over the base sheet's darkening: no highlight. So the
		// rule, and only it, sits in an `@supports` test of the functions
		// themselves (no `var()`), and such a browser keeps the darkening.
		it("guards each icon filter with @supports for tan() and atan2()", () => {
			const guarded = [
				...css.matchAll(
					/@supports \(filter: invert\(tan\(atan2\(1em, 1em\)\)\)\) \{\s*([^{}]+)\{([^{}]*)\}\s*\}/g,
				),
			];
			// The open Application menu title's icon (review r1 item 1), a
			// hidden application's icon's opacity (item 2) and the list view's
			// selected icon.
			expect(guarded.map(([, header]) => header.trim())).toEqual([
				expect.stringContaining(".classicyDesktopMenuAppHidden > p > img"),
				expect.stringContaining(
					".classicyDesktopMenuAppSwitcher.open > p > img",
				),
				".classicyDesktop[data-classicy-appearance=system7] .classicyFileBrowserViewTableRow.selected .classicyFileBrowserViewTableRowIcon:not(.classicyIconSelectedImage)",
			]);
			for (const [, , declarations] of guarded)
				expect(declarations).toMatch(
					/(filter: invert\(|opacity: )tan\(atan2\(/,
				);
			// Nothing outside the guards uses the functions.
			let outside = css;
			for (const [block] of guarded) outside = outside.replace(block, "");
			expect(outside).not.toMatch(/atan2\(|tan\(/);
		});

		it("draws an opened icon's shape outlined in black, its inside eroded a pixel and dotted 25%", () => {
			for (const [root, outer, mask] of FAMILIES) {
				expect(rule(`${root}.open ${outer}`)).toMatch(
					/background: var\(--color-black\);/,
				);
				const inside = rule(`${root}.open ${outer} ${mask}`);
				expect(inside.split("var(--classicy-icon-mask)").length - 1).toBe(5);
				expect(inside).toMatch(
					/mask-position: 0 0, var\(--box-pixel\) 0, calc\(0% - var\(--box-pixel\)\) 0, 0 var\(--box-pixel\), 0 calc\(0% - var\(--box-pixel\)\);/,
				);
				expect(inside).toMatch(/mask-composite: intersect;/);
				expect(inside).toMatch(
					/var\(--classicy-art-halftone, none\) left top\/calc\(var\(--box-pixel\) \* 8\) calc\(var\(--box-pixel\) \* 8\)/,
				);
				// #CCCCFF, 7.5.5's opened, unselected disk (story 0212-rce).
				expect(inside).toMatch(
					/--system7-icon-open-face: var\(--color-theme-02\);/,
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

		// Measured from Control Strip 1.3.1 running in System 7.5.5
		// (`*-controlstrip*.png`, story 0212-rce): in 1-bit every gray of a
		// cell's bevel (the shadows, a recessed cell's dark side, a pressed
		// cell's dark edge) is the screen's 50% checker; the face, highlight
		// and pressed fill white. The checker is fixed to the screen, so its
		// phase is the screen's, not the cell's.
		const CHECKER =
			"conic-gradient(var(--color-white) 0 25%, transparent 0 50%, var(--color-white) 0 75%, transparent 0) var(--classicy-control-strip-phase) top/var(--dither-tile-size) var(--dither-tile-size) fixed";
		const SHADOW =
			"var(--package-color-control-strip-shadow, var(--color-system-04))";
		// 7.5.5's Finder list view (`*-finder-list-row-selected.png`, story
		// 0212-rce): the selected item's name white on black in both themes.
		it("inverts a selected list-view item's name, white on black", () => {
			const label = rule(
				":where(.classicyFileBrowserViewTableRow).selected .classicyFileBrowserViewTableRowIconLabel",
			);
			expect(label).toMatch(/color: var\(--color-white\);/);
			expect(label).toMatch(/background: var\(--color-black\);/);
		});

		// 7.5.5's list rows are white and drawn with no line between them, an
		// 18 px pitch: a 16 px icon and `fileBrowserList.rowPadding` (1)
		// above and below (story 0214-c61).
		it("draws list-view rows white with no line between them", () => {
			const row = rule(
				".classicyFileBrowserViewTableContainer .classicyTableRow",
			);
			expect(row).toMatch(/border-top-width: 0;/);
			expect(row).toMatch(/border-bottom-width: 0;/);
			expect(row).toMatch(/background: var\(--color-white\);/);
			expect(
				rule(".classicyFileBrowserViewTableContainer.classicyTableContainer"),
			).toMatch(/background: var\(--color-white\);/);
		});

		// 7.5.5's Standard File boxes (`*-755-dialog-standardfile-layout.png`,
		// 7.5's `*-dialog-standardfile-save.png`; story 0214-c61): each box's
		// parts placed from the inner line by its own knobs.
		it("lays Standard File's Open and Save boxes out as 7.5 does", () => {
			const OPEN =
				".classicyFileOpenDialogBody:not(.classicyFileDialogSaveBody)";
			const SAVE = ".classicyFileOpenDialogBody.classicyFileDialogSaveBody";
			for (const [box, k] of [
				[OPEN, "file-dialog-"],
				[SAVE, "file-dialog-save-"],
			] as const) {
				expect(rule(box)).toMatch(/position: absolute;\s+inset: 0;/);
				const placed = (part: string, left: string, top: string) => {
					const declarations = rule(`${box} ${part}`);
					expect(declarations, `${box} ${part}`).toMatch(/position: absolute;/);
					expect(declarations, part).toContain(`top: var(--${k}${top});`);
					expect(declarations, part).toContain(`left: var(--${k}${left});`);
				};
				placed("> .classicyPopUpMenuWrapper", "list-left", "pop-up-top");
				placed("> .classicyFileOpenDialogVolume", "volume-left", "volume-top");
				placed("> .classicyFileOpenDialogWell", "list-left", "list-top");
				placed(
					"> .classicyFileOpenDialogFooter > .classicyPopUpMenuWrapper",
					"filter-left",
					"filter-top",
				);
				for (const [part, top] of [
					["Eject", "eject-top"],
					["Desktop", "desktop-top"],
				])
					placed(
						`.classicyFileOpenDialogActions > .classicyFileOpenDialog${part}`,
						"buttons-left",
						top,
					);
				placed(
					".classicyFileOpenDialogActions > .classicyFileOpenDialogDivider",
					"divider-left",
					"divider-top",
				);
				placed(
					".classicyFileOpenDialogActions > .classicyButton:nth-last-child(2)",
					"buttons-left",
					"cancel-top",
				);
				placed(
					".classicyFileOpenDialogActions > .classicyButton:last-child",
					"buttons-left",
					"open-top",
				);
				expect(
					rule(
						`${box} > .classicyPopUpMenuWrapper > .classicyControlLabelHolder`,
					),
				).toMatch(/display: none;/);
				// The line: in color #888888 and #777777 alternating (theme-06,
				// system-06), in 1-bit the checker a pixel along.
				const divider = rule(
					`${box} .classicyFileOpenDialogActions > .classicyFileOpenDialogDivider`,
				);
				expect(divider).toContain(
					"linear-gradient(90deg, var(--color-theme-06) 50%, var(--color-system-06) 0)",
				);
				expect(divider).toContain("mask-position: var(--box-pixel) 0, 0 0;");
			}
			expect(rule(`${OPEN} > .classicyFileOpenDialogVolume > img`)).toContain(
				"margin-top: var(--file-dialog-volume-icon-drop);",
			);
			expect(
				rule(
					`${SAVE} .classicyFileOpenDialogActions > .classicyButton:nth-last-child(3)`,
				),
			).toContain("top: var(--file-dialog-save-new-top);");
			// "New" and a folder (review r1 item 4).
			expect(rule(`${SAVE} .classicyFileDialogNewNoun`)).toMatch(
				/display: none;/,
			);
			expect(rule(`${SAVE} .classicyFileDialogNewGlyph`)).toContain(
				"margin-left: var(--file-dialog-new-glyph-gap);",
			);
			expect(rule(`${SAVE} > .classicyFileDialogNameRow`)).toContain(
				"top: var(--file-dialog-save-name-top);",
			);
			// The flat list: 16 px icons on the row pitch, no triangles, the
			// selection across the row, whole names.
			expect(
				rule(".classicyFileOpenDialogWell .classicyTreeNodeRow"),
			).toContain("height: var(--file-dialog-list-row-height);");
			expect(
				rule(".classicyFileOpenDialogWell .classicyTreeNodeDisclosure"),
			).toMatch(/display: none;/);
			expect(
				rule(".classicyFileOpenDialogWell .classicyTreeNodeIcon"),
			).toContain("width: var(--icon-small-size);");
			expect(
				rule(".classicyFileOpenDialogWell .classicyTreeNodeLabel"),
			).toMatch(/text-overflow: clip;/);
			// The closed pop-up's icon part, shown.
			expect(
				rule(".classicyPopUpMenuButton > .classicyPopUpMenuValueIcon"),
			).toMatch(/display: block;/);
		});

		it("bevels the strip's cells by the theme's bevel width on the strip's face", () => {
			const BEVEL = "var(--control-strip-bevel-width)";
			const raised = rule(".classicyControlStripCell");
			// The face is the panel's #CCCCCC (white in 1-bit), the package
			// color controlStrip.face, not system-02 (#BBBBBB).
			expect(raised).toMatch(
				/, var\(--package-color-control-strip-face, var\(--color-system-02\)\);$/m,
			);
			expect(raised).toContain(`background: ${CHECKER},`);
			expect(layersOf(raised, "var(--color-white)")).toBe(2);
			expect(layersOf(raised, SHADOW)).toBe(2);
			// The inner shadow's column and row start `controlStrip.shadowStart`
			// in from the cell's top and left.
			expect(raised).toContain(
				`${SHADOW}) calc(100% - var(--control-strip-bevel-width)) var(--control-strip-shadow-start)`,
			);
			expect(raised).toContain(
				`${SHADOW}) var(--control-strip-shadow-start) calc(100% - var(--control-strip-bevel-width))`,
			);
			expect(layersOf(raised, "var(--color-system-05)")).toBe(2);
			expect(raised).toContain(BEVEL);
			expect(raised).not.toMatch(/\* [0-9]/);
			expect(
				rule(
					".classicyControlStrip .classicyBevelButton.classicyControlStripModule",
				),
			).toBe(raised);
			const recessed = rule(".classicyControlStripScroll:disabled");
			expect(recessed).toContain(`background: ${CHECKER},`);
			expect(layersOf(recessed, "var(--color-system-05)")).toBe(2);
			expect(layersOf(recessed, "var(--color-white)")).toBe(2);
			expect(recessed).toMatch(
				/, var\(--package-color-control-strip-face, var\(--color-system-02\)\);$/m,
			);
		});

		// The strip's outer lower corner, rounded off in the collapse box:
		// three black pixels over its look, raised or pressed, at the left
		// end, or the right end on a strip docked right.
		it("rounds the strip's outer lower corner in the collapse box", () => {
			const black = "var(--color-black)";
			for (const root of ["", ".classicyControlStripRight "]) {
				const raised = rule(`${root}.classicyControlStripCollapseBox`);
				const pressed = rule(
					`${root}.classicyControlStripCollapseBox:active:not(:disabled)`,
				);
				for (const look of [raised, pressed]) {
					// Docked right, one pixel inside the frame: the frame and the
					// black line past it are the corner's other two (story
					// 0214-c61, `*-755-controlstrip-right.png`).
					expect(layersOf(look, black), root).toBe(root ? 1 : 2);
					expect(look, root).toMatch(
						root
							? /var\(--color-black\)\) 100% 100%/
							: /var\(--color-black\)\) 0 100%/,
					);
				}
				expect(raised).toContain(SHADOW);
				expect(pressed).toContain(
					"var(--package-color-control-strip-pressed-face, var(--color-system-04))",
				);
			}
			const right = rule(
				".classicyControlStripRight .classicyControlStripCollapseBox",
			);
			expect(right).toMatch(/margin-right: var\(--window-border-size\);/);
			expect(right).toMatch(
				/box-shadow: var\(--window-border-size\) 0 0 var\(--color-black\);/,
			);
		});

		// A pressed cell (a module with its menu held open, or the collapse
		// box held): two pixels of the dark edge on the top and left, two of
		// the face on the bottom and right, around the pressed face.
		it("presses a cell into the dark edge, the face and the pressed face", () => {
			const pressed = rule(".classicyControlStripCell:active:not(:disabled)");
			expect(pressed).toContain(`background: ${CHECKER},`);
			expect(
				layersOf(
					pressed,
					"var(--package-color-control-strip-dark-edge, var(--color-system-07))",
				),
			).toBe(4);
			expect(
				layersOf(
					pressed,
					"var(--package-color-control-strip-face, var(--color-system-02))",
				),
			).toBe(4);
			// The dark edge's inner row and column stop `controlStrip.shadowStart`
			// short of the cell's right and bottom edges (2 in color, where the
			// face's inner column and row take the pixel; 1 in 1-bit, where the
			// dark edge does, as `bw-755-controlstrip-collapse-pressed.png`'s
			// checker shows at the inner row's end).
			const DARK =
				"var(--package-color-control-strip-dark-edge, var(--color-system-07))";
			const BEVEL = "var(--control-strip-bevel-width)";
			const SHORT = "calc(100% - var(--control-strip-shadow-start))";
			expect(pressed).toContain(
				`${DARK}) 0 ${BEVEL}/${SHORT} ${BEVEL} no-repeat`,
			);
			expect(pressed).toContain(
				`${DARK}) ${BEVEL} 0/${BEVEL} ${SHORT} no-repeat`,
			);
			expect(pressed).toMatch(
				/, var\(--package-color-control-strip-pressed-face, var\(--color-system-04\)\);$/m,
			);
			for (const state of [".pressed", ".open"])
				expect(
					rule(
						`.classicyControlStrip .classicyBevelButton.classicyControlStripModule${state}`,
					),
					state,
				).toBe(pressed);
		});

		// 7.5.5 draws the strip's checker in the screen's phase, black where
		// the screen's x + y is even, as QuickDraw's patterns are: the cells
		// start at x 29, 60 and 91 (`bw-755-controlstrip.png`), so a checker
		// anchored to each cell would flip phase from one cell to the next.
		// Only the checker is fixed; every bevel layer moves with its cell.
		it("fixes the strip's checker to the screen, and only the checker", () => {
			const looks = [
				".classicyControlStripCell",
				".classicyControlStripCell:active:not(:disabled)",
				".classicyControlStripScroll:disabled",
				".classicyControlStripCollapseBox",
				".classicyControlStripCollapseBox:active:not(:disabled)",
				".classicyControlStripRight .classicyControlStripCollapseBox",
				".classicyControlStripRight .classicyControlStripCollapseBox:active:not(:disabled)",
				".classicyControlStrip .classicyBevelButton.classicyControlStripModule",
				".classicyControlStrip .classicyBevelButton.classicyControlStripModule.pressed",
			];
			for (const selector of looks) {
				const look = rule(selector);
				expect(look, selector).toContain(CHECKER);
				expect(look.match(/ fixed\b/g), selector).toHaveLength(1);
				// Its transparent quarters (top left and bottom right of the
				// 2 x 2 tile, the layers beneath showing through) fall on the
				// viewport's even x + y, a pixel along while the strip's origin
				// is odd (the core's --classicy-control-strip-phase).
				expect(look, selector).toMatch(
					/conic-gradient\(var\(--color-white\) 0 25%, transparent 0 50%, var\(--color-white\) 0 75%, transparent 0\) var\(--classicy-control-strip-phase\) top\//,
				);
			}
		});

		it("draws the pixel-art token n, the slider's inner ring, in theme-07", () =>
			expect(rule(".classicyPixeln")).toMatch(
				/fill: var\(--color-theme-07\);/,
			));

		// The strip's art draws the panel's own grays: its face (token 2,
		// #CCCCCC) in the strip and in a module's pop-up, and the tab's
		// lowest row (token m, #444444) in the strip.
		it("draws the strip art's face and dark edge in the strip's package colors", () => {
			for (const selector of [
				".classicyControlStrip .classicyPixel2",
				".classicyBevelButtonPopupPanel .classicyPixel2",
			])
				expect(rule(selector), selector).toMatch(
					/fill: var\(--package-color-control-strip-face, var\(--color-system-02\)\);/,
				);
			expect(rule(".classicyControlStrip .classicyPixelm")).toMatch(
				/fill: var\(--package-color-control-strip-dark-edge, var\(--color-system-07\)\);/,
			);
		});

		// A pressed collapse box redraws its glyph as an icon's selected
		// transform (`*-755-controlstrip-collapse-pressed.png`): in 1-bit
		// inverted (the ring's white inside a solid black square, the ring
		// white on the pressed face), in color each token darkened, #555555
		// and #444444 to #222222, #CCCCFF to #333366, #888888 to #444444,
		// white to #777777. The press's shift is the base sheet's.
		it("darkens, or in 1-bit inverts, a pressed collapse box's glyph", () => {
			const pressed = (token: string) =>
				rule(
					`.classicyControlStripCollapseBox:active:not(:disabled) .classicyPixel${token}`,
				);
			const fills: Record<string, RegExp> = {
				K: /fill: var\(--package-color-control-strip-pressed-glyph-ink, var\(--color-black\)\);/,
				W: /fill: var\(--package-color-control-strip-pressed-glyph-light, var\(--color-white\)\);/,
				"7": /fill: var\(--package-color-control-strip-pressed-glyph-dark, var\(--color-system-07\)\);/,
				m: /fill: var\(--package-color-control-strip-pressed-glyph-dark, var\(--color-system-07\)\);/,
				"5": /fill: var\(--package-color-control-strip-dark-edge, var\(--color-system-07\)\);/,
				b: /fill: var\(--color-theme-07\);/,
			};
			for (const [token, fill] of Object.entries(fills))
				expect(pressed(token), token).toMatch(fill);
			// At rest, and on a pressed scroll arrow, the art keeps its colors.
			expect(
				rule(".classicyControlStripCell:active:not(:disabled) .classicyPixelW"),
			).toBe("");
			expect(rule(".classicyControlStripCollapseBox .classicyPixelW")).toBe("");
		});

		it("frames a module's pop-up as a menu, its face the strip's with a white top and left", () => {
			const panel = rule(
				".classicyBevelButtonPopup.classicyBevelButtonPopupPanel",
			);
			expect(panel).toMatch(
				/border: var\(--window-border-size\) solid var\(--color-black\);/,
			);
			expect(layersOf(panel, "var(--color-white)")).toBe(2);
			expect(panel).toMatch(
				/var\(--package-color-control-strip-face, var\(--color-system-02\)\);/,
			);
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
			expect(tab).toMatch(/0 100%\/100% var\(--box-pixel\)/);
			const chosen = rule(
				".classicyTabButtonWrapper:has(.classicyTabButton.selected)",
			);
			expect(layersOf(chosen, BLACK)).toBe(5);
			expect(chosen).not.toMatch(/0 100%\/100%/);
			expect(
				rule(".classicyTabButtonWrapper + .classicyTabButtonWrapper"),
			).toMatch(/margin-left: calc\(0% - var\(--box-pixel\)\);/);
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
