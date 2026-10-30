import { desktopParameters, StoryApp } from "@sb/helpers";
import { mirroredParameters } from "@sb/mirrored";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ClassicyAlert } from "./ClassicyAlert";

const meta = {
	title: "Dialogs/Alert",
	component: ClassicyAlert,
	parameters: desktopParameters,
} satisfies Meta<typeof ClassicyAlert>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A `note` alert with no `buttons` prop: the note icon and the generated single
 * OK button. Use a note to report something the user should know but need not
 * decide on.
 */
export const Note: Story = {
	render: () => (
		<StoryApp id="storybook.app" name="Storybook">
			<ClassicyAlert
				id="alert-note"
				appId="storybook.app"
				alertType="note"
				label="The document has been saved."
				message="Your changes to “Untitled” were written to disk successfully."
				onClose={fn()}
			/>
		</StoryApp>
	),
};

/**
 * A `caution` alert with explicit buttons: Cancel (`role: "cancel"`, fired by
 * Escape / Command-period) and a specific verb as the default (fired by
 * Return). HIG: name the action ("Empty Trash"), not "OK".
 */
export const Caution: Story = {
	render: () => (
		<StoryApp id="storybook.app" name="Storybook">
			<ClassicyAlert
				id="alert-caution"
				appId="storybook.app"
				alertType="caution"
				label="Are you sure you want to empty the Trash?"
				message="It contains 3 items. This action cannot be undone."
				buttons={[
					{ id: "cancel", label: "Cancel", role: "cancel", onClick: fn() },
					{ id: "ok", label: "Empty Trash", role: "default", onClick: fn() },
				]}
				onClose={fn()}
			/>
		</StoryApp>
	),
};

/**
 * A caution that risks data loss: `defaultButtonId` makes the safe choice
 * (Cancel) the default button, so a reflexive Return cannot destroy work
 * (HIGOS8 p.60).
 */
export const CautionDataLoss: Story = {
	render: () => (
		<StoryApp id="storybook.app" name="Storybook">
			<ClassicyAlert
				id="alert-dataloss"
				appId="storybook.app"
				alertType="caution"
				label="Discard unsaved changes?"
				message="If you don’t save, your changes will be lost."
				defaultButtonId="cancel"
				buttons={[
					{ id: "cancel", label: "Cancel", role: "cancel", onClick: fn() },
					{ id: "discard", label: "Discard", onClick: fn() },
				]}
				onClose={fn()}
			/>
		</StoryApp>
	),
};

/**
 * A `stop` alert: the stop icon and a single OK button, for a problem that
 * prevented the action. Explain what happened and, where possible, what to do.
 */
export const Stop: Story = {
	render: () => (
		<StoryApp id="storybook.app" name="Storybook">
			<ClassicyAlert
				id="alert-stop"
				appId="storybook.app"
				alertType="stop"
				label="The application “Simple Text” could not be opened."
				message="There is not enough memory available to open this application."
				onClose={fn()}
			/>
		</StoryApp>
	),
};

/**
 * The four-button maximum: a `help`-role button (drawn as `ClassicyHelpButton`
 * at the far left), an optional third action, Cancel and the default. A `"?"`
 * label becomes the accessible name "Help".
 */
export const WithHelpButton: Story = {
	render: () => (
		<StoryApp id="storybook.app" name="Storybook">
			<ClassicyAlert
				id="alert-help"
				appId="storybook.app"
				alertType="caution"
				label="Save changes before closing?"
				message="Your document contains unsaved changes."
				buttons={[
					{ id: "help", label: "?", role: "help", onClick: fn() },
					{ id: "dontsave", label: "Don’t Save", onClick: fn() },
					{ id: "cancel", label: "Cancel", role: "cancel", onClick: fn() },
					{ id: "save", label: "Save", role: "default", onClick: fn() },
				]}
				onClose={fn()}
			/>
		</StoryApp>
	),
};

/**
 * The movable variant (`movable`): a draggable window whose title bar carries
 * the red highlight and shows `title`, instead of the fixed alert's red
 * content border (HIGOS8 p.57). It plays the alert sound itself on open.
 */
export const Movable: Story = {
	render: () => (
		<StoryApp id="storybook.app" name="Storybook">
			<ClassicyAlert
				id="alert-movable"
				appId="storybook.app"
				alertType="caution"
				movable={true}
				title="Replace File"
				label="A file named “Report” already exists."
				message="Do you want to replace it with the one you are moving?"
				buttons={[
					{ id: "cancel", label: "Cancel", role: "cancel", onClick: fn() },
					{ id: "replace", label: "Replace", role: "default", onClick: fn() },
				]}
				onClose={fn()}
			/>
		</StoryApp>
	),
};

/**
 * A `caution` alert with no `buttons` prop: the generated Cancel + Continue
 * pair, with Continue as the default. Pass `buttons` to name the action
 * instead, as the Caution story does.
 */
export const CautionDefaultButtons: Story = {
	render: () => (
		<StoryApp id="storybook.app" name="Storybook">
			<ClassicyAlert
				id="alert-caution-defaults"
				appId="storybook.app"
				alertType="caution"
				label="The disk is almost full."
				message="Continuing may leave too little space to save your work."
				onClose={fn()}
			/>
		</StoryApp>
	),
};

/**
 * `Caution` under the Storybook-only `mirrored` Appearance Package: the icon
 * on the right of the message and the default button leftmost, by CSS alone
 * (`flex-direction: row-reverse` on the top row and the button row). Return
 * and Escape still pick the same buttons.
 */
export const Mirrored: Story = {
	...Caution,
	parameters: mirroredParameters,
};
