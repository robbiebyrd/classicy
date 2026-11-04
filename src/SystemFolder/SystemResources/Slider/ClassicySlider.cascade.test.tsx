import { describe, expect, it } from "vitest";
import { render } from "@/__tests__/test-utils";
import { classicyCascadeWinner } from "@/Appearance/__tests__/classicyCascadeWinner";
import { ClassicySlider } from "@/SystemFolder/SystemResources/Slider/ClassicySlider";

// The value readout is drawn at the small size whatever labelSize says
// (bf10949e5), though it also carries its labelSize class (sizeClassMap in
// ClassicySlider.tsx). It used to win only by ClassicySlider.scss coming
// later in dist/classicy.css; it now outranks the size classes in any order.
const SHEETS = [
	"src/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel.scss",
	"src/SystemFolder/SystemResources/Slider/ClassicySlider.scss",
];

describe("ClassicySlider value readout size", () => {
	it.each([
		"small",
		"medium",
		"large",
	] as const)("is the small size for labelSize %s in either stylesheet order", (size) => {
		const { container } = render(
			<ClassicySlider id="s" value={5} labelTitle="Volume" labelSize={size} />,
		);
		const readout = container.querySelector(".classicySliderValue");
		if (!readout) throw new Error("no readout");
		for (const order of [SHEETS, [...SHEETS].reverse()])
			expect(classicyCascadeWinner(readout, order, "font-size")?.value).toBe(
				"var(--ui-font-size-small)",
			);
	});
});
