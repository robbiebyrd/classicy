import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { scanPixelLiteralsInSource } from "../../../../bin/check-pixel-literals.ts";

// The pixel-matched surfaces read their knob families (measurements.<family>,
// platinum.json) instead of pixel literals: the Platinum menu frame
// (menuFrame), the scroll bar thumb's grip tile (scrollbar) and the pop-up
// slider (popUpSlider).
//
// The pop-up slider's focus ring keeps its `1px` / `-1px` until H 3.1's
// `--focus-ring-width` derivation is in the same tree; those two are the
// only literals it may still hold.
const ROOT = resolve(__dirname, "../../../..");

describe("pixel-matched surfaces", () => {
	it.each([
		["src/Appearance/Platinum/styles/_mixins.scss", []],
		["src/Appearance/Platinum/styles/_scrollbars.scss", []],
		[
			"src/SystemFolder/SystemResources/PopUpSlider/ClassicyPopUpSlider.scss",
			["1px", "-1px"],
		],
	])("%s: no bare literal", (file, allowed) =>
		expect(
			scanPixelLiteralsInSource(readFileSync(resolve(ROOT, file), "utf8"), file)
				.filter((literal) => literal.kind === "bare")
				.map((literal) => literal.text),
		).toEqual(allowed));
});
