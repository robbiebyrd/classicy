import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ClassicyRadioInput } from "./ClassicyRadioInput";

const meta = {
	title: "Controls/RadioInput",
	component: ClassicyRadioInput,
	args: {
		name: "speed",
		label: "Mouse Speed",
		onClickFunc: fn(),
		inputs: [
			{ id: "slow", label: "Slow" },
			{ id: "medium", label: "Medium", checked: true },
			{ id: "fast", label: "Fast" },
		],
	},
} satisfies Meta<typeof ClassicyRadioInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Columns: Story = {};

export const Rows: Story = {
	args: { align: "rows" },
};

export const Disabled: Story = {
	args: { disabled: true },
};
