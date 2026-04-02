import { describe, expect, it, vi } from "vitest";
import { render, screen, userEvent } from "@/__tests__/test-utils";

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
	it("renders a select with all options", () => {
		render(<ClassicyPopUpMenu id="fruit" options={options} />);
		const select = screen.getByRole("combobox");
		expect(select).toBeInTheDocument();
		expect(screen.getByText("Apple")).toBeInTheDocument();
		expect(screen.getByText("Banana")).toBeInTheDocument();
		expect(screen.getByText("Cherry")).toBeInTheDocument();
	});

	it("pre-selects the option matching the selected prop", () => {
		render(
			<ClassicyPopUpMenu id="fruit" options={options} selected="banana" />,
		);
		const select = screen.getByRole("combobox") as HTMLSelectElement;
		expect(select.value).toBe("banana");
	});

	it("calls onChangeFunc when selection changes", async () => {
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
		await user.selectOptions(screen.getByRole("combobox"), "cherry");
		expect(onChangeFunc).toHaveBeenCalledOnce();
		expect(onChangeFunc.mock.calls[0][0].target.value).toBe("cherry");
	});

	it("renders label text when label prop is provided", () => {
		render(
			<ClassicyPopUpMenu id="fruit" options={options} label="Pick a fruit" />,
		);
		expect(screen.getByText("Pick a fruit")).toBeInTheDocument();
	});

	it("does not render a label when label prop is not provided", () => {
		render(<ClassicyPopUpMenu id="fruit" options={options} />);
		// ClassicyControlLabel renders null when label is empty string or absent
		expect(screen.queryByRole("label")).not.toBeInTheDocument();
		// Verify no label element exists at all
		expect(document.querySelector("label")).not.toBeInTheDocument();
	});
});
