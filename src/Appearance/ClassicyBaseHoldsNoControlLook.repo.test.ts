import path from "node:path";
import * as sass from "sass";
import { describe, expect, it } from "vitest";

/**
 * Base SCSS is structure only (CLAUDE.md, "Theming"): the looks of these
 * controls live in Platinum's partials, so a second package never has to fight
 * them. Each compiled base sheet may declare only the structural properties
 * below (an allow-list: any other property, a new look property included,
 * fails), plus the few named exceptions in `KEPT`.
 */

const STRUCTURAL = new Set([
	// box model and sizes
	"box-sizing",
	"width",
	"aspect-ratio",
	"min-width",
	"max-width",
	"height",
	"min-height",
	"max-height",
	"margin",
	"margin-top",
	"margin-right",
	"margin-bottom",
	"margin-left",
	"padding",
	"padding-top",
	"padding-right",
	"padding-bottom",
	"padding-left",
	"border-width",
	"border-left-width",
	"border-right-width",
	"border-top-width",
	"border-bottom-width",
	// layout
	"display",
	"position",
	"top",
	"right",
	"bottom",
	"left",
	"order",
	"overflow",
	"overflow-x",
	"overflow-y",
	"flex",
	"flex-direction",
	"flex-grow",
	"flex-shrink",
	"flex-basis",
	"flex-wrap",
	"align-items",
	"align-self",
	"justify-content",
	"gap",
	"column-gap",
	"row-gap",
	"grid-template-columns",
	"grid-column",
	"object-fit",
	"transform",
	"white-space",
	"text-align",
	"text-overflow",
	"line-height",
	// typography and interaction (the theme's fonts, not a package look)
	"font-family",
	"font-size",
	"cursor",
	"pointer-events",
	"user-select",
	"-webkit-user-select",
	"overscroll-behavior",
	// a vertical slider's axis
	"writing-mode",
	"direction",
	"list-style",
	"appearance",
	"-webkit-appearance",
	"-moz-appearance",
]);

// Visibility, not a look: the radio's mark is hidden until it is checked.
const KEPT = new Set(["opacity:0", "opacity:1"]);

// Exceptions that hold in one sheet only, so they never excuse the same
// declaration in another.
const KEPT_BY_FILE: Record<string, ReadonlySet<string>> = {
	"SystemResources/PopUpMenu/ClassicyPopUpMenu.scss": new Set([
		// The pop-up's native button chrome taken away (it draws nothing): the
		// package paints the box around it.
		"font:inherit",
		"color:inherit",
		"background:transparent",
		"border:0",
		// Behavior: a menu scrolls by its indicators, never by a scroll bar.
		"scrollbar-width:none",
	]),
	"SystemResources/Slider/ClassicySlider.scss": new Set([
		// The native range input's chrome taken away (it draws nothing): its
		// face, its focus outline, and Firefox's thumb border and 0.5em corner
		// radius (which would clip a package's pixel-art thumb round). The
		// package draws the channel and the thumb.
		"background:transparent",
		"outline:none",
		"border:none",
		"border-radius:0",
		// Behavior: the track layer (the thumb's) paints above the tick rail
		// beside it, in a stacking context kept inside the slider's stack.
		"z-index:1",
		"isolation:isolate",
	]),
};

const FILES = [
	"SystemResources/RadioInput/ClassicyRadioInput.scss",
	"SystemResources/Checkbox/ClassicyCheckbox.scss",
	"SystemResources/LittleArrows/ClassicyLittleArrows.scss",
	"SystemResources/Input/ClassicyInput.scss",
	"SystemResources/ListBox/ClassicyListBox.scss",
	"SystemResources/Tree/ClassicyTree.scss",
	"SystemResources/Spinner/ClassicySpinner.scss",
	"SystemResources/DatePicker/ClassicyDatePicker.scss",
	"SystemResources/TimePicker/ClassicyTimePicker.scss",
	"SystemResources/ComboBox/ClassicyComboBox.scss",
	"SystemResources/ControlGroup/ClassicyControlGroup.scss",
	"SystemResources/PopUpMenu/ClassicyPopUpMenu.scss",
	"SystemResources/Slider/ClassicySlider.scss",
];

/** Every `prop: value` declaration of compiled CSS, comments removed. */
const declarations = (css: string): string[] =>
	css
		.replace(/\/\*[\s\S]*?\*\//g, "")
		.split(/[;{}]/)
		.map((d) => d.trim())
		.filter((d) => /^[-\w]+\s*:/.test(d) && !d.includes("::"))
		.filter((d) => !/^[^:]*[.#[&]/.test(d))
		.map((d) => d.replace(/\s+/g, " "));

/**
 * The declarations that are neither structural nor a named exception, the
 * global ones or `file`'s own.
 */
const nonStructural = (css: string, file?: string): string[] =>
	declarations(css).filter((d) => {
		const prop = d.slice(0, d.indexOf(":")).trim();
		if (prop.startsWith("--")) return false;
		const kept = d.replace(/\s*:\s*/, ":").trim();
		return (
			!STRUCTURAL.has(prop) &&
			!KEPT.has(kept) &&
			!(file !== undefined && KEPT_BY_FILE[file]?.has(kept))
		);
	});

const compile = (file: string): string =>
	sass.compile(path.resolve(process.cwd(), "src/SystemFolder", file), {
		style: "expanded",
	}).css;

describe("base control sheets hold only structure", () => {
	for (const file of FILES) {
		it(file, () => {
			expect(nonStructural(compile(file), file)).toEqual([]);
		});
	}

	it("catches a look property added to a base sheet (mutant)", () => {
		const css = `${compile(FILES[0])}\n.classicyRadioInput { border-bottom-color: red; }`;
		expect(nonStructural(css)).toEqual(["border-bottom-color: red"]);
		const css2 = `${compile(FILES[3])}\n.classicyInput{filter:blur(1px);/* c */}`;
		expect(nonStructural(css2)).toEqual(["filter:blur(1px)"]);
	});

	it("excuses a sheet's own exceptions in that sheet only", () => {
		const reset = ".a{color: inherit;border:0;scrollbar-width:none}";
		const popUp = "SystemResources/PopUpMenu/ClassicyPopUpMenu.scss";
		expect(nonStructural(reset, popUp)).toEqual([]);
		expect(nonStructural(reset, FILES[3])).toEqual([
			"color: inherit",
			"border:0",
			"scrollbar-width:none",
		]);
		expect(nonStructural(reset)).toHaveLength(3);
	});

	it("keeps the visibility exceptions robust to whitespace", () => {
		expect(nonStructural(".a{ opacity :  0 ; }")).toEqual([]);
		expect(nonStructural(".a{opacity:.5}")).toEqual(["opacity:.5"]);
	});
});
