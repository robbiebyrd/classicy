import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ClassicyFileDialogVolume } from "./ClassicyFileDialogVolume";
import { ClassicyFileSaveDialog } from "./ClassicyFileSaveDialog";

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
	write: async (path, name, file) => console.log("write", path, name, file),
	mkDir: async (path, name) => console.log("mkDir", path, name),
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
		onSaveFunc: (saved) => console.log(saved),
	},
};
