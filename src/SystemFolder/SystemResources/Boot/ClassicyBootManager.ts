import type {
	ActionMessage,
	ClassicyStore,
	ClassicyStoreSystemManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";

/** One icon shown in the startup-screen parade, registered without a real
 *  extension. `id` is the dedup key; re-adding the same id updates in place. */
export interface ClassicyBootParadeIcon {
	id: string;
	icon: string;
	name?: string;
	/** Set when the entry shows its app's own icon (`bootIcon={true}`), so the
	 *  parade may show a package's icon for that app instead. Absent for an
	 *  entry with an icon of its own. The override itself is never stored. */
	followsAppIcon?: boolean;
}

export interface ClassicyStoreSystemBootManager
	extends ClassicyStoreSystemManager {
	paradeIcons: ClassicyBootParadeIcon[];
}

export const classicyBootEventHandler = (
	ds: ClassicyStore,
	action: ActionMessage,
): ClassicyStore => {
	switch (action.type) {
		case "ClassicyBootParadeIconAdd": {
			if (typeof action.id !== "string" || action.id === "") break;
			if (typeof action.icon !== "string" || action.icon === "") break;
			const name = typeof action.name === "string" ? action.name : undefined;
			const followsAppIcon = action.followsAppIcon === true;
			const icons = ds.System.Manager.Boot.paradeIcons;
			const existing = icons.find((entry) => entry.id === action.id);
			if (existing) {
				existing.icon = action.icon;
				existing.name = name;
				if (followsAppIcon) existing.followsAppIcon = true;
				else delete existing.followsAppIcon;
			} else {
				icons.push({
					id: action.id,
					icon: action.icon,
					name,
					...(followsAppIcon ? { followsAppIcon: true } : {}),
				});
			}
			break;
		}
		case "ClassicyBootParadeIconRemove": {
			if (typeof action.id !== "string") break;
			ds.System.Manager.Boot.paradeIcons =
				ds.System.Manager.Boot.paradeIcons.filter(
					(entry) => entry.id !== action.id,
				);
			break;
		}
	}
	return ds;
};
