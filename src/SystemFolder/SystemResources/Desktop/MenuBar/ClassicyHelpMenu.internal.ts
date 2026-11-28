import { APPLE_GUIDE_SHOW_TOPIC_EVENT } from "@/SystemFolder/Extensions/AppleGuide/AppleGuideContext";
import { ABOUT_BALLOON_HELP_TOPIC_ID } from "@/SystemFolder/Extensions/AppleGuide/AppleGuideTopics";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";

/**
 * The Help menu's assembly, shared by the screen menu bar
 * (`ClassicyDesktopMenuBar`, every package) and a window's own menu bar under
 * a taskbar (`ClassicyWindowMenuBar`, plan 0020-w98 §4). One Help menu holds
 * the system's items, then the focused app's registered items
 * (`useClassicyHelpMenu`), then the items of the app's own top-level Help
 * menus, merged in rather than drawn as a second "Help" title (HIGOS8 Ch.4
 * "Help menus", pp.91–92, Figure 4-2; HIG7 "The Help Menu", p.125; WIG Ch.7
 * "The Help Menu", p.99).
 */

/** The event of the system Help menu's Show/Hide Balloons toggle. */
const BALLOON_HELP_EVENT = "ClassicyDesktopSetBalloonHelp";

/**
 * Depth-first search of a menu tree for an app's "About" item. Apps publish
 * their About entry (id `${appId}_about`, title "About") nested somewhere in
 * their menu (typically under a Help or apple submenu — see
 * `useClassicyAboutMenu`). Preference order per the HIG #209 rule: an exact
 * `${appId}_about` id, then any id ending in `_about`, then a title of "About".
 */
export const findClassicyAppAboutItem = (
	items: ClassicyMenuItem[] | undefined,
	appId: string,
): ClassicyMenuItem | undefined => {
	if (!items) return undefined;
	const matches = (item: ClassicyMenuItem): boolean =>
		item.id === `${appId}_about` ||
		item.id?.endsWith("_about") === true ||
		item.title === "About";
	const search = (
		list: ClassicyMenuItem[],
		predicate: (item: ClassicyMenuItem) => boolean,
	): ClassicyMenuItem | undefined => {
		for (const item of list) {
			if (predicate(item)) return item;
			if (item.menuChildren && item.menuChildren.length > 0) {
				const found = search(item.menuChildren, predicate);
				if (found) return found;
			}
		}
		return undefined;
	};
	// Prefer the focused app's exact About id before the looser fallbacks so an
	// unrelated `_about` entry can't shadow the real one.
	return (
		search(items, (item) => item.id === `${appId}_about`) ??
		search(items, matches)
	);
};

/** Drop leading/trailing dividers and collapse runs left behind by a removal. */
export const trimClassicyMenuSpacers = (
	items: ClassicyMenuItem[],
): ClassicyMenuItem[] => {
	const trimmed: ClassicyMenuItem[] = [];
	for (const item of items) {
		if (
			item.id === "spacer" &&
			(trimmed.length === 0 || trimmed[trimmed.length - 1].id === "spacer")
		) {
			continue;
		}
		trimmed.push(item);
	}
	while (trimmed.length > 0 && trimmed[trimmed.length - 1].id === "spacer") {
		trimmed.pop();
	}
	return trimmed;
};

/**
 * Remove the hoisted About entry (matched by reference — it came out of this
 * same tree via `findClassicyAppAboutItem`) from the app's published menus so
 * About renders only where the bar puts it. Menus emptied by the removal are
 * dropped entirely, and dividers left dangling by it are tidied away.
 */
export const stripClassicyAboutItem = (
	items: ClassicyMenuItem[],
	aboutItem: ClassicyMenuItem,
): ClassicyMenuItem[] =>
	items.flatMap((item) => {
		if (item === aboutItem) return [];
		if (!item.menuChildren || item.menuChildren.length === 0) return [item];
		const menuChildren = trimClassicyMenuSpacers(
			stripClassicyAboutItem(item.menuChildren, aboutItem),
		);
		if (menuChildren.length === 0) return [];
		return [{ ...item, menuChildren }];
	});

