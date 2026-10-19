import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fn } from "storybook/test";
import { ClassicyListBox } from "./ClassicyListBox";

const meta = {
	title: "Controls/ListBox",
	component: ClassicyListBox,
	decorators: [(Story) => <div style={{ width: 240 }}>{<Story />}</div>],
	args: { onChangeFunc: fn(), onActivateFunc: fn() },
} satisfies Meta<typeof ClassicyListBox>;

export default meta;
type Story = StoryObj<typeof meta>;

const fonts = [
	{ value: "chicago", label: "Chicago" },
	{ value: "charcoal", label: "Charcoal" },
	{ value: "geneva", label: "Geneva" },
	{ value: "monaco", label: "Monaco" },
	{ value: "new-york", label: "New York" },
	{ value: "palatino", label: "Palatino" },
];

/**
 * Single selection (the default). Tab in, then use the arrows or type a name:
 * the selection follows the keyboard, and Enter or a double-click activates.
 */
export const Single: Story = {
	args: {
		id: "listbox-single",
		label: "Font",
		options: fonts,
	},
};

/** Multi selection: ⌘/Ctrl-click toggles, Shift-click (or Shift-arrows) extends a range. */
export const MultiSelect: Story = {
	args: {
		id: "listbox-multi",
		label: "Install fonts",
		selectionMode: "multi",
		options: fonts,
	},
};

/**
 * `visibleRows` caps the height at four rows so the list scrolls; a disabled
 * option is dimmed and cannot be selected.
 */
export const ScrollingWithDisabled: Story = {
	args: {
		id: "listbox-scroll",
		label: "Choose a printer",
		visibleRows: 4,
		options: [
			{ value: "lw", label: "LaserWriter 8500" },
			{ value: "sw", label: "StyleWriter 1200" },
			{ value: "iw", label: "ImageWriter II", disabled: true },
			{ value: "cl", label: "Color LaserWriter" },
			{ value: "dw", label: "DeskWriter 600" },
			{ value: "pb", label: "Personal LaserWriter" },
		],
	},
};

/**
 * Controlled use: the story owns `selected` and feeds `onChangeFunc` back into
 * it, starting with two fonts already chosen.
 */
export const Controlled: Story = {
	args: {
		id: "listbox-controlled",
		label: "Install fonts",
		selectionMode: "multi",
		options: fonts,
	},
	render: (args) => {
		const [selected, setSelected] = useState(["geneva", "monaco"]);
		return (
			<ClassicyListBox
				{...args}
				selected={selected}
				onChangeFunc={(values) => {
					args.onChangeFunc?.(values);
					setSelected(values);
				}}
			/>
		);
	},
};
