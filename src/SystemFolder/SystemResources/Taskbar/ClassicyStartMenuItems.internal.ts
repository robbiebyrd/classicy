import {
	type ClassicyAppIdentityOverrides,
	classicyAppIdentityFrom,
} from "@/Appearance/ClassicyAppIdentity";
import type { ActionMessage } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	APPLE_GUIDE_SHOW_HELP_TOPICS_EVENT,
	APPLE_GUIDE_SHOW_TOPIC_EVENT,
} from "@/SystemFolder/Extensions/AppleGuide/AppleGuideContext";
import { ABOUT_BALLOON_HELP_TOPIC_ID } from "@/SystemFolder/Extensions/AppleGuide/AppleGuideTopics";
import type { ClassicyStoreSystemDesktopManagerIcon } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager";
import { classicySpecialMenuItems } from "@/SystemFolder/SystemResources/Desktop/ClassicySpecialMenu";
import {
	CLASSICY_SYSTEM_MENU_APP_PREFIX,
	withClassicyAppIdentityMenuItems,
} from "@/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyAppSwitcherUtils";
import { classicySystemHelpItems } from "@/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyHelpMenu.internal";
import { isClassicyApplicationsEntry } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemApplications";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";

/**
 * The Windows shell's Start menu, as data (plan 0020-w98 §3; WIG Ch.3 "The
 * Start Button", p.15, Figure 3.1): built from what Classicy already has, the
 * Apple menu's entries, the derived Applications folder, the documents opened
 * this session, the Help menu's topic and the Special menu, beside the
 * shell's own Run, Log Off and Shut Down (E2), by a pure function so its
 * structure is read without rendering. Internal: not exported from the
 * package.
 */

/** The id prefix of every item the Start menu builds. */
export const CLASSICY_START_MENU_ITEM_PREFIX = "start-menu_";

/** The balloon toggle's event, the system Help menu's (`classicySystemHelpItems`). */
const BALLOON_HELP_EVENT = "ClassicyDesktopSetBalloonHelp";

/** The images the first level draws, each read at render by its caller. */
export type ClassicyStartMenuImages = {
	/** About This Computer: the core icon `system.macos`. */
	about: string;
	/** Programs: `system.folders.applications`. */
	programs: string;
	/** Settings and its Control Panel: `system.folders.controlPanels`. */
	controlPanel: string;
	/** Help: `system.help`. */
	help: string;
	/** Empty Trash…: the active package's Trash art (`useClassicyTrashIcon`). */
	emptyTrash: string;
	/** Reset PRAM…: `system.bigSwitchOn` (the power coming back on). */
	resetPram: string;
	/** Documents: `system.folders.recentDocuments`. */
	documents: string;
	/** Run…: `system.files.application`. */
	run: string;
	/** Log Off…: `system.security.key`. */
	logOff: string;
	/** Shut Down…: `system.bigSwitchOff`. */
	shutDown: string;
};

/** A document Start ▸ Documents lists, resolved by its caller. */
export type ClassicyStartMenuDocument = {
	/** Its path, which opening it hands Finder's open. */
	path: string;
	/** The name shown: its file name. */
	name: string;
	/** Its icon: the file's own, else its type's. */
	icon: string;
};

