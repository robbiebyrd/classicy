// Windows 98 on the desktop, under its schemes: a document window and the
// common controls, drawn by the package's stylesheet over Classicy's
// structure, with the default package's art where Windows 98 registers none.
import {
	ClassicyButton,
	ClassicyCheckbox,
	ClassicyInput,
	type ClassicyMenuItem,
	ClassicyPopUpMenu,
	ClassicyProgressBar,
	ClassicyRadioInput,
	ClassicyWindow,
} from "@classicy/classicy";
import { StoryApp } from "@sb/helpers";
import { inScheme, windows98Parameters } from "@sb/windows98";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
	title: "Appearance/Windows 98",
	parameters: windows98Parameters,
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function Windows98Window({ appMenu }: { appMenu?: ClassicyMenuItem[] }) {
	return (
		<StoryApp id="storybook.app" name="Storybook">
			<ClassicyWindow
				id="windows98"
				appId="storybook.app"
				title="Untitled - Notepad"
				initialSize={[380, 260]}
				initialPosition={[80, 60]}
				appMenu={appMenu}
			>
				<div style={{ padding: "1em" }}>
					<p>A Windows 98 document window.</p>
					<ClassicyInput id="windows98-input" placeholder="Edit field" />
					<ClassicyCheckbox id="windows98-checkbox" label="Word Wrap" />
					<ClassicyRadioInput
						name="windows98-radio"
						label="Orientation"
						inputs={[
							{ id: "windows98-portrait", label: "Portrait", checked: true },
							{ id: "windows98-landscape", label: "Landscape" },
						]}
					/>
					<ClassicyPopUpMenu
						id="windows98-popup"
						label="Font"
						options={[
							{ value: "sans", label: "MS Sans Serif" },
							{ value: "fixed", label: "Fixedsys" },
						]}
					/>
					<ClassicyProgressBar value={60} />
					<ClassicyButton isDefault>OK</ClassicyButton>
					<ClassicyButton>Cancel</ClassicyButton>
				</div>
			</ClassicyWindow>
		</StoryApp>
	);
}

/** The "Windows Standard" scheme, the package's defaults. */
export const WindowsStandard: Story = {
	render: () => <Windows98Window />,
};

/** The "Windows 95" scheme: flat navy title bars. */
export const Windows95: Story = inScheme("windows95", () => (
	<Windows98Window />
));

/** The "Brick" scheme. */
export const Brick: Story = inScheme("windows98Brick", () => (
	<Windows98Window />
));

/** The "Rainy Day" scheme. */
export const RainyDay: Story = inScheme("windows98RainyDay", () => (
	<Windows98Window />
));

// File and Edit menus modeled on Windows 98 Notepad's: the access keys
// Notepad gives where the first free letter would differ (Save As "A", Page
// Setup "t", Exit "x", Cut "t", Delete "l", Select All "A"; the rest take
// the first free letter, `menu.accessKeys` "auto"), shortcuts spelled by
// name (`menu.shortcutSpelling` "names"; the File menu's are added to show
// them), and an empty submenu (Recent Files, not Notepad's).
const notepadMenu: ClassicyMenuItem[] = [
	{
		id: "notepad-file",
		title: "File",
		menuChildren: [
			{ id: "notepad-new", title: "New", keyboardShortcut: "⌃N" },
			{ id: "notepad-open", title: "Open...", keyboardShortcut: "⌃O" },
			{ id: "notepad-save", title: "Save", keyboardShortcut: "⌃S" },
			{ id: "notepad-save-as", title: "Save As...", accessKey: "A" },
			{ id: "spacer" },
			{ id: "notepad-page-setup", title: "Page Setup...", accessKey: "t" },
			{ id: "notepad-print", title: "Print" },
			{ id: "notepad-recent", title: "Recent Files", menuChildren: [] },
			{ id: "spacer" },
			{ id: "notepad-exit", title: "Exit", accessKey: "x" },
		],
	},
	{
		id: "notepad-edit",
		title: "Edit",
		menuChildren: [
			{ id: "notepad-undo", title: "Undo", keyboardShortcut: "⌃Z" },
			{ id: "spacer" },
			{
				id: "notepad-cut",
				title: "Cut",
				accessKey: "t",
				keyboardShortcut: "⌃X",
			},
			{ id: "notepad-copy", title: "Copy", keyboardShortcut: "⌃C" },
			{ id: "notepad-paste", title: "Paste", keyboardShortcut: "⌃V" },
			{
				id: "notepad-delete",
				title: "Delete",
				accessKey: "l",
				keyboardShortcut: "⌦",
			},
			{ id: "spacer" },
			{ id: "notepad-select-all", title: "Select All", accessKey: "A" },
			{ id: "notepad-time", title: "Time/Date", keyboardShortcut: "F5" },
		],
	},
];

/**
 * Access keys and shortcut names: every menu title, item and control label
 * underlines its access key (Alt+F opens File, a letter in an open menu
 * chooses its item, Alt alone or F10 takes the menu bar, Alt and a label's
 * letter reaches its control), the shortcuts read Ctrl+S, and Recent Files,
 * an empty submenu, shows "(Empty)" (WIG Ch.7 pp.97, 106, 109-110; Ch.8
 * pp.148-149).
 */
export const AccessKeys: Story = {
	render: () => <Windows98Window appMenu={notepadMenu} />,
};
