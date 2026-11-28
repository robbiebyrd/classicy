import { afterEach, describe, expect, it } from "vitest";
import { CLASSICY_DEFAULT_APPEARANCE_LAYOUT } from "@/Appearance/ClassicyAppearanceDefaults";
import {
	classicyTrailingSpaceEnd,
	classicyWordSelectTakesSpace,
	extendClassicyWordSelection,
} from "@/SystemFolder/SystemResources/App/ClassicyWordSelect.internal";
import windows98 from "../../../../packages/appearance/windows98/src/windows98.json";

// The remaining chapters' audit's 5.19 (WIG Ch.5 "Selection Shortcuts",
// p.44): a double-click selects the word and the space after it, never
// punctuation.
describe("classicyTrailingSpaceEnd", () => {
	it("takes the spaces and no-break spaces after the word", () => {
		expect(classicyTrailingSpaceEnd("hello world", 5)).toBe(6);
		expect(classicyTrailingSpaceEnd("hello   world", 5)).toBe(8);
		expect(classicyTrailingSpaceEnd("hello  world", 5)).toBe(7);
	});

	it("stops at punctuation, a line break, a tab and the text's end", () => {
		expect(classicyTrailingSpaceEnd("hello, world", 5)).toBe(5);
		expect(classicyTrailingSpaceEnd("hello\nworld", 5)).toBe(5);
		expect(classicyTrailingSpaceEnd("hello\r\nworld", 5)).toBe(5);
		expect(classicyTrailingSpaceEnd("hello\tworld", 5)).toBe(5);
		expect(classicyTrailingSpaceEnd("hello", 5)).toBe(5);
		expect(classicyTrailingSpaceEnd("hello ", 9)).toBe(6);
	});
});

describe("extendClassicyWordSelection", () => {
	afterEach(() => {
		document.body.innerHTML = "";
	});

	const field = (value: string, start: number, end: number) => {
		const input = document.createElement("input");
		input.value = value;
		document.body.appendChild(input);
		input.setSelectionRange(start, end);
		return input;
	};

	it("extends a word's selection forward over the spaces after it", () => {
		const input = field("one two  three", 4, 7);
		expect(extendClassicyWordSelection(input)).toBe(true);
		expect([input.selectionStart, input.selectionEnd]).toEqual([4, 9]);
		expect(input.selectionDirection).toBe("forward");
	});

	it("leaves a word before punctuation, an empty selection and a number field alone", () => {
		const comma = field("one, two", 0, 3);
		expect(extendClassicyWordSelection(comma)).toBe(false);
		expect([comma.selectionStart, comma.selectionEnd]).toEqual([0, 3]);
		const caret = field("one two", 3, 3);
		expect(extendClassicyWordSelection(caret)).toBe(false);
		expect(caret.selectionEnd).toBe(3);
		const number = document.createElement("input");
		number.type = "number";
		number.value = "12";
		document.body.appendChild(number);
		expect(extendClassicyWordSelection(number)).toBe(false);
	});

	it("extends a textarea's word, never past a line break", () => {
		const area = document.createElement("textarea");
		area.value = "one two \nthree";
		document.body.appendChild(area);
		area.setSelectionRange(4, 7);
		expect(extendClassicyWordSelection(area)).toBe(true);
		expect(area.selectionEnd).toBe(8);
	});
});

describe("classicyWordSelectTakesSpace", () => {
	it("is Windows 98's, not the default layout's", () => {
		expect(classicyWordSelectTakesSpace(windows98.layout as never)).toBe(true);
		expect(
			classicyWordSelectTakesSpace(CLASSICY_DEFAULT_APPEARANCE_LAYOUT),
		).toBe(false);
		expect(
			classicyWordSelectTakesSpace({ text: { wordSelect: "native" } }),
		).toBe(false);
	});
});
