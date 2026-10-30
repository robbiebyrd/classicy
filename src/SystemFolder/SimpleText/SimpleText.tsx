import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useClassicyAsset } from "@/Appearance/ClassicyAssetRegistry";
import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { SIMPLE_TEXT_APP_ID } from "@/SystemFolder/SimpleText/SimpleTextManifest";
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";
import {
	useClassicyAboutMenu,
	useClassicyEditMenu,
	useClassicyWindowClose,
} from "@/SystemFolder/SystemResources/App/ClassicyAppMenuHooks";
import { quitMenuItemHelper } from "@/SystemFolder/SystemResources/App/ClassicyAppUtils";
import { useClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemContext";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import type {
	ClassicyFileOpenSelection,
	ClassicyFileSaveFormat,
	ClassicyFileSaveResult,
} from "@/SystemFolder/SystemResources/FileDialog/ClassicyFileDialog";
import { desktopVolume } from "@/SystemFolder/SystemResources/FileDialog/ClassicyFileDialogVolume";
import { ClassicyFileOpenDialog } from "@/SystemFolder/SystemResources/FileDialog/ClassicyFileOpenDialog";
import { ClassicyFileSaveDialog } from "@/SystemFolder/SystemResources/FileDialog/ClassicyFileSaveDialog";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import { ClassicyRichTextEditor } from "@/SystemFolder/SystemResources/RichTextEditor/ClassicyRichTextEditor";
import { ClassicyTextEditor } from "@/SystemFolder/SystemResources/TextEditor/ClassicyTextEditor";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

const appName = "SimpleText";
const appId = SIMPLE_TEXT_APP_ID;
// SimpleText edits plain text and styled (Markdown) text; the two map to the
// same underlying string, distinguished only by which editor renders it.
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

// Identifies the document a Save / Save As… dialog is acting on.
type SaveTarget =
	| { kind: "untitled"; id: string }
	| { kind: "path"; path: string };

// The normalized view of an open document — untitled or path-backed — used to
// render its window and build its menus.
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

const sameTarget = (a: SaveTarget, b: SaveTarget): boolean =>
	a.kind === "untitled" && b.kind === "untitled"
		? a.id === b.id
		: a.kind === "path" && b.kind === "path"
			? a.path === b.path
			: false;

