import {
	type FC as FunctionalComponent,
	memo,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import {
	isFinderData,
	type FinderData,
} from "@/SystemFolder/Finder/FinderContext";
import { FinderAboutThisComputer } from "@/SystemFolder/Finder/FinderAboutThisComputer";
import { useFinderFolderSize } from "@/SystemFolder/Finder/useFinderFolderSize";
import type { ActionMessage } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";
import {
	useClassicyAboutMenu,
	useClassicyWindowClose,
} from "@/SystemFolder/SystemResources/App/ClassicyAppMenuHooks";
import {
	closeAllWindowsMenuItemHelper,
	closeWindowMenuItemHelper,
} from "@/SystemFolder/SystemResources/App/ClassicyAppUtils";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import { ClassicyFileBrowser } from "@/SystemFolder/SystemResources/File/ClassicyFileBrowser";
import { useClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemContext";
import type { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import type {
	ClassicyFileSystemEntry,
	ClassicyFileSystemEntryMetadata,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

const appIcon = ClassicyIcons.system.mac;

type PathSettingsProps = {
	_viewType: "list" | "icons";
};

type FinderWindowProps = {
	appId: string;
	op: string;
	dir: ClassicyFileSystemEntry;
	idx: number;
	closeFolder: (path: string) => void;
	closeAllFolders: () => void;
	closeWindow: (windowId: string, appCleanupAction: ActionMessage) => void;
	handlePathSettingsChange: (path: string, settings: PathSettingsProps) => void;
	openFolder: (path: string) => void;
	openFile: (path: string) => void;
	pathSettings: Record<string, PathSettingsProps>;
	getHeaderString: (dir: ClassicyFileSystemEntryMetadata) => string;
	fs: ClassicyFileSystem;
	disableBalloonHelp: boolean;
	toggleBalloonHelp: () => void;
	aboutMenuItem: ClassicyMenuItem;
};

const FinderWindow: FunctionalComponent<FinderWindowProps> = ({
	appId,
	op,
	dir,
	idx,
	closeFolder,
	closeAllFolders,
	closeWindow,
	handlePathSettingsChange,
	openFolder,
	openFile,
	pathSettings,
	getHeaderString,
	fs,
	disableBalloonHelp,
	toggleBalloonHelp,
	aboutMenuItem,
}) => {
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
			{
				id: `${appId}_view`,
				title: "View",
				menuChildren: [
					{
						id: `${appId}_${op}_view_as_icons`,
						title: "View as Icons",
						onClickFunc: () =>
							handlePathSettingsChange(op, { _viewType: "icons" }),
					},
					{
						id: `${appId}_${op}_view_as_list`,
						title: "View as List",
						onClickFunc: () =>
							handlePathSettingsChange(op, { _viewType: "list" }),
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
			handlePathSettingsChange,
			disableBalloonHelp,
			toggleBalloonHelp,
			aboutMenuItem,
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
				display={pathSettings[op]?._viewType || "list"}
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

	const [pathSettings, setPathSettings] = useState<
		Record<string, PathSettingsProps>
	>({});

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

	const handlePathSettingsChange = useCallback(
		(path: string, settings: PathSettingsProps) => {
			setPathSettings((prevPathSettings) => ({
				...prevPathSettings,
				[path]: settings,
			}));
		},
		[],
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

	return (
		<ClassicyApp
			id={appId}
			name={appName}
			icon={appIcon}
			noDesktopIcon={true}
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
							handlePathSettingsChange={handlePathSettingsChange}
							openFolder={openFolder}
							openFile={openFile}
							pathSettings={pathSettings}
							getHeaderString={getHeaderString}
							fs={fs}
							disableBalloonHelp={disableBalloonHelp}
							toggleBalloonHelp={toggleBalloonHelp}
							aboutMenuItem={aboutMenuItem}
						/>
					))
				: null}
			{aboutWindow}
			{appState.data?.showAboutThisComputer ? (
				<FinderAboutThisComputer />
			) : null}
		</ClassicyApp>
	);
};
