import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ClassicyButton } from "@/SystemFolder/SystemResources/Button/ClassicyButton";
import { ClassicyInput } from "@/SystemFolder/SystemResources/Input/ClassicyInput";
import { ClassicyHelpButton } from "./ClassicyHelpButton";

const meta = {
	title: "Controls/HelpButton",
	component: ClassicyHelpButton,
	args: { onClickFunc: fn() },
} satisfies Meta<typeof ClassicyHelpButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The 20 × 21 Help button with its standard glyph and the accessible name "Help". */
export const Default: Story = {};

/** A dimmed Help button, for when no help is available in the current context. */
export const Disabled: Story = {
	args: { disabled: true },
};

/**
 * HIGOS8 Figure 3-36 — the preferred spot: lower left, aligned with the bottom
 * of the push buttons. In a right-aligned row, `margin-right: auto` pushes it
 * to the far left.
 */
export const LowerLeft: Story = {
	render: (args) => (
		<div
			style={{
				display: "flex",
				alignItems: "flex-end",
				gap: 12,
				width: 320,
			}}
		>
			<ClassicyHelpButton {...args} />
			<span style={{ marginLeft: "auto" }} />
			<ClassicyButton>Cancel</ClassicyButton>
			<ClassicyButton isDefault>OK</ClassicyButton>
		</div>
	),
};

/**
 * HIGOS8 Figure 3-37 — with no push buttons, or no room for it lower left,
 * the Help button goes in the upper right corner.
 */
export const UpperRight: Story = {
	render: (args) => (
		<div style={{ display: "flex", alignItems: "flex-start", width: 320 }}>
			<ClassicyInput id="help-story-name" labelTitle="Name" />
			<span style={{ marginLeft: "auto" }} />
			<ClassicyHelpButton {...args} />
		</div>
	),
};
