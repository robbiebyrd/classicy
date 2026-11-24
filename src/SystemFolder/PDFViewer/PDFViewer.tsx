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
	quitAppHelper,
	quitMenuItemHelper,
} from "@/SystemFolder/SystemResources/App/ClassicyAppUtils";
import { resolveFileSystemEntrySource } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemContentResolver";
import { useClassicyFileSystemAccessor } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemContext";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import type { ClassicyFileOpenSelection } from "@/SystemFolder/SystemResources/FileDialog/ClassicyFileDialog";
import { desktopVolume } from "@/SystemFolder/SystemResources/FileDialog/ClassicyFileDialogVolume";
import { ClassicyFileOpenDialog } from "@/SystemFolder/SystemResources/FileDialog/ClassicyFileOpenDialog";
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

	// PDF Viewer opens only documents, and has no window without one, so it
	// is never left running with nothing to show (an app with no window has
	// no menu bar in Classicy, so nothing could quit it). A launch that opens
	// no document (the Apple menu, Recent Applications, a relaunch after a
	// quit) asks for one, the Open dialog; and once it has none and is not
	// asking (Cancel, its last document closed, or a saved session that left
	// it open with none) it quits, as the Mac's document-only utilities did.
	// So `open: true` is never saved for a PDF Viewer with no window (story
	// 0226-a6f).
	const appOpen = appState?.open === true;
	const [showOpenDialog, setShowOpenDialog] = useState(false);
	const wasOpenRef = useRef(appOpen);
	const quittingRef = useRef(false);
	useEffect(() => {
		const launched = appOpen && !wasOpenRef.current;
		wasOpenRef.current = appOpen;
		if (!appOpen) {
			quittingRef.current = false;
			setShowOpenDialog(false);
			return;
		}
		if (openFiles.length > 0 || showOpenDialog) return;
		if (launched) {
			setShowOpenDialog(true);
			return;
		}
		if (quittingRef.current) return;
		quittingRef.current = true;
		desktopEventDispatch(quitAppHelper(appId, appName, appIcon));
	}, [
		appOpen,
		openFiles.length,
		showOpenDialog,
		desktopEventDispatch,
		appIcon,
	]);

	const volumes = useMemo(() => [desktopVolume(fs)], [fs]);
	const openSelections = useCallback(
		(selections: ClassicyFileOpenSelection[]) => {
			// The document first, so no render sees PDF Viewer with neither a
			// document nor its dialog (which quits it).
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

	return (
		<ClassicyApp
			id={appId}
			name={appName}
			icon={appIcon}
			handlesFileTypes={[ClassicyFileSystemEntryFileType.Pdf]}
			handlesOwnFiles={true}
			showDesktopIcon={false}
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
