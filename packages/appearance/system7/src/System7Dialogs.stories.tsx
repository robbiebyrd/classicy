// System 7's dialogs, alerts and push buttons under each of its two themes
// (plan 0018-dbd §3.4): a modeless dialog, a movable modal dialog, a fixed
// modal dialog, the three alerts and the push buttons with the default ring.
// Where a System 7.5 reference capture shows the element
// (docs/system7-reference-screenshots.md, "Dialogs and alerts" and the button
// rows of "Controls"), the story places it where the capture has it; alerts
// are centered by the core, so they compare region for region from their own
// corners. The fixed dialog is a fixed modal that is not an alert, as
// Standard File, Print and Page Setup are: `modal movable={false}`, which
// neither beeps nor takes the error scrim.
import {
	ClassicyAboutWindow,
	ClassicyAlert,
	ClassicyButton,
	type ClassicyFileDialogVolume,
	ClassicyFileOpenDialog,
	ClassicyFileSaveDialog,
	ClassicyIcons,
	ClassicyProgressBar,
	ClassicyWindow,
} from "@classicy/classicy";
import { SB_ICON, StoryApp } from "@sb/helpers";
import { inColor, system7Parameters } from "@sb/system7";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ComponentProps, useEffect } from "react";
import { fn } from "storybook/test";

