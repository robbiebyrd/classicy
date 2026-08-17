import {
	type FC as FunctionalComponent,
	memo,
	useCallback,
	useEffect,
	useMemo,
	useRef,
} from "react";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import type { ActionMessage } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
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
import { ClassicyFileBrowser } from "@/SystemFolder/SystemResources/File/ClassicyFileBrowser";
import type { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { useClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemContext";
import type {
	ClassicyFileSystemEntry,
	ClassicyFileSystemEntryMetadata,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import type { ClassicyTableSelectionApi } from "@/SystemFolder/SystemResources/Table/ClassicyTable";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

const appIcon = ClassicyIcons.system.mac;

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
}) => {
	// One handle per open folder window: a single shared ref would make every
	// window's Select All drive whichever table mounted last.
	const selectionApiRef = useRef<ClassicyTableSelectionApi | null>(null);

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

	const openFolder = useCallback(
		(path: string) => {
			desktopEventDispatch({
				type: "ClassicyAppFinderOpenFolder",
				path,
			});

			const windowIndex = appState.windows.findIndex((w) => w.id === path);
			const ws = appState.windows[windowIndex];
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
		[desktopEventDispatch, appState.windows],
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

	useEffect(() => {
		const drives = fs.filterByType("", "drive");
		const addedDriveNames: string[] = [];

		Object.entries(drives).forEach(([path, metadata]) => {
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
					icon: metadata._icon,
				},
				event: "ClassicyAppFinderOpenFolder",
				eventData: { path },
				kind: "drive",
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
