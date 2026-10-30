import { existsSync, globSync, readFileSync } from "node:fs";
import { compile, compileString } from "sass";
import { describe, expect, it } from "vitest";
import { isSingleClassicyLayerBlock } from "../../../../bin/classicyPackageCss";
import { CLASSICY_LAYER_ORDER } from "../../../../bin/classicyStyleInjector";

// Under src/, the Sass load path.
const STYLES = "Appearance/Platinum/styles";
// Where the modules _mixins/_scrollbars/_assets were copied from; deleted once
// no base sheet used them (ruling R7).
const ORIGINALS = "SystemFolder/ControlPanels/AppearanceManager/styles";
const read = (file: string) => readFileSync(`src/${file}`, "utf8");

const PLATINUM_SCOPE =
	/^\.classicyDesktop\[data-classicy-appearance=("?)platinum\1\](?=$|[\s.:#[>+~])/;

/**
 * Every style-rule selector in Sass's expanded output, and those not scoped
 * under the Platinum root. Steps through at-rules (`@supports`, `@media`,
 * `@layer`); the steps of a `@keyframes` are not selectors. A selector list
 * may span lines (`.a,\n.b {`), so every line ending in `,` counts too.
 */
const scanSelectors = (css: string) => {
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
		const inRule = stack.at(-1) === "rule";
		if (!inRule && line.endsWith(",")) {
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
					selectors.push(...header.split(",").map((s) => s.trim()));
				stack.push("rule");
			}
		}
	}
	return {
		selectors,
		unscoped: selectors.filter((s) => !PLATINUM_SCOPE.test(s)),
	};
};

/**
 * A compound-selector chain's specificity as [ids, classes, types]: classes
 * count attributes and pseudo-classes, types count pseudo-elements, and
 * `:where(…)` counts nothing. Enough for the package's own selectors (no
 * `:is`/`:not`/`:has` arguments are weighed).
 */
const specificity = (selector: string): [number, number, number] => {
	const s = selector.replace(/:where\([^)]*\)/g, "");
	const ids = (s.match(/#[\w-]+/g) ?? []).length;
	const pseudoElements = (s.match(/::[\w-]+/g) ?? []).length;
	const classes =
		(s.match(/\.[\w-]+/g) ?? []).length +
		(s.match(/\[[^\]]*\]/g) ?? []).length +
		(s.replace(/::[\w-]+/g, "").match(/:[\w-]+/g) ?? []).length;
	const types = (s.match(/(^|[\s>+~])[a-zA-Z][\w-]*/g) ?? []).length;
	return [ids, classes, types + pseudoElements];
};

/** > 0 when `a` is more specific than `b`, 0 when equal. */
const compareSpecificity = (a: string, b: string): number => {
	const [x, y] = [specificity(a), specificity(b)];
	return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
};

const LOAD = { loadPaths: ["src"] };

// A stand-in for a package stylesheet with components in it: the real
// platinum.scss includes none until 4.2, so its compiled CSS is an empty
// block and the scoping checks on it would hold vacuously.
const SAMPLE = compileString(
	`@use "Appearance/vocabulary/package";
@include package.classicy-package("platinum") {
	.classicyButton { color: red; }
	.classicyWindow,
	.classicyWindow .classicyWindowTitleBar,
	.classicyCheckbox:active { border: 1px solid; }
	@supports not selector(::-webkit-scrollbar) {
		& { scrollbar-width: auto; }
		.classicyTabScroller { scrollbar-width: none; }
	}
	@keyframes classicyPlatinumSample {
		from { opacity: 0; }
		50% { opacity: 0.5; }
		to { opacity: 1; }
	}
}`,
	LOAD,
).css;

describe("specificity (this file's helper)", () => {
	it("weighs classes, attributes, pseudo-classes, pseudo-elements and :where", () => {
		const P = ".classicyDesktop[data-classicy-appearance=platinum]";
		expect(specificity(`${P} .classicyTabScroller`)).toEqual([0, 3, 0]);
		expect(specificity(`${P} *`)).toEqual([0, 2, 0]);
		expect(
			specificity(
				`${P} :where(.classicyWindow.inactive)::-webkit-scrollbar-track`,
			),
		).toEqual([0, 2, 1]);
		expect(
			specificity(`${P} *::-webkit-scrollbar-button:end:vertical`),
		).toEqual([0, 4, 1]);
		expect(specificity("#a div > .b:hover")).toEqual([1, 2, 1]);
		expect(compareSpecificity(`${P} *`, `${P} *`)).toBe(0);
	});
});

describe("classicy-package (src/Appearance/vocabulary/_package.scss)", () => {
	it("wraps its content in one @layer classicy.package block", () => {
		expect(SAMPLE.startsWith("@layer classicy.package {")).toBe(true);
		expect(
			isSingleClassicyLayerBlock(
				SAMPLE,
				"classicy.package",
				CLASSICY_LAYER_ORDER,
			),
		).toBe(true);
	});

	it("scopes every rule under the package root, through @supports, not into @keyframes", () => {
		const { selectors, unscoped } = scanSelectors(SAMPLE);
		expect(selectors).toEqual([
			".classicyDesktop[data-classicy-appearance=platinum] .classicyButton",
			".classicyDesktop[data-classicy-appearance=platinum] .classicyWindow",
			".classicyDesktop[data-classicy-appearance=platinum] .classicyWindow .classicyWindowTitleBar",
			".classicyDesktop[data-classicy-appearance=platinum] .classicyCheckbox:active",
			".classicyDesktop[data-classicy-appearance=platinum]",
			".classicyDesktop[data-classicy-appearance=platinum] .classicyTabScroller",
		]);
		expect(unscoped).toEqual([]);
	});

	it("the scan catches an unscoped rule, alone or in a multi-line list", () => {
		const css = compileString(
			`@use "Appearance/vocabulary/package";
@include package.classicy-package("platinum") { .a { color: red; } }
@layer classicy.package {
	.b,
	.classicyDesktop[data-classicy-appearance=platinum] .c { color: red; }
	@supports (display: grid) { .d { color: red; } }
}`,
			LOAD,
		).css;
		expect(scanSelectors(css).unscoped).toEqual([".b", ".d"]);
	});

	it("contains no platinumCamelCase mixin name", () =>
		expect(SAMPLE).not.toMatch(/platinum[A-Z]/));
});

