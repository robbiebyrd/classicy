import type { Meta, StoryObj } from "@storybook/react-vite";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import { ClassicyMenuBarExtension } from "./ClassicyMenuBarExtension";

const meta = {
	title: "Desktop/MenuBar/Extension",
	component: ClassicyMenuBarExtension,
} satisfies Meta<typeof ClassicyMenuBarExtension>;

export default meta;
type Story = StoryObj<typeof meta>;

// The component portals into #classicyDesktopMenuExtensions and its dropdown
// into #classicyDesktop, so the story provides both, plus a black bar strip.
const userIcon = ClassicyIcons.system.network.userDirectory;

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
				icon={userIcon}
				title="Account"
				menuItems={[
					{ id: "account", title: "Account…", onClickFunc: () => {} },
					{ id: "logout", title: "Log Out…", onClickFunc: () => {} },
				]}
			/>
		</div>
	),
};
