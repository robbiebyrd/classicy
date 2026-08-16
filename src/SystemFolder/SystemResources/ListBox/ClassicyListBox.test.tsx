import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, userEvent } from "@/__tests__/test-utils";
import { ClassicyListBox } from "@/SystemFolder/SystemResources/ListBox/ClassicyListBox";

vi.mock(
	"@/SystemFolder/SystemResources/ListBox/ClassicyListBox.scss",
	() => ({}),
);
vi.mock(
	"@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel.scss",
	() => ({}),
);

const options = [
	{ value: "a", label: "Alpha" },
	{ value: "b", label: "Beta" },
	{ value: "c", label: "Gamma" },
	{ value: "d", label: "Delta" },
];

describe("ClassicyListBox", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders an ARIA listbox with one option per entry", () => {
		render(<ClassicyListBox id="lb" options={options} />);
		const listbox = screen.getByRole("listbox");
		expect(listbox).toHaveAttribute("id", "lb");
		expect(screen.getAllByRole("option")).toHaveLength(4);
		expect(listbox).not.toHaveAttribute("aria-multiselectable");
	});

	it("marks multi mode as aria-multiselectable", () => {
		render(<ClassicyListBox id="lb" options={options} selectionMode="multi" />);
		expect(screen.getByRole("listbox")).toHaveAttribute(
			"aria-multiselectable",
			"true",
		);
	});

	it("single mode: a click replaces the selection", () => {
		const onChange = vi.fn();
		render(
			<ClassicyListBox id="lb" options={options} onChangeFunc={onChange} />,
		);
		fireEvent.click(screen.getByRole("option", { name: "Beta" }));
		expect(onChange).toHaveBeenLastCalledWith(["b"]);
		fireEvent.click(screen.getByRole("option", { name: "Gamma" }));
		expect(onChange).toHaveBeenLastCalledWith(["c"]);
		expect(screen.getByRole("option", { name: "Gamma" })).toHaveAttribute(
			"aria-selected",
			"true",
		);
		expect(screen.getByRole("option", { name: "Beta" })).toHaveAttribute(
			"aria-selected",
			"false",
		);
	});

	it("multi mode: ⌘/Ctrl-click toggles membership", () => {
		const onChange = vi.fn();
		render(
			<ClassicyListBox
				id="lb"
				options={options}
				selectionMode="multi"
				onChangeFunc={onChange}
			/>,
		);
		fireEvent.click(screen.getByRole("option", { name: "Alpha" }));
		fireEvent.click(screen.getByRole("option", { name: "Gamma" }), {
			metaKey: true,
		});
		expect(onChange).toHaveBeenLastCalledWith(["a", "c"]);
		fireEvent.click(screen.getByRole("option", { name: "Alpha" }), {
			ctrlKey: true,
		});
		expect(onChange).toHaveBeenLastCalledWith(["c"]);
	});

	it("multi mode: Shift-click extends a range from the last plain selection", () => {
		const onChange = vi.fn();
		render(
			<ClassicyListBox
				id="lb"
				options={options}
				selectionMode="multi"
				onChangeFunc={onChange}
			/>,
		);
		fireEvent.click(screen.getByRole("option", { name: "Beta" }));
		fireEvent.click(screen.getByRole("option", { name: "Delta" }), {
			shiftKey: true,
		});
		expect(onChange).toHaveBeenLastCalledWith(["b", "c", "d"]);
		// The anchor survives, so the range can pivot the other way.
		fireEvent.click(screen.getByRole("option", { name: "Alpha" }), {
			shiftKey: true,
		});
		expect(onChange).toHaveBeenLastCalledWith(["a", "b"]);
	});

	it("selection follows arrow-key navigation", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		render(
			<ClassicyListBox id="lb" options={options} onChangeFunc={onChange} />,
		);
		fireEvent.click(screen.getByRole("option", { name: "Alpha" }));
		await user.keyboard("{ArrowDown}");
		expect(onChange).toHaveBeenLastCalledWith(["b"]);
	});

	it("multi mode: Shift-arrows extend the range", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		render(
			<ClassicyListBox
				id="lb"
				options={options}
				selectionMode="multi"
				onChangeFunc={onChange}
			/>,
		);
		fireEvent.click(screen.getByRole("option", { name: "Beta" }));
		await user.keyboard("{Shift>}{ArrowDown}{ArrowDown}{/Shift}");
		expect(onChange).toHaveBeenLastCalledWith(["b", "c", "d"]);
	});

	it("type-select jumps to and selects the matching option", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		render(
			<ClassicyListBox id="lb" options={options} onChangeFunc={onChange} />,
		);
		fireEvent.click(screen.getByRole("option", { name: "Alpha" }));
		await user.keyboard("g");
		expect(onChange).toHaveBeenLastCalledWith(["c"]);
	});

	it("disabled options are skipped by selection and range fills", () => {
		const onChange = vi.fn();
		const withDisabled = [
			{ value: "a", label: "Alpha" },
			{ value: "b", label: "Beta", disabled: true },
			{ value: "c", label: "Gamma" },
		];
		render(
			<ClassicyListBox
				id="lb"
				options={withDisabled}
				selectionMode="multi"
				onChangeFunc={onChange}
			/>,
		);
		fireEvent.click(screen.getByRole("option", { name: "Beta" }));
		expect(onChange).not.toHaveBeenCalled();
		fireEvent.click(screen.getByRole("option", { name: "Alpha" }));
		fireEvent.click(screen.getByRole("option", { name: "Gamma" }), {
			shiftKey: true,
		});
		expect(onChange).toHaveBeenLastCalledWith(["a", "c"]);
	});

	it("double-click and Enter activate an option", async () => {
		const user = userEvent.setup();
		const onActivate = vi.fn();
		render(
			<ClassicyListBox id="lb" options={options} onActivateFunc={onActivate} />,
		);
		fireEvent.doubleClick(screen.getByRole("option", { name: "Beta" }));
		expect(onActivate).toHaveBeenLastCalledWith("b");
		fireEvent.click(screen.getByRole("option", { name: "Gamma" }));
		await user.keyboard("{Enter}");
		expect(onActivate).toHaveBeenLastCalledWith("c");
	});

	it("honors a controlled selected prop", () => {
		render(<ClassicyListBox id="lb" options={options} selected={["a", "d"]} />);
		expect(screen.getByRole("option", { name: "Alpha" })).toHaveAttribute(
			"aria-selected",
			"true",
		);
		expect(screen.getByRole("option", { name: "Delta" })).toHaveAttribute(
			"aria-selected",
			"true",
		);
		expect(screen.getByRole("option", { name: "Beta" })).toHaveAttribute(
			"aria-selected",
			"false",
		);
	});

	it("is inert when disabled", () => {
		const onChange = vi.fn();
		render(
			<ClassicyListBox
				id="lb"
				options={options}
				disabled
				onChangeFunc={onChange}
			/>,
		);
		fireEvent.click(screen.getByRole("option", { name: "Alpha" }));
		expect(onChange).not.toHaveBeenCalled();
		expect(screen.getByRole("listbox")).toHaveAttribute(
			"aria-disabled",
			"true",
		);
	});

	it("sets the visible-rows CSS variable", () => {
		render(<ClassicyListBox id="lb" options={options} visibleRows={5} />);
		expect(
			screen
				.getByRole("listbox")
				.style.getPropertyValue("--classicy-listbox-visible-rows"),
		).toBe("5");
	});

	it("renders a tied ClassicyControlLabel", () => {
		render(<ClassicyListBox id="lb" options={options} label="Fruits" />);
		const label = screen.getByText("Fruits");
		expect(label.closest("label")).toHaveAttribute("for", "lb");
	});
});
