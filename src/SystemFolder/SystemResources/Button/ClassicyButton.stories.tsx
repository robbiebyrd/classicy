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

// Short-labelled buttons still honor the HIG minimum width (58px), so an
// "OK"/"Cancel" pair lines up at a consistent size.
export const OkCancelRow: Story = {
	render: (args) => (
		<div style={{ display: "flex" }}>
			<ClassicyButton {...args} isDefault={true}>
				OK
			</ClassicyButton>
			<ClassicyButton {...args} isDefault={false}>
				Cancel
			</ClassicyButton>
		</div>
	),
	args: { children: "OK" },
};

// Focus the button and press Return/Enter (or Space) to see the ~8-tick
// keyboard-activation highlight.
export const KeyboardActivation: Story = {
	args: { isDefault: true, children: "Press Return" },
};
