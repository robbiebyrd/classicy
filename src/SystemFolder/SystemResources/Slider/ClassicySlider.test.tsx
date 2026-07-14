import { fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { render } from "@/__tests__/test-utils";
import {
	ClassicySlider,
	computeSliderTicks,
} from "@/SystemFolder/SystemResources/Slider/ClassicySlider";

vi.mock(
	"@/SystemFolder/SystemResources/Slider/ClassicySlider.scss",
	() => ({}),
);

describe("ClassicySlider", () => {
	it("renders a range input", () => {
		const { container } = render(<ClassicySlider id="test" value={5} />);
		expect(container.querySelector('input[type="range"]')).toBeInTheDocument();
	});

	it("reflects min, max, step, and value on the input", () => {
		const { container } = render(
			<ClassicySlider id="test" value={30} min={1} max={60} step={1} />,
		);
		const input = container.querySelector(
			'input[type="range"]',
		) as HTMLInputElement;
		expect(input).toHaveAttribute("min", "1");
		expect(input).toHaveAttribute("max", "60");
		expect(input).toHaveAttribute("step", "1");
		// Uncontrolled input: value is set via defaultValue / ref, check DOM property
		expect(input.value).toBe("30");
	});

	it("shows valueLabel when provided", () => {
		const { getByText } = render(
			<ClassicySlider id="test" value={30} valueLabel="30 min" />,
		);
		expect(getByText("30 min")).toBeInTheDocument();
	});

	it("shows raw numeric value when no valueLabel provided", () => {
		const { getByText } = render(<ClassicySlider id="test" value={42} />);
		expect(getByText("42")).toBeInTheDocument();
	});

	it("renders a label when labelTitle is provided", () => {
		const { getByText } = render(
			<ClassicySlider id="test" value={5} labelTitle="Skip:" />,
		);
		expect(getByText("Skip:")).toBeInTheDocument();
	});

	it("calls onChangeFunc when the input changes", () => {
		const onChange = vi.fn();
		const { container } = render(
			<ClassicySlider id="test" value={5} onChangeFunc={onChange} />,
		);
		const input = container.querySelector(
			'input[type="range"]',
		) as HTMLInputElement;
		fireEvent.change(input, { target: { value: "20" } });
		expect(onChange).toHaveBeenCalledTimes(1);
	});

	it("disables the input when disabled=true", () => {
		const { container } = render(
			<ClassicySlider id="test" value={5} disabled={true} />,
		);
		const input = container.querySelector(
			'input[type="range"]',
		) as HTMLInputElement;
		expect(input).toBeDisabled();
	});

	it("calls onCommitFunc with the numeric value on pointer release", () => {
		const onCommit = vi.fn();
		const { container } = render(
			<ClassicySlider id="test" value={5} onCommitFunc={onCommit} />,
		);
		const input = container.querySelector(
			'input[type="range"]',
		) as HTMLInputElement;
		fireEvent.change(input, { target: { value: "20" } });
		fireEvent.pointerUp(input);
		expect(onCommit).toHaveBeenCalledTimes(1);
		expect(onCommit).toHaveBeenCalledWith(20);
	});

	it("calls onCommitFunc with the numeric value on key release", () => {
		const onCommit = vi.fn();
		const { container } = render(
			<ClassicySlider id="test" value={5} onCommitFunc={onCommit} />,
		);
		const input = container.querySelector(
			'input[type="range"]',
		) as HTMLInputElement;
		fireEvent.change(input, { target: { value: "15" } });
		fireEvent.keyUp(input, { key: "ArrowRight" });
		expect(onCommit).toHaveBeenCalledWith(15);
	});

	it("does not fire onCommitFunc on mere value changes (only on release)", () => {
		const onCommit = vi.fn();
		const { container } = render(
			<ClassicySlider id="test" value={5} onCommitFunc={onCommit} />,
		);
		const input = container.querySelector(
			'input[type="range"]',
		) as HTMLInputElement;
		fireEvent.change(input, { target: { value: "20" } });
		expect(onCommit).not.toHaveBeenCalled();
	});

	it("sets aria-label on the input when ariaLabel is provided", () => {
		const { container } = render(
			<ClassicySlider id="test" value={5} ariaLabel="Volume for WETA" />,
		);
		const input = container.querySelector(
			'input[type="range"]',
		) as HTMLInputElement;
		expect(input).toHaveAttribute("aria-label", "Volume for WETA");
	});

	it("renders no tick rail when tickInterval is not set", () => {
		const { container } = render(<ClassicySlider id="test" value={5} />);
		expect(container.querySelector(".classicySliderTicks")).toBeNull();
		expect(container.querySelector(".classicySliderStack")).toBeNull();
	});

	it("renders a single centered tick for tickInterval='center'", () => {
		const { container } = render(
			<ClassicySlider id="test" value={5} tickInterval="center" />,
		);
		const ticks = container.querySelectorAll(".classicySliderTick");
		expect(ticks).toHaveLength(1);
		expect(
			(ticks[0] as HTMLElement).style.getPropertyValue("--classicy-tick-left"),
		).toBe("50%");
	});

	it("renders one tick per interval position", () => {
		const { container } = render(
			<ClassicySlider
				id="test"
				value={50}
				min={0}
				max={100}
				tickInterval={25}
			/>,
		);
		const ticks = [...container.querySelectorAll(".classicySliderTick")];
		expect(ticks).toHaveLength(5);
		expect(
			ticks.map((t) =>
				(t as HTMLElement).style.getPropertyValue("--classicy-tick-left"),
			),
		).toEqual(["0%", "25%", "50%", "75%", "100%"]);
	});

	it("hides the tick rail from assistive technology", () => {
		const { container } = render(
			<ClassicySlider id="test" value={5} tickInterval={25} />,
		);
		expect(container.querySelector(".classicySliderTicks")).toHaveAttribute(
			"aria-hidden",
			"true",
		);
	});

	it("dims the tick rail when disabled", () => {
		const { container } = render(
			<ClassicySlider id="test" value={5} tickInterval={25} disabled={true} />,
		);
		expect(container.querySelector(".classicySliderTicks")).toHaveClass(
			"classicySliderTicksDisabled",
		);
	});

	it("snaps step to the tick interval when snapToTicks is set", () => {
		const { container } = render(
			<ClassicySlider
				id="test"
				value={50}
				min={0}
				max={100}
				step={1}
				tickInterval={25}
				snapToTicks={true}
			/>,
		);
		const input = container.querySelector(
			'input[type="range"]',
		) as HTMLInputElement;
		expect(input).toHaveAttribute("step", "25");
	});

	it("snaps to the density-clamped interval, not the raw one", () => {
		const { container } = render(
			<ClassicySlider
				id="test"
				value={50}
				min={0}
				max={100}
				tickInterval={0.5}
				snapToTicks={true}
			/>,
		);
		const input = container.querySelector(
			'input[type="range"]',
		) as HTMLInputElement;
		expect(input).toHaveAttribute("step", "2");
	});

	it("ignores snapToTicks for 'center' and missing tickInterval", () => {
		const centered = render(
			<ClassicySlider
				id="t1"
				value={50}
				step={5}
				tickInterval="center"
				snapToTicks={true}
			/>,
		);
		expect(
			centered.container.querySelector('input[type="range"]'),
		).toHaveAttribute("step", "5");

		const none = render(
			<ClassicySlider id="t2" value={50} step={5} snapToTicks={true} />,
		);
		expect(none.container.querySelector('input[type="range"]')).toHaveAttribute(
			"step",
			"5",
		);
	});
});

describe("computeSliderTicks", () => {
	it("returns no positions when tickInterval is undefined", () => {
		expect(computeSliderTicks(undefined, 0, 100).positions).toEqual([]);
	});

	it("returns a single 50% position for 'center'", () => {
		const ticks = computeSliderTicks("center", 0, 100);
		expect(ticks.positions).toEqual([50]);
		expect(ticks.snapStep).toBeUndefined();
	});

	it("places ticks every interval including on-grid endpoints", () => {
		const ticks = computeSliderTicks(25, 0, 100);
		expect(ticks.positions).toEqual([0, 25, 50, 75, 100]);
		expect(ticks.snapStep).toBe(25);
	});

	it("omits max when it is off-grid", () => {
		expect(computeSliderTicks(30, 0, 100).positions).toEqual([0, 30, 60, 90]);
	});

	it("respects a non-zero min", () => {
		expect(computeSliderTicks(30, 10, 70).positions).toEqual([0, 50, 100]);
	});

	it("clamps density to one tick per 2% of range", () => {
		const ticks = computeSliderTicks(0.5, 0, 100);
		expect(ticks.positions).toHaveLength(51);
		expect(ticks.snapStep).toBe(2);
	});

	it("produces exact positions under density clamping", () => {
		const { positions } = computeSliderTicks(0.5, 0, 100);
		expect(positions[7]).toBe(14);
		expect(positions[29]).toBe(58);
	});

	it("returns no positions for zero, negative, or NaN intervals", () => {
		expect(computeSliderTicks(0, 0, 100).positions).toEqual([]);
		expect(computeSliderTicks(-5, 0, 100).positions).toEqual([]);
		expect(computeSliderTicks(Number.NaN, 0, 100).positions).toEqual([]);
	});

	it("returns no positions when max <= min", () => {
		expect(computeSliderTicks(10, 100, 100).positions).toEqual([]);
		expect(computeSliderTicks("center", 5, 1).positions).toEqual([]);
	});
});
