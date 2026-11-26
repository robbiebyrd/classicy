import {
	type FC as FunctionalComponent,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { useClassicyAsset } from "@/Appearance/ClassicyAssetRegistry";
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
import { resolveFileSystemEntrySource } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemContentResolver";
import { useClassicyFileSystemAccessor } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemContext";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import type { ClassicyFileOpenSelection } from "@/SystemFolder/SystemResources/FileDialog/ClassicyFileDialog";
import { desktopVolume } from "@/SystemFolder/SystemResources/FileDialog/ClassicyFileDialogVolume";
import { ClassicyFileOpenDialog } from "@/SystemFolder/SystemResources/FileDialog/ClassicyFileOpenDialog";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

const { name: appName, id: appId } = PDFViewerAppInfo;

/** Handled by classicyPDFViewerEventHandler (`PDFViewerContext.tsx`). A
 *  literal, never built from the app's name: a display name is not an action
 *  type, and "PDF Viewer" carries a space. */
const CLOSE_FILE = "ClassicyAppPDFViewerCloseFile";
const OPEN_FILE = "ClassicyAppPDFViewerOpenFile";

export const PDFViewer: FunctionalComponent = () => {
	const appIcon = useClassicyAsset("icons", "system.files.document") ?? "";
	const desktopEventDispatch = useAppManagerDispatch();
	const appState = useAppManager(
		(state) => state.System.Manager.Applications.apps[appId],
	);

	// The desktop's file system (its storage key: fileSystemStorageKey).
	const getFileSystem = useClassicyFileSystemAccessor();
	const fs = useMemo(() => getFileSystem(), [getFileSystem]);

	const rawOpenFiles = appState?.data?.openFiles;
	const openFiles: string[] = Array.isArray(rawOpenFiles) ? rawOpenFiles : [];

	// PDF Viewer opens only documents. A launch that opens none (the Apple
	// menu, Recent Applications, a relaunch after a quit) asks for one, the
	// Open dialog, and so does opening it again while it runs with no window
	// (`onReopen`: Finder 8's reopen application Apple event asks a running
	// application for what its launch does, TN1102). Cancel, or closing its
	// last document, leaves it running with no window and its File and Help
	// menus in the bar (`windowlessMenu`), as a Mac application with every
	// window closed keeps running (story 0226-a6f's N4: it quit instead while
	// an app with no window had no menu bar to quit it from).
	const appOpen = appState?.open === true;
	// A launch's mark (the kernel's, session state) also catches a Quit and
	// a relaunch in one tick, which `open` alone never shows.
	const launching = appState?.launching === true;
	const [showOpenDialog, setShowOpenDialog] = useState(false);
	const wasOpenRef = useRef(appOpen);
	useEffect(() => {
		const launched = appOpen && (!wasOpenRef.current || launching);
		wasOpenRef.current = appOpen;
		if (!appOpen) {
			setShowOpenDialog(false);
			return;
		}
		if (launched && openFiles.length === 0) setShowOpenDialog(true);
	}, [appOpen, launching, openFiles.length]);
	const askForDocument = useCallback(() => setShowOpenDialog(true), []);

	const volumes = useMemo(() => [desktopVolume(fs)], [fs]);
	const openSelections = useCallback(
		(selections: ClassicyFileOpenSelection[]) => {
			// The document first, so no render draws PDF Viewer with neither a
			// document nor its dialog (its windowless menu would flash).
			for (const selection of selections) {
				desktopEventDispatch({
					type: OPEN_FILE,
					app: { id: appId },
					path: String(
						selection.entry.meta?.classicyPath ?? selection.entry.id,
					),
				});
			}
			setShowOpenDialog(false);
		},
		[desktopEventDispatch],
	);

	const closeFile = useCallback(
		(path: string) => {
			desktopEventDispatch({
				type: CLOSE_FILE,
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
					{
						id: `${windowId}_open`,
						title: "Open…",
						onClickFunc: () => setShowOpenDialog(true),
					},
					closeWindowMenuItemHelper(`${windowId}_close_window`, () =>
						closeWindow(windowId, {
							type: CLOSE_FILE,
							app: { id: appId },
							path,
						}),
					),
					closeAllWindowsMenuItemHelper(`${appId}_close_all_windows`, () => {
						for (const p of openFiles) {
							closeWindow(`${appId}_file_${p}`, {
								type: CLOSE_FILE,
								app: { id: appId },
								path: p,
							});
						}
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
		[closeWindow, openFiles, aboutMenuItem, appIcon],
	);

	// The menus PDF Viewer keeps in the bar with no window open: File (Open…,
	// Quit) and Help; Close Window and Close All need a document.
	const windowlessMenu = useMemo<ClassicyMenuItem[]>(
		() => [
			{
				id: `${appId}_file`,
				title: "File",
				menuChildren: [
					{
						id: `${appId}_open`,
						title: "Open…",
						onClickFunc: askForDocument,
					},
					quitMenuItemHelper(appId, appName, appIcon),
				],
			},
			{
				id: `${appId}_help`,
				title: "Help",
				menuChildren: [aboutMenuItem],
			},
		],
		[askForDocument, aboutMenuItem, appIcon],
	);

	return (
		<ClassicyApp
			id={appId}
			name={appName}
			icon={appIcon}
			handlesFileTypes={[ClassicyFileSystemEntryFileType.Pdf]}
			handlesOwnFiles={true}
			showDesktopIcon={false}
			windowlessMenu={windowlessMenu}
			onReopen={askForDocument}
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
						// The page surface below the toolbar is its own scroller (the
						// Hand tool pans it, Zoom re-anchors its offsets), so the
						// window must not draw a second, empty set of bars (#271).
						scrollable={false}
					>
						<PDFViewerDocument
							url={source.kind === "url" ? source.url : ""}
							data={source.kind === "data" ? source.data : undefined}
						/>
					</ClassicyWindow>
				);
			})}
			<ClassicyFileOpenDialog
				id={`${appId}_open_dialog`}
				appId={appId}
				open={showOpenDialog}
				title={"Open"}
				volumes={volumes}
				selectionMode={"single"}
				fileTypeFilters={[
					{
						label: "PDF Documents",
						types: [ClassicyFileSystemEntryFileType.Pdf],
					},
				]}
				onOpenFunc={openSelections}
				onCancelFunc={() => setShowOpenDialog(false)}
			/>
			{aboutWindow}
		</ClassicyApp>
	);
};
