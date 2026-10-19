import type { Meta, StoryObj } from "@storybook/react-vite";
import { ClassicyOutput } from "./ClassicyOutput";

const meta = {
	title: "Controls/Output",
	component: ClassicyOutput,
} satisfies Meta<typeof ClassicyOutput>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Plain static text with its label to the left — a "Total: 42 items" row. */
export const Plain: Story = {
	args: {
		id: "total",
		label: "Total",
		value: "42 items",
	},
};

/** `variant="inset"`: the white beveled result well, like a calculator display. */
export const InsetWell: Story = {
	args: {
		id: "result",
		label: "Result",
		variant: "inset",
		value: "1,024",
	},
	decorators: [(Story) => <div style={{ width: 220 }}>{<Story />}</div>],
};

/** `mono` sets the result in the monospaced font, for numeric or tabular values. */
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

/** `disabled` dims the field and its label — the HIG's inactive static text. */
export const Disabled: Story = {
	args: {
		id: "estimate",
		label: "Estimated time",
		value: "About 2 minutes",
		disabled: true,
	},
};

/**
 * The result passed as `children`, with `htmlFor` naming the inputs that
 * produced it (rendered as the `<output>`'s `for` attribute).
 */
export const FromChildren: Story = {
	args: {
		id: "sum",
		label: "Sum",
		variant: "inset",
		htmlFor: ["sum-a", "sum-b"],
		children: (
			<>
				<b>12</b> + <b>30</b> = <b>42</b>
			</>
		),
	},
	decorators: [(Story) => <div style={{ width: 220 }}>{<Story />}</div>],
};
