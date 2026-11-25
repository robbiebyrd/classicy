// Windows 98 on the desktop, under its schemes: a document window and the
// common controls, drawn by the package's stylesheet over Classicy's
// structure, with the default package's art where Windows 98 registers none.
import {
	ClassicyBalloonHelp,
	ClassicyButton,
	ClassicyCheckbox,
	ClassicyInput,
	ClassicyListBox,
	type ClassicyMenuItem,
	ClassicyMeter,
	ClassicyPopUpMenu,
	ClassicyProgressBar,
	ClassicyRadioInput,
	ClassicySpinner,
	ClassicySplitView,
	type ClassicySplitViewCommands,
	ClassicyTable,
	ClassicyTree,
	ClassicyWindow,
} from "@classicy/classicy";
import { StoryApp } from "@sb/helpers";
import { inScheme, windows98Parameters } from "@sb/windows98";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useRef, useState } from "react";

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

const components = [
	{ value: "accessibility", label: "Accessibility Options" },
	{ value: "accessories", label: "Accessories" },
	{ value: "communications", label: "Communications" },
	{ value: "desktop-themes", label: "Desktop Themes" },
	{ value: "multimedia", label: "Multimedia" },
];

const folders = [
	{
		id: "c",
		label: "(C:)",
		defaultOpen: true,
		children: [
			{ id: "my-documents", label: "My Documents" },
			{
				id: "program-files",
				label: "Program Files",
				children: [{ id: "accessories-folder", label: "Accessories" }],
			},
			{ id: "windows", label: "Windows" },
		],
	},
	{ id: "d", label: "(D:)" },
];

const files = [
	{ id: "readme", name: "Readme.txt", size: "4KB" },
	{ id: "setup", name: "Setup.exe", size: "120KB" },
	{ id: "notes", name: "Notes.txt", size: "1KB" },
];

/** The controls of the WIG audit's controls pass, in one window. */
function ControlsWindow({
	id,
	title,
	position,
}: {
	id: string;
	title: string;
	position: [number, number];
}) {
	const [chosen, setChosen] = useState(["accessories", "multimedia"]);
	const [folder, setFolder] = useState(["windows"]);
	const [file, setFile] = useState(["setup"]);
	return (
		<ClassicyWindow
			id={id}
			appId="storybook.app"
			title={title}
			initialSize={[300, 470]}
			initialPosition={position}
		>
			<div style={{ padding: "1em", display: "grid", gap: "0.75em" }}>
				<ClassicyListBox
					id={`${id}-components`}
					label="Components"
					selectionMode="multi"
					checkboxes
					visibleRows={4}
					options={components}
					selected={chosen}
					onChangeFunc={setChosen}
				/>
				<ClassicyTree
					nodes={folders}
					selectionMode="single"
					selectedIds={folder}
					onSelectNode={(nodeId) => setFolder([nodeId])}
				/>
				<ClassicyTable
					columns={[
						{ id: "name", title: "Name", accessor: (f) => f.name },
						{ id: "size", title: "Size", accessor: (f) => f.size },
					]}
					rows={files}
					getRowId={(f) => f.id}
					selected={file}
					onSelectionChange={setFile}
				/>
				<ClassicySpinner
					id={`${id}-hour`}
					labelTitle="Hour:"
					labelPosition="left"
					prefillValue={12}
					minValue={1}
					maxValue={12}
					wrap
				/>
				<ClassicyMeter label="Disk space" value={60} high={80} optimum={0} />
				<ClassicyMeter label="Nearly full" value={85} high={80} optimum={0} />
				<ClassicyMeter
					label="Battery"
					value={8}
					low={10}
					high={90}
					optimum={100}
					segments={10}
				/>
				<ClassicyBalloonHelp content="Applies the settings.">
					<ClassicyButton>Apply</ClassicyButton>
				</ClassicyBalloonHelp>
			</div>
		</ClassicyWindow>
	);
}

/**
 * The controls pass (the WIG audit's 7.21, 7.25-7.27, 14.5, 6.4 / 13.8):
 * a multiple selection list with flat check boxes, a tree on the bare arrow
 * keys (Right expands or goes in, Left collapses or goes up), a spin box
 * that wraps on its arrows and Up and Down, meters whose warning zones carry
 * a pattern beside their color, and a ToolTip under the resting pointer,
 * gone on a click. The window behind is inactive: its tree's, list's and
 * table's selections are ButtonFace, as Explorer's are (the list box keeps
 * its Hilight, as Windows' list box does).
 */
export const Controls: Story = {
	render: () => (
		<StoryApp id="storybook.app" name="Storybook">
			<ControlsWindow
				id="windows98-behind"
				title="Behind"
				position={[20, 30]}
			/>
			<ControlsWindow
				id="windows98-front"
				title="In front"
				position={[340, 40]}
			/>
		</StoryApp>
	),
};

// A long document, so each pane scrolls on its own.
const readme = (title: string) => (
	<div style={{ padding: "0.5em" }}>
		{Array.from({ length: 30 }, (_, i) => (
			// biome-ignore lint/suspicious/noArrayIndexKey: a fixed list of filler lines
			<p key={i}>
				{title}, paragraph {i + 1}.
			</p>
		))}
	</div>
);

/** A document window the user splits from its split box or View menu. */
function SplitWindow() {
	const commandsRef = useRef<ClassicySplitViewCommands>(null);
	const [split, setSplit] = useState(false);
	const viewMenu: ClassicyMenuItem[] = [
		{
			id: "split-view",
			title: "View",
			menuChildren: [
				split
					? {
							id: "split-remove",
							title: "Remove Split",
							onClickFunc: () => commandsRef.current?.removeSplit(),
						}
					: {
							id: "split-split",
							title: "Split",
							onClickFunc: () => commandsRef.current?.split(),
						},
			],
		},
	];
	return (
		<StoryApp id="storybook.app" name="Storybook">
			<ClassicyWindow
				id="windows98-split"
				appId="storybook.app"
				title="Readme.txt - WordPad"
				initialSize={[380, 320]}
				initialPosition={[80, 40]}
				appMenu={viewMenu}
				scrollable={false}
			>
				<ClassicySplitView
					direction="vertical"
					splittable
					defaultClosed="leading"
					onSplitChange={(closed) => setSplit(closed === null)}
					commandsRef={commandsRef}
				>
					{readme("Upper pane")}
					{readme("Lower pane")}
				</ClassicySplitView>
			</ClassicyWindow>
		</StoryApp>
	);
}

/**
 * Scrolling and splitting (the WIG audit's 6.10, 6.12 and 6.13): the window
 * opens unsplit, a raised split box above the vertical scroll bar's up arrow
 * (WIG Ch.6, Figure 6.11). Drag it down to split the window; the split bar
 * draws in the halftone while it moves, and dragging it back to either end
 * (or double-clicking it) closes the split. View > Split splits in the
 * middle and moves the split from the keyboard: the arrow keys move it,
 * Enter sets it, Esc cancels. Drag a scroll box and move the pointer well
 * away from its bar: the document snaps back to where the drag began, and
 * follows again when the pointer returns (p.89).
 */
export const Splitting: Story = {
	render: () => <SplitWindow />,
};
