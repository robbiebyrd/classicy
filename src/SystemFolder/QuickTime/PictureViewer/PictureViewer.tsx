import "./PictureViewer.scss";
import {
	type FC as FunctionalComponent,
	useCallback,
	useEffect,
	useMemo,
} from "react";
import samplePicture from "@img/apps/quicktime/sample-picture.jpg?inline";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import {
	PictureViewerAppInfo,
	isPictureViewerData,
	type PictureViewerOpenFile,
} from "@/SystemFolder/QuickTime/PictureViewer/PictureViewerUtils";
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
import { useResolvedMediaSource } from "@/SystemFolder/SystemResources/File/useResolvedMediaSource";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

const defaultDocumentIcon = ClassicyIcons.system.quicktime.movie;

type ResolvedPictureDocument = {
	key: string;
	path?: string;
	title: string;
	icon?: string;
	url?: string;
	data?: string;
	mimeType?: string;
};

function resolvePictureDocument(
	entry: PictureViewerOpenFile,
	fs: ClassicyFileSystem,
): ResolvedPictureDocument {
	if (typeof entry === "string") {
		const fsEntry = fs.resolve(entry);
		const source = resolveFileSystemEntrySource(fsEntry);
		return {
			key: entry,
			path: entry,
			title: entry.split(":").pop() || entry,
			icon: fsEntry?._icon,
			url: source.kind === "url" ? source.url : undefined,
			data: source.kind === "data" ? source.data : undefined,
			mimeType: fsEntry?._mimeType,
		};
	}
	return {
		key: entry.url,
		title: entry.name ?? entry.url,
		icon: entry.icon,
		url: entry.url,
	};
}

const PictureViewerImage: FunctionalComponent<{
	url?: string;
	data?: string;
	mimeType?: string;
	alt: string;
}> = ({ url, data, mimeType, alt }) => {
	const src = useResolvedMediaSource(url, data, mimeType);
	if (!src) {
		return null;
	}
	return <img src={src} alt={alt} className={"classicyPictureViewerImage"} />;
};

export const QuickTimePictureViewer: FunctionalComponent = () => {
	const { name: appName, id: appId, icon: appIcon } = PictureViewerAppInfo;

	const desktopEventDispatch = useAppManagerDispatch();
	const appData = useAppManager(
		(s) => s.System.Manager.Applications.apps[appId]?.data,
	);
	const appOpen = useAppManager(
		(s) => s.System.Manager.Applications.apps[appId]?.open,
	);

	const fs = useMemo(() => new ClassicyFileSystem(), []);

	const rawAppData = appData ?? {};
	const pictureData = isPictureViewerData(rawAppData) ? rawAppData : null;
	const openFiles: PictureViewerOpenFile[] = pictureData?.openFiles ?? [];
	const openDocuments = useMemo(
		() => openFiles.map((entry) => resolvePictureDocument(entry, fs)),
		[openFiles, fs],
	);

	// Load Default Demo documents on open
	useEffect(() => {
		if (appOpen && (!pictureData?.openFiles || pictureData.openFiles.length === 0)) {
			const defaultDocs = [
				{
					url: samplePicture,
					name: "Sample Picture",
					icon: defaultDocumentIcon,
				},
			];
			desktopEventDispatch({
				type: "ClassicyAppPictureViewerOpenDocuments",
				documents: defaultDocs,
			});
		}
	}, [appData, appOpen, desktopEventDispatch]);

	const closeFile = useCallback(
		(path: string) => {
			desktopEventDispatch({
				type: `ClassicyApp${appName.replace(/\s+/g, "")}CloseFile`,
				app: { id: appId },
				path,
			});
		},
		[desktopEventDispatch, appId, appName],
	);

	const windowEntries = useMemo(
		() =>
			openDocuments.map((doc) => ({
				doc,
				windowId: `${appId}_PictureViewer_${doc.key}`,
			})),
		[openDocuments, appId],
	);

	const closeWindow = useClassicyWindowClose(appId);
	const { aboutMenuItem, aboutWindow } = useClassicyAboutMenu(
		appId,
		appName,
		appIcon,
	);

	const closeDocAction = useCallback(
		(doc: ResolvedPictureDocument) =>
			doc.path
				? {
						type: "ClassicyAppPictureViewerCloseFile",
						app: { id: appId },
						path: doc.path,
					}
				: {
						type: "ClassicyAppPictureViewerCloseDocument",
						document: { url: doc.url, name: doc.title, icon: doc.icon },
					},
		[appId],
	);

	const buildAppMenu = useCallback(
		(windowId: string, doc: ResolvedPictureDocument) => [
			{
				id: `${windowId}_file`,
				title: "File",
				menuChildren: [
					closeWindowMenuItemHelper(`${windowId}_close_window`, () =>
						closeWindow(windowId, closeDocAction(doc)),
					),
					closeAllWindowsMenuItemHelper(`${appId}_close_all_windows`, () => {
						windowEntries.forEach((entry) =>
							closeWindow(entry.windowId, closeDocAction(entry.doc)),
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
		[appId, appName, appIcon, closeWindow, closeDocAction, windowEntries, aboutMenuItem],
	);

	return (
		<ClassicyApp
			id={appId}
			name={appName}
			icon={appIcon}
			handlesFileTypes={[ClassicyFileSystemEntryFileType.Image]}
			handlesOwnFiles={true}
		>
			{windowEntries.map(({ doc, windowId }) => (
				<ClassicyWindow
					key={windowId}
					id={windowId}
					title={doc.title}
					icon={doc.icon || undefined}
					minimumSize={[300, 60]}
					appId={appId}
					closable={true}
					resizable={true}
					zoomable={true}
					scrollable={true}
					collapsable={false}
					initialSize={[400, 100]}
					initialPosition={[300, 50]}
					modal={false}
					appMenu={buildAppMenu(windowId, doc)}
					onCloseFunc={() =>
						doc.path
							? closeFile(doc.path)
							: desktopEventDispatch({
									type: "ClassicyAppPictureViewerCloseDocument",
									document: { url: doc.url, name: doc.title, icon: doc.icon },
								})
					}
				>
					<PictureViewerImage
						url={doc.url}
						data={doc.data}
						mimeType={doc.mimeType}
						alt={doc.title}
					/>
				</ClassicyWindow>
			))}
			{aboutWindow}
		</ClassicyApp>
	);
};
