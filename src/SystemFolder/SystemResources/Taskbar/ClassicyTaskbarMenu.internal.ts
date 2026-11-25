import { useCallback, useEffect, useRef } from "react";
import { useClassicyAppIdentityOverrides } from "@/Appearance/ClassicyAppIdentity";
import { resolveClassicyAsset } from "@/Appearance/ClassicyAssetRegistry";
import type { ClassicyStoreSystemApp } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { getAppWindow } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppWindows";
import {
	CONTROL_STRIP_MANAGER_APP_ID,
	CONTROL_STRIP_MANAGER_APP_NAME,
} from "@/SystemFolder/ControlPanels/ControlStripManager/ClassicyControlStripManagerManifest";
import { useClassicyContextualMenu } from "@/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenuProvider";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import {
	type ClassicyTaskbarTask,
	classicyTaskbarTasks,
} from "@/SystemFolder/SystemResources/Taskbar/ClassicyTaskbarTasks.internal";
import {
	getClassicyWindowEntries,
	runClassicyWindowCommand,
} from "@/SystemFolder/SystemResources/Window/ClassicyWindowRegistry.internal";

/**
 * The taskbar's own menu (plan 0020-w98 §2, "The taskbar's own menu"), the
 * pop-up menu a right-click on the taskbar's background opens: Minimize All
 * Windows, or Undo Minimize All after it (WIG App. B, Table B.3, p.359:
 * WINDOWS+M "Minimize All", SHIFT+WINDOWS+M "Undo Minimize All"), then
 * Properties. Windows 98's menu also had Toolbars ▸, Cascade Windows and
 * the two Tile Windows commands, which Classicy leaves out: Quick Launch and
 * window arrangement are out of the plan's scope. Internal: not exported
 * from the package.
 */

/** A window, by its app id and window id. */
export type ClassicyTaskbarWindowRef = {
	readonly appId: string;
	readonly windowId: string;
};

/**
 * What Minimize All Windows did, remembered for its Undo: the windows it
 * minimized and the window that was active.
 */
