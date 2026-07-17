import { desktopParameters, StoryApp } from "@sb/helpers";
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

/** Note — talking-face icon, single OK button. */
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

/** Caution — triangle + "!", Cancel + default Continue. */
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
 * Caution that risks data loss — the safe choice (Cancel) is made default via
 * `defaultButtonId`, per the HIG.
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

/** Stop — octagon + hand, single OK button. */
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

/** Full four-button caution with a Help ("?") button and an optional third action. */
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

/** Movable variant — draggable window with a red title-bar highlight. */
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
