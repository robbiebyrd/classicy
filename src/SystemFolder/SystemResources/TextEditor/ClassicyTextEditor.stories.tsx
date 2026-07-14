import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ClassicyTextEditor } from "./ClassicyTextEditor";

const meta = {
	title: "Controls/TextEditor",
	component: ClassicyTextEditor,
	args: { onChangeFunc: fn() },
} satisfies Meta<typeof ClassicyTextEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		id: "te-default",
		prefillValue: "It was a dark and stormy night…",
	},
};

export const Bordered: Story = {
	args: {
		id: "te-bordered",
		labelTitle: "Notes",
		border: true,
		autoHeight: true,
		prefillValue: "SimpleText uses this editor for plain text files.",
	},
};

export const Disabled: Story = {
	args: {
		id: "te-disabled",
		disabled: true,
		prefillValue: "Read-only content.",
	},
};
