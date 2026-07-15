import { desktopParameters, StoryApp } from "@sb/helpers";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";
import { ClassicyFileBrowser } from "./ClassicyFileBrowser";
import { useClassicyFileSystem } from "./ClassicyFileSystemContext";

const meta = {
	title: "Desktop/FileBrowser",
	component: ClassicyFileBrowser,
	parameters: desktopParameters,
} satisfies Meta<typeof ClassicyFileBrowser>;

export default meta;
type Story = StoryObj<typeof meta>;

const BrowserWindow = ({ display }: { display: "icons" | "list" }) => {
	const fs = useClassicyFileSystem(`storybookFS-${display}`);
	return (
		<StoryApp id="storybook.app" name="Storybook">
			<ClassicyWindow
				id={`browser-${display}`}
				appId="storybook.app"
				title="Macintosh HD"
				initialSize={[480, 320]}
				initialPosition={[80, 60]}
				scrollable={true}
			>
				<ClassicyFileBrowser
					fs={fs}
					path="Macintosh HD"
					appId="storybook.app"
					display={display}
					dirOnClickFunc={fn()}
					fileOnClickFunc={fn()}
				/>
			</ClassicyWindow>
		</StoryApp>
	);
};

export const IconView: Story = {
	render: () => <BrowserWindow display="icons" />,
};

export const ListView: Story = {
	render: () => <BrowserWindow display="list" />,
};
