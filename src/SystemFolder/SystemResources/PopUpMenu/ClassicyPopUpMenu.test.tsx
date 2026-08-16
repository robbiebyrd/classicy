import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, userEvent, within } from "@/__tests__/test-utils";

vi.mock(
	"@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics",
	() => ({
		useClassicyAnalytics: () => ({ track: vi.fn() }),
	}),
);

vi.mock(
	"@/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu.scss",
	() => ({}),
);
vi.mock(
	"@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel.scss",
	() => ({}),
);

import { ClassicyPopUpMenu } from "@/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu";

const options = [
	{ value: "apple", label: "Apple" },
	{ value: "banana", label: "Banana" },
	{ value: "cherry", label: "Cherry" },
];

// Long enough to overflow the menu's max-height and require scrolling.
const many = Array.from({ length: 40 }, (_, i) => ({
	value: `opt-${i}`,
	label: `Option ${i}`,
}));

describe("ClassicyPopUpMenu", () => {
	it("renders a trigger button showing the selected option", () => {
		render(
			<ClassicyPopUpMenu id="fruit" options={options} selected="banana" />,
		);
		expect(screen.getByRole("combobox")).toHaveTextContent("Banana");
	});

	it("puts the id on the visible control and reflects its value and disabled state (no hidden <select>)", () => {
		const { container } = render(
			<ClassicyPopUpMenu
				id="fruit"
				options={options}
				selected="apple"
				disabled
			/>,
		);
		// No hidden native <select> mirror anymore.
		expect(container.querySelector("select")).toBeNull();

		// The id lives on the visible custom control (a <button>), which shows
		// the selected value and reflects disabled via the attribute, aria and class.
		const control = container.querySelector("#fruit") as HTMLButtonElement;
		expect(control).not.toBeNull();
		expect(control.tagName).toBe("BUTTON");
		expect(control).toHaveTextContent("Apple");
		expect(control).toBeDisabled();
		expect(control).toHaveAttribute("aria-disabled", "true");
		expect(control).toHaveClass("classicyPopUpMenuButtonDisabled");
	});

	it("opens the menu on click and marks the current item with a checkmark", async () => {
		const user = userEvent.setup();
		render(
			<ClassicyPopUpMenu id="fruit" options={options} selected="banana" />,
		);
		await user.click(screen.getByRole("combobox"));
		const listbox = screen.getByRole("listbox");
		expect(within(listbox).getAllByRole("option")).toHaveLength(3);
		const current = within(listbox).getByRole("option", { name: "Banana" });
		expect(current).toHaveAttribute("aria-selected", "true");
		expect(current).toHaveTextContent("✓");
		// Non-current items carry no checkmark.
		expect(
			within(listbox).getByRole("option", { name: "Apple" }),
		).not.toHaveTextContent("✓");
	});

	it("selecting an option updates the value and fires onChangeFunc with target.value", async () => {
		const user = userEvent.setup();
		const onChangeFunc = vi.fn();
		render(
			<ClassicyPopUpMenu
				id="fruit"
				options={options}
				selected="apple"
				onChangeFunc={onChangeFunc}
			/>,
		);
		await user.click(screen.getByRole("combobox"));
		await user.click(screen.getByRole("option", { name: "Cherry" }));
		expect(onChangeFunc).toHaveBeenCalledOnce();
		expect(onChangeFunc.mock.calls[0][0].target.value).toBe("cherry");
		// Menu closes and the trigger reflects the new value.
		expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
		expect(screen.getByRole("combobox")).toHaveTextContent("Cherry");
	});

	it("re-selecting the current option closes without firing onChangeFunc", async () => {
		const user = userEvent.setup();
		const onChangeFunc = vi.fn();
		render(
			<ClassicyPopUpMenu
				id="fruit"
				options={options}
				selected="apple"
				onChangeFunc={onChangeFunc}
			/>,
		);
		await user.click(screen.getByRole("combobox"));
		await user.click(screen.getByRole("option", { name: "Apple" }));
		expect(onChangeFunc).not.toHaveBeenCalled();
		expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
	});

	it("clicking outside closes the menu with no change", async () => {
		const user = userEvent.setup();
		const onChangeFunc = vi.fn();
		render(
			<div>
				<ClassicyPopUpMenu
					id="fruit"
					options={options}
					selected="apple"
					onChangeFunc={onChangeFunc}
				/>
				<button type="button">outside</button>
			</div>,
		);
		const trigger = screen.getByRole("combobox");
		expect(trigger).toHaveTextContent("Apple");
		await user.click(trigger);
		expect(screen.getByRole("listbox")).toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "outside" }));
		expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
		expect(onChangeFunc).not.toHaveBeenCalled();
	});

	it("supports keyboard navigation: ArrowDown opens, ArrowDown moves, Enter commits", async () => {
		const user = userEvent.setup();
		const onChangeFunc = vi.fn();
		render(
			<ClassicyPopUpMenu
				id="fruit"
				options={options}
				selected="apple"
				onChangeFunc={onChangeFunc}
			/>,
		);
		screen.getByRole("combobox").focus();
		await user.keyboard("{ArrowDown}"); // opens, highlights current (apple)
		expect(screen.getByRole("listbox")).toBeInTheDocument();
		await user.keyboard("{ArrowDown}"); // -> banana
		await user.keyboard("{Enter}"); // commit
		expect(onChangeFunc).toHaveBeenCalledOnce();
		expect(onChangeFunc.mock.calls[0][0].target.value).toBe("banana");
	});

	it("Escape closes the menu without a change", async () => {
		const user = userEvent.setup();
		const onChangeFunc = vi.fn();
		render(
			<ClassicyPopUpMenu
				id="fruit"
				options={options}
				selected="apple"
				onChangeFunc={onChangeFunc}
			/>,
		);
		screen.getByRole("combobox").focus();
		await user.keyboard("{ArrowDown}");
		expect(screen.getByRole("listbox")).toBeInTheDocument();
		await user.keyboard("{Escape}");
		expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
		expect(onChangeFunc).not.toHaveBeenCalled();
	});

	it("does not open when disabled", async () => {
		const user = userEvent.setup();
		render(<ClassicyPopUpMenu id="fruit" options={options} disabled />);
		const btn = screen.getByRole("combobox");
		expect(btn).toBeDisabled();
		await user.click(btn);
		expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
	});

	it("renders label text when the label prop is provided", () => {
		render(
			<ClassicyPopUpMenu id="fruit" options={options} label="Pick a fruit" />,
		);
		expect(screen.getByText("Pick a fruit")).toBeInTheDocument();
	});

	it("exposes an accessible name on the trigger from the selected value when no label prop is given", () => {
		render(
			<ClassicyPopUpMenu id="fruit" options={options} selected="banana" />,
		);
		expect(
			screen.getByRole("combobox", { name: "Banana" }),
		).toBeInTheDocument();
	});

	it("uses the label prop as the trigger's accessible name when provided", () => {
		render(
			<ClassicyPopUpMenu
				id="fruit"
				options={options}
				selected="banana"
				label="Pick a fruit"
			/>,
		);
		expect(
			screen.getByRole("combobox", { name: "Pick a fruit" }),
		).toBeInTheDocument();
	});

	it("shows the placeholder when nothing is selected", () => {
		render(
			<ClassicyPopUpMenu id="fruit" options={options} placeholder="Choose…" />,
		);
		expect(screen.getByRole("combobox")).toHaveTextContent("Choose…");
	});

	it("keeps DOM focus on the trigger button after opening (so keys reach the handler)", async () => {
		const user = userEvent.setup();
		render(<ClassicyPopUpMenu id="fruit" options={options} selected="apple" />);
		const btn = screen.getByRole("combobox");
		await user.click(btn); // open via mouse
		expect(screen.getByRole("listbox")).toBeInTheDocument();
		expect(btn).toHaveFocus();
	});

	it("wires aria-controls and aria-activedescendant to the highlighted option", async () => {
		const user = userEvent.setup();
		render(<ClassicyPopUpMenu id="fruit" options={options} selected="apple" />);
		const btn = screen.getByRole("combobox");
		await user.click(btn);
		const listbox = screen.getByRole("listbox");
		expect(listbox.id).toBeTruthy();
		expect(btn).toHaveAttribute("aria-controls", listbox.id);
		// highlight starts on the current selection (Apple, index 0)
		const apple = within(listbox).getByRole("option", { name: "Apple" });
		expect(btn).toHaveAttribute("aria-activedescendant", apple.id);
		await user.keyboard("{ArrowDown}"); // -> Banana
		const banana = within(listbox).getByRole("option", { name: "Banana" });
		expect(btn).toHaveAttribute("aria-activedescendant", banana.id);
	});

	it("type-ahead while open moves the highlight to the matching option", async () => {
		const user = userEvent.setup();
		const onChangeFunc = vi.fn();
		render(
			<ClassicyPopUpMenu
				id="fruit"
				options={options}
				selected="apple"
				onChangeFunc={onChangeFunc}
			/>,
		);
		await user.click(screen.getByRole("combobox"));
		await user.keyboard("b"); // -> Banana
		const listbox = screen.getByRole("listbox");
		const banana = within(listbox).getByRole("option", { name: "Banana" });
		expect(screen.getByRole("combobox")).toHaveAttribute(
			"aria-activedescendant",
			banana.id,
		);
		await user.keyboard("{Enter}");
		expect(onChangeFunc.mock.calls[0][0].target.value).toBe("banana");
	});

	it("type-ahead while closed opens the menu and highlights the match (no silent change)", async () => {
		const user = userEvent.setup();
		const onChangeFunc = vi.fn();
		render(
			<ClassicyPopUpMenu
				id="fruit"
				options={options}
				selected="apple"
				onChangeFunc={onChangeFunc}
			/>,
		);
		screen.getByRole("combobox").focus();
		await user.keyboard("c"); // opens, highlights Cherry
		const listbox = screen.getByRole("listbox");
		expect(listbox).toBeInTheDocument();
		const cherry = within(listbox).getByRole("option", { name: "Cherry" });
		expect(screen.getByRole("combobox")).toHaveAttribute(
			"aria-activedescendant",
			cherry.id,
		);
		expect(onChangeFunc).not.toHaveBeenCalled(); // typing did not commit
		await user.keyboard("{Enter}");
		expect(onChangeFunc.mock.calls[0][0].target.value).toBe("cherry");
	});

	it("renders the open list outside a clipping ancestor (portaled to the body)", async () => {
		const user = userEvent.setup();
		render(
			<div style={{ overflow: "hidden" }} data-testid="clip">
				<ClassicyPopUpMenu id="fruit" options={options} selected="apple" />
			</div>,
		);
		await user.click(screen.getByRole("combobox"));
		const listbox = screen.getByRole("listbox");
		// Portaled: present in the document but NOT nested in the clipping wrapper.
		expect(document.body).toContainElement(listbox);
		expect(screen.getByTestId("clip")).not.toContainElement(listbox);
	});

	it("commits an option click even when portaled out of a clipping wrapper", async () => {
		const user = userEvent.setup();
		const onChangeFunc = vi.fn();
		render(
			<div style={{ overflow: "hidden" }}>
				<ClassicyPopUpMenu
					id="fruit"
					options={options}
					selected="apple"
					onChangeFunc={onChangeFunc}
				/>
			</div>,
		);
		await user.click(screen.getByRole("combobox"));
		await user.click(screen.getByRole("option", { name: "Cherry" }));
		expect(onChangeFunc.mock.calls[0][0].target.value).toBe("cherry");
		expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
	});

	it("type-ahead buffers characters typed within the reset window", async () => {
		const user = userEvent.setup();
		const local = [
			{ value: "apple", label: "Apple" },
			{ value: "apricot", label: "Apricot" },
			{ value: "banana", label: "Banana" },
		];
		render(<ClassicyPopUpMenu id="fruit" options={local} selected="banana" />);
		await user.click(screen.getByRole("combobox"));
		await user.keyboard("apr"); // buffer "apr" -> Apricot, not first-"a" Apple
		const listbox = screen.getByRole("listbox");
		const apricot = within(listbox).getByRole("option", { name: "Apricot" });
		expect(screen.getByRole("combobox")).toHaveAttribute(
			"aria-activedescendant",
			apricot.id,
		);
	});

	it("closes on scroll", async () => {
		const user = userEvent.setup();
		render(<ClassicyPopUpMenu id="fruit" options={options} selected="apple" />);
		await user.click(screen.getByRole("combobox"));
		expect(screen.getByRole("listbox")).toBeInTheDocument();
		act(() => {
			window.dispatchEvent(new Event("scroll"));
		});
		expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
	});

	it("closes on window resize", async () => {
		const user = userEvent.setup();
		render(<ClassicyPopUpMenu id="fruit" options={options} selected="apple" />);
		await user.click(screen.getByRole("combobox"));
		expect(screen.getByRole("listbox")).toBeInTheDocument();
		act(() => {
			window.dispatchEvent(new Event("resize"));
		});
		expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
	});

	it("stays open while scrolling inside its own list", async () => {
		const user = userEvent.setup();
		render(<ClassicyPopUpMenu id="fruit" options={many} selected="opt-0" />);
		await user.click(screen.getByRole("combobox"));
		const listbox = screen.getByRole("listbox");
		// The dismiss-on-scroll listener is registered on `window` in the capture
		// phase, so a scroll inside the list itself reaches it even though scroll
		// events do not bubble. It must ignore scrolls that originate in the menu.
		act(() => {
			listbox.dispatchEvent(new Event("scroll", { bubbles: false }));
		});
		expect(screen.getByRole("listbox")).toBeInTheDocument();
	});

	it("keeps the highlighted option scrolled into view during keyboard navigation", async () => {
		const user = userEvent.setup();
		const scrollIntoView = vi.fn();
		// jsdom does not implement scrollIntoView at all, so define it rather than spy.
		Object.defineProperty(Element.prototype, "scrollIntoView", {
			value: scrollIntoView,
			configurable: true,
			writable: true,
		});
		render(<ClassicyPopUpMenu id="fruit" options={many} selected="opt-0" />);
		await user.click(screen.getByRole("combobox"));
		scrollIntoView.mockClear();
		await user.keyboard("{ArrowDown}");
		expect(scrollIntoView).toHaveBeenCalled();
	});

	describe("viewport-aware placement", () => {
		const layout = ({
			top,
			height = 20,
			viewportHeight,
			contentHeight,
		}: {
			top: number;
			height?: number;
			viewportHeight: number;
			contentHeight: number;
		}) => {
			vi.spyOn(
				HTMLButtonElement.prototype,
				"getBoundingClientRect",
			).mockReturnValue({
				top,
				bottom: top + height,
				height,
				left: 40,
				right: 240,
				width: 200,
				x: 40,
				y: top,
				toJSON: () => ({}),
			} as DOMRect);
			vi.spyOn(Element.prototype, "scrollHeight", "get").mockReturnValue(
				contentHeight,
			);
			window.innerHeight = viewportHeight;
		};

		afterEach(() => {
			vi.restoreAllMocks();
		});

		it("anchors below the button when the menu fits below", async () => {
			const user = userEvent.setup();
			layout({ top: 100, viewportHeight: 800, contentHeight: 200 });
			render(<ClassicyPopUpMenu id="fruit" options={many} selected="opt-0" />);
			await user.click(screen.getByRole("combobox"));
			const listbox = screen.getByRole("listbox");
			expect(listbox.style.top).toBe("100px");
			expect(listbox.style.bottom).toBe("");
			expect(listbox).not.toHaveClass("classicyPopUpMenuListAbove");
		});

		it("expands above the button when there is not enough room below", async () => {
			const user = userEvent.setup();
			layout({ top: 700, viewportHeight: 800, contentHeight: 400 });
			render(<ClassicyPopUpMenu id="fruit" options={many} selected="opt-0" />);
			await user.click(screen.getByRole("combobox"));
			const listbox = screen.getByRole("listbox");
			// Grows upward from the button's bottom edge (720) -> 80px from the
			// viewport bottom, with `top` released so the list extends upward.
			expect(listbox.style.bottom).toBe("80px");
			expect(listbox.style.top).toBe("");
			expect(listbox).toHaveClass("classicyPopUpMenuListAbove");
		});

		it("clamps max-height to the available space so the list scrolls instead of overflowing", async () => {
			const user = userEvent.setup();
			layout({ top: 600, viewportHeight: 700, contentHeight: 5000 });
			render(<ClassicyPopUpMenu id="fruit" options={many} selected="opt-0" />);
			await user.click(screen.getByRole("combobox"));
			const listbox = screen.getByRole("listbox");
			const maxHeight = Number.parseInt(listbox.style.maxHeight, 10);
			expect(maxHeight).toBeGreaterThan(0);
			expect(maxHeight).toBeLessThanOrEqual(window.innerHeight);
		});
	});
});

