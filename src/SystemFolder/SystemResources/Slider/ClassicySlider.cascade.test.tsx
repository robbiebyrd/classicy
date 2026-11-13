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

// Story 0194-5bs: a vertical slider's layout comes from the base sheet alone.
// With tick marks its input sits in a stack beside them (a row, not the
// horizontal slider's column), and the stack's track layer takes the stack's
// height outright, so the orthogonal input's 100% resolves against it rather
// than the viewport. The value readout below fits inside the track group's
// height: the track (the input, or the stack) shrinks to make room for it.
describe("ClassicySlider vertical layout", () => {
	const SHEET = ["src/SystemFolder/SystemResources/Slider/ClassicySlider.scss"];
	const winner = (el: Element | null, property: string) => {
		if (!el) throw new Error("no element");
		return classicyCascadeWinner(el, SHEET, property)?.value;
	};

	it("lays a ticked vertical slider's ticks beside it, in a row", () => {
		const { container } = render(
			<ClassicySlider
				id="v"
				value={5}
				orientation="vertical"
				tickInterval={25}
			/>,
		);
		const stack = container.querySelector(".classicySliderStack");
		expect(winner(stack, "flex-direction")).toBe("row");
		expect(
			winner(container.querySelector(".classicySliderTrackLayer"), "height"),
		).toBe("100%");
	});

	it("keeps a horizontal slider's ticks under it, in a column", () => {
		const { container } = render(
			<ClassicySlider id="h" value={5} tickInterval={25} />,
		);
		expect(
			winner(container.querySelector(".classicySliderStack"), "flex-direction"),
		).toBe("column");
	});

	it("shrinks the vertical track, never below its minimum, to fit the readout", () => {
		const ticked = render(
			<ClassicySlider
				id="t"
				value={5}
				orientation="vertical"
				tickInterval={25}
			/>,
		).container.querySelector(".classicySliderStack");
		const plain = render(
			<ClassicySlider id="p" value={5} orientation="vertical" />,
		).container.querySelector("input");
		// Under its label the track group shrinks too, so the label, the track
		// and the readout share the height the slider is given.
		const labeled = render(
			<ClassicySlider
				id="l"
				labelTitle="Level"
				value={5}
				orientation="vertical"
			/>,
		).container.querySelector(".classicySliderTrackGroup");
		expect(winner(labeled, "min-height")).toBe("0");
		for (const track of [ticked, plain]) {
			expect(winner(track, "flex")).toBe("0 1 auto");
			expect(winner(track, "height")).toBe("100%");
			expect(winner(track, "min-height")).toBe(
				"var(--slider-vertical-min-height)",
			);
		}
	});
});
