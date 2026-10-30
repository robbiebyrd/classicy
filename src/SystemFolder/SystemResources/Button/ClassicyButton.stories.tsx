import {
	appearanceHooksParameters,
	ClassicyAppearanceProbe,
} from "@sb/ClassicyAppearanceProbe";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
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

/** A standard push button with its default (medium) size and spacing. */
export const Default: Story = {};

/**
 * `isDefault` draws the thick default-button ring that marks the dialog's most
 * likely action (HIGOS8 p.23). The ring is visual; the dialog or form wires
 * Return/Enter to it.
 */
export const DefaultAction: Story = {
	args: { isDefault: true, children: "Save" },
};

/** A dimmed, unclickable button: no click, sound or analytics event fires. */
export const Disabled: Story = {
	args: { disabled: true, children: "Disabled" },
};

/**
 * `depressed` holds the pressed look (and `aria-pressed`) — for a button that
 * stands for an ongoing mode, or to show the pressed state for reference.
 */
export const Depressed: Story = {
	args: { depressed: true, children: "Pressed" },
};

/** `buttonSize="small"` — the compact size for dense palettes and toolbars. */
export const Small: Story = {
	args: { buttonSize: "small", children: "Small" },
};

/**
 * `buttonShape="square"` gives a fixed square box for a single glyph or icon;
 * `ClassicyBevelButton square` matches it, so the two line up on one grid.
 */
export const Square: Story = {
	args: { buttonShape: "square", children: "▸" },
};

/**
 * Short-labelled buttons still honor the HIG minimum width (58px), so an
 * "OK"/"Cancel" pair lines up at a consistent size. In a real dialog, wrap the
 * pair in `ClassicyFormButtonRow` for the HIG spacing.
 */
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

/**
 * Focus the button and press Return/Enter (or Space) to see the ~8-tick
 * keyboard-activation highlight and hear the click sounds, matching a mouse
 * press.
 */
export const KeyboardActivation: Story = {
	args: { isDefault: true, children: "Press Return" },
};

/**
 * The Appearance Package hook surface, under the Storybook probe package:
 * every root `decorate()` reaches is outlined (green while pressed), and every
 * event the component emits is logged in the Actions panel.
 */
export const AppearanceHooks: Story = {
	args: Default.args,
	render: (args: ComponentProps<typeof ClassicyButton>) => (
		<ClassicyAppearanceProbe>
			<ClassicyButton {...args} />
		</ClassicyAppearanceProbe>
	),
	parameters: appearanceHooksParameters(),
};
