import type { Meta, StoryObj } from "@storybook/react-vite";
import { ClassicyFileOpenDialog } from "./ClassicyFileOpenDialog";
import type { ClassicyFileDialogVolume } from "./ClassicyFileDialogVolume";

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

const meta = {
	title: "Dialogs/FileOpenDialog",
	component: ClassicyFileOpenDialog,
} satisfies Meta<typeof ClassicyFileOpenDialog>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		id: "story-file-open",
		appId: "story-file-open",
		open: true,
		volumes: [demoVolume],
		selectionMode: "multi",
		fileTypeFilters: [
			{ label: "All Items", types: null },
			{ label: "Movies", types: ["video"] },
		],
		onOpenFunc: (selections) => console.log(selections),
	},
};
