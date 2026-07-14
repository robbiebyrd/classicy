import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ClassicyCheckbox } from "./ClassicyCheckbox";

const meta = {
	title: "Controls/Checkbox",
	component: ClassicyCheckbox,
	args: { onClickFunc: fn() },
} satisfies Meta<typeof ClassicyCheckbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Checked: Story = {
	args: { id: "cb-checked", checked: true, label: "Enable AppleTalk" },
};

export const Unchecked: Story = {
	args: { id: "cb-unchecked", checked: false, label: "Show Balloons" },
};

export const Mixed: Story = {
	args: { id: "cb-mixed", mixed: true, label: "Partially Selected" },
};

export const Disabled: Story = {
	args: { id: "cb-disabled", disabled: true, checked: true, label: "Locked" },
};
