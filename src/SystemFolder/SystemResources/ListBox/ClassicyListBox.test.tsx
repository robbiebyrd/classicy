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

// Under the Windows 98 layout a row is selected at the button-1 press
// (`selection.selectOn` "press", the audit's 5.5 / A.2; WIG Ch.5 "Selection
// with the Mouse", pp.37-38), a press dragged across the rows selects them
// (`selection.dragRange`, 5.3; pp.37-39), and Control with Shift keeps the
// other selections while a double-click opens the whole selection
// (`selection.modifiers` "windows", 5.9 / A.9; p.39; App. A Tables A.2 and
// A.3). Without a package the default layout declares none of it: the
// tests above select at the click.
describe("ClassicyListBox — the mouse under the Windows layout", () => {
	afterEach(() => {
		resetClassicyAppearancePackagesForTests();
		// biome-ignore lint/suspicious/noExplicitAny: jsdom has no elementFromPoint of its own
		delete (document as any).elementFromPoint;
	});
	const useLayout = (selection: Record<string, unknown>) =>
		registerClassicyAppearancePackage({
			id: "windows-list",
			name: "Windows list",
			css: "",
			defaults: {
				...CLASSICY_CORE_DEFAULT_THEME,
				id: "windows-list-default",
				package: "windows-list",
			},
			layout: { ...CLASSICY_DEFAULT_APPEARANCE_LAYOUT, selection },
		});
	const useWindowsLayout = () =>
		useLayout({
			secondaryButton: "select",
			selectOn: "press",
			dragRange: true,
			modifiers: "windows",
		});
	const row = (name: string) => screen.getByRole("option", { name });
	const chosen = () =>
		screen
			.getAllByRole("option")
			.filter((o) => o.getAttribute("aria-selected") === "true")
			.map((o) => o.textContent);
	// Lays the rows out 20 px apart from y 100 in an 80-px viewport (four
	// rows show) and answers the hit test by y, as a browser would.
	const layOut = (container: HTMLElement) => {
		const rows = screen.getAllByRole("option");
		const viewport = container.querySelector(
			".classicyListBoxViewport",
		) as HTMLElement;
		const box = (top: number, height: number) =>
			({
				top,
				bottom: top + height,
				left: 0,
				right: 200,
				width: 200,
				height,
				x: 0,
				y: top,
				toJSON: () => ({}),
			}) as DOMRect;
		viewport.getBoundingClientRect = () => box(100, 80);
		rows.forEach((r, i) => {
			r.getBoundingClientRect = () => box(100 + i * 20, 20);
		});
		document.elementFromPoint = vi.fn(
			(_x: number, y: number) =>
				rows.find((_r, i) => y >= 100 + i * 20 && y < 120 + i * 20) ?? null,
		);
	};
	const yOf = (index: number) => 110 + index * 20;
	const moveTo = (index: number) =>
		fireEvent.mouseMove(document, { clientX: 50, clientY: yOf(index) });

	it("selects a row at the button-1 press, and its click adds nothing", () => {
		useWindowsLayout();
		const onChange = vi.fn();
		render(
			<ClassicyListBox id="lb" options={options} onChangeFunc={onChange} />,
		);
		fireEvent.mouseDown(row("Beta"), { button: 0, detail: 1 });
		expect(onChange).toHaveBeenLastCalledWith(["b"]);
		expect(chosen()).toEqual(["Beta"]);
		fireEvent.mouseUp(row("Beta"));
		fireEvent.click(row("Beta"), { detail: 1 });
		expect(onChange).toHaveBeenCalledTimes(1);
	});

	it("selects at the click alone without the key", () => {
		const onChange = vi.fn();
		render(
			<ClassicyListBox id="lb" options={options} onChangeFunc={onChange} />,
		);
		fireEvent.mouseDown(row("Beta"), { button: 0, detail: 1 });
		expect(onChange).not.toHaveBeenCalled();
		fireEvent.click(row("Beta"), { detail: 1 });
		expect(onChange).toHaveBeenLastCalledWith(["b"]);
	});

	it("keeps a multiple selection a plain press lands in until its click resets it to that row", () => {
		useWindowsLayout();
		const onChange = vi.fn();
		render(
			<ClassicyListBox
				id="lb"
				options={options}
				selectionMode="multi"
				onChangeFunc={onChange}
			/>,
		);
		fireEvent.click(row("Alpha"));
		fireEvent.click(row("Gamma"), { metaKey: true });
		expect(chosen()).toEqual(["Alpha", "Gamma"]);
		onChange.mockClear();
		fireEvent.mouseDown(row("Gamma"), { button: 0, detail: 1 });
		expect(onChange).not.toHaveBeenCalled();
		expect(chosen()).toEqual(["Alpha", "Gamma"]);
		fireEvent.click(row("Gamma"), { detail: 1 });
		expect(onChange).toHaveBeenLastCalledWith(["c"]);
	});

	it("toggles at a Control press, the click toggling nothing more", () => {
		useWindowsLayout();
		render(<ClassicyListBox id="lb" options={options} selectionMode="multi" />);
		fireEvent.click(row("Alpha"));
		fireEvent.mouseDown(row("Gamma"), { button: 0, detail: 1, ctrlKey: true });
		expect(chosen()).toEqual(["Alpha", "Gamma"]);
		fireEvent.click(row("Gamma"), { detail: 1, ctrlKey: true });
		expect(chosen()).toEqual(["Alpha", "Gamma"]);
	});

	it("never selects at a button-2 or middle press", () => {
		useWindowsLayout();
		const onChange = vi.fn();
		render(
			<ClassicyListBox id="lb" options={options} onChangeFunc={onChange} />,
		);
		fireEvent.mouseDown(row("Beta"), { button: 2, detail: 1 });
		fireEvent.mouseDown(row("Beta"), { button: 1, detail: 1 });
		expect(onChange).not.toHaveBeenCalled();
	});

	it("toggles a check list's row at the press", () => {
		useWindowsLayout();
		render(
			<ClassicyListBox
				id="lb"
				options={options}
				selectionMode="multi"
				checkboxes
			/>,
		);
		fireEvent.mouseDown(row("Beta"), { button: 0, detail: 1 });
		expect(chosen()).toEqual(["Beta"]);
		fireEvent.click(row("Beta"), { detail: 1 });
		expect(chosen()).toEqual(["Beta"]);
		fireEvent.mouseDown(row("Delta"), { button: 0, detail: 1 });
		expect(chosen()).toEqual(["Beta", "Delta"]);
	});

	it("sets the anchor's range to the anchor's state at a Control-Shift click, keeping the rest", () => {
		useLayout({ modifiers: "windows" });
		render(<ClassicyListBox id="lb" options={options} selectionMode="multi" />);
		fireEvent.click(row("Alpha"));
		fireEvent.click(row("Gamma"), { metaKey: true });
		// The anchor is Gamma, selected: Gamma to Delta is selected, Alpha kept.
		fireEvent.click(row("Delta"), { metaKey: true, shiftKey: true });
		expect(chosen()).toEqual(["Alpha", "Gamma", "Delta"]);
		// The anchor did not move: Gamma to Beta is selected now.
		fireEvent.click(row("Beta"), { ctrlKey: true, shiftKey: true });
		expect(chosen()).toEqual(["Alpha", "Beta", "Gamma", "Delta"]);
		// Unselected, the anchor clears its range.
		fireEvent.click(row("Gamma"), { metaKey: true });
		fireEvent.click(row("Alpha"), { metaKey: true, shiftKey: true });
		expect(chosen()).toEqual(["Delta"]);
	});

	it("lets Shift win at a Control-Shift click without the key", () => {
		render(<ClassicyListBox id="lb" options={options} selectionMode="multi" />);
		fireEvent.click(row("Alpha"));
		fireEvent.click(row("Gamma"), { metaKey: true });
		fireEvent.click(row("Delta"), { metaKey: true, shiftKey: true });
		expect(chosen()).toEqual(["Gamma", "Delta"]);
	});

	it("opens the selection a double-click's clicks leave, its second press changing nothing", () => {
		useWindowsLayout();
		const onActivateSelection = vi.fn();
		const onActivate = vi.fn();
		render(
			<ClassicyListBox
				id="lb"
				options={options}
				selectionMode="multi"
				onActivateFunc={onActivate}
				onActivateSelection={onActivateSelection}
			/>,
		);
		fireEvent.click(row("Alpha"));
		// A Control double-click on Gamma: the first press adds it, the
		// second (WM_LBUTTONDBLCLK) leaves it, and the set opens.
		fireEvent.mouseDown(row("Gamma"), { button: 0, detail: 1, ctrlKey: true });
		fireEvent.click(row("Gamma"), { detail: 1, ctrlKey: true });
		fireEvent.mouseDown(row("Gamma"), { button: 0, detail: 2, ctrlKey: true });
		fireEvent.click(row("Gamma"), { detail: 2, ctrlKey: true });
		fireEvent.doubleClick(row("Gamma"), { ctrlKey: true });
		expect(chosen()).toEqual(["Alpha", "Gamma"]);
		expect(onActivateSelection).toHaveBeenCalledWith(["a", "c"]);
		expect(onActivate).not.toHaveBeenCalled();
	});

	it("opens the double-clicked row alone without the key, or without onActivateSelection", () => {
		const onActivateSelection = vi.fn();
		const onActivate = vi.fn();
		const { unmount } = render(
			<ClassicyListBox
				id="lb"
				options={options}
				selectionMode="multi"
				onActivateFunc={onActivate}
				onActivateSelection={onActivateSelection}
			/>,
		);
		fireEvent.click(row("Alpha"));
		fireEvent.click(row("Gamma"), { metaKey: true });
		fireEvent.doubleClick(row("Gamma"));
		expect(onActivate).toHaveBeenCalledWith("c");
		expect(onActivateSelection).not.toHaveBeenCalled();
		unmount();
		useWindowsLayout();
		onActivate.mockClear();
		render(
			<ClassicyListBox
				id="lb"
				options={options}
				selectionMode="multi"
				onActivateFunc={onActivate}
			/>,
		);
		fireEvent.doubleClick(row("Beta"));
		expect(onActivate).toHaveBeenCalledWith("b");
	});

	it("selects the rows a press drags across, from the press to the release", () => {
		useWindowsLayout();
		const onChange = vi.fn();
		const { container } = render(
			<ClassicyListBox
				id="lb"
				options={options}
				selectionMode="multi"
				onChangeFunc={onChange}
			/>,
		);
		layOut(container);
		fireEvent.mouseDown(row("Beta"), { button: 0, detail: 1, clientY: yOf(1) });
		moveTo(3);
		expect(chosen()).toEqual(["Beta", "Gamma", "Delta"]);
		expect(onChange).toHaveBeenLastCalledWith(["b", "c", "d"]);
		// Back up past the anchor: the range turns round it.
		moveTo(0);
		expect(chosen()).toEqual(["Alpha", "Beta"]);
		fireEvent.mouseUp(document);
		moveTo(3);
		expect(chosen()).toEqual(["Alpha", "Beta"]);
	});

	it("keeps the selection a Control drag found, setting its range to the anchor's state", () => {
		useWindowsLayout();
		const { container } = render(
			<ClassicyListBox id="lb" options={options} selectionMode="multi" />,
		);
		layOut(container);
		fireEvent.click(row("Delta"));
		fireEvent.mouseDown(row("Alpha"), {
			button: 0,
			detail: 1,
			ctrlKey: true,
			clientY: yOf(0),
		});
		moveTo(1);
		expect(chosen()).toEqual(["Alpha", "Beta", "Delta"]);
		// Released with Control up: the press's modifiers still govern.
		fireEvent.mouseUp(document);
		// A Control drag from a selected row takes its range out.
		fireEvent.mouseDown(row("Beta"), {
			button: 0,
			detail: 1,
			ctrlKey: true,
			clientY: yOf(1),
		});
		moveTo(3);
		expect(chosen()).toEqual(["Alpha"]);
		fireEvent.mouseUp(document);
	});

	it("drags a Shift range from the anchor, and moves a single selection with the pointer", () => {
		useWindowsLayout();
		const { container, unmount } = render(
			<ClassicyListBox id="lb" options={options} selectionMode="multi" />,
		);
		layOut(container);
		fireEvent.click(row("Beta"));
		fireEvent.mouseDown(row("Gamma"), {
			button: 0,
			detail: 1,
			shiftKey: true,
			clientY: yOf(2),
		});
		expect(chosen()).toEqual(["Beta", "Gamma"]);
		moveTo(3);
		expect(chosen()).toEqual(["Beta", "Gamma", "Delta"]);
		fireEvent.mouseUp(document);
		unmount();
		const single = render(<ClassicyListBox id="lb" options={options} />);
		layOut(single.container);
		fireEvent.mouseDown(row("Alpha"), {
			button: 0,
			detail: 1,
			clientY: yOf(0),
		});
		moveTo(2);
		expect(chosen()).toEqual(["Gamma"]);
		fireEvent.mouseUp(document);
	});

	it("passes over a dimmed row and counts the last row shown below the list", () => {
		useWindowsLayout();
		const dimmed = options.map((o) =>
			o.value === "c" ? { ...o, disabled: true } : o,
		);
		const { container } = render(
			<ClassicyListBox id="lb" options={dimmed} selectionMode="multi" />,
		);
		layOut(container);
		fireEvent.mouseDown(row("Alpha"), {
			button: 0,
			detail: 1,
			clientY: yOf(0),
		});
		moveTo(2);
		expect(chosen()).toEqual(["Alpha"]);
		fireEvent.mouseMove(document, { clientX: 50, clientY: 400 });
		expect(chosen()).toEqual(["Alpha", "Beta", "Delta"]);
		fireEvent.mouseUp(document);
	});

	it("selects nothing across a drag without the key, or with a press selection alone", () => {
		const { container, unmount } = render(
			<ClassicyListBox id="lb" options={options} selectionMode="multi" />,
		);
		layOut(container);
		fireEvent.mouseDown(row("Alpha"), {
			button: 0,
			detail: 1,
			clientY: yOf(0),
		});
		moveTo(2);
		fireEvent.mouseUp(document);
		expect(chosen()).toEqual([]);
		unmount();
		useLayout({ selectOn: "press" });
		const pressOnly = render(
			<ClassicyListBox id="lb" options={options} selectionMode="multi" />,
		);
		layOut(pressOnly.container);
		fireEvent.mouseDown(row("Alpha"), {
			button: 0,
			detail: 1,
			clientY: yOf(0),
		});
		moveTo(2);
		fireEvent.mouseUp(document);
		expect(chosen()).toEqual(["Alpha"]);
	});
});
