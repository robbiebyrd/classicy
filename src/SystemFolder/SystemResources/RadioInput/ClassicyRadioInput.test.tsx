import { describe, expect, it, vi } from "vitest";
import { render, screen, userEvent } from "@/__tests__/test-utils";
import { ClassicyRadioInput } from "@/SystemFolder/SystemResources/RadioInput/ClassicyRadioInput";

vi.mock(
	"@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics",
	() => ({
		useClassicyAnalytics: () => ({ track: vi.fn() }),
	}),
);
vi.mock(
	"@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext",
	() => ({
		useSoundDispatch: () => vi.fn(),
	}),
);

vi.mock(
	"@/SystemFolder/SystemResources/RadioInput/ClassicyRadioInput.scss",
	() => ({}),
);
vi.mock(
	"@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel.scss",
	() => ({}),
);

const baseInputs = [
	{ id: "option-a", label: "Option A" },
	{ id: "option-b", label: "Option B" },
	{ id: "option-c", label: "Option C" },
];

describe("ClassicyRadioInput", () => {
	it("renders radio inputs for each item in inputs array", () => {
		render(<ClassicyRadioInput name="test-group" inputs={baseInputs} />);
		const radios = screen.getAllByRole("radio");
		expect(radios).toHaveLength(3);
	});

	it("renders label when label prop is provided", () => {
		render(
			<ClassicyRadioInput
				name="test-group"
				label="Choose one"
				inputs={baseInputs}
			/>,
		);
		expect(screen.getByText("Choose one")).toBeInTheDocument();
	});

	it("does not render a group label when label prop is omitted", () => {
		render(<ClassicyRadioInput name="test-group" inputs={baseInputs} />);
		expect(screen.queryByText("Choose one")).not.toBeInTheDocument();
	});

	it("calls onClickFunc when a radio is clicked", async () => {
		const user = userEvent.setup();
		const onClickFunc = vi.fn();
		render(
			<ClassicyRadioInput
				name="test-group"
				inputs={baseInputs}
				onClickFunc={onClickFunc}
			/>,
		);
		await user.click(screen.getByRole("radio", { name: "Option B" }));
		expect(onClickFunc).toHaveBeenCalledWith("option-b");
	});

	it("pre-selects the radio marked as checked", () => {
		const inputs = [
			{ id: "opt-x", label: "X" },
			{ id: "opt-y", label: "Y", checked: true },
			{ id: "opt-z", label: "Z" },
		];
		render(<ClassicyRadioInput name="test-group" inputs={inputs} />);
		expect(screen.getByRole("radio", { name: "Y" })).toBeChecked();
		expect(screen.getByRole("radio", { name: "X" })).not.toBeChecked();
	});

	it("disabled individual radio cannot be changed", async () => {
		const user = userEvent.setup();
		const onClickFunc = vi.fn();
		const inputs = [
			{ id: "opt-1", label: "One", disabled: true },
			{ id: "opt-2", label: "Two" },
		];
		render(
			<ClassicyRadioInput
				name="test-group"
				inputs={inputs}
				onClickFunc={onClickFunc}
			/>,
		);
		const disabledRadio = screen.getByRole("radio", { name: "One" });
		expect(disabledRadio).toBeDisabled();
		await user.click(disabledRadio);
		expect(onClickFunc).not.toHaveBeenCalled();
	});
});
