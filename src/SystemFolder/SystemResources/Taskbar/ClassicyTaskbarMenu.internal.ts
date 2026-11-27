import { useEffect, useMemo, useRef } from "react";
import { useClassicyAppIdentityOverrides } from "@/Appearance/ClassicyAppIdentity";
import { resolveClassicyAsset } from "@/Appearance/ClassicyAssetRegistry";
import { readClassicyThemeVar } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetricReader";
import type { ClassicyStoreSystemApp } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import {
	getAppWindow,
	listAppWindows,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppWindows";
import {
	CONTROL_STRIP_MANAGER_APP_ID,
	CONTROL_STRIP_MANAGER_APP_NAME,
} from "@/SystemFolder/ControlPanels/ControlStripManager/ClassicyControlStripManagerManifest";
import { useClassicyContextualMenu } from "@/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenuProvider";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import {
	type ClassicyArrangeArea,
	type ClassicyArrangeWindow,
	type ClassicyTileOrientation,
	classicyArrangeMetrics,
	classicyCascadeRects,
	classicyTileRects,
} from "@/SystemFolder/SystemResources/Taskbar/ClassicyTaskbarArrange.internal";
import { getClassicyTaskbarInsets } from "@/SystemFolder/SystemResources/Taskbar/ClassicyTaskbarBand.internal";
import {
	type ClassicyTaskbarTask,
	classicyTaskbarTasks,
} from "@/SystemFolder/SystemResources/Taskbar/ClassicyTaskbarTasks.internal";
import {
	type ClassicyWindowEntry,
	type ClassicyWindowGeometry,
	getClassicyWindowEntries,
	runClassicyWindowCommand,
} from "@/SystemFolder/SystemResources/Window/ClassicyWindowRegistry.internal";

/**
 * The taskbar's own menu (plan 0020-w98 §2, "The taskbar's own menu", and
 * E1), the pop-up menu a right-click on the taskbar's background opens, as
 * Windows 98 SE's explorer.exe builds it (its menu 205 below the band site's
 * Toolbars ▸, browselc.dll's menu 268): Toolbars ▸ Quick Launch, then
 * Cascade Windows, Tile Windows Horizontally and Tile Windows Vertically,
 * then Minimize All Windows and, while there is something to undo, Undo
 * Cascade, Undo Tile or Undo Minimize All (explorer's "&Undo %s"), then
 * Properties. Its commands also serve Quick Launch's Show Desktop. Internal:
 * not exported from the package.
 */

/** A window, by its app id and window id. */
export type ClassicyTaskbarWindowRef = {
	readonly appId: string;
	readonly windowId: string;
};

/**
 * What Minimize All Windows did, remembered for its Undo: the windows it
 * minimized and the window that was active, and, as the store stood right
 * after it, every open window (`classicyTaskbarOpenWindowKeys`) and the
 * focused one (`classicyTaskbarFocusedWindowKey`), so a window opened or
 * activated later forgets it (the shell addendum's B21).
 */
export type ClassicyTaskbarMinimizedAll = {
	readonly windows: readonly ClassicyTaskbarWindowRef[];
	readonly active?: ClassicyTaskbarWindowRef;
	/** The keys of every open window right after it (absent: not checked). */
	readonly open?: readonly string[];
	/** The focused window's key right after it, `""` for none (absent: not checked). */
	readonly focus?: string;
};

/** A window's place before an arrangement, for its Undo. */
export type ClassicyTaskbarPlacement = ClassicyTaskbarWindowRef & {
	/** The rect it returns to (its Restore's, when it was maximized). */
	readonly position: [number, number];
	readonly size: [number, number];
	/** It was maximized, and is maximized again. */
	readonly maximized: boolean;
};

/**
 * The menu's one Undo (explorer keeps one: "&Undo %s"): the last of Minimize
 * All Windows, Cascade Windows and Tile Windows, with what it needs to undo
 * it. Cascading or tiling again keeps the places from before the first
 * arrangement, as explorer backs the windows up only when nothing is
 * arranged (ReactOS `g_Arrangement`, `BackupWindowPos`).
 */
export type ClassicyTaskbarUndo =
	| ({ readonly kind: "minimizeAll" } & ClassicyTaskbarMinimizedAll)
	| {
			readonly kind: "cascade" | "tile";
			readonly placements: readonly ClassicyTaskbarPlacement[];
			readonly active?: ClassicyTaskbarWindowRef;
	  };

const ownApp = (
	apps: Readonly<Record<string, ClassicyStoreSystemApp>>,
	appId: string,
): ClassicyStoreSystemApp | undefined =>
	Object.hasOwn(apps, appId) ? apps[appId] : undefined;

const refOf = (task: ClassicyTaskbarTask): ClassicyTaskbarWindowRef => ({
	appId: task.entry.appId,
	windowId: task.entry.windowId,
});

const isOpen = (
	apps: Readonly<Record<string, ClassicyStoreSystemApp>>,
	{ appId, windowId }: ClassicyTaskbarWindowRef,
): boolean => {
	const app = ownApp(apps, appId);
	if (!app?.open) return false;
	const record = getAppWindow(app, windowId);
	return record !== undefined && !record.closed;
};

/**
 * The windows Minimize All Windows minimizes: every window button's window
 * (an open primary window of an open app) that is not minimized and has a
 * Minimize box (`collapsable`), in the buttons' order with the active one
 * last, so the focus passes on once, when it goes. Pure.
 */
export function classicyTaskbarMinimizeAllTargets(
	tasks: readonly ClassicyTaskbarTask[],
): ClassicyTaskbarTask[] {
	const targets = tasks.filter((t) => !t.minimized && t.entry.collapsable);
	return [
		...targets.filter((t) => !t.active),
		...targets.filter((t) => t.active),
	];
}

/** A window's key in `ClassicyTaskbarMinimizedAll`'s `open` and `focus`. */
const windowKey = (appId: string, windowId: string): string =>
	`${appId}\u0000${windowId}`;

/**
 * The keys of every open window of every open app (modals and palettes
 * included), for `ClassicyTaskbarMinimizedAll`'s `open`. Pure.
 */
export function classicyTaskbarOpenWindowKeys(
	apps: Readonly<Record<string, ClassicyStoreSystemApp>>,
): string[] {
	const keys: string[] = [];
	for (const app of Object.values(apps)) {
		if (!app.open) continue;
		for (const window of listAppWindows(app))
			if (!window.closed) keys.push(windowKey(app.id, window.id));
	}
	return keys;
}

/**
 * The focused window's key (the focused app's focused, open window), `""`
 * while none is (the desktop holds focus), for
 * `ClassicyTaskbarMinimizedAll`'s `focus`. Pure.
 */
export function classicyTaskbarFocusedWindowKey(
	apps: Readonly<Record<string, ClassicyStoreSystemApp>>,
): string {
	const app = Object.values(apps).find((a) => a.open && a.focused);
	if (!app) return "";
	const window = listAppWindows(app).find((w) => w.focused && !w.closed);
	return window ? windowKey(app.id, window.id) : "";
}

/**
 * Whether `minimized` still stands, so the menu offers its Undo: it lists a
 * window, and every window it lists is still open, in an open app, and
 * collapsed. Restoring or closing any of them by other means forgets it,
 * and, as Windows 98's explorer forgets its list (WIG App. B, Table B.3,
 * p.359; the shell addendum's B21), so does a window opening that was not
 * open right after it (`open`) or a window other than the one focused right
 * after it taking focus (`focus`); the focus going to the desktop keeps it.
 * Pure.
 */
export function classicyTaskbarMinimizedAllStands(
	minimized: ClassicyTaskbarMinimizedAll | null,
	apps: Readonly<Record<string, ClassicyStoreSystemApp>>,
): boolean {
	if (!minimized || minimized.windows.length === 0) return false;
	const listed = minimized.windows.every((ref) => {
		if (!isOpen(apps, ref)) return false;
		return (
			getAppWindow(ownApp(apps, ref.appId), ref.windowId)?.collapsed === true
		);
	});
	if (!listed) return false;
	if (minimized.open) {
		const before = new Set(minimized.open);
		if (classicyTaskbarOpenWindowKeys(apps).some((key) => !before.has(key)))
			return false;
	}
	if (minimized.focus !== undefined) {
		const focus = classicyTaskbarFocusedWindowKey(apps);
		if (focus !== "" && focus !== minimized.focus) return false;
	}
	return true;
}

/**
 * Whether `undo` still stands: a Minimize All while
 * `classicyTaskbarMinimizedAllStands`; an arrangement while one of the
 * windows it placed is still open, which its Undo puts back. Pure.
 */
export function classicyTaskbarUndoStands(
	undo: ClassicyTaskbarUndo | null,
	apps: Readonly<Record<string, ClassicyStoreSystemApp>>,
): boolean {
	if (!undo) return false;
	if (undo.kind === "minimizeAll")
		return classicyTaskbarMinimizedAllStands(undo, apps);
	return undo.placements.some((ref) => isOpen(apps, ref));
}

/**
 * The windows Cascade Windows and Tile Windows arrange, front first: every
 * window button's window drawn on the desktop (not minimized, its app not
 * hidden; `geometry` defined), in stacking order (highest `zOrder` first).
 * Windows arranges the desktop's visible, non-minimized top-level windows;
 * Classicy's palettes and dialogs, which have no button, stay where they
 * are, as they follow their app. Pure.
 */
export function classicyTaskbarArrangeTargets(
	tasks: readonly ClassicyTaskbarTask[],
): { task: ClassicyTaskbarTask; geometry: ClassicyWindowGeometry }[] {
	const targets: {
		task: ClassicyTaskbarTask;
		geometry: ClassicyWindowGeometry;
	}[] = [];
	for (const task of tasks) {
		if (task.minimized) continue;
		const geometry = task.entry.geometry();
		if (geometry) targets.push({ task, geometry });
	}
	return targets.sort((a, b) => b.task.zOrder - a.task.zOrder);
}

/** A window's outer rect to restore and size bounds, for the arrangements. */
const arrangeWindowOf = (
	entry: ClassicyWindowEntry,
	geometry: ClassicyWindowGeometry,
): ClassicyArrangeWindow => {
	const [chromeX, chromeY] = geometry.chrome;
	const { position, size } = geometry.restoreRect;
	return {
		rect: {
			left: position[0],
			top: position[1],
			width: size[0] + chromeX,
			height: size[1] + chromeY,
		},
		sizable: entry.resizable,
		minimum: [
			geometry.minimumSize[0] + chromeX,
			geometry.minimumSize[1] + chromeY,
		],
	};
};

/**
 * The menu items' ids: the taskbar's own, and the clock's lead item
 * (`ClassicyTaskbarClock.internal.tsx`).
 */
export const CLASSICY_TASKBAR_MENU_IDS = {
	adjustDateTime: "taskbar-adjust-date-time",
	toolbars: "taskbar-toolbars",
	quickLaunch: "taskbar-toolbar-quick-launch",
	cascade: "taskbar-cascade",
	tileHorizontally: "taskbar-tile-horizontally",
	tileVertically: "taskbar-tile-vertically",
	minimizeAll: "taskbar-minimize-all",
	undo: "taskbar-undo",
	properties: "taskbar-properties",
} as const;

/** The Undo item's title for each kind (explorer.exe's "&Undo %s"). */
export const CLASSICY_TASKBAR_UNDO_TITLES: Readonly<
	Record<ClassicyTaskbarUndo["kind"], string>
> = {
	cascade: "Undo Cascade",
	tile: "Undo Tile",
	minimizeAll: "Undo Minimize All",
};

const SPACER: ClassicyMenuItem = { id: "spacer" };

/**
 * The taskbar's menu, top to bottom: `leading` items and a divider when
 * there are any (the clock's Adjust Date/Time); **Toolbars ▸** (its **Quick
 * Launch** checked while the toolbar shows) and a divider when `toolbars` is
 * given (the band site's menu: the bar and its bands, not the status area);
 * **Cascade Windows**, **Tile Windows Horizontally**, **Tile Windows
 * Vertically** (disabled when `canArrange` is false); a divider; **Minimize
 * All Windows** (disabled when `canMinimizeAll` is false) and, while `undo`
 * is a kind, its **Undo** (`CLASSICY_TASKBAR_UNDO_TITLES`); a divider; and
 * **Properties**. Pure: the handlers are the caller's.
 */
export function classicyTaskbarMenuItems({
	leading = [],
	toolbars,
	canArrange,
	onCascade,
	onTile,
	canMinimizeAll,
	onMinimizeAll,
	undo,
	onUndo,
	onProperties,
}: {
	leading?: readonly ClassicyMenuItem[];
	toolbars?: { quickLaunch: boolean; onQuickLaunch: () => void };
	canArrange: boolean;
	onCascade: () => void;
	onTile: (orientation: ClassicyTileOrientation) => void;
	canMinimizeAll: boolean;
	onMinimizeAll: () => void;
	undo: ClassicyTaskbarUndo["kind"] | null;
	onUndo: () => void;
	onProperties: () => void;
}): ClassicyMenuItem[] {
	return [
		...(leading.length > 0 ? [...leading, SPACER] : []),
		...(toolbars
			? [
					{
						id: CLASSICY_TASKBAR_MENU_IDS.toolbars,
						title: "Toolbars",
						menuChildren: [
							{
								id: CLASSICY_TASKBAR_MENU_IDS.quickLaunch,
								title: "Quick Launch",
								checked: toolbars.quickLaunch,
								onClickFunc: toolbars.onQuickLaunch,
							},
						],
					},
					SPACER,
				]
			: []),
		{
			id: CLASSICY_TASKBAR_MENU_IDS.cascade,
			title: "Cascade Windows",
			disabled: !canArrange,
			onClickFunc: onCascade,
		},
		{
			id: CLASSICY_TASKBAR_MENU_IDS.tileHorizontally,
			title: "Tile Windows Horizontally",
			disabled: !canArrange,
			onClickFunc: () => onTile("horizontally"),
		},
		{
			id: CLASSICY_TASKBAR_MENU_IDS.tileVertically,
			title: "Tile Windows Vertically",
			disabled: !canArrange,
			onClickFunc: () => onTile("vertically"),
		},
		SPACER,
		{
			id: CLASSICY_TASKBAR_MENU_IDS.minimizeAll,
			title: "Minimize All Windows",
			disabled: !canMinimizeAll,
			onClickFunc: onMinimizeAll,
		},
		...(undo
			? [
					{
						id: CLASSICY_TASKBAR_MENU_IDS.undo,
						title: CLASSICY_TASKBAR_UNDO_TITLES[undo],
						onClickFunc: onUndo,
					},
				]
			: []),
		SPACER,
		{
			id: CLASSICY_TASKBAR_MENU_IDS.properties,
			title: "Properties",
			onClickFunc: onProperties,
		},
	];
}

/** Opens the taskbar's menu at a desktop point. */
export type ClassicyShowTaskbarMenu = (
	at: [number, number],
	leading?: readonly ClassicyMenuItem[],
	options?: {
		/** Lead with Toolbars ▸ (the band site's menu: the bar and its bands). */
		toolbars?: boolean;
	},
) => void;

/** The taskbar's commands, one set per taskbar mount. */
export type ClassicyTaskbarCommands = {
	/** Opens the taskbar's menu (`classicyTaskbarMenuItems`). */
	showMenu: ClassicyShowTaskbarMenu;
	/**
	 * Quick Launch's Show Desktop (Windows 98's `ToggleDesktop`): while a
	 * window button's window is shown, Minimize All Windows; else the Undo
	 * of the Minimize All that hid them, while it stands.
	 */
	toggleDesktop: () => void;
};

/** The work area, read from the desktop: its box less the menu bar's band and the taskbar's, on the edge it is docked to. */
const workArea = (): ClassicyArrangeArea => {
	const desktop =
		typeof document !== "undefined"
			? document.getElementById("classicyDesktop")
			: null;
	const width =
		desktop?.clientWidth ||
		(typeof window !== "undefined" ? window.innerWidth : 800);
	const height =
		desktop?.clientHeight ||
		(typeof window !== "undefined" ? window.innerHeight : 600);
	const band = getClassicyTaskbarInsets();
	const top = readClassicyThemeVar("--menu-bar-height", 0, desktop) + band.top;
	const left = band.left;
	return {
		left,
		top,
		right: Math.max(left, width - band.right),
		bottom: Math.max(top, height - band.bottom),
	};
};

/**
 * The taskbar's commands (`ClassicyTaskbarCommands`), one per taskbar mount.
 * It remembers the menu's one Undo for as long as the taskbar is mounted, and
 * forgets it once it no longer stands (a store subscription,
 * `classicyTaskbarUndoStands`), once it runs, or, for an arrangement, when
 * the menu opens with no window to arrange (ReactOS `OnInitMenuPopup`).
 *
 * - **Minimize All Windows** dispatches `ClassicyWindowCollapse` for each of
 *   `classicyTaskbarMinimizeAllTargets`, from the one handler, so React
 *   commits the lot once and the focus passes on once (the active window
 *   goes last), to the desktop when no other window is shown.
 * - **Cascade Windows** and **Tile Windows Horizontally / Vertically** place
 *   `classicyTaskbarArrangeTargets` at `classicyCascadeRects` or
 *   `classicyTileRects` in the work area (each window's `place` command:
 *   restored first when maximized, sized when resizable, never activated),
 *   then activate the front window, as `CascadeWindows` and `TileWindows`
 *   end with `SetForegroundWindow` on the last window they placed. The
 *   stacking order is kept: the windows are placed from the back.
 * - **Undo** restores what the last of them changed: the windows Minimize
 *   All minimized that are still minimized, or the rects (and maximized
 *   state) the arranged windows had, then activates the window that was
 *   active. Minimize All's list is forgotten, and the item reads Minimize
 *   All Windows alone again, once one of its windows is restored or
 *   closed, a window opens, or another window is activated
 *   (`classicyTaskbarMinimizedAllStands`).
 * - **Properties** opens the Control Strip control panel, whose settings
 *   drive the status area.
 * - **Toolbars ▸ Quick Launch** shows or hides Quick Launch
 *   (`ClassicyDesktopTaskbarSetQuickLaunch`).
 *
 * The menu is a Windows pop-up menu: no leading Help item, and it takes the
 * keyboard while open.
 */
export function useClassicyTaskbarCommands(): ClassicyTaskbarCommands {
	const dispatch = useAppManagerDispatch();
	const overrides = useClassicyAppIdentityOverrides();
	const { showContextMenu } = useClassicyContextualMenu();
	const undoRef = useRef<ClassicyTaskbarUndo | null>(null);

	// Forget the Undo as soon as it no longer stands.
	useEffect(
		() =>
			useAppManager.subscribe((state) => {
				if (
					undoRef.current &&
					!classicyTaskbarUndoStands(
						undoRef.current,
						state.System.Manager.Applications.apps,
					)
				)
					undoRef.current = null;
			}),
		[],
	);

	return useMemo(() => {
		const apps = () =>
			useAppManager.getState().System.Manager.Applications.apps;
		const liveTasks = () =>
			classicyTaskbarTasks(getClassicyWindowEntries(), apps(), overrides);
		const activeRef = (tasks: readonly ClassicyTaskbarTask[]) => {
			const active = tasks.find((t) => t.active);
			return active ? refOf(active) : undefined;
		};
		const activate = (ref: ClassicyTaskbarWindowRef | undefined) => {
			if (ref)
				runClassicyWindowCommand(ref.appId, ref.windowId, {
					type: "activate",
				});
		};

		const minimizeAll = () => {
			// Chosen on the store as it stands now, not as the menu saw it.
			const live = liveTasks();
			const active = activeRef(live);
			const chosen = classicyTaskbarMinimizeAllTargets(live);
			for (const task of chosen) {
				const record = getAppWindow(
					ownApp(apps(), task.entry.appId),
					task.entry.windowId,
				);
				if (!record) continue;
				dispatch({
					type: "ClassicyWindowCollapse",
					app: { id: task.entry.appId },
					window: record,
				});
			}
			// Remember the windows the collapse took (a refused one is not
			// the Undo's to restore).
			const now = apps();
			const windows = chosen
				.map(refOf)
				.filter(
					({ appId, windowId }) =>
						getAppWindow(ownApp(now, appId), windowId)?.collapsed === true,
				);
			if (windows.length > 0)
				undoRef.current = {
					kind: "minimizeAll",
					windows,
					active,
					open: classicyTaskbarOpenWindowKeys(now),
					focus: classicyTaskbarFocusedWindowKey(now),
				};
		};

		const arrange = (
			kind: "cascade" | "tile",
			orientation: ClassicyTileOrientation = "horizontally",
		) => {
			const live = liveTasks();
			const targets = classicyTaskbarArrangeTargets(live);
			if (targets.length === 0) return;
			const desktop = document.getElementById("classicyDesktop");
			// SM_CXFRAME is the scheme's sizing border: a package may set the
			// frame on its windows (Windows 98's `sizingBorder.frame`), so it
			// is read from a window, else from the desktop.
			const desktopFrame = readClassicyThemeVar(
				"--window-frame-inset",
				undefined,
				desktop,
			);
			const { step, minimum } = classicyArrangeMetrics({
				titleBarHeight: readClassicyThemeVar(
					"--window-title-bar-height",
					undefined,
					desktop,
				),
				frame: readClassicyThemeVar(
					"--window-frame-inset",
					desktopFrame,
					desktop?.querySelector(".classicyWindow") ?? desktop,
				),
				border: readClassicyThemeVar(
					"--window-border-size",
					undefined,
					desktop,
				),
			});
			const area = workArea();
			const windows = targets.map(({ task, geometry }) =>
				arrangeWindowOf(task.entry, geometry),
			);
			const rects =
				kind === "cascade"
					? classicyCascadeRects(windows, area, step)
					: classicyTileRects(windows, area, minimum, orientation);
			// The places before the first of a run of arrangements are the
			// ones its Undo returns to.
			const previous = undoRef.current;
			const keep =
				previous !== null &&
				previous.kind !== "minimizeAll" &&
				classicyTaskbarUndoStands(previous, apps());
			const placements: ClassicyTaskbarPlacement[] = keep
				? [...previous.placements]
				: targets.map(({ task, geometry }) => ({
						...refOf(task),
						position: [
							geometry.restoreRect.position[0],
							geometry.restoreRect.position[1],
						],
						size: [geometry.restoreRect.size[0], geometry.restoreRect.size[1]],
						maximized: geometry.maximized,
					}));
			const active = keep ? previous.active : activeRef(live);
			// From the back, so the stacking order stands.
			for (let i = targets.length - 1; i >= 0; i--) {
				const { task, geometry } = targets[i];
				const rect = rects[i];
				runClassicyWindowCommand(task.entry.appId, task.entry.windowId, {
					type: "place",
					position: [rect.left, rect.top],
					size: [
						rect.width - geometry.chrome[0],
						rect.height - geometry.chrome[1],
					],
				});
			}
			undoRef.current = { kind, placements, active };
			activate(refOf(targets[0].task));
		};

		const undo = () => {
			const last = undoRef.current;
			undoRef.current = null;
			if (!last) return;
			if (last.kind === "minimizeAll") {
				for (const { appId, windowId } of last.windows) {
					const app = ownApp(apps(), appId);
					const record = getAppWindow(app, windowId);
					if (!app?.open || !record || record.closed || !record.collapsed)
						continue;
					dispatch({
						type: "ClassicyWindowExpand",
						app: { id: appId },
						window: record,
					});
				}
			} else {
				// From the back, as they were placed.
				for (let i = last.placements.length - 1; i >= 0; i--) {
					const placement = last.placements[i];
					runClassicyWindowCommand(placement.appId, placement.windowId, {
						type: "place",
						position: placement.position,
						size: placement.size,
						maximized: placement.maximized,
					});
				}
			}
			activate(last.active);
		};

		const properties = () =>
			dispatch({
				type: "ClassicyAppOpen",
				app: {
					id: CONTROL_STRIP_MANAGER_APP_ID,
					name: CONTROL_STRIP_MANAGER_APP_NAME,
					icon:
						resolveClassicyAsset(
							"icons",
							"controlPanels.controlStripManager.app",
						) ?? "",
				},
			});

		const showMenu: ClassicyShowTaskbarMenu = (
			at,
			leading = [],
			options = {},
		) => {
			// The menu is built on the store as it stands when it opens.
			const tasks = liveTasks();
			const canArrange = classicyTaskbarArrangeTargets(tasks).length > 0;
			// With no window to arrange, an arrangement has nothing to undo.
			if (
				undoRef.current &&
				(!classicyTaskbarUndoStands(undoRef.current, apps()) ||
					(undoRef.current.kind !== "minimizeAll" && !canArrange))
			)
				undoRef.current = null;
			const quickLaunch =
				useAppManager.getState().System.Manager.Desktop.taskbar?.quickLaunch !==
				false;
			showContextMenu(
				classicyTaskbarMenuItems({
					leading,
					toolbars: options.toolbars
						? {
								quickLaunch,
								onQuickLaunch: () =>
									dispatch({
										type: "ClassicyDesktopTaskbarSetQuickLaunch",
										visible: !quickLaunch,
									}),
							}
						: undefined,
					canArrange,
					onCascade: () => arrange("cascade"),
					onTile: (orientation) => arrange("tile", orientation),
					canMinimizeAll: classicyTaskbarMinimizeAllTargets(tasks).length > 0,
					onMinimizeAll: minimizeAll,
					undo: undoRef.current?.kind ?? null,
					onUndo: undo,
					onProperties: properties,
				}),
				at,
				{ helpItem: false, keyboard: true },
			);
		};

		const toggleDesktop = () => {
			const tasks = liveTasks();
			if (tasks.some((t) => !t.minimized)) {
				minimizeAll();
				return;
			}
			const last = undoRef.current;
			if (
				last?.kind === "minimizeAll" &&
				classicyTaskbarUndoStands(last, apps())
			)
				undo();
		};

		return { showMenu, toggleDesktop };
	}, [dispatch, overrides, showContextMenu]);
}
