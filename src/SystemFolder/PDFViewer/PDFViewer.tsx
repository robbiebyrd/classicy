import { type FC as FunctionalComponent, useCallback, useMemo } from "react";
import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { PDFViewerDocument } from "@/SystemFolder/PDFViewer/PDFViewerDocument";
import { PDFViewerAppInfo } from "@/SystemFolder/PDFViewer/PDFViewerUtils";
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";
import { quitMenuItemHelper } from "@/SystemFolder/SystemResources/App/ClassicyAppUtils";
import { resolveFileSystemEntrySource } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemContentResolver";
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

const { name: appName, id: appId, icon: appIcon } = PDFViewerAppInfo;

const appMenu = [
	{
		id: "file",
		title: "File",
		menuChildren: [quitMenuItemHelper(appId, appName, appIcon)],
	},
];

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

				return (
					<ClassicyWindow
						key={`${appId}_file_${filePath}`}
						id={`${appId}_file_${filePath}`}
						title={fileName}
						appId={appId}
						initialSize={[500, 600]}
						initialPosition={[200 + idx * 30, 80 + idx * 30]}
						appMenu={appMenu}
						onCloseFunc={() => closeFile(filePath)}
					>
						<PDFViewerDocument
							url={source.kind === "url" ? source.url : ""}
							data={source.kind === "data" ? source.data : undefined}
						/>
					</ClassicyWindow>
				);
			})}
		</ClassicyApp>
	);
};
