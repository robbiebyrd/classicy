// Windows 98's ToolTips and status-bar messages: an icon-only toolbar
// button named by a ToolTip (the core's `balloonHelp.unlabeledTips`, timed
// as Windows times them: `delayMs`, `autoPopMs`, `reshowMs`, `hideOnPress`,
// `activeWindowOnly`; WIG Ch.12 "Tooltips", p.276, Figure 12.6), the rich
// text editor's toolbar tips drawn as ToolTips, and a highlighted menu
// item's help in the window's status bar (`menu.itemHelp` "statusBar";
// "Status Bar Messages", pp.276-277, Figure 12.7).
import {
	ClassicyBevelButton,
	ClassicyButtonToolbar,
	ClassicyButtonToolbarGroup,
	type ClassicyMenuItem,
	ClassicyPlacard,
	ClassicyRichTextEditor,
	ClassicyWindow,
	resolveClassicyAsset,
} from "@classicy/classicy";
import { StoryApp } from "@sb/helpers";
import { windows98Parameters } from "@sb/windows98";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
	title: "Appearance/Windows 98/ToolTips",
	parameters: windows98Parameters,
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Icon-only toolbar buttons, each named by a ToolTip: point at one and rest
 * half a second; it goes on a press, after five seconds, or when the
 * pointer leaves, and the next button's shows a tenth of a second after the
 * pointer reaches it. Balloon Help's Show/Hide does not hide them.
 */
export const ToolbarTips: Story = {
	render: () => {
		const icon = resolveClassicyAsset("icons", "system.info") ?? "";
		return (
			<StoryApp id="storybook.app" name="Storybook">
				<ClassicyWindow
					id="windows98-tooltips"
					appId="storybook.app"
					title="Exploring - My Documents"
					initialSize={[360, 140]}
					initialPosition={[80, 60]}
				>
					<ClassicyButtonToolbar>
						<ClassicyButtonToolbarGroup>
							<ClassicyBevelButton icon={icon} iconAlt="Back" />
							<ClassicyBevelButton icon={icon} iconAlt="Forward" />
							<ClassicyBevelButton icon={icon} iconAlt="Up" />
						</ClassicyButtonToolbarGroup>
						<ClassicyButtonToolbarGroup>
							<ClassicyBevelButton icon={icon} iconAlt="Cut" />
							<ClassicyBevelButton icon={icon} iconAlt="Copy" />
							<ClassicyBevelButton icon={icon} iconAlt="Paste" />
						</ClassicyButtonToolbarGroup>
					</ClassicyButtonToolbar>
				</ClassicyWindow>
			</StoryApp>
		);
	},
};

// WordPad's File and Edit menus with the status-bar messages wordpad.exe
// carries (read from the Windows 98 SE CD's string table); Cut and Copy are
// unavailable, with the WIG's own reason (p.278).
const wordpadMenu: ClassicyMenuItem[] = [
	{
		id: "wordpad-file",
		title: "File",
		menuChildren: [
			{
				id: "wordpad-new",
				title: "New...",
				balloon: { content: "Creates a new document" },
			},
			{
				id: "wordpad-open",
				title: "Open...",
				balloon: { content: "Opens an existing document" },
			},
			{
				id: "wordpad-save",
				title: "Save",
				balloon: { content: "Saves the active document" },
			},
			{ id: "spacer" },
			{
				id: "wordpad-exit",
				title: "Exit",
				balloon: {
					content: "Quits the application; prompts you to save documents",
				},
			},
		],
	},
	{
		id: "wordpad-edit",
		title: "Edit",
		menuChildren: [
			{
				id: "wordpad-cut",
				title: "Cut",
				disabled: true,
				balloon: {
					content: "Cuts the selection and puts it on the Clipboard",
					disabledContent:
						"This command is not available because no text is selected.",
				},
			},
			{
				id: "wordpad-copy",
				title: "Copy",
				disabled: true,
				balloon: {
					content: "Copies the selection and puts it on the Clipboard",
					disabledContent:
						"This command is not available because no text is selected.",
				},
			},
			{
				id: "wordpad-paste",
				title: "Paste",
				balloon: { content: "Inserts Clipboard contents" },
			},
			{ id: "spacer" },
			{
				id: "wordpad-select-all",
				title: "Select All",
				balloon: { content: "Selects the entire document" },
			},
		],
	},
];

/**
 * A highlighted menu item's message in the window's status bar, a placard
 * given `menuStatus`: open File or Edit and point at an item (or walk the
 * items with the arrow keys); an unavailable item tells why. The menus show
 * no balloons, and the status bar returns to "For Help, press F1" when the
 * menu closes.
 */
export const MenuStatusBar: Story = {
	render: () => (
		<StoryApp id="storybook.app" name="Storybook">
			<ClassicyWindow
				id="windows98-status"
				appId="storybook.app"
				title="Document - WordPad"
				initialSize={[420, 220]}
				initialPosition={[80, 60]}
				appMenu={wordpadMenu}
				placard={
					<ClassicyPlacard menuStatus>For Help, press F1</ClassicyPlacard>
				}
			>
				<div style={{ padding: "1em" }}>
					<p>Open a menu and point at its items.</p>
				</div>
			</ClassicyWindow>
		</StoryApp>
	),
};

/**
 * The rich text editor's toolbar tips (Undo, Redo, Bold, Italic, Underline,
 * Code, Rule), opened in the desktop and drawn as ToolTips.
 */
export const RichTextEditorTips: Story = {
	render: () => (
		<StoryApp id="storybook.app" name="Storybook">
			<ClassicyWindow
				id="windows98-rich-text"
				appId="storybook.app"
				title="Notes.md - SimpleText"
				initialSize={[420, 240]}
				initialPosition={[80, 60]}
			>
				<ClassicyRichTextEditor
					content={"# Notes\n\nPoint at a **toolbar** button."}
				/>
			</ClassicyWindow>
		</StoryApp>
	),
};
