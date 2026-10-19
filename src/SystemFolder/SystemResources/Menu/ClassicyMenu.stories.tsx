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

/**
 * A basic menu: enabled items with keyboard equivalents, a disabled item, and
 * a submenu (click Export to open it). Choosing an item flashes it, closes the
 * menu and calls its `onClickFunc`.
 */
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

/**
 * Free-form modifier spellings (Cmd, Option, Ctrl, Shift, or entities) are
 * parsed and rendered as Platinum modifier glyphs (⌃ ⌥ ⇧ ⌘) in canonical order.
 * A standalone menu only displays them; the chords fire app-wide for menus
 * published to the menu bar (a window's `appMenu`).
 */
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

/**
 * Checkable items and dividers. `checked: true` draws a checkmark, `"mixed"`
 * the HIG dash for an attribute that applies to only part of the selection,
 * and `false` reserves the gutter so the column stays aligned. `{ id:
 * "spacer" }` is a divider, and the last item carries `balloon` help.
 */
export const CheckmarksAndDividers: Story = {
	args: {
		name: "storybook_menu_checks",
		menuItems: [
			{ id: "plain", title: "Plain Text", checked: true, onClickFunc: fn() },
			{ id: "bold", title: "Bold", checked: "mixed", onClickFunc: fn() },
			{ id: "italic", title: "Italic", checked: false, onClickFunc: fn() },
			{ id: "spacer" },
			{
				id: "styles",
				title: "Show Styles…",
				balloon: { content: "Opens the style sheet." },
				onClickFunc: fn(),
			},
		],
	},
};
