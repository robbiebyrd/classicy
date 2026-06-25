import { fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { render } from "@/__tests__/test-utils";
import { ClassicySlider } from "@/SystemFolder/SystemResources/Slider/ClassicySlider";

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
});
