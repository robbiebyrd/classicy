import path from "node:path";
import * as sass from "sass";
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

	// The track (the input, or the stack holding it and its ticks) is the
	// slider's minimum length on its own (a container with no set height)
	// and grows to fill a set height, less the readout; never shorter.
	// A vertical slider's group stays as wide as its container (centered in
	// a column, as before); its track (the input, or the stack with its
	// ticks) is relatively positioned, so ClassicySlider can nudge it onto
	// the pixel grid by `left` (ClassicySlider.grid.test.tsx).
	it("keeps a vertical slider centered, its track nudgeable", () => {
		const { container } = render(
			<ClassicySlider
				id="g"
				labelTitle="Level"
				value={5}
				orientation="vertical"
			/>,
		);
		expect(
			winner(container.querySelector(".classicySliderTrackGroup"), "width"),
		).toBe("auto");
		expect(winner(container.querySelector("input"), "position")).toBe(
			"relative",
		);
		const ticked = render(
			<ClassicySlider
				id="gt"
				value={5}
				orientation="vertical"
				tickInterval={25}
			/>,
		).container;
		expect(
			winner(ticked.querySelector(".classicySliderStack"), "position"),
		).toBe("relative");
	});

	it("is its minimum length on its own, and grows to fill a set height", () => {
		const ticked = render(
			<ClassicySlider
				id="t"
				value={5}
				orientation="vertical"
				tickInterval={25}
			/>,
		).container;
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
		for (const track of [ticked.querySelector(".classicySliderStack"), plain]) {
			expect(winner(track, "flex")).toBe("1 1 auto");
			expect(winner(track, "height")).toBe("var(--slider-vertical-min-height)");
			expect(winner(track, "min-height")).toBe(
				"var(--slider-vertical-min-height)",
			);
		}
		// In the stack the input fills the track layer, which fills the stack.
		const input = ticked.querySelector("input");
		expect(winner(input, "height")).toBe("100%");
		expect(winner(input, "flex")).toBe("0 0 auto");
	});

	// A tick label sits beside its tick: the label rail is inset along the
	// track as the tick rail is (half the thumb at each end), not across it.
	it("insets a vertical slider's tick labels as its ticks", () => {
		const { container } = render(
			<ClassicySlider
				id="tl"
				value={5}
				orientation="vertical"
				tickInterval={25}
				tickLabels={["Low", null, null, null, "High"]}
			/>,
		);
		const ticks = winner(
			container.querySelector(".classicySliderTicks"),
			"padding",
		);
		expect(ticks).toBe("calc(var(--slider-thumb-height) / 2) 0");
		expect(
			winner(container.querySelector(".classicySliderTickLabels"), "padding"),
		).toBe(ticks);
	});
});

// The vertical track is the horizontal one's channel turned a quarter: as
// wide as the horizontal is tall, its gradient across it left to right.
describe("ClassicySlider vertical track", () => {
	const css = sass.compile(
		path.resolve(
			process.cwd(),
			"src/SystemFolder/SystemResources/Slider/ClassicySlider.scss",
		),
	).css;
	const body = (selector: string) => {
		const at = css.indexOf(`${selector} {`);
		if (at < 0) throw new Error(`no rule for ${selector}`);
		return css.slice(at, css.indexOf("}", at));
	};

	// The channel's look (its border, shading and bevel) is the package's;
	// the base sheet sizes it: as wide as the horizontal one is tall.
	it.each([
		"-webkit-slider-runnable-track",
		"-moz-range-track",
	])("sizes %s as the channel, turned, and draws none of it", (pseudo) => {
		const track = body(`.classicySliderInputVertical::${pseudo}`);
		expect(track).toMatch(/width: calc\(var\(--window-padding-size\)\);/);
		expect(track).toMatch(/height: auto;/);
		expect(css).not.toMatch(/linear-gradient/);
		expect(css).not.toMatch(/box-shadow/);
	});

	// Chromium places a vertical thumb from the channel's center line, not
	// its edge: the thumb's margin across it is minus half the thumb, which
	// is the horizontal centering offset less half the channel, rounded up to
	// a whole pixel so either pointing direction's quarter turn is exact.
	it("centers a vertical thumb on the channel, on a whole pixel", () => {
		const thumb = body(".classicySliderInputVertical::-webkit-slider-thumb");
		expect(thumb).toMatch(/margin-top: 0;/);
		const half = (v: string) => `calc(${v} / 2)`;
		const thumbHalf = half("var(--slider-thumb-height)");
		const trackHalf = half("calc(var(--window-padding-size))");
		expect(thumb).toContain(
			`margin-left: round(up, calc(${trackHalf} - ${thumbHalf}) - ${trackHalf}, var(--window-border-size));`,
		);
		// The horizontal thumb's margin-top is the same offset, unchanged:
		// (6 - 21) / 2 under Platinum, as half the channel less half the thumb.
		expect(body(".classicySlider::-webkit-slider-thumb")).toContain(
			`margin-top: calc(${trackHalf} - ${thumbHalf});`,
		);
	});
});
