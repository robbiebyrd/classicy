import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ClassicyFileInput } from "./ClassicyFileInput";

const meta = {
	title: "Controls/FileInput",
	component: ClassicyFileInput,
	args: { onChangeFunc: fn() },
} satisfies Meta<typeof ClassicyFileInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: { id: "file-default", labelTitle: "Attachment" },
};

export const MultipleImages: Story = {
	args: {
		id: "file-multi",
		labelTitle: "Pictures",
		multiple: true,
		accept: "image/*",
		maxFiles: 5,
		maxFileSizeMb: 10,
	},
};

export const Disabled: Story = {
	args: { id: "file-disabled", labelTitle: "Attachment", disabled: true },
};
