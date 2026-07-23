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
import { focusWindow } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppHelpers";
import type {
	ActionMessage,
	ClassicyStore,
	ClassicyStoreSystemAppWindow,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
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

const notEmpty = <T,>(value: T | null | undefined): value is T => value != null;

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
				position: [number, number];
				menuBar?: ClassicyMenuItem[];
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
	const updateWindow = (
		appId: string,
		windowId: string,
		updates: Partial<ClassicyStoreSystemAppWindow>,
	) => {
		if (!ds.System.Manager.Applications.apps[appId]) return ds;
		ds.System.Manager.Applications.apps[appId].windows =
			ds.System.Manager.Applications.apps[appId].windows.map(
				(w: ClassicyStoreSystemAppWindow) =>
					w.id === windowId ? { ...w, ...updates } : w,
			);
		return ds;
	};

	switch (action.type) {
		case "ClassicyWindowOpen": {
			if (!hasAppAndWindow(action)) break;
			if (!ds.System.Manager.Applications.apps[action.app.id]) break;
			const win = action.window as {
				id: string;
				position: [number, number];
				minimumSize: [number, number];
				size: [number, number];
				menuBar?: ClassicyMenuItem[];
				windowType?: "document" | "utility";
			};
			const window = ds.System.Manager.Applications.apps[
				action.app.id
			].windows.findIndex((w) => w.id === win.id);
			if (window < 0) {
				let paddedPosition: [number, number] = win.position;
				if (win.position[0] === 0 && win.position[1] === 0) {
					const length =
						ds.System.Manager.Applications.apps[action.app.id].windows.length *
						10;
					paddedPosition = [30 + length, 30 + length];
				}
				ds.System.Manager.Applications.apps[action.app.id].windows.push({
					...initialWindowState,
					id: win.id,
					minimumSize: win.minimumSize,
					size: win.size,
					position: paddedPosition,
					closed: false,
					hidden: false,
					menuBar: win.menuBar,
					windowType: win.windowType,
				} as ClassicyStoreSystemAppWindow);
				// A genuinely new window opens focused (Mac behavior); re-registered
				// persisted windows must not steal focus.
				ds = focusWindow(ds, action.app.id, win.id);
			} else {
				ds = updateWindow(action.app.id, win.id, { closed: false });
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
				focused: false,
			});
			// Promote a sibling only when this app holds focus — closing a
			// background app's window must not steal global focus.
			if (ds.System.Manager.Applications.focusedAppId !== action.app.id) {
				break;
			}
			const openWindows = ds.System.Manager.Applications.apps[
				action.app.id
			]?.windows.filter((w) => !w.closed && w.id !== action.window.id);
			if (openWindows?.length) {
				const nextFocus = openWindows.reduce((best, w) =>
					(w.zOrder ?? 0) > (best.zOrder ?? 0) ? w : best,
				);
				ds = focusWindow(ds, action.app.id, nextFocus.id);
			}
			break;
		}

		case "ClassicyWindowDestroy": {
			if (!hasAppAndWindow(action)) break;
			if (!ds.System.Manager.Applications.apps[action.app.id]) break;
			ds = updateWindow(action.app.id, action.window.id, { closed: true });
			ds.System.Manager.Applications.apps[action.app.id].windows =
				ds.System.Manager.Applications.apps[action.app.id].windows
					.map((w) => (w.id === action.window.id ? null : w))
					.filter(notEmpty);
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
				if (!ds.System.Manager.Applications.apps[action.app.id]) break;
				const win = ds.System.Manager.Applications.apps[
					action.app.id
				].windows.find((w) => w.id === windowId);
				if (win) win.menuBar = action.menuBar;
			}
			break;
		}

		case "ClassicyWindowResize": {
			if (!hasWindowResizing(action)) break;
			if (!ds.System.Manager.Applications.apps[action.app.id]) break;
			ds.System.Manager.Applications.apps[action.app.id].windows =
				ds.System.Manager.Applications.apps[action.app.id].windows.map((w) => {
					if (w.id === action.window.id) {
						w.resizing = action.resizing;
						w.size = action.size;
					}
					return w;
				});
			break;
		}
		case "ClassicyWindowDrag": {
			if (!hasWindowDragging(action)) break;
			if (!ds.System.Manager.Applications.apps[action.app.id]) break;
			ds.System.Manager.Applications.apps[action.app.id].windows =
				ds.System.Manager.Applications.apps[action.app.id].windows.map((w) => {
					if (w.id === action.window.id) {
						w.dragging = action.dragging;
					}
					return w;
				});
			break;
		}
		case "ClassicyWindowZoom": {
			if (!hasWindowZoomed(action)) break;
			if (!ds.System.Manager.Applications.apps[action.app.id]) break;
			ds.System.Manager.Applications.apps[action.app.id].windows =
				ds.System.Manager.Applications.apps[action.app.id].windows.map((w) => {
					if (w.id === action.window.id) {
						w.zoomed = action.zoomed;
					}
					return w;
				});
			break;
		}
		case "ClassicyWindowCollapse": {
			if (!hasAppAndWindow(action)) break;
			if (!ds.System.Manager.Applications.apps[action.app.id]) break;
			ds.System.Manager.Applications.apps[action.app.id].windows =
				ds.System.Manager.Applications.apps[action.app.id].windows.map((w) => {
					if (w.id === action.window.id) {
						w.collapsed = true;
					}
					return w;
				});
			break;
		}
		case "ClassicyWindowExpand": {
			if (!hasAppAndWindow(action)) break;
			if (!ds.System.Manager.Applications.apps[action.app.id]) break;
			ds.System.Manager.Applications.apps[action.app.id].windows =
				ds.System.Manager.Applications.apps[action.app.id].windows.map((w) => {
					if (w.id === action.window.id) {
						w.collapsed = false;
					}
					return w;
				});
			break;
		}
		case "ClassicyWindowMove": {
			if (!hasWindowMove(action)) break;
			if (!ds.System.Manager.Applications.apps[action.app.id]) break;
			ds.System.Manager.Applications.apps[action.app.id].windows =
				ds.System.Manager.Applications.apps[action.app.id].windows.map((w) => {
					if (w.id === action.window.id) {
						w.position = action.position;
						w.moving = action.moving;
					}
					return w;
				});
			break;
		}
		case "ClassicyWindowPosition": {
			if (!hasWindowPosition(action)) break;
			if (!ds.System.Manager.Applications.apps[action.app.id]) break;
			ds.System.Manager.Applications.apps[action.app.id].windows =
				ds.System.Manager.Applications.apps[action.app.id].windows.map((w) => {
					if (w.id === action.window.id) {
						w.position = action.position;
					}
					return w;
				});
			break;
		}
	}
	return ds;
};
