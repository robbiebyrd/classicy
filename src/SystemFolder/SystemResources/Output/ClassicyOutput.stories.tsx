import type { Meta, StoryObj } from "@storybook/react-vite";
import { ClassicyOutput } from "./ClassicyOutput";

const meta = {
	title: "Controls/Output",
	component: ClassicyOutput,
} satisfies Meta<typeof ClassicyOutput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Plain: Story = {
	args: {
		id: "total",
		label: "Total",
		value: "42 items",
	},
};

export const InsetWell: Story = {
	args: {
		id: "result",
		label: "Result",
		variant: "inset",
		value: "1,024",
	},
	decorators: [(Story) => <div style={{ width: 220 }}>{<Story />}</div>],
};

export const MonoResult: Story = {
	args: {
		id: "checksum",
		label: "Checksum",
		variant: "inset",
		mono: true,
		value: "0x3F2A9C",
	},
	decorators: [(Story) => <div style={{ width: 260 }}>{<Story />}</div>],
};
