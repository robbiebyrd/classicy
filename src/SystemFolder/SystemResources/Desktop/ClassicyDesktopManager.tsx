import type { MouseEvent } from "react";
import type { ClassicyTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import {
	hasActiveTheme,
	hasAlertSound,
	hasApp,
	hasAppAndHelpItems,
	hasAvailableThemes,
	hasBackgroundImage,
	hasBackgroundPosition,
	hasBackgroundRepeat,
	hasBackgroundSize,
	hasDesktopAppRef,
	hasDisableBalloonHelp,
	hasDrive,
	hasErrorDialogMessage,
	hasFont,
	hasFontSize,
	hasMenuBar,
	hasMouseEvent,
	hasUrl,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyActionPredicates";
import type {
	ActionMessage,
	ClassicyStore,
	ClassicyStoreSystemManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { dispatchToPlugin } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import type { ClassicyIconBalloonHelp } from "@/SystemFolder/SystemResources/BalloonHelp/useClassicyBalloonHelp";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import { readShortcutDisposition } from "@/SystemFolder/SystemResources/Shortcut/ClassicyShortcut";
import { isValidHttpUrl } from "@/SystemFolder/SystemResources/Utils/urlValidation";

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
	/** When true, double-clicking fires only `event` and does NOT also dispatch
	 *  ClassicyDesktopIconOpen. Required for icons whose appId is not a
	 *  registered app — a URL shortcut, say — because ClassicyDesktopIconOpen
	 *  calls openApp(), which would conjure a phantom app entry for it. */
	noLaunch?: boolean;
	contextMenu?: ClassicyMenuItem[];
	/** When true, the icon exists in the store (so it populates the derived
	 * Applications folder) but is NOT drawn on the desktop. Used by apps that
	 * opt into the Applications folder via `inApplicationsFolder` while keeping
	 * `noDesktopIcon`. */
	hidden?: boolean;
	/** When false, the icon is excluded from the derived Applications folder.
	 * Undefined means included, so icons persisted before this field existed
	 * keep their current behavior. */
	inApplications?: boolean;
	/** Balloon help shown when the pointer rests on the icon. Stock copy for
	 * system kinds (trash, drive) is resolved at render time instead — see
	 * ClassicyDesktopIconBalloons. */
	balloonHelp?: ClassicyIconBalloonHelp;
}

export interface ClassicyStoreSystemDesktopManager
	extends ClassicyStoreSystemManager {
	selectedIcons?: string[];
	systemMenu: ClassicyMenuItem[];
	appMenu: ClassicyMenuItem[];
	icons: ClassicyStoreSystemDesktopManagerIcon[];
	selectBox: {
		size: [number, number];
		start: [number, number];
		active: boolean;
	};
	disableBalloonHelp: boolean;
	/** When true, double-clicking a window's title bar collapses it (Appearance
	 * control-panel option). Defaults to true. */
	doubleClickTitleToCollapse?: boolean;
	/** Optional app-supplied items appended to the standard Help menu, keyed by
	 * the owning app's id. Written by `useClassicyHelpMenu`; the menu bar renders
	 * only the focused app's entries. Entries here are NOT searched by
	 * `findAppAboutItem`, so an "About <App>…" item registered through this slot
	 * is deliberately immune to the Apple-menu About hoist. */
	helpMenu?: Record<string, ClassicyMenuItem[]>;
	errorDialog?: { title?: string; message: string } | null;
	/** Bumped when the filesystem tree is replaced out-of-band (adapter
	 * reconcile) so useClassicyFileSystem rebuilds from localStorage. */
	fsVersion?: number;
	/** Pending Drive Setup operation requested via a ClassicyDesktopDriveSetup*
	 * event; consumed and cleared by DriveSetupController. */
	driveSetupRequest?: {
		action: "initialize" | "sync" | "backup";
		drive: string;
	} | null;
	/** Bumped on each Drive Setup request so the controller's effect re-fires
	 * even for a repeated identical request. */
	driveSetupRequestId?: number;
	/** Pending "open this URL in the real browser" request, set by
	 *  ClassicyDesktopOpenUrl and consumed by ClassicyOpenUrlController. Only
	 *  the browser dispositions land here — the "classicy" disposition is a
	 *  pure store mutation and is applied in the reducer directly. */
	openUrlRequest?: {
		url: string;
		disposition: "browser" | "browser-new";
	} | null;
	/** Bumped on each request so the controller's effect re-fires even for a
	 *  repeated identical request. */
	openUrlRequestId?: number;
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
		case "ClassicyDesktopHelpMenuAdd": {
			if (!hasAppAndHelpItems(action)) break;
			if (!ds.System.Manager.Desktop.helpMenu) {
				ds.System.Manager.Desktop.helpMenu = {};
			}
			ds.System.Manager.Desktop.helpMenu[action.app.id] = action.helpItems;
			break;
		}
		case "ClassicyDesktopHelpMenuRemove": {
			if (!hasApp(action)) break;
			const helpMenu = ds.System.Manager.Desktop.helpMenu;
			if (!helpMenu) break;
			delete helpMenu[action.app.id];
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
		case "ClassicyDesktopChangeAlertSound": {
			if (!hasAlertSound(action)) break;
			ds.System.Manager.Appearance.alertSound = action.alertSound;
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
		case "ClassicyDesktopFileSystemVersionBump": {
			ds.System.Manager.Desktop.fsVersion =
				(ds.System.Manager.Desktop.fsVersion ?? 0) + 1;
			break;
		}
		case "ClassicyDesktopDriveSetupInitialize":
		case "ClassicyDesktopDriveSetupSync":
		case "ClassicyDesktopDriveSetupBackup": {
			if (!hasDrive(action)) break;
			const action_ =
				action.type === "ClassicyDesktopDriveSetupInitialize"
					? "initialize"
					: action.type === "ClassicyDesktopDriveSetupSync"
						? "sync"
						: "backup";
			ds.System.Manager.Desktop.driveSetupRequest = {
				action: action_,
				drive: action.drive,
			};
			ds.System.Manager.Desktop.driveSetupRequestId =
				(ds.System.Manager.Desktop.driveSetupRequestId ?? 0) + 1;
			break;
		}
		case "ClassicyDesktopDriveSetupClearRequest": {
			ds.System.Manager.Desktop.driveSetupRequest = null;
			break;
		}
		case "ClassicyDesktopOpenUrl": {
			if (!hasUrl(action)) break;
			// Shortcut targets are untrusted data: they persist to localStorage
			// and, in consumers that sync the file system, to a remote store.
			if (!isValidHttpUrl(action.url)) {
				ds.System.Manager.Desktop.errorDialog = {
					message: "This shortcut points to an address that cannot be opened.",
				};
				break;
			}

			const disposition = readShortcutDisposition(action.disposition);
			if (disposition === "classicy") {
				// Opening an in-desktop window is a pure store mutation, so it
				// needs no side-effect rail. Dispatching in-reducer follows the
				// pattern Finder uses to hand a file to its owning app: route
				// through the plugin registry (dispatchToPlugin) rather than
				// importing classicyWebViewerEventHandler directly, since
				// ClassicyAppManager already imports this module — a direct
				// import back would be circular. This relies on WebViewerContext
				// having self-registered via its own import elsewhere in the
				// module graph (WebViewer.tsx does this for the running app); a
				// deliberate eager import of WebViewerContext here, instead, was
				// tried and reproducibly throws "Cannot access
				// 'pluginEventHandlers' before initialization" under the full
				// suite, because it forces ClassicyAppManager's module body to
				// resume mid-evaluation, before its own `pluginEventHandlers`
				// const is initialized.
				ds = dispatchToPlugin(ds, "ClassicyAppWebViewer", {
					type: "ClassicyAppWebViewerOpenUrl",
					url: action.url,
					title: typeof action.title === "string" ? action.title : action.url,
				});
				break;
			}

			// window.open and location.assign are side effects and must not run
			// inside a reducer; the controller performs them.
			ds.System.Manager.Desktop.openUrlRequest = {
				url: action.url,
				disposition,
			};
			ds.System.Manager.Desktop.openUrlRequestId =
				(ds.System.Manager.Desktop.openUrlRequestId ?? 0) + 1;
			break;
		}
		case "ClassicyDesktopClearOpenUrlRequest": {
			ds.System.Manager.Desktop.openUrlRequest = null;
			break;
		}
	}
	return ds;
};
