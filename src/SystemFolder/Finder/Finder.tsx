import {
	type FC as FunctionalComponent,
	memo,
	useCallback,
	useEffect,
	useMemo,
	useRef,
} from "react";
import { useClassicyAsset } from "@/Appearance/ClassicyAssetRegistry";
import type { ActionMessage } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { getAppWindow } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppWindows";
import { toLocalDate } from "@/SystemFolder/ControlPanels/DateAndTimeManager/ClassicyDateAndTimeManagerUtils";
import {
	buildDriveContextMenu,
	isDriveSyncConnected,
} from "@/SystemFolder/ControlPanels/DriveSetup/ClassicyDriveSetupUtils";
import { FinderAboutThisComputer } from "@/SystemFolder/Finder/FinderAboutThisComputer";
import {
	type FinderData,
	type FinderIconViewOptions,
	type FinderListViewOptions,
	isFinderData,
	resolveStandardViews,
} from "@/SystemFolder/Finder/FinderContext";
import { FinderPreferences } from "@/SystemFolder/Finder/FinderPreferences";
import { useFinderFolderSize } from "@/SystemFolder/Finder/useFinderFolderSize";
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";
import {
	useClassicyAboutMenu,
	useClassicyWindowClose,
} from "@/SystemFolder/SystemResources/App/ClassicyAppMenuHooks";
import {
	closeAllWindowsMenuItemHelper,
	closeWindowMenuItemHelper,
} from "@/SystemFolder/SystemResources/App/ClassicyAppUtils";
import { classicySpecialMenuItems } from "@/SystemFolder/SystemResources/Desktop/ClassicySpecialMenu";
import {
	ClassicyFileBrowser,
	type ClassicyFileBrowserCommands,
} from "@/SystemFolder/SystemResources/File/ClassicyFileBrowser";
import type { ClassicyFileBrowserMoveItems } from "@/SystemFolder/SystemResources/File/ClassicyFileBrowserViewIcons";
import {
	CLASSICY_DESKTOP_ITEM_ICON_PREFIX,
	classicyDesktopDropLocation,
	classicyDesktopFolderPath,
	classicyDesktopItemIconAction,
	moveClassicyFileSystemItems,
	moveClassicyItemsToTrash,
	restoreClassicyTrashItems,
} from "@/SystemFolder/SystemResources/File/ClassicyFileMove";
import type { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { useClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemContext";
import type {
	ClassicyFileSystemEntry,
	ClassicyFileSystemEntryMetadata,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import {
	CLASSICY_TRASH_PATH,
	ensureClassicyTrash,
	isClassicyTrashItem,
	isInClassicyTrash,
	listClassicyTrashItems,
} from "@/SystemFolder/SystemResources/File/ClassicyTrash";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import type { ClassicyTableSelectionApi } from "@/SystemFolder/SystemResources/Table/ClassicyTable";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

type FinderWindowProps = {
	appId: string;
	op: string;
	dir: ClassicyFileSystemEntry;
	idx: number;
	closeFolder: (path: string) => void;
	closeAllFolders: () => void;
	closeWindow: (windowId: string, appCleanupAction: ActionMessage) => void;
	setFolderView: (path: string, viewType: "icons" | "list") => void;
	openFolder: (path: string) => void;
	openFile: (path: string) => void;
	getHeaderString: (dir: ClassicyFileSystemEntryMetadata) => string;
	fs: ClassicyFileSystem;
	disableBalloonHelp: boolean;
	toggleBalloonHelp: () => void;
	aboutMenuItem: ClassicyMenuItem;
	openPreferences: () => void;
	viewType: "icons" | "list";
	iconViewOptions: FinderIconViewOptions;
	listViewOptions: FinderListViewOptions;
	now: Date;
	onMoveItems: ClassicyFileBrowserMoveItems;
	trashItems: (paths: string[]) => void;
	restoreItems: (paths: string[]) => void;
	itemContextMenu: (
		path: string,
		selectedPaths: string[],
	) => ClassicyMenuItem[] | undefined;
};

const FinderWindow: FunctionalComponent<FinderWindowProps> = ({
	appId,
	op,
	dir,
	idx,
	closeFolder,
	closeAllFolders,
	closeWindow,
	setFolderView,
	openFolder,
	openFile,
	getHeaderString,
	fs,
	disableBalloonHelp,
	toggleBalloonHelp,
	aboutMenuItem,
	openPreferences,
	viewType,
	iconViewOptions,
	listViewOptions,
	now,
	onMoveItems,
	trashItems,
	restoreItems,
	itemContextMenu,
}) => {
	const desktopEventDispatch = useAppManagerDispatch();
	// The browser's selection, for File ▸ Move To Trash and Restore.
	const commandsRef = useRef<ClassicyFileBrowserCommands | null>(null);
	const inTrash = isInClassicyTrash(fs, op);
	// One handle per open folder window: a single shared ref would make every
	// window's Select All drive whichever table mounted last.
	const selectionApiRef = useRef<ClassicyTableSelectionApi | null>(null);
	// #270: likewise one keyboard target per window — the list view's list
	// box (null in icon view). The window focuses it whenever it becomes the
	// focused window, so arrows/Return work without clicking the list first.
	const focusTargetRef = useRef<HTMLDivElement | null>(null);
	const windowFocused = useAppManager(
		(state) =>
			!!getAppWindow(state.System.Manager.Applications.apps[appId], op)
				?.focused,
	);

	// Switching View as Icons/List swaps the browser's content but is no
	// window-focus transition, so ClassicyWindow won't refocus on its own.
	// Hand the freshly mounted list box focus when this window is the focused
	// one and focus isn't already on something else inside it.
	const prevViewTypeRef = useRef(viewType);
	useEffect(() => {
		if (prevViewTypeRef.current === viewType) return;
		prevViewTypeRef.current = viewType;
		if (!windowFocused) return;
		const target = focusTargetRef.current;
		if (!target) return;
		const active = document.activeElement;
		if (active && target.closest(".classicyWindow")?.contains(active)) return;
		target.focus({ preventScroll: true });
	}, [viewType, windowFocused]);

	const appMenu = useMemo(
		() => [
			{
				id: `${appId}_${op}_file`,
				title: "File",
				menuChildren: [
					closeWindowMenuItemHelper(`${appId}_${op}_file_closew`, () =>
						closeWindow(op, { type: "ClassicyAppFinderCloseFolder", path: op }),
					),
					closeAllWindowsMenuItemHelper(
						`${appId}_${op}_file_closews`,
						closeAllFolders,
					),
					{ id: "spacer" },
					{
						id: `${appId}_${op}_file_move_to_trash`,
						title: "Move To Trash",
						keyboardShortcut: "⌃⌫",
						disabled: inTrash,
						onClickFunc: () =>
							trashItems(commandsRef.current?.selectedPaths() ?? []),
					},
					...(op === CLASSICY_TRASH_PATH
						? [
								{
									id: `${appId}_${op}_file_restore`,
									title: "Restore",
									onClickFunc: () =>
										restoreItems(commandsRef.current?.selectedPaths() ?? []),
								},
							]
						: []),
				],
			},
			// Built inline rather than from useClassicyEditMenu: that hook's Select
			// All calls classicyEditCommands.selectAll, which acts on the focused
			// text field — correct for SimpleText, wrong for a file browser. Do
			// not consolidate the two.
			{
				id: `${appId}_${op}_edit`,
				title: "Edit",
				menuChildren: [
					{
						id: `${appId}_${op}_edit_select_all`,
						title: "Select All",
						keyboardShortcut: "⌘A",
						// Icons-view selection is a separate slice; until it exists the
						// command has nothing to act on there.
						disabled: viewType !== "list",
						onClickFunc: () => selectionApiRef.current?.selectAll(),
					},
					{ id: "spacer" },
					{
						id: `${appId}_${op}_edit_preferences`,
						title: "Preferences…",
						onClickFunc: openPreferences,
					},
				],
			},
			{
				id: `${appId}_view`,
				title: "View",
				menuChildren: [
					{
						id: `${appId}_${op}_view_as_icons`,
						title: "View as Icons",
						onClickFunc: () => setFolderView(op, "icons"),
					},
					{
						id: `${appId}_${op}_view_as_list`,
						title: "View as List",
						onClickFunc: () => setFolderView(op, "list"),
					},
				],
			},
			{
				id: `${appId}_${op}_special`,
				title: "Special",
				menuChildren: classicySpecialMenuItems(
					desktopEventDispatch,
					`${appId}_${op}`,
				),
			},
			{
				id: `${appId}_${op}_help`,
				title: "Help",
				menuChildren: [
					{
						id: `${appId}_${op}_help_balloon`,
						title: disableBalloonHelp
							? "Show Balloon Help"
							: "Hide Balloon Help",
						onClickFunc: toggleBalloonHelp,
					},
					aboutMenuItem,
				],
			},
		],
		[
			appId,
			op,
			closeWindow,
			closeAllFolders,
			setFolderView,
			disableBalloonHelp,
			toggleBalloonHelp,
			aboutMenuItem,
			openPreferences,
			viewType,
			inTrash,
			trashItems,
			restoreItems,
			desktopEventDispatch,
		],
	);

	return (
		<ClassicyWindow
			id={op}
			title={dir._name}
			icon={dir._icon}
			appId={appId}
			defaultWindow={false}
			hidden={false}
			initialSize={[425, 300]}
			initialPosition={[50 + idx * 50, 50 + idx * 50]}
			header={<span>{getHeaderString(dir)}</span>}
			onCloseFunc={closeFolder}
			appMenu={appMenu}
			initialFocusRef={focusTargetRef}
		>
			<ClassicyFileBrowser
				appId={appId}
				fs={fs}
				path={op}
				dirOnClickFunc={openFolder}
				fileOnClickFunc={openFile}
				display={viewType}
				iconViewOptions={iconViewOptions}
				listViewOptions={listViewOptions}
				now={now}
				selectionApiRef={selectionApiRef}
				focusTargetRef={focusTargetRef}
				onMoveItems={onMoveItems}
				// Invisible items (the Desktop Folder) stay out of Finder windows,
				// as in Mac OS 8; the header counts them as hidden.
				showInvisible={false}
				onDeleteItems={inTrash ? undefined : trashItems}
				itemContextMenu={itemContextMenu}
				commandsRef={commandsRef}
			/>
		</ClassicyWindow>
	);
};

const FinderWindowMemo = memo(FinderWindow);

type FinderFolderWindowProps = Omit<FinderWindowProps, "dir" | "op"> & {
	path: string;
};

const FinderFolderWindow: FunctionalComponent<FinderFolderWindowProps> = ({
	path,
	fs,
	...rest
}) => {
	const size = useFinderFolderSize(path, fs);
	const shell = fs.statDirShell(path);
	if (!shell) return null;

	return (
		<FinderWindowMemo
			{...rest}
			fs={fs}
			op={path}
			dir={{ ...shell, _size: size }}
		/>
	);
};

const FinderFolderWindowMemo = memo(FinderFolderWindow);

export const Finder = () => {
	const appIcon = useClassicyAsset("icons", "system.mac") ?? "";
	const appName: string = "Finder";
	const appId: string = "Finder.app";
	const desktopEventDispatch = useAppManagerDispatch();
	const appState = useAppManager(
		(state) => state.System.Manager.Applications.apps[appId],
	);
	const finderData: FinderData = isFinderData(appState?.data ?? {})
		? (appState?.data as FinderData)
		: {};
	const disableBalloonHelp = useAppManager(
		(state) => state.System.Manager.Desktop.disableBalloonHelp,
	);
	const toggleBalloonHelp = useCallback(() => {
		desktopEventDispatch({
			type: "ClassicyDesktopSetBalloonHelp",
			disableBalloonHelp: !disableBalloonHelp,
		});
	}, [desktopEventDispatch, disableBalloonHelp]);

	const dateAndTime = useAppManager((s) => s.System.Manager.DateAndTime);
	// Memoized on the primitive fields, not the DateAndTime object's identity —
	// a fresh Date or a new object every render would invalidate the memos the
	// icon/list views depend on for `now`.
	const now = useMemo(
		() =>
			toLocalDate(
				dateAndTime.dateTime,
				parseInt(dateAndTime.timeZoneOffset, 10),
			),
		[dateAndTime.dateTime, dateAndTime.timeZoneOffset],
	);

	const fs = useClassicyFileSystem();
	const closeWindow = useClassicyWindowClose(appId);
	const { aboutMenuItem, aboutWindow } = useClassicyAboutMenu(
		appId,
		appName,
		appIcon,
	);

	const prevOpenPathsRef = useRef<string[] | null>(null);
	useEffect(() => {
		const raw = appState.data ?? {};
		const appData: FinderData = isFinderData(raw) ? raw : {};
		if (!appData.openPaths) {
			return;
		}
		const openPaths: string[] = appData.openPaths;
		const prev = prevOpenPathsRef.current;
		if (
			prev &&
			prev.length === openPaths.length &&
			prev.every((p, i) => p === openPaths[i])
		) {
			return;
		}
		prevOpenPathsRef.current = openPaths;
		desktopEventDispatch({
			type: "ClassicyAppFinderOpenFolders",
			paths: openPaths,
		});
	}, [desktopEventDispatch, appState.data]);

	const setFolderView = useCallback(
		(path: string, viewType: "icons" | "list") => {
			desktopEventDispatch({
				type: "ClassicyAppFinderSetFolderView",
				path,
				viewType,
			});
		},
		[desktopEventDispatch],
	);

	// Depend on the window collection, not the whole app record, so the
	// callback (passed to every folder window) is stable across data changes.
	const finderWindows = appState.windows;
	const openFolder = useCallback(
		(path: string) => {
			desktopEventDispatch({
				type: "ClassicyAppFinderOpenFolder",
				path,
			});

			const ws = getAppWindow({ windows: finderWindows }, path);
			if (ws) {
				desktopEventDispatch({
					type: "ClassicyWindowOpen",
					app: {
						id: appId,
					},
					window: ws,
				});
				desktopEventDispatch({
					type: "ClassicyWindowFocus",
					app: {
						id: appId,
					},
					window: ws,
				});
			}
		},
		[desktopEventDispatch, finderWindows],
	);

	const openFile = useCallback(
		(path: string) => {
			const file = fs.resolve(path);
			desktopEventDispatch({
				type: "ClassicyAppFinderOpenFile",
				file,
				path,
			});
		},
		[fs, desktopEventDispatch],
	);

	const closeFolder = useCallback(
		(path: string) => {
			desktopEventDispatch({
				type: "ClassicyAppFinderCloseFolder",
				path,
			});
		},
		[desktopEventDispatch],
	);

	const closeAllFolders = useCallback(() => {
		const paths: string[] = finderData.openPaths ?? [];
		paths.forEach((path) => {
			closeWindow(path, { type: "ClassicyAppFinderCloseFolder", path });
		});
	}, [closeWindow, finderData.openPaths]);

	const openPreferences = useCallback(() => {
		desktopEventDispatch({ type: "ClassicyAppFinderPreferencesOpen" });
	}, [desktopEventDispatch]);

	// The drives (name and icon), so the icons below follow drives being added
	// or removed — not every change to the tree, which hands out a new `fs`.
	const drivesKey = JSON.stringify(
		Object.entries(fs.filterByType("", "drive")).map(([path, metadata]) => [
			path,
			metadata._icon,
		]),
	);

	useEffect(() => {
		const drives = JSON.parse(drivesKey) as [string, string | undefined][];
		const addedDriveNames: string[] = [];

		drives.forEach(([path, driveIcon]) => {
			const alreadyExists = useAppManager
				.getState()
				.System.Manager.Desktop.icons.some(
					(i) => i.appId === appId && i.appName === path,
				);
			if (!alreadyExists) {
				addedDriveNames.push(path);
			}
			desktopEventDispatch({
				type: "ClassicyDesktopIconAdd",
				app: {
					id: appId,
					name: path,
					icon: driveIcon,
				},
				event: "ClassicyAppFinderOpenFolder",
				eventData: { path },
				kind: "drive",
				// Marks the drive icon as a drop target for Finder drags.
				filePath: path,
				contextMenu: buildDriveContextMenu(path, isDriveSyncConnected()),
			});
		});

		return () => {
			addedDriveNames.forEach((name) => {
				desktopEventDispatch({
					type: "ClassicyDesktopIconRemove",
					app: { id: appId, name },
				});
			});
		};
	}, [drivesKey, desktopEventDispatch]);

	// Finder drags: move dragged items into a folder, a drive or the desktop
	// (its Desktop Folder), with icons dropped on the desktop placed where
	// their outline was let go.
	const onMoveItems = useCallback<ClassicyFileBrowserMoveItems>(
		(paths, destination, outlineTopLeft) => {
			moveClassicyFileSystemItems(
				fs,
				paths,
				destination,
				desktopEventDispatch,
				{
					desktopLocation: classicyDesktopDropLocation(outlineTopLeft),
				},
			);
		},
		[fs, desktopEventDispatch],
	);

	// The Trash: a folder at the root of the tree, opened by the desktop's
	// Trash icon — which shows full while anything is in it.
	useEffect(() => {
		ensureClassicyTrash(fs);
	}, [fs]);
	const trashFull = listClassicyTrashItems(fs).length > 0;
	const trashFullIcon = useClassicyAsset("systemArt", "trashFull") ?? "";
	const trashEmptyIcon = useClassicyAsset("systemArt", "trashEmpty") ?? "";
	useEffect(() => {
		desktopEventDispatch({
			type: "ClassicyDesktopIconAdd",
			app: {
				id: "Trash",
				name: "Trash",
				icon: trashFull ? trashFullIcon : trashEmptyIcon,
			},
			kind: "trash",
			filePath: CLASSICY_TRASH_PATH,
			noLaunch: true,
			event: "ClassicyAppFinderOpenFolder",
			eventData: { path: CLASSICY_TRASH_PATH },
			contextMenu: [
				{
					id: "finder_trash_open",
					title: "Open",
					onClickFunc: () =>
						desktopEventDispatch({
							type: "ClassicyAppFinderOpenFolder",
							path: CLASSICY_TRASH_PATH,
						}),
				},
				{
					id: "finder_trash_empty",
					title: "Empty Trash\u2026",
					onClickFunc: () =>
						desktopEventDispatch({
							type: "ClassicyDesktopShowSystemDialog",
							dialog: "emptyTrash",
						}),
				},
			],
		});
	}, [trashFull, trashFullIcon, trashEmptyIcon, desktopEventDispatch]);

	const trashItems = useCallback(
		(paths: string[]) => {
			// A list's remembered selection can name items moved away since.
			const present = paths.filter((path) => fs.resolve(path));
			if (present.length > 0) {
				moveClassicyItemsToTrash(fs, present, desktopEventDispatch);
			}
		},
		[fs, desktopEventDispatch],
	);
	const restoreItems = useCallback(
		(paths: string[]) => {
			const items = paths.filter((path) => isClassicyTrashItem(fs, path));
			if (items.length > 0) {
				restoreClassicyTrashItems(fs, items, desktopEventDispatch);
			}
		},
		[fs, desktopEventDispatch],
	);
	// Right-click on an item: Restore in the Trash, Move To Trash elsewhere —
	// acting on the whole selection when the item is part of it.
	const itemContextMenu = useCallback(
		(path: string, selectedPaths: string[]): ClassicyMenuItem[] | undefined => {
			const targets = selectedPaths.includes(path) ? selectedPaths : [path];
			if (isClassicyTrashItem(fs, path)) {
				return [
					{
						id: "finder_item_restore",
						title: "Restore",
						onClickFunc: () => restoreItems(targets),
					},
				];
			}
			if (isInClassicyTrash(fs, path)) return undefined;
			return [
				{
					id: "finder_item_move_to_trash",
					title: "Move To Trash",
					onClickFunc: () => trashItems(targets),
				},
			];
		},
		[fs, restoreItems, trashItems],
	);

	// Mirror the Desktop Folder onto the desktop: an icon for each item in it,
	// none for items that have left it. Runs again whenever the tree changes
	// (`fs` is handed out afresh on every change), so icons follow items
	// dragged in or out.
	useEffect(() => {
		const folder = classicyDesktopFolderPath(fs);
		const items = folder ? fs.filterByType(folder, undefined, false) : {};
		const paths = new Set(
			Object.keys(items).map((name) => `${folder}${fs.separator}${name}`),
		);
		for (const path of paths) {
			const action = classicyDesktopItemIconAction(fs, path);
			if (action) desktopEventDispatch(action);
		}
		for (const icon of useAppManager.getState().System.Manager.Desktop.icons) {
			if (
				icon.appId.startsWith(CLASSICY_DESKTOP_ITEM_ICON_PREFIX) &&
				!paths.has(icon.appId.slice(CLASSICY_DESKTOP_ITEM_ICON_PREFIX.length))
			) {
				desktopEventDispatch({
					type: "ClassicyDesktopIconRemove",
					app: { id: icon.appId },
				});
			}
		}
	}, [fs, desktopEventDispatch]);

	const getHeaderString = useCallback(
		(dir: ClassicyFileSystemEntryMetadata) => {
			const sizeText =
				dir._size === undefined
					? "Calculating…"
					: dir._size === -1
						? "—"
						: fs.formatSize(dir._size);
			return (
				dir._count +
				" items" +
				(dir._countHidden ? ` (${dir._countHidden} hidden)` : "") +
				", " +
				sizeText
			);
		},
		[fs],
	);

	const standardViews = useMemo(
		() => resolveStandardViews(finderData),
		[finderData],
	);

	return (
		<ClassicyApp
			id={appId}
			name={appName}
			icon={appIcon}
			showDesktopIcon={false}
			showInApplicationsFolder={false}
			// The desktop is Finder's own surface: clicking it, or an icon on it,
			// leaves Finder focused with no window active — don't raise one.
			restoreWindowFocus={false}
			defaultWindow={
				finderData.openPaths?.length
					? finderData.openPaths.at(0)
					: "Macintosh HD"
			}
		>
			{finderData.openPaths && finderData.openPaths.length > 0
				? finderData.openPaths.map((p: string, idx: number) => (
						<FinderFolderWindowMemo
							key={`${appName}_${p}`}
							path={p}
							appId={appId}
							idx={idx}
							closeFolder={closeFolder}
							closeAllFolders={closeAllFolders}
							closeWindow={closeWindow}
							setFolderView={setFolderView}
							openFolder={openFolder}
							openFile={openFile}
							getHeaderString={getHeaderString}
							fs={fs}
							disableBalloonHelp={disableBalloonHelp}
							toggleBalloonHelp={toggleBalloonHelp}
							aboutMenuItem={aboutMenuItem}
							openPreferences={openPreferences}
							// A path absent from folderViews follows the standard views'
							// appearance but still opens in list — the standard-view
							// options configure how each view looks, not which view a
							// new window opens in. A default-view-type preference is an
							// explicit non-goal of this design.
							viewType={finderData.folderViews?.[p] ?? "list"}
							iconViewOptions={standardViews.icons}
							listViewOptions={standardViews.list}
							now={now}
							onMoveItems={onMoveItems}
							trashItems={trashItems}
							restoreItems={restoreItems}
							itemContextMenu={itemContextMenu}
						/>
					))
				: null}
			{aboutWindow}
			{appState.data?.showAboutThisComputer ? (
				<FinderAboutThisComputer />
			) : null}
			{finderData.showPreferences ? <FinderPreferences /> : null}
		</ClassicyApp>
	);
};
