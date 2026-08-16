import type { Meta, StoryObj } from "@storybook/react-vite";
import { ClassicyListBox } from "./ClassicyListBox";

const meta = {
	title: "Controls/ListBox",
	component: ClassicyListBox,
	decorators: [(Story) => <div style={{ width: 240 }}>{<Story />}</div>],
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

export const Single: Story = {
	args: {
		id: "listbox-single",
		label: "Font",
		options: fonts,
	},
};

// ⌘/Ctrl-click toggles, Shift-click (or Shift-arrows) extends a range.
export const MultiSelect: Story = {
	args: {
		id: "listbox-multi",
		label: "Install fonts",
		selectionMode: "multi",
		options: fonts,
	},
};

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
