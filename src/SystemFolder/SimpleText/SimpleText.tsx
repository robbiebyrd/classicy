import { useCallback, useMemo } from "react";
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import { ClassicyRichTextEditor } from "@/SystemFolder/SystemResources/RichTextEditor/ClassicyRichTextEditor";
import { ClassicyTextEditor } from "@/SystemFolder/SystemResources/TextEditor/ClassicyTextEditor";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";
import { quitMenuItemHelper } from "@/SystemFolder/SystemResources/App/ClassicyAppUtils";
import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";

export const SimpleText = () => {
	const appName = "SimpleText";
	const appId = "SimpleText.app";
	const appIcon = ClassicyIcons.applications.simpletext.app;

	const desktopEventDispatch = useAppManagerDispatch();
	const appState = useAppManager(
		(state) => state.System.Manager.Applications.apps[appId],
	);

	const fs = useMemo(() => new ClassicyFileSystem(), []);

	const openFiles: string[] = appState?.data?.openFiles ?? [];

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

	const defaultText = ``;

	const appMenu = [
		{
			id: "file",
			title: "File",
			menuChildren: [quitMenuItemHelper(appId, appName, appIcon)],
		},
	];

	return (
		<ClassicyApp
			id={appId}
			name={appName}
			icon={appIcon}
			defaultWindow={"simple-text-demo"}
			handlesFileTypes={[
				ClassicyFileSystemEntryFileType.TextFile,
				ClassicyFileSystemEntryFileType.Markdown,
			]}
			handlesOwnFiles={true}
		>
			{openFiles.length === 0 && (
				<ClassicyWindow
					id={"simple-text-demo"}
					title={"Untitled"}
					appId={appId}
					initialSize={[100, 500]}
					initialPosition={[350, 100]}
					appMenu={appMenu}
				>
					<ClassicyRichTextEditor content={defaultText} />
				</ClassicyWindow>
			)}
			{openFiles.map((filePath: string, idx: number) => {
				const entry = fs.resolve(filePath);
				const content =
					typeof entry?._data === "string" ? entry._data : "";
				const fileType = entry?._type as ClassicyFileSystemEntryFileType;
				const fileName = filePath.split(":").pop() || filePath;

				return (
					<ClassicyWindow
						key={`${appId}_file_${filePath}`}
						id={`${appId}_file_${filePath}`}
						title={fileName}
						appId={appId}
						initialSize={[400, 350]}
						initialPosition={[200 + idx * 30, 100 + idx * 30]}
						appMenu={appMenu}
						onCloseFunc={() => closeFile(filePath)}
					>
						{fileType === ClassicyFileSystemEntryFileType.Markdown ? (
							<ClassicyRichTextEditor content={content} />
						) : (
							<ClassicyTextEditor content={content} />
						)}
					</ClassicyWindow>
				);
			})}
		</ClassicyApp>
	);
};

