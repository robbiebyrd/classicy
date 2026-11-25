import {
	type FC as FunctionalComponent,
	type MouseEvent,
	type ReactNode,
	useMemo,
	useRef,
} from "react";
import {
	classicyAppIdentityFrom,
	useClassicyAppIdentityOverrides,
} from "@/Appearance/ClassicyAppIdentity";
import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { useClassicyMountedApps } from "@/SystemFolder/SystemResources/App/ClassicyMountedApps";
import {
	type ClassicyQuickLaunchApp,
	useClassicyQuickLaunchApps,
} from "@/SystemFolder/SystemResources/App/ClassicyQuickLaunchApps.internal";
import { useClassicyBalloonHelp } from "@/SystemFolder/SystemResources/BalloonHelp/useClassicyBalloonHelp";
import { classicyStartupDisk } from "@/SystemFolder/SystemResources/File/ClassicyFileMove";
import { useClassicyFileSystemAccessor } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemContext";
import { ClassicyIconImage } from "@/SystemFolder/SystemResources/Icon/ClassicyIconImage.internal";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import { openClassicyFolderWindow } from "@/SystemFolder/SystemResources/Taskbar/ClassicyRunCommand.internal";
import type { ClassicyShowTaskbarMenu } from "@/SystemFolder/SystemResources/Taskbar/ClassicyTaskbarMenu.internal";
import { CLASSICY_TASKBAR_TOOLTIP_DELAY_MS } from "@/SystemFolder/SystemResources/Taskbar/ClassicyTaskbarTasks.internal";

/**
 * The taskbar's Quick Launch toolbar (plan 0020-w98 E1): the band Windows 98
 * puts after the Start button (Internet Explorer 4's desktop update, shipped
 * with Windows 98; Toolbars ▸ Quick Launch in the taskbar's menu), its small
 * icons flat toolbar buttons, each with its name as a tooltip. Internal: not
 * exported from the package.
 */

/** The Finder's app id, Quick Launch's file browser launcher. */
export const CLASSICY_QUICK_LAUNCH_FINDER_APP_ID = "Finder.app";

/** Show Desktop's name and tooltip (Windows 98's `Show Desktop.scf`). */
export const CLASSICY_QUICK_LAUNCH_SHOW_DESKTOP_LABEL = "Show Desktop";

/** The id of the Open item a Quick Launch button's menu leads with. */
export const CLASSICY_QUICK_LAUNCH_OPEN_ITEM_ID = "taskbar-quick-launch-open";

/** One Quick Launch button. */
export type ClassicyQuickLaunchItem = {
	/** The button's key. */
	readonly key: string;
	/** Its name: the tooltip and the accessible name. */
	readonly label: string;
	/** Its icon (an app's), or none for Show Desktop, whose glyph the package draws. */
	readonly icon?: string;
	/** What a click runs. */
	readonly launch: () => void;
};

/**
 * Quick Launch's buttons in Windows 98's order: the file browser first (the
 * Finder, standing for Windows 98's Internet Explorer launcher, its
 * Explorer), then Show Desktop, then each app the host marks
 * (`showInQuickLaunch`) in the order they were marked, as Windows 98 SE's
 * Quick Launch held Launch Internet Explorer Browser, Launch Outlook
 * Express, Show Desktop and View Channels, and appended the user's own. The
 * Finder's button shows only while the Finder is mounted, and an app the host
 * marks twice, or the Finder marked, has one button. Pure.
 */
export function classicyQuickLaunchItems({
	finder,
	apps,
	onFinder,
	onShowDesktop,
	onApp,
}: {
	/** The Finder's display name and icon, when it is mounted. */
	finder?: { label: string; icon: string };
	/** The marked apps, with their display names and icons. */
	apps: readonly (ClassicyQuickLaunchApp & { label: string; shown: string })[];
	onFinder: () => void;
	onShowDesktop: () => void;
	onApp: (app: ClassicyQuickLaunchApp) => void;
}): ClassicyQuickLaunchItem[] {
	const items: ClassicyQuickLaunchItem[] = [];
	if (finder)
		items.push({
			key: CLASSICY_QUICK_LAUNCH_FINDER_APP_ID,
			label: finder.label,
			icon: finder.icon,
			launch: onFinder,
		});
	items.push({
		key: "show-desktop",
		label: CLASSICY_QUICK_LAUNCH_SHOW_DESKTOP_LABEL,
		launch: onShowDesktop,
	});
	const seen = new Set(finder ? [CLASSICY_QUICK_LAUNCH_FINDER_APP_ID] : []);
	for (const app of apps) {
		if (seen.has(app.id)) continue;
		seen.add(app.id);
		items.push({
			key: app.id,
			label: app.label,
			icon: app.shown,
			launch: () => onApp(app),
		});
	}
	return items;
}

