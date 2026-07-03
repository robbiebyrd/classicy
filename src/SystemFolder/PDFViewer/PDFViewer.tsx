import { type FC as FunctionalComponent, useCallback, useMemo } from "react";
import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { PDFViewerDocument } from "@/SystemFolder/PDFViewer/PDFViewerDocument";
import { PDFViewerAppInfo } from "@/SystemFolder/PDFViewer/PDFViewerUtils";
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";
import {
	useClassicyAboutMenu,
	useClassicyWindowClose,
} from "@/SystemFolder/SystemResources/App/ClassicyAppMenuHooks";
import {
	closeAllWindowsMenuItemHelper,
	closeWindowMenuItemHelper,
	quitMenuItemHelper,
} from "@/SystemFolder/SystemResources/App/ClassicyAppUtils";
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { resolveFileSystemEntrySource } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemContentResolver";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

const { name: appName, id: appId, icon: appIcon } = PDFViewerAppInfo;

export const PDFViewer: FunctionalComponent = () => {
	const desktopEventDispatch = useAppManagerDispatch();
	const appState = useAppManager(
		(state) => state.System.Manager.Applications.apps[appId],
	);

	const fs = useMemo(() => new ClassicyFileSystem(), []);

	const rawOpenFiles = appState?.data?.openFiles;
	const openFiles: string[] = Array.isArray(rawOpenFiles) ? rawOpenFiles : [];

	const closeFile = useCallback(
		(path: string) => {
			desktopEventDispatch({
				type: `ClassicyApp${appName}CloseFile`,
				app: { id: appId },
				path,
			});
		},
		[desktopEventDispatch],
	);

	const closeWindow = useClassicyWindowClose(appId);
	const { aboutMenuItem, aboutWindow } = useClassicyAboutMenu(
		appId,
		appName,
		appIcon,
	);

	const buildAppMenu = useCallback(
		(windowId: string, path: string) => [
			{
				id: `${windowId}_file`,
				title: "File",
				menuChildren: [
					closeWindowMenuItemHelper(`${windowId}_close_window`, () =>
						closeWindow(windowId, {
							type: `ClassicyApp${appName}CloseFile`,
							app: { id: appId },
							path,
						}),
					),
					closeAllWindowsMenuItemHelper(`${appId}_close_all_windows`, () => {
						openFiles.forEach((p) =>
							closeWindow(`${appId}_file_${p}`, {
								type: `ClassicyApp${appName}CloseFile`,
								app: { id: appId },
								path: p,
							}),
						);
					}),
					quitMenuItemHelper(appId, appName, appIcon),
				],
			},
			{
				id: `${windowId}_help`,
				title: "Help",
				menuChildren: [aboutMenuItem],
			},
		],
		[appId, appName, appIcon, closeWindow, openFiles, aboutMenuItem],
	);

	return (
		<ClassicyApp
			id={appId}
			name={appName}
			icon={appIcon}
			handlesFileTypes={[ClassicyFileSystemEntryFileType.Pdf]}
			handlesOwnFiles={true}
		>
			{openFiles.map((filePath: string, idx: number) => {
				const entry = fs.resolve(filePath);
				const source = resolveFileSystemEntrySource(entry);
				const fileName = filePath.split(":").pop() || filePath;
				const windowId = `${appId}_file_${filePath}`;

				return (
					<ClassicyWindow
						key={windowId}
						id={windowId}
						title={fileName}
						appId={appId}
						initialSize={[500, 600]}
						initialPosition={[200 + idx * 30, 80 + idx * 30]}
						appMenu={buildAppMenu(windowId, filePath)}
						onCloseFunc={() => closeFile(filePath)}
					>
						<PDFViewerDocument
							url={source.kind === "url" ? source.url : ""}
							data={source.kind === "data" ? source.data : undefined}
						/>
					</ClassicyWindow>
				);
			})}
			{aboutWindow}
		</ClassicyApp>
	);
};
