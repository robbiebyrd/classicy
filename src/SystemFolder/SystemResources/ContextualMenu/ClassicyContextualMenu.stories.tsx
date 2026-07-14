import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ClassicyContextualMenu } from "./ClassicyContextualMenu";

const MENU_ITEMS = [
	{ id: "open", title: "Open", onClickFunc: fn() },
	{
		id: "duplicate",
		title: "Duplicate",
		keyboardShortcut: "⌘D",
		onClickFunc: fn(),
	},
	{ id: "sep1" },
	{ id: "info", title: "Get Info", onClickFunc: fn() },
	{ id: "trash", title: "Move To Trash", onClickFunc: fn() },
];

const meta = {
	title: "Controls/ContextualMenu",
	component: ClassicyContextualMenu,
	decorators: [
		(Story) => (
			<div style={{ position: "relative", height: 260 }}>
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof ClassicyContextualMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		name: "storybook_context",
		position: [16, 16],
		menuItems: MENU_ITEMS,
		onClose: fn(),
	},
};
