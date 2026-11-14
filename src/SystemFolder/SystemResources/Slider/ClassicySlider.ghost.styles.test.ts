import { describe, expect, it } from "vitest";
import { compileScss, scssRule } from "@/__tests__/compiledCss";

// The ghost indicator's place in the base sheet (story 0198-0kv): along a
// horizontal track by `left` and up a vertical one by `bottom`, its center
// where the native thumb's lies for its value, the thumb's travel rounded
// to a whole pixel so its pixel art is drawn sharp, not resampled.
const css = compileScss(
	"src/SystemFolder/SystemResources/Slider/ClassicySlider.scss",
);
const rule = (selector: string) => scssRule(css, selector);

describe("ClassicySlider's ghost placement", () => {
	it("travels a horizontal track by whole pixels", () => {
		const ghost = rule(".classicySliderGhost");
		expect(ghost.left).toBe(
			"calc(var(--slider-thumb-width) / 2 + round((100% - var(--slider-thumb-width)) * var(--classicy-ghost-pos, 0), var(--window-border-size)))",
		);
		expect(ghost.top).toBe("0");
		expect(ghost.transform).toBe("translateX(-50%)");
	});

	it("travels up a vertical track by whole pixels, centered across it", () => {
		const ghost = rule(".classicySliderStackVertical .classicySliderGhost");
		expect(ghost.top).toBe("auto");
		expect(ghost.left).toBe("50%");
		expect(ghost.bottom).toBe(
			"calc(calc(var(--slider-thumb-height) / 2) + round((100% - var(--slider-thumb-height)) * var(--classicy-ghost-pos, 0), var(--window-border-size)))",
		);
		expect(ghost["margin-top"]).toBe("0");
		expect(ghost.transform).toBe("translate(-50%, 50%)");
		for (const [direction, turn] of [
			["Up", "180deg"],
			["Left", "90deg"],
			["Right", "-90deg"],
		])
			expect(
				rule(
					`.classicySliderStackVertical .classicySliderGhost.classicySliderIndicator${direction}`,
				).transform,
			).toBe(`translate(-50%, 50%) rotate(${turn})`);
	});
});
