// The Windows 98 shell (plan 0020-w98): the taskbar with its Start menu,
// Quick Launch, window buttons and status area, the windows it manages
// (minimized, maximized, their pop-up menus and menu bars), message boxes, and
// the shell's own dialogs and settings (the plan's extras E1-E4). Every story
// leaves `parameters.classicy.controlStrip` unset, so the status area holds
// the Control Strip's modules (Sound, Screen Saver, Appearance) as notification
// icons. Scenes that need a menu or pop-up open start it in a play function,
// as the user would (the helpers in @sb/windows98); scenes that need a window
// minimized, maximized or activated run the window's own registry command once
// it has mounted (`WhenWindowsOpen`).
import {
	ClassicyAlert,
	ClassicyApp,
	ClassicyButton,
	type ClassicyMenuItem,
	ClassicyWindow,
} from "@classicy/classicy";
import { SB_ICON, StoryApp } from "@sb/helpers";
import {
	chooseMenuItem,
	hoverForTooltip,
	inScheme,
	noteRecentDocuments,
	openStartMenu,
	openTaskbarMenu,
	openTrayIcon,
	openWindowMenu,
	untilSelector,
	WhenWindowsOpen,
	type Windows98StoryWindow,
	WithActions,
	windows98Parameters,
} from "@sb/windows98";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";