/**
 * The system's own Help items, the ones the screen bar's Help menu always
 * leads with: About Balloon Help… (Apple Guide's topic) and the Show/Hide
 * Balloons toggle, ⌥H, wired to the store's balloon-help flag. Option-H
 * rather than a ⌘ combo, since the browser reserves most ⌘/Ctrl+letter
 * chords; it fires whether or not the Help menu is dropped down.
 */
export const classicySystemHelpItems = (
	disableBalloonHelp: boolean,
): ClassicyMenuItem[] => [
	{
		id: "help-about-balloon",
		title: "About Balloon Help…",
		event: APPLE_GUIDE_SHOW_TOPIC_EVENT,
		eventData: { topicId: ABOUT_BALLOON_HELP_TOPIC_ID },
	},
	{
		id: "help-toggle-balloons",
		title: disableBalloonHelp ? "Show Balloons" : "Hide Balloons",
		keyboardShortcut: "⌥H",
		event: BALLOON_HELP_EVENT,
		eventData: { disableBalloonHelp: !disableBalloonHelp },
	},
];

/**
 * True for an app's own top-level Help menu: an item that is a menu (it has
 * `menuChildren`) whose `part` is `"help"`, whose `id` ends with `_help`, or
 * whose `title` is `"Help"`. A bare command titled "Help" is not one.
 */
export const isClassicyAppHelpMenu = (item: ClassicyMenuItem): boolean =>
	item.menuChildren !== undefined &&
	(item.part === "help" ||
		item.id?.endsWith("_help") === true ||
		item.title === "Help");

/**
 * Split an app's top-level menus into its Help menus
 * (`isClassicyAppHelpMenu`), whose items `classicyHelpMenuChildren` merges
 * into the one Help menu, and every other menu, drawn as given. The order of
 * each list is kept.
 */
export const splitClassicyAppHelpMenus = (
	items: ClassicyMenuItem[],
): { menus: ClassicyMenuItem[]; helpMenus: ClassicyMenuItem[] } => {
	const menus: ClassicyMenuItem[] = [];
	const helpMenus: ClassicyMenuItem[] = [];
	for (const item of items) {
		(isClassicyAppHelpMenu(item) ? helpMenus : menus).push(item);
	}
	return { menus, helpMenus };
};

/**
 * An app's Help items as the merged menu draws them: any that repeats the
 * system's balloon toggle (`event: "ClassicyDesktopSetBalloonHelp"`) dropped,
 * since the system Help already has it, and the dividers that leaves tidied.
 */
const withoutBalloonToggle = (items: ClassicyMenuItem[]): ClassicyMenuItem[] =>
	trimClassicyMenuSpacers(
		items.filter((item) => item.event !== BALLOON_HELP_EVENT),
	);

/**
 * The one Help menu's items: `system` (`classicySystemHelpItems`), then a
 * divider and the app's registered items (`Desktop.helpMenu[appId]`,
 * `useClassicyHelpMenu`) if any, then a divider and the items of the app's
 * own Help menus (`appHelpMenus`, each a top-level menu
 * `isClassicyAppHelpMenu` accepts, a divider between two of them) if any. An
 * app item, registered or its own, whose `event` is
 * `"ClassicyDesktopSetBalloonHelp"` is dropped, because the system Help
 * already has the toggle; a group the drop leaves empty adds no divider.
 */
export const classicyHelpMenuChildren = (
	system: ClassicyMenuItem[],
	registered: ClassicyMenuItem[] | undefined,
	appHelpMenus: ClassicyMenuItem[],
): ClassicyMenuItem[] => {
	const children = [...system];
	const registeredItems = withoutBalloonToggle(registered ?? []);
	if (registeredItems.length > 0) {
		children.push({ id: "spacer" }, ...registeredItems);
	}
	const ownItems = trimClassicyMenuSpacers(
		appHelpMenus.flatMap((menu, index) => {
			const items = withoutBalloonToggle(menu.menuChildren ?? []);
			return index === 0 ? items : [{ id: "spacer" }, ...items];
		}),
	);
	if (ownItems.length > 0) {
		children.push({ id: "spacer" }, ...ownItems);
	}
	return children;
};
