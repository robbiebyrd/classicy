import { desktopParameters, SB_ICON, StoryApp } from "@sb/helpers";
import { mirroredParameters } from "@sb/mirrored";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useMemo } from "react";
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

// Enough rows to run past the bottom of a 768 px screen.
const LONG_MENU_ROWS = 48;

const LongMenuWindow = () => {
	const appMenu: ClassicyMenuItem[] = useMemo(
		() => [
			{
				id: "storybook.app_fonts",
				title: "Fonts",
				menuChildren: Array.from({ length: LONG_MENU_ROWS }, (_, i) => ({
					id: `storybook.app_font_${i + 1}`,
					title: `Font ${i + 1}`,
					onClickFunc: fn(),
				})),
			},
		],
		[],
	);
	// Opens the Fonts menu once the desktop has settled, clicking its title
	// as the user would until it stays open.
	useEffect(() => {
		let tries = 0;
		let openTicks = 0;
		const timer = window.setInterval(() => {
			tries += 1;
			const title = document.getElementById("storybook.app_fonts");
			const opened = title?.classList.contains("open");
			if (tries > 25 || (opened && openTicks++ > 2)) {
				window.clearInterval(timer);
			}
			if (opened) return;
			openTicks = 0;
			title?.click();
		}, 400);
		return () => window.clearInterval(timer);
	}, []);
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
					This window&apos;s Fonts menu has {LONG_MENU_ROWS} items, more than
					the screen holds.
				</p>
			</ClassicyWindow>
		</StoryApp>
	);
};

/**
 * A pull-down too long for the screen, open: the list is capped so that its
 * frame ends 4 px above the screen's bottom, its shadow drawn on a sibling
 * (the scrolling list would clip its own), and it scrolls by the indicator
 * over its last row while the pointer rests there (HIG7 p.78).
 */
export const ScrollingMenu: Story = {
	parameters: desktopParameters,
	render: () => <LongMenuWindow />,
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
 * menus, Help and the clock sit at the right.
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