export type ClassicyStartMenuItemsInput = {
	/** The Apple menu's items (`System.Manager.Desktop.systemMenu`). */
	systemMenu: readonly ClassicyMenuItem[];
	/** The desktop's icon records (`System.Manager.Desktop.icons`). */
	icons: readonly ClassicyStoreSystemDesktopManagerIcon[];
	/** The apps mounted now (`useClassicyMountedApps`). */
	mountedApps: ReadonlySet<string>;
	/** The active package's display overrides (`useClassicyAppIdentityOverrides`). */
	overrides: ClassicyAppIdentityOverrides;
	/** The store's balloon-help flag, which the toggle's title follows. */
	disableBalloonHelp: boolean;
	images: ClassicyStartMenuImages;
	/** Dispatches the Special menu's dialogs (Empty Trash…, Reset PRAM…) and
	 * the shell's (Run…, Log Off…, Shut Down…). */
	dispatch: (action: ActionMessage) => void;
	/**
	 * Start ▸ Documents: the documents opened this session that still exist
	 * (`useClassicyRecentDocuments`), most recent first. Absent, none.
	 */
	documents?: readonly ClassicyStartMenuDocument[];
	/** Opens a document of Start ▸ Documents (Finder's open). */
	openDocument?: (path: string) => void;
	/**
	 * The signed-in user's name (`ClassicyDesktop`'s `userName`): Log Off
	 * <name>… shows only with one, as Windows 98 shows it for a logged-on
	 * user.
	 */
	userName?: string;
	/**
	 * Start ▸ Help opens the Help Topics browser
	 * (`APPLE_GUIDE_SHOW_HELP_TOPICS_EVENT`, WIG Ch.12 "The Help Topics
	 * Browser", p.284), as the layout's `help.topicWindow` "winhelp" asks;
	 * absent or false, Apple Guide's About Balloon Help topic.
	 */
	helpTopics?: boolean;
};

const SPACER: ClassicyMenuItem = { id: "spacer" };

/** The Control Strip control panel's app id (its manifest module's
 * `CONTROL_STRIP_MANAGER_APP_ID`, not imported: that module registers the
 * app's manifest when it loads). */
const TASKBAR_PANEL_APP_ID = "ControlStripManager.app";

/** Display names in the order Windows lists a menu folder's shortcuts. */
const byTitle = (a: ClassicyMenuItem, b: ClassicyMenuItem): number =>
	(a.title ?? "").localeCompare(b.title ?? "", undefined, {
		sensitivity: "base",
		numeric: true,
	}) || a.id.localeCompare(b.id);

/** What an empty cascading menu shows, as Windows draws an empty folder's. */
const emptyItem = (id: string): ClassicyMenuItem => ({
	id: `${id}_empty`,
	title: "(Empty)",
	disabled: true,
});

/**
 * Start ▸ Programs: one item per app the derived Applications folder lists
 * (an app-shortcut icon record that has not opted out,
 * `isClassicyApplicationsEntry`) whose app is mounted, by its display name
 * and icon, opening it with its internal identity (`ClassicyAppOpen`), sorted
 * by display name.
 */
const programItems = ({
	icons,
	mountedApps,
	overrides,
}: ClassicyStartMenuItemsInput): ClassicyMenuItem[] => {
	const seen = new Set<string>();
	const items: ClassicyMenuItem[] = [];
	for (const icon of icons) {
		if (!isClassicyApplicationsEntry(icon) || !mountedApps.has(icon.appId))
			continue;
		if (seen.has(icon.appId)) continue;
		seen.add(icon.appId);
		const identity = classicyAppIdentityFrom(overrides, icon.appId, {
			name: icon.appName,
			icon: icon.icon,
		});
		items.push({
			id: `${CLASSICY_START_MENU_ITEM_PREFIX}programs_${icon.appId}`,
			title: identity.name,
			image: identity.icon,
			event: "ClassicyAppOpen",
			eventData: {
				app: { id: icon.appId, name: icon.appName, icon: icon.icon },
			},
		});
	}
	return items.sort(byTitle);
};

/**
 * Start ▸ Settings ▸ Control Panel: the Apple menu's app entries
 * (`system_menu_<appId>`) for mounted apps the Applications folder does not
 * list (every bundled control panel, and no bundled app), by display name
 * (`withClassicyAppIdentityMenuItems`), sorted. Each keeps its entry's
 * `ClassicyAppOpen`.
 */
