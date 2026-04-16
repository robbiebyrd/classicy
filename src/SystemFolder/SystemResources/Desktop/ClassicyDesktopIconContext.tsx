import type { ClassicyTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import {
	type ActionMessage,
	type ClassicyStore,
	classicyDesktopStateEventReducer,
	deFocusApps,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import type { ClassicyStoreSystemDesktopManagerIcon } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager";

const createGrid = (iconSize: number, iconPadding: number) => {
	return [
		Math.floor(window.innerWidth / (iconSize + iconPadding)),
		Math.floor(window.innerHeight / (iconSize * 2 + iconPadding)),
	];
};

const getGridPosition = (
	iconSize: number,
	iconPadding: number,
	x: number,
	y: number,
): [number, number] => {
	const defaultPadding = iconPadding * 4;
	return [
		Math.floor(window.innerWidth - (iconSize * 2 + iconPadding) * x),
		Math.floor((iconSize * 2 + iconPadding) * y) + defaultPadding,
	];
};

const getGridPositionByCount = (count: number, theme: ClassicyTheme) => {
	const [iconSize, iconPadding] = getIconSize(theme);
	const grid = createGrid(iconSize, iconPadding);
	const maxRows = Math.max(grid[1], 1);

	const col = Math.floor(count / maxRows) + 1;
	const row = count % maxRows;

	return getGridPosition(iconSize, iconPadding, col, row);
};

export const getIconSize = (theme: ClassicyTheme) => {
	return [theme.desktop.iconSize, theme.desktop.iconSize / 4];
};

const kindPriority: Record<string, number> = {
	drive: 0,
	directory: 1,
	app_shortcut: 2,
	shortcut: 3,
	trash: 4,
	file: 5,
	icon: 6,
};

const getKindPriority = (kind: string): number =>
	kindPriority[kind?.toLowerCase()] ?? 99;

const sortDesktopIcons = (
	icons: ClassicyStoreSystemDesktopManagerIcon[],
	sortType: "name" | "kind" | "label",
) => {
	switch (sortType) {
		case "name":
			return icons.sort((a, b) =>
				a.appName.toLowerCase().localeCompare(b.appName.toLowerCase()),
			);
		default:
			return icons.sort((a, b) => {
				const kindDiff = getKindPriority(a.kind) - getKindPriority(b.kind);
				if (kindDiff !== 0) return kindDiff;
				return a.appName.toLowerCase().localeCompare(b.appName.toLowerCase());
			});
	}
};

const cleanupDesktopIcons = (
	theme: ClassicyTheme,
	icons: ClassicyStoreSystemDesktopManagerIcon[],
) => {
	const newDesktopIcons: ClassicyStoreSystemDesktopManagerIcon[] = [];
	let startX: number = 1;
	let startY: number = 0;
	const [iconSize, iconPadding] = getIconSize(theme);

	const grid = createGrid(iconSize, iconPadding);

	icons.forEach((icon) => {
		if (startY >= grid[1]) {
			startY = 0;
			startX += 1;
		}

		if (startX >= grid[0]) {
			startX = 1;
		}

		icon.location = getGridPosition(iconSize, iconPadding, startX, startY);
		newDesktopIcons.push(icon);
		startY += 1;
	});

	return newDesktopIcons;
};

export const classicyDesktopIconEventHandler = (
	ds: ClassicyStore,
	action: ActionMessage,
) => {
	switch (action.type) {
		case "ClassicyDesktopIconCleanup": {
			ds.System.Manager.Desktop.icons = cleanupDesktopIcons(
				ds.System.Manager.Appearance.activeTheme,
				ds.System.Manager.Desktop.icons,
			);
			break;
		}
		case "ClassicyDesktopIconSort": {
			ds.System.Manager.Desktop.icons = cleanupDesktopIcons(
				ds.System.Manager.Appearance.activeTheme,
				sortDesktopIcons(
					ds.System.Manager.Desktop.icons,
					action.sortBy || "name",
				),
			);
			break;
		}
		case "ClassicyDesktopIconFocus": {
			deFocusApps(ds);
			ds.System.Manager.Applications.apps["Finder.app"].focused = true;
			ds.System.Manager.Desktop.selectedIcons = [action.iconId];
			break;
		}
		case "ClassicyDesktopIconSelectBox": {
			ds.System.Manager.Desktop.selectedIcons = action.iconIds ?? [];
			break;
		}
		case "ClassicyDesktopIconClearFocus": {
			ds.System.Manager.Desktop.selectedIcons = [];
			break;
		}
		case "ClassicyDesktopIconOpen": {
			ds.System.Manager.Desktop.selectedIcons = [action.iconId];
			ds = classicyDesktopStateEventReducer(ds, {
				type: "ClassicyAppOpen",
				app: action.app,
			});
			break;
		}
		case "ClassicyDesktopIconAdd": {
			// TODO: We need to separate onClickFunc from here; it's being stored in the localstorage cache which
			// means it gets blown out after every session clear. An Event name and payload here would be better.
			const icon = ds.System.Manager.Desktop.icons.filter(
				(i) => i.appId === action.app.id,
			);

			if (icon.length === 0) {
				ds.System.Manager.Desktop.icons.push({
					icon: action.app.icon,
					appId: action.app.id,
					appName: action.app.name,
					location: action.location,
					label: action.label,
					kind: action.kind || "icon",
					onClickFunc: action.onClickFunc,
					event: action.event,
					eventData: action.eventData,
				});

				ds.System.Manager.Desktop.icons = cleanupDesktopIcons(
					ds.System.Manager.Appearance.activeTheme,
					sortDesktopIcons(ds.System.Manager.Desktop.icons, "kind"),
				);
			}
			break;
		}

		case "ClassicyDesktopIconRemove": {
			const iconIdx = ds.System.Manager.Desktop.icons.findIndex(
				(icon) =>
					icon.appId === action.app.id &&
					(!action.app.name || icon.appName === action.app.name),
			);
			if (iconIdx > -1) {
				ds.System.Manager.Desktop.icons.splice(iconIdx, 1);
			}
			break;
		}
		case "ClassicyDesktopIconMove": {
			const iconIdx = ds.System.Manager.Desktop.icons.findIndex(
				(icon) => icon.appId === action.app.id,
			);
			if (iconIdx === -1) break;

			const selected = ds.System.Manager.Desktop.selectedIcons ?? [];
			const oldLocation =
				ds.System.Manager.Desktop.icons[iconIdx].location ?? [0, 0];
			const newLocation: [number, number] = action.location;

			if (selected.length > 1 && selected.includes(action.app.id)) {
				const dx = newLocation[0] - oldLocation[0];
				const dy = newLocation[1] - oldLocation[1];
				for (const selId of selected) {
					const selIdx = ds.System.Manager.Desktop.icons.findIndex(
						(icon) => icon.appId === selId,
					);
					if (selIdx > -1) {
						const selLoc =
							ds.System.Manager.Desktop.icons[selIdx].location ?? [0, 0];
						ds.System.Manager.Desktop.icons[selIdx].location = [
							selLoc[0] + dx,
							selLoc[1] + dy,
						];
					}
				}
			} else {
				ds.System.Manager.Desktop.icons[iconIdx].location = newLocation;
			}
			break;
		}
	}
	return ds;
};
