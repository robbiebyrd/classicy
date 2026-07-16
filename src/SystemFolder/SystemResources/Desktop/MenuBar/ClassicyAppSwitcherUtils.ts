import type { ClassicyStoreSystemApp } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";

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
 * never surface in the switcher.
 */
export function appSwitcherAppsFrom(
	apps: Record<string, ClassicyStoreSystemApp>,
): ClassicyAppSwitcherEntry[] {
	return Object.values(apps)
		.filter((a) => (a.open || a.focused) && !a.extension)
		.map((a) => ({
			id: a.id,
			name: a.name,
			icon: a.icon,
			focused: a.focused,
			open: a.open,
		}));
}
