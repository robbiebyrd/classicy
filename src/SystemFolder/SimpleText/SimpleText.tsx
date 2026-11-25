import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useClassicyAppIdentity } from "@/Appearance/ClassicyAppIdentity";
import { useClassicyAsset } from "@/Appearance/ClassicyAssetRegistry";
import { useClassicyAppearanceLayout } from "@/Appearance/useClassicyAppearanceLayout";
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
import { useClassicyBundledAccessKeys } from "@/SystemFolder/SystemResources/Keyboard/ClassicyAccessKeys.internal";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import { ClassicyRichTextEditor } from "@/SystemFolder/SystemResources/RichTextEditor/ClassicyRichTextEditor";
import { useClassicyFitsScrollBars } from "@/SystemFolder/SystemResources/ScrollArea/useClassicyFitsScrollBars";
import { ClassicyTextEditor } from "@/SystemFolder/SystemResources/TextEditor/ClassicyTextEditor";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";
import { useClassicyWindowViewState } from "@/SystemFolder/SystemResources/Window/ClassicyWindowViewState.internal";

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

/** A file entry's text, as SimpleText reads it: `""` when it holds none. */
const storedText = (entry: { _data?: unknown } | undefined | null): string =>
	typeof entry?._data === "string" ? entry._data : "";

// The unsaved-changes prompt (`layout.document.confirmUnsavedClose`):
// the document asked about, and how its answer resolves the close or quit
// waiting on it (`true` to go on, `false` to keep the document open).
type UnsavedPrompt = {
	doc: OpenDoc;
	resolve: (proceed: boolean) => void;
};

/**
 * A document window's editor, with the window's view state put back under
 * a package's `layout.window.restoreViewState` (WIG Ch.2 "Persistence",
 * p.12): the plain-text editor's caret and scroll offsets, for a document
 * with a file (an untitled one is new each time). The Markdown editor grows
 * with its text, so its window scrolls, and the window keeps that offset.
 */
const SimpleTextDocumentEditor = ({
	doc,
	fitsScrollBars,
	onTextChange,
}: {
	doc: OpenDoc;
	fitsScrollBars: boolean;
	onTextChange: (doc: OpenDoc, text: string, normalized?: boolean) => void;
}) => {
	const viewState = useClassicyWindowViewState(appId, doc.windowId);
	const keepsView = doc.target.kind === "path";
	if (doc.type === ClassicyFileSystemEntryFileType.Markdown) {
		return (
			<ClassicyRichTextEditor
				content={doc.content}
				onChangeFunc={(markdown, normalized) =>
					onTextChange(doc, markdown, normalized)
				}
			/>
		);
	}
	return (
		<ClassicyTextEditor
			content={doc.content}
			// A document: its bars stay while the text fits when the
			// package keeps them (System 7's SimpleText).
			fitsScrollBars={fitsScrollBars}
			onChangeFunc={(e) => onTextChange(doc, e.target.value)}
			{...(keepsView
				? {
						initialCaret: viewState.initialCaret,
						onCaretSettled: viewState.onCaretSettled,
						initialScroll: viewState.initialScroll,
						onScrollSettled: viewState.onScrollSettled,
					}
				: {})}
		/>
	);
};

