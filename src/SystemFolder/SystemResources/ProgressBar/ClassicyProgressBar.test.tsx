import { describe, expect, it, vi } from "vitest";
import { render } from "@/__tests__/test-utils";
import { ClassicyProgressBar } from "@/SystemFolder/SystemResources/ProgressBar/ClassicyProgressBar";

vi.mock(
	"@/SystemFolder/SystemResources/ProgressBar/ClassicyProgressBar.scss",
	() => ({}),
);

describe("ClassicyProgressBar", () => {
	it("renders a progress element", () => {
		const { container } = render(<ClassicyProgressBar />);
		expect(container.querySelector("progress")).toBeInTheDocument();
	});

	it("uses determinate class by default", () => {
		const { container } = render(<ClassicyProgressBar />);
		const wrapper = container.firstChild as Element;
		expect(wrapper).toHaveClass("classicyProgressDeterminate");
		expect(wrapper).not.toHaveClass("classicyProgressIndeterminate");
	});

	it("uses indeterminate class when indeterminate=true", () => {
		const { container } = render(<ClassicyProgressBar indeterminate={true} />);
		const wrapper = container.firstChild as Element;
		expect(wrapper).toHaveClass("classicyProgressIndeterminate");
		expect(wrapper).not.toHaveClass("classicyProgressDeterminate");
	});

	it("reflects value and max on the progress element for determinate mode", () => {
		const { container } = render(<ClassicyProgressBar value={40} max={200} />);
		const progress = container.querySelector("progress");
		expect(progress).toBeInTheDocument();
		expect(progress).toHaveAttribute("value", "40");
		expect(progress).toHaveAttribute("max", "200");
	});

	it("forces max=100 and value=100 when indeterminate=true", () => {
		const { container } = render(
			<ClassicyProgressBar value={30} max={50} indeterminate={true} />,
		);
		const progress = container.querySelector("progress");
		expect(progress).toBeInTheDocument();
		expect(progress).toHaveAttribute("value", "100");
		expect(progress).toHaveAttribute("max", "100");
	});

	it("applies classicyLabelAlignLeft on the label wrapper by default", () => {
		const { container } = render(
			<ClassicyProgressBar label="Loading" labelPosition="above" />,
		);
		const wrapper = container.firstChild as Element;
		expect(wrapper).toHaveClass("classicyLabelAbove");
		expect(wrapper).toHaveClass("classicyLabelAlignLeft");
	});

	it("applies classicyLabelAlignCenter when labelAlign=center", () => {
		const { container } = render(
			<ClassicyProgressBar label="Loading" labelAlign="center" />,
		);
		expect(container.firstChild as Element).toHaveClass(
			"classicyLabelAlignCenter",
		);
	});

	it("applies classicyLabelAlignRight when labelAlign=right", () => {
		const { container } = render(
			<ClassicyProgressBar label="Loading" labelAlign="right" />,
		);
		expect(container.firstChild as Element).toHaveClass(
			"classicyLabelAlignRight",
		);
	});

	it("renders no label wrapper when there is no label, even with labelAlign", () => {
		const { container } = render(<ClassicyProgressBar labelAlign="center" />);
		const wrapper = container.firstChild as Element;
		expect(wrapper).toHaveClass("classicyProgress");
		expect(wrapper).not.toHaveClass("classicyLabelAlignCenter");
	});
});