const controlPanelItems = ({
	systemMenu,
	icons,
	mountedApps,
	overrides,
}: ClassicyStartMenuItemsInput): ClassicyMenuItem[] => {
	const listed = new Set(
		icons.filter(isClassicyApplicationsEntry).map((icon) => icon.appId),
	);
	const entries = systemMenu.filter((item) => {
		if (!item?.id?.startsWith(CLASSICY_SYSTEM_MENU_APP_PREFIX)) return false;
		const appId = item.id.slice(CLASSICY_SYSTEM_MENU_APP_PREFIX.length);
		return !listed.has(appId) && mountedApps.has(appId);
	});
	return (withClassicyAppIdentityMenuItems(entries, overrides) ?? [])
		.map((item) => ({
			...item,
			id: `${CLASSICY_START_MENU_ITEM_PREFIX}control-panel_${item.id.slice(
				CLASSICY_SYSTEM_MENU_APP_PREFIX.length,
			)}`,
		}))
		.sort(byTitle);
};

/**
 * Start ▸ Documents (plan 0020-w98 E2): the documents opened this session,
 * sorted by name as Windows lists its Recent folder's, each opening through
 * `openDocument`. Windows 98 led the menu with My Documents, a folder
 * Classicy does not have.
 */
const documentItems = ({
	documents = [],
	openDocument,
}: ClassicyStartMenuItemsInput): ClassicyMenuItem[] =>
	documents
		.map((document, i) => ({
			id: `${CLASSICY_START_MENU_ITEM_PREFIX}documents_${i}`,
			title: document.name,
			image: document.icon,
			onClickFunc: () => openDocument?.(document.path),
		}))
		.sort(byTitle);

/** A shell dialog's Start menu item. */
const shellDialogItem = (
	id: string,
	title: string,
	image: string,
	dialog: "run" | "logOff" | "shutDown",
	dispatch: (action: ActionMessage) => void,
): ClassicyMenuItem => ({
	id: `${CLASSICY_START_MENU_ITEM_PREFIX}${id}`,
	title,
	image,
	onClickFunc: () => {
		dispatch({ type: "ClassicyDesktopShowSystemDialog", dialog });
	},
});

/**
 * The Start menu's items (plan 0020-w98 §3, "Items"), top to bottom:
 *
 * 1. **About This Computer**: the Apple menu's `about` item, drawn with
 *    `images.about`; left out, with its divider, when the Apple menu has none.
 * 2. A divider.
 * 3. **Programs ▸**: `programItems`, or a disabled "(Empty)".
 * 4. **Documents ▸**: `documentItems`, or a disabled "(Empty)" (E2).
 * 5. **Settings ▸**: **Control Panel ▸** (`controlPanelItems`, or "(Empty)"),
 *    **Taskbar & Start Menu...** (the Control Strip control panel's entry,
 *    by its display name, while it is mounted; Windows 98's own item), a
 *    divider, then the system Help menu's **Show Balloons** / **Hide
 *    Balloons** toggle (⌥H, which the headless screen bar dispatches; the
 *    item only shows it), drawn with `images.help`, so the toggle stays
 *    reachable with no window open.
 * 6. **Help**: the Help Topics browser (`helpTopics`), else Apple Guide's
 *    About Balloon Help topic.
 * 7. **Run...**: the Run dialog (E2).
 * 8. A divider, then **Empty Trash…** and **Reset PRAM…**, the Special
 *    menu's (`classicySpecialMenuItems(dispatch, "start")`), Classicy's own,
 *    with no divider between them.
 * 9. A divider, then **Log Off <name>...** (only with a `userName`) and
 *    **Shut Down...** (E2), Windows 98's last group.
 *
 * Windows 98 SE's Start menu (explorer.exe's menu 204) also has Favorites
 * and Find: Classicy keeps no favorites, and its Finder and file browser
 * have no search for Find ▸ Files or Folders… to open, so both are left
 * out. The shell's own items are spelled as Windows spells them, "Run...",
 * "Shut Down..." (three periods); Classicy's keep their "…".
 *
 * First-level items carry their icons through `image` and no keyboard
 * equivalent. Every id but the Special items' starts with
 * `CLASSICY_START_MENU_ITEM_PREFIX`, so none repeats a menu bar's.
 */
