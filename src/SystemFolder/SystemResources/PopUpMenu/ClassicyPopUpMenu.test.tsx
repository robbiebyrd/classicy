import { describe, expect, it, vi } from "vitest";
import { render, screen, userEvent, within } from "@/__tests__/test-utils";

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

describe("ClassicyPopUpMenu", () => {
	it("renders a trigger button showing the selected option", () => {
		render(
			<ClassicyPopUpMenu id="fruit" options={options} selected="banana" />,
		);
		expect(screen.getByRole("button")).toHaveTextContent("Banana");
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
		await user.click(screen.getByRole("button"));
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
		await user.click(screen.getByRole("button"));
		await user.click(screen.getByRole("option", { name: "Cherry" }));
		expect(onChangeFunc).toHaveBeenCalledOnce();
		expect(onChangeFunc.mock.calls[0][0].target.value).toBe("cherry");
		// Menu closes and the trigger reflects the new value.
		expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
		expect(screen.getByRole("button")).toHaveTextContent("Cherry");
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
		await user.click(screen.getByRole("button"));
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
		await user.click(screen.getByRole("button", { name: "Apple" }));
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
		screen.getByRole("button").focus();
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
		screen.getByRole("button").focus();
		await user.keyboard("{ArrowDown}");
		expect(screen.getByRole("listbox")).toBeInTheDocument();
		await user.keyboard("{Escape}");
		expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
		expect(onChangeFunc).not.toHaveBeenCalled();
	});

	it("does not open when disabled", async () => {
		const user = userEvent.setup();
		render(<ClassicyPopUpMenu id="fruit" options={options} disabled />);
		const btn = screen.getByRole("button");
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

	it("shows the placeholder when nothing is selected", () => {
		render(
			<ClassicyPopUpMenu id="fruit" options={options} placeholder="Choose…" />,
		);
		expect(screen.getByRole("button")).toHaveTextContent("Choose…");
	});
});
