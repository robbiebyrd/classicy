import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ClassicyButton } from "./ClassicyButton";

const meta = {
	title: "Controls/Button",
	component: ClassicyButton,
	args: {
		children: "OK",
		onClickFunc: fn(),
	},
} satisfies Meta<typeof ClassicyButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const DefaultAction: Story = {
	args: { isDefault: true, children: "Save" },
};

export const Disabled: Story = {
	args: { disabled: true, children: "Disabled" },
};

export const Depressed: Story = {
	args: { depressed: true, children: "Pressed" },
};

export const Small: Story = {
	args: { buttonSize: "small", children: "Small" },
};

export const Square: Story = {
	args: { buttonShape: "square", children: "▸" },
};
