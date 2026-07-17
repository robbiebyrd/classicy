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