describe("platinum.scss (compiled)", () => {
	const css = compile(`src/${STYLES}/platinum.scss`, LOAD).css;

	it("is wrapped in the package layer", () => {
		expect(css.startsWith("@layer classicy.package")).toBe(true);
		expect(
			isSingleClassicyLayerBlock(css, "classicy.package", CLASSICY_LAYER_ORDER),
		).toBe(true);
	});

	it("every rule is scoped under the platinum root", () => {
		const { selectors, unscoped } = scanSelectors(css);
		expect(unscoped).toEqual([]);
		expect(selectors.length).toBeGreaterThan(0);
	});

	it("contains no platinumCamelCase mixin name", () =>
		expect(css).not.toMatch(/platinum[A-Z]/));

	const P = ".classicyDesktop[data-classicy-appearance=platinum]";
	// Sass indents the rules inside the layer block and keeps a selector
	// list's source line breaks; one selector list per line, unindented.
	const flat = css.replace(/,\s*\n\s*/g, ", ").replace(/\n\s+/g, "\n");
	// The first rule whose selector list is exactly `selector`: its offset and
	// its declarations, last one winning.
	const rule = (selector: string) => {
		const at = flat.indexOf(`\n${selector} {\n`);
		if (at < 0) throw new Error(`no rule for ${selector}`);
		const body = flat.slice(at + selector.length + 4, flat.indexOf("}", at));
		const props: Record<string, string> = {};
		for (const line of body.split(";\n")) {
			const colon = line.indexOf(":");
			if (colon > 0)
				props[line.slice(0, colon).trim()] = line
					.slice(colon + 1)
					.trim()
					.replace(/;$/, "");
		}
		return { at, props };
	};

	it("scopes the window chrome", () => {
		const window_ = rule(`${P} .classicyWindow`).props;
		expect(window_.border).toBeDefined();
		expect(window_["box-shadow"]).toBeDefined();
		expect(flat).toContain(
			`${P} .classicyWindowRed .classicyWindowTitleBar .classicyWindowTitle .classicyWindowTitleCenter {`,
		);
		expect(
			rule(`${P} .classicyWindow .classicyWindowResizer`).props[
				"background-image"
			],
		).toBe("var(--classicy-art-window-grip)");
		expect(flat).toContain(
			`${P} :where(.classicyWindow).active .classicyWindowTitleBar .classicyWindowTitle .classicyWindowTitleCenter {`,
		);
	});

	// Part E 2.2: the submenu triangle is a mask over black; the pop-up double
	// arrow is the indicator's own image (ruling E21), like the grow-box grip.
	it("draws the menu and pop-up arrows from registered art", () => {
		const triangle = rule(
			`${P} .classicyMenuItemChildMenuIndicator:after`,
		).props;
		expect(triangle["mask-image"]).toBe("var(--classicy-art-submenu-arrow)");
		expect(triangle["background-color"]).toBe("var(--color-black)");
		expect(
			rule(`${P} .classicyPopUpMenuIndicator`).props["background-image"],
		).toBe("var(--classicy-art-popup-arrows)");
	});

	it("scopes the desktop scrollbars", () => {
		expect(flat).toContain(`${P} *::-webkit-scrollbar {`);
		expect(flat).toContain(`${P}.classicyDesktopSplitArrows`);
	});

	it("scopes the menu frame", () => {
		expect(flat).toContain(
			`${P} .classicyContextSubMenu .classicySeparatorHorizontal {`,
		);
		expect(rule(`${P} .classicySubMenu`).props.border).toBe(
			"1px solid var(--color-black)",
		);
	});

	// I 3.2: the chosen item's flash is Platinum's; the MenuItem press hook
	// adds the class. The keyframes sit in the package layer, unscoped (a
	// @keyframes has no selector), and leave the base sheet.
	it("scopes the menu item flash and carries its keyframes", () => {
		const flash = rule(`${P} .classicyMenuItemFlash`).props;
		expect(flash["animation-name"]).toBe("classicyMenuItemFlashKeyframes");
		expect(flash["animation-duration"]).toBe("0.25s");
		expect(flash["animation-iteration-count"]).toBe("1");
		expect(flash["animation-timing-function"]).toBe("steps(1, end)");
		const keyframes = flat.slice(
			flat.indexOf("@keyframes classicyMenuItemFlashKeyframes {"),
		);
		expect(keyframes.length).toBeLessThan(flat.length);
		for (const step of ["0%", "20%", "40%", "60%", "80%", "100%"])
			expect(keyframes).toContain(`\n${step} {\n`);
		expect(
			read("SystemFolder/SystemResources/Menu/ClassicyMenu.scss"),
		).not.toMatch(/classicyMenuItemFlash/);
	});

	// R15: a base override that beat a moved declaration moves with it, after
	// it, so it still wins from inside the package layer.
	it("keeps every override of the moved window look after what it overrides", () => {
		const winsOver = (
			winner: string,
			loser: string,
			prop: string,
			value: string,
		) => {
			const w = rule(`${P} ${winner}`);
			expect(w.props[prop], winner).toBe(value);
			expect(w.at, `${winner} follows ${loser}`).toBeGreaterThan(
				rule(`${P} ${loser}`).at,
			);
		};
		// P1: the error border color, and P2: the dotted drag/resize outline.
		winsOver(
			".classicyWindow.classicyWindowRed",
			".classicyWindowRed",
			"border-color",
			"var(--color-error)",
		);
		winsOver(
			":where(.classicyWindow).dragging",
			".classicyWindow.classicyWindowRed",
			"box-shadow",
			"none",
		);
		winsOver(
			".classicyWindowResizing",
			".classicyWindow",
			"box-shadow",
			"none",
		);
		// P5, P6, P7: dimmed and list parts drop their bevels.
		winsOver(
			".classicyWindow .classicyWindowResizerDimmed",
			".classicyWindow .classicyWindowResizer",
			"background-image",
			"none",
		);
		winsOver(
			".classicyWindow .classicyWindowContentsDimmed",
			".classicyWindow .classicyWindowContents",
			"box-shadow",
			"none",
		);
		winsOver(
			".classicyWindow .classicyWindowContentsDimmed",
			".classicyWindow .classicyWindowContentsModal",
			"box-shadow",
			"none",
		);
		winsOver(
			".classicyWindowHeader.classicyWindowHeaderList",
			".classicyWindowHeader",
			"border-bottom",
			"none",
		);
		winsOver(
			".classicyWindowHeaderDimmed",
			".classicyWindowHeader",
			"box-shadow",
			"none",
		);
		// The title bar keeps no border under the dimmed-header class too.
		expect(
			rule(`${P} .classicyWindow .classicyWindowTitleBar`).props.border,
		).toBe("none");
		// P3, P4: utility stripes off; the stripe masks keep the sizes the
		// striped images had (Part E 2.1; ClassicyWindow.art.test.ts has the
		// rest of the masks).
		const group = (prefix: string, a: string, b: string) =>
			`${prefix} ${a}, ${prefix} ${b}`;
		const utility = `${P} .classicyWindow.classicyWindowUtility .classicyWindowTitleBar .classicyWindowTitle`;
		expect(
			rule(
				group(utility, ".classicyWindowTitleLeft", ".classicyWindowTitleRight"),
			).props.background,
		).toBe("none");
		expect(
			rule(
				group(
					utility,
					".classicyWindowTitleLeft::before",
					".classicyWindowTitleRight::before",
				),
			).props.content,
		).toBe("none");
		expect(
			rule(
				group(
					utility,
					".classicyWindowTitleCenter::before",
					".classicyWindowTitleCenter::after",
				),
			).props["mask-size"],
		).toBe("4px 3px");
		const active = `${P} :where(.classicyWindow).active .classicyWindowTitleBar .classicyWindowTitle`;
		// The windoid's side bands drop the active stripes. Specificity decides,
		// not source order (the utility group comes first): it outranks the
		// active group, (0,7,1) against (0,6,1) with the root prefix.
		// (ids, classes/attributes/pseudo-classes, types/pseudo-elements);
		// `:where()` counts nothing.
		const specificity = (selector: string) => {
			const s = selector.replace(/:where\([^)]*\)/g, "");
			return [
				(s.match(/#[\w-]+/g) ?? []).length,
				(s.match(/\.[\w-]+|\[[^\]]*\]|(?<!:):(?!:)[\w-]+/g) ?? []).length,
				(s.match(/::[\w-]+|(?:^|[\s>+~])[a-z][\w-]*/gi) ?? []).length,
			];
		};
		// (Both groups are asserted present above and below.)
		for (const band of [
			".classicyWindowTitleLeft",
			".classicyWindowTitleRight",
		]) {
			expect(specificity(`${utility} ${band}::before`), band).toEqual([
				0, 7, 1,
			]);
			expect(specificity(`${active} ${band}::before`), band).toEqual([0, 6, 1]);
		}
		expect(
			rule(
				group(
					active,
					".classicyWindowTitleLeft::before",
					".classicyWindowTitleRight::before",
				),
			).props["mask-size"],
		).toBe("auto 99.8%");
		const red = `${P} .classicyWindowRed .classicyWindowTitleBar .classicyWindowTitle`;
		expect(
			rule(`${red} .classicyWindowTitleCenter::before`).props["mask-size"],
		).toBe("auto 100%");
		// The red side bands follow the active ones and write their `auto`.
		const redSides = rule(
			group(
				red,
				".classicyWindowTitleLeft::before",
				".classicyWindowTitleRight::before",
			),
		);
		expect(redSides.props["mask-size"]).toBe("auto");
		expect(redSides.at).toBeGreaterThan(
			rule(
				group(
					active,
					".classicyWindowTitleLeft::before",
					".classicyWindowTitleRight::before",
				),
			).at,
		);
		expect(
			rule(
				`${P} .classicyWindow:has(.classicyAlertMovable) .classicyWindowTitleBar .classicyWindowTitle .classicyWindowTitleCenter::before`,
			).props["mask-size"],
		).toBe("auto 100%");
		expect(
			rule(`${P} .classicyWindowFrameTitleBar::before`).props["mask-size"],
		).toBe("auto 100%");
		// The control boxes' glyph masks sit top left, over the mixin's
		// centering, and the utility boxes keep their smaller size and glyph
		// offset.
		const bar = `${P} .classicyWindow .classicyWindowTitleBar`;
		const glyphs = rule(
			group(
				bar,
				".classicyWindowCollapseBox:after",
				".classicyWindowZoomBox:after",
			),
		);
		for (const box of ["CollapseBox", "ZoomBox"]) {
			const own = rule(`${bar} .classicyWindow${box}:after`);
			expect(own.props["mask-position"]).toBe("top left");
			expect(own.at).toBeGreaterThan(glyphs.at);
		}
		const utilityBox = `${P} .classicyWindowUtility .classicyWindowTitleBar .classicyWindowControlBox`;
		expect(rule(`${utilityBox} .classicyWindowCloseBox`).props.width).toMatch(
			/utility-title-bar-height/,
		);
		expect(
			rule(`${utilityBox} .classicyWindowCollapseBox:after`).props.top,
		).toBeDefined();
	});

	// The desktop's `& *` scroll-bar rules gain one class from the scope, every
	// other partial two: the inactive window's own scroll-bar rules tied the
	// desktop's in base (and lost on order), so they must tie here too.
	it("keeps the inactive window's scroll bars tied with the desktop's, and before them", () => {
		const inactive = rule(
			`${P} :where(.classicyWindow.inactive)::-webkit-scrollbar-track`,
		);
		expect(inactive.props.border).toBe(
			"var(--window-border-size) solid var(--color-system-06)",
		);
		expect(flat).not.toContain(`${P} :where(.classicyWindow).inactive`);
		expect(
			rule(`${P}::-webkit-scrollbar-track, ${P} *::-webkit-scrollbar-track`).at,
		).toBeGreaterThan(inactive.at);
	});

	it("keeps the disabled pop-up fill over the undepressable face (P14)", () =>
		expect(
			rule(`${P} .classicyPopUpMenu.disabled`).props["background-color"],
		).toBe("var(--color-system-01)"));

	// P12 (Firefox only): the desktop's `scrollbar-width: auto` fallback would
	// beat the base tab scroller's `none` from the package layer, so the tab
	// scroller re-asserts it there. Scoped, it is one class above the
	// fallback's `& *` ((0,3,0) vs (0,2,0)): it wins on specificity, and comes
	// after the fallback as well.
	it("hides the tab scroller's scrollbar over the desktop scrollbar fallback", () => {
		const supports = flat.lastIndexOf(
			"@supports not selector(::-webkit-scrollbar)",
		);
		const fallback = flat.indexOf(`, ${P} * {`, supports);
		expect(fallback).toBeGreaterThan(-1);
		expect(rule(`${P}, ${P} *`).props["scrollbar-width"]).toBe("auto");
		// Every package rule that sets the tab scroller's scrollbar-width, by
		// its declaration, whatever its selector.
		const tabRules = [...flat.matchAll(/\n([^\n{}]*) \{\n([^}]*)\}/g)]
			.filter(
				([, selector, body]) =>
					selector.includes(".classicyTabScroller") &&
					/(^|\n)scrollbar-width:/.test(body),
			)
			.map(([, selector, body]) => ({ selector, body }));
		expect(tabRules).toHaveLength(1);
		const [tabs] = tabRules;
		expect(tabs.body).toMatch(/(^|\n)scrollbar-width: none;/);
		expect(compareSpecificity(tabs.selector, `${P} *`)).toBeGreaterThan(0);
		expect(flat.indexOf(`\n${tabs.selector} {`)).toBeGreaterThan(fallback);
	});

	describe("4.3b: the assistant, startup screen, QuickTime, Control Strip, slider, icon and tab-scroller looks", () => {
		// Every rule whose selector list is exactly `selector`, in order: Sass
		// emits a rule's declarations that follow a nested rule as a second rule
		// for the same selector, after the nested ones.
		const rules = (selector: string) => {
			const found: ReturnType<typeof rule>[] = [];
			for (
				let at = flat.indexOf(`\n${selector} {\n`);
				at >= 0;
				at = flat.indexOf(`\n${selector} {\n`, at + 1)
			) {
				const body = flat.slice(
					at + selector.length + 4,
					flat.indexOf("}", at),
				);
				const props: Record<string, string> = {};
				for (const line of body.split(";\n")) {
					const colon = line.indexOf(":");
					if (colon > 0)
						props[line.slice(0, colon).trim()] = line
							.slice(colon + 1)
							.trim()
							.replace(/;$/, "");
				}
				found.push({ at, props });
			}
			if (!found.length) throw new Error(`no rule for ${selector}`);
			return found;
		};
		// `winner` sets `prop` to `value` after the last rule for `loser`.
		const winsOver = (
			winner: string,
			loser: string,
			prop: string,
			value: string,
		) => {
			const w = rules(`${P} ${winner}`).at(-1);
			expect(w?.props[prop], winner).toBe(value);
			expect(w?.at, `${winner} follows ${loser}`).toBeGreaterThan(
				rule(`${P} ${loser}`).at,
			);
		};

		it("scopes the assistant header bevel", () => {
			const header = rule(`${P} .classicyAssistantHeader`).props;
			expect(header.border).toBe(
				"var(--window-border-size) solid var(--color-system-07)",
			);
			expect(header["border-bottom"]).toBe(
				"var(--window-border-size) solid var(--color-system-05)",
			);
			expect(header["box-shadow"]).toBe(
				"inset var(--window-border-size) var(--window-border-size) var(--color-window-border-outset)",
			);
		});

		it("scopes the startup screen panel border", () => {
			const panel = rule(`${P} .classicyStartupScreenPanel`).props;
			expect(panel.border).toBe(
				"var(--window-border-size) solid var(--color-window-border)",
			);
			expect(panel["box-shadow"]).toBeDefined();
		});

		// P11: the controller's cells drop the mixins' border and rounded
		// corners right after them, from the same layer.
		it("keeps the QuickTime controller cells flat over the raised face (P11)", () => {
			// The face, then (last) the flat edges: in the same rule for the time
			// display, in a later rule for the same selector after the mixin's
			// nested :active and :disabled rules for the others.
			const flatAfterFace = (cell: string, flatProps: string[]) => {
				const found = rules(`${P} ${cell}`);
				const [face, last] = [found[0], found.at(-1)];
				expect(face.props["background-color"], cell).toBe(
					"var(--color-system-02)",
				);
				expect(face.props["border-radius"], cell).toBeDefined();
				for (const prop of flatProps)
					expect(last?.props[prop], `${cell} ${prop}`).toBe("0");
				if (last !== face)
					expect(last?.at).toBeGreaterThan(rule(`${P} ${cell}:disabled`).at);
			};
			flatAfterFace(".quickTimePlayerVideoControlsTime", [
				"border",
				"border-radius",
			]);
			flatAfterFace(".quickTimePlayerVideoControlsButton", [
				"border",
				"border-radius",
			]);
			flatAfterFace(".quickTimePlayerVideoControlsProgressBarHolder", [
				"border-radius",
			]);
			expect(
				rule(`${P} .quickTimePlayerVideoControlsButton:active`).props[
					"background-color"
				],
			).toBe("var(--color-system-05)");
			expect(
				rule(`${P} .quickTimePlayerVideoControlsVolumeBar`).props["box-shadow"],
			).toMatch(/var\(--color-window-border-outset\)$/);
		});

		it("scopes the control strip bevels", () => {
			const raised = rule(`${P} .classicyControlStripCell`).props.background;
			expect(raised).toMatch(/^linear-gradient\(/);
			expect(raised).toMatch(/var\(--color-system-03\)$/);
			const pressed = rule(
				`${P} .classicyControlStripCell:active:not(:disabled)`,
			).props.background;
			expect(pressed).toMatch(/var\(--color-system-05\)$/);
			expect(
				rule(`${P} .classicyControlStripScroll:disabled`).props.background,
			).toMatch(
				/^linear-gradient\(var\(--color-system-05\), var\(--color-system-05\)\) 0 0/,
			);
			const module = `${P} .classicyControlStrip .classicyBevelButton.classicyControlStripModule`;
			expect(rule(module).props.background).toBe(raised);
			const moduleDown = rule(`${module}.pressed, ${module}.open`);
			expect(moduleDown.props.background).toBe(pressed);
			expect(moduleDown.at).toBeGreaterThan(rule(module).at);
			// The module's box-shadow (P15) and the cells' borders are structure.
			expect(rule(module).props["box-shadow"]).toBeUndefined();
			expect(
				rule(`${P} .classicyControlStripCell`).props.border,
			).toBeUndefined();
		});

		// P9: the nondirectional knob overrides the pentagon thumb's clip-path
		// and background, so it follows it in the package too.
		it("scopes the slider thumb, with the nondirectional knob over it (P9)", () => {
			const thumb = rule(`${P} .classicySlider::-webkit-slider-thumb`).props;
			expect(thumb["clip-path"]).toBe(
				"polygon(9% 2%, 92% 2%, 92% 56.6%, 50% 95%, 9% 56.6%)",
			);
			// The grip strikes resolve from the partial's own depth.
			expect(thumb.background).toContain(
				'url("../../../../../assets/img/ui/slider-strikes.svg") center 30%',
			);
			for (const pseudo of [
				"::-webkit-slider-thumb",
				"::-moz-range-thumb",
				":active::-webkit-slider-thumb",
				":active::-moz-range-thumb",
			]) {
				winsOver(
					`.classicySliderIndicatorNondirectional${pseudo}`,
					`.classicySlider${pseudo}`,
					"clip-path",
					"inset(0 round calc(var(--window-border-size) * 1.5))",
				);
				winsOver(
					`.classicySliderIndicatorNondirectional${pseudo}`,
					`.classicySliderHighlighted${pseudo}`,
					"clip-path",
					"inset(0 round calc(var(--window-border-size) * 1.5))",
				);
				expect(
					rule(`${P} .classicySliderHighlighted${pseudo}`).at,
				).toBeGreaterThan(rule(`${P} .classicySlider${pseudo}`).at);
			}
			winsOver(
				".classicySliderGhost.classicySliderIndicatorNondirectional",
				".classicySliderGhost",
				"clip-path",
				"inset(0 round calc(var(--window-border-size) * 1.5))",
			);
			expect(rule(`${P} .classicySliderGhost`).props["clip-path"]).toBe(
				thumb["clip-path"],
			);
		});

		it("scopes the icon halftones", () => {
			for (const mask of [".classicyDesktopIconMask", ".classicyIconMask"]) {
				const props = rule(`${P} ${mask}`).props;
				expect(props["background-image"], mask).toMatch(
					/^url\(['"]data:image\/svg\+xml,/,
				);
				expect(props["background-repeat"], mask).toBe("repeat");
				expect(props["background-size"], mask).toBe("7%");
			}
		});

		// Carried from 4.2's review: the tab scroller's re-assertion belongs to
		// a Tabs partial, included after the desktop's.
		it("hides the tab scroller's scrollbar from the Tabs partial, included after the desktop's", () => {
			expect(read(`${STYLES}/components/_Desktop.scss`)).not.toContain(
				"classicyTabScroller",
			);
			expect(read(`${STYLES}/components/_Tabs.scss`)).toMatch(
				/\.classicyTabScroller \{\s*scrollbar-width: none;\s*\}/,
			);
			const platinum = read(`${STYLES}/platinum.scss`);
			expect(platinum.indexOf("@include Tabs.tabs;")).toBeGreaterThan(
				platinum.indexOf("@include Desktop.desktop;"),
			);
		});

		it.each([
			"SystemFolder/SystemResources/Assistant/ClassicyAssistant.scss",
			"SystemFolder/SystemResources/Boot/ClassicyStartupScreen.scss",
			"SystemFolder/SystemResources/QuickTime/QuickTimeMovieEmbed.scss",
			"SystemFolder/SystemResources/ControlStrip/ClassicyControlStrip.scss",
			"SystemFolder/SystemResources/Slider/ClassicySlider.scss",
			"SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon.scss",
			"SystemFolder/SystemResources/Icon/ClassicyIcon.scss",
		])("%s no longer references the Platinum look", (file) => {
			const sheet = read(file);
			expect(sheet).not.toMatch(
				/AppearanceManager\/styles|@include appearance\.|platinum-|assets\.\$|bevel-(raised|recessed|pressed)|thumb-appearance|\$_thumb-|\$thumb-shape/,
			);
		});
	});

	describe("4.3a: the push button, bevel pop-up panel, checkbox, placard, table, drive list, meter, output, progress bar and split view looks", () => {
		// Every rule whose selector list is exactly `selector` (a list joined by
		// ", "), each part scoped (Sass splits a rule around its nested rules), in
		// order: the offset of each, and the declarations of all of them, the last
		// one winning.
		const rules = (selector: string) => {
			const scoped = selector
				.split(", ")
				.map((part) => `${P} ${part}`)
				.join(", ");
			const head = `\n${scoped} {\n`;
			const at: number[] = [];
			const props: Record<string, string> = {};
			for (let i = flat.indexOf(head); i >= 0; i = flat.indexOf(head, i + 1)) {
				at.push(i);
				const body = flat.slice(i + head.length, flat.indexOf("}", i));
				for (const line of body.split(";\n")) {
					const colon = line.indexOf(":");
					if (colon > 0)
						props[line.slice(0, colon).trim()] = line
							.slice(colon + 1)
							.trim()
							.replace(/;$/, "");
				}
			}
			if (!at.length) throw new Error(`no rule for ${scoped}`);
			return { first: at[0], last: at.at(-1) ?? at[0], props };
		};
		// R15: `winner` sets `prop` to `value` and follows `loser`.
		const winsOver = (
			winner: string,
			loser: string,
			prop: string,
			value: string,
		) => {
			const w = rules(winner);
			expect(w.props[prop], winner).toBe(value);
			expect(w.last, `${winner} follows ${loser}`).toBeGreaterThan(
				rules(loser).first,
			);
		};
		const BORDER = "var(--window-border-size) solid var(--color-window-border)";

		it("scopes the push button bevels", () => {
			const button = rules(".classicyButton").props;
			expect(button["border-radius"]).toBe("var(--window-padding-size)");
			expect(button["box-shadow"]).toBeDefined();
			expect(rules(".classicyButton:active").props["background-color"]).toBe(
				"var(--color-system-05)",
			);
			expect(
				rules(":where(.classicyButton).pressed").props["box-shadow"],
			).toBeDefined();
			expect(
				rules(".classicyButtonKeyActive").props["box-shadow"],
			).toBeDefined();
			expect(
				rules(":where(.classicyButton).default.classicyButtonKeyActive").props[
					"box-shadow"
				],
			).toBeDefined();
		});

		it("keeps the push button overrides after the bevels they override (P8, P8b)", () => {
			// P8: square and small buttons keep their radius over the bevel's.
			winsOver(
				".classicyButtonShapeSquare",
				".classicyButton",
				"border-radius",
				"0",
			);
			winsOver(
				".classicyButtonSmall",
				".classicyButton",
				"border-radius",
				"calc(var(--window-padding-size) / 2)",
			);
			winsOver(
				".classicyButtonShapeSquare",
				":where(.classicyButton).pressed",
				"border-radius",
				"0",
			);
			// P8b: the default ring comes from --button-default-ring, and a disabled
			// default button shows no pressed shadow.
			expect(
				rules(":where(.classicyButton).default").props["box-shadow"],
			).toMatch(/^0 0 0 calc\(var\(--button-default-ring\) \/ 3\)/);
			winsOver(
				":where(.classicyButton).default:active:disabled",
				":where(.classicyButton).default:active",
				"box-shadow",
				"none",
			);
		});

		it("scopes the bevel button's pop-up panel frame and keeps its face over it (P10)", () => {
			const panel = rules(
				".classicyBevelButtonPopup.classicyBevelButtonPopupPanel",
			);
			expect(panel.props.border).toBe("1px solid var(--color-black)");
			expect(panel.props.background).toBe("var(--color-system-03)");
			expect(panel.props["box-shadow"]).toBe(
				"inset 1px 1px 0 0 var(--color-white)",
			);
			expect(panel.last).toBeGreaterThan(panel.first);
			expect(flat).toContain(
				`${P} .classicyBevelButtonPopup.classicyBevelButtonPopupPanel::before {`,
			);
		});

		it("scopes the checkbox border and keeps its pressed, disabled and default overrides after it (P13)", () => {
			expect(rules(".classicyCheckbox").props.border).toBe(BORDER);
			winsOver(
				".classicyCheckbox:active",
				".classicyCheckbox",
				"box-shadow",
				"none",
			);
			const disabled =
				".classicyCheckbox:disabled, .classicyCheckbox:disabled:active";
			winsOver(disabled, ".classicyCheckbox", "box-shadow", "none");
			winsOver(
				disabled,
				".classicyCheckbox",
				"border",
				"var(--window-border-size) solid var(--color-system-06)",
			);
			winsOver(
				".classicyCheckbox.default:checked, .classicyCheckbox.default:active",
				".classicyCheckbox",
				"border-color",
				"var(--color-theme-06)",
			);
			winsOver(
				".classicyCheckbox.default:disabled",
				".classicyCheckbox.default:checked, .classicyCheckbox.default:active",
				"border-color",
				"var(--color-system-06)",
			);
		});

		it("scopes the placard menu, table header, drive list head, meter, output, progress bar and split view bevels", () => {
			expect(rules(".classicyPlacardMenu").props.border).toBe(BORDER);
			expect(
				rules(".classicyTableColumnHeader").props["box-shadow"],
			).toBeDefined();
			const selected = rules(":where(.classicyTableColumnHeader).selected");
			expect(selected.props["border-bottom"]).toBe(
				"calc(var(--window-border-size) * 1) solid var(--color-black)",
			);
			expect(selected.first).toBeGreaterThan(
				rules(".classicyTableColumnHeader").first,
			);
			expect(
				rules(".classicyDriveSetupListHead th").props["box-shadow"],
			).toBeDefined();
			expect(rules(".classicyMeter").props.border).toBe(BORDER);
			expect(rules(".classicyOutputInset").props.border).toBe(BORDER);
			expect(
				rules(".classicyProgress progress[value]::-webkit-progress-bar").props
					.border,
			).toBe(BORDER);
			expect(rules(".classicySplitViewDivider").props.border).toBe(BORDER);
		});

		it.each([
			"SystemFolder/SystemResources/Button/ClassicyButton.scss",
			"SystemFolder/SystemResources/BevelButton/ClassicyBevelButton.scss",
			"SystemFolder/SystemResources/Checkbox/ClassicyCheckbox.scss",
			"SystemFolder/SystemResources/Placard/ClassicyPlacard.scss",
			"SystemFolder/SystemResources/Table/ClassicyTable.scss",
			"SystemFolder/ControlPanels/DriveSetup/DriveSetupList.scss",
			"SystemFolder/SystemResources/Meter/ClassicyMeter.scss",
			"SystemFolder/SystemResources/Output/ClassicyOutput.scss",
			"SystemFolder/SystemResources/ProgressBar/ClassicyProgressBar.scss",
			"SystemFolder/SystemResources/SplitView/ClassicySplitView.scss",
		])("%s no longer references the old style modules or the Platinum mixins", (file) =>
			expect(read(file)).not.toMatch(
				/styles\/(appearance|scrollbars|assets)['"]|@include appearance\.|platinum-|assets\.\$/,
			));
	});
});

describe("the old AppearanceManager style modules", () => {
	// Every stylesheet outside src/Appearance/ (the packages and the
	// vocabulary, whose Platinum files are the modules' renamed copies).
	const sheets = globSync("src/**/*.scss").filter(
		(file) => !file.replaceAll("\\", "/").startsWith("src/Appearance/"),
	);

	it("no base stylesheet uses the old style modules", () => {
		expect(sheets.length).toBeGreaterThan(0);
		expect(
			sheets.filter((file) =>
				/@use ['"][^'"]*styles\/(appearance|scrollbars|assets)['"]|@include (appearance|scrollbars)\.|assets\.\$/.test(
					readFileSync(file, "utf8"),
				),
			),
		).toEqual([]);
	});

	it("are deleted, with their directory (ruling R7)", () =>
		expect(existsSync(`src/${ORIGINALS}`)).toBe(false));
});

describe("the six base stylesheets 4.2 moved the Platinum look out of", () => {
	it.each([
		"SystemFolder/SystemResources/Window/ClassicyWindow.scss",
		"SystemFolder/SystemResources/Window/ClassicyWindowFrame.scss",
		"SystemFolder/SystemResources/Alert/ClassicyAlert.scss",
		"SystemFolder/SystemResources/Desktop/ClassicyDesktop.scss",
		"SystemFolder/SystemResources/Menu/ClassicyMenu.scss",
		"SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu.scss",
	])("%s no longer references the Platinum mixins", (file) =>
		expect(read(file)).not.toMatch(
			/AppearanceManager\/styles|platinum-|assets\.\$/,
		));
});

describe("the moved Platinum mixin files", () => {
	const declared = (file: string) =>
		[
			...read(`${STYLES}/${file}`).matchAll(/@(mixin|function)\s+([\w-]+)/g),
		].map(([, kind, name]) => `${kind} ${name}`);

	it("declare only the renamed mixins and function", () => {
		expect(declared("_mixins.scss")).toEqual([
			"mixin platinum-menu-frame",
			"mixin platinum-menu-divider",
			"mixin platinum-window-box-shadow",
			"mixin platinum-box-shadow",
			"mixin platinum-window-border",
			"mixin platinum-window-header-border",
			"mixin platinum-window-header-border-depressed",
			"mixin platinum-window-inner-box-shadow",
			"mixin platinum-window-inner-box-shadow-outer",
			"mixin platinum-window-inner-border",
			"mixin platinum-window-control-box-border",
			"mixin platinum-window-control-box",
			"mixin platinum-window-control-box-depressable",
			"mixin platinum-window-undepressable",
			"mixin platinum-window-depressable",
			"mixin platinum-window-depressed",
			"mixin platinum-depressable-default",
			"mixin platinum-depressable-box-shadow-active",
			"function platinum-encode-color",
			"mixin platinum-halftone",
			"mixin platinum-title-bar-stripes",
		]);
		expect(declared("_scrollbars.scss")).toEqual([
			"mixin platinum-scrollbar-glyph-up",
			"mixin platinum-scrollbar-glyph-down",
			"mixin platinum-scrollbar-glyph-left",
			"mixin platinum-scrollbar-glyph-right",
			"mixin platinum-scrollbar-button-box",
			"mixin platinum-scrollbar-button-pressed",
			"mixin platinum-scrollbars",
			"mixin platinum-scrollbars-split-arrows",
			"mixin platinum-scrollbars-inactive",
			"mixin platinum-scrollbars-themed",
		]);
		expect(declared("_assets.scss")).toEqual([
			"mixin platinum-root-properties",
		]);
		for (const file of ["_mixins.scss", "_scrollbars.scss", "_assets.scss"])
			expect(read(`${STYLES}/${file}`)).not.toMatch(
				/platinum[A-Z]|\bsb-(?:glyph|btn)|theme-halftone|[^-]encode-color|[^-]px-rect|[^-]no-select/,
			);
	});

	// Every piece of Platinum art is registered system art (Part E 2.1, 2.2),
	// read through `--classicy-art-*`, so _assets.scss embeds none.
	it("_assets.scss declares no art variables, only the root-properties mixin", () => {
		const assets = read(`${STYLES}/_assets.scss`);
		expect(assets).not.toMatch(/^\$[\w-]+:/m);
		expect(assets).not.toMatch(/url\(/);
	});

	it("platinum-root-properties compiles to its pinned output", () =>
		expect(
			include(`${STYLES}/assets`, "platinum-root-properties", ""),
		).toMatchInlineSnapshot(`
			".x {
			  --platinum-stripe-light: var(--color-white);
			  --platinum-stripe-dark: #787878;
			  --platinum-stripe-red-light: #f9dada;
			  --platinum-stripe-red-dark: #ef8c89;
			}"
		`));

	// Sass evaluates a mixin body only when it is included, so each mixin is
	// included into `.x` and its whole output pinned: a body edit to any
	// Platinum mixin fails here. The snapshots were taken from the copies that
	// 4.1 proved compile exactly as their AppearanceManager/styles originals
	// (since deleted, ruling R7). One test per mixin, because an inline
	// snapshot cannot sit in a loop.
	const include = (use: string, name: string, args: string) =>
		compileString(
			`@use "${use}" as m;\n.x { @include m.${name}${args}; }`,
			LOAD,
		).css;
	const mixin = (name: string, args = "") =>
		include(`${STYLES}/mixins`, name, args);
	const scrollbarMixin = (name: string, args = "") =>
		include(`${STYLES}/scrollbars`, name, args);

	it("platinum-menu-frame compiles to its pinned output", () =>
		expect(mixin("platinum-menu-frame")).toMatchInlineSnapshot(`
			".x {
			  border: 1px solid var(--color-black);
			  box-shadow: none;
			  background: linear-gradient(var(--color-white), var(--color-white)) 0 0/calc(100% - 1px) 1px no-repeat, linear-gradient(var(--color-white), var(--color-white)) 0 0/1px calc(100% - 1px) no-repeat, linear-gradient(var(--color-system-04), var(--color-system-04)) 100% 1px/1px calc(100% - 1px) no-repeat, linear-gradient(var(--color-system-04), var(--color-system-04)) 1px 100%/calc(100% - 1px) 1px no-repeat, var(--color-system-02);
			}
			.x::before, .x::after {
			  content: "";
			  position: absolute;
			  background-color: var(--color-system-07);
			  pointer-events: none;
			}
			.x::after {
			  top: 1px;
			  right: -2px;
			  bottom: -2px;
			  width: 1px;
			}
			.x::before {
			  left: 1px;
			  right: -2px;
			  bottom: -2px;
			  height: 1px;
			}"
		`));

	it("platinum-menu-divider compiles to its pinned output", () =>
		expect(mixin("platinum-menu-divider")).toMatchInlineSnapshot(`
			".x {
			  align-self: stretch;
			  width: auto;
			  margin-left: calc(var(--window-border-size) * -1);
			  margin-right: calc(var(--window-border-size) * -1);
			  border-top-color: var(--color-system-05);
			  border-bottom-color: var(--color-white);
			}"
		`));

	it("platinum-window-box-shadow compiles to its pinned output", () =>
		expect(mixin("platinum-window-box-shadow")).toMatchInlineSnapshot(`
			".x {
			  box-shadow: inset calc(var(--window-border-size) * -1) calc(var(--window-border-size) * -1) var(--color-system-05), inset var(--window-border-size) var(--window-border-size) var(--color-window-border-outset), var(--window-border-size) var(--window-border-size) 0 0 var(--color-black);
			}"
		`));

	it("platinum-box-shadow compiles to its pinned output", () =>
		expect(mixin("platinum-box-shadow")).toMatchInlineSnapshot(`
			".x {
			  box-shadow: inset var(--window-border-size) var(--window-border-size) var(--color-system-05), var(--window-border-size) var(--window-border-size) var(--color-window-border-outset);
			}"
		`));

	it("platinum-window-border compiles to its pinned output", () =>
		expect(mixin("platinum-window-border")).toMatchInlineSnapshot(`
			".x {
			  border: var(--window-border-size) solid var(--color-window-border);
			  box-shadow: inset calc(var(--window-border-size) * -1) calc(var(--window-border-size) * -1) var(--color-system-05), inset var(--window-border-size) var(--window-border-size) var(--color-window-border-outset), var(--window-border-size) var(--window-border-size) 0 0 var(--color-black);
			}"
		`));

	it("platinum-window-header-border compiles to its pinned output", () =>
		expect(mixin("platinum-window-header-border")).toMatchInlineSnapshot(`
			".x {
			  border: var(--window-border-size) solid var(--color-system-07);
			  border-bottom: var(--window-border-size) solid var(--color-system-05);
			  box-shadow: inset calc(var(--window-border-size) * -1) calc(var(--window-border-size) * -1) var(--color-system-05), inset var(--window-border-size) var(--window-border-size) var(--color-window-border-outset), var(--window-border-size) var(--window-border-size) 0 0 var(--color-black);
			  box-shadow: inset var(--window-border-size) var(--window-border-size) var(--color-window-border-outset);
			}"
		`));

	it("platinum-window-header-border-depressed compiles to its pinned output", () =>
		expect(
			mixin("platinum-window-header-border-depressed"),
		).toMatchInlineSnapshot(`
			".x {
			  box-shadow: inset calc(var(--window-border-size) * -1) calc(var(--window-border-size) * -1) var(--color-system-03), inset calc(var(--window-border-size) * 1) calc(var(--window-border-size) * 1) var(--color-system-05), calc(var(--window-border-size) * 1) calc(var(--window-border-size) * 1) var(--color-system-06);
			  border-bottom: calc(var(--window-border-size) * 1) solid var(--color-black);
			  color: var(--color-black);
			}"
		`));

	it("platinum-window-inner-box-shadow compiles to its pinned output", () =>
		expect(mixin("platinum-window-inner-box-shadow")).toMatchInlineSnapshot(`
			".x {
			  box-shadow: calc(var(--window-border-size) * -1) calc(var(--window-border-size) * -1) var(--color-system-05), calc(var(--window-border-size) * 1) calc(var(--window-border-size) * 1) var(--color-window-border-outset);
			}"
		`));

	it("platinum-window-inner-box-shadow-outer compiles to its pinned output", () =>
		expect(
			mixin("platinum-window-inner-box-shadow-outer"),
		).toMatchInlineSnapshot(`
			".x {
			  box-shadow: calc(var(--window-border-size) * -1) calc(var(--window-border-size) * -1) var(--color-system-05);
			}"
		`));

	it("platinum-window-inner-border compiles to its pinned output", () =>
		expect(mixin("platinum-window-inner-border")).toMatchInlineSnapshot(`
			".x {
			  border: var(--window-border-size) solid var(--color-window-border);
			  box-shadow: calc(var(--window-border-size) * -1) calc(var(--window-border-size) * -1) var(--color-system-05), calc(var(--window-border-size) * 1) calc(var(--window-border-size) * 1) var(--color-window-border-outset);
			}"
		`));

	it("platinum-window-control-box-border compiles to its pinned output", () =>
		expect(mixin("platinum-window-control-box-border")).toMatchInlineSnapshot(`
			".x {
			  box-shadow: inset var(--window-border-size) var(--window-border-size) 0 0 var(--color-system-03), inset calc((var(--window-border-size)) * -1) calc((var(--window-border-size)) * -1) 0 0 var(--color-system-05);
			  border: var(--window-border-size) solid var(--color-black);
			}"
		`));

	it("platinum-window-control-box compiles to its pinned output", () =>
		expect(mixin("platinum-window-control-box")).toMatchInlineSnapshot(`
			".x {
			  width: var(--window-control-size);
			  height: var(--window-control-size);
			  background: linear-gradient(135deg, var(--color-system-05), var(--color-white) 80%);
			}
			.x:before {
			  display: block;
			  width: 100%;
			  height: 100%;
			  background-image: var(--classicy-art-window-dither);
			  background-repeat: no-repeat;
			  background-size: cover;
			  mix-blend-mode: luminosity;
			  opacity: 0.25;
			  content: " ";
			}"
		`));

	it("platinum-window-control-box-depressable compiles to its pinned output", () =>
		expect(
			mixin("platinum-window-control-box-depressable"),
		).toMatchInlineSnapshot(`
			".x {
			  width: var(--window-control-size);
			  height: var(--window-control-size);
			  background: linear-gradient(135deg, var(--color-system-05), var(--color-white) 80%);
			}
			.x:before {
			  display: block;
			  width: 100%;
			  height: 100%;
			  background-image: var(--classicy-art-window-dither);
			  background-repeat: no-repeat;
			  background-size: cover;
			  mix-blend-mode: luminosity;
			  opacity: 0.25;
			  content: " ";
			}
			.x {
			  box-shadow: inset var(--window-border-size) var(--window-border-size) 0 0 var(--color-system-03), inset calc((var(--window-border-size)) * -1) calc((var(--window-border-size)) * -1) 0 0 var(--color-system-05);
			  border: var(--window-border-size) solid var(--color-black);
			}
			.x:active {
			  box-shadow: inset var(--window-border-size) var(--window-border-size) 0 0 var(--color-system-07), inset calc(var(--window-border-size) * -1) calc(var(--window-border-size) * -1) 0 0 var(--color-system-05);
			  background: linear-gradient(135deg, var(--color-system-06), var(--color-system-05));
			}
			.x:after {
			  position: relative;
			  top: calc(var(--window-control-size) * -1 - var(--window-border-size));
			  display: block;
			  width: 100%;
			  height: 100%;
			  mask-position: center center;
			  mask-repeat: no-repeat;
			  mask-size: contain;
			  content: " ";
			}"
		`));

	it("platinum-window-undepressable compiles to its pinned output", () =>
		expect(mixin("platinum-window-undepressable")).toMatchInlineSnapshot(`
			".x {
			  box-shadow: inset calc(var(--window-border-size) * -1) calc(var(--window-border-size) * -1) var(--color-system-05), inset calc(var(--window-border-size) * -2) calc(var(--window-border-size) * -2) var(--color-system-04), inset calc(var(--window-border-size) * 1) calc(var(--window-border-size) * 1) var(--color-system-04), inset calc(var(--window-border-size) * 2) calc(var(--window-border-size) * 2) var(--color-white);
			  background-color: var(--color-system-02);
			  border: var(--window-border-size) solid var(--color-black);
			  border-radius: var(--window-padding-size);
			}"
		`));

	it("platinum-window-depressable compiles to its pinned output", () =>
		expect(mixin("platinum-window-depressable")).toMatchInlineSnapshot(`
			".x {
			  box-shadow: inset calc(var(--window-border-size) * -1) calc(var(--window-border-size) * -1) var(--color-system-05), inset calc(var(--window-border-size) * -2) calc(var(--window-border-size) * -2) var(--color-system-04), inset calc(var(--window-border-size) * 1) calc(var(--window-border-size) * 1) var(--color-system-04), inset calc(var(--window-border-size) * 2) calc(var(--window-border-size) * 2) var(--color-white);
			  background-color: var(--color-system-02);
			  border: var(--window-border-size) solid var(--color-black);
			  border-radius: var(--window-padding-size);
			}
			.x:active {
			  box-shadow: inset calc(var(--window-border-size) * -1) calc(var(--window-border-size) * -1) var(--color-system-05), inset calc(var(--window-border-size) * -2) calc(var(--window-border-size) * -2) var(--color-system-06), inset calc(var(--window-border-size) * 1) calc(var(--window-border-size) * 1) var(--color-system-07), inset calc(var(--window-border-size) * 2) calc(var(--window-border-size) * 2) var(--color-system-06);
			  background-color: var(--color-system-05);
			  color: var(--color-white);
			}
			.x:disabled {
			  box-shadow: none;
			  background-color: var(--color-system-03);
			  border-color: var(--color-system-05);
			  color: var(--color-system-05);
			}
			.x:disabled * {
			  color: var(--color-system-05);
			}"
		`));

	it("platinum-window-depressed compiles to its pinned output", () =>
		expect(mixin("platinum-window-depressed")).toMatchInlineSnapshot(`
			".x {
			  border-radius: var(--window-padding-size);
			  box-shadow: inset calc(var(--window-border-size) * -1) calc(var(--window-border-size) * -1) var(--color-system-05), inset calc(var(--window-border-size) * -2) calc(var(--window-border-size) * -2) var(--color-system-06), inset calc(var(--window-border-size) * 1) calc(var(--window-border-size) * 1) var(--color-system-07), inset calc(var(--window-border-size) * 2) calc(var(--window-border-size) * 2) var(--color-system-06);
			  background-color: var(--color-system-05);
			  color: var(--color-white);
			}"
		`));

	it("platinum-depressable-default compiles to its pinned output", () =>
		expect(mixin("platinum-depressable-default")).toMatchInlineSnapshot(`
			".x {
			  box-shadow: inset calc(var(--window-border-size) * -1) calc(var(--window-border-size) * -1) var(--color-system-05), inset calc(var(--window-border-size) * -2) calc(var(--window-border-size) * -2) var(--color-system-04), inset calc(var(--window-border-size) * 1) calc(var(--window-border-size) * 1) var(--color-system-04), inset calc(var(--window-border-size) * 2) calc(var(--window-border-size) * 2) var(--color-white);
			  background-color: var(--color-system-02);
			  border: var(--window-border-size) solid var(--color-black);
			  border-radius: var(--window-padding-size);
			}
			.x:active {
			  box-shadow: inset calc(var(--window-border-size) * -1) calc(var(--window-border-size) * -1) var(--color-system-05), inset calc(var(--window-border-size) * -2) calc(var(--window-border-size) * -2) var(--color-system-06), inset calc(var(--window-border-size) * 1) calc(var(--window-border-size) * 1) var(--color-system-07), inset calc(var(--window-border-size) * 2) calc(var(--window-border-size) * 2) var(--color-system-06);
			  background-color: var(--color-system-05);
			  color: var(--color-white);
			}
			.x:disabled {
			  box-shadow: none;
			  background-color: var(--color-system-03);
			  border-color: var(--color-system-05);
			  color: var(--color-system-05);
			}
			.x:disabled * {
			  color: var(--color-system-05);
			}
			.x {
			  box-shadow: 0 0 0 var(--window-border-size) var(--color-system-04), 0 0 0 calc(var(--window-border-size) * 2) var(--color-system-02), 0 0 0 calc(var(--window-border-size) * 3) var(--color-black), inset calc(var(--window-border-size) * -1) calc(var(--window-border-size) * -1) 0 0 var(--color-system-05), inset var(--window-border-size) var(--window-border-size) 0 0 var(--color-system-06);
			}
			.x:active {
			  box-shadow: inset calc(var(--window-border-size) * -1) calc(var(--window-border-size) * -1) var(--color-system-07), inset calc(var(--window-border-size) * -2) calc(var(--window-border-size) * -2) var(--color-system-06), inset calc(var(--window-border-size) * 1) calc(var(--window-border-size) * 1) var(--color-system-07), inset calc(var(--window-border-size) * 2) calc(var(--window-border-size) * 2) var(--color-system-06), 0 0 0 var(--window-border-size) var(--color-system-04), 0 0 0 calc(var(--window-border-size) * 2) var(--color-black), inset calc(var(--window-border-size) * -2) calc(var(--window-border-size) * -2) 0 0 var(--color-system-05), inset var(--window-border-size) var(--window-border-size) 0 0 var(--color-system-06);
			}"
		`));

	it("platinum-depressable-box-shadow-active compiles to its pinned output", () =>
		expect(
			mixin("platinum-depressable-box-shadow-active"),
		).toMatchInlineSnapshot(`
			".x {
			  box-shadow: inset calc(var(--window-border-size) * -1) calc(var(--window-border-size) * -1) var(--color-system-07), inset calc(var(--window-border-size) * -2) calc(var(--window-border-size) * -2) var(--color-system-06), inset calc(var(--window-border-size) * 1) calc(var(--window-border-size) * 1) var(--color-system-07), inset calc(var(--window-border-size) * 2) calc(var(--window-border-size) * 2) var(--color-system-06), 0 0 0 var(--window-border-size) var(--color-system-04), 0 0 0 calc(var(--window-border-size) * 2) var(--color-black), inset calc(var(--window-border-size) * -2) calc(var(--window-border-size) * -2) 0 0 var(--color-system-05), inset var(--window-border-size) var(--window-border-size) 0 0 var(--color-system-06);
			}"
		`));

	it("platinum-halftone compiles to its pinned output", () =>
		expect(mixin("platinum-halftone", "(#c0c0c0, 10%)")).toMatchInlineSnapshot(`
			".x {
			  background-image: url('data:image/svg+xml,<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 2.8 2.8" xml:space="preserve"><path fill="%23C0C0C0" d="M1,1.2H0.5C0.3,1.2,0.2,1.2,0.2,1V0.5c0-0.1,0.1-0.2,0.2-0.2H1c0.1,0,0.2,0.1,0.2,0.2V1C1.2,1.2,1.2,1.2,1,1.2z"/><path fill="%23C0C0C0" d="M2.3,2.5H1.7c-0.1,0-0.2-0.1-0.2-0.2V1.7c0-0.1,0.1-0.2,0.2-0.2h0.6c0.1,0,0.2,0.1,0.2,0.2v0.6C2.5,2.4,2.4,2.5,2.3,2.5z"/></svg>');
			  background-repeat: repeat;
			  background-size: 10%;
			}"
		`));

	it("platinum-title-bar-stripes compiles to its pinned output", () =>
		expect(
			mixin("platinum-title-bar-stripes", "(auto 99.8%)"),
		).toMatchInlineSnapshot(`
			".x {
			  position: relative;
			  background-color: var(--platinum-stripe-light);
			}
			.x::before {
			  content: "";
			  position: absolute;
			  inset: 0;
			  pointer-events: none;
			  background-color: var(--platinum-stripe-dark);
			  mask-image: var(--classicy-art-window-stripes);
			  mask-repeat: repeat;
			  mask-position: 0 0;
			  mask-size: auto 99.8%;
			}"
		`));

	it("platinum-title-bar-stripes compiles to its pinned output, red", () =>
		expect(
			mixin("platinum-title-bar-stripes", '(auto, "-red")'),
		).toMatchInlineSnapshot(`
			".x {
			  position: relative;
			  background-color: var(--platinum-stripe-red-light);
			}
			.x::before {
			  content: "";
			  position: absolute;
			  inset: 0;
			  pointer-events: none;
			  background-color: var(--platinum-stripe-red-dark);
			  mask-image: var(--classicy-art-window-stripes-red);
			  mask-repeat: repeat;
			  mask-position: 0 0;
			  mask-size: auto;
			}"
		`));

	it("platinum-scrollbar-glyph-up compiles to its pinned output", () =>
		expect(
			scrollbarMixin("platinum-scrollbar-glyph-up", "(var(--color-system-02))"),
		).toMatchInlineSnapshot(`
			".x {
			  background: linear-gradient(transparent 75%, var(--color-black) 0) 50%/calc(var(--window-scrollbar-arrow-size) * 2) var(--window-scrollbar-arrow-size) no-repeat, linear-gradient(transparent 50%, var(--color-black) 0) 50%/calc(var(--window-scrollbar-arrow-size) * 1.5) var(--window-scrollbar-arrow-size) no-repeat, linear-gradient(transparent 25%, var(--color-black) 0) 50%/var(--window-scrollbar-arrow-size) var(--window-scrollbar-arrow-size) no-repeat, linear-gradient(var(--color-black) 50%, var(--color-black) 0) 50%/calc(var(--window-scrollbar-arrow-size) / 2) var(--window-scrollbar-arrow-size) no-repeat, var(--color-system-02);
			}"
		`));

	it("platinum-scrollbar-glyph-down compiles to its pinned output", () =>
		expect(
			scrollbarMixin("platinum-scrollbar-glyph-down", "(white)"),
		).toMatchInlineSnapshot(`
			".x {
			  background: linear-gradient(0deg, transparent 75%, var(--color-black) 0) 50%/calc(var(--window-scrollbar-arrow-size) * 2) var(--window-scrollbar-arrow-size) no-repeat, linear-gradient(0deg, transparent 50%, var(--color-black) 0) 50%/calc(var(--window-scrollbar-arrow-size) * 1.5) var(--window-scrollbar-arrow-size) no-repeat, linear-gradient(0deg, transparent 25%, var(--color-black) 0) 50%/var(--window-scrollbar-arrow-size) var(--window-scrollbar-arrow-size) no-repeat, linear-gradient(var(--color-black) 50%, var(--color-black) 0) 50%/calc(var(--window-scrollbar-arrow-size) / 2) var(--window-scrollbar-arrow-size) no-repeat, white;
			}"
		`));

	it("platinum-scrollbar-glyph-left compiles to its pinned output", () =>
		expect(
			scrollbarMixin("platinum-scrollbar-glyph-left", "(white)"),
		).toMatchInlineSnapshot(`
			".x {
			  background: linear-gradient(90deg, transparent 75%, var(--color-black) 0) 50%/var(--window-scrollbar-arrow-size) calc(var(--window-scrollbar-arrow-size) * 2) no-repeat, linear-gradient(90deg, transparent 50%, var(--color-black) 0) 50%/var(--window-scrollbar-arrow-size) calc(var(--window-scrollbar-arrow-size) * 1.5) no-repeat, linear-gradient(90deg, transparent 25%, var(--color-black) 0) 50%/var(--window-scrollbar-arrow-size) var(--window-scrollbar-arrow-size) no-repeat, linear-gradient(var(--color-black) 50%, var(--color-black) 0) 50%/var(--window-scrollbar-arrow-size) calc(var(--window-scrollbar-arrow-size) / 2) no-repeat, white;
			}"
		`));

	it("platinum-scrollbar-glyph-right compiles to its pinned output", () =>
		expect(
			scrollbarMixin("platinum-scrollbar-glyph-right", "(white)"),
		).toMatchInlineSnapshot(`
			".x {
			  background: linear-gradient(270deg, transparent 75%, var(--color-black) 0) 50%/var(--window-scrollbar-arrow-size) calc(var(--window-scrollbar-arrow-size) * 2) no-repeat, linear-gradient(270deg, transparent 50%, var(--color-black) 0) 50%/var(--window-scrollbar-arrow-size) calc(var(--window-scrollbar-arrow-size) * 1.5) no-repeat, linear-gradient(270deg, transparent 25%, var(--color-black) 0) 50%/var(--window-scrollbar-arrow-size) var(--window-scrollbar-arrow-size) no-repeat, linear-gradient(var(--color-black) 50%, var(--color-black) 0) 50%/var(--window-scrollbar-arrow-size) calc(var(--window-scrollbar-arrow-size) / 2) no-repeat, white;
			}"
		`));

	it("platinum-scrollbar-button-box compiles to its pinned output", () =>
		expect(
			scrollbarMixin("platinum-scrollbar-button-box"),
		).toMatchInlineSnapshot(`
			".x {
			  display: block;
			  width: var(--window-scrollbar-size);
			  height: var(--window-scrollbar-size);
			}"
		`));

	it("platinum-scrollbar-button-pressed compiles to its pinned output", () =>
		expect(
			scrollbarMixin("platinum-scrollbar-button-pressed"),
		).toMatchInlineSnapshot(`
			".x {
			  box-shadow: inset var(--window-border-size) var(--window-border-size) 0 var(--color-system-07), inset calc(var(--window-border-size) * -1) calc(var(--window-border-size) * -1) 0 var(--color-system-07);
			}"
		`));

	it("platinum-scrollbars compiles to its pinned output", () =>
		expect(scrollbarMixin("platinum-scrollbars")).toMatchInlineSnapshot(`
			"@supports not selector(::-webkit-scrollbar) {
			  .x {
			    scrollbar-width: auto;
			    scrollbar-color: var(--color-theme-03) var(--color-system-04);
			  }
			}
			.x::-webkit-scrollbar {
			  width: var(--window-scrollbar-size);
			  height: var(--window-scrollbar-size);
			}
			.x::-webkit-scrollbar-button:end:vertical {
			  display: block;
			  width: var(--window-scrollbar-size);
			  height: var(--window-scrollbar-size);
			  background-color: var(--color-system-02);
			  border-left: var(--window-border-size) solid var(--color-black);
			  border-right: var(--window-border-size) solid var(--color-black);
			  border-top: var(--window-border-size) solid var(--color-black);
			}
			.x::-webkit-scrollbar-button:end:vertical:decrement {
			  background: linear-gradient(transparent 75%, var(--color-black) 0) 50%/calc(var(--window-scrollbar-arrow-size) * 2) var(--window-scrollbar-arrow-size) no-repeat, linear-gradient(transparent 50%, var(--color-black) 0) 50%/calc(var(--window-scrollbar-arrow-size) * 1.5) var(--window-scrollbar-arrow-size) no-repeat, linear-gradient(transparent 25%, var(--color-black) 0) 50%/var(--window-scrollbar-arrow-size) var(--window-scrollbar-arrow-size) no-repeat, linear-gradient(var(--color-black) 50%, var(--color-black) 0) 50%/calc(var(--window-scrollbar-arrow-size) / 2) var(--window-scrollbar-arrow-size) no-repeat, var(--color-system-02);
			  border-bottom: var(--window-border-size) solid var(--color-black);
			}
			.x::-webkit-scrollbar-button:end:vertical:decrement:active {
			  background: linear-gradient(transparent 75%, var(--color-black) 0) 50%/calc(var(--window-scrollbar-arrow-size) * 2) var(--window-scrollbar-arrow-size) no-repeat, linear-gradient(transparent 50%, var(--color-black) 0) 50%/calc(var(--window-scrollbar-arrow-size) * 1.5) var(--window-scrollbar-arrow-size) no-repeat, linear-gradient(transparent 25%, var(--color-black) 0) 50%/var(--window-scrollbar-arrow-size) var(--window-scrollbar-arrow-size) no-repeat, linear-gradient(var(--color-black) 50%, var(--color-black) 0) 50%/calc(var(--window-scrollbar-arrow-size) / 2) var(--window-scrollbar-arrow-size) no-repeat, var(--color-system-06);
			  box-shadow: inset var(--window-border-size) var(--window-border-size) 0 var(--color-system-07), inset calc(var(--window-border-size) * -1) calc(var(--window-border-size) * -1) 0 var(--color-system-07);
			}
			.x::-webkit-scrollbar-button:end:vertical:increment {
			  background: linear-gradient(0deg, transparent 75%, var(--color-black) 0) 50%/calc(var(--window-scrollbar-arrow-size) * 2) var(--window-scrollbar-arrow-size) no-repeat, linear-gradient(0deg, transparent 50%, var(--color-black) 0) 50%/calc(var(--window-scrollbar-arrow-size) * 1.5) var(--window-scrollbar-arrow-size) no-repeat, linear-gradient(0deg, transparent 25%, var(--color-black) 0) 50%/var(--window-scrollbar-arrow-size) var(--window-scrollbar-arrow-size) no-repeat, linear-gradient(var(--color-black) 50%, var(--color-black) 0) 50%/calc(var(--window-scrollbar-arrow-size) / 2) var(--window-scrollbar-arrow-size) no-repeat, var(--color-system-02);
			}
			.x::-webkit-scrollbar-button:end:vertical:increment:active {
			  background: linear-gradient(0deg, transparent 75%, var(--color-black) 0) 50%/calc(var(--window-scrollbar-arrow-size) * 2) var(--window-scrollbar-arrow-size) no-repeat, linear-gradient(0deg, transparent 50%, var(--color-black) 0) 50%/calc(var(--window-scrollbar-arrow-size) * 1.5) var(--window-scrollbar-arrow-size) no-repeat, linear-gradient(0deg, transparent 25%, var(--color-black) 0) 50%/var(--window-scrollbar-arrow-size) var(--window-scrollbar-arrow-size) no-repeat, linear-gradient(var(--color-black) 50%, var(--color-black) 0) 50%/calc(var(--window-scrollbar-arrow-size) / 2) var(--window-scrollbar-arrow-size) no-repeat, var(--color-system-06);
			  box-shadow: inset var(--window-border-size) var(--window-border-size) 0 var(--color-system-07), inset calc(var(--window-border-size) * -1) calc(var(--window-border-size) * -1) 0 var(--color-system-07);
			}
			.x::-webkit-scrollbar-button:end:horizontal {
			  display: block;
			  width: var(--window-scrollbar-size);
			  height: var(--window-scrollbar-size);
			  background-color: var(--color-system-02);
			  border-top: var(--window-border-size) solid var(--color-black);
			  border-bottom: var(--window-border-size) solid var(--color-black);
			  border-left: var(--window-border-size) solid var(--color-black);
			}
			.x::-webkit-scrollbar-button:end:horizontal:decrement {
			  background: linear-gradient(90deg, transparent 75%, var(--color-black) 0) 50%/var(--window-scrollbar-arrow-size) calc(var(--window-scrollbar-arrow-size) * 2) no-repeat, linear-gradient(90deg, transparent 50%, var(--color-black) 0) 50%/var(--window-scrollbar-arrow-size) calc(var(--window-scrollbar-arrow-size) * 1.5) no-repeat, linear-gradient(90deg, transparent 25%, var(--color-black) 0) 50%/var(--window-scrollbar-arrow-size) var(--window-scrollbar-arrow-size) no-repeat, linear-gradient(var(--color-black) 50%, var(--color-black) 0) 50%/var(--window-scrollbar-arrow-size) calc(var(--window-scrollbar-arrow-size) / 2) no-repeat, var(--color-system-02);
			  border-right: var(--window-border-size) solid var(--color-black);
			}
			.x::-webkit-scrollbar-button:end:horizontal:decrement:active {
			  background: linear-gradient(90deg, transparent 75%, var(--color-black) 0) 50%/var(--window-scrollbar-arrow-size) calc(var(--window-scrollbar-arrow-size) * 2) no-repeat, linear-gradient(90deg, transparent 50%, var(--color-black) 0) 50%/var(--window-scrollbar-arrow-size) calc(var(--window-scrollbar-arrow-size) * 1.5) no-repeat, linear-gradient(90deg, transparent 25%, var(--color-black) 0) 50%/var(--window-scrollbar-arrow-size) var(--window-scrollbar-arrow-size) no-repeat, linear-gradient(var(--color-black) 50%, var(--color-black) 0) 50%/var(--window-scrollbar-arrow-size) calc(var(--window-scrollbar-arrow-size) / 2) no-repeat, var(--color-system-06);
			  box-shadow: inset var(--window-border-size) var(--window-border-size) 0 var(--color-system-07), inset calc(var(--window-border-size) * -1) calc(var(--window-border-size) * -1) 0 var(--color-system-07);
			}
			.x::-webkit-scrollbar-button:end:horizontal:increment {
			  background: linear-gradient(270deg, transparent 75%, var(--color-black) 0) 50%/var(--window-scrollbar-arrow-size) calc(var(--window-scrollbar-arrow-size) * 2) no-repeat, linear-gradient(270deg, transparent 50%, var(--color-black) 0) 50%/var(--window-scrollbar-arrow-size) calc(var(--window-scrollbar-arrow-size) * 1.5) no-repeat, linear-gradient(270deg, transparent 25%, var(--color-black) 0) 50%/var(--window-scrollbar-arrow-size) var(--window-scrollbar-arrow-size) no-repeat, linear-gradient(var(--color-black) 50%, var(--color-black) 0) 50%/var(--window-scrollbar-arrow-size) calc(var(--window-scrollbar-arrow-size) / 2) no-repeat, var(--color-system-02);
			}
			.x::-webkit-scrollbar-button:end:horizontal:increment:active {
			  background: linear-gradient(270deg, transparent 75%, var(--color-black) 0) 50%/var(--window-scrollbar-arrow-size) calc(var(--window-scrollbar-arrow-size) * 2) no-repeat, linear-gradient(270deg, transparent 50%, var(--color-black) 0) 50%/var(--window-scrollbar-arrow-size) calc(var(--window-scrollbar-arrow-size) * 1.5) no-repeat, linear-gradient(270deg, transparent 25%, var(--color-black) 0) 50%/var(--window-scrollbar-arrow-size) var(--window-scrollbar-arrow-size) no-repeat, linear-gradient(var(--color-black) 50%, var(--color-black) 0) 50%/var(--window-scrollbar-arrow-size) calc(var(--window-scrollbar-arrow-size) / 2) no-repeat, var(--color-system-06);
			  box-shadow: inset var(--window-border-size) var(--window-border-size) 0 var(--color-system-07), inset calc(var(--window-border-size) * -1) calc(var(--window-border-size) * -1) 0 var(--color-system-07);
			}
			.x::-webkit-scrollbar-track {
			  background-color: var(--color-system-04);
			  border: var(--window-border-size) solid var(--color-black);
			}
			.x::-webkit-scrollbar-track:vertical {
			  box-shadow: inset var(--window-border-size) var(--window-border-size) 0 var(--color-system-06), inset calc(var(--window-border-size) * -1) calc(var(--window-border-size) * 2) 0 var(--color-system-03), inset calc(var(--window-border-size) * 2) 0 0 rgba(0, 0, 0, 0.25), inset calc(var(--window-border-size) * -2) 0 0 rgba(255, 255, 255, 0.25);
			}
			.x::-webkit-scrollbar-track:horizontal {
			  box-shadow: inset var(--window-border-size) var(--window-border-size) 0 var(--color-system-06), inset calc(var(--window-border-size) * 2) calc(var(--window-border-size) * -1) 0 var(--color-system-03), inset calc(var(--window-border-size) * 2) 0 0 rgba(0, 0, 0, 0.25), inset calc(var(--window-border-size) * -2) 0 0 rgba(255, 255, 255, 0.25);
			}
			.x::-webkit-scrollbar-corner {
			  border-top: var(--window-border-size) solid var(--color-black);
			  border-left: var(--window-border-size) solid var(--color-black);
			  box-shadow: inset var(--window-border-size) var(--window-border-size) 0 var(--color-white);
			  background: var(--color-system-03);
			}"
		`));

	it("platinum-scrollbars-split-arrows compiles to its pinned output", () =>
		expect(
			scrollbarMixin("platinum-scrollbars-split-arrows"),
		).toMatchInlineSnapshot(`
			".x::-webkit-scrollbar-button:end:vertical:decrement, .x::-webkit-scrollbar-button:end:horizontal:decrement {
			  display: none;
			}
			.x::-webkit-scrollbar-button:start:vertical:decrement {
			  display: block;
			  width: var(--window-scrollbar-size);
			  height: var(--window-scrollbar-size);
			  background-color: var(--color-system-02);
			  border-left: var(--window-border-size) solid var(--color-black);
			  border-right: var(--window-border-size) solid var(--color-black);
			  border-bottom: var(--window-border-size) solid var(--color-black);
			  background: linear-gradient(transparent 75%, var(--color-black) 0) 50%/calc(var(--window-scrollbar-arrow-size) * 2) var(--window-scrollbar-arrow-size) no-repeat, linear-gradient(transparent 50%, var(--color-black) 0) 50%/calc(var(--window-scrollbar-arrow-size) * 1.5) var(--window-scrollbar-arrow-size) no-repeat, linear-gradient(transparent 25%, var(--color-black) 0) 50%/var(--window-scrollbar-arrow-size) var(--window-scrollbar-arrow-size) no-repeat, linear-gradient(var(--color-black) 50%, var(--color-black) 0) 50%/calc(var(--window-scrollbar-arrow-size) / 2) var(--window-scrollbar-arrow-size) no-repeat, var(--color-system-02);
			}
			.x::-webkit-scrollbar-button:start:vertical:decrement:active {
			  background: linear-gradient(transparent 75%, var(--color-black) 0) 50%/calc(var(--window-scrollbar-arrow-size) * 2) var(--window-scrollbar-arrow-size) no-repeat, linear-gradient(transparent 50%, var(--color-black) 0) 50%/calc(var(--window-scrollbar-arrow-size) * 1.5) var(--window-scrollbar-arrow-size) no-repeat, linear-gradient(transparent 25%, var(--color-black) 0) 50%/var(--window-scrollbar-arrow-size) var(--window-scrollbar-arrow-size) no-repeat, linear-gradient(var(--color-black) 50%, var(--color-black) 0) 50%/calc(var(--window-scrollbar-arrow-size) / 2) var(--window-scrollbar-arrow-size) no-repeat, var(--color-system-06);
			  box-shadow: inset var(--window-border-size) var(--window-border-size) 0 var(--color-system-07), inset calc(var(--window-border-size) * -1) calc(var(--window-border-size) * -1) 0 var(--color-system-07);
			}
			.x::-webkit-scrollbar-button:start:horizontal:decrement {
			  display: block;
			  width: var(--window-scrollbar-size);
			  height: var(--window-scrollbar-size);
			  background-color: var(--color-system-02);
			  border-top: var(--window-border-size) solid var(--color-black);
			  border-bottom: var(--window-border-size) solid var(--color-black);
			  border-right: var(--window-border-size) solid var(--color-black);
			  background: linear-gradient(90deg, transparent 75%, var(--color-black) 0) 50%/var(--window-scrollbar-arrow-size) calc(var(--window-scrollbar-arrow-size) * 2) no-repeat, linear-gradient(90deg, transparent 50%, var(--color-black) 0) 50%/var(--window-scrollbar-arrow-size) calc(var(--window-scrollbar-arrow-size) * 1.5) no-repeat, linear-gradient(90deg, transparent 25%, var(--color-black) 0) 50%/var(--window-scrollbar-arrow-size) var(--window-scrollbar-arrow-size) no-repeat, linear-gradient(var(--color-black) 50%, var(--color-black) 0) 50%/var(--window-scrollbar-arrow-size) calc(var(--window-scrollbar-arrow-size) / 2) no-repeat, var(--color-system-02);
			}
			.x::-webkit-scrollbar-button:start:horizontal:decrement:active {
			  background: linear-gradient(90deg, transparent 75%, var(--color-black) 0) 50%/var(--window-scrollbar-arrow-size) calc(var(--window-scrollbar-arrow-size) * 2) no-repeat, linear-gradient(90deg, transparent 50%, var(--color-black) 0) 50%/var(--window-scrollbar-arrow-size) calc(var(--window-scrollbar-arrow-size) * 1.5) no-repeat, linear-gradient(90deg, transparent 25%, var(--color-black) 0) 50%/var(--window-scrollbar-arrow-size) var(--window-scrollbar-arrow-size) no-repeat, linear-gradient(var(--color-black) 50%, var(--color-black) 0) 50%/var(--window-scrollbar-arrow-size) calc(var(--window-scrollbar-arrow-size) / 2) no-repeat, var(--color-system-06);
			  box-shadow: inset var(--window-border-size) var(--window-border-size) 0 var(--color-system-07), inset calc(var(--window-border-size) * -1) calc(var(--window-border-size) * -1) 0 var(--color-system-07);
			}"
		`));

	it("platinum-scrollbars-inactive compiles to its pinned output", () =>
		expect(
			scrollbarMixin("platinum-scrollbars-inactive"),
		).toMatchInlineSnapshot(`
			"@supports not selector(::-webkit-scrollbar) {
			  .x {
			    scrollbar-color: var(--color-system-04) var(--color-system-02);
			  }
			}
			.x::-webkit-scrollbar-button {
			  background: var(--color-system-02);
			  border: none;
			  box-shadow: none;
			  width: 0;
			  height: 0;
			}
			.x::-webkit-scrollbar-track {
			  background: var(--color-system-02);
			  border: var(--window-border-size) solid var(--color-system-06);
			}
			.x::-webkit-scrollbar-track:vertical {
			  box-shadow: none;
			}
			.x::-webkit-scrollbar-track:horizontal {
			  box-shadow: none;
			}
			.x::-webkit-scrollbar-corner {
			  border: none;
			  box-shadow: none;
			}
			.x::-webkit-scrollbar-thumb {
			  display: none;
			}"
		`));

	it("platinum-scrollbars-themed compiles to its pinned output", () =>
		expect(scrollbarMixin("platinum-scrollbars-themed")).toMatchInlineSnapshot(`
			".x::-webkit-scrollbar-thumb {
			  min-width: var(--window-control-size);
			  min-height: var(--window-control-size);
			  border: var(--window-border-size) solid var(--color-theme-07);
			  box-shadow: inset var(--window-border-size) var(--window-border-size) 0 var(--color-system-02), inset calc(var(--window-border-size) * -1) calc(var(--window-border-size) * -1) 0 var(--color-theme-04);
			}
			.x::-webkit-scrollbar-thumb:vertical {
			  background: linear-gradient(transparent 12.5%, var(--color-theme-05) 0, var(--color-theme-05) 25%, transparent 0, transparent 37.5%, var(--color-theme-05) 0, var(--color-theme-05) 50%, transparent 0, transparent 62.5%, var(--color-theme-05) 0, var(--color-theme-05) 75%, transparent 0, transparent 87.5%, var(--color-theme-05) 0) 50%/7px 8px no-repeat, linear-gradient(var(--color-theme-01) 12.5%, transparent 0, transparent 25%, var(--color-theme-01) 0, var(--color-theme-01) 37.5%, transparent 0, transparent 50%, var(--color-theme-01) 0, var(--color-theme-01) 62.5%, transparent 0, transparent 75%, var(--color-theme-01) 0, var(--color-theme-01) 87.5%, transparent 0) 49%/7px 8px no-repeat, var(--color-theme-03);
			}
			.x::-webkit-scrollbar-thumb:horizontal {
			  background: linear-gradient(90deg, transparent 12.5%, var(--color-theme-05) 0, var(--color-theme-05) 25%, transparent 0, transparent 37.5%, var(--color-theme-05) 0, var(--color-theme-05) 50%, transparent 0, transparent 62.5%, var(--color-theme-05) 0, var(--color-theme-05) 75%, transparent 0, transparent 87.5%, var(--color-theme-05) 0) 50%/8px 7px no-repeat, linear-gradient(90deg, var(--color-theme-01) 12.5%, transparent 0, transparent 25%, var(--color-theme-01) 0, var(--color-theme-01) 37.5%, transparent 0, transparent 50%, var(--color-theme-01) 0, var(--color-theme-01) 62.5%, transparent 0, transparent 75%, var(--color-theme-01) 0, var(--color-theme-01) 87.5%, transparent 0) center 49%/8px 7px no-repeat, var(--color-theme-03);
			}"
		`));

	// The mixins local to a component partial (the Control Strip bevels, the
	// slider thumb), which the `./appearance/platinum/scss/*` wildcard export
	// also exposes, pinned the same way. The Part B final review matched their
	// compiled declarations against the originals in ClassicyControlStrip.scss
	// and ClassicySlider.scss; the slider thumb is included with the normal
	// (raised) body gradient its first call site passes.
	const controlStripMixin = (name: string) =>
		include(`${STYLES}/components/ControlStrip`, name, "");

	it("platinum-control-strip-bevel-raised compiles to its pinned output", () =>
		expect(
			controlStripMixin("platinum-control-strip-bevel-raised"),
		).toMatchInlineSnapshot(`
			".x {
			  background: linear-gradient(var(--color-white), var(--color-white)) 1px 1px/calc(100% - 3px) 1px no-repeat, linear-gradient(var(--color-white), var(--color-white)) 1px 1px/1px calc(100% - 3px) no-repeat, linear-gradient(var(--color-system-04), var(--color-system-04)) calc(100% - 1px) 2px/1px calc(100% - 4px) no-repeat, linear-gradient(var(--color-system-04), var(--color-system-04)) 2px calc(100% - 1px)/calc(100% - 3px) 1px no-repeat, linear-gradient(var(--color-system-05), var(--color-system-05)) 100% 1px/1px calc(100% - 1px) no-repeat, linear-gradient(var(--color-system-05), var(--color-system-05)) 1px 100%/calc(100% - 1px) 1px no-repeat, var(--color-system-03);
			}"
		`));

	it("platinum-control-strip-bevel-recessed compiles to its pinned output", () =>
		expect(
			controlStripMixin("platinum-control-strip-bevel-recessed"),
		).toMatchInlineSnapshot(`
			".x {
			  background: linear-gradient(var(--color-system-05), var(--color-system-05)) 0 0/1px calc(100% - 1px) no-repeat, linear-gradient(var(--color-system-05), var(--color-system-05)) 0 0/calc(100% - 1px) 1px no-repeat, linear-gradient(var(--color-white), var(--color-white)) 100% 1px/1px calc(100% - 1px) no-repeat, linear-gradient(var(--color-white), var(--color-white)) 1px 100%/calc(100% - 1px) 1px no-repeat, var(--color-system-03);
			}"
		`));

	it("platinum-control-strip-bevel-pressed compiles to its pinned output", () =>
		expect(
			controlStripMixin("platinum-control-strip-bevel-pressed"),
		).toMatchInlineSnapshot(`
			".x {
			  background: linear-gradient(var(--color-system-06), var(--color-system-06)) 0 0/calc(100% - 1px) 1px no-repeat, linear-gradient(var(--color-system-06), var(--color-system-06)) 0 1px/calc(100% - 2px) 1px no-repeat, linear-gradient(var(--color-system-06), var(--color-system-06)) 0 0/1px calc(100% - 1px) no-repeat, linear-gradient(var(--color-system-06), var(--color-system-06)) 1px 0/1px calc(100% - 2px) no-repeat, linear-gradient(var(--color-system-03), var(--color-system-03)) 100% 1px/1px calc(100% - 1px) no-repeat, linear-gradient(var(--color-system-03), var(--color-system-03)) calc(100% - 1px) 1px/1px calc(100% - 1px) no-repeat, linear-gradient(var(--color-system-03), var(--color-system-03)) 1px calc(100% - 1px)/calc(100% - 1px) 1px no-repeat, linear-gradient(var(--color-system-03), var(--color-system-03)) 1px 100%/calc(100% - 1px) 1px no-repeat, var(--color-system-05);
			}"
		`));

	it("platinum-slider-thumb compiles to its pinned output", () =>
		expect(
			include(
				`${STYLES}/components/Slider`,
				"platinum-slider-thumb",
				"(linear-gradient(to bottom, var(--color-system-01), var(--color-system-04)))",
			),
		).toMatchInlineSnapshot(`
			".x {
			  clip-path: polygon(9% 2%, 92% 2%, 92% 56.6%, 50% 95%, 9% 56.6%);
			  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 21 21'%3E%3Cpolygon points='0,0 21,0 21,13.02 10.5,21 0,13.02' fill='none' stroke='black' stroke-width='4'/%3E%3C/svg%3E") 0 0/100% 100% no-repeat, url("../../../../../assets/img/ui/slider-strikes.svg") center 30%/45% 35% no-repeat, linear-gradient(to bottom, var(--color-system-01), var(--color-system-04));
			}"
		`));

	// The value 4.1 pinned against the original encode-color.
	it("platinum-encode-color percent-encodes a color for a data URI", () =>
		expect(
			compileString(
				`@use "${STYLES}/mixins" as m;\n.x { content: m.platinum-encode-color(#336699); }`,
				LOAD,
			).css,
		).toBe('.x {\n  content: "%23336699";\n}'));
});
