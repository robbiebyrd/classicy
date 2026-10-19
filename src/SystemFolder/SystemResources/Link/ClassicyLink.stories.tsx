import { desktopParameters, StoryApp } from "@sb/helpers";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";
import { ClassicyLink } from "./ClassicyLink";

const meta = {
	title: "Controls/Link",
	component: ClassicyLink,
} satisfies Meta<typeof ClassicyLink>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The default `disposition="classicy"`: a plain click opens the page in the
 * desktop's WebViewer window. On this bare canvas there is no desktop to act
 * on the dispatch — see `OnTheDesktop` for the live behaviour.
 */
export const InDesktopViewer: Story = {
	args: {
		href: "https://classicy.ing",
		children: "Visit classicy.ing",
	},
	decorators: [
		(Story) => (
			<p style={{ margin: 0 }}>
				Learn more at <Story /> — opens in a WebViewer window.
			</p>
		),
	],
};

/**
 * `disposition="browser-new"` opens the URL in a new browser tab (through the
 * desktop's URL controller) instead of a WebViewer window.
 */
export const NewBrowserTab: Story = {
	args: {
		href: "https://classicy.ing",
		disposition: "browser-new",
		children: "Open in a new tab",
	},
};

/**
 * `event` makes the link dispatch an internal action instead of navigating —
 * here starting the screen saver. With no `href` the anchor gets
 * `role="button"` and activates on Enter/Space.
 */
export const InternalAction: Story = {
	args: {
		event: "ClassicyAppScreenSaverActivate",
		children: "Start the screen saver",
	},
};

/** A disabled link: greyed, out of the tab order, and clicks do nothing. */
export const Disabled: Story = {
	args: {
		href: "https://classicy.ing",
		disabled: true,
		children: "Unavailable link",
	},
};

/**
 * Links inside a window on a live desktop: the first opens a WebViewer
 * window, the second a new browser tab, and the third starts the screen
 * saver (move the mouse to wake it).
 */
export const OnTheDesktop: Story = {
	parameters: desktopParameters,
	render: () => (
		<StoryApp id="storybook.app" name="Storybook">
			<ClassicyWindow
				id="links"
				appId="storybook.app"
				title="Links"
				initialSize={[360, 180]}
				initialPosition={[80, 60]}
			>
				<div style={{ padding: "1em" }}>
					<p>
						<ClassicyLink href="https://classicy.ing">
							Visit classicy.ing
						</ClassicyLink>
					</p>
					<p>
						<ClassicyLink href="https://classicy.ing" disposition="browser-new">
							Open in a new tab
						</ClassicyLink>
					</p>
					<p>
						<ClassicyLink event="ClassicyAppScreenSaverActivate">
							Start the screen saver
						</ClassicyLink>
					</p>
				</div>
			</ClassicyWindow>
		</StoryApp>
	),
};
