import { useCallback, useState } from "react";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";
import { quitMenuItemHelper } from "@/SystemFolder/SystemResources/App/ClassicyAppUtils";
import { useClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemContext";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import { ClassicyRichTextEditor } from "@/SystemFolder/SystemResources/RichTextEditor/ClassicyRichTextEditor";
import { ClassicyTextEditor } from "@/SystemFolder/SystemResources/TextEditor/ClassicyTextEditor";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

const appName = "SimpleText";
const appId = "SimpleText.app";
const appIcon = ClassicyIcons.applications.simpletext.app;

const baseMenu = [
	{
		id: "file",
		title: "File",
		menuChildren: [quitMenuItemHelper(appId, appName, appIcon)],
	},
];

export const SimpleText = () => {
	const desktopEventDispatch = useAppManagerDispatch();
	const appState = useAppManager(
		(state) => state.System.Manager.Applications.apps[appId],
	);

	const fs = useClassicyFileSystem();

	// fileTypeOverrides tracks in-session type toggles keyed by file path
	const [fileTypeOverrides, setFileTypeOverrides] = useState<
		Record<string, ClassicyFileSystemEntryFileType>
	>({});

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

	const toggleFileType = useCallback(
		(filePath: string, currentType: ClassicyFileSystemEntryFileType) => {
			const nextType =
				currentType === ClassicyFileSystemEntryFileType.Markdown
					? ClassicyFileSystemEntryFileType.TextFile
					: ClassicyFileSystemEntryFileType.Markdown;

			// Persist the new type onto the filesystem entry and save to localStorage
			const entry = fs.resolve(filePath);
			if (entry) {
				entry._type = nextType;
				try {
					localStorage.setItem(fs.storageKey, fs.snapshot());
				} catch (e) {
					console.error("[SimpleText] Failed to persist file type change", e);
				}
			}

			setFileTypeOverrides((prev) => ({ ...prev, [filePath]: nextType }));
		},
		[fs],
	);

	const defaultText = ``;

	const buildAppMenu = useCallback(
		(filePath: string, currentType: ClassicyFileSystemEntryFileType) => {
			const isMarkdown =
				currentType === ClassicyFileSystemEntryFileType.Markdown;
			return [
				...baseMenu,
				{
					id: "format",
					title: "Format",
					menuChildren: [
						{
							id: "toggle-format",
							title: isMarkdown
								? "View as Plain Text"
								: "View as Rich Text",
							onClickFunc: () => toggleFileType(filePath, currentType),
						},
					],
				},
			];
		},
		[toggleFileType],
	);

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
					appMenu={baseMenu}
				>
					<ClassicyRichTextEditor content={defaultText} />
				</ClassicyWindow>
			)}
			{openFiles.map((filePath: string, idx: number) => {
				const entry = fs.resolve(filePath);
				const content = typeof entry?._data === "string" ? entry._data : "";
				const storedType = entry?._type as ClassicyFileSystemEntryFileType;
				const fileType = fileTypeOverrides[filePath] ?? storedType;
				const fileName = filePath.split(":").pop() || filePath;

				return (
					<ClassicyWindow
						key={`${appId}_file_${filePath}`}
						id={`${appId}_file_${filePath}`}
						title={fileName}
						appId={appId}
						initialSize={[400, 350]}
						initialPosition={[200 + idx * 30, 100 + idx * 30]}
						appMenu={buildAppMenu(filePath, fileType)}
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
