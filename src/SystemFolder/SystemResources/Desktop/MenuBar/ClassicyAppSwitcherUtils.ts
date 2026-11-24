import {
	CLASSICY_NO_APP_IDENTITY_OVERRIDES,
	type ClassicyAppIdentityOverrides,
	classicyAppIdentityFrom,
} from "@/Appearance/ClassicyAppIdentity";
import type { ClassicyStoreSystemApp } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";

export type ClassicyAppSwitcherEntry = {
	id: string;
	name: string;
	icon: string;
	focused?: boolean;
	/** An extension, listed only while it is the front application. */
	extension?: boolean;
	open: boolean;
	/** Hidden by the Application menu's Hide commands. */
	hidden?: boolean;
	/**
	 * A Notification Manager request marks the app (`classicyNotify` with
	 * `mark`): its name carries a ◆ while it is in the background.
	 */
	notified?: boolean;
};

const CLASSICY_NO_NOTIFIED_APPS: ReadonlySet<string> = new Set();

/**
 * The mark an Application menu row draws in its mark column: the front
 * application's check, else a ◆ for an app a notification marks (Inside
 * Macintosh: Processes, p. 5-4: "the diamond is replaced by a checkmark if
 * your application is the active application"), else none.
 */
export const appSwitcherEntryMark = (
	entry: Pick<ClassicyAppSwitcherEntry, "notified">,
	front: boolean,
): Pick<ClassicyMenuItem, "checked" | "mark"> =>
	front
		? { checked: true }
		: entry.notified
			? { checked: false, mark: "diamond" }
			: { checked: false };

/** The accessible description of a hidden application's entry. */
export const CLASSICY_APP_SWITCHER_HIDDEN_DESCRIPTION = "Hidden";

/**
 * The accessible description of an Application menu row or an Application
 * Switcher button, for the state only its look shows: a hidden application
 * (its icon dimmed, HIG7 p.127) is "Hidden", and, with `marked` (the menu's
 * ◆; the palette draws none), one a notification marks also "Requests your
 * attention". `undefined` when there is neither.
 */
export const appSwitcherEntryDescription = (
	entry: Pick<ClassicyAppSwitcherEntry, "hidden" | "notified">,
	{ marked = false }: { marked?: boolean } = {},
): string | undefined => {
	const parts = [
		...(entry.hidden ? [CLASSICY_APP_SWITCHER_HIDDEN_DESCRIPTION] : []),
		...(marked && entry.notified ? ["Requests your attention"] : []),
	];
	return parts.length > 0 ? parts.join(", ") : undefined;
};

/** What `appSwitcherAppsFrom` needs beyond the apps and their identities. */
export type ClassicyAppSwitcherOptions = {
	/**
	 * The front application (`useFrontAppId()` / `frontAppIdOf`). When given,
	 * it alone is `focused`, and an extension is listed only when it is the
	 * front application (its window publishes menus).
	 */
	frontAppId?: string;
	/**
	 * The apps a Notification Manager request marks
	 * (`useClassicyNotifiedAppIds()`); each is `notified`.
	 */
	notifiedAppIds?: ReadonlySet<string>;
};

/**
 * Orders entries by display name, as the Application menu and the
 * Application Switcher list them (Mac OS 8.5: Calculator, Finder, Help
 * Viewer, Note Pad, Stickies, `resources/screenshots/mac-os-8.5/
 * platinum-85-appmenu-order.png` beside Platinum's source); a tie keeps the
 * ids' order, so the list never depends on the store's key order.
 */
