import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ClassicyBevelButton } from "./ClassicyBevelButton";

const meta = {
	title: "Controls/BevelButton",
	component: ClassicyBevelButton,
	args: {
		children: "Tool",
		onClickFunc: fn(),
		onChangeFunc: fn(),
	},
} satisfies Meta<typeof ClassicyBevelButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Push: Story = {};

export const BevelSmall: Story = {
	args: { bevelWidth: "small", children: "Small bevel" },
};

export const BevelMedium: Story = {
	args: { bevelWidth: "medium", children: "Medium bevel" },
};

export const BevelLarge: Story = {
	args: { bevelWidth: "large", children: "Large bevel" },
};

export const ToggleOn: Story = {
	args: { mode: "toggle", on: true, children: "Bold" },
};

export const ToggleOff: Story = {
	args: { mode: "toggle", on: false, children: "Bold" },
};

export const Radio: Story = {
	args: { mode: "radio", on: true, children: "Left" },
};

export const Mixed: Story = {
	args: { mode: "toggle", mixed: true, children: "Mixed" },
};

export const DisabledOff: Story = {
	args: { disabled: true, children: "Disabled" },
};

export const DisabledOn: Story = {
	args: { disabled: true, on: true, mode: "toggle", children: "Disabled on" },
};

export const PopupVertical: Story = {
	args: {
		mode: "popup",
		popupArrow: "large",
		popupDirection: "vertical",
		children: "100%",
	},
};

export const PopupHorizontal: Story = {
	args: {
		mode: "popup",
		popupArrow: "small",
		popupDirection: "horizontal",
		children: "More",
	},
};
