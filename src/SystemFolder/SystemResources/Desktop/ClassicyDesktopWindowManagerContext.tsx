import {
	hasApp,
	hasAppAndWindow,
	hasMenuBar,
	hasWindowDragging,
	hasWindowMove,
	hasWindowPosition,
	hasWindowResizing,
	hasWindowZoomed,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyActionPredicates";
import {
	classicyVisibleSuccession,
	classicyWindowsMinimize,
	focusApp,
	focusWindow,
	isClassicyPrimaryWindow,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppHelpers";
import type {
	ActionMessage,
	ClassicyStore,
	ClassicyStoreSystemAppWindow,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	countAppWindows,
	getAppWindow,
	listAppWindows,
	mostRecentAppWindow,
	removeAppWindow,
	setAppWindow,
	updateAppWindow,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppWindows";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";

const initialWindowState = {
	closed: false,
	collapsed: false,
	dragging: false,
	moving: false,
	resizing: false,
	sounding: false,
	zoomed: false,
};

export type ClassicyWindowAction =
	// Open the Window's Context Menu
	| { type: "ClassicyWindowMenu"; menuBar: ClassicyMenuItem[] }
	// Open a Window
	| {
			type: "ClassicyWindowOpen";
			app: { id: string };
			window: {
				id: string;
				minimumSize: [number, number];
				size: [number, number];
				/**
				 * Where a new window opens, taken as given ([0, 0] included).
				 * Omit it, or set `autoPosition`, to have the window cascaded.
				 */
				position?: [number, number];
				/**
				 * The window supplied no position: a new window is cascaded
				 * down and right of the app's others (30 + 10·n, n = the app's
				 * window count), whatever `position` holds.
				 */
				autoPosition?: boolean;
				menuBar?: ClassicyMenuItem[];
				windowType?: "document" | "utility";
				collapsable?: boolean;
				modal?: boolean;
			};
	  }
	// Focus a Window
	| {
			type: "ClassicyWindowFocus";
			app: { id: string };
			window: { id: string; menuBar: ClassicyMenuItem[] };
	  }
	// Close a Window
	| { type: "ClassicyWindowClose"; app: { id: string }; window: { id: string } }
	// Close a Window and destroy its entry
	| {
			type: "ClassicyWindowDestroy";
			app: { id: string };
			window: { id: string };
	  }
	// Collapse (or Minimize) a window
	| {
			type: "ClassicyWindowCollapse";
			app: { id: string };
			window: { id: string };
	  }
	// Expand (or Un-Minimize) a window
	| {
			type: "ClassicyWindowExpand";
			app: { id: string };
			window: { id: string };
	  }
	// Drag a window around
	| {
			type: "ClassicyWindowDrag";
			app: { id: string };
			window: { id: string };
			dragging: boolean;
	  }
	// Zoom a Window
	| {
			type: "ClassicyWindowZoom";
			app: { id: string };
			window: { id: string };
			zoomed: boolean;
			/**
			 * The rect a window maximized under `layout.window.zoom:
			 * "maximize"` returns to (its outer left/top and content size
			 * before the zoom), stored as the record's `restoreRect` so
			 * Restore survives a reload. Sent only by such a window, with
			 * `zoomed: true`; a malformed one (not two pairs of finite
			 * numbers) refuses the action (`hasWindowZoomed`).
			 */
			restore?: { position: [number, number]; size: [number, number] };
	  }
	// Set a Window's Position
	| {
			type: "ClassicyWindowPosition";
			app: { id: string };
			window: { id: string };
			position: [number, number];
	  }
	// Resize a Window
	| {
			type: "ClassicyWindowResize";
			app: { id: string };
			window: { id: string };
			resizing: boolean;
			size: [number, number];
	  }
	// Move a Window
	| {
			type: "ClassicyWindowMove";
			app: { id: string };
			window: { id: string };
			position: [number, number];
			moving: boolean;
	  }
	// Refresh a window's stored menuBar record (does not require focus)
	| {
			type: "ClassicyWindowSetMenuBar";
			app: { id: string };
			windowId: string;
			menuBar: ClassicyMenuItem[];
	  };

export const classicyWindowEventHandler = (
	ds: ClassicyStore,
	action: ActionMessage,
) => {
	// The single write path for every per-window update below. A missing app
	// or window is a no-op.
	const updateWindow = (
		appId: string,
		windowId: string,
		update:
			| Partial<ClassicyStoreSystemAppWindow>
			| ((w: ClassicyStoreSystemAppWindow) => void),
	) => {
		updateAppWindow(
			ds.System.Manager.Applications.apps[appId],
			windowId,
			update,
		);
		return ds;
	};

	switch (action.type) {
		case "ClassicyWindowOpen": {
			if (!hasAppAndWindow(action)) break;
			const app = ds.System.Manager.Applications.apps[action.app.id];
			if (!app) break;
			const win = action.window as {
				id: string;
				position?: [number, number];
				autoPosition?: unknown;
				minimumSize: [number, number];
				size: [number, number];
				menuBar?: ClassicyMenuItem[];
				windowType?: "document" | "utility";
				collapsable?: unknown;
				modal?: unknown;
			};
			// #278: persist the window's collapsable/modal props so Option-click
			// collapse-all can skip windows that opted out. Only real booleans
			// are written — a malformed payload leaves the record untouched.
			const flags: Partial<ClassicyStoreSystemAppWindow> = {};
			if (typeof win.collapsable === "boolean")
				flags.collapsable = win.collapsable;
			if (typeof win.modal === "boolean") flags.modal = win.modal;
			if (!getAppWindow(app, win.id)) {
				// G18: only a window that supplied no position is cascaded, by the
				// number already registered. The signal is explicit: [0, 0] is a
				// real position (a top-left window under window placement, whose
				// menu-bar band is 0).
				let paddedPosition: [number, number];
				if (win.autoPosition === true || !Array.isArray(win.position)) {
					const offset = countAppWindows(app) * 10;
					paddedPosition = [30 + offset, 30 + offset];
				} else {
					paddedPosition = win.position;
				}
				setAppWindow(app, {
					...initialWindowState,
					id: win.id,
					minimumSize: win.minimumSize,
					size: win.size,
					position: paddedPosition,
					closed: false,
					hidden: false,
					menuBar: win.menuBar,
					windowType: win.windowType,
					...flags,
				} as ClassicyStoreSystemAppWindow);
				// A genuinely new window opens focused (Mac behavior); re-registered
				// persisted windows must not steal focus.
				ds = focusWindow(ds, action.app.id, win.id);
			} else {
				const existing = getAppWindow(app, win.id);
				// A window closed earlier this session and now registering again
				// is being reopened (e.g. a dialog the app unmounts on Cancel and
				// mounts again later): bring it to the front like a new window.
				// Anything else is a persisted window re-registering after a
				// reload or remount, which must not steal focus.
				const reopening = !!existing?.closed && !!existing?.closedThisSession;
				// A persisted record may predate #278 (no flags) or the props may
				// have changed since; the mounting component's props win.
				ds = updateWindow(action.app.id, win.id, {
					closed: false,
					closedThisSession: false,
					...flags,
				});
				if (reopening) {
					ds = focusWindow(ds, action.app.id, win.id);
				}
			}
			break;
		}
		case "ClassicyWindowFocus": {
			if (!hasAppAndWindow(action)) break;
			if (!ds.System.Manager.Applications.apps[action.app.id]) break;
			// Prefer fresh appMenu from component props (has closures) over stored menuBar
			const appObj = action.app as Record<string, unknown>;
			const winObj = action.window as Record<string, unknown>;
			const freshMenu =
				(Array.isArray(appObj.appMenu) ? appObj.appMenu : null) ||
				(Array.isArray(winObj.menuBar) ? winObj.menuBar : null);
			ds = focusWindow(
				ds,
				action.app.id,
				action.window.id,
				(freshMenu as ClassicyMenuItem[] | null) ?? undefined,
			);
			break;
		}
		case "ClassicyWindowClose": {
			if (!hasAppAndWindow(action)) break;
			ds = updateWindow(action.app.id, action.window.id, {
				closed: true,
				closedThisSession: true,
				focused: false,
			});
			// Promote a sibling only when this app holds focus — closing a
			// background app's window must not steal global focus.
			if (ds.System.Manager.Applications.focusedAppId !== action.app.id) {
				break;
			}
			// Under `window.collapse: "minimize"` focus passes on as it does
			// from a minimize: the app's front shown window, else another
			// app's, else the desktop. A minimized sibling is never restored,
			// and the app is never left focused with no window to show its
			// menus (where ClassicyApp's refocus would restore one). A window
			// of the app that still holds focus (its dialog) keeps it.
			if (classicyWindowsMinimize(ds)) {
				const stillFocused = listAppWindows(
					ds.System.Manager.Applications.apps[action.app.id],
				).some((w) => w.focused === true && !w.closed);
				if (!stillFocused) {
					ds = classicyVisibleSuccession(ds, action.app.id, action.window.id);
				}
				break;
			}
			const nextFocus = mostRecentAppWindow(
				listAppWindows(
					ds.System.Manager.Applications.apps[action.app.id],
				).filter(
					(w) =>
						!w.closed &&
						w.id !== action.window.id &&
						w.windowType !== "utility",
				),
			);
			if (nextFocus) {
				ds = focusWindow(ds, action.app.id, nextFocus.id);
			}
			break;
		}

		case "ClassicyWindowDestroy": {
			if (!hasAppAndWindow(action)) break;
			if (!ds.System.Manager.Applications.apps[action.app.id]) break;
			// Capture focus ownership BEFORE the record is filtered out — once
			// the window is gone there is no way to tell it held focus, and a
			// modal unmounting would leave focus dangling on a window that no
			// longer exists (#223).
			const destroyed = getAppWindow(
				ds.System.Manager.Applications.apps[action.app.id],
				action.window.id,
			);
			const heldFocus =
				destroyed?.focused === true &&
				ds.System.Manager.Applications.focusedAppId === action.app.id;
			removeAppWindow(
				ds.System.Manager.Applications.apps[action.app.id],
				action.window.id,
			);
			// Tidiness, not correctness: pickWindowToRestore already filters
			// lastAccessedWindowId against surviving windows, and the next focus
			// succession overwrites it anyway, so a stale pointer here is
			// harmless. Clear it so the field doesn't linger naming a window that
			// no longer exists, before focus succession runs below.
			if (
				ds.System.Manager.Applications.apps[action.app.id]
					.lastAccessedWindowId === action.window.id
			) {
				ds.System.Manager.Applications.apps[
					action.app.id
				].lastAccessedWindowId = undefined;
			}
			// Hand focus to a surviving sibling using the same succession rules
			// as ClassicyWindowClose (lastAccessed → highest zOrder → default,
			// skipping utility palettes). Removal happens first so the destroyed
			// window can never select itself. Under `window.collapse:
			// "minimize"`, the minimize succession instead, which never picks
			// (and so never restores) a minimized window.
			if (heldFocus) {
				if (classicyWindowsMinimize(ds)) {
					ds = classicyVisibleSuccession(ds, action.app.id, action.window.id);
				} else {
					focusApp(ds, action.app.id);
				}
			}
			break;
		}
		case "ClassicyWindowMenu": {
			if (hasMenuBar(action)) {
				ds.System.Manager.Desktop.appMenu = action.menuBar;
			}
			break;
		}
		case "ClassicyWindowSetMenuBar": {
			if (
				hasMenuBar(action) &&
				hasApp(action) &&
				typeof (action as { windowId?: unknown }).windowId === "string"
			) {
				const windowId = (action as { windowId?: unknown }).windowId as string;
				const menuBar = action.menuBar;
				updateWindow(action.app.id, windowId, (w) => {
					w.menuBar = menuBar;
				});
			}
			break;
		}

		case "ClassicyWindowResize": {
			if (!hasWindowResizing(action)) break;
			updateWindow(action.app.id, action.window.id, {
				resizing: action.resizing,
				size: action.size,
			});
			break;
		}
		case "ClassicyWindowDrag": {
			if (!hasWindowDragging(action)) break;
			updateWindow(action.app.id, action.window.id, {
				dragging: action.dragging,
			});
			break;
		}
		case "ClassicyWindowZoom": {
			if (!hasWindowZoomed(action)) break;
			const { zoomed, restore } = action;
			updateWindow(action.app.id, action.window.id, (w) => {
				w.zoomed = zoomed;
				// A maximized window's rect to return to (plan 0020-w98 §5): kept
				// while it stays zoomed, gone once it un-zooms, whatever un-zooms
				// it (its Restore, a resize, a WindowShade collapse, another
				// package's zoom box). Only a window maximized under
				// `layout.window.zoom: "maximize"` sends one, so every other
				// package's record never gains the key.
				if (!zoomed) {
					if ("restoreRect" in w) delete w.restoreRect;
				} else if (restore) {
					w.restoreRect = {
						position: [restore.position[0], restore.position[1]],
						size: [restore.size[0], restore.size[1]],
					};
				}
			});
			break;
		}
		case "ClassicyWindowCollapse": {
			if (!hasAppAndWindow(action)) break;
			if (!classicyWindowsMinimize(ds)) {
				updateWindow(action.app.id, action.window.id, { collapsed: true });
				break;
			}
			// Under `window.collapse: "minimize"` (plan 0020-w98 §5): the
			// window leaves the screen and keeps its taskbar button (WIG Ch.6
			// "Minimizing Windows", p.85). A modal or a palette has no button
			// to come back from, so its collapse is refused, whoever asks
			// (collapse-all, a host's dispatch).
			const app = ds.System.Manager.Applications.apps[action.app.id];
			const record = getAppWindow(app, action.window.id);
			if (!record || !isClassicyPrimaryWindow(record)) break;
			const heldFocus =
				record.focused === true &&
				ds.System.Manager.Applications.focusedAppId === action.app.id;
			ds = updateWindow(action.app.id, action.window.id, {
				collapsed: true,
				focused: false,
			});
			// The active window minimized: focus passes to the next window
			// down, never a minimized one, so the app is not left focused
			// with no window (where ClassicyApp's refocus would restore the
			// one just minimized). Minimizing any other window moves nothing.
			if (heldFocus) {
				ds = classicyVisibleSuccession(ds, action.app.id, action.window.id);
			}
			break;
		}
		case "ClassicyWindowExpand": {
			if (!hasAppAndWindow(action)) break;
			updateWindow(action.app.id, action.window.id, { collapsed: false });
			break;
		}
		case "ClassicyWindowMove": {
			if (!hasWindowMove(action)) break;
			updateWindow(action.app.id, action.window.id, {
				position: action.position,
				moving: action.moving,
			});
			break;
		}
		case "ClassicyWindowPosition": {
			if (!hasWindowPosition(action)) break;
			updateWindow(action.app.id, action.window.id, {
				position: action.position,
			});
			break;
		}
	}
	return ds;
};
