import {
	type FC as FunctionalComponent,
	useCallback,
	useEffect,
	useMemo,
} from "react";
import sampleMovie from "@vid/quicktime/sample.mp4?no-inline";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
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
import { QuickTimeVideoEmbed } from "@/SystemFolder/SystemResources/QuickTime/QuickTimeMovieEmbed";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";
import {
	MoviePlayerAppInfo,
	isMoviePlayerData,
	type MoviePlayerOpenFile,
} from "./MoviePlayerUtils";

const defaultDocumentIcon = ClassicyIcons.system.quicktime.movie;

type ResolvedMovieDocument = {
	key: string;
	path?: string;
	title: string;
	icon?: string;
	url?: string;
	data?: string;
	mimeType?: string;
	type: "audio" | "video";
	options?: object;
	subtitlesUrl?: string;
};

function resolveMovieDocument(
	entry: MoviePlayerOpenFile,
	fs: ClassicyFileSystem,
): ResolvedMovieDocument {
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
			type:
				fsEntry?._type === ClassicyFileSystemEntryFileType.Audio
					? "audio"
					: "video",
		};
	}
	return {
		key: entry.url,
		title: entry.name ?? entry.url,
		icon: entry.icon,
		url: entry.url,
		type: entry.type === "audio" ? "audio" : "video",
		options: entry.options,
		subtitlesUrl: entry.subtitlesUrl,
	};
}

const MoviePlayerVideo: FunctionalComponent<{
	appId: string;
	name: string;
	url?: string;
	data?: string;
	mimeType?: string;
	type: "audio" | "video";
	options?: object;
	subtitlesUrl?: string;
}> = ({ appId, name, url, data, mimeType, type, options, subtitlesUrl }) => {
	const src = useResolvedMediaSource(url, data, mimeType);
	if (!src) {
		return null;
	}
	return (
		<QuickTimeVideoEmbed
			appId={appId}
			name={name}
			url={src}
			options={options}
			type={type}
			subtitlesUrl={subtitlesUrl}
			controlsDocked={true}
		/>
	);
};

export const MoviePlayer: FunctionalComponent = () => {
	const { name: appName, id: appId, icon: appIcon } = MoviePlayerAppInfo;

	const desktopEventDispatch = useAppManagerDispatch();
	const appData = useAppManager(
		(s) => s.System.Manager.Applications.apps[appId]?.data,
	);
	const appOpen = useAppManager(
		(s) => s.System.Manager.Applications.apps[appId]?.open,
	);

	const fs = useMemo(() => new ClassicyFileSystem(), []);

	const rawAppData = appData ?? {};
	const movieData = isMoviePlayerData(rawAppData) ? rawAppData : null;
	const openFiles: MoviePlayerOpenFile[] = movieData?.openFiles ?? [];
	const openDocuments = useMemo(
		() => openFiles.map((entry) => resolveMovieDocument(entry, fs)),
		[openFiles, fs],
	);

	// Load Default Demo documents on open (only if none exist)
	useEffect(() => {
		if (!appOpen) return;
		if (!movieData?.openFiles || movieData.openFiles.length === 0) {
			desktopEventDispatch({
				type: "ClassicyAppMoviePlayerOpenDocuments",
				documents: [
					{
						url: sampleMovie,
						name: "Quick Time",
						icon: defaultDocumentIcon,
						options: {},
						type: "video",
					},
				],
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
				windowId: `${appId}_MoviePlayer_${doc.key}`,
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
		(doc: ResolvedMovieDocument) =>
			doc.path
				? {
						type: "ClassicyAppMoviePlayerCloseFile",
						app: { id: appId },
						path: doc.path,
					}
				: {
						type: "ClassicyAppMoviePlayerCloseDocument",
						document: { url: doc.url, name: doc.title, icon: doc.icon },
					},
		[appId],
	);

	const buildAppMenu = useCallback(
		(windowId: string, doc: ResolvedMovieDocument) => [
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
			handlesFileTypes={[
				ClassicyFileSystemEntryFileType.Video,
				ClassicyFileSystemEntryFileType.Audio,
			]}
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
					modal={true}
					appMenu={buildAppMenu(windowId, doc)}
					onCloseFunc={() =>
						doc.path
							? closeFile(doc.path)
							: desktopEventDispatch({
									type: "ClassicyAppMoviePlayerCloseDocument",
									document: { url: doc.url, name: doc.title, icon: doc.icon },
								})
					}
				>
					<MoviePlayerVideo
						appId={appId}
						name={doc.title}
						url={doc.url}
						data={doc.data}
						mimeType={doc.mimeType}
						type={doc.type}
						options={doc.options}
						subtitlesUrl={doc.subtitlesUrl}
					/>
				</ClassicyWindow>
			))}
			{aboutWindow}
		</ClassicyApp>
	);
};
