import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ClassicyInput } from "./ClassicyInput";

const meta = {
	title: "Controls/Input",
	component: ClassicyInput,
	args: { onChangeFunc: fn() },
} satisfies Meta<typeof ClassicyInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: { id: "input-default", labelTitle: "Computer Name" },
};

export const Placeholder: Story = {
	args: {
		id: "input-placeholder",
		labelTitle: "Search",
		placeholder: "Find items…",
	},
};

export const LabelLeft: Story = {
	args: {
		id: "input-left",
		labelTitle: "Name:",
		labelPosition: "left",
		prefillValue: "Macintosh HD",
	},
};

export const Disabled: Story = {
	args: { id: "input-disabled", labelTitle: "Serial Number", disabled: true },
};