describe("ClassicyPopUpMenu — option groups (<optgroup> equivalent)", () => {
	const grouped = [
		{ value: "loose", label: "Loose" },
		{
			groupLabel: "Citrus",
			options: [
				{ value: "lemon", label: "Lemon" },
				{ value: "lime", label: "Lime" },
			],
		},
		{
			groupLabel: "Stone",
			options: [{ value: "peach", label: "Peach" }],
		},
	];

	it("renders group headers as non-selectable presentation rows", async () => {
		const user = userEvent.setup();
		render(<ClassicyPopUpMenu id="fruit" options={grouped} selected="lemon" />);
		await user.click(screen.getByRole("combobox"));
		const listbox = screen.getByRole("listbox");
		// Only real options carry the option role — headers are invisible to AT.
		expect(within(listbox).getAllByRole("option")).toHaveLength(4);
		const header = within(listbox).getByText("Citrus");
		expect(header).toHaveAttribute("role", "presentation");
		expect(header).toHaveClass("classicyPopUpMenuGroupHeader");
	});

	it("indents group members and marks them grouped", async () => {
		const user = userEvent.setup();
		render(<ClassicyPopUpMenu id="fruit" options={grouped} selected="lemon" />);
		await user.click(screen.getByRole("combobox"));
		const listbox = screen.getByRole("listbox");
		expect(within(listbox).getByRole("option", { name: "Lime" })).toHaveClass(
			"classicyPopUpMenuListItemGrouped",
		);
		expect(
			within(listbox).getByRole("option", { name: "Loose" }),
		).not.toHaveClass("classicyPopUpMenuListItemGrouped");
	});

	it("clicking a group header neither selects nor closes", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		render(
			<ClassicyPopUpMenu
				id="fruit"
				options={grouped}
				selected="lemon"
				onChangeFunc={onChange}
			/>,
		);
		await user.click(screen.getByRole("combobox"));
		await user.click(screen.getByText("Citrus"));
		expect(onChange).not.toHaveBeenCalled();
		expect(screen.getByRole("listbox")).toBeInTheDocument();
	});

	it("arrow keys walk options straight across group boundaries", async () => {
		const user = userEvent.setup();
		render(<ClassicyPopUpMenu id="fruit" options={grouped} selected="loose" />);
		const button = screen.getByRole("combobox");
		await user.click(button);
		// Highlight starts on the current option ("Loose", flat index 0);
		// one ArrowDown lands on "Lemon", skipping the "Citrus" header.
		await user.keyboard("{ArrowDown}");
		const active = document.getElementById(
			button.getAttribute("aria-activedescendant") as string,
		);
		expect(active).toHaveTextContent("Lemon");
	});

	it("End jumps to the last option, not the last row", async () => {
		const user = userEvent.setup();
		render(<ClassicyPopUpMenu id="fruit" options={grouped} selected="loose" />);
		const button = screen.getByRole("combobox");
		await user.click(button);
		await user.keyboard("{End}");
		const active = document.getElementById(
			button.getAttribute("aria-activedescendant") as string,
		);
		expect(active).toHaveTextContent("Peach");
	});

	it("type-ahead matches option labels, never header labels", async () => {
		const user = userEvent.setup();
		render(<ClassicyPopUpMenu id="fruit" options={grouped} selected="loose" />);
		const button = screen.getByRole("combobox");
		await user.click(button);
		// "C" is the "Citrus" header's initial; no option starts with it, so the
		// highlight must not move.
		const before = button.getAttribute("aria-activedescendant");
		await user.keyboard("c");
		expect(button.getAttribute("aria-activedescendant")).toBe(before);
		// "P" jumps to the option "Peach" inside a group.
		await user.keyboard("p");
		const active = document.getElementById(
			button.getAttribute("aria-activedescendant") as string,
		);
		expect(active).toHaveTextContent("Peach");
	});

	it("commits a grouped option by keyboard", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		render(
			<ClassicyPopUpMenu
				id="fruit"
				options={grouped}
				selected="loose"
				onChangeFunc={onChange}
			/>,
		);
		await user.click(screen.getByRole("combobox"));
		await user.keyboard("{ArrowDown}{Enter}");
		expect(onChange).toHaveBeenCalledTimes(1);
		expect(onChange.mock.calls[0][0].target.value).toBe("lemon");
	});
});
