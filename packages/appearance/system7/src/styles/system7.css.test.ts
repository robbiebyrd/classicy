import { readFileSync } from "node:fs";
import path from "node:path";
import { compile, NodePackageImporter } from "sass";
import { describe, expect, it } from "vitest";
import { isSingleClassicyLayerBlock } from "../../../../../bin/classicyPackageCss";
import { CLASSICY_LAYER_ORDER } from "../../../../../bin/classicyStyleInjector";

// The System 7 package stylesheet as Sass compiles it: one
// `@layer classicy.package` block, every rule scoped under the System 7
// desktop root, so its look applies only while it is the active package
// (design 0014-ahm; the core's _package.scss), as Platinum's does
// (platinum.css.test.ts).

const STYLESHEET = path.join(import.meta.dirname, "system7.scss");
const SYSTEM7_SCOPE =
	/^\.classicyDesktop\[data-classicy-appearance=("?)system7\1\](?=$|[\s.:#[>+~])/;

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

	it("holds rules, every one scoped under the system7 root", () => {
		const selectors = selectorsOf(css);
		expect(selectors.length).toBeGreaterThan(0);
		expect(selectors.filter((s) => !SYSTEM7_SCOPE.test(s))).toEqual([]);
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
		const rootDeclarations = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].find(
			([, header]) => header.trim() === ROOT,
		)?.[2];

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
					".classicyWindow.classicyWindowModalFixed .classicyWindowTitleBar",
				),
			).toMatch(/display: none;/);
			expect(
				rule(
					".classicyWindow.classicyWindowModalFixed .classicyWindowContentsModal",
				),
			).toContain(`margin: ${FRAME};`);
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

		it("insets every modal's items the HIG's 13 pixels, except the dialogs that pad themselves", () => {
			const inner = rule(".classicyWindowContentsModalInner");
			expect(inner).toMatch(/padding: var\(--dialog-frame-inset\);/);
			expect(inner).toMatch(/box-sizing: border-box;/);
			const selfPadded = [
				".classicyAlert",
				".classicyInputDialog",
				".classicyKeyboardEquivalentDialog",
				".classicyFormDialog",
			];
			expect(
				rule(
					`.classicyWindowContentsModalInner:has(> :is(${selfPadded.join(", ")}))`,
				),
			).toMatch(/padding: 0;/);
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
			expect(rule("*::marker")).toMatch(/color: var\(--color-black\);/);
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
			expect(layersOf(rule(":where(.classicyCheckbox).mixed"), BLACK)).toBe(1);
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
			expect(track).toMatch(/height: calc\(var\(--window-box-pixel\) \* 13\);/);
			// Both caps (10 rectangles each), four runs, seven checker columns.
			expect(layersOf(track, "var(--system7-slider-ink)")).toBe(10 + 10 + 4);
			expect(track.split("repeating-linear-gradient(").length - 1).toBe(7);
			const thumb = rule(".classicySlider::-webkit-slider-thumb");
			expect(layersOf(thumb, "var(--system7-slider-ink)")).toBe(10);
			expect(layersOf(thumb, "var(--color-white)")).toBe(3);
			expect(rule(":where(.classicySlider).disabled")).toMatch(
				/--system7-slider-ink: var\(--color-theme-06\);/,
			);
		});

		it("draws the outline triangle on the pixel grid, turning about a whole pixel", () => {
			const triangle = rule(".classicyTriangle");
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

	it("uses no !important (the cascade layers decide)", () =>
		expect(readFileSync(STYLESHEET, "utf8")).not.toContain("!important"));
});
