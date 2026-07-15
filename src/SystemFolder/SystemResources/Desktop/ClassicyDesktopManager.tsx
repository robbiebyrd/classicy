import type { MouseEvent } from "react";
import type { ClassicyTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import {
	hasActiveTheme,
	hasApp,
	hasAvailableThemes,
	hasBackgroundImage,
	hasBackgroundPosition,
	hasBackgroundRepeat,
	hasBackgroundSize,
	hasDesktopAppRef,
	hasDisableBalloonHelp,
	hasErrorDialogMessage,
	hasFont,
	hasFontSize,
	hasMenuBar,
	hasMouseEvent,
	hasShowContextMenu,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyActionPredicates";
import type {
	ActionMessage,
	ClassicyStore,
	ClassicyStoreSystemManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";

export interface ClassicyStoreSystemDesktopManagerIcon {
	appId: string;
	appName: string;
	icon: string;
	label?: string;
	kind: string;
	location?: [number, number];
	onClickFunc?: (event: MouseEvent) => void;
	event?: string;
	eventData?: Record<string, unknown>;
	contextMenu?: ClassicyMenuItem[];
}

export interface ClassicyStoreSystemDesktopManager
	extends ClassicyStoreSystemManager {
	selectedIcons?: string[];
	systemMenu: ClassicyMenuItem[];
	appMenu: ClassicyMenuItem[];
	contextMenu: ClassicyMenuItem[];
	showContextMenu: boolean;
	icons: ClassicyStoreSystemDesktopManagerIcon[];
	selectBox: {
		size: [number, number];
		start: [number, number];
		active: boolean;
	};
	disableBalloonHelp: boolean;
	errorDialog?: { title?: string; message: string } | null;
}

export const classicyDesktopEventHandler = (
	ds: ClassicyStore,
	action: ActionMessage,
) => {
	switch (action.type) {
		case "ClassicyDesktopAppMenuAdd": {
			if (!hasDesktopAppRef(action)) break;
			const menuItem = {
				id: `system_menu_${action.app.id}`,
				title: action.app.name,
				image: action.app.icon,
				event: "ClassicyAppOpen",
				eventData: {
					app: {
						id: action.app.id,
						name: action.app.name,
						icon: action.app.icon,
					},
				},
			};

			const exists = ds.System.Manager.Desktop.systemMenu.findIndex(
				(i) => i.id === menuItem.id,
			);
			if (exists >= 0) {
				ds.System.Manager.Desktop.systemMenu[exists] = menuItem;
			} else {
				ds.System.Manager.Desktop.systemMenu.push(menuItem);
			}

			break;
		}
		case "ClassicyDesktopAppMenuRemove": {
			if (!hasApp(action)) break;
			const exists = ds.System.Manager.Desktop.systemMenu.findIndex(
				(i) => i && i.id === `system_menu_${action.app.id}`,
			);
			if (exists >= 0) {
				ds.System.Manager.Desktop.systemMenu.splice(exists, 1);
			}
			break;
		}
		case "ClassicyDesktopFocus": {
			if (
				hasMouseEvent(action) &&
				(action.e.target as Record<string, unknown>).id === "classicyDesktop"
			) {
				for (const app of Object.values(ds.System.Manager.Applications.apps)) {
					app.focused = false;
					for (const w of app.windows) w.focused = false;
				}

				ds.System.Manager.Applications.apps["Finder.app"].focused = true;
				ds.System.Manager.Desktop.selectedIcons = [];
				ds.System.Manager.Desktop.showContextMenu = false;
				ds.System.Manager.Desktop.selectBox.active = true;
				ds.System.Manager.Desktop.selectBox.start = [
					action.e.clientX,
					action.e.clientY,
				];
			}

			if (hasMenuBar(action)) {
				ds.System.Manager.Desktop.appMenu = action.menuBar;
			}

			break;
		}
		case "ClassicyDesktopDrag": {
			if (!hasMouseEvent(action)) break;
			ds.System.Manager.Desktop.selectBox.start = [
				action.e.clientX - ds.System.Manager.Desktop.selectBox.start[0],
				action.e.clientY - ds.System.Manager.Desktop.selectBox.start[1],
			];

			ds.System.Manager.Desktop.selectBox.size = [0, 0];
			break;
		}
		case "ClassicyDesktopStop": {
			ds.System.Manager.Desktop.selectBox.active = false;
			ds.System.Manager.Desktop.selectBox.size = [0, 0];
			ds.System.Manager.Desktop.selectBox.start = [0, 0];
			break;
		}
		case "ClassicyDesktopContextMenu": {
			if (!hasShowContextMenu(action)) break;
			ds.System.Manager.Desktop.showContextMenu = action.showContextMenu;
			if (Array.isArray(action.contextMenu)) {
				ds.System.Manager.Desktop.contextMenu =
					action.contextMenu as ClassicyMenuItem[];
			}
			break;
		}
		case "ClassicyDesktopChangeTheme": {
			if (!hasActiveTheme(action)) break;
			const foundTheme = ds.System.Manager.Appearance.availableThemes?.find(
				(a) => a.id === action.activeTheme,
			);
			if (foundTheme) {
				ds.System.Manager.Appearance.activeTheme = foundTheme;
			}
			break;
		}
		case "ClassicyDesktopChangeBackground": {
			if (!hasBackgroundImage(action)) break;
			ds.System.Manager.Appearance.activeTheme.desktop.backgroundImage =
				action.backgroundImage;
			ds.System.Manager.Appearance.activeTheme.desktop.backgroundSize = "auto";
			break;
		}
		case "ClassicyDesktopChangeBackgroundPosition": {
			if (!hasBackgroundPosition(action)) break;
			ds.System.Manager.Appearance.activeTheme.desktop.backgroundPosition =
				action.backgroundPosition;
			break;
		}
		case "ClassicyDesktopChangeBackgroundRepeat": {
			if (!hasBackgroundRepeat(action)) break;
			ds.System.Manager.Appearance.activeTheme.desktop.backgroundRepeat =
				action.backgroundRepeat;
			break;
		}
		case "ClassicyDesktopChangeBackgroundSize": {
			if (!hasBackgroundSize(action)) break;
			ds.System.Manager.Appearance.activeTheme.desktop.backgroundSize =
				action.backgroundSize;
			break;
		}
		case "ClassicyDesktopChangeFont": {
			if (!hasFont(action)) break;
			switch (action.fontType) {
				case "body":
					ds.System.Manager.Appearance.activeTheme.typography.body =
						action.font;
					break;
				case "ui":
					ds.System.Manager.Appearance.activeTheme.typography.ui = action.font;
					break;
				case "header":
					ds.System.Manager.Appearance.activeTheme.typography.header =
						action.font;
					break;
				case "mono":
					ds.System.Manager.Appearance.activeTheme.typography.mono =
						action.font;
					break;
				case "digital":
					ds.System.Manager.Appearance.activeTheme.typography.digital =
						action.font;
					break;
			}
			break;
		}
		case "ClassicyDesktopChangeFontSize": {
			if (!hasFontSize(action)) break;
			switch (action.fontType) {
				case "uiSize":
					ds.System.Manager.Appearance.activeTheme.typography.uiSize =
						action.fontSize;
					break;
				case "bodySize":
					ds.System.Manager.Appearance.activeTheme.typography.bodySize =
						action.fontSize;
					break;
				case "headerSize":
					ds.System.Manager.Appearance.activeTheme.typography.headerSize =
						action.fontSize;
					break;
				case "monoSize":
					ds.System.Manager.Appearance.activeTheme.typography.monoSize =
						action.fontSize;
					break;
				case "digitalSize":
					ds.System.Manager.Appearance.activeTheme.typography.digitalSize =
						action.fontSize;
					break;
			}
			break;
		}
		case "ClassicyDesktopLoadThemes": {
			if (!hasAvailableThemes(action)) break;
			ds.System.Manager.Appearance.availableThemes =
				action.availableThemes as ClassicyTheme[];
			break;
		}
		case "ClassicyDesktopSetBalloonHelp": {
			if (!hasDisableBalloonHelp(action)) break;
			ds.System.Manager.Desktop.disableBalloonHelp = action.disableBalloonHelp;
			break;
		}
		case "ClassicyDesktopShowErrorDialog": {
			if (!hasErrorDialogMessage(action)) break;
			ds.System.Manager.Desktop.errorDialog = {
				title: typeof action.title === "string" ? action.title : undefined,
				message: action.message,
			};
			break;
		}
		case "ClassicyDesktopCloseErrorDialog": {
			ds.System.Manager.Desktop.errorDialog = null;
			break;
		}
	}
	return ds;
};