const meta = {
	title: "Appearance/System 7 Dialogs",
	parameters: system7Parameters,
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Shows a modal dialog's controls at rest. The core focuses a modal's first
 * control (an alert's default button) as it opens, and with no pointer or
 * key pressed yet a browser marks that focus as a keyboard user's
 * (`:focus-visible`, styles/components/_Button.scss), which no capture
 * shows. So the focus a modal takes before the first key or pointer press
 * is let go on the next animation frame, whenever it arrives; after that
 * press the dialog keeps its focus, for trying the keyboard in the story.
 */
function AtRest() {
	useEffect(() => {
		let frame = 0;
		const release = (target: EventTarget | null) => {
			if (
				target instanceof HTMLElement &&
				target.closest(".classicyWindowModal")
			) {
				cancelAnimationFrame(frame);
				frame = requestAnimationFrame(() => target.blur());
			}
		};
		const onFocusIn = (e: FocusEvent) => release(e.target);
		const stop = () => {
			cancelAnimationFrame(frame);
			document.removeEventListener("focusin", onFocusIn);
			document.removeEventListener("keydown", stop, true);
			document.removeEventListener("pointerdown", stop, true);
		};
		document.addEventListener("focusin", onFocusIn);
		document.addEventListener("keydown", stop, true);
		document.addEventListener("pointerdown", stop, true);
		release(document.activeElement);
		return stop;
	}, []);
	return null;
}

/** A dialog window of the Storybook app: no size, zoom or collapse box. */
const Dialog = (
	props: Omit<ComponentProps<typeof ClassicyWindow>, "appId">,
) => (
	<ClassicyWindow
		appId="storybook.app"
		resizable={false}
		zoomable={false}
		collapsable={false}
		scrollable={false}
		hideIcon
		minimumSize={[0, 0]}
		{...props}
	/>
);

const row = { display: "flex", alignItems: "center", gap: 13 } as const;

/** Dialog text: Chicago 12, the system font (HIG p.176). */
const text = {
	margin: 0,
	fontFamily: "var(--ui-font)",
	fontSize: "var(--ui-font-size)",
} as const;

/**
 * A modeless dialog (HIG p.178): a window with a close box and no size or
 * zoom box, its default button ringed. Where
 * `*-dialog-modeless-findfile.png` has Find File.
 */
const modeless = () => (
	<StoryApp id="storybook.app" name="Storybook">
		<Dialog
			id="find-file"
			title="Find File"
			initialSize={[460, 132]}
			initialPosition={[88, 85]}
		>
			<div style={{ padding: 13, display: "grid", gap: 13 }}>
				<p style={text}>Find items on local disks whose name contains</p>
				<div style={{ ...row, justifyContent: "space-between" }}>
					<ClassicyButton margin="sm">More Choices</ClassicyButton>
					<ClassicyButton isDefault margin="sm">
						Find
					</ClassicyButton>
				</div>
			</div>
		</Dialog>
	</StoryApp>
);

export const Modeless: Story = { render: modeless };
export const ModelessColor = inColor(modeless);

/**
 * A movable modal dialog (HIG p.186): the striped title bar with no box,
 * over the modal double frame, and no drop shadow. Where
 * `*-dialog-movablemodal-copy-progress.png` has the Finder's Copy dialog.
 */
const movableModal = () => (
	<StoryApp id="storybook.app" name="Storybook">
		<Dialog
			id="copy"
			title="Copy"
			modal
			closable={false}
			initialSize={[294, 105]}
			initialPosition={[172, 73]}
		>
			<div style={{ display: "grid", gap: 2, lineHeight: "16px" }}>
				<p style={text}>Items remaining to be copied: 204</p>
				<p style={text}>Writing: Macintosh HD</p>
				<div style={row}>
					{/* As captured: 4 rows below the button's top, 14 pixels
					    left of it, 10 of its 186 inside pixels filled. */}
					<ClassicyProgressBar
						value={10}
						max={186}
						style={{
							flex: 1,
							alignSelf: "flex-start",
							marginTop: 4,
							marginRight: 1,
						}}
					/>
					<ClassicyButton style={{ margin: 0 }}>Stop</ClassicyButton>
				</div>
			</div>
		</Dialog>
		<AtRest />
	</StoryApp>
);

export const MovableModal: Story = { render: movableModal };
export const MovableModalColor = inColor(movableModal);

/**
 * A fixed modal dialog (HIG p.190): the double frame alone, no title bar and
 * no drop shadow, with dimmed and default buttons. Standard File's button
 * column, where `*-dialog-standardfile-open.png` has the Open dialog (the
 * list, pop-up and checkbox are §3.5's controls and left out).
 */
const fixedModal = () => (
	<StoryApp id="storybook.app" name="Storybook">
		<Dialog
			id="open"
			title="Open"
			modal
			movable={false}
			closable={false}
			initialSize={[461, 195]}
			initialPosition={[88, 105]}
		>
			<div
				style={{
					display: "grid",
					justifyItems: "end",
					gap: 12,
					paddingTop: 24,
				}}
			>
				<ClassicyButton disabled margin="sm">
					Eject
				</ClassicyButton>
				<ClassicyButton margin="sm">Desktop</ClassicyButton>
				<ClassicyButton margin="sm">Cancel</ClassicyButton>
				<ClassicyButton isDefault margin="sm">
					Open
				</ClassicyButton>
			</div>
		</Dialog>
		<AtRest />
	</StoryApp>
);

export const FixedModal: Story = { render: fixedModal };
export const FixedModalColor = inColor(fixedModal);

// The disk `*-755-dialog-standardfile-layout.png` shows (two SimpleText
// documents and two folders, which fit), and Apple Extras as
// `*-dialog-standardfile-save.png` lists it (folders, and two files a save
// dims); and the desktop, so Desktop is not dimmed.
const documentIcon = ClassicyIcons.system.files.document;
const macintoshHd: ClassicyFileDialogVolume = {
	id: "fs-Macintosh HD",
	label: "Macintosh HD",
	icon: ClassicyIcons.system.drives.disk,
	list: async (path) =>
		path[0] === "Apple Extras"
			? [
					{ id: "applescript", name: "AppleScript\u2122", kind: "folder" },
					{
						id: "energy",
						name: "CPU Energy Saver",
						kind: "file",
						icon: ClassicyIcons.system.files.application,
					},
					{ id: "disk-tools", name: "Disk Tools", kind: "folder" },
					{ id: "portables", name: "Portables", kind: "folder" },
					{ id: "printing", name: "Printing", kind: "folder" },
					{
						id: "simpletext",
						name: "SimpleText",
						kind: "file",
						icon: ClassicyIcons.applications.simpletext.app,
					},
				]
			: path.length > 0
				? []
				: [
						{
							id: "about-75",
							name: "About System 7.5",
							kind: "file",
							icon: documentIcon,
						},
						{
							id: "about-755",
							name: "About System 7.5.5 Update",
							kind: "file",
							icon: documentIcon,
						},
						{ id: "apple-extras", name: "Apple Extras", kind: "folder" },
						{ id: "system-folder", name: "System Folder", kind: "folder" },
					],
};
const desktop: ClassicyFileDialogVolume = {
	id: "desktop",
	label: "Desktop",
	list: async () => [],
};

/** A row of the list, by its name. */
const listRow = (name: string) =>
	[
		...document.querySelectorAll<HTMLElement>(
			".classicyFileOpenDialogWell .classicyTreeNodeLabelHolder",
		),
	].find((el) => el.textContent === name);

/**
 * Once the list has loaded: selects its first item, as the Open capture
 * shows, or enters `folder` with a double-click, as the Save capture shows
 * Apple Extras.
 */
function AfterLoad({ folder }: { folder?: string }) {
	useEffect(() => {
		const timer = window.setTimeout(() => {
			if (folder)
				listRow(folder)?.dispatchEvent(
					new MouseEvent("dblclick", { bubbles: true }),
				);
			else
				document
					.querySelector<HTMLElement>(
						".classicyFileOpenDialogWell .classicyTreeNodeLabelHolder",
					)
					?.click();
		}, 200);
		return () => window.clearTimeout(timer);
	}, [folder]);
	return null;
}

/**
 * Standard File's Open box (the core's `ClassicyFileOpenDialog`), as
 * `*-755-dialog-standardfile-layout.png` draws it (story 0214-c61): a fixed
 * modal dialog box (the package's `fileDialog.frame`), browsing one folder
 * at a time (`fileDialog.navigation: "flat"`), the folder pop-up with the
 * disk's icon centered over the list, the disk's icon and name at the top
 * right, the list (16 px icons, 18 px rows, the first item selected across
 * the row, the vertical bar `fits`), and the button column, Eject (dimmed),
 * Desktop, a line, Cancel and the default Open. QuickTime's Preview area,
 * at the capture's left, is not drawn.
 */
const standardFile = () => (
	<StoryApp id="storybook.app" name="Storybook">
		<ClassicyFileOpenDialog
			id="standard-file"
			appId="storybook.app"
			open
			volumes={[macintoshHd, desktop]}
			onOpenFunc={fn()}
			onCancelFunc={fn()}
		/>
		<AfterLoad />
		<AtRest />
	</StoryApp>
);

export const StandardFile: Story = { render: standardFile };
export const StandardFileColor = inColor(standardFile);

/**
 * The Open box with file-type filters (SimpleText's and HyperCard's): the
 * Show pop-up under the list, where 7.5.5 draws QuickTime's Show Preview
 * (`fileDialog.filterLeft`/`filterTop`).
 */
const standardFileShow = () => (
	<StoryApp id="storybook.app" name="Storybook">
		<ClassicyFileOpenDialog
			id="standard-file-show"
			appId="storybook.app"
			open
			volumes={[macintoshHd, desktop]}
			fileTypeFilters={[
				{ label: "All Documents", types: null },
				{ label: "Text", types: ["text"] },
			]}
			onOpenFunc={fn()}
			onCancelFunc={fn()}
		/>
		<AtRest />
	</StoryApp>
);

export const StandardFileShow: Story = { render: standardFileShow };
export const StandardFileShowColor = inColor(standardFileShow);

/**
 * Standard File's Save box (the core's `ClassicyFileSaveDialog`), as 7.5's
 * `*-dialog-standardfile-save.png` draws it: in Apple Extras, the files
 * dimmed, "Save As:" and the name's field under the list, and the button
 * column Eject, Desktop, New (folder), a line, Cancel and the default Save,
 * placed by the `fileDialog.save*` knobs. SimpleText's document/stationery
 * radio buttons are the application's and not drawn.
 */
const standardFileSave = () => (
	<StoryApp id="storybook.app" name="Storybook">
		<ClassicyFileSaveDialog
			id="standard-file-save"
			appId="storybook.app"
			open
			volumes={[
				{ ...macintoshHd, write: async () => {}, mkDir: async () => {} },
				desktop,
			]}
			formats={[
				{
					label: "SimpleText Document",
					extension: "",
					fileType: "text",
					data: () => "",
				},
			]}
			defaultFileName="untitled 1"
			onSaveFunc={fn()}
			onCancelFunc={fn()}
		/>
		<AfterLoad folder="Apple Extras" />
		<AtRest />
	</StoryApp>
);

export const StandardFileSave: Story = { render: standardFileSave };
export const StandardFileSaveColor = inColor(standardFileSave);

/**
 * A core modal whose contents lay out no margin of their own (the About
 * box): its items start the HIG's 13 white pixels inside the inner line
 * (p.196, `dialogFrame.inset`).
 */
const aboutBox = () => (
	<StoryApp id="storybook.app" name="Storybook">
		<ClassicyAboutWindow
			appId="storybook.app"
			appName="Storybook"
			appIcon={SB_ICON}
			hideFunc={fn()}
		/>
		<AtRest />
	</StoryApp>
);

export const AboutBox: Story = { render: aboutBox };
export const AboutBoxColor = inColor(aboutBox);

/**
 * A caution alert (HIG p.195, p.201): the caution icon, one style of text,
 * and Save as the default button with Cancel and Don't Save beside it, as
 * `*-alert-caution-savechanges.png` shows SimpleText's.
 */
const caution = () => (
	<StoryApp id="storybook.app" name="Storybook">
		<ClassicyAlert
			id="save-changes"
			appId="storybook.app"
			alertType="caution"
			label="Save changes to the document “untitled 1” before closing?"
			buttons={[
				{ id: "dont-save", label: "Don’t Save", onClick: fn() },
				{ id: "cancel", label: "Cancel", role: "cancel", onClick: fn() },
				{ id: "save", label: "Save", role: "default", onClick: fn() },
			]}
			onClose={fn()}
		/>
		<AtRest />
	</StoryApp>
);

export const AlertCaution: Story = { render: caution };
export const AlertCautionColor = inColor(caution);

/**
 * A stop alert (HIG p.196) with its one default button, as
 * `*-alert-stop-pagesetup.png` shows Page Setup's.
 */
const stop = () => (
	<StoryApp id="storybook.app" name="Storybook">
		<ClassicyAlert
			id="no-printer"
			appId="storybook.app"
			alertType="stop"
			label="The printer could not be opened."
			message="Use the Chooser to select a printer."
			onClose={fn()}
		/>
		<AtRest />
	</StoryApp>
);

export const AlertStop: Story = { render: stop };
export const AlertStopColor = inColor(stop);

/**
 * A note alert (HIG p.194, figure 6-18; no 7.5 capture): the note icon and
 * one OK button.
 */
const note = () => (
	<StoryApp id="storybook.app" name="Storybook">
		<ClassicyAlert
			id="note"
			appId="storybook.app"
			alertType="note"
			label="The document has been saved."
			onClose={fn()}
		/>
		<AtRest />
	</StoryApp>
);

export const AlertNote: Story = { render: note };
export const AlertNoteColor = inColor(note);

/**
 * A movable alert: System 7 has none (HIG p.193), so it is drawn as a
 * movable modal dialog, striped, with no red.
 */
const movableAlert = () => (
	<StoryApp id="storybook.app" name="Storybook">
		<ClassicyAlert
			id="movable"
			appId="storybook.app"
			alertType="caution"
			title="Untitled"
			movable
			label="Are you sure you want to empty the Trash?"
			buttons={[
				{ id: "cancel", label: "Cancel", role: "cancel", onClick: fn() },
				{ id: "ok", label: "OK", role: "default", onClick: fn() },
			]}
			onClose={fn()}
		/>
		<AtRest />
	</StoryApp>
);

export const AlertMovable: Story = { render: movableAlert };
export const AlertMovableColor = inColor(movableAlert);

/**
 * The push buttons (HIG pp.205-207): plain and default, each at rest,
 * pressed (held by `depressed`; a press with the pointer shows the same)
 * and dimmed. A dimmed default button keeps its ring, dimmed.
 */
const buttons = () => (
	<StoryApp id="storybook.app" name="Storybook">
		<Dialog
			id="buttons"
			title="Push Buttons"
			closable={false}
			initialSize={[300, 150]}
			initialPosition={[40, 60]}
		>
			<div style={{ display: "grid", gap: 8, padding: 13 }}>
				<div style={row}>
					<ClassicyButton margin="sm">Cancel</ClassicyButton>
					<ClassicyButton depressed margin="sm">
						Cancel
					</ClassicyButton>
					<ClassicyButton disabled margin="sm">
						Eject
					</ClassicyButton>
				</div>
				<div style={row}>
					<ClassicyButton isDefault margin="sm">
						Open
					</ClassicyButton>
					<ClassicyButton isDefault depressed margin="sm">
						Open
					</ClassicyButton>
					<ClassicyButton isDefault disabled margin="sm">
						OK
					</ClassicyButton>
				</div>
			</div>
		</Dialog>
	</StoryApp>
);

export const Buttons: Story = { render: buttons };
export const ButtonsColor = inColor(buttons);