const byDisplayName = (
	a: ClassicyAppSwitcherEntry,
	b: ClassicyAppSwitcherEntry,
): number =>
	a.name.localeCompare(b.name, "en", { sensitivity: "base" }) ||
	(a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/**
 * Apps eligible for the menu-bar App Switcher: open (or transiently focused)
 * and not background extensions — extensions run with open: true but never
 * surface in the switcher, except one that is `frontAppId` (it publishes
 * menus, so the bar names it; its entry carries `extension`). Each entry
 * shows the app's display identity: its name and icon as `overrides` (the
 * active package's `apps`) resolve them, else the record's own. An app in
 * `notifiedAppIds` is `notified`. Entries come in alphabetical order of the
 * names shown, the Application menu's order in Mac OS, which the
 * Application Switcher's palette and its keyboard chord share.
 */
export function appSwitcherAppsFrom(
	apps: Record<string, ClassicyStoreSystemApp>,
	overrides: ClassicyAppIdentityOverrides = CLASSICY_NO_APP_IDENTITY_OVERRIDES,
	{
		frontAppId,
		notifiedAppIds = CLASSICY_NO_NOTIFIED_APPS,
	}: ClassicyAppSwitcherOptions = {},
): ClassicyAppSwitcherEntry[] {
	return (
		Object.values(apps)
			// An extension is listed only while it is the front application (its
			// window publishes menus), so the bar can name it.
			.filter(
				(a) => (a.open || a.focused) && (!a.extension || a.id === frontAppId),
			)
			.map((a) => {
				const { name, icon } = classicyAppIdentityFrom(overrides, a.id, a);
				return {
					id: a.id,
					name,
					icon,
					// With a front app given (`frontAppIdOf`) it alone is focused, so an
					// extension's window holding focus leaves the title on the app in use.
					focused: frontAppId === undefined ? a.focused : a.id === frontAppId,
					...(a.extension ? { extension: true } : {}),
					open: a.open,
					...(a.hidden ? { hidden: true } : {}),
					...(notifiedAppIds.has(a.id) ? { notified: true } : {}),
				};
			})
			.sort(byDisplayName)
	);
}

/**
 * The id prefix of an app's Apple-menu entry: `ClassicyDesktopAppMenuAdd`
 * ids it `system_menu_<appId>`, and `ClassicyDesktopAppMenuRemove` and the
 * display resolution below find it by the same prefix. Persisted
 * `systemMenu` entries carry it, so its value never changes.
 */
export const CLASSICY_SYSTEM_MENU_APP_PREFIX = "system_menu_";

/**
 * The Apple-menu items with each app entry (`system_menu_<appId>`) shown by
 * its display identity: `title` and `image` resolved through `overrides`,
 * falling back to the item's own. Display only — the entry's `eventData`
 * keeps the internal identity that opens the app. Other items pass through
 * as they are, and the input array itself is returned when no entry changed.
 */
export const withClassicyAppIdentityMenuItems = (
	items: ClassicyMenuItem[] | undefined,
	overrides: ClassicyAppIdentityOverrides,
): ClassicyMenuItem[] | undefined => {
	if (!items) return items;
	let changed = false;
	const resolved = items.map((item) => {
		if (!item.id.startsWith(CLASSICY_SYSTEM_MENU_APP_PREFIX)) return item;
		const fallback = { name: item.title ?? "", icon: item.image ?? "" };
		const identity = classicyAppIdentityFrom(
			overrides,
			item.id.slice(CLASSICY_SYSTEM_MENU_APP_PREFIX.length),
			fallback,
		);
		// A description-only override changes nothing a menu item shows.
		if (identity.name === fallback.name && identity.icon === fallback.icon) {
			return item;
		}
		changed = true;
		const copy: ClassicyMenuItem = { ...item };
		if (identity.name !== fallback.name) copy.title = identity.name;
		if (identity.icon !== fallback.icon) copy.image = identity.icon;
		return copy;
	});
	return changed ? resolved : items;
};

/**
 * `items` with `appId`'s own About item (id `${appId}_about`, at any depth)
 * retitled "About <display name>" when `overrides` renames the app. The item
 * is found by its id, never by its title, and is retitled only when its
 * title is "About <appName>", the form an app stores under its own name
 * (ruling K-R8): a plain "About" or any other wording the app chose stays as
 * stored (ruling K-R9). Display only — the bar that draws the item resolves
 * its title here. The item keeps its id and handlers, and only the path to it
 * is copied. With no name override, no known `appName`, or no such item,
 * `items` itself is returned.
 */
export const withClassicyAppIdentityAboutItem = (
	items: ClassicyMenuItem[] | undefined,
	appId: string,
	appName: string | undefined,
	overrides: ClassicyAppIdentityOverrides,
): ClassicyMenuItem[] | undefined => {
	if (!items || !appName) return items;
	const { name } = classicyAppIdentityFrom(overrides, appId, {
		name: appName,
		icon: "",
	});
	if (name === appName) return items;
	const aboutId = `${appId}_about`;
	const storedTitle = `About ${appName}`;
	const title = `About ${name}`;
	const retitle = (list: ClassicyMenuItem[]): ClassicyMenuItem[] => {
		let changed = false;
		const resolved = list.map((item) => {
			if (item.id === aboutId) {
				if (item.title !== storedTitle) return item;
				changed = true;
				return { ...item, title };
			}
			if (!item.menuChildren || item.menuChildren.length === 0) return item;
			const menuChildren = retitle(item.menuChildren);
			if (menuChildren === item.menuChildren) return item;
			changed = true;
			return { ...item, menuChildren };
		});
		return changed ? resolved : list;
	};
	return retitle(items);
};