export const SimpleText = () => {
	const appIcon =
		useClassicyAsset("icons", "applications.simpletext.app") ?? "";
	const desktopEventDispatch = useAppManagerDispatch();
	const appState = useAppManager(
		(state) => state.System.Manager.Applications.apps[appId],
	);

	const fs = useClassicyFileSystem();
	// Notepad's ways under a package that declares them: a changed document
	// asks before it closes (`document.confirmUnsavedClose`; WIG Ch.1
	// "Forgiveness", pp.2-3, Ch.5 "View Operations", p.46, "Transactions",
	// p.49), and File ▸ Open… and Save carry CTRL+O and CTRL+S
	// (`menu.standardShortcuts`; WIG Appendix B Table B.2, p.358).
	const layout = useClassicyAppearanceLayout();
	const confirmsUnsaved = layout.document?.confirmUnsavedClose === true;
	const standardShortcuts = layout.menu?.standardShortcuts === "windows";
	// The name the message box is titled with: the app as the package shows
	// it (Notepad's MessageBox caption is the application's name).
	const shownName = useClassicyAppIdentity(appId, {
		name: appName,
		icon: appIcon,
	}).name;
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
	// The working copies as last rendered, for a save or a dirty check made
	// from a later render than the one that started it (the Quit cascade).
	const pathContentRef = useRef(pathContent);
	pathContentRef.current = pathContent;
	// Live plain/styled view overrides keyed by path (the choice is also
	// persisted onto the entry via setMetadata so it survives a reload).
	const [pathTypeOverrides, setPathTypeOverrides] = useState<
		Record<string, SimpleTextFileType>
	>({});
	// Untitled (never-saved) documents.
	const [untitledDocs, setUntitledDocs] = useState<UntitledDoc[]>([]);

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

	// The Markdown editor's own rewrite of a file's text as it loaded it
	// (MDXEditor's normalization), by path: the document is unchanged while
	// its working copy is that text.
	const normalizedTextRef = useRef<Record<string, string>>({});
	const setDocText = useCallback(
		(doc: OpenDoc, text: string, normalized?: boolean) => {
			if (normalized && doc.target.kind === "path") {
				normalizedTextRef.current[doc.target.path] = text;
			}
			if (doc.target.kind === "untitled") {
				setUntitledContent(doc.target.id, text);
			} else {
				setPathDocContent(doc.target.path, text);
			}
		},
		[setUntitledContent, setPathDocContent],
	);

	const closeWindow = useClassicyWindowClose(appId);
	const editMenu = useClassicyEditMenu(appId);
	// The menus' access keys under a package that has them: Notepad's and
	// WordPad's (notepad.exe "&File", "&New", "&Open...", "&Save", "Save
	// &As..."; wordpad.exe "F&ormat"; WIG Appendix B Table B.5: Close C,
	// Help H); Quit is unmarked.
	const ak = useClassicyBundledAccessKeys();
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
	// the file system rejects (e.g. the path no longer resolves). Returns
	// whether the text was written.
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
				_data: pathContentRef.current[path] ?? "",
				_modifiedOn: new Date(dateTime),
			});
			if (!wrote) {
				desktopEventDispatch({
					type: "ClassicyDesktopShowErrorDialog",
					message:
						"This document could not be saved. It may have been moved or deleted.",
				});
			}
			return wrote;
		},
		[fs, dateTime, desktopEventDispatch],
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

	// A close or quit waiting on the Save As… dialog an unsaved prompt's Yes
	// opened for an untitled document: saved, the close goes on; cancelled, it
	// stops and the document stays open.
	const closeAfterSaveRef = useRef<{
		target: SaveTarget;
		resolve: (proceed: boolean) => void;
	} | null>(null);

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

			// Saved on the way to closing it: the document closes, as Notepad's
			// does, rather than reopening under its new name.
			const closing = closeAfterSaveRef.current;
			if (closing && target && sameTarget(closing.target, target)) {
				closeAfterSaveRef.current = null;
				closing.resolve(true);
				return;
			}

			desktopEventDispatch({
				type: OPEN_FILE,
				app: { id: appId },
				path: fullPath,
			});

			if (target?.kind === "untitled") {
				setUntitledDocs((prev) => prev.filter((d) => d.id !== target.id));
			}
		},
		[saveTarget, fs, desktopEventDispatch],
	);

	const cancelSave = useCallback(() => {
		setSaveTarget(null);
		const closing = closeAfterSaveRef.current;
		closeAfterSaveRef.current = null;
		closing?.resolve(false);
	}, []);

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

	// The documents as last rendered, for the Quit cascade, which looks for
	// the next changed one after an earlier answer re-rendered.
	const docsRef = useRef(docs);
	docsRef.current = docs;

	// --- Unsaved changes ---------------------------------------------------

	// Close a document's window now: an untitled one just goes; a file's
	// window closes and its working copy is dropped (CloseFile).
	const closeDocNow = useCallback(
		(doc: OpenDoc) => {
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
		},
		[desktopEventDispatch, closeUntitled, closeWindow],
	);

	// Changed since it was opened or saved: a file's working copy differs from
	// the file's text, or an untitled document holds any text.
	const isDirty = useCallback(
		(doc: OpenDoc): boolean => {
			if (doc.target.kind === "untitled") return doc.content !== "";
			const working = pathContentRef.current[doc.target.path];
			return (
				working !== undefined &&
				working !== storedText(fs.resolve(doc.target.path)) &&
				working !== normalizedTextRef.current[doc.target.path]
			);
		},
		[fs],
	);

	// The message box asking about one document; one at a time.
	const [unsavedPrompt, setUnsavedPrompt] = useState<UnsavedPrompt | null>(
		null,
	);
	const askToSave = useCallback(
		(doc: OpenDoc) =>
			new Promise<boolean>((resolve) => {
				setUnsavedPrompt({ doc, resolve });
			}),
		[],
	);

	// The close guard every close of a document goes through (its close box,
	// File ▸ Close): `true` at once for an unchanged document, or under a
	// package that does not ask; else the answer to Notepad's message box.
	const confirmClose = useCallback(
		(doc: OpenDoc): boolean | Promise<boolean> => {
			if (!confirmsUnsaved) return true;
			const fresh = docsRef.current.find((d) => d.key === doc.key) ?? doc;
			return isDirty(fresh) ? askToSave(fresh) : true;
		},
		[confirmsUnsaved, isDirty, askToSave],
	);

	// The message box's answer. Yes saves (an untitled document through Save
	// As…, the close waiting for it) and goes on once saved; No goes on, the
	// close discarding the working copy; Cancel keeps the document open.
	const answerUnsavedPrompt = useCallback(
		(answer: "yes" | "no" | "cancel") => {
			const prompt = unsavedPrompt;
			if (!prompt) return;
			setUnsavedPrompt(null);
			const { doc, resolve } = prompt;
			if (answer === "cancel") {
				resolve(false);
			} else if (answer === "no") {
				resolve(true);
			} else if (doc.target.kind === "path") {
				resolve(saveExisting(doc.target.path));
			} else {
				closeAfterSaveRef.current = { target: doc.target, resolve };
				setSaveTarget(doc.target);
			}
		},
		[unsavedPrompt, saveExisting],
	);

	// Quit, under `document.confirmUnsavedClose`: each changed document in
	// turn comes forward and asks, as HyperCard's Quit walks its stacks; each
	// answered Yes or No closes, and a Cancel stops the Quit with the rest
	// open. Then the app quits.
	const handleQuit = useCallback(() => {
		const run = async (): Promise<void> => {
			const asked = new Set<string>();
			for (;;) {
				const next = docsRef.current.find(
					(d) => !asked.has(d.key) && isDirty(d),
				);
				if (!next) break;
				asked.add(next.key);
				desktopEventDispatch({
					type: "ClassicyWindowFocus",
					app: { id: appId },
					window: { id: next.windowId },
				});
				const proceed = await askToSave(next);
				if (!proceed) return;
				closeDocNow(next);
			}
			desktopEventDispatch(quitAppHelper(appId, appName, appIcon));
		};
		void run();
	}, [isDirty, askToSave, closeDocNow, desktopEventDispatch, appIcon]);

	// --- Menus -------------------------------------------------------------

	const buildAppMenu = useCallback(
		(doc: OpenDoc): ClassicyMenuItem[] => {
			const isMarkdown = doc.type === ClassicyFileSystemEntryFileType.Markdown;
			// File ▸ Close goes through the same guard as the close box.
			const closeThis = () => {
				const proceed = confirmClose(doc);
				if (proceed === true) closeDocNow(doc);
				else if (proceed !== false) {
					void proceed.then((ok) => {
						if (ok) closeDocNow(doc);
					});
				}
			};
			const quitItem = quitMenuItemHelper(appId, appName, appIcon, ak(""));

			return [
				{
					id: `${doc.windowId}_file`,
					title: "File",
					accessKey: ak("f"),
					menuChildren: [
						{
							id: `${doc.windowId}_new`,
							title: "New",
							accessKey: ak("n"),
							onClickFunc: newFile,
						},
						{
							id: `${doc.windowId}_open`,
							title: "Open…",
							accessKey: ak("o"),
							...(standardShortcuts ? { keyboardShortcut: "⌃O" } : {}),
							onClickFunc: () => setShowOpenDialog(true),
						},
						{ id: "spacer" },
						{
							id: `${doc.windowId}_close`,
							title: "Close",
							accessKey: ak("c"),
							onClickFunc: closeThis,
						},
						{
							id: `${doc.windowId}_save`,
							title: "Save",
							accessKey: ak("s"),
							...(standardShortcuts ? { keyboardShortcut: "⌃S" } : {}),
							onClickFunc: () => saveDoc(doc.target),
						},
						{
							id: `${doc.windowId}_save_as`,
							title: "Save As…",
							accessKey: ak("A"),
							onClickFunc: () => setSaveTarget(doc.target),
						},
						{ id: "spacer" },
						confirmsUnsaved
							? { ...quitItem, onClickFunc: handleQuit }
							: quitItem,
					],
				},
				editMenu,
				{
					id: `${doc.windowId}_format`,
					title: "Format",
					accessKey: ak("o"),
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
					accessKey: ak("h"),
					menuChildren: [aboutMenuItem],
				},
			];
		},
		[
			ak,
			newFile,
			saveDoc,
			toggleType,
			confirmClose,
			closeDocNow,
			confirmsUnsaved,
			standardShortcuts,
			handleQuit,
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
					// Under `document.confirmUnsavedClose`, the close box asks
					// first; without it the window has no veto, as before.
					onBeforeClose={confirmsUnsaved ? () => confirmClose(doc) : undefined}
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
					<SimpleTextDocumentEditor
						doc={doc}
						fitsScrollBars={keepsFitsBars}
						onTextChange={setDocText}
					/>
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
				onCancelFunc={cancelSave}
			/>
			{unsavedPrompt && (
				// Notepad's message box (notepad.exe's strings, read from the
				// Windows 98 SE CD: "The text in the %% file has changed.", a
				// blank line, "Do you want to save the changes?"; "Untitled"),
				// with the exclamation icon and Yes, No and Cancel, Yes the
				// default.
				<ClassicyAlert
					id={`${appId}_unsaved_changes`}
					appId={appId}
					alertType={"caution"}
					movable={true}
					title={shownName}
					label={`The text in the ${unsavedPrompt.doc.title} file has changed.`}
					message={"Do you want to save the changes?"}
					defaultButtonId={"yes"}
					buttons={[
						{
							id: "yes",
							label: "Yes",
							role: "default",
							onClick: () => answerUnsavedPrompt("yes"),
						},
						{
							id: "no",
							label: "No",
							onClick: () => answerUnsavedPrompt("no"),
						},
						{
							id: "cancel",
							label: "Cancel",
							role: "cancel",
							onClick: () => answerUnsavedPrompt("cancel"),
						},
					]}
				/>
			)}
			{aboutWindow}
		</ClassicyApp>
	);
};
