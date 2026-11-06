import {
	appearanceHooksParameters,
	ClassicyAppearanceProbe,
} from "@sb/ClassicyAppearanceProbe";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { fn } from "storybook/test";
import { ClassicyInput } from "./ClassicyInput";

const meta = {
	title: "Controls/Input",
	component: ClassicyInput,
	args: { onChangeFunc: fn(), onEnterFunc: fn() },
} satisfies Meta<typeof ClassicyInput>;

export default meta;
type Story = StoryObj<typeof meta>;

/** An empty edit text field with its label above — the default layout. */
export const Default: Story = {
	args: { id: "input-default", labelTitle: "Computer Name" },
};

/** Placeholder text shows in the empty field and disappears once the user types. */
export const Placeholder: Story = {
	args: {
		id: "input-placeholder",
		labelTitle: "Search",
		placeholder: "Find items…",
	},
};

/**
 * A label to the left of a prefilled field, the usual dialog-row layout. The
 * field stays editable: `prefillValue` only seeds (and later resets) the text.
 */
export const LabelLeft: Story = {
	args: {
		id: "input-left",
		labelTitle: "Name:",
		labelPosition: "left",
		prefillValue: "Macintosh HD",
	},
};

/** `type` passes through to the native `<input>`, so a password field masks its text. */
export const Password: Story = {
	args: {
		id: "input-password",
		labelTitle: "Password:",
		labelPosition: "left",
		type: "password",
		prefillValue: "sosumi",
	},
};

/** A disabled field: not editable, with field and label dimmed. */
export const Disabled: Story = {
	args: { id: "input-disabled", labelTitle: "Serial Number", disabled: true },
};

/**
 * The Appearance Package hook surface, under the Storybook probe package:
 * every root `decorate()` reaches is outlined (green while pressed), and every
 * event the component emits is logged in the Actions panel.
 */
export const AppearanceHooks: Story = {
	args: Default.args,
	render: (args: ComponentProps<typeof ClassicyInput>) => (
		<ClassicyAppearanceProbe>
			<ClassicyInput {...args} />
		</ClassicyAppearanceProbe>
	),
	parameters: appearanceHooksParameters(),
};
