import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, userEvent } from "@/__tests__/test-utils";
import {
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
} from "@/Appearance/ClassicyAppearancePackage";
import { CLASSICY_CORE_DEFAULT_THEME } from "@/Appearance/ClassicyCoreTheme";
// The Windows-layout package below needs a sound pack registered.
import "../../../../packages/appearance/platinum/src/assets/sounds/platinum";
import { ClassicyRadioInput } from "@/SystemFolder/SystemResources/RadioInput/ClassicyRadioInput";
import windows98 from "../../../../packages/appearance/windows98/src/windows98.json";

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

// The remaining chapters' audit's 4.11 / B.12 (WIG Ch.4 "Access Keys",
// p.27; Ch.8 "Navigation in Secondary Windows", pp.148-149): each option
// button's `accessKey` is its label's.
describe("ClassicyRadioInput — access keys", () => {
	afterEach(() => resetClassicyAppearancePackagesForTests());
	const alt = (k: string, target: Element) =>
		fireEvent.keyDown(target, {
			key: k,
			code: `Key${k.toUpperCase()}`,
			altKey: true,
		});
	const Group = ({ onClickFunc }: { onClickFunc: (id: string) => void }) => (
		<div className="classicyWindow">
			<button type="button">Apply</button>
			<ClassicyRadioInput
				name="speed"
				label="Speed"
				onClickFunc={onClickFunc}
				inputs={[
					{ id: "slow", label: "Slow", accessKey: "l" },
					{ id: "fast", label: "Fast" },
				]}
			/>
		</div>
	);

	it("underlines each button's key and turns it on with Alt and it under the Windows layout", () => {
		registerClassicyAppearancePackage({
			id: "windows-radios",
			name: "Windows option buttons",
			css: "",
			defaults: {
				...CLASSICY_CORE_DEFAULT_THEME,
				id: "windows-radios-default",
				package: "windows-radios",
			},
			layout: windows98.layout as never,
		});
		const onClickFunc = vi.fn();
		const { container } = render(<Group onClickFunc={onClickFunc} />);
		// The group's title labels no control and takes none; "Fast" its
		// first letter.
		expect(
			Array.from(
				container.querySelectorAll("[data-classicy-part='access-key']"),
			).map((el) => el.textContent),
		).toEqual(["l", "F"]);
		const apply = screen.getByRole("button", { name: "Apply" });
		apply.focus();
		expect(alt("f", apply)).toBe(false);
		expect(screen.getByRole("radio", { name: "Fast" })).toBeChecked();
		expect(screen.getByRole("radio", { name: "Fast" })).toHaveFocus();
		expect(onClickFunc).toHaveBeenLastCalledWith("fast");
		alt("l", document.activeElement as Element);
		expect(screen.getByRole("radio", { name: "Slow" })).toBeChecked();
	});

	it("draws and takes nothing by default (Platinum)", () => {
		const onClickFunc = vi.fn();
		const { container } = render(<Group onClickFunc={onClickFunc} />);
		expect(container.querySelector("[data-classicy-part]")).toBeNull();
		const apply = screen.getByRole("button", { name: "Apply" });
		apply.focus();
		expect(alt("f", apply)).toBe(true);
		expect(onClickFunc).not.toHaveBeenCalled();
	});
});
