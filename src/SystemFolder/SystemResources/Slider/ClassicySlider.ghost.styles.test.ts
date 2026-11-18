import { describe, expect, it } from "vitest";
import { compileScss, scssRule } from "@/__tests__/compiledCss";

// The ghost indicator's place in the base sheet (story 0198-0kv, fix round
// 1): its box's edge along a horizontal track by `left` and up a vertical
// one by `bottom`, at the thumb's travel rounded to a whole pixel, so its
// center lies where the native thumb's does for its value; centered across
// a vertical track in layout. No translation: Chromium paints a layout
// offset and a transform separately and resamples between them, so a
// translated box on a half pixel blurs; only the quarter and half turns
// remain, which are exact on whole pixels.
const css = compileScss(
	"src/SystemFolder/SystemResources/Slider/ClassicySlider.scss",
);
const rule = (selector: string) => scssRule(css, selector);

describe("ClassicySlider's ghost placement", () => {
	it("travels a horizontal track by whole pixels, untranslated", () => {
		const ghost = rule(".classicySliderGhost");
		expect(ghost.left).toBe(
			"round((100% - var(--slider-thumb-width)) * var(--classicy-ghost-pos, 0), var(--window-border-size))",
		);
		expect(ghost.top).toBe("0");
		expect(ghost.transform).toBeUndefined();
		for (const [direction, turn] of [
			["Up", "180deg"],
			["Left", "90deg"],
			["Right", "-90deg"],
		])
			expect(
				rule(`.classicySliderGhost.classicySliderIndicator${direction}`)
					.transform,
			).toBe(`rotate(${turn})`);
	});

	it("travels up a vertical track by whole pixels, centered across it in layout", () => {
		const ghost = rule(".classicySliderStackVertical .classicySliderGhost");
		expect(ghost.top).toBe("auto");
		expect(ghost.left).toBe("calc(50% - var(--slider-thumb-width) / 2)");
		expect(ghost.bottom).toBe(
			"round((100% - var(--slider-thumb-height)) * var(--classicy-ghost-pos, 0), var(--window-border-size))",
		);
		expect(ghost["margin-top"]).toBe("0");
		expect(ghost.transform).toBe("none");
		for (const [direction, turn] of [
			["Up", "180deg"],
			["Left", "90deg"],
			["Right", "-90deg"],
		])
			expect(
				rule(
					`.classicySliderStackVertical .classicySliderGhost.classicySliderIndicator${direction}`,
				).transform,
			).toBe(`rotate(${turn})`);
	});
});
