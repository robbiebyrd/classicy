import type { ClassicyTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import {
	hasApp,
	hasDesktopAppRef,
	hasIconAddFields,
	hasIconId,
	hasIconIds,
	hasIconLocation,
	hasSortBy,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyActionPredicates";
import {
	deFocusApps,
	openApp,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppHelpers";
import type {
	ActionMessage,
	ClassicyStore,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import type {
	ClassicyBalloonPosition,
	ClassicyIconBalloonHelp,
} from "@/SystemFolder/SystemResources/BalloonHelp/useClassicyBalloonHelp";
import type { ClassicyStoreSystemDesktopManagerIcon } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";

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
		// Hidden icons are never drawn on the desktop (they exist only to
		// populate the derived Applications folder), so they must not consume a
		// grid slot — otherwise the visible icons leave a gap where the hidden
		// one "would" sit.
		if (icon.hidden) {
			newDesktopIcons.push(icon);
			return;
		}

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

// Actions arrive untyped, and whatever lands here is persisted to localStorage,
// so balloon payloads are validated field by field rather than cast.
const readBalloonHelp = (
	value: unknown,
): ClassicyIconBalloonHelp | undefined => {
	if (typeof value !== "object" || value === null) return undefined;
	const candidate = value as Record<string, unknown>;
	if (typeof candidate.content !== "string") return undefined;
	return {
		content: candidate.content,
		title: typeof candidate.title === "string" ? candidate.title : undefined,
		position:
			typeof candidate.position === "string"
				? (candidate.position as ClassicyBalloonPosition)
				: undefined,
		delay: typeof candidate.delay === "number" ? candidate.delay : undefined,
	};
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
			const sortBy = hasSortBy(action) ? action.sortBy : "name";
			ds.System.Manager.Desktop.icons = cleanupDesktopIcons(
				ds.System.Manager.Appearance.activeTheme,
				sortDesktopIcons(
					ds.System.Manager.Desktop.icons,
					sortBy as "name" | "kind" | "label",
				),
			);
			break;
		}
		case "ClassicyDesktopIconFocus": {
			if (!hasIconId(action)) break;
			deFocusApps(ds);
			ds.System.Manager.Applications.apps["Finder.app"].focused = true;
			ds.System.Manager.Desktop.selectedIcons = [action.iconId];
			break;
		}
		case "ClassicyDesktopIconSelectBox": {
			ds.System.Manager.Desktop.selectedIcons = hasIconIds(action)
				? (action.iconIds as string[])
				: [];
			break;
		}
		case "ClassicyDesktopIconClearFocus": {
			ds.System.Manager.Desktop.selectedIcons = [];
			break;
		}
		case "ClassicyDesktopIconOpen": {
			if (!hasIconId(action) || !hasDesktopAppRef(action)) break;
			ds.System.Manager.Desktop.selectedIcons = [action.iconId];
			openApp(ds, action.app.id, action.app.name, action.app.icon);
			break;
		}
		case "ClassicyDesktopIconAdd": {
			// TODO: We need to separate onClickFunc from here; it's being stored in the localstorage cache which
			// means it gets blown out after every session clear. An Event name and payload here would be better.
			if (!hasIconAddFields(action)) break;
			const icon = ds.System.Manager.Desktop.icons.filter(
				(i) => i.appId === action.app.id,
			);

			if (icon.length === 0) {
				ds.System.Manager.Desktop.icons.push({
					icon: action.app.icon,
					appId: action.app.id,
					appName: action.app.name,
					location: Array.isArray(action.location)
						? (action.location as [number, number])
						: undefined,
					label: typeof action.label === "string" ? action.label : undefined,
					kind: typeof action.kind === "string" ? action.kind : "icon",
					onClickFunc:
						typeof action.onClickFunc === "function"
							? (action.onClickFunc as ClassicyStoreSystemDesktopManagerIcon["onClickFunc"])
							: undefined,
					event: typeof action.event === "string" ? action.event : undefined,
					eventData:
						typeof action.eventData === "object" && action.eventData !== null
							? (action.eventData as Record<string, unknown>)
							: undefined,
					noLaunch: action.noLaunch === true ? true : undefined,
					contextMenu: Array.isArray(action.contextMenu)
						? (action.contextMenu as ClassicyMenuItem[])
						: undefined,
					hidden: action.hidden === true ? true : undefined,
					inApplications: action.inApplications === false ? false : undefined,
					balloonHelp: readBalloonHelp(action.balloonHelp),
				});

				ds.System.Manager.Desktop.icons = cleanupDesktopIcons(
					ds.System.Manager.Appearance.activeTheme,
					sortDesktopIcons(ds.System.Manager.Desktop.icons, "kind"),
				);
			} else {
				// Icons persist to localStorage, so an app whose registration
				// changed between sessions would otherwise keep its stale record
				// forever. Serializable, code-derived fields are refreshed on every
				// re-add; location and label are user state and are left alone.
				// appId alone is identity everywhere else that looks an icon up
				// (Move matches on appId alone; Remove treats appName as
				// optional), so requiring appName here too was the outlier: a
				// re-add whose appName changed took this "already exists" branch
				// (the presence check above also filters on appId alone) and then
				// found no `existing`, silently updating nothing.
				const existing = ds.System.Manager.Desktop.icons.find(
					(i) => i.appId === action.app.id,
				);
				if (existing) {
					// appName is code-derived (it's whatever the app/shortcut
					// registration says its name is), not user state like
					// location/label, so — by the same rule the fields below
					// follow — it refreshes on every re-add too. Left stale, this
					// would be a regression the appId-only lookup fix above
					// introduces: before that fix, a re-add with a changed
					// appName never reached this block at all, so nothing was
					// stale because nothing updated; now other fields refresh
					// but the name — the icon's alt text and, absent a `label`,
					// its caption — would silently keep lagging behind.
					existing.appName = action.app.name;
					if (Array.isArray(action.contextMenu)) {
						existing.contextMenu = action.contextMenu as ClassicyMenuItem[];
					}
					// Icons persist to localStorage, so a shortcut whose target
					// changed between releases would keep the stale URL forever.
					// These are code-derived, not user state, so they are reset
					// unconditionally on every re-add — including back to
					// undefined when the action no longer supplies them (e.g. a
					// shortcut converted into a real app under the same appId).
					existing.event =
						typeof action.event === "string" ? action.event : undefined;
					existing.eventData =
						typeof action.eventData === "object" && action.eventData !== null
							? (action.eventData as Record<string, unknown>)
							: undefined;
					existing.noLaunch = action.noLaunch === true ? true : undefined;
					const nextHidden = action.hidden === true ? true : undefined;
					const hiddenChanged = existing.hidden !== nextHidden;
					existing.hidden = nextHidden;
					existing.inApplications =
						action.inApplications === false ? false : undefined;
					existing.balloonHelp = readBalloonHelp(action.balloonHelp);

					// Hidden icons do not consume a grid slot, so a change in either
					// direction has to re-flow the remaining icons.
					if (hiddenChanged) {
						ds.System.Manager.Desktop.icons = cleanupDesktopIcons(
							ds.System.Manager.Appearance.activeTheme,
							ds.System.Manager.Desktop.icons,
						);
					}
				}
			}
			break;
		}

		case "ClassicyDesktopIconRemove": {
			if (!hasApp(action)) break;
			const appName =
				typeof (action.app as Record<string, unknown>).name === "string"
					? ((action.app as Record<string, unknown>).name as string)
					: undefined;
			const iconIdx = ds.System.Manager.Desktop.icons.findIndex(
				(icon) =>
					icon.appId === action.app.id &&
					(!appName || icon.appName === appName),
			);
			if (iconIdx > -1) {
				ds.System.Manager.Desktop.icons.splice(iconIdx, 1);
			}
			break;
		}
		case "ClassicyDesktopIconMove": {
			if (!hasIconLocation(action)) break;
			const iconIdx = ds.System.Manager.Desktop.icons.findIndex(
				(icon) => icon.appId === action.app.id,
			);
			if (iconIdx === -1) break;

			const selected = ds.System.Manager.Desktop.selectedIcons ?? [];
			const oldLocation = ds.System.Manager.Desktop.icons[iconIdx].location ?? [
				0, 0,
			];
			const newLocation: [number, number] = action.location;

			if (selected.length > 1 && selected.includes(action.app.id)) {
				const dx = newLocation[0] - oldLocation[0];
				const dy = newLocation[1] - oldLocation[1];
				for (const selId of selected) {
					const selIdx = ds.System.Manager.Desktop.icons.findIndex(
						(icon) => icon.appId === selId,
					);
					if (selIdx > -1) {
						const selLoc = ds.System.Manager.Desktop.icons[selIdx].location ?? [
							0, 0,
						];
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
