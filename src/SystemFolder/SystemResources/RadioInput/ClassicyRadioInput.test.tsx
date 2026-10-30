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

	// HIGOS8 Ch.2 "Radio Buttons" (p.24): a radio group always has exactly one
	// button on, so a group with nothing pre-marked defaults to the first.
	it("selects the first button when no input is pre-marked checked", () => {
		render(<ClassicyRadioInput name="test-group" inputs={baseInputs} />);
		expect(screen.getByRole("radio", { name: "Option A" })).toBeChecked();
		expect(screen.getByRole("radio", { name: "Option B" })).not.toBeChecked();
		expect(screen.getByRole("radio", { name: "Option C" })).not.toBeChecked();
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

describe("ClassicyRadioInput group disabled (#308)", () => {
	it("disables every button, and selection never changes", async () => {
		const onClickFunc = vi.fn();
		render(
			<ClassicyRadioInput
				name="group-disabled"
				label="Speed"
				disabled
				inputs={baseInputs}
				onClickFunc={onClickFunc}
			/>,
		);
		const radios = screen.getAllByRole("radio");
		for (const radio of radios) expect(radio).toBeDisabled();
		await userEvent.click(radios[1]);
		await userEvent.click(screen.getByText("Option C"));
		expect(onClickFunc).not.toHaveBeenCalled();
		expect(radios[0]).toBeChecked();
	});

	it("keeps an entry's own disabled when the group is enabled", () => {
		render(
			<ClassicyRadioInput
				name="group-enabled"
				inputs={[
					...baseInputs.slice(0, 2),
					{ id: "option-c", label: "Option C", disabled: true },
				]}
			/>,
		);
		const radios = screen.getAllByRole("radio");
		expect(radios[0]).toBeEnabled();
		expect(radios[2]).toBeDisabled();
	});
});

describe("ClassicyRadioInput align", () => {
	it("lays the buttons out in rows by default", () => {
		render(<ClassicyRadioInput name="test-group" inputs={baseInputs} />);
		const group = screen.getByRole("radiogroup");
		expect(group).toHaveClass("classicyRadioInputGroup");
		expect(group).not.toHaveClass("classicyRadioInputGroupColumns");
	});

	it("stacks the buttons in a column with align='columns'", () => {
		render(
			<ClassicyRadioInput
				name="test-group"
				align="columns"
				inputs={baseInputs}
			/>,
		);
		expect(screen.getByRole("radiogroup")).toHaveClass(
			"classicyRadioInputGroup",
			"classicyRadioInputGroupColumns",
		);
	});
});
