import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	fireEvent,
	render,
	screen,
	userEvent,
	within,
} from "@/__tests__/test-utils";

vi.mock(
	"@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics",
	() => ({
		useClassicyAnalytics: () => ({ track: vi.fn() }),
	}),
);
vi.mock(
	"@/SystemFolder/SystemResources/ComboBox/ClassicyComboBox.scss",
	() => ({}),
);
vi.mock(
	"@/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu.scss",
	() => ({}),
);
vi.mock("@/SystemFolder/SystemResources/Input/ClassicyInput.scss", () => ({}));
vi.mock(
	"@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel.scss",
	() => ({}),
);

import { ClassicyComboBox } from "@/SystemFolder/SystemResources/ComboBox/ClassicyComboBox";

const options = [
	{ value: "lemon", label: "Lemon" },
	{ value: "lime", label: "Lime" },
	{ value: "peach", label: "Peach" },
	{ value: "plum", label: "Plum" },
];

describe("ClassicyComboBox", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders an ARIA combobox input", () => {
		render(<ClassicyComboBox id="fruit" options={options} />);
		const input = screen.getByRole("combobox");
		expect(input.tagName).toBe("INPUT");
		expect(input).toHaveAttribute("aria-autocomplete", "list");
		expect(input).toHaveAttribute("aria-expanded", "false");
	});

	it("typing opens the list and filters by startsWith", async () => {
		const user = userEvent.setup();
		render(<ClassicyComboBox id="fruit" options={options} />);
		await user.type(screen.getByRole("combobox"), "l");
		const listbox = screen.getByRole("listbox");
		const items = within(listbox).getAllByRole("option");
		expect(items.map((i) => i.textContent)).toEqual(["Lemon", "Lime"]);
	});

	it("filter=contains matches inside labels", async () => {
		const user = userEvent.setup();
		render(<ClassicyComboBox id="fruit" options={options} filter="contains" />);
		await user.type(screen.getByRole("combobox"), "um");
		const items = within(screen.getByRole("listbox")).getAllByRole("option");
		expect(items.map((i) => i.textContent)).toEqual(["Plum"]);
	});

	it("ArrowDown + Enter commits the highlighted suggestion", async () => {
		const user = userEvent.setup();
		const onSelect = vi.fn();
		render(
			<ClassicyComboBox id="fruit" options={options} onSelectFunc={onSelect} />,
		);
		const input = screen.getByRole("combobox");
		await user.type(input, "l");
		await user.keyboard("{ArrowDown}{Enter}");
		expect(onSelect).toHaveBeenCalledWith("lime", options[1]);
		expect(input).toHaveValue("Lime");
		expect(screen.queryByRole("listbox")).toBeNull();
	});

	it("clicking a suggestion commits it", async () => {
		const user = userEvent.setup();
		const onSelect = vi.fn();
		render(
			<ClassicyComboBox id="fruit" options={options} onSelectFunc={onSelect} />,
		);
		await user.type(screen.getByRole("combobox"), "pe");
		await user.click(
			within(screen.getByRole("listbox")).getByRole("option", {
				name: "Peach",
			}),
		);
		expect(onSelect).toHaveBeenCalledWith("peach", options[2]);
		expect(screen.getByRole("combobox")).toHaveValue("Peach");
	});

	it("Escape dismisses the list", async () => {
		const user = userEvent.setup();
		render(<ClassicyComboBox id="fruit" options={options} />);
		await user.type(screen.getByRole("combobox"), "l");
		expect(screen.getByRole("listbox")).toBeInTheDocument();
		await user.keyboard("{Escape}");
		expect(screen.queryByRole("listbox")).toBeNull();
	});

	it("the arrow button shows the full list regardless of the text", async () => {
		const user = userEvent.setup();
		render(
			<ClassicyComboBox id="fruit" options={options} prefillValue="Lem" />,
		);
		await user.click(screen.getByRole("button", { name: "Show options" }));
		expect(
			within(screen.getByRole("listbox")).getAllByRole("option"),
		).toHaveLength(4);
	});

	it("freeText (default) keeps arbitrary text on dismiss", async () => {
		const user = userEvent.setup();
		render(<ClassicyComboBox id="fruit" options={options} />);
		const input = screen.getByRole("combobox");
		await user.type(input, "zzz");
		fireEvent.mouseDown(document.body);
		expect(input).toHaveValue("zzz");
	});

	it("freeText=false reverts unmatched text to the last committed selection", async () => {
		const user = userEvent.setup();
		render(<ClassicyComboBox id="fruit" options={options} freeText={false} />);
		const input = screen.getByRole("combobox");
		// Commit "Lime" first…
		await user.type(input, "li");
		await user.keyboard("{ArrowDown}{Enter}");
		expect(input).toHaveValue("Lime");
		// …then type junk and dismiss: the combo snaps back.
		await user.clear(input);
		await user.type(input, "zzz");
		fireEvent.mouseDown(document.body);
		expect(input).toHaveValue("Lime");
	});

	it("freeText=false normalizes an exact (case-insensitive) label match", async () => {
		const user = userEvent.setup();
		render(<ClassicyComboBox id="fruit" options={options} freeText={false} />);
		const input = screen.getByRole("combobox");
		await user.type(input, "peach");
		fireEvent.mouseDown(document.body);
		expect(input).toHaveValue("Peach");
	});

	it("shows a No matches row when the filter comes up empty", async () => {
		const user = userEvent.setup();
		render(<ClassicyComboBox id="fruit" options={options} />);
		await user.type(screen.getByRole("combobox"), "zzz");
		const listbox = screen.getByRole("listbox");
		expect(within(listbox).queryAllByRole("option")).toHaveLength(0);
		expect(within(listbox).getByText("No matches")).toBeInTheDocument();
	});

	it("is inert when disabled", async () => {
		const user = userEvent.setup();
		render(<ClassicyComboBox id="fruit" options={options} disabled />);
		const input = screen.getByRole("combobox");
		expect(input).toBeDisabled();
		await user.click(screen.getByRole("button", { name: "Show options" }));
		expect(screen.queryByRole("listbox")).toBeNull();
	});
});

