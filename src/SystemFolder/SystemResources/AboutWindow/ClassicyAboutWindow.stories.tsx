import { desktopParameters, SB_ICON, StoryApp } from "@sb/helpers";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ClassicyAboutWindow } from "./ClassicyAboutWindow";

const meta = {
	title: "Desktop/AboutWindow",
	component: ClassicyAboutWindow,
	parameters: desktopParameters,
} satisfies Meta<typeof ClassicyAboutWindow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => (
		<StoryApp id="storybook.app" name="Storybook">
			<ClassicyAboutWindow
				appId="storybook.app"
				appName="Storybook"
				appIcon={SB_ICON}
				hideFunc={fn()}
			/>
		</StoryApp>
	),
};
