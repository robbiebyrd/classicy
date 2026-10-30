import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { scanPixelLiteralsInSource } from "../../../bin/check-pixel-literals.ts";

// Part H 5.1: the app surfaces (HyperCard, Finder, Apple Guide and the Color
// Picker) read their sizes from theme variables, core tokens or their own
// measurement family's knobs, never a bare pixel literal.
describe("app surface sheets", () => {
	it.each([
		"src/SystemFolder/HyperCard/HyperCard.scss",
		"src/SystemFolder/Finder/FinderAboutThisComputer.scss",
		"src/SystemFolder/Finder/FinderPreferences.scss",
		"src/SystemFolder/Extensions/AppleGuide/AppleGuide.scss",
		"src/SystemFolder/SystemResources/ColorPicker/ClassicyColorPicker.scss",
	])("%s has no bare pixel literal", (f) =>
		expect(
			scanPixelLiteralsInSource(readFileSync(f, "utf8"), f)
				.filter((l) => l.kind === "bare")
				.map((l) => `${l.line}:${l.text}`),
		).toEqual([]));
});
