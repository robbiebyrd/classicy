import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ClassicyPopUpMenu } from "./ClassicyPopUpMenu";

const OPTIONS = [
	{ value: "geneva", label: "Geneva" },
	{ value: "chicago", label: "Chicago" },
	{ value: "monaco", label: "Monaco" },
	{ value: "charcoal", label: "Charcoal" },
];

const meta = {
	title: "Controls/PopUpMenu",
	component: ClassicyPopUpMenu,
	args: { options: OPTIONS, onChangeFunc: fn() },
} satisfies Meta<typeof ClassicyPopUpMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: { id: "popup-default", selected: "geneva" },
};

export const WithLabel: Story = {
	args: {
		id: "popup-label",
		label: "Font:",
		labelPosition: "left",
		selected: "chicago",
	},
};

export const Mini: Story = {
	args: { id: "popup-mini", size: "mini", selected: "monaco" },
};

export const Placeholder: Story = {
	args: { id: "popup-placeholder", placeholder: "Select a font…" },
};

export const Disabled: Story = {
	args: { id: "popup-disabled", selected: "charcoal", disabled: true },
};

// Long enough to scroll: opening it should put the *selected* item right over
// the button (Mac OS 8 aligned pop-up, HIG Ch.2) and scroll the list so that
// selection lands on the pointer, rather than always opening from the top.
const MONTHS = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December",
];

export const AlignedLongList: Story = {
	args: {
		id: "popup-aligned",
		label: "Month:",
		labelPosition: "left",
		selected: "september",
		options: MONTHS.map((month) => ({
			value: month.toLowerCase(),
			label: month,
		})),
	},
};

// <optgroup> equivalent: titled, non-selectable groups of options.
export const Grouped: Story = {
	args: {
		id: "popup-grouped",
		label: "Sound:",
		selected: "sosumi",
		options: [
			{ value: "none", label: "None" },
			{
				groupLabel: "Alert Sounds",
				options: [
					{ value: "sosumi", label: "Sosumi" },
					{ value: "quack", label: "Quack" },
					{ value: "wild-eep", label: "Wild Eep" },
				],
			},
			{
				groupLabel: "System Sounds",
				options: [
					{ value: "boot", label: "Boot Chime" },
					{ value: "beep", label: "Simple Beep" },
				],
			},
		],
	},
};
