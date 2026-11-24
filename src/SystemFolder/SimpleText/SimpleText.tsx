import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useClassicyAsset } from "@/Appearance/ClassicyAssetRegistry";
import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { SIMPLE_TEXT_APP_ID } from "@/SystemFolder/SimpleText/SimpleTextManifest";
import { ClassicyAlert } from "@/SystemFolder/SystemResources/Alert/ClassicyAlert";
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";
import {
	useClassicyAboutMenu,
	useClassicyEditMenu,
	useClassicyWindowClose,
} from "@/SystemFolder/SystemResources/App/ClassicyAppMenuHooks";
import {
	quitAppHelper,
	quitMenuItemHelper,
} from "@/SystemFolder/SystemResources/App/ClassicyAppUtils";
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
import { useClassicyFitsScrollBars } from "@/SystemFolder/SystemResources/ScrollArea/useClassicyFitsScrollBars";
import { ClassicyTextEditor } from "@/SystemFolder/SystemResources/TextEditor/ClassicyTextEditor";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

const appName = "SimpleText";
const appId = SIMPLE_TEXT_APP_ID;
// SimpleText registers no reducer, so these reach the kernel's generic
// OpenFile/CloseFile handler. Literals, never built from the app's name.
const OPEN_FILE = "ClassicyAppSimpleTextOpenFile";
const CLOSE_FILE = "ClassicyAppSimpleTextCloseFile";
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
	/** Typed in: closing or quitting asks to save it first. */
	unsaved?: boolean;
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

	// Files edited since they were opened or last saved: closing or quitting
	// asks to save them first, as an untitled document typed in does.
	const [unsavedPaths, setUnsavedPaths] = useState<Record<string, true>>({});

	const [showOpenDialog, setShowOpenDialog] = useState(false);
	const keepsFitsBars = useClassicyFitsScrollBars();
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

	// Quitting discards the untitled documents, as quitting SimpleText did: a
	// later launch by a document shows that document alone, and a plain one
	// a fresh Untitled window (found during story 0226-a6f).
	const quit = appState !== undefined && !appState.open;
	useEffect(() => {
		if (quit) setUntitledDocs([]);
	}, [quit]);

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

	// A closed file's edits go with it: reopened, it is read from disk.
	// biome-ignore lint/correctness/useExhaustiveDependencies: openFilesKey is the stable invalidation key for the openFiles array
	useEffect(() => {
		setUnsavedPaths((prev) => {
			const kept = Object.keys(prev).filter((path) => openFiles.includes(path));
			return kept.length === Object.keys(prev).length
				? prev
				: Object.fromEntries(kept.map((path) => [path, true as const]));
		});
	}, [openFilesKey]);

	const setUntitledContent = useCallback((id: string, content: string) => {
		setUntitledDocs((prev) =>
			prev.map((d) => (d.id === id ? { ...d, content, unsaved: true } : d)),
		);
	}, []);

	const setPathDocContent = useCallback((path: string, content: string) => {
		setPathContent((prev) => ({ ...prev, [path]: content }));
		setUnsavedPaths((prev) => (prev[path] ? prev : { ...prev, [path]: true }));
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
					type: OPEN_FILE,
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
	// the file system rejects (e.g. the path no longer resolves). True when
	// the text is on disk.
	const saveExisting = useCallback(
		(path: string): boolean => {
			const entry = fs.resolve(path);
			if (entry?._readOnly || entry?._system) {
				desktopEventDispatch({
					type: "ClassicyDesktopShowErrorDialog",
					message: "This document is locked and cannot be saved.",
				});
				return false;
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
				return false;
			}
			setUnsavedPaths((prev) => {
				if (!prev[path]) return prev;
				const { [path]: _saved, ...rest } = prev;
				return rest;
			});
			return true;
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

	// --- Save changes before closing (Mac OS 8.1's SimpleText) --------------
	// Closing a window, or quitting, with unsaved text asks first:
	// "Save changes to the document “…” before closing?" with Don’t Save,
	// Cancel and Save (the default), the wording and order of SimpleText's
	// alert on Mac OS 8.1, for a close and for a Quit alike. Cancel keeps the
	// document open, and stops a Quit. Save on an untitled document goes
	// through the Save dialog; cancelling that cancels the close too.
	const [saveAlert, setSaveAlert] = useState<{
		target: SaveTarget;
		title: string;
	} | null>(null);
	const saveAlertResolveRef = useRef<((proceed: boolean) => void) | null>(null);

	const settleSaveAlert = useCallback((proceed: boolean) => {
		const resolve = saveAlertResolveRef.current;
		saveAlertResolveRef.current = null;
		setSaveAlert(null);
		resolve?.(proceed);
	}, []);

	const isUnsaved = useCallback(
		(target: SaveTarget): boolean =>
			target.kind === "untitled"
				? untitledDocs.some((d) => d.id === target.id && d.unsaved === true)
				: unsavedPaths[target.path] === true,
		[untitledDocs, unsavedPaths],
	);

	/** True (now, or once answered) when `doc` may close: saved, or the user said so. */
	const confirmClose = useCallback(
		(doc: {
			target: SaveTarget;
			title: string;
		}): boolean | Promise<boolean> => {
			if (!isUnsaved(doc.target)) return true;
			// One alert at a time: a second close while one is up waits on none.
			if (saveAlertResolveRef.current) return false;
			return new Promise<boolean>((resolve) => {
				saveAlertResolveRef.current = resolve;
				setSaveAlert({ target: doc.target, title: doc.title });
			});
		},
		[isUnsaved],
	);

	// Called by the save dialog after it has already written the file through
	// the volume. Make the new file visible everywhere and open it as a document
	// (unless the save answered "Save changes…?": the window then closes, or
	// the Quit goes on).
	const handleSaved = useCallback(
		(saved: ClassicyFileSaveResult) => {
			const target = saveTarget;
			setSaveTarget(null);
			if (saveAlertResolveRef.current) {
				fs.flushNow();
				desktopEventDispatch({ type: "ClassicyDesktopFileSystemVersionBump" });
				if (target?.kind === "untitled") {
					setUntitledDocs((prev) =>
						prev.map((d) =>
							d.id === target.id ? { ...d, unsaved: false } : d,
						),
					);
				}
				settleSaveAlert(true);
				return;
			}

			const fullPath = [...saved.path, saved.fileName].join(fs.separator);

			// The volume's write only scheduled a debounced localStorage flush, and
			// every consumer builds its own fs seeded from localStorage. Flush now,
			// then bump fsVersion so the Finder (and other apps) rebuild and see the
			// new file — otherwise it would stay invisible until the next rebuild.
			fs.flushNow();
			desktopEventDispatch({ type: "ClassicyDesktopFileSystemVersionBump" });

			desktopEventDispatch({
				type: OPEN_FILE,
				app: { id: appId },
				path: fullPath,
			});

			if (target?.kind === "untitled") {
				setUntitledDocs((prev) => prev.filter((d) => d.id !== target.id));
			}
		},
		[saveTarget, fs, desktopEventDispatch, settleSaveAlert],
	);

	const closeUntitled = useCallback((id: string) => {
		setUntitledDocs((prev) => prev.filter((d) => d.id !== id));
	}, []);

	const closePathDoc = useCallback(
		(path: string) => {
			desktopEventDispatch({
				type: CLOSE_FILE,
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

	// Quit: ask about each unsaved document, front window first (each comes
	// to the front as it is asked about); Cancel on any stops the Quit.
	const quitCascadeRef = useRef(false);
	// The documents as last drawn: the Quit asks about them.
	const docsRef = useRef(docs);
	docsRef.current = docs;
	const quitAsking = useCallback(() => {
		if (quitCascadeRef.current) return;
		quitCascadeRef.current = true;
		const windows =
			useAppManager.getState().System.Manager.Applications.apps[appId]?.windows;
		const unsaved = docsRef.current
			.filter((doc) => isUnsaved(doc.target))
			.sort(
				(a, b) =>
					(windows?.[b.windowId]?.zOrder ?? 0) -
					(windows?.[a.windowId]?.zOrder ?? 0),
			);
		const run = async () => {
			for (const doc of unsaved) {
				desktopEventDispatch({
					type: "ClassicyWindowFocus",
					app: { id: appId },
					window: { id: doc.windowId },
				});
				if (!(await confirmClose(doc))) return;
			}
			desktopEventDispatch(quitAppHelper(appId, appName, appIcon));
		};
		void run().finally(() => {
			quitCascadeRef.current = false;
		});
	}, [isUnsaved, confirmClose, desktopEventDispatch, appIcon]);

	// --- Menus -------------------------------------------------------------

	const buildAppMenu = useCallback(
		(doc: OpenDoc): ClassicyMenuItem[] => {
			const isMarkdown = doc.type === ClassicyFileSystemEntryFileType.Markdown;
			const closeNow = () => {
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
						type: CLOSE_FILE,
						app: { id: appId },
						path,
					});
				}
			};
			const closeThis = () => {
				const proceed = confirmClose(doc);
				if (proceed === true) closeNow();
				else if (proceed !== false)
					void proceed.then((ok) => {
						if (ok) closeNow();
					});
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
						// Quit asks about each unsaved document first.
						{
							...quitMenuItemHelper(appId, appName, appIcon),
							onClickFunc: quitAsking,
						},
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
			confirmClose,
			quitAsking,
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
					onBeforeClose={() => confirmClose(doc)}
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
							// A document: its bars stay while the text fits when the
							// package keeps them (System 7's SimpleText).
							fitsScrollBars={keepsFitsBars}
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
				onCancelFunc={() => {
					setSaveTarget(null);
					// Cancelling the Save dialog a "Save changes…?" Save opened
					// cancels the close (or the Quit).
					if (saveAlertResolveRef.current) settleSaveAlert(false);
				}}
			/>
			{saveAlert ? (
				<ClassicyAlert
					id={`${appId}_save_changes`}
					appId={appId}
					alertType={"caution"}
					movable={true}
					label={`Save changes to the document “${saveAlert.title}” before closing?`}
					defaultButtonId={"save"}
					buttons={[
						{
							id: "dont-save",
							label: "Don’t Save",
							role: "normal",
							onClick: () => settleSaveAlert(true),
						},
						{
							id: "cancel",
							label: "Cancel",
							role: "cancel",
							onClick: () => settleSaveAlert(false),
						},
						{
							id: "save",
							label: "Save",
							role: "default",
							onClick: () => {
								const { target } = saveAlert;
								if (target.kind === "path") {
									settleSaveAlert(saveExisting(target.path));
									return;
								}
								// An untitled document has nowhere to go yet: the Save
								// dialog answers (handleSaved, or its Cancel).
								setSaveAlert(null);
								setSaveTarget(target);
							},
						},
					]}
				/>
			) : null}
			{aboutWindow}
		</ClassicyApp>
	);
};