const ClassicyQuickLaunchButton: FunctionalComponent<{
	item: ClassicyQuickLaunchItem;
	showTaskbarMenu: ClassicyShowTaskbarMenu;
}> = ({ item, showTaskbarMenu }) => {
	const buttonRef = useRef<HTMLButtonElement>(null);
	// The toolbar's tooltip, its name, after Windows' initial ToolTip delay,
	// whatever Balloon Help says.
	const { handlers, balloon } = useClassicyBalloonHelp(
		buttonRef,
		{ content: item.label, delay: CLASSICY_TASKBAR_TOOLTIP_DELAY_MS },
		{ force: true },
	);
	// A press leaves the focus where it is, as a task button's does; a
	// toolbar button runs its command at the release (the click).
	const onMouseDown = (e: MouseEvent<HTMLButtonElement>) => {
		if (e.button === 0) e.preventDefault();
		handlers.onMouseLeave();
	};
	// Button 2: the taskbar's menu (the band site's: Toolbars ▸ first), led by
	// the button's Open, its default item.
	const onContextMenu = (e: MouseEvent<HTMLButtonElement>) => {
		e.preventDefault();
		handlers.onMouseLeave();
		const open: ClassicyMenuItem = {
			id: CLASSICY_QUICK_LAUNCH_OPEN_ITEM_ID,
			title: "Open",
			isDefault: true,
			onClickFunc: item.launch,
		};
		showTaskbarMenu([e.clientX, e.clientY], [open], { toolbars: true });
	};
	let glyph: ReactNode;
	if (item.icon === undefined)
		glyph = (
			<span className="classicyTaskbarShowDesktopIcon" aria-hidden="true" />
		);
	else
		glyph = (
			<ClassicyIconImage
				className="classicyTaskbarQuickLaunchIcon"
				src={item.icon}
				alt=""
				draggable={false}
			/>
		);
	return (
		<li>
			<button
				ref={buttonRef}
				type="button"
				className="classicyTaskbarQuickLaunchButton"
				aria-label={item.label}
				aria-describedby={handlers["aria-describedby"]}
				onMouseDown={onMouseDown}
				onMouseEnter={handlers.onMouseEnter}
				onMouseLeave={handlers.onMouseLeave}
				onClick={item.launch}
				onContextMenu={onContextMenu}
			>
				{glyph}
			</button>
			{balloon}
		</li>
	);
};

/**
 * The Quick Launch toolbar (`.classicyTaskbarQuickLaunch`,
 * `data-classicy-part="taskbar-quick-launch"`): a band's gripper
 * (`classicyTaskbarGripper`), then a `classicyTaskbarQuickLaunchButton` for
 * each of `classicyQuickLaunchItems`.
 *
 * - The Finder's opens a Finder window on the startup disk, or brings the
 *   one open forward (restoring it when minimized), as Windows 98's
 *   launcher opened a browser window.
 * - Show Desktop runs `toggleDesktop`: Minimize All Windows while a window
 *   is shown, else its Undo, as Windows 98's ToggleDesktop.
 * - An app's opens it (`ClassicyAppOpen`, with its internal identity), as
 *   Start ▸ Programs does.
 *
 * Each draws its icon (Show Desktop an empty `classicyTaskbarShowDesktopIcon`
 * the package draws), its display name its tooltip and accessible name.
 * Button 2 on a button opens the taskbar's menu led by its Open.
 */
export const ClassicyTaskbarQuickLaunch: FunctionalComponent<{
	showTaskbarMenu: ClassicyShowTaskbarMenu;
	toggleDesktop: () => void;
}> = ({ showTaskbarMenu, toggleDesktop }) => {
	const dispatch = useAppManagerDispatch();
	const overrides = useClassicyAppIdentityOverrides();
	const mounted = useClassicyMountedApps();
	const marked = useClassicyQuickLaunchApps();
	const finderRecord = useAppManager((s) =>
		Object.hasOwn(
			s.System.Manager.Applications.apps,
			CLASSICY_QUICK_LAUNCH_FINDER_APP_ID,
		)
			? s.System.Manager.Applications.apps[CLASSICY_QUICK_LAUNCH_FINDER_APP_ID]
			: undefined,
	);
	const getFileSystem = useClassicyFileSystemAccessor();

	const items = useMemo(() => {
		const finderIdentity =
			mounted.has(CLASSICY_QUICK_LAUNCH_FINDER_APP_ID) && finderRecord
				? classicyAppIdentityFrom(
						overrides,
						CLASSICY_QUICK_LAUNCH_FINDER_APP_ID,
						{ name: finderRecord.name, icon: finderRecord.icon },
					)
				: undefined;
		const openFinder = () => {
			const disk = classicyStartupDisk(getFileSystem());
			// An open window on the disk comes forward; else the Finder opens
			// one (its folder windows open from `openPaths`).
			if (disk) openClassicyFolderWindow(disk, dispatch);
		};
		return classicyQuickLaunchItems({
			finder: finderIdentity
				? { label: finderIdentity.name, icon: finderIdentity.icon }
				: undefined,
			apps: marked
				.filter((app) => mounted.has(app.id))
				.map((app) => {
					const identity = classicyAppIdentityFrom(overrides, app.id, {
						name: app.name,
						icon: app.icon,
					});
					return { ...app, label: identity.name, shown: identity.icon };
				}),
			onFinder: openFinder,
			onShowDesktop: toggleDesktop,
			onApp: (app) =>
				dispatch({
					type: "ClassicyAppOpen",
					app: { id: app.id, name: app.name, icon: app.icon },
				}),
		});
	}, [
		dispatch,
		finderRecord,
		getFileSystem,
		marked,
		mounted,
		overrides,
		toggleDesktop,
	]);

	return (
		<div
			className="classicyTaskbarQuickLaunch"
			data-classicy-part="taskbar-quick-launch"
			role="toolbar"
			aria-label="Quick Launch"
		>
			<span className="classicyTaskbarGripper" aria-hidden="true" />
			<ul className="classicyTaskbarQuickLaunchButtons">
				{items.map((item) => (
					<ClassicyQuickLaunchButton
						key={item.key}
						item={item}
						showTaskbarMenu={showTaskbarMenu}
					/>
				))}
			</ul>
		</div>
	);
};