export type ClassicyTaskbarMinimizedAll = {
	readonly windows: readonly ClassicyTaskbarWindowRef[];
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

/**
 * Whether `minimized` still stands, so the menu offers its Undo: it lists a
 * window, and every window it lists is still open, in an open app, and
 * collapsed. Restoring or closing any of them by other means forgets it.
 * Pure.
 */
export function classicyTaskbarMinimizedAllStands(
	minimized: ClassicyTaskbarMinimizedAll | null,
	apps: Readonly<Record<string, ClassicyStoreSystemApp>>,
): boolean {
	if (!minimized || minimized.windows.length === 0) return false;
	return minimized.windows.every(({ appId, windowId }) => {
		const app = ownApp(apps, appId);
		if (!app?.open) return false;
		const record = getAppWindow(app, windowId);
		return record !== undefined && !record.closed && record.collapsed === true;
	});
}

/** The menu items' ids. */
export const CLASSICY_TASKBAR_MENU_IDS = {
	minimizeAll: "taskbar-minimize-all",
	undoMinimizeAll: "taskbar-undo-minimize-all",
	properties: "taskbar-properties",
} as const;

/**
 * The taskbar's menu, top to bottom: `leading` items and a divider when
 * there are any (the clock's Adjust Date/Time, as Windows 98's clock menu
 * leads with it), then **Undo Minimize All** while `undo` stands, else
 * **Minimize All Windows** (disabled when `canMinimizeAll` is false), a
 * divider, and **Properties**. Pure: the handlers are the caller's.
 */
export function classicyTaskbarMenuItems({
	undo,
	canMinimizeAll,
	onMinimizeAll,
	onUndoMinimizeAll,
	onProperties,
	leading = [],
}: {
	undo: boolean;
	canMinimizeAll: boolean;
	onMinimizeAll: () => void;
	onUndoMinimizeAll: () => void;
	onProperties: () => void;
	leading?: readonly ClassicyMenuItem[];
}): ClassicyMenuItem[] {
	return [
		...(leading.length > 0 ? [...leading, { id: "spacer" }] : []),
		undo
			? {
					id: CLASSICY_TASKBAR_MENU_IDS.undoMinimizeAll,
					title: "Undo Minimize All",
					onClickFunc: onUndoMinimizeAll,
				}
			: {
					id: CLASSICY_TASKBAR_MENU_IDS.minimizeAll,
					title: "Minimize All Windows",
					disabled: !canMinimizeAll,
					onClickFunc: onMinimizeAll,
				},
		{ id: "spacer" },
		{
			id: CLASSICY_TASKBAR_MENU_IDS.properties,
			title: "Properties",
			onClickFunc: onProperties,
		},
	];
}

/**
 * Opens the taskbar's menu at a desktop point (`at`, the click), `leading`
 * items first. One per taskbar mount: it remembers, for as long as the
 * taskbar is mounted, what its Minimize All Windows minimized, and forgets
 * it once any of those windows is restored or closed by other means (a store
 * subscription), or its Undo runs.
 *
 * - **Minimize All Windows** dispatches `ClassicyWindowCollapse` for each of
 *   `classicyTaskbarMinimizeAllTargets`, from the one handler, so React
 *   commits the lot once and the focus passes on once (the active window
 *   goes last), to the desktop when no other window is shown.
 * - **Undo Minimize All** dispatches `ClassicyWindowExpand` for each window
 *   it minimized that is still minimized, then activates the window that
 *   was active (its own `activate` command, which dispatches
 *   `ClassicyWindowFocus`).
 * - **Properties** opens the Control Strip control panel, whose settings
 *   drive the status area.
 *
 * The menu is a Windows pop-up menu: no leading Help item, and it takes the
 * keyboard while open.
 */
export function useClassicyTaskbarMenu(): (
	at: [number, number],
	leading?: readonly ClassicyMenuItem[],
) => void {
	const dispatch = useAppManagerDispatch();
	const overrides = useClassicyAppIdentityOverrides();
	const { showContextMenu } = useClassicyContextualMenu();
	const minimizedRef = useRef<ClassicyTaskbarMinimizedAll | null>(null);

	// Forget the list as soon as it no longer stands.
	useEffect(
		() =>
			useAppManager.subscribe((state) => {
				if (
					minimizedRef.current &&
					!classicyTaskbarMinimizedAllStands(
						minimizedRef.current,
						state.System.Manager.Applications.apps,
					)
				)
					minimizedRef.current = null;
			}),
		[],
	);

	return useCallback(
		(at, leading = []) => {
			const apps = () =>
				useAppManager.getState().System.Manager.Applications.apps;
			// The menu is built on the store as it stands when it opens.
			const undo = classicyTaskbarMinimizedAllStands(
				minimizedRef.current,
				apps(),
			);
			if (!undo) minimizedRef.current = null;
			const tasks = classicyTaskbarTasks(
				getClassicyWindowEntries(),
				apps(),
				overrides,
			);
			const targets = classicyTaskbarMinimizeAllTargets(tasks);

			const onMinimizeAll = () => {
				// Chosen on the store as it stands now, not as the menu saw it.
				const live = classicyTaskbarTasks(
					getClassicyWindowEntries(),
					apps(),
					overrides,
				);
				const active = live.find((t) => t.active);
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
				minimizedRef.current =
					windows.length > 0
						? { windows, active: active ? refOf(active) : undefined }
						: null;
			};
			const onUndoMinimizeAll = () => {
				const minimized = minimizedRef.current;
				minimizedRef.current = null;
				if (!minimized) return;
				for (const { appId, windowId } of minimized.windows) {
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
				if (minimized.active)
					runClassicyWindowCommand(
						minimized.active.appId,
						minimized.active.windowId,
						{ type: "activate" },
					);
			};
			const onProperties = () =>
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

			showContextMenu(
				classicyTaskbarMenuItems({
					undo,
					canMinimizeAll: targets.length > 0,
					onMinimizeAll,
					onUndoMinimizeAll,
					onProperties,
					leading,
				}),
				at,
				{ helpItem: false, keyboard: true },
			);
		},
		[dispatch, overrides, showContextMenu],
	);
}
