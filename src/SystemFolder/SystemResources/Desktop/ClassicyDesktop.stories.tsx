import { desktopParameters, SB_ICON, StoryApp } from "@sb/helpers";
import { mirroredParameters } from "@sb/mirrored";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useMemo } from "react";
import { fn } from "storybook/test";
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";
import { ClassicyDesktop } from "./ClassicyDesktop";

const meta = {
	title: "Desktop/Desktop",
	component: ClassicyDesktop,
	parameters: desktopParameters,
} satisfies Meta<typeof ClassicyDesktop>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The bare desktop with no apps of your own: menu bar, wallpaper, Trash, the
 * Finder's disk icon and the Control Strip. Right-click the empty desktop for
 * its menu, or drag on it to rubber-band select icons. (The Storybook
 * decorator supplies the `ClassicyDesktop`, with the startup screen off.)
 */
export const Default: Story = {
	render: () => null,
};

/**
 * `controlStrip={false}` hides the Control Strip, and with it the desktop's
 * Sound control. (Set here through the decorator's
 * `parameters.classicy.controlStrip`.)
 */
export const WithoutControlStrip: Story = {
	parameters: {
		classicy: { desktop: true, controlStrip: false },
	},
	render: () => null,
};

const MirroredDesktop = () => {
	const appMenu: ClassicyMenuItem[] = useMemo(
		() => [
			{
				id: "storybook.app_file",
				title: "File",
				menuChildren: [
					{ id: "storybook.app_new", title: "New", onClickFunc: fn() },
					{ id: "storybook.app_open", title: "Open…", onClickFunc: fn() },
				],
			},
		],
		[],
	);
	return (
		<>
			<StoryApp id="storybook.app" name="Storybook">
				<ClassicyWindow
					id="mirrored"
					appId="storybook.app"
					title="Menus in the Window"
					appMenu={appMenu}
					initialSize={[380, 200]}
					initialPosition={[240, 80]}
				>
					<p style={{ padding: "1em" }}>
						This window&apos;s File menu is in its own menu bar, under the title
						bar; there is no menu bar across the screen.
					</p>
				</ClassicyWindow>
			</StoryApp>
			<ClassicyApp id="storybook-notes.app" name="Notes" icon={SB_ICON} />
		</>
	);
};

/**
 * The desktop under the Storybook-only `mirrored` Appearance Package, whose
 * `layout` moves the menus into each window (`menuBar.placement: "window"`)
 * and lays desktop icons out from the top left (`desktop.iconGridOrigin`).
 * The screen bar is not drawn (it still dispatches keyboard equivalents); a
 * window with an `appMenu` shows it in a bar under its title. The Apple,
 * Help and App Switcher menus, the clock and menu bar extensions have no
 * place in this arrangement.
 */
export const Mirrored: Story = {
	parameters: mirroredParameters,
	render: () => <MirroredDesktop />,
};
