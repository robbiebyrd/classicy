import type { MouseEvent } from "react";
import type { ClassicyTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import {
	assignImportedClassicyThemeIdentity,
	cloneClassicyTheme,
	editActiveClassicyTheme,
	findClassicyTheme,
	listClassicyThemes,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyCustomTheme";
import { setThemeColor } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeColorTargets";
import { readClassicyTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeFile";
import { setThemeMetric } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetricTargets";
import {
	hasActiveTheme,
	hasAlertSound,
	hasAlertVolume,
	hasApp,
	hasAppAndHelpItems,
	hasAvailableThemes,
	hasBackgroundImage,
	hasBackgroundPosition,
	hasBackgroundRepeat,
	hasBackgroundSize,
	hasCollapsed,
	hasDesktopAppRef,
	hasDisableBalloonHelp,
	hasDoubleClickTitleToCollapse,
	hasDrive,
	hasErrorDialogMessage,
	hasFont,
	hasFontSize,
	hasImportableTheme,
	hasMenuBar,
	hasModuleHidden,
	hasModuleOrder,
	hasMouseEvent,
	hasSmartScrolling,
	hasStripPosition,
	hasStripWidth,
	hasThemeColorChange,
	hasThemeMetricChange,
	hasVisible,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyActionPredicates";
import type {
	ActionMessage,
	ClassicyStore,
	ClassicyStoreSystemManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { dispatchToPlugin } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { listAppWindows } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppWindows";
import type { ClassicyIconBalloonHelp } from "@/SystemFolder/SystemResources/BalloonHelp/useClassicyBalloonHelp";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import { readShortcutDisposition } from "@/SystemFolder/SystemResources/Shortcut/ClassicyShortcut";
import { isValidHttpUrl } from "@/SystemFolder/SystemResources/Utils/urlValidation";

/**
 * The Control Strip's persisted state. The modules themselves are runtime
 * registrations (`registerClassicyControlStripModule`); this holds only the
 * user's arrangement of them, keyed by module id, so settings for a module
 * that is not registered right now are kept for when it returns.
 */
export interface ClassicyStoreControlStrip {
	/** Shown or hidden from the Control Strip control panel. */
	visible: boolean;
	/** Unset until the user collapses or expands it (`defaultCollapsed` applies). */
	collapsed?: boolean;
	/** Module area width in px; unset until the user sizes it (`defaultWidth` applies). */
	width?: number | null;
	/** Module ids the user has hidden. */
	hiddenModules: string[];
	/** The user's module order; listed ids lead, in this order. */
	moduleOrder: string[];
	/**
	 * The screen edge the strip is docked to; unset until the user Control-drags
	 * it (the lower left applies).
	 */
	edge?: ClassicyControlStripEdge;
	/**
	 * Distance in px from the desktop's bottom edge to the strip's; unset until
	 * the user Control-drags it (0, the bottom, applies).
	 */
	bottom?: number;
}

export type ClassicyControlStripEdge = "left" | "right";

/** The Special menu's confirmation alerts (see `systemDialog`). */
export type ClassicyDesktopSystemDialog = "emptyTrash" | "resetPram";

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
	/**
	 * The file system item the icon stands for: a drive, or an item in the
	 * Desktop Folder (`classicyDesktopItemIconAction`). A drive or folder icon
	 * with one accepts Finder drags; a Desktop Folder item opens through the
	 * file system and can be dragged back into a window.
	 */
	filePath?: string;
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
	/** The Control Strip's persisted arrangement. Optional for state built
	 * by hand; the defaults always carry it. */
	controlStrip?: ClassicyStoreControlStrip;
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
	/** The Special menu's confirmation alert on screen, if any: Empty Trash or
	 * Reset PRAM (`ClassicyDesktopShowSystemDialog`). Session-only — never
	 * persisted. */
	systemDialog?: ClassicyDesktopSystemDialog | null;
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

/** The default Control Strip arrangement: shown, nothing hidden or reordered. */
export const defaultClassicyControlStripState =
	(): ClassicyStoreControlStrip => ({
		visible: true,
		hiddenModules: [],
		moduleOrder: [],
	});

const controlStripState = (ds: ClassicyStore): ClassicyStoreControlStrip => {
	ds.System.Manager.Desktop.controlStrip ??= defaultClassicyControlStripState();
	return ds.System.Manager.Desktop.controlStrip;
};

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
					for (const w of listAppWindows(app)) w.focused = false;
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
			// Built-ins first, then custom themes. Activate a copy, so edits to
			// the active theme can never alias the stored entry.
			const foundTheme = findClassicyTheme(
				ds.System.Manager.Appearance,
				action.activeTheme,
			);
			if (foundTheme) {
				ds.System.Manager.Appearance.activeTheme =
					cloneClassicyTheme(foundTheme);
			}
			break;
		}
		case "ClassicyDesktopImportTheme": {
			// The payload is untrusted (it came from a file): the predicate
			// validates it against ClassicyThemeSchema, and readClassicyTheme
			// strips undeclared keys and resolves the wallpaper for this build.
			if (!hasImportableTheme(action)) break;
			const read = readClassicyTheme(action.theme);
			if (!read.ok) break;
			const appearance = ds.System.Manager.Appearance;
			// Always a new entry: the payload's id is ignored, so an import
			// can never overwrite an existing custom theme or shadow a built-in.
			const imported = assignImportedClassicyThemeIdentity(
				read.theme,
				listClassicyThemes(appearance),
			);
			if (!appearance.customThemes) appearance.customThemes = [];
			appearance.customThemes.push(imported);
			// Activate a copy, exactly as ChangeTheme does; being a custom theme,
			// later edits modify it in place rather than forking.
			appearance.activeTheme = cloneClassicyTheme(imported);
			break;
		}
		// Every theme edit below goes through editActiveClassicyTheme: the first
		// edit made on a built-in forks it into the "Custom" theme (built-ins are
		// never mutated), later edits modify the active custom theme in place.
		case "ClassicyDesktopChangeColor": {
			if (!hasThemeColorChange(action)) break;
			const target = action;
			editActiveClassicyTheme(ds.System.Manager.Appearance, (theme) =>
				setThemeColor(theme, target, target.color),
			);
			break;
		}
		// Same fork-on-first-edit semantics for the layout metrics
		// (`measurements.<family>`); the payload is validated against
		// CLASSICY_THEME_METRIC_TARGETS (key allowlist and min–max) first.
		case "ClassicyDesktopChangeMetric": {
			if (!hasThemeMetricChange(action)) break;
			const target = action;
			editActiveClassicyTheme(ds.System.Manager.Appearance, (theme) =>
				setThemeMetric(theme, target, target.value),
			);
			break;
		}
		case "ClassicyDesktopChangeBackground": {
			if (!hasBackgroundImage(action)) break;
			editActiveClassicyTheme(ds.System.Manager.Appearance, (theme) => {
				theme.desktop.backgroundImage = action.backgroundImage;
				theme.desktop.backgroundSize = "auto";
			});
			break;
		}
		case "ClassicyDesktopChangeBackgroundPosition": {
			if (!hasBackgroundPosition(action)) break;
			editActiveClassicyTheme(ds.System.Manager.Appearance, (theme) => {
				theme.desktop.backgroundPosition = action.backgroundPosition;
			});
			break;
		}
		case "ClassicyDesktopChangeBackgroundRepeat": {
			if (!hasBackgroundRepeat(action)) break;
			editActiveClassicyTheme(ds.System.Manager.Appearance, (theme) => {
				theme.desktop.backgroundRepeat = action.backgroundRepeat;
			});
			break;
		}
		case "ClassicyDesktopChangeBackgroundSize": {
			if (!hasBackgroundSize(action)) break;
			editActiveClassicyTheme(ds.System.Manager.Appearance, (theme) => {
				theme.desktop.backgroundSize = action.backgroundSize;
			});
			break;
		}
		case "ClassicyDesktopChangeAlertSound": {
			if (!hasAlertSound(action)) break;
			ds.System.Manager.Appearance.alertSound = action.alertSound;
			break;
		}
		case "ClassicyDesktopChangeAlertVolume": {
			// A whole-number percentage, clamped like ClassicyVolumeSet.
			if (!hasAlertVolume(action)) break;
			ds.System.Manager.Appearance.alertVolume = Math.round(
				Math.min(100, Math.max(0, action.alertVolume)),
			);
			break;
		}
		case "ClassicyDesktopSetSmartScrolling": {
			if (!hasSmartScrolling(action)) break;
			ds.System.Manager.Appearance.smartScrolling = action.smartScrolling;
			break;
		}
		case "ClassicyDesktopChangeFont": {
			if (!hasFont(action)) break;
			editActiveClassicyTheme(ds.System.Manager.Appearance, (theme) => {
				switch (action.fontType) {
					case "body":
					case "ui":
					case "header":
					case "mono":
					case "digital":
						theme.typography[action.fontType] = action.font;
						break;
				}
			});
			break;
		}
		case "ClassicyDesktopChangeFontSize": {
			if (!hasFontSize(action)) break;
			editActiveClassicyTheme(ds.System.Manager.Appearance, (theme) => {
				switch (action.fontType) {
					case "uiSize":
					case "bodySize":
					case "headerSize":
					case "monoSize":
					case "digitalSize":
						theme.typography[action.fontType] = action.fontSize;
						break;
				}
			});
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
		case "ClassicyDesktopControlStripSetVisible": {
			if (!hasVisible(action)) break;
			controlStripState(ds).visible = action.visible;
			break;
		}
		case "ClassicyDesktopControlStripSetCollapsed": {
			if (!hasCollapsed(action)) break;
			controlStripState(ds).collapsed = action.collapsed;
			break;
		}
		case "ClassicyDesktopControlStripSetWidth": {
			if (!hasStripWidth(action)) break;
			controlStripState(ds).width =
				action.width === null ? null : Math.round(action.width);
			break;
		}
		case "ClassicyDesktopControlStripSetPosition": {
			if (!hasStripPosition(action)) break;
			const strip = controlStripState(ds);
			strip.edge = action.edge;
			strip.bottom = Math.round(action.bottom);
			break;
		}
		case "ClassicyDesktopControlStripSetModuleHidden": {
			if (!hasModuleHidden(action)) break;
			const strip = controlStripState(ds);
			const others = strip.hiddenModules.filter((id) => id !== action.moduleId);
			strip.hiddenModules = action.hidden
				? [...others, action.moduleId]
				: others;
			break;
		}
		case "ClassicyDesktopControlStripSetModuleOrder": {
			if (!hasModuleOrder(action)) break;
			controlStripState(ds).moduleOrder = Array.from(
				new Set(action.moduleOrder),
			);
			break;
		}
		case "ClassicyDesktopSetDoubleClickTitleToCollapse": {
			if (!hasDoubleClickTitleToCollapse(action)) break;
			ds.System.Manager.Desktop.doubleClickTitleToCollapse =
				action.doubleClickTitleToCollapse;
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
		case "ClassicyDesktopShowSystemDialog": {
			// Unknown values close the dialog rather than open a blank one.
			ds.System.Manager.Desktop.systemDialog =
				action.dialog === "emptyTrash" || action.dialog === "resetPram"
					? action.dialog
					: null;
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
			// No `url` key at all is ignored, as before hasUrl narrowed both
			// cases together. But `url` present as "" must not be silently
			// dropped the same way: hasUrl's `.length > 0` check makes it false
			// for "no url field" and "empty url" alike, so it can't tell them
			// apart on its own (its contract is unchanged; other call sites may
			// rely on that). Coercing to "" here and routing it through the
			// same isValidHttpUrl check as any other bad URL is deliberate:
			// isValidHttpUrl("") already returns false, so an empty string
			// falls into the existing "cannot be opened" error dialog below
			// instead of vanishing with no error and no action.
			//
			// Side effect, noted deliberately rather than left incidental: a
			// non-string `url` (e.g. `url: 123`) used to fail hasUrl and break
			// silently too, the same as "no url field". It now coerces to ""
			// the same as an empty string and surfaces the same error dialog —
			// an improvement, and in keeping with "present but useless" being
			// treated the same regardless of exactly how it's useless.
			if (!("url" in action)) break;
			const url = typeof action.url === "string" ? action.url : "";

			// Shortcut targets are untrusted data: they persist to localStorage
			// and, in consumers that sync the file system, to a remote store.
			if (!isValidHttpUrl(url)) {
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
					url,
					title: typeof action.title === "string" ? action.title : url,
				});
				break;
			}

			// window.open and location.assign are side effects and must not run
			// inside a reducer; the controller performs them.
			ds.System.Manager.Desktop.openUrlRequest = {
				url,
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
