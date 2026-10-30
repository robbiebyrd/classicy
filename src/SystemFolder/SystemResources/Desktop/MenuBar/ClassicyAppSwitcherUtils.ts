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
	open: boolean;
};

/**
 * Apps eligible for the menu-bar App Switcher: open (or transiently focused)
 * and not background extensions — extensions run with open: true but must
 * never surface in the switcher. Each entry shows the app's display
 * identity: its name and icon as `overrides` (the active package's `apps`)
 * resolve them, else the record's own.
 */
export function appSwitcherAppsFrom(
	apps: Record<string, ClassicyStoreSystemApp>,
	overrides: ClassicyAppIdentityOverrides = CLASSICY_NO_APP_IDENTITY_OVERRIDES,
): ClassicyAppSwitcherEntry[] {
	return Object.values(apps)
		.filter((a) => (a.open || a.focused) && !a.extension)
		.map((a) => {
			const { name, icon } = classicyAppIdentityFrom(overrides, a.id, a);
			return {
				id: a.id,
				name,
				icon,
				focused: a.focused,
				open: a.open,
			};
		});
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