export const classicyStartMenuItems = (
	input: ClassicyStartMenuItemsInput,
): ClassicyMenuItem[] => {
	const { systemMenu, disableBalloonHelp, images, dispatch } = input;
	const items: ClassicyMenuItem[] = [];

	const about = systemMenu.find(
		(item) => item?.id === "about" || item?.title === "About This Computer",
	);
	if (about) {
		items.push(
			{
				id: `${CLASSICY_START_MENU_ITEM_PREFIX}about`,
				title: about.title,
				image: images.about,
				...(about.disabled ? { disabled: true } : {}),
				...(about.onClickFunc ? { onClickFunc: about.onClickFunc } : {}),
				...(about.event ? { event: about.event } : {}),
				...(about.eventData ? { eventData: about.eventData } : {}),
			},
			SPACER,
		);
	}

	const programsId = `${CLASSICY_START_MENU_ITEM_PREFIX}programs`;
	const programs = programItems(input);
	items.push({
		id: programsId,
		title: "Programs",
		image: images.programs,
		menuChildren: programs.length > 0 ? programs : [emptyItem(programsId)],
	});

	const documentsId = `${CLASSICY_START_MENU_ITEM_PREFIX}documents`;
	const documents = documentItems(input);
	items.push({
		id: documentsId,
		title: "Documents",
		image: images.documents,
		menuChildren: documents.length > 0 ? documents : [emptyItem(documentsId)],
	});

	const controlPanelId = `${CLASSICY_START_MENU_ITEM_PREFIX}control-panel`;
	const controlPanels = controlPanelItems(input);
	const balloons = classicySystemHelpItems(disableBalloonHelp).find(
		(item) => item.event === BALLOON_HELP_EVENT,
	);
	// Windows 98's Settings ▸ Taskbar & Start Menu..., the taskbar's own
	// properties (the Control Strip control panel, as Windows 98 names it),
	// beside its entry in Control Panel.
	const taskbarPanel = controlPanels.find(
		(item) => item.id === `${controlPanelId}_${TASKBAR_PANEL_APP_ID}`,
	);
	items.push({
		id: `${CLASSICY_START_MENU_ITEM_PREFIX}settings`,
		title: "Settings",
		image: images.controlPanel,
		menuChildren: [
			{
				id: controlPanelId,
				title: "Control Panel",
				image: images.controlPanel,
				menuChildren:
					controlPanels.length > 0
						? controlPanels
						: [emptyItem(controlPanelId)],
			},
			...(taskbarPanel
				? [
						{
							...taskbarPanel,
							id: `${CLASSICY_START_MENU_ITEM_PREFIX}taskbar`,
							title: `${taskbarPanel.title}...`,
						},
					]
				: []),
			...(balloons
				? [
						SPACER,
						{
							...balloons,
							id: `${CLASSICY_START_MENU_ITEM_PREFIX}balloons`,
							// Every item of Explorer's own cascading menus
							// draws its small icon.
							image: images.help,
						},
					]
				: []),
		],
	});

	items.push({
		id: `${CLASSICY_START_MENU_ITEM_PREFIX}help`,
		title: "Help",
		image: images.help,
		...(input.helpTopics
			? // A menu item dispatches its event only with data.
				{ event: APPLE_GUIDE_SHOW_HELP_TOPICS_EVENT, eventData: {} }
			: {
					event: APPLE_GUIDE_SHOW_TOPIC_EVENT,
					eventData: { topicId: ABOUT_BALLOON_HELP_TOPIC_ID },
				}),
	});

	items.push(shellDialogItem("run", "Run...", images.run, "run", dispatch));

	items.push(SPACER);
	for (const item of classicySpecialMenuItems(dispatch, "start")) {
		if (item.id === "spacer") continue;
		items.push({
			...item,
			image: item.id.endsWith("_special_empty_trash")
				? images.emptyTrash
				: images.resetPram,
		});
	}

	items.push(SPACER);
	const userName = input.userName?.trim();
	if (userName)
		items.push(
			shellDialogItem(
				"log-off",
				`Log Off ${userName}...`,
				images.logOff,
				"logOff",
				dispatch,
			),
		);
	items.push(
		shellDialogItem(
			"shut-down",
			"Shut Down...",
			images.shutDown,
			"shutDown",
			dispatch,
		),
	);

	return items;
};
