import { describe, expect, it } from "vitest";
import {
	compareClassicyArtNames,
	isClassicyArtName,
} from "./classicyDistAssets";

describe("isClassicyArtName", () => {
	it("takes .svg and .png files only", () =>
		expect(
			[
				"zoom.svg",
				"sad-mac.png",
				"charcoal.woff2",
				"README.md",
				"x.svg.map",
			].filter(isClassicyArtName),
		).toEqual(["zoom.svg", "sad-mac.png"]));
});

describe("compareClassicyArtNames", () => {
	it("finds nothing when dist ships exactly the source art", () =>
		expect(
			compareClassicyArtNames(
				["zoom.svg", "sad-mac.png"],
				["sad-mac.png", "zoom.svg", "charcoal.woff2"],
			),
		).toEqual({ missing: [], extra: [] }));

	it("names source art that dist/assets lacks", () =>
		expect(
			compareClassicyArtNames(
				["zoom.svg", "sad-mac.png", "collapse.svg"],
				["zoom.svg"],
			),
		).toEqual({ missing: ["collapse.svg", "sad-mac.png"], extra: [] }));

	it("names art in dist/assets that has no source", () =>
		expect(
			compareClassicyArtNames(
				["zoom.svg"],
				["zoom.svg", "stray.png", "old-art.svg"],
			),
		).toEqual({ missing: [], extra: ["old-art.svg", "stray.png"] }));

	it("ignores non-art files on either side", () =>
		expect(
			compareClassicyArtNames(
				["zoom.svg", "notes.txt"],
				["zoom.svg", "charcoal.woff2"],
			),
		).toEqual({ missing: [], extra: [] }));
});
