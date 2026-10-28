import { desktopParameters } from "@sb/helpers";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { resolveClassicyAsset } from "@/Appearance/ClassicyAssetRegistry";
import { ClassicyMenuBarExtension } from "./ClassicyMenuBarExtension";

const meta = {
	title: "Desktop/MenuBar/Extension",
	component: ClassicyMenuBarExtension,
} satisfies Meta<typeof ClassicyMenuBarExtension>;

export default meta;
type Story = StoryObj<typeof meta>;

// The component portals into #classicyDesktopMenuExtensions and its dropdown
// into #classicyDesktop, so the story provides both, plus a black bar strip.

/**
 * An icon item with a dropdown menu, in a stand-in menu bar strip (the story
 * supplies the `#classicyDesktopMenuExtensions` region and `#classicyDesktop`
 * the component portals into). Click the icon to drop the menu below it.
 */
export const UserMenu: Story = {
	render: () => (
		<div id="classicyDesktop" style={{ position: "relative", minHeight: 200 }}>
			<div
				style={{
					background: "var(--color-black)",
					height: "var(--window-control-size)",
					display: "flex",
					justifyContent: "flex-end",
				}}
			>
				<ul
					id="classicyDesktopMenuExtensions"
					className="classicyDesktopMenuExtensions"
					style={{ display: "flex", margin: 0, padding: 0, listStyle: "none" }}
				/>
			</div>
			<ClassicyMenuBarExtension
				id="user"
				order={10}
				icon={resolveClassicyAsset("icons", "system.network.userDirectory")}
				title="Account"
				menuItems={[
					{ id: "account", title: "Account…", onClickFunc: () => {} },
					{ id: "logout", title: "Log Out…", onClickFunc: () => {} },
				]}
			/>
		</div>
	),
};

/**
 * On a real desktop, the item lands in the menu bar to the left of the clock.
 * Here it shows custom `children` in place of an icon and has no menu, so a
 * click only calls `onClick`.
 */
export const OnDesktop: Story = {
	parameters: desktopParameters,
	render: () => (
		<ClassicyMenuBarExtension id="status" title="Status" onClick={fn()}>
			<span style={{ padding: "0 4px" }}>Online</span>
		</ClassicyMenuBarExtension>
	),
};
