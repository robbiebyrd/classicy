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
// Every story here draws the component itself in `render` and ignores the
// args, so the stories are typed against the component (every arg optional),
// not `typeof meta`, which would demand its required props as story args.
type Story = StoryObj<typeof ClassicyAboutWindow>;

/**
 * The About box for an open app. Press Return or Escape, or click OK, to call
 * `hideFunc` (logged in the Actions panel); the story never unmounts it.
 */
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
