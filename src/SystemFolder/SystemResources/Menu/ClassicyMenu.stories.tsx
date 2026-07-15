import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ClassicyMenu } from "./ClassicyMenu";
import { ClassicyMenuProvider } from "./ClassicyMenuProvider";

const meta = {
	title: "Desktop/Menu",
	component: ClassicyMenu,
	decorators: [
		(Story) => (
			<ClassicyMenuProvider>
				<div style={{ position: "relative", height: 240 }}>
					<Story />
				</div>
			</ClassicyMenuProvider>
		),
	],
} satisfies Meta<typeof ClassicyMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		name: "storybook_menu",
		menuItems: [
			{ id: "new", title: "New", keyboardShortcut: "⌘N", onClickFunc: fn() },
			{ id: "open", title: "Open…", keyboardShortcut: "⌘O", onClickFunc: fn() },
			{ id: "close", title: "Close", disabled: true },
			{
				id: "export",
				title: "Export",
				menuChildren: [
					{ id: "pdf", title: "As PDF…", onClickFunc: fn() },
					{ id: "text", title: "As Plain Text…", onClickFunc: fn() },
				],
			},
		],
	},
};