describe("ClassicyComboBox — grouped options", () => {
	const grouped = [
		{ value: "none", label: "None" },
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

	it("renders group headers as presentation rows via the arrow button", async () => {
		const user = userEvent.setup();
		render(<ClassicyComboBox id="fruit" options={grouped} />);
		await user.click(screen.getByRole("button", { name: "Show options" }));
		const listbox = screen.getByRole("listbox");
		expect(within(listbox).getAllByRole("option")).toHaveLength(4);
		expect(within(listbox).getByText("Citrus")).toHaveAttribute(
			"role",
			"presentation",
		);
	});

	it("filtering keeps only groups with matching members, headers included", async () => {
		const user = userEvent.setup();
		render(<ClassicyComboBox id="fruit" options={grouped} />);
		await user.type(screen.getByRole("combobox"), "l");
		const listbox = screen.getByRole("listbox");
		const items = within(listbox).getAllByRole("option");
		expect(items.map((i) => i.textContent)).toEqual(["Lemon", "Lime"]);
		expect(within(listbox).getByText("Citrus")).toBeInTheDocument();
		expect(within(listbox).queryByText("Stone")).toBeNull();
	});

	it("commits a grouped suggestion by keyboard, skipping headers", async () => {
		const user = userEvent.setup();
		const onSelect = vi.fn();
		render(
			<ClassicyComboBox id="fruit" options={grouped} onSelectFunc={onSelect} />,
		);
		const input = screen.getByRole("combobox");
		await user.type(input, "l");
		await user.keyboard("{ArrowDown}{Enter}");
		expect(onSelect).toHaveBeenCalledWith(
			"lime",
			expect.objectContaining({ value: "lime" }),
		);
		expect(input).toHaveValue("Lime");
	});

	it("freeText=false settles against grouped members too", async () => {
		const user = userEvent.setup();
		render(<ClassicyComboBox id="fruit" options={grouped} freeText={false} />);
		const input = screen.getByRole("combobox");
		await user.type(input, "peach");
		fireEvent.mouseDown(document.body);
		expect(input).toHaveValue("Peach");
	});
});
