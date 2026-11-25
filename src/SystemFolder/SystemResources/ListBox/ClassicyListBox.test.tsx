import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
// Registers Platinum's sound pack, which the core default theme names.
import "../../../../packages/appearance/platinum/src/assets/sounds/platinum";
import { fireEvent, render, screen, userEvent } from "@/__tests__/test-utils";
import {
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
} from "@/Appearance/ClassicyAppearancePackage";
import { CLASSICY_CORE_DEFAULT_THEME } from "@/Appearance/ClassicyCoreTheme";
import { CLASSICY_DEFAULT_APPEARANCE_LAYOUT } from "@/Appearance/useClassicyAppearanceLayout";
import { ClassicyListBox } from "@/SystemFolder/SystemResources/ListBox/ClassicyListBox";
import { ClassicyWindowActiveContext } from "@/SystemFolder/SystemResources/Window/ClassicyWindowActiveContext";

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

// jsdom lays nothing out, so every list here fits.
describe("ClassicyListBox scroll bar while its rows fit", () => {
	afterEach(() => resetClassicyAppearancePackagesForTests());

	const bars = (container: HTMLElement) =>
		container.querySelectorAll<HTMLElement>('[data-classicy-part="scrollbar"]');

	it("draws none by default (Mac OS 8)", () => {
		const { container } = render(<ClassicyListBox id="lb" options={options} />);
		expect(bars(container)).toHaveLength(0);
	});

	it("keeps its vertical bar, fits, under a package that keeps the bars (Standard File's list)", () => {
		resetClassicyAppearancePackagesForTests();
		registerClassicyAppearancePackage({
			id: "test-fits-bars",
			name: "Fits Bars",
			css: "",
			defaults: {
				...CLASSICY_CORE_DEFAULT_THEME,
				id: "test-fits-bars-default",
				package: "test-fits-bars",
			},
			layout: {
				...CLASSICY_DEFAULT_APPEARANCE_LAYOUT,
				scrollBar: { fitsBars: "shown" },
			},
		});
		const { container } = render(<ClassicyListBox id="lb" options={options} />);
		const drawn = bars(container);
		expect(drawn).toHaveLength(1);
		expect(drawn[0].classList.contains("classicyScrollBarVertical")).toBe(true);
		expect(drawn[0].classList.contains("fits")).toBe(true);
	});
});

// WIG Ch.7 "Extended and Multiple Selection List Boxes" (pp.122-123, Figure
// 7.15): "Precede each item in a multiple selection list box with a check
// box ... It also serves to differentiate keyboard navigation from the state
// of a choice" (the audit's 7.25). Opt-in: a list without `checkboxes` is
// unchanged (the tests above).
describe("ClassicyListBox — a check list (checkboxes)", () => {
	const checks = () =>
		document.querySelectorAll('[data-classicy-part="list-check"]');
	const option = (name: string) => screen.getByRole("option", { name });

	it("puts an aria-hidden check part before each row's icon and label, and marks the list", () => {
		render(
			<ClassicyListBox
				id="lb"
				options={[
					{ value: "a", label: "Alpha", icon: "a.png" },
					...options.slice(1),
				]}
				selectionMode="multi"
				checkboxes
			/>,
		);
		expect(checks()).toHaveLength(4);
		const first = option("Alpha");
		expect(first.firstElementChild).toHaveAttribute(
			"data-classicy-part",
			"list-check",
		);
		expect(first.firstElementChild).toHaveAttribute("aria-hidden", "true");
		expect(first.firstElementChild?.nextElementSibling).toHaveClass(
			"classicyListBoxOptionIcon",
		);
		expect(screen.getByRole("listbox")).toHaveClass(
			"classicyListBoxCheckboxes",
		);
	});

	it("draws no check part, and keeps its classes, without checkboxes or in single mode", () => {
		const { unmount } = render(
			<ClassicyListBox id="lb" options={options} selectionMode="multi" />,
		);
		expect(checks()).toHaveLength(0);
		expect(screen.getByRole("listbox")).not.toHaveClass(
			"classicyListBoxCheckboxes",
		);
		unmount();
		render(<ClassicyListBox id="lb" options={options} checkboxes />);
		expect(checks()).toHaveLength(0);
		expect(screen.getByRole("listbox")).not.toHaveClass(
			"classicyListBoxCheckboxes",
		);
	});

	it("toggles a row on a plain click, never replacing or ranging", () => {
		const onChange = vi.fn();
		render(
			<ClassicyListBox
				id="lb"
				options={options}
				selectionMode="multi"
				checkboxes
				onChangeFunc={onChange}
			/>,
		);
		fireEvent.click(option("Beta"));
		expect(onChange).toHaveBeenLastCalledWith(["b"]);
		fireEvent.click(option("Delta"));
		expect(onChange).toHaveBeenLastCalledWith(["b", "d"]);
		fireEvent.click(option("Alpha"), { shiftKey: true });
		expect(onChange).toHaveBeenLastCalledWith(["b", "d", "a"]);
		fireEvent.click(option("Beta"));
		expect(onChange).toHaveBeenLastCalledWith(["d", "a"]);
		expect(option("Beta")).toHaveAttribute("aria-selected", "false");
		expect(option("Delta")).toHaveAttribute("aria-selected", "true");
	});

	it("moves the keyboard row without choosing, and Space toggles it", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		render(
			<ClassicyListBox
				id="lb"
				options={options}
				selectionMode="multi"
				checkboxes
				onChangeFunc={onChange}
			/>,
		);
		fireEvent.click(option("Alpha"));
		expect(onChange).toHaveBeenCalledTimes(1);
		await user.keyboard("{ArrowDown}{ArrowDown}");
		expect(option("Gamma")).toHaveFocus();
		await user.keyboard("{Shift>}{ArrowUp}{/Shift}{End}g");
		expect(onChange).toHaveBeenCalledTimes(1);
		expect(option("Gamma")).toHaveFocus();
		await user.keyboard(" ");
		expect(onChange).toHaveBeenLastCalledWith(["a", "c"]);
		await user.keyboard(" ");
		expect(onChange).toHaveBeenLastCalledWith(["a"]);
	});
});

// WIG Ch.6 "Activating and Deactivating Windows" (p.81): a list box's root
// is its scroll area's, which says whether its window is the active one (the
// audit's 6.4 / 13.8); Windows 98 keeps the LISTBOX's Hilight either way.
describe("ClassicyListBox — inactive", () => {
	it("carries inactive in a window that is not the active one, from its scroll area", () => {
		render(
			<ClassicyWindowActiveContext.Provider value={false}>
				<ClassicyListBox id="lb" options={options} />
			</ClassicyWindowActiveContext.Provider>,
		);
		expect(screen.getByRole("listbox")).toHaveClass("inactive");
	});

	it("does not in the active window, or outside any window", () => {
		const { unmount } = render(
			<ClassicyWindowActiveContext.Provider value={true}>
				<ClassicyListBox id="lb" options={options} />
			</ClassicyWindowActiveContext.Provider>,
		);
		expect(screen.getByRole("listbox")).not.toHaveClass("inactive");
		unmount();
		render(<ClassicyListBox id="lb" options={options} />);
		expect(screen.getByRole("listbox")).not.toHaveClass("inactive");
	});
});
