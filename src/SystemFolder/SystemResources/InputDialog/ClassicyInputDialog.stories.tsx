import { desktopParameters, StoryApp } from "@sb/helpers";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ClassicyInputDialog } from "./ClassicyInputDialog";

const APP_ID = "storybook.app";

/**
 * Movable-modal text prompt (HIGOS8 Ch.3 "Movable Modal Dialog Boxes", p.59):
 * a title bar with no close box, a prompt, one edit field and a Cancel /
 * default-button pair. The field is focused with its text selected on open;
 * Return fires the default button and Escape or Command-period fires Cancel.
 * The dialog has no close box, so OK and Cancel are its only exits.
 */
const meta = {
	title: "Dialogs/InputDialog",
	component: ClassicyInputDialog,
	parameters: desktopParameters,
	args: { appId: APP_ID, onConfirm: fn(), onCancel: fn() },
	render: (args) => (
		<StoryApp id={APP_ID} name="Storybook">
			<ClassicyInputDialog {...args} />
		</StoryApp>
	),
} satisfies Meta<typeof ClassicyInputDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A labelled prompt with an empty field. The default validator requires a
 * non-blank value, so OK stays dimmed until you type something.
 */
export const Default: Story = {
	args: {
		id: "input-dialog-default",
		title: "Find",
		prompt: "Find what:",
	},
};

/**
 * Finder's New Folder prompt: the field opens holding "untitled folder", already
 * selected so typing replaces it.
 */
export const Prefilled: Story = {
	args: {
		id: "input-dialog-prefilled",
		title: "New Folder",
		prompt: "Name of new folder:",
		initialValue: "untitled folder",
		confirmLabel: "Create",
	},
};

/**
 * A custom `validate`: Mac OS file names are at most 31 characters and may not
 * contain a colon. The field opens holding an invalid name, so the default
 * button is dimmed and Return does nothing until the name is fixed.
 */
export const Validation: Story = {
	args: {
		id: "input-dialog-validation",
		title: "Rename",
		prompt: "New name (31 characters max, no colons):",
		initialValue: "Report: Q3",
		confirmLabel: "Rename",
		validate: (name: string) =>
			name.trim().length > 0 && name.length <= 31 && !name.includes(":"),
	},
};