export const SimpleText = () => {
	const appIcon =
		useClassicyAsset("icons", "applications.simpletext.app") ?? "";
	const desktopEventDispatch = useAppManagerDispatch();
	const appState = useAppManager(
		(state) => state.System.Manager.Applications.apps[appId],
	);

	const fs = useClassicyFileSystem();
	// The Classicy virtual clock, used to stamp Date Modified on a save.
	const dateTime = useAppManager(
		(state) => state.System.Manager.DateAndTime.dateTime,
	);

	const rawOpenFiles = appState?.data?.openFiles;
	const openFiles: string[] = Array.isArray(rawOpenFiles) ? rawOpenFiles : [];
	const openFilesKey = openFiles.join("\u0000");

	// Working copy of each path-backed document's text, seeded from disk and
	// updated on every keystroke so Save has something to write back.
	const [pathContent, setPathContent] = useState<Record<string, string>>({});
	// Live plain/styled view overrides keyed by path (the choice is also
	// persisted onto the entry via setMetadata so it survives a reload).
	const [pathTypeOverrides, setPathTypeOverrides] = useState<
		Record<string, SimpleTextFileType>
	>({});
	// Untitled (never-saved) documents.
	const [untitledDocs, setUntitledDocs] = useState<UntitledDoc[]>([]);

	const [showOpenDialog, setShowOpenDialog] = useState(false);
	const [saveTarget, setSaveTarget] = useState<SaveTarget | null>(null);

	const untitledCounter = useRef(0);

	const makeUntitled = useCallback((): UntitledDoc => {
		untitledCounter.current += 1;
		return {
			id: `${appId}_untitled_${untitledCounter.current}`,
			content: "",
			type: ClassicyFileSystemEntryFileType.TextFile,
		};
	}, []);

	// Whenever SimpleText is open with nothing to show, open a fresh Untitled
	// window. This is the classic new-application behavior, and it also keeps the
	// app from stranding the user with no window — and therefore no menu bar to
	// make one — after the last document window is closed. Launching via a file
	// leaves openFiles non-empty, so no stray window opens in that case.
	useEffect(() => {
		if (appState?.open && openFiles.length === 0 && untitledDocs.length === 0) {
			setUntitledDocs([makeUntitled()]);
		}
	}, [appState?.open, openFiles.length, untitledDocs.length, makeUntitled]);

	// Keep a working-content entry for every open path, seeding new ones from the
	// file system and pruning ones that were closed. Existing entries are left
	// untouched so in-progress edits survive unrelated file-system rebuilds.
	// biome-ignore lint/correctness/useExhaustiveDependencies: openFilesKey is the stable invalidation key for the openFiles array; fs re-seeds content when the tree is rebuilt
	useEffect(() => {
		setPathContent((prev) => {
			const next: Record<string, string> = {};
			for (const path of openFiles) {
				if (path in prev) {
					next[path] = prev[path];
				} else {
					const entry = fs.resolve(path);
					next[path] = typeof entry?._data === "string" ? entry._data : "";
				}
			}
			const changed =
				Object.keys(next).length !== Object.keys(prev).length ||
				openFiles.some((p) => !(p in prev));
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

	// --- Document commands -------------------------------------------------

	const newFile = useCallback(() => {
		setUntitledDocs((prev) => [...prev, makeUntitled()]);
	}, [makeUntitled]);

	const openSelections = useCallback(
		(selections: ClassicyFileOpenSelection[]) => {
			setShowOpenDialog(false);
			for (const selection of selections) {
				const path = String(
					selection.entry.meta?.classicyPath ?? selection.entry.id,
				);
				desktopEventDispatch({
					type: `ClassicyApp${appName}OpenFile`,
					app: { id: appId },
					path,
				});
			}
		},
		[desktopEventDispatch],
	);

	// Write a path-backed document's current text straight back to its entry,
	// preserving the entry's other metadata (unlike a full writeFile) and
	// stamping Date Modified. Refuses locked documents and reports a write that
	// the file system rejects (e.g. the path no longer resolves).
	const saveExisting = useCallback(
		(path: string) => {
			const entry = fs.resolve(path);
			if (entry?._readOnly || entry?._system) {
				desktopEventDispatch({
					type: "ClassicyDesktopShowErrorDialog",
					message: "This document is locked and cannot be saved.",
				});
				return;
			}
			const wrote = fs.setMetadata(path, {
				_data: pathContent[path] ?? "",
				_modifiedOn: new Date(dateTime),
			});
			if (!wrote) {
				desktopEventDispatch({
					type: "ClassicyDesktopShowErrorDialog",
					message:
						"This document could not be saved. It may have been moved or deleted.",
				});
			}
		},
		[fs, pathContent, dateTime, desktopEventDispatch],
	);

	// Save writes straight to disk for a titled document; an untitled one has no
	// location yet, so it falls through to the Save As… dialog.
	const saveDoc = useCallback(
		(target: SaveTarget) => {
			if (target.kind === "path") {
				saveExisting(target.path);
			} else {
				setSaveTarget(target);
			}
		},
		[saveExisting],
	);

	// Called by the save dialog after it has already written the file through
	// the volume. Make the new file visible everywhere and open it as a document.
	const handleSaved = useCallback(
		(saved: ClassicyFileSaveResult) => {
			const target = saveTarget;
			setSaveTarget(null);

			const fullPath = [...saved.path, saved.fileName].join(fs.separator);

			// The volume's write only scheduled a debounced localStorage flush, and
			// every consumer builds its own fs seeded from localStorage. Flush now,
			// then bump fsVersion so the Finder (and other apps) rebuild and see the
			// new file — otherwise it would stay invisible until the next rebuild.
			fs.flushNow();
			desktopEventDispatch({ type: "ClassicyDesktopFileSystemVersionBump" });

			desktopEventDispatch({
				type: `ClassicyApp${appName}OpenFile`,
				app: { id: appId },
				path: fullPath,
			});

			if (target?.kind === "untitled") {
				setUntitledDocs((prev) => prev.filter((d) => d.id !== target.id));
			}
		},
		[saveTarget, fs, desktopEventDispatch],
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
			const entry = fs.resolve(target.path);
			if (entry?._readOnly || entry?._system) {
				desktopEventDispatch({
					type: "ClassicyDesktopShowErrorDialog",
					message: "This document is locked and cannot be changed.",
				});
				return;
			}
			// Persist the format choice through the journaled mutation path and
			// reflect it immediately in this session.
			fs.setMetadata(target.path, { _type: nextType });
			setPathTypeOverrides((prev) => ({ ...prev, [target.path]: nextType }));
		},
		[fs, desktopEventDispatch],
	);

	// --- Assemble the open documents ---------------------------------------

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

	// --- Menus -------------------------------------------------------------

	const buildAppMenu = useCallback(
		(doc: OpenDoc): ClassicyMenuItem[] => {
			const isMarkdown = doc.type === ClassicyFileSystemEntryFileType.Markdown;
			const closeThis = () => {
				if (doc.target.kind === "untitled") {
					const { id } = doc.target;
					// An untitled doc has no file to clean up — just close its window.
					desktopEventDispatch({
						type: "ClassicyWindowClose",
						app: { id: appId },
						window: { id: doc.windowId },
					});
					closeUntitled(id);
				} else {
					const { path } = doc.target;
					closeWindow(doc.windowId, {
						type: `ClassicyApp${appName}CloseFile`,
						app: { id: appId },
						path,
					});
				}
			};

			return [
				{
					id: `${doc.windowId}_file`,
					title: "File",
					menuChildren: [
						{ id: `${doc.windowId}_new`, title: "New", onClickFunc: newFile },
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
			desktopEventDispatch,
			editMenu,
			aboutMenuItem,
			appIcon,
		],
	);

	// --- Dialog inputs -----------------------------------------------------

	const volumes = useMemo(() => [desktopVolume(fs)], [fs]);

	const saveTargetDoc = saveTarget
		? (docs.find((d) => sameTarget(d.target, saveTarget)) ?? null)
		: null;

	// Offer both formats, defaulting to the document's current one. `data` is a
	// lazy snapshot of the live content, read only when the user commits.
	const saveFormats: ClassicyFileSaveFormat[] = (() => {
		const content = saveTargetDoc?.content ?? "";
		const plain: ClassicyFileSaveFormat = {
			label: "Plain Text",
			extension: ".txt",
			fileType: ClassicyFileSystemEntryFileType.TextFile,
			data: () => content,
		};
		const styled: ClassicyFileSaveFormat = {
			label: "Styled Text",
			extension: ".md",
			fileType: ClassicyFileSystemEntryFileType.Markdown,
			data: () => content,
		};
		return saveTargetDoc?.type === ClassicyFileSystemEntryFileType.Markdown
			? [styled, plain]
			: [plain, styled];
	})();

	// Strip SimpleText's own extension from the suggested name so the save
	// dialog (which appends the chosen format's extension) doesn't double it —
	// e.g. saving "Read Me.txt" as Styled Text should offer "Read Me", not
	// "Read Me.txt.md".
	const saveDefaultName =
		saveTargetDoc?.target.kind === "path"
			? saveTargetDoc.title.replace(/\.(txt|md|markdown)$/i, "")
			: "untitled";

	return (
		<ClassicyApp
			id={appId}
			name={appName}
			icon={appIcon}
			showDesktopIcon={false}
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
					// A plain-text file edits in a full-window <textarea>, which scrolls
					// itself; letting the window scroll too drew a second set of bars
					// (#271). The Markdown editor grows with its content instead, so the
					// window stays its scroller.
					scrollable={doc.type === ClassicyFileSystemEntryFileType.Markdown}
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
				// Only SimpleText's own types are selectable: opening some other
				// file as text would render it garbled and a later Save would
				// overwrite its data while keeping its original type, corrupting it.
				fileTypeFilters={[
					{
						label: "Text Documents",
						types: [
							ClassicyFileSystemEntryFileType.TextFile,
							ClassicyFileSystemEntryFileType.Markdown,
						],
					},
				]}
				onOpenFunc={openSelections}
				onCancelFunc={() => setShowOpenDialog(false)}
			/>
			<ClassicyFileSaveDialog
				id={`${appId}_save_dialog`}
				appId={appId}
				open={saveTarget !== null}
				title={"Save"}
				volumes={volumes}
				defaultFileName={saveDefaultName}
				formats={saveFormats}
				onSaveFunc={handleSaved}
				onCancelFunc={() => setSaveTarget(null)}
			/>
			{aboutWindow}
		</ClassicyApp>
	);
};
