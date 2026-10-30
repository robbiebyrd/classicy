import {
	desktopParameters,
	mirroredParameters,
	SB_ICON,
	StoryApp,
} from "@sb/helpers";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useMemo } from "react";
import { fn } from "storybook/test";
import { useClassicyAboutMenu } from "@/SystemFolder/SystemResources/App/ClassicyAppMenuHooks";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";
import { ClassicyDesktopMenuBar } from "./ClassicyDesktopMenuBar";

const meta = {
	title: "Desktop/MenuBar",
	component: ClassicyDesktopMenuBar,
} satisfies Meta<typeof ClassicyDesktopMenuBar>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The menu bar rendered on its own, outside a desktop. It reads its menus from
 * the store: the Apple menu, the Help menu, the clock and the App Switcher.
 * See `WithAppMenu` for an app publishing its menus. Its optional props are
 * `className`, `style` and `placement` (see `Mirrored`).
 */
export const Default: Story = {};

const AppMenuWindow = () => {
	const { aboutMenuItem, aboutWindow } = useClassicyAboutMenu(
		"storybook.app",
		"Storybook",
		SB_ICON,
	);
	const appMenu: ClassicyMenuItem[] = useMemo(
		() => [
			{
				id: "storybook.app_file",
				title: "File",
				menuChildren: [
					aboutMenuItem,
					{ id: "spacer" },
					{ id: "storybook.app_new", title: "New", onClickFunc: fn() },
					{ id: "storybook.app_open", title: "Open…", onClickFunc: fn() },
				],
			},
			{
				id: "storybook.app_view",
				title: "View",
				menuChildren: [
					{
						id: "storybook.app_icons",
						title: "as Icons",
						checked: true,
						onClickFunc: fn(),
					},
					{
						id: "storybook.app_list",
						title: "as List",
						checked: false,
						onClickFunc: fn(),
					},
				],
			},
		],
		[aboutMenuItem],
	);
	return (
		<StoryApp id="storybook.app" name="Storybook">
			<ClassicyWindow
				id="menus"
				appId="storybook.app"
				title="Menu Demo"
				appMenu={appMenu}
				initialSize={[360, 180]}
				initialPosition={[80, 60]}
			>
				<p style={{ padding: "1em" }}>
					This window&apos;s File and View menus are in the menu bar. Its About
					item has moved to the Apple menu.
				</p>
			</ClassicyWindow>
			{aboutWindow}
		</StoryApp>
	);
};

/**
 * The real menu bar on a desktop, showing a focused window's `appMenu`. The
 * About item from `useClassicyAboutMenu` is hoisted out of the File menu into
 * the Apple menu as "About Storybook", and the App Switcher at the right names
 * the focused app. Memoize `appMenu`, as here.
 */
export const WithAppMenu: Story = {
	parameters: desktopParameters,
	render: () => <AppMenuWindow />,
};

const BalloonMenuWindow = () => {
	const appMenu: ClassicyMenuItem[] = useMemo(
		() => [
			{
				id: "storybook.app_file",
				title: "File",
				balloon: { content: "Commands for Storybook documents." },
				menuChildren: [
					{ id: "storybook.app_new", title: "New", onClickFunc: fn() },
					{ id: "storybook.app_open", title: "Open…", onClickFunc: fn() },
				],
			},
			{
				id: "storybook.app_view",
				title: "View",
				menuChildren: [
					{ id: "storybook.app_icons", title: "as Icons", onClickFunc: fn() },
				],
			},
		],
		[],
	);
	return (
		<StoryApp id="storybook.app" name="Storybook">
			<ClassicyWindow
				id="menus"
				appId="storybook.app"
				title="Menu Demo"
				appMenu={appMenu}
				initialSize={[360, 180]}
				initialPosition={[80, 60]}
			>
				<p style={{ padding: "1em" }}>
					The File menu carries balloon help, so its title is wrapped in a
					balloon anchor; it stays as wide as its title in both bars.
				</p>
			</ClassicyWindow>
		</StoryApp>
	);
};

/**
 * The menu bar under the Storybook-only `mirrored` Appearance Package. That
 * package places menus in each window, so the desktop's own bar is headless;
 * this story draws one with `placement="screen"` to show the package's CSS
 * `order` flips: the App Switcher leads at the far left and Apple, the app's
 * menus, Help and the clock sit at the right. (The desktop's headless bar
 * and this one both dispatch keyboard equivalents here, so a chord fires
 * twice in this story only.)
 */
export const Mirrored: Story = {
	args: { placement: "screen" },
	parameters: mirroredParameters,
	render: (args) => (
		<>
			<ClassicyDesktopMenuBar {...args} />
			<BalloonMenuWindow />
		</>
	),
};
