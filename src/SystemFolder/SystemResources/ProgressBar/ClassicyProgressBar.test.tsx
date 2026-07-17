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

	it("renders the chasing-arrows spinner instead of a bar when chasingArrows=true", () => {
		const { container } = render(<ClassicyProgressBar chasingArrows={true} />);
		const wrapper = container.firstChild as Element;
		expect(wrapper).toHaveClass("classicyProgressChasingArrows");
		expect(wrapper).toHaveAttribute("role", "progressbar");
		expect(wrapper).toHaveAttribute("aria-busy", "true");
		expect(container.querySelector("progress")).toBeNull();
		expect(
			container.querySelector(".classicyProgressChasingArrowsSpinner"),
		).toBeInTheDocument();
	});

	it("labels the chasing-arrows indicator with the label text", () => {
		const { container } = render(
			<ClassicyProgressBar chasingArrows={true} label="Connecting" />,
		);
		const wrapper = container.querySelector(".classicyProgressChasingArrows");
		expect(wrapper).toHaveAttribute("aria-label", "Connecting");
	});

	it("stays indeterminate when autoSwitch is set but no value is provided", () => {
		const { container } = render(
			<ClassicyProgressBar indeterminate={true} autoSwitch={true} />,
		);
		const wrapper = container.firstChild as Element;
		expect(wrapper).toHaveClass("classicyProgressIndeterminate");
		expect(container.querySelector("progress")).toHaveAttribute("value", "100");
	});

	it("flips indeterminate→determinate once a value is known with autoSwitch", () => {
		const { container } = render(
			<ClassicyProgressBar
				indeterminate={true}
				autoSwitch={true}
				value={45}
				max={100}
			/>,
		);
		const wrapper = container.firstChild as Element;
		expect(wrapper).toHaveClass("classicyProgressDeterminate");
		expect(wrapper).not.toHaveClass("classicyProgressIndeterminate");
		const progress = container.querySelector("progress");
		expect(progress).toHaveAttribute("value", "45");
		expect(progress).toHaveAttribute("max", "100");
	});

	it("keeps a value=0 indeterminate bar barber-poled unless autoSwitch flips it", () => {
		// Without a value, indeterminate stays; value defaults to undefined now.
		const { container } = render(<ClassicyProgressBar indeterminate={true} />);
		expect(container.querySelector("progress")).toHaveAttribute("value", "100");
	});
});
