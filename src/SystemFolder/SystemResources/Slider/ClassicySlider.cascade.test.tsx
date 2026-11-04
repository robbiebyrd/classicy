import { describe, expect, it } from "vitest";
import { render } from "@/__tests__/test-utils";
import { classicyCascadeWinner } from "@/Appearance/__tests__/classicyCascadeWinner";
import { ClassicySlider } from "@/SystemFolder/SystemResources/Slider/ClassicySlider";

// The value readout carries its labelSize class (sizeClassMap in
// ClassicySlider.tsx), so it is drawn at the label's size. It used to be the
// small size whatever labelSize said: ClassicySlider.scss set its own
// font-size at the same specificity as the size classes and came later in
// dist/classicy.css.
const SHEETS = [
	"src/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel.scss",
	"src/SystemFolder/SystemResources/Slider/ClassicySlider.scss",
];

describe("ClassicySlider value readout size", () => {
	it.each([
		["small", "var(--ui-font-size-small)"],
		["medium", "var(--ui-font-size)"],
		["large", "var(--ui-font-size-xlarge)"],
	] as const)("follows labelSize %s in either stylesheet order", (size, expected) => {
		const { container } = render(
			<ClassicySlider id="s" value={5} labelTitle="Volume" labelSize={size} />,
		);
		const readout = container.querySelector(".classicySliderValue");
		if (!readout) throw new Error("no readout");
		for (const order of [SHEETS, [...SHEETS].reverse()])
			expect(classicyCascadeWinner(readout, order, "font-size")?.value).toBe(
				expected,
			);
	});
});
