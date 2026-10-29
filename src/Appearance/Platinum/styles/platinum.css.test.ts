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
	// scroller re-asserts it there, after the desktop rule, at equal
	// specificity.
	it("hides the tab scroller's scrollbar after the desktop scrollbar fallback", () => {
		const supports = flat.lastIndexOf(
			"@supports not selector(::-webkit-scrollbar)",
		);
		const fallback = flat.indexOf(`, ${P} * {`, supports);
		expect(fallback).toBeGreaterThan(-1);
		const tabs = rule(`${P} .classicyTabScroller`);
		expect(tabs.props["scrollbar-width"]).toBe("none");
		expect(tabs.at).toBeGreaterThan(fallback);
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