const meta = {
	title: "Appearance/Windows 98/Shell",
	parameters: windows98Parameters,
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const NOTEPAD = "storybook-notepad.app";
const PAINT = "storybook-paint.app";
const DIALER = "storybook-phone-dialer.app";

/** Notepad's menus (WIG Ch.7 "Common Menus", p.110), Help added by the shell. */
const NOTEPAD_MENU: ClassicyMenuItem[] = [
	{
		id: "notepad-file",
		title: "File",
		menuChildren: [
			{ id: "notepad-new", title: "New" },
			{ id: "notepad-open", title: "Open..." },
			{ id: "notepad-save", title: "Save" },
			{ id: "notepad-save-as", title: "Save As..." },
			{ id: "notepad-file-divider" },
			{ id: "notepad-exit", title: "Exit" },
		],
	},
	{
		id: "notepad-edit",
		title: "Edit",
		menuChildren: [
			{ id: "notepad-undo", title: "Undo" },
			{ id: "notepad-edit-divider" },
			{ id: "notepad-cut", title: "Cut" },
			{ id: "notepad-copy", title: "Copy" },
			{ id: "notepad-paste", title: "Paste" },
			{ id: "notepad-delete", title: "Delete" },
			{ id: "notepad-edit-divider-2" },
			{ id: "notepad-select-all", title: "Select All" },
			{ id: "notepad-time-date", title: "Time/Date" },
		],
	},
	{
		id: "notepad-search",
		title: "Search",
		menuChildren: [
			{ id: "notepad-find", title: "Find..." },
			{ id: "notepad-find-next", title: "Find Next" },
		],
	},
];

const PAINT_MENU: ClassicyMenuItem[] = [
	{
		id: "paint-file",
		title: "File",
		menuChildren: [
			{ id: "paint-new", title: "New" },
			{ id: "paint-exit", title: "Exit" },
		],
	},
	{
		id: "paint-image",
		title: "Image",
		menuChildren: [
			{ id: "paint-flip", title: "Flip/Rotate..." },
			{ id: "paint-stretch", title: "Stretch/Skew..." },
		],
	},
];

function Notepad({ position = [60, 40] }: { position?: [number, number] }) {
	return (
		<StoryApp id={NOTEPAD} name="Notepad">
			<ClassicyWindow
				id="notepad"
				appId={NOTEPAD}
				title="Untitled - Notepad"
				initialSize={[420, 240]}
				initialPosition={position}
				appMenu={NOTEPAD_MENU}
			>
				<div style={{ padding: "calc(var(--window-padding-size) * 2)" }}>
					<p>A document window under the Windows 98 shell.</p>
				</div>
			</ClassicyWindow>
		</StoryApp>
	);
}

function Paint() {
	return (
		<StoryApp id={PAINT} name="Paint">
			<ClassicyWindow
				id="paint"
				appId={PAINT}
				title="untitled - Paint"
				initialSize={[360, 220]}
				initialPosition={[300, 120]}
				appMenu={PAINT_MENU}
			>
				<div style={{ padding: "calc(var(--window-padding-size) * 2)" }}>
					<p>Minimized: only its taskbar button shows it.</p>
				</div>
			</ClassicyWindow>
		</StoryApp>
	);
}

/**
 * A fixed-size window, as Windows 98's Phone Dialer is: Minimize, Windows
 * 95's grayed Maximize, and Close.
 */
function PhoneDialer() {
	return (
		<StoryApp id={DIALER} name="Phone Dialer">
			<ClassicyWindow
				id="dialer"
				appId={DIALER}
				title="Phone Dialer"
				initialSize={[220, 160]}
				initialPosition={[520, 200]}
				resizable={false}
				zoomable={false}
			>
				<div style={{ padding: "calc(var(--window-padding-size) * 2)" }}>
					<ClassicyButton isDefault>Dial</ClassicyButton>
					<ClassicyButton>Hang Up</ClassicyButton>
				</div>
			</ClassicyWindow>
		</StoryApp>
	);
}

const NOTEPAD_WINDOW: Windows98StoryWindow = [NOTEPAD, "notepad"];
const PAINT_WINDOW: Windows98StoryWindow = [PAINT, "paint"];
const DIALER_WINDOW: Windows98StoryWindow = [DIALER, "dialer"];

/**
 * Three windows on the taskbar (WIG Ch.10, Figure 10.2): Notepad active
 * (its button pressed), Paint minimized, Phone Dialer behind.
 */
function ThreeWindows({ children }: { children?: ReactNode }) {
	return (
		<WhenWindowsOpen
			windows={[NOTEPAD_WINDOW, PAINT_WINDOW, DIALER_WINDOW]}
			steps={[
				{ appId: PAINT, windowId: "paint", command: { type: "minimize" } },
				{ appId: NOTEPAD, windowId: "notepad", command: { type: "activate" } },
			]}
		>
			<Notepad />
			<Paint />
			<PhoneDialer />
			{children}
		</WhenWindowsOpen>
	);
}

// The plan's scenes (Part 2, step 20).

/** The taskbar with three windows: one active, one minimized. */
export const Taskbar: Story = {
	render: () => <ThreeWindows />,
};

/** The Start menu open (WIG Ch.3, Figure 3.1), with Programs open. */
export const StartMenu: Story = {
	render: () => <ThreeWindows />,
	play: async ({ canvasElement }) => {
		await openStartMenu(canvasElement.ownerDocument, ["start-menu_programs"]);
	},
};

/**
 * A notification icon's menu: button 2 on the status area's Appearance icon
 * (WIG Ch.10 "Taskbar Integration", p.211).
 */
export const TrayMenu: Story = {
	render: () => <ThreeWindows />,
	play: async ({ canvasElement }) => {
		await openTrayIcon(canvasElement.ownerDocument, "Appearance", 2);
	},
};

/**
 * The volume icon's menu: button 2 on it, Windows 98 SE's "Open Volume
 * Controls" alone, bold, the command its double-click runs (shell
 * addendum B3; WIG Ch.10 "Status Notification", p.212).
 */
export const TrayVolumeMenu: Story = {
	render: () => <ThreeWindows />,
	play: async ({ canvasElement }) => {
		await openTrayIcon(canvasElement.ownerDocument, "Volume", 2);
	},
};

/** The Sound icon's volume panel: button 1 on it (WIG Ch.10, p.212). */
export const TraySoundPanel: Story = {
	render: () => <ThreeWindows />,
	play: async ({ canvasElement }) => {
		await openTrayIcon(canvasElement.ownerDocument, "Volume", 1);
	},
};

/**
 * A window's own menu bar with Help open: under the shell every window bar
 * ends with Help, the system's items, then the app's (WIG Ch.7, p.110).
 */
export const WindowMenuBarHelp: Story = {
	render: () => <Notepad position={[120, 60]} />,
	play: async ({ canvasElement }) => {
		await openWindowMenu(
			canvasElement.ownerDocument,
			NOTEPAD,
			"notepad",
			"help-menu",
		);
	},
};

/**
 * A maximized window: its content takes the work area, the taskbar's band
 * left clear, and the Maximize box reads Restore (WIG Ch.6, p.80).
 */
export const MaximizedWindow: Story = {
	render: () => (
		<WhenWindowsOpen
			windows={[NOTEPAD_WINDOW, DIALER_WINDOW]}
			steps={[
				{ appId: NOTEPAD, windowId: "notepad", command: { type: "maximize" } },
			]}
		>
			<PhoneDialer />
			<Notepad />
		</WhenWindowsOpen>
	),
};

/**
 * The window pop-up (system) menu, dropped from the caption's icon as
 * ALT+SPACE drops it (WIG Ch.7, p.102).
 */
export const SystemMenu: Story = {
	render: () => (
		<WhenWindowsOpen
			windows={[NOTEPAD_WINDOW]}
			steps={[
				{
					appId: NOTEPAD,
					windowId: "notepad",
					command: { type: "systemMenu" },
				},
			]}
		>
			<Notepad position={[120, 60]} />
		</WhenWindowsOpen>
	),
	play: async ({ canvasElement }) => {
		await untilSelector(
			canvasElement.ownerDocument,
			".classicyContextMenuWrapper",
		);
	},
};

/** A message box: its caption titled, its own Close box. */
function MessageBox({
	alertType,
	label,
	message,
	buttons,
}: Pick<
	Parameters<typeof ClassicyAlert>[0],
	"alertType" | "label" | "message" | "buttons"
>) {
	return (
		<StoryApp id={NOTEPAD} name="Notepad">
			<ClassicyAlert
				id={`message-box-${alertType}`}
				appId={NOTEPAD}
				title="Notepad"
				alertType={alertType}
				label={label}
				message={message}
				buttons={buttons}
			/>
		</StoryApp>
	);
}

/**
 * An informational message box (WIG Ch.8, Table 8.1 and Figure 8.17): the
 * results of a command, acknowledged with OK.
 */
export const MessageBoxInformation: Story = {
	render: () => (
		<MessageBox alertType="note" label="Finished searching the document." />
	),
};

/**
 * A warning message box (Figure 8.17): a decision before proceeding, here
 * phrased as a question, with Yes, No and Cancel.
 */
export const MessageBoxWarning: Story = {
	render: () => (
		<MessageBox
			alertType="caution"
			label="The text in the Untitled file has changed."
			message="Do you want to save the changes?"
			buttons={[
				{ id: "yes", label: "Yes", role: "default" },
				{ id: "no", label: "No" },
				{ id: "cancel", label: "Cancel", role: "cancel" },
			]}
		/>
	),
};

/**
 * A critical message box (Figure 8.17): a serious problem that stops the
 * work until it is corrected.
 */
export const MessageBoxCritical: Story = {
	render: () => (
		<MessageBox
			alertType="stop"
			label="Cannot find the A:\ drive."
			message="Make sure a disk is in the drive and the drive door is closed."
		/>
	),
};

/** The three-window taskbar under the "Windows 95" scheme. */
export const Windows95Scheme: Story = inScheme("windows95", () => (
	<ThreeWindows />
));

/** The three-window taskbar under the classic "Rainy Day" scheme. */
export const RainyDayScheme: Story = inScheme("windows98RainyDay", () => (
	<ThreeWindows />
));

// E1: the taskbar's menu, Quick Launch and task-band paging.

/**
 * The taskbar's own menu: button 2 on its band (Toolbars, Cascade, Tile,
 * Minimize All Windows, Properties; Windows 98 SE's explorer.exe menu 205).
 */
export const TaskbarMenu: Story = {
	render: () => <ThreeWindows />,
	play: async ({ canvasElement }) => {
		await openTaskbarMenu(canvasElement.ownerDocument);
	},
};

/**
 * Quick Launch, after the Start button: Show Desktop, the Finder, and an app
 * the host marks with `showInQuickLaunch`; each button names itself in a
 * tooltip.
 */
export const QuickLaunch: Story = {
	render: () => (
		<>
			<ClassicyApp
				id="storybook-browser.app"
				name="Web Browser"
				icon={SB_ICON}
				showInQuickLaunch
				showDesktopIcon={false}
			/>
			<ThreeWindows />
		</>
	),
	play: async ({ canvasElement }) => {
		await hoverForTooltip(
			canvasElement.ownerDocument,
			'.classicyTaskbarQuickLaunch button[aria-label="Web Browser"]',
		);
	},
};

const PAGED_WINDOW_COUNT = 48;

/**
 * Task-band paging: more windows than one row holds at the buttons' least
 * width, paged a row at a time behind the up/down control, the active
 * window's row shown (ReactOS's `CTaskSwitchWnd::UpdateButtonsSize`).
 */
export const TaskBandPaging: Story = {
	render: () => (
		<StoryApp id={NOTEPAD} name="Notepad">
			{Array.from({ length: PAGED_WINDOW_COUNT }, (_, i) => (
				<ClassicyWindow
					// biome-ignore lint/suspicious/noArrayIndexKey: a fixed list of windows
					key={i}
					id={`notepad-${i + 1}`}
					appId={NOTEPAD}
					title={`Document ${i + 1} - Notepad`}
					initialSize={[300, 140]}
					initialPosition={[40 + (i % 12) * 20, 30 + (i % 12) * 20]}
				>
					<div style={{ padding: "calc(var(--window-padding-size) * 2)" }}>
						<p>Document {i + 1}</p>
					</div>
				</ClassicyWindow>
			))}
		</StoryApp>
	),
};

// E2: Shut Down, Run, Documents and Log Off.

/** Shut Down Windows over the dimmed screen (shell32.dll's dialog 1065). */
export const ShutDown: Story = {
	render: () => (
		<WithActions
			actions={[
				{ type: "ClassicyDesktopShowSystemDialog", dialog: "shutDown" },
			]}
		>
			<ThreeWindows />
		</WithActions>
	),
};

/** Run, at the work area's lower left, with a history (shell32.dll's 1003). */
export const Run: Story = {
	render: () => (
		<WithActions
			actions={[
				{
					type: "ClassicyDesktopTaskbarAddRunCommand",
					command: "Macintosh HD:Documents",
				},
				{ type: "ClassicyDesktopTaskbarAddRunCommand", command: "Notepad" },
				{ type: "ClassicyDesktopShowSystemDialog", dialog: "run" },
			]}
		>
			<ThreeWindows />
		</WithActions>
	),
};

const RECENT_DOCUMENTS = [
	"Macintosh HD:Documents:Read Me.txt",
	"Macintosh HD:Documents:The Oregon Trail.stack",
	"Macintosh HD:Videos:BuckBunny.mov",
];

/** Start ▸ Documents: the documents opened this session, by name. */
export const StartMenuDocuments: Story = {
	render: () => <ThreeWindows />,
	play: async ({ canvasElement }) => {
		noteRecentDocuments(RECENT_DOCUMENTS);
		await openStartMenu(canvasElement.ownerDocument, ["start-menu_documents"]);
	},
};

/**
 * Start ▸ Log Off <name>…, shown for a host that names its user
 * (`ClassicyDesktop`'s `userName`, here `parameters.classicy.userName`).
 */
export const StartMenuLogOff: Story = {
	parameters: {
		classicy: { ...windows98Parameters.classicy, userName: "Guest" },
	},
	render: () => <ThreeWindows />,
	play: async ({ canvasElement }) => {
		await openStartMenu(canvasElement.ownerDocument);
	},
};

/** Log Off Windows over the dimmed screen (shell32.dll's dialog 1071). */
export const LogOff: Story = {
	parameters: {
		classicy: { ...windows98Parameters.classicy, userName: "Guest" },
	},
	render: () => (
		<WithActions
			actions={[{ type: "ClassicyDesktopShowSystemDialog", dialog: "logOff" }]}
		>
			<ThreeWindows />
		</WithActions>
	),
};

// E3: the flashing task button and the tooltips.

/**
 * A background application asking for the user (WIG Ch.10 "Message
 * Notification", p.212, Figure 10.3): its taskbar button flashes, then holds
 * the highlight, until the user activates it.
 */
export const FlashingTaskButton: Story = {
	render: () => (
		<WhenWindowsOpen
			windows={[NOTEPAD_WINDOW, PAINT_WINDOW]}
			steps={[
				{ appId: NOTEPAD, windowId: "notepad", command: { type: "activate" } },
				{ action: { type: "ClassicyAppRequestAttention", app: { id: PAINT } } },
			]}
		>
			<Paint />
			<Notepad />
		</WhenWindowsOpen>
	),
};

/** The Start button's tooltip, "Click here to begin." (explorer.exe). */
export const StartButtonTooltip: Story = {
	render: () => <ThreeWindows />,
	play: async ({ canvasElement }) => {
		await hoverForTooltip(canvasElement.ownerDocument, ".classicyTaskbarStart");
	},
};

/** A caption button's tooltip: the active window's Close box. */
export const CaptionButtonTooltip: Story = {
	render: () => <Notepad position={[120, 60]} />,
	play: async ({ canvasElement }) => {
		await hoverForTooltip(
			canvasElement.ownerDocument,
			".classicyWindow.active .classicyWindowCloseBox",
		);
	},
};

// E4: Taskbar Properties and docking.

/**
 * Taskbar Properties, from the taskbar menu's Properties: Always on top,
 * Auto hide, Show small icons in Start menu, Show Clock.
 */
export const TaskbarProperties: Story = {
	render: () => <ThreeWindows />,
	play: async ({ canvasElement }) => {
		const doc = canvasElement.ownerDocument;
		await openTaskbarMenu(doc);
		await chooseMenuItem(doc, "taskbar-properties");
		await untilSelector(doc, ".classicyTaskbarProperties");
	},
};

/** Docked to the left edge: the buttons stack, the work area follows. */
export const DockedLeft: Story = {
	render: () => (
		<WithActions
			actions={[{ type: "ClassicyDesktopTaskbarSetEdge", edge: "left" }]}
		>
			<ThreeWindows />
		</WithActions>
	),
};

/** Docked to the top edge, the Start menu opening below the Start button. */
export const DockedTop: Story = {
	render: () => (
		<WithActions
			actions={[{ type: "ClassicyDesktopTaskbarSetEdge", edge: "top" }]}
		>
			<ThreeWindows />
		</WithActions>
	),
	play: async ({ canvasElement }) => {
		await openStartMenu(canvasElement.ownerDocument);
	},
};

/** Auto hide: the taskbar slides off its edge but for a 2 px strip. */
export const AutoHide: Story = {
	render: () => (
		<WithActions
			actions={[
				{
					type: "ClassicyDesktopTaskbarSetOptions",
					options: { autoHide: true },
				},
			]}
		>
			<ThreeWindows />
		</WithActions>
	),
};

/** Show small icons in Start menu: small icons, no banner. */
export const SmallStartMenuIcons: Story = {
	render: () => (
		<WithActions
			actions={[
				{
					type: "ClassicyDesktopTaskbarSetOptions",
					options: { smallStartMenuIcons: true },
				},
			]}
		>
			<ThreeWindows />
		</WithActions>
	),
	play: async ({ canvasElement }) => {
		await openStartMenu(canvasElement.ownerDocument);
	},
};
