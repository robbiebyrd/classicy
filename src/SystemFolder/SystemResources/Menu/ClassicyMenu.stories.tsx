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

// Free-form modifier spellings (Cmd, Option, Ctrl, Shift, or entities) are
// parsed and rendered as platinum modifier glyphs (⌃ ⌥ ⇧ ⌘). Pressing the
// matching command-key also fires the item and closes the menu.
export const ModifierGlyphShortcuts: Story = {
	args: {
		name: "storybook_menu_glyphs",
		menuItems: [
			{
				id: "save",
				title: "Save",
				keyboardShortcut: "Cmd+S",
				onClickFunc: fn(),
			},
			{
				id: "save-as",
				title: "Save As…",
				keyboardShortcut: "Cmd+Shift+S",
				onClickFunc: fn(),
			},
			{
				id: "duplicate",
				title: "Duplicate",
				keyboardShortcut: "Command-Option-D",
				onClickFunc: fn(),
			},
			{
				id: "settings",
				title: "Settings",
				keyboardShortcut: "Ctrl+Option+Shift+Cmd+K",
				onClickFunc: fn(),
			},
			{
				id: "help-key",
				title: "Help",
				keyboardShortcut: "F1",
				onClickFunc: fn(),
			},
		],
	},
};
