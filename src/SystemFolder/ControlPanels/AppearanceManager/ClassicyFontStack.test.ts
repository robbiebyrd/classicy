import { describe, expect, it } from "vitest";
import {
	parseFontStack,
	primaryFontFamily,
	withPrimaryFontFamily,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyFontStack";

describe("parseFontStack", () => {
	it("splits a quoted stack and flags generic families", () => {
		expect(parseFontStack('"Charcoal", "ChicagoFLF", sans-serif')).toEqual([
			{ name: "Charcoal", generic: false },
			{ name: "ChicagoFLF", generic: false },
			{ name: "sans-serif", generic: true },
		]);
	});

	it("keeps a comma inside a quoted name", () => {
		expect(parseFontStack('"Odd, Font", serif')).toEqual([
			{ name: "Odd, Font", generic: false },
			{ name: "serif", generic: true },
		]);
	});

	it("treats a quoted generic keyword as a named family", () => {
		expect(parseFontStack('"serif"')).toEqual([
			{ name: "serif", generic: false },
		]);
	});

	it("drops empty entries", () => {
		expect(parseFontStack(" , Monaco,, ")).toEqual([
			{ name: "Monaco", generic: false },
		]);
	});
});

describe("primaryFontFamily", () => {
	it.each([
		['"Charcoal", "ChicagoFLF", "Geneva", sans-serif', "Charcoal"],
		['"ChicagoFLF", "Charcoal", "Geneva", sans-serif', "ChicagoFLF"],
		['"AppleGaramond", serif', "AppleGaramond"],
		['"Geneva", serif', "Geneva"],
		["Monaco", "Monaco"],
		["VCR OSD Mono", "VCR OSD Mono"],
		["'Single Quoted', monospace", "Single Quoted"],
		["", ""],
	])("%j → %j", (stack, family) => {
		expect(primaryFontFamily(stack)).toBe(family);
	});
});

describe("withPrimaryFontFamily", () => {
	it("puts the chosen family first and keeps the other fallbacks", () => {
		expect(
			withPrimaryFontFamily(
				'"Charcoal", "ChicagoFLF", "Geneva", sans-serif',
				"Geneva",
			),
		).toBe('"Geneva", "Charcoal", "ChicagoFLF", sans-serif');
	});

	it("adds a family that was not in the stack", () => {
		expect(withPrimaryFontFamily('"AppleGaramond", serif', "Monaco")).toBe(
			'"Monaco", "AppleGaramond", serif',
		);
	});

	it("de-duplicates case-insensitively", () => {
		expect(withPrimaryFontFamily('"geneva", "Charcoal", serif', "Geneva")).toBe(
			'"Geneva", "Charcoal", serif',
		);
	});

	it("moves generic families to the end", () => {
		expect(withPrimaryFontFamily('sans-serif, "Charcoal"', "Geneva")).toBe(
			'"Geneva", "Charcoal", sans-serif',
		);
	});

	it("quotes multi-word names from a bare stack", () => {
		expect(withPrimaryFontFamily("Monaco", "VCR OSD Mono")).toBe(
			'"VCR OSD Mono", "Monaco"',
		);
	});

	it("is a no-op when the chosen family is already primary", () => {
		const stack = '"Charcoal", "ChicagoFLF", "Geneva", sans-serif';
		expect(withPrimaryFontFamily(stack, "Charcoal")).toBe(stack);
	});

	it("round-trips through primaryFontFamily", () => {
		const stack = withPrimaryFontFamily('"Geneva", serif', "AppleGaramond");
		expect(primaryFontFamily(stack)).toBe("AppleGaramond");
	});

	it("handles an empty current stack", () => {
		expect(withPrimaryFontFamily("", "Geneva")).toBe('"Geneva"');
	});
});
