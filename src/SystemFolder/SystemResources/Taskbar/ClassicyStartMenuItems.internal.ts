import {
	type ClassicyAppIdentityOverrides,
	classicyAppIdentityFrom,
} from "@/Appearance/ClassicyAppIdentity";
import type { ActionMessage } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { APPLE_GUIDE_SHOW_TOPIC_EVENT } from "@/SystemFolder/Extensions/AppleGuide/AppleGuideContext";
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
 * Apple menu's entries, the derived Applications folder, the Help menu's
 * topic and the Special menu, by a pure function so its structure is read
 * without rendering. Internal: not exported from the package.
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
	/** Reset PRAM…: `system.bigSwitchOff`. */
	resetPram: string;
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
	/** Dispatches the Special menu's dialogs (Empty Trash…, Reset PRAM…). */
	dispatch: (action: ActionMessage) => void;
};

const SPACER: ClassicyMenuItem = { id: "spacer" };

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
 * The Start menu's items (plan 0020-w98 §3, "Items"), top to bottom:
 *
 * 1. **About This Computer**: the Apple menu's `about` item, drawn with
 *    `images.about`; left out, with its divider, when the Apple menu has none.
 * 2. A divider.
 * 3. **Programs ▸**: `programItems`, or a disabled "(Empty)".
 * 4. **Settings ▸**: **Control Panel ▸** (`controlPanelItems`, or "(Empty)"),
 *    a divider, then the system Help menu's **Show Balloons** / **Hide
 *    Balloons** toggle (⌥H, which the headless screen bar dispatches; the
 *    item only shows it), so the toggle stays reachable with no window open.
 * 5. **Help**: Apple Guide's About Balloon Help topic, Classicy's Help Topics.
 * 6. A divider.
 * 7. **Empty Trash…** and 8. **Reset PRAM…**, the Special menu's
 *    (`classicySpecialMenuItems(dispatch, "start")`), in Shut Down's place,
 *    with no divider between them, as Windows draws Log Off and Shut Down.
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

	const controlPanelId = `${CLASSICY_START_MENU_ITEM_PREFIX}control-panel`;
	const controlPanels = controlPanelItems(input);
	const balloons = classicySystemHelpItems(disableBalloonHelp).find(
		(item) => item.event === BALLOON_HELP_EVENT,
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
			...(balloons
				? [
						SPACER,
						{
							...balloons,
							id: `${CLASSICY_START_MENU_ITEM_PREFIX}balloons`,
						},
					]
				: []),
		],
	});

	items.push({
		id: `${CLASSICY_START_MENU_ITEM_PREFIX}help`,
		title: "Help",
		image: images.help,
		event: APPLE_GUIDE_SHOW_TOPIC_EVENT,
		eventData: { topicId: ABOUT_BALLOON_HELP_TOPIC_ID },
	});

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

	return items;
};
