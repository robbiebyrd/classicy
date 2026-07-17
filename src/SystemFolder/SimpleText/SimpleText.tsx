import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";
import {
	useClassicyAboutMenu,
	useClassicyEditMenu,
	useClassicyWindowClose,
} from "@/SystemFolder/SystemResources/App/ClassicyAppMenuHooks";
import { quitMenuItemHelper } from "@/SystemFolder/SystemResources/App/ClassicyAppUtils";
import { useClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemContext";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import { useClassicyFileSystemWriter } from "@/SystemFolder/SystemResources/File/useClassicyFileSystemWriter";
import { desktopVolume } from "@/SystemFolder/SystemResources/FileDialog/ClassicyFileDialogVolume";
import {
	ClassicyFileOpenDialog,
	type ClassicyFileOpenSelection,
} from "@/SystemFolder/SystemResources/FileDialog/ClassicyFileOpenDialog";
import {
	ClassicyFileSaveDialog,
	type ClassicyFileSaveResult,
} from "@/SystemFolder/SystemResources/FileDialog/ClassicyFileSaveDialog";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import { ClassicyRichTextEditor } from "@/SystemFolder/SystemResources/RichTextEditor/ClassicyRichTextEditor";
import { ClassicyTextEditor } from "@/SystemFolder/SystemResources/TextEditor/ClassicyTextEditor";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

const appName = "SimpleText";
const appId = "SimpleText.app";
const appIcon = ClassicyIcons.applications.simpletext.app;

// SimpleText edits plain text and markdown; the two map to the same underlying
// document, distinguished only by which editor renders it.
type SimpleTextFileType =
	| ClassicyFileSystemEntryFileType.TextFile
	| ClassicyFileSystemEntryFileType.Markdown;

// A document that has never been written to disk. It lives only in component
// state until the user saves it, at which point it becomes a path-backed doc.
type UntitledDoc = {
	id: string;
	content: string;
	type: SimpleTextFileType;
};

// Identifies which document a Save / Save As… dialog is acting on.
type SaveTarget =
	| { kind: "untitled"; id: string }
	| { kind: "path"; path: string };

// The normalized view of an open document, whether untitled or path-backed,
// used to render its window and build its menus.
type OpenDoc = {
	key: string;
	windowId: string;
	title: string;
	content: string;
	type: SimpleTextFileType;
	target: SaveTarget;
};

const isSimpleTextType = (value: unknown): value is SimpleTextFileType =>
	value === ClassicyFileSystemEntryFileType.TextFile ||
	value === ClassicyFileSystemEntryFileType.Markdown;

export const SimpleText = () => {
	const desktopEventDispatch = useAppManagerDispatch();
	const appState = useAppManager(
		(state) => state.System.Manager.Applications.apps[appId],
	);

	const fs = useClassicyFileSystem();
	const writer = useClassicyFileSystemWriter(fs);

	const rawOpenFiles = appState?.data?.openFiles;
	const openFiles: string[] = Array.isArray(rawOpenFiles) ? rawOpenFiles : [];
	const openFilesKey = openFiles.join("\u0000");

	// Working copy of each path-backed document's text, seeded from disk and
	// updated on every keystroke so Save has something to write back.
	const [pathContent, setPathContent] = useState<Record<string, string>>({});
	// Live plain/rich view overrides keyed by path (also persisted onto the FS
	// entry so the choice survives a reload).
	const [pathTypeOverrides, setPathTypeOverrides] = useState<
		Record<string, SimpleTextFileType>
	>({});
	// Untitled (never-saved) documents.
	const [untitledDocs, setUntitledDocs] = useState<UntitledDoc[]>([]);

	const [showOpenDialog, setShowOpenDialog] = useState(false);
	const [saveTarget, setSaveTarget] = useState<SaveTarget | null>(null);

	const untitledCounter = useRef(0);
	const wasOpenRef = useRef(false);

	const makeUntitled = useCallback((): UntitledDoc => {
		untitledCounter.current += 1;
		return {
			id: `${appId}_untitled_${untitledCounter.current}`,
			content: "",
			type: ClassicyFileSystemEntryFileType.TextFile,
		};
	}, []);

	// When SimpleText is launched with no document (e.g. from its desktop icon),
	// open a fresh Untitled window — the classic new-application behavior.
	// Launching via a file leaves openFiles non-empty, so no stray window opens.
	useEffect(() => {
		const open = !!appState?.open;
		if (open && !wasOpenRef.current) {
			if (openFiles.length === 0 && untitledDocs.length === 0) {
				setUntitledDocs([makeUntitled()]);
			}
		}
		wasOpenRef.current = open;
	}, [appState?.open, openFiles.length, untitledDocs.length, makeUntitled]);

	// Keep a working-content entry for every open path, seeding new ones from the
	// file system and pruning ones that were closed. Existing entries are left
	// untouched so in-progress edits survive unrelated file-system rebuilds.
	// biome-ignore lint/correctness/useExhaustiveDependencies: openFilesKey is the stable invalidation key for the openFiles array; fs re-seeds content when the tree is rebuilt
	useEffect(() => {
		setPathContent((prev) => {
			const next: Record<string, string> = {};
			let changed = false;
			for (const path of openFiles) {
				if (path in prev) {
					next[path] = prev[path];
				} else {
					const entry = fs.resolve(path);
					next[path] = typeof entry?._data === "string" ? entry._data : "";
					changed = true;
				}
			}
			if (Object.keys(prev).length !== Object.keys(next).length) {
				changed = true;
			}
			return changed ? next : prev;
		});
	}, [openFilesKey, fs]);

	const setUntitledContent = useCallback((id: string, content: string) => {
		setUntitledDocs((prev) =>
			prev.map((d) => (d.id === id ? { ...d, content } : d)),
		);
	}, []);

	const setPathDocContent = useCallback((path: string, content: string) => {
		setPathContent((prev) => ({ ...prev, [path]: content }));
	}, []);

	const closeWindow = useClassicyWindowClose(appId);
	const editMenu = useClassicyEditMenu(appId);
	const { aboutMenuItem, aboutWindow } = useClassicyAboutMenu(
		appId,
		appName,
		appIcon,
	);

	// --- Document commands ------------------------------------------------

	const newFile = useCallback(() => {
		setUntitledDocs((prev) => [...prev, makeUntitled()]);
	}, [makeUntitled]);

	const openSelections = useCallback(
		(selections: ClassicyFileOpenSelection[]) => {
			setShowOpenDialog(false);
			for (const selection of selections) {
				const path =
					(selection.entry.meta?.classicyPath as string | undefined) ??
					selection.path.join(fs.separator);
				desktopEventDispatch({
					type: `ClassicyApp${appName}OpenFile`,
					app: { id: appId },
					path,
				});
			}
		},
		[desktopEventDispatch, fs.separator],
	);

	const saveToExistingPath = useCallback(
		(path: string) => {
			const content = pathContent[path] ?? "";
			writer.saveToPath(path, content);
		},
		[pathContent, writer],
	);

	// Save writes straight to disk for a titled document; an untitled one has no
	// location yet, so it falls through to Save As…
	const saveDoc = useCallback(
		(target: SaveTarget) => {
			if (target.kind === "path") {
				saveToExistingPath(target.path);
			} else {
				setSaveTarget(target);
			}
		},
		[saveToExistingPath],
	);

	const commitSave = useCallback(
		(result: ClassicyFileSaveResult) => {
			const target = saveTarget;
			setSaveTarget(null);
			if (!target) return;

			const directory = result.path.join(fs.separator);
			const type =
				target.kind === "untitled"
					? (untitledDocs.find((d) => d.id === target.id)?.type ??
						ClassicyFileSystemEntryFileType.TextFile)
					: (pathTypeOverrides[target.path] ??
						(isSimpleTextType(fs.resolve(target.path)?._type)
							? (fs.resolve(target.path)?._type as SimpleTextFileType)
							: ClassicyFileSystemEntryFileType.TextFile));
			const content =
				target.kind === "untitled"
					? (untitledDocs.find((d) => d.id === target.id)?.content ?? "")
					: (pathContent[target.path] ?? "");

			const newPath = writer.createFile(
				directory,
				result.fileName,
				content,
				type,
			);
			if (!newPath) {
				desktopEventDispatch({
					type: "ClassicyDesktopShowErrorDialog",
					message: "That name can't be used. Please choose another.",
				});
				return;
			}

			// Seed the working copy so the reopened window shows the saved text
			// without a round-trip through disk, then register the file as open.
			setPathContent((prev) => ({ ...prev, [newPath]: content }));
			desktopEventDispatch({
				type: `ClassicyApp${appName}OpenFile`,
				app: { id: appId },
				path: newPath,
			});

			if (target.kind === "untitled") {
				setUntitledDocs((prev) => prev.filter((d) => d.id !== target.id));
			}
		},
		[
			saveTarget,
			untitledDocs,
			pathContent,
			pathTypeOverrides,
			fs,
			writer,
			desktopEventDispatch,
		],
	);

	const closeUntitled = useCallback((id: string) => {
		setUntitledDocs((prev) => prev.filter((d) => d.id !== id));
	}, []);

	const closePathDoc = useCallback(
		(path: string) => {
			desktopEventDispatch({
				type: `ClassicyApp${appName}CloseFile`,
				app: { id: appId },
				path,
			});
		},
		[desktopEventDispatch],
	);

	const toggleType = useCallback(
		(target: SaveTarget, currentType: SimpleTextFileType) => {
			const nextType =
				currentType === ClassicyFileSystemEntryFileType.Markdown
					? ClassicyFileSystemEntryFileType.TextFile
					: ClassicyFileSystemEntryFileType.Markdown;

			if (target.kind === "untitled") {
				setUntitledDocs((prev) =>
					prev.map((d) => (d.id === target.id ? { ...d, type: nextType } : d)),
				);
				return;
			}

			setPathTypeOverrides((prev) => ({ ...prev, [target.path]: nextType }));
			// Persist the format choice onto the file-system entry as well.
			const entry = fs.resolve(target.path);
			if (entry) {
				entry._type = nextType;
				desktopEventDispatch({ type: "ClassicyAppFileSystemChanged" });
				try {
					localStorage.setItem(fs.storageKey, fs.snapshot());
				} catch (e) {
					console.error("[SimpleText] Failed to persist file type change", e);
				}
			}
		},
		[fs, desktopEventDispatch],
	);

	// --- Menus ------------------------------------------------------------

	const buildAppMenu = useCallback(
		(doc: OpenDoc): ClassicyMenuItem[] => {
			const isMarkdown = doc.type === ClassicyFileSystemEntryFileType.Markdown;
			const closeThis = () => {
				if (doc.target.kind === "untitled") {
					closeWindow(doc.windowId, {
						type: `ClassicyApp${appName}CloseFile`,
						app: { id: appId },
						path: "",
					});
					closeUntitled(doc.target.id);
				} else {
					closeWindow(doc.windowId, {
						type: `ClassicyApp${appName}CloseFile`,
						app: { id: appId },
						path: doc.target.path,
					});
				}
			};

			return [
				{
					id: `${doc.windowId}_file`,
					title: "File",
					menuChildren: [
						{
							id: `${doc.windowId}_new`,
							title: "New",
							onClickFunc: newFile,
						},
						{
							id: `${doc.windowId}_open`,
							title: "Open…",
							onClickFunc: () => setShowOpenDialog(true),
						},
						{ id: "spacer" },
						{
							id: `${doc.windowId}_close`,
							title: "Close",
							onClickFunc: closeThis,
						},
						{
							id: `${doc.windowId}_save`,
							title: "Save",
							onClickFunc: () => saveDoc(doc.target),
						},
						{
							id: `${doc.windowId}_save_as`,
							title: "Save As…",
							onClickFunc: () => setSaveTarget(doc.target),
						},
						{ id: "spacer" },
						quitMenuItemHelper(appId, appName, appIcon),
					],
				},
				editMenu,
				{
					id: `${doc.windowId}_format`,
					title: "Format",
					menuChildren: [
						{
							id: `${doc.windowId}_toggle_format`,
							title: isMarkdown ? "View as Plain Text" : "View as Rich Text",
							onClickFunc: () => toggleType(doc.target, doc.type),
						},
					],
				},
				{
					id: `${doc.windowId}_help`,
					title: "Help",
					menuChildren: [aboutMenuItem],
				},
			];
		},
		[
			newFile,
			saveDoc,
			toggleType,
			closeWindow,
			closeUntitled,
			editMenu,
			aboutMenuItem,
		],
	);

	// --- Assemble the open documents --------------------------------------

	const docs: OpenDoc[] = [
		...openFiles.map((path): OpenDoc => {
			const entry = fs.resolve(path);
			const storedType = entry?._type;
			const type =
				pathTypeOverrides[path] ??
				(isSimpleTextType(storedType)
					? storedType
					: ClassicyFileSystemEntryFileType.TextFile);
			return {
				key: `path:${path}`,
				windowId: `${appId}_file_${path}`,
				title: path.split(fs.separator).pop() || path,
				content:
					pathContent[path] ??
					(typeof entry?._data === "string" ? entry._data : ""),
				type,
				target: { kind: "path", path },
			};
		}),
		...untitledDocs.map(
			(doc): OpenDoc => ({
				key: `untitled:${doc.id}`,
				windowId: doc.id,
				title: "Untitled",
				content: doc.content,
				type: doc.type,
				target: { kind: "untitled", id: doc.id },
			}),
		),
	];

	// Memoized so the dialogs receive a stable volume array — the save dialog's
	// folder-load effect keys on the active volume, and a fresh array each render
	// would make it reload every render.
	const volumes = useMemo(() => [desktopVolume(fs)], [fs]);
	const textFilters = [
		{
			label: "Text Documents",
			types: [
				ClassicyFileSystemEntryFileType.TextFile,
				ClassicyFileSystemEntryFileType.Markdown,
			] as string[],
		},
		{ label: "All Documents", types: null },
	];

	return (
		<ClassicyApp
			id={appId}
			name={appName}
			icon={appIcon}
			defaultWindow={docs[0]?.windowId}
			handlesFileTypes={[
				ClassicyFileSystemEntryFileType.TextFile,
				ClassicyFileSystemEntryFileType.Markdown,
			]}
			handlesOwnFiles={true}
		>
			{docs.map((doc, idx) => (
				<ClassicyWindow
					key={doc.key}
					id={doc.windowId}
					title={doc.title}
					appId={appId}
					initialSize={[400, 350]}
					initialPosition={[200 + idx * 30, 100 + idx * 30]}
					appMenu={buildAppMenu(doc)}
					onCloseFunc={() => {
						if (doc.target.kind === "untitled") {
							closeUntitled(doc.target.id);
						} else {
							closePathDoc(doc.target.path);
						}
					}}
				>
					{doc.type === ClassicyFileSystemEntryFileType.Markdown ? (
						<ClassicyRichTextEditor
							content={doc.content}
							onChangeFunc={(markdown) => {
								if (doc.target.kind === "untitled") {
									setUntitledContent(doc.target.id, markdown);
								} else {
									setPathDocContent(doc.target.path, markdown);
								}
							}}
						/>
					) : (
						<ClassicyTextEditor
							content={doc.content}
							onChangeFunc={(e) => {
								if (doc.target.kind === "untitled") {
									setUntitledContent(doc.target.id, e.target.value);
								} else {
									setPathDocContent(doc.target.path, e.target.value);
								}
							}}
						/>
					)}
				</ClassicyWindow>
			))}
			<ClassicyFileOpenDialog
				id={`${appId}_open_dialog`}
				appId={appId}
				open={showOpenDialog}
				title={"Open"}
				volumes={volumes}
				selectionMode={"single"}
				fileTypeFilters={textFilters}
				onOpenFunc={openSelections}
				onCancelFunc={() => setShowOpenDialog(false)}
			/>
			<ClassicyFileSaveDialog
				id={`${appId}_save_dialog`}
				appId={appId}
				open={saveTarget !== null}
				title={"Save"}
				volumes={volumes}
				initialPath={["Macintosh HD", "Documents"]}
				defaultFileName={"untitled"}
				onSaveFunc={commitSave}
				onCancelFunc={() => setSaveTarget(null)}
			/>
			{aboutWindow}
		</ClassicyApp>
	);
};
