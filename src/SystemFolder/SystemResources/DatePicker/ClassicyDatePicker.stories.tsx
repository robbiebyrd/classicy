import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ClassicyDatePicker } from "./ClassicyDatePicker";

const meta = {
	title: "Controls/DatePicker",
	component: ClassicyDatePicker,
	args: { onChangeFunc: fn() },
} satisfies Meta<typeof ClassicyDatePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: { id: "date-default", labelTitle: "Date" },
};

export const Disabled: Story = {
	args: { id: "date-disabled", labelTitle: "Date", disabled: true },
};
