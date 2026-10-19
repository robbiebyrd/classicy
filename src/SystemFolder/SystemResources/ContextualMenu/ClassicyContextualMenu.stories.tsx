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
	{ id: "spacer" },
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

/**
 * The bare menu at a fixed position, already open: it shows `menuItems` as
 * given (no Help item is added at this level). Choosing an item or clicking
 * outside calls `onClose`; the story keeps it mounted.
 */
export const Default: Story = {
	args: {
		name: "storybook_context",
		position: [16, 16],
		menuItems: MENU_ITEMS,
		onClose: fn(),
	},
};

/**
 * A submenu inside a contextual menu. The HIG keeps contextual submenus to one
 * level; click "Label" to open it.
 */
export const WithSubmenu: Story = {
	args: {
		name: "storybook_context_submenu",
		position: [16, 16],
		menuItems: [
			{ id: "open", title: "Open", onClickFunc: fn() },
			{
				id: "label",
				title: "Label",
				menuChildren: [
					{ id: "label-none", title: "None", checked: true, onClickFunc: fn() },
					{ id: "label-hot", title: "Hot", checked: false, onClickFunc: fn() },
					{
						id: "label-cool",
						title: "Cool",
						checked: false,
						onClickFunc: fn(),
					},
				],
			},
		],
		onClose: fn(),
	},
};
