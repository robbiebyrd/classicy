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
	"list-style",
	"appearance",
	"-webkit-appearance",
	"-moz-appearance",
]);

// Visibility, not a look: the radio's mark is hidden until it is checked.
const KEPT = new Set(["opacity:0", "opacity:1"]);

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

/** The declarations that are neither structural nor a named exception. */
const nonStructural = (css: string): string[] =>
	declarations(css).filter((d) => {
		const prop = d.slice(0, d.indexOf(":")).trim();
		if (prop.startsWith("--")) return false;
		return !STRUCTURAL.has(prop) && !KEPT.has(d.replace(/\s*:\s*/, ":").trim());
	});

const compile = (file: string): string =>
	sass.compile(path.resolve(process.cwd(), "src/SystemFolder", file), {
		style: "expanded",
	}).css;

describe("base control sheets hold only structure", () => {
	for (const file of FILES) {
		it(file, () => {
			expect(nonStructural(compile(file))).toEqual([]);
		});
	}

	it("catches a look property added to a base sheet (mutant)", () => {
		const css = `${compile(FILES[0])}\n.classicyRadioInput { border-bottom-color: red; }`;
		expect(nonStructural(css)).toEqual(["border-bottom-color: red"]);
		const css2 = `${compile(FILES[3])}\n.classicyInput{filter:blur(1px);/* c */}`;
		expect(nonStructural(css2)).toEqual(["filter:blur(1px)"]);
	});

	it("keeps the visibility exceptions robust to whitespace", () => {
		expect(nonStructural(".a{ opacity :  0 ; }")).toEqual([]);
		expect(nonStructural(".a{opacity:.5}")).toEqual(["opacity:.5"]);
	});
});
