import { desktopParameters, StoryApp } from "@sb/helpers";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import type { ClassicyFileDialogVolume } from "./ClassicyFileDialogVolume";
import { ClassicyFileOpenDialog } from "./ClassicyFileOpenDialog";

const APP_ID = "storybook.app";

const demoVolume: ClassicyFileDialogVolume = {
	id: "demo",
	label: "Demo Volume",
	list: async (path) =>
		path.length === 0
			? [
					{ id: "folder", name: "Folder", kind: "folder" },
					{ id: "movie", name: "movie.mov", kind: "file", fileType: "video" },
					{ id: "song", name: "song.mp3", kind: "file", fileType: "audio" },
				]
			: [{ id: "nested", name: "nested.pdf", kind: "file", fileType: "pdf" }],
};

const documentsVolume: ClassicyFileDialogVolume = {
	id: "documents",
	label: "Documents",
	list: async () => [
		{ id: "letter", name: "Letter", kind: "file", fileType: "text_file" },
		{ id: "notes", name: "Notes", kind: "file", fileType: "text_file" },
	],
};

// A volume whose sub-folders always fail to load, to show the Retry row.
const flakyVolume: ClassicyFileDialogVolume = {
	id: "server",
	label: "File Server",
	list: async (path) => {
		if (path.length === 0) {
			return [
				{ id: "shared", name: "Shared", kind: "folder" },
				{ id: "readme", name: "Read Me", kind: "file", fileType: "text_file" },
			];
		}
		throw new Error("The server is not responding.");
	},
};

const meta = {
	title: "Dialogs/FileOpenDialog",
	component: ClassicyFileOpenDialog,
	parameters: desktopParameters,
	args: { appId: APP_ID, open: true, onOpenFunc: fn(), onCancelFunc: fn() },
	render: (args) => (
		<StoryApp id={APP_ID} name="Storybook">
			<ClassicyFileOpenDialog {...args} />
		</StoryApp>
	),
} satisfies Meta<typeof ClassicyFileOpenDialog>;
export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Multi-selection with a Show filter. Choose "Movies" to dim everything but
 * `video` files; Command-click toggles files and Shift-click extends within a
 * folder. Expand Folder to load its contents lazily.
 */
export const Default: Story = {
	args: {
		id: "story-file-open",
		volumes: [demoVolume],
		selectionMode: "multi",
		fileTypeFilters: [
			{ label: "All Items", types: null },
			{ label: "Movies", types: ["video"] },
		],
	},
};

/**
 * Single selection (the default) across two volumes: the Volume pop-up
 * switches between them. Double-click a file, or select it and press Return,
 * to open it.
 */
export const SingleSelectionTwoVolumes: Story = {
	args: {
		id: "story-file-open-single",
		volumes: [documentsVolume, demoVolume],
	},
};

/**
 * A volume whose `list()` rejects: expanding Shared shows "Couldn't open this
 * folder" with a Retry button instead of failing silently.
 */
export const FolderLoadError: Story = {
	args: {
		id: "story-file-open-error",
		volumes: [flakyVolume],
	},
};
