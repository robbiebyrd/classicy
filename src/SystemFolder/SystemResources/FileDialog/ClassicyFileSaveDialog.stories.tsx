import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ClassicyFileDialogVolume } from "./ClassicyFileDialogVolume";
import { ClassicyFileSaveDialog } from "./ClassicyFileSaveDialog";

const demoVolume: ClassicyFileDialogVolume = {
	id: "demo",
	label: "Macintosh HD",
	list: async (path) =>
		path.length === 0
			? [
					{ id: "documents", name: "Documents", kind: "folder" },
					{ id: "applications", name: "Applications", kind: "folder" },
					{
						id: "readme",
						name: "Read Me.txt",
						kind: "file",
						fileType: "text_file",
					},
				]
			: [
					{
						id: "notes",
						name: "notes.txt",
						kind: "file",
						fileType: "text_file",
					},
				],
};

const meta = {
	title: "Dialogs/FileSaveDialog",
	component: ClassicyFileSaveDialog,
} satisfies Meta<typeof ClassicyFileSaveDialog>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		id: "story-file-save",
		appId: "story-file-save",
		open: true,
		volumes: [demoVolume],
		defaultFileName: "untitled",
		onSaveFunc: (result) => console.log(result),
	},
};
