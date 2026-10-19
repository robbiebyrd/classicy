import { desktopParameters, StoryApp } from "@sb/helpers";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import type { ClassicyFileDialogVolume } from "./ClassicyFileDialogVolume";
import { ClassicyFileSaveDialog } from "./ClassicyFileSaveDialog";

const APP_ID = "storybook.app";

const demoVolume: ClassicyFileDialogVolume = {
	id: "demo",
	label: "Demo Volume",
	list: async (path) =>
		path.length === 0
			? [
					{ id: "folder", name: "Folder", kind: "folder" },
					{ id: "song", name: "song.mp3", kind: "file", fileType: "audio" },
				]
			: [],
	write: fn(async () => {}),
	mkDir: fn(async () => {}),
};

// No `write` or `mkDir`: a read-only volume.
const cdVolume: ClassicyFileDialogVolume = {
	id: "cd",
	label: "Mac OS 8 CD",
	list: async () => [
		{ id: "readme", name: "Read Me", kind: "file", fileType: "text_file" },
	],
};

const meta = {
	title: "Dialogs/FileSaveDialog",
	component: ClassicyFileSaveDialog,
	parameters: desktopParameters,
	args: { appId: APP_ID, open: true, onSaveFunc: fn(), onCancelFunc: fn() },
	render: (args) => (
		<StoryApp id={APP_ID} name="Storybook">
			<ClassicyFileSaveDialog {...args} />
		</StoryApp>
	),
} satisfies Meta<typeof ClassicyFileSaveDialog>;
export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Two formats, so the Format pop-up appears and switching it changes the
 * extension shown after the name. Click a folder to save into it; New Folder
 * prompts for a name. The demo volume's `write` and `mkDir` are no-op spies,
 * so nothing is actually stored.
 */
export const Default: Story = {
	args: {
		id: "story-file-save",
		volumes: [demoVolume],
		defaultFileName: "My Stack",
		formats: [
			{
				label: "HyperCard Stack",
				extension: ".stack",
				fileType: "stack",
				data: () => "{}",
			},
			{
				label: "Plain Text",
				extension: ".txt",
				fileType: "text_file",
				data: () => "",
			},
		],
	},
};

/**
 * A single format hides the Format pop-up. The name opens as "song", which
 * with ".mp3" collides with an existing file: Save raises the movable caution
 * "Replace “song.mp3”?" alert, whose default button is Cancel.
 */
export const ReplaceExistingFile: Story = {
	args: {
		id: "story-file-save-replace",
		volumes: [demoVolume],
		defaultFileName: "song",
		formats: [
			{
				label: "MP3 Audio",
				extension: ".mp3",
				fileType: "audio",
				data: () => "",
			},
		],
	},
};

/**
 * A read-only volume (no `write` or `mkDir`): Save and New Folder stay dimmed
 * whatever the name, so nothing can be written to it.
 */
export const ReadOnlyVolume: Story = {
	args: {
		id: "story-file-save-readonly",
		volumes: [cdVolume],
		defaultFileName: "Untitled",
		formats: [
			{
				label: "Plain Text",
				extension: ".txt",
				fileType: "text_file",
				data: () => "",
			},
		],
	},
};
