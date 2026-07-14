import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ClassicyTimePicker } from "./ClassicyTimePicker";

const meta = {
	title: "Controls/TimePicker",
	component: ClassicyTimePicker,
	args: { onChangeFunc: fn() },
} satisfies Meta<typeof ClassicyTimePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		id: "time-default",
		labelTitle: "Time",
		prefillValue: new Date("2026-07-14T10:30:00"),
	},
};

export const Disabled: Story = {
	args: {
		id: "time-disabled",
		labelTitle: "Time",
		prefillValue: new Date("2026-07-14T10:30:00"),
		disabled: true,
	},
};
