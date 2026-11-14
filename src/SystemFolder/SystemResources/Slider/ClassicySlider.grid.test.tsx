import {
	afterAll,
	afterEach,
	beforeAll,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { render } from "@/__tests__/test-utils";
import { ClassicySlider } from "@/SystemFolder/SystemResources/Slider/ClassicySlider";

// Fix round 3 (story 0194-5bs): a vertical slider stays centered in its
// column, and its track (the input, or the stack with its ticks) is nudged
// onto the pixel grid by `left`, under half a pixel, as a submenu's wrapper
// is (nudgeClassicyOntoPixelGrid). jsdom lays nothing out: the track's place
// is stubbed.
const placeAt = (left: number) =>
	vi
		.spyOn(HTMLElement.prototype, "getBoundingClientRect")
		.mockImplementation(function (this: HTMLElement) {
			const at = left + (Number.parseFloat(this.style.left) || 0);
			return {
				left: at,
				x: at,
				top: 0,
				y: 0,
				width: 20,
				height: 96,
				right: at + 20,
				bottom: 96,
				toJSON: () => ({}),
			} as DOMRect;
		});

// The base sheet's structure jsdom needs: the vertical track is relatively
// positioned (ClassicySlider.scss), so the nudge moves it by `left`.
const sheet = document.createElement("style");
sheet.textContent =
	".classicySliderInputVertical, .classicySliderStackVertical { position: relative; }";
beforeAll(() => document.head.append(sheet));
afterAll(() => sheet.remove());

afterEach(() => vi.restoreAllMocks());

describe("ClassicySlider on the pixel grid", () => {
	it("nudges a vertical slider's input to a whole pixel", () => {
		placeAt(501.5);
		const { container } = render(
			<ClassicySlider id="v" value={5} orientation="vertical" />,
		);
		const input = container.querySelector("input") as HTMLInputElement;
		// Round half away to 502: +0.5.
		expect(input.style.left).toBe("0.5px");
	});

	it("nudges a ticked vertical slider's stack, not its input", () => {
		placeAt(460.25);
		const { container } = render(
			<ClassicySlider
				id="t"
				value={5}
				orientation="vertical"
				tickInterval={25}
			/>,
		);
		const stack = container.querySelector(
			".classicySliderStack",
		) as HTMLElement;
		expect(stack.style.left).toBe("-0.25px");
		expect(
			(container.querySelector("input") as HTMLInputElement).style.left,
		).toBe("");
	});

	it("leaves a slider already on the grid, and a horizontal one, alone", () => {
		placeAt(40);
		const vertical = render(
			<ClassicySlider id="w" value={5} orientation="vertical" />,
		).container.querySelector("input") as HTMLInputElement;
		expect(vertical.style.left).toBe("");
		vi.restoreAllMocks();
		placeAt(40.5);
		const horizontal = render(
			<ClassicySlider id="h" value={5} />,
		).container.querySelector("input") as HTMLInputElement;
		expect(horizontal.style.left).toBe("");
	});

	it("keeps a nudge stable across renders", () => {
		placeAt(501.5);
		const { container, rerender } = render(
			<ClassicySlider id="r" value={5} orientation="vertical" />,
		);
		rerender(<ClassicySlider id="r" value={6} orientation="vertical" />);
		rerender(<ClassicySlider id="r" value={7} orientation="vertical" />);
		expect(
			(container.querySelector("input") as HTMLInputElement).style.left,
		).toBe("0.5px");
	});
});
