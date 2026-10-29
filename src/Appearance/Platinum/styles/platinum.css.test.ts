import { readFileSync } from "node:fs";
import { compile, compileString } from "sass";
import { describe, expect, it } from "vitest";
import { isSingleClassicyLayerBlock } from "../../../../bin/classicyPackageCss";
import { CLASSICY_LAYER_ORDER } from "../../../../bin/classicyStyleInjector";

// Under src/, the Sass load path.
const STYLES = "Appearance/Platinum/styles";
// The originals stay in place until 4.3 re-points the last component sheet
// (ruling R7); the equivalence tests below are deleted with them.
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
		).toMatch(/^url\(/);
		expect(flat).toContain(
			`${P} :where(.classicyWindow).active .classicyWindowTitleBar .classicyWindowTitle .classicyWindowTitleCenter {`,
		);
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
		// P3, P4: utility stripes off; longhands after their shorthand.
		const group = (prefix: string, a: string, b: string) =>
			`${prefix} ${a}, ${prefix} ${b}`;
		const utility = `${P} .classicyWindow.classicyWindowUtility .classicyWindowTitleBar .classicyWindowTitle`;
		expect(
			rule(
				group(utility, ".classicyWindowTitleLeft", ".classicyWindowTitleRight"),
			).props.background,
		).toBe("none");
		expect(
			rule(`${utility} .classicyWindowTitleCenter`).props["background-size"],
		).toBe("4px 3px");
		const active = `${P} :where(.classicyWindow).active .classicyWindowTitleBar .classicyWindowTitle`;
		expect(
			rule(
				group(active, ".classicyWindowTitleLeft", ".classicyWindowTitleRight"),
			).props["background-size"],
		).toBe("auto 99.8%");
		expect(
			rule(
				`${P} .classicyWindowRed .classicyWindowTitleBar .classicyWindowTitle .classicyWindowTitleCenter`,
			).props["background-size"],
		).toBe("auto 100%");
		expect(
			rule(
				`${P} .classicyWindow:has(.classicyAlertMovable) .classicyWindowTitleBar .classicyWindowTitle .classicyWindowTitleCenter`,
			).props["background-size"],
		).toBe("auto 100%");
		expect(
			rule(`${P} .classicyWindowFrameTitleBar`).props["background-size"],
		).toBe("auto 100%");
		// The control boxes' glyphs sit top left, over the mixin's centering,
		// and the utility boxes keep their smaller size and glyph offset.
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
			expect(own.props["background-position"]).toBe("top left");
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

describe("4.3a: the push button, bevel pop-up panel, checkbox, placard, table, drive list, meter, output, progress bar and split view looks", () => {
	const css = compile(`src/${STYLES}/platinum.scss`, LOAD).css;
	const P = ".classicyDesktop[data-classicy-appearance=platinum]";
	// One selector list per line, unindented (as in the block above).
	const flat = css.replace(/,\s*\n\s*/g, ", ").replace(/\n\s+/g, "\n");
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
		expect(rules(".classicyButtonKeyActive").props["box-shadow"]).toBeDefined();
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
		expect(declared("_assets.scss")).toEqual([]);
		for (const file of ["_mixins.scss", "_scrollbars.scss", "_assets.scss"])
			expect(read(`${STYLES}/${file}`)).not.toMatch(
				/platinum[A-Z]|\bsb-(?:glyph|btn)|theme-halftone|[^-]encode-color|[^-]px-rect|[^-]no-select/,
			);
	});

	it("_assets.scss is assets.scss verbatim", () =>
		expect(read(`${STYLES}/_assets.scss`)).toBe(
			read(`${ORIGINALS}/assets.scss`),
		));

	// [renamed, original, arguments]: every mixin compiles to exactly the CSS
	// its original does. Sass evaluates a mixin body only when it is included,
	// so this is what proves the copied bodies (and layout.classicy-px-rect)
	// resolve; platinum.scss includes none of them yet.
	const MIXINS: [string, string, string][] = [
		["platinum-menu-frame", "platinumMenuFrame", ""],
		["platinum-menu-divider", "platinumMenuDivider", ""],
		["platinum-window-box-shadow", "platinumWindowBoxShadow", ""],
		["platinum-box-shadow", "platinumBoxShadow", ""],
		["platinum-window-border", "platinumWindowBorder", ""],
		["platinum-window-header-border", "platinumWindowHeaderBorder", ""],
		[
			"platinum-window-header-border-depressed",
			"platinumWindowHeaderBorderDepressed",
			"",
		],
		["platinum-window-inner-box-shadow", "platinumWindowInnerBoxShadow", ""],
		[
			"platinum-window-inner-box-shadow-outer",
			"platinumWindowInnerBoxShadowOuter",
			"",
		],
		["platinum-window-inner-border", "platinumWindowInnerBorder", ""],
		[
			"platinum-window-control-box-border",
			"platinumWindowControlBoxBorder",
			"",
		],
		["platinum-window-control-box", "platinumWindowControlBox", ""],
		[
			"platinum-window-control-box-depressable",
			"platinumWindowControlBoxDepressable",
			"",
		],
		["platinum-window-undepressable", "platinumWindowUndepressable", ""],
		["platinum-window-depressable", "platinumWindowDepressable", ""],
		["platinum-window-depressed", "platinumWindowDepressed", ""],
		["platinum-depressable-default", "platinumDepressableDefault", ""],
		[
			"platinum-depressable-box-shadow-active",
			"platinumDepressableBoxShadowActive",
			"",
		],
		["platinum-halftone", "theme-halftone", "(#c0c0c0, 10%)"],
	];
	const SCROLLBAR_MIXINS: [string, string, string][] = [
		["platinum-scrollbar-glyph-up", "sb-glyph-up", "(var(--color-system-02))"],
		["platinum-scrollbar-glyph-down", "sb-glyph-down", "(white)"],
		["platinum-scrollbar-glyph-left", "sb-glyph-left", "(white)"],
		["platinum-scrollbar-glyph-right", "sb-glyph-right", "(white)"],
		["platinum-scrollbar-button-box", "sb-btn-box", ""],
		["platinum-scrollbar-button-pressed", "sb-btn-pressed", ""],
		["platinum-scrollbars", "scrollbars", ""],
		["platinum-scrollbars-split-arrows", "scrollbars-split-arrows", ""],
		["platinum-scrollbars-inactive", "scrollbars-inactive", ""],
		["platinum-scrollbars-themed", "scrollbars-themed", ""],
	];
	const include = (use: string, name: string, args: string) =>
		compileString(
			`@use "${use}" as m;\n.x { @include m.${name}${args}; }`,
			LOAD,
		).css;

	it.each(MIXINS)("%s compiles exactly as %s", (renamed, original, args) => {
		const after = include(`${STYLES}/mixins`, renamed, args);
		expect(after.length).toBeGreaterThan(0);
		expect(after).toBe(include(`${ORIGINALS}/appearance`, original, args));
	});

	it.each(
		SCROLLBAR_MIXINS,
	)("%s compiles exactly as %s", (renamed, original, args) => {
		const after = include(`${STYLES}/scrollbars`, renamed, args);
		expect(after.length).toBeGreaterThan(0);
		expect(after).toBe(include(`${ORIGINALS}/scrollbars`, original, args));
	});

	it("platinum-encode-color returns what encode-color does", () => {
		const call = (use: string, fn: string) =>
			compileString(
				`@use "${use}" as m;\n.x { content: m.${fn}(#336699); }`,
				LOAD,
			).css;
		expect(call(`${STYLES}/mixins`, "platinum-encode-color")).toBe(
			call(`${ORIGINALS}/appearance`, "encode-color"),
		);
	});
});
