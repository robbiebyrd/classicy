import "./ClassicyFileOpenDialog.scss";
import classNames from "classnames";
import {
	type CSSProperties,
	type FC as FunctionalComponent,
	type KeyboardEvent,
	type MouseEvent,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { useClassicyAsset } from "@/Appearance/ClassicyAssetRegistry";
import { useClassicyAppearanceLayout } from "@/Appearance/useClassicyAppearanceLayout";
import { readClassicyThemeVar } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetricReader";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyAlert } from "@/SystemFolder/SystemResources/Alert/ClassicyAlert";
import { ClassicyButton } from "@/SystemFolder/SystemResources/Button/ClassicyButton";
import { ClassicyIconImage } from "@/SystemFolder/SystemResources/Icon/ClassicyIconImage.internal";
import { ClassicyInput } from "@/SystemFolder/SystemResources/Input/ClassicyInput";
import { ClassicyInputDialog } from "@/SystemFolder/SystemResources/InputDialog/ClassicyInputDialog";
import { useKeyboardEquivalents } from "@/SystemFolder/SystemResources/Keyboard/useKeyboardEquivalents";
import { ClassicyPixelArt } from "@/SystemFolder/SystemResources/PixelArt/ClassicyPixelArt";
import { ClassicyPopUpMenu } from "@/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu";
import { ClassicyScrollArea } from "@/SystemFolder/SystemResources/ScrollArea/ClassicyScrollArea";
import { useClassicyFitsBarPolicy } from "@/SystemFolder/SystemResources/ScrollArea/useClassicyFitsScrollBars";
import {
	ClassicyTree,
	type ClassicyTreeNode,
} from "@/SystemFolder/SystemResources/Tree/ClassicyTree";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";
import {
	type ClassicyFileDialogEntry,
	type ClassicyFileDialogVolume,
	ClassicyFileExistsError,
} from "./ClassicyFileDialogVolume";

/** One chosen file, as handed to `onOpenFunc`. */
export type ClassicyFileOpenSelection = {
	/** Id of the volume the file lives on. */
	volumeId: string;
	/** Folder names from the volume root to the file's parent folder. */
	path: string[];
	/** The file's listing entry, including any opaque `meta` the volume attached. */
	entry: ClassicyFileDialogEntry;
};

/** One choice in a save dialog's Format pop-up. */
export type ClassicyFileSaveFormat = {
	/** Shown in the Format pop-up, e.g. "HyperCard Stack". */
	label: string;
	/** Non-editable suffix auto-appended to the name, e.g. ".stack". */
	extension: string;
	/** ClassicyFileSystemEntryFileType value for the created entry. */
	fileType: string;
	/** Icon for the created entry; the volume falls back to iconImageByType. */
	icon?: string;
	/** Lazy content provider, called only when the user commits a save. */
	data: () => string | Promise<string>;
};

/** What was written, as handed to `onSaveFunc`. */
export type ClassicyFileSaveResult = {
	/** Id of the volume written to. */
	volumeId: string;
	/** Folder names from the volume root to the target folder (`[]` = root). */
	path: string[];
	/** The committed file name; includes the extension. */
	fileName: string;
	/** The format the user chose. */
	format: ClassicyFileSaveFormat;
};

type ClassicyFileDialogSharedProps = {
	/** Window id; must be unique per dialog. Also prefixes the ids of its controls. */
	id: string;
	/** Id of the owning app (the enclosing `ClassicyApp`). */
	appId: string;
	/**
	 * Shows the dialog when true; renders nothing when false. Each false → true
	 * transition starts a fresh session (selection, name and folder caches reset).
	 * The dialog never closes itself — set this false from your callbacks.
	 */
	open: boolean;
	/** Title-bar text. Defaults to `"Open"` or `"Save"` by mode. */
	title?: string;
	/**
	 * Volumes offered in the Volume pop-up; the first is shown on open. Build
	 * them with `desktopVolume(fs)` / `fileSystemVolume(fs, drive)` or implement
	 * `ClassicyFileDialogVolume`. Keep the array stable (e.g. `useMemo`).
	 */
	volumes: ClassicyFileDialogVolume[];
	/** Called when Cancel, Escape or Command-period fires. */
	onCancelFunc?: () => void;
	/** Extra class names, merged onto the dialog window after the component's own. */
	className?: string;
	/** Inline style, merged onto the dialog window after the component's own. */
	style?: CSSProperties;
};

export type ClassicyFileDialogOpenProps = ClassicyFileDialogSharedProps & {
	/** Selects open mode; set for you by `ClassicyFileOpenDialog`. */
	mode: "open";
	/**
	 * `"single"` picks one file; `"multi"` adds Command/Ctrl-click to toggle and
	 * Shift-click to extend within one folder. Defaults to `"single"`.
	 */
	selectionMode?: "single" | "multi";
	/**
	 * Entries for the Show pop-up (shown only when non-empty); the first is
	 * active on open. `types` lists the `fileType`s that stay selectable —
	 * `null` means all; other files are dimmed. Folders are never filtered.
	 */
	fileTypeFilters?: { label: string; types: string[] | null }[];
	/**
	 * Called with the chosen files when Open is clicked, Return is pressed or a
	 * file is double-clicked. Never called with an empty array.
	 */
	onOpenFunc: (selections: ClassicyFileOpenSelection[]) => void;
};

export type ClassicyFileDialogSaveProps = ClassicyFileDialogSharedProps & {
	/** Selects save mode; set for you by `ClassicyFileSaveDialog`. */
	mode: "save";
	/**
	 * At least one; the first is the default selection. The Format pop-up is
	 * shown only when there is more than one.
	 */
	formats: ClassicyFileSaveFormat[];
	/** Pre-filled name, extension NOT included. Defaults to `""`. */
	defaultFileName?: string;
	/** Called after the active volume's `write` succeeds. */
	onSaveFunc: (saved: ClassicyFileSaveResult) => void;
	/**
	 * Called with the thrown error when a save or New Folder fails; the dialog
	 * also shows its own stop alert.
	 */
	onErrorFunc?: (error: unknown) => void;
};

/** Props for `ClassicyFileDialog`: open or save mode, discriminated by `mode`. */
export type ClassicyFileDialogProps =
	| ClassicyFileDialogOpenProps
	| ClassicyFileDialogSaveProps;

const SEP = "\u0000";
type FolderState = ClassicyFileDialogEntry[] | "loading" | "error";

const cacheKey = (volumeId: string, path: string[]) =>
	[volumeId, ...path].join(SEP);

/**
 * The standard Mac OS 8 file dialog, a movable modal window (HIGOS8 Ch.3
 * "Movable Modal Dialog Boxes", p.59: no close box) that browses the
 * Classicy file system — or any `ClassicyFileDialogVolume` — in open or save
 * mode. Prefer the `ClassicyFileOpenDialog` / `ClassicyFileSaveDialog`
 * wrappers, which fix `mode`.
 *
 * Folders load lazily as they are expanded. Escape / Command-period cancel.
 * The dialog is controlled by `open` and never closes itself.
 */
export const ClassicyFileDialog: FunctionalComponent<
	ClassicyFileDialogProps
> = (props) => {
	const { id, appId, open, volumes, onCancelFunc, className, style } = props;
	const dialogBodyRef = useRef<HTMLDivElement | null>(null);
	const mode = props.mode;
	const title = props.title ?? (mode === "open" ? "Open" : "Save");
	const selectionMode =
		props.mode === "open" ? (props.selectionMode ?? "single") : "single";
	const fileTypeFilters =
		props.mode === "open" ? props.fileTypeFilters : undefined;
	const formats = props.mode === "save" ? props.formats : [];

	const [activeVolumeId, setActiveVolumeId] = useState(volumes[0]?.id);
	// The file list keeps its vertical bar while its items fit under a
	// package that keeps the bars (System 7's Standard File, HIG7 p.160).
	const wellVerticalPolicy = useClassicyFitsBarPolicy();
	const [folders, setFolders] = useState<Map<string, FolderState>>(new Map());
	const [selectedIds, setSelectedIds] = useState<string[]>([]);
	const [filterIndex, setFilterIndex] = useState(0);
	// save-mode state
	const [fileName, setFileName] = useState("");
	const [formatIndex, setFormatIndex] = useState(0);
	const [saving, setSaving] = useState(false);
	// final file name (extension included) awaiting the Replace confirmation
	const [replacePrompt, setReplacePrompt] = useState<string | null>(null);
	const [newFolderOpen, setNewFolderOpen] = useState(false);
	const [errorPrompt, setErrorPrompt] = useState<
		"save" | "folder" | "folderCollision" | null
	>(null);
	// node id → selection payload, rebuilt whenever buildNodes actually runs
	const nodeIndex = useRef(new Map<string, ClassicyFileOpenSelection>());

	const activeVolume = volumes.find((v) => v.id === activeVolumeId);
	// System 7.5's Standard File box goes to the desktop with its Desktop
	// button (`*-755-dialog-standardfile-layout.png`): the volume
	// `desktopVolume(fs)` builds, when one is offered.
	const desktopVolumeOffered = volumes.find((v) => v.id === "desktop");
	// A fixed modal dialog box under a package whose layout says so (System
	// 7); else the movable modal window of HIGOS8 p.59.
	const dialogLayout = useClassicyAppearanceLayout().fileDialog;
	const fixedFrame = dialogLayout?.frame === "fixed";
	// System 7.5's Standard File browses one folder at a time (the package's
	// `fileDialog.navigation: "flat"`): its contents only, a folder entered by
	// a double-click or Open, the pop-up listing the path upward. Else the
	// folders expand in place (Mac OS 8's tree).
	const flat = dialogLayout?.navigation === "flat";
	// The folder flat navigation shows, from the volume root.
	const [currentPath, setCurrentPath] = useState<string[]>([]);
	// Flat navigation's folder rows, by node id: selectable, entered on Open.
	const folderIndex = useRef(new Set<string>());
	// Flat rows each draw a small icon: an entry's own, else the generic
	// folder's or document's (read at render, never captured at load).
	const folderIcon = useClassicyAsset("icons", "system.folders.directory");
	const fileIcon = useClassicyAsset("icons", "system.files.file");
	// The pop-up's current level: the package's open folder when it registers
	// one (System 7.5's Standard File), else the folder.
	const openFolderIcon = useClassicyAsset("systemArt", "openFolderIcon");
	// The box's size: the theme's optional `fileDialog.width` / `height` for
	// Open and `fileDialog.saveWidth` / `saveHeight` for Save (System 7's
	// Standard File boxes), else Mac OS 8's 440 x 400. Read once per opening
	// and theme, never on every render.
	const themeId = useAppManager(
		(s) => s.System.Manager.Appearance?.activeTheme?.id,
	);
	// biome-ignore lint/correctness/useExhaustiveDependencies: an opening and a theme change are when the size is read; the reader reads the DOM
	const dialogSize = useMemo((): [number, number] => {
		const prefix = mode === "save" ? "--file-dialog-save-" : "--file-dialog-";
		return [
			readClassicyThemeVar(`${prefix}width`, 440),
			readClassicyThemeVar(`${prefix}height`, 400),
		];
	}, [open, mode, themeId]);
	const activeTypes = fileTypeFilters?.[filterIndex]?.types ?? null;
	const activeFormat: ClassicyFileSaveFormat | undefined = formats[formatIndex];

	const setFolder = (key: string, state: FolderState) =>
		setFolders((prev) => new Map(prev).set(key, state));

	const loadFolder = (volume: ClassicyFileDialogVolume, path: string[]) => {
		const key = cacheKey(volume.id, path);
		setFolder(key, "loading");
		volume
			.list(path)
			.then((entries) => setFolder(key, entries))
			.catch(() => setFolder(key, "error"));
	};

	// fresh dialog session: reset caches, load the first volume's root
	// biome-ignore lint/correctness/useExhaustiveDependencies: this effect must fire only on open transitions — volumes/loadFolder are read fresh from the current closure, not tracked as invalidation keys
	useEffect(() => {
		if (!open || volumes.length === 0) return;
		setFolders(new Map());
		setSelectedIds([]);
		setFilterIndex(0);
		setFileName(props.mode === "save" ? (props.defaultFileName ?? "") : "");
		setFormatIndex(0);
		setSaving(false);
		setReplacePrompt(null);
		setNewFolderOpen(false);
		setErrorPrompt(null);
		setActiveVolumeId(volumes[0].id);
		setCurrentPath([]);
		loadFolder(volumes[0], []);
	}, [open]);

	// Save mode dims every file: they give context, but only folders are targets.
	const isEntryDisabled = (entry: ClassicyFileDialogEntry) =>
		entry.kind === "file" &&
		(mode === "save" ||
			(activeTypes !== null && !activeTypes.includes(entry.fileType ?? "")));

	const buildNodes = (
		volume: ClassicyFileDialogVolume,
		path: string[],
	): ClassicyTreeNode[] => {
		const state = folders.get(cacheKey(volume.id, path));
		if (state === "loading" || state === undefined) {
			return [
				{
					id: `${cacheKey(volume.id, path)}${SEP}#loading`,
					label: "Loading…",
					disabled: true,
				},
			];
		}
		if (state === "error") {
			return [
				{
					id: `${cacheKey(volume.id, path)}${SEP}#error`,
					label: "Couldn't open this folder",
					selectable: false,
					buttons: [
						{ label: "Retry", onClickFunc: () => loadFolder(volume, path) },
					],
				},
			];
		}
		return state.map((entry) => {
			if (entry.kind === "folder") {
				// A folder node's id IS its children's cache key, so the toggle
				// handler can split it straight back into path names.
				return {
					id: cacheKey(volume.id, [...path, entry.name]),
					label: entry.name,
					leftIcon: entry.icon,
					children: buildNodes(volume, [...path, entry.name]),
					// Save mode's folder tree is a target picker (single click
					// selects); open mode leaves folders as pure navigation
					// (single click only expands/collapses).
					branchSelectable: mode === "save",
				};
			}
			const nodeId = `${cacheKey(volume.id, path)}${SEP}${entry.id}`;
			const disabled = isEntryDisabled(entry);
			// Filtered-out entries are excluded from the selection index so a
			// filter change that grays out a selected file also prunes it.
			if (!disabled) {
				nodeIndex.current.set(nodeId, { volumeId: volume.id, path, entry });
			}
			return {
				id: nodeId,
				label: entry.name,
				leftIcon: entry.icon,
				disabled,
			};
		});
	};

	// Flat navigation's rows: the folder's own contents, no children, every
	// row with its small icon; a folder row is selectable (Open enters it).
	const buildFlatNodes = (
		volume: ClassicyFileDialogVolume,
		path: string[],
	): ClassicyTreeNode[] => {
		const state = folders.get(cacheKey(volume.id, path));
		if (!Array.isArray(state)) return buildNodes(volume, path);
		return state.map((entry) => {
			if (entry.kind === "folder") {
				const id = cacheKey(volume.id, [...path, entry.name]);
				folderIndex.current.add(id);
				return { id, label: entry.name, leftIcon: entry.icon ?? folderIcon };
			}
			const nodeId = `${cacheKey(volume.id, path)}${SEP}${entry.id}`;
			const disabled = isEntryDisabled(entry);
			if (!disabled) {
				nodeIndex.current.set(nodeId, { volumeId: volume.id, path, entry });
			}
			return {
				id: nodeId,
				label: entry.name,
				leftIcon: entry.icon ?? fileIcon,
				disabled,
			};
		});
	};

	// biome-ignore lint/correctness/useExhaustiveDependencies: buildNodes/isEntryDisabled are recreated each render and close over folders/activeTypes already; activeVolume/folders/filterIndex/currentPath/flat are the actual invalidation keys
	const nodes = useMemo(() => {
		// Only clear/repopulate the index when buildNodes actually runs for
		// these deps — resetting it unconditionally on every render would wipe
		// it out on renders that reuse the memoized node tree (e.g. a pure
		// selection change), breaking lookups for the next interaction.
		nodeIndex.current = new Map();
		folderIndex.current = new Set();
		if (!activeVolume) return [];
		return flat
			? buildFlatNodes(activeVolume, currentPath)
			: buildNodes(activeVolume, []);
	}, [activeVolume, folders, filterIndex, currentPath, flat]);

	const isFlatFolder = (nodeId: string) =>
		flat && folderIndex.current.has(nodeId);
	// Flat Save with a folder selected: its default button is Open, which
	// enters the folder (7.5's Standard File).
	const saveFolderSelected =
		mode === "save" &&
		selectedIds.length === 1 &&
		isFlatFolder(selectedIds[0] ?? "");

	// Flat navigation: shows a folder (by its node id, its cache key).
	const enterFolder = (nodeId: string) => {
		if (!activeVolume) return;
		const [, ...pathNames] = nodeId.split(SEP);
		setCurrentPath(pathNames);
		setSelectedIds([]);
		if (!folders.has(nodeId)) loadFolder(activeVolume, pathNames);
	};

	// Open mode prunes selections the filter disabled or a reload removed; in
	// save mode the selection is a folder, which is never in the file index.
	const liveSelectedIds =
		mode === "save"
			? selectedIds
			: selectedIds.filter(
					(sid) => nodeIndex.current.has(sid) || isFlatFolder(sid),
				);

	// In save mode the single selected id is always a folder node (files are
	// disabled); its id is the cache key, i.e. volume id + path segments.
	// Flat navigation saves into the folder shown.
	const selectedFolderPath = flat
		? currentPath
		: mode === "save" && selectedIds[0]
			? selectedIds[0].split(SEP).slice(1)
			: [];

	const handleFolderToggle = (nodeId: string, isOpen: boolean) => {
		if (!activeVolume || !isOpen) return;
		if (nodeId.includes(`${SEP}#`)) return; // placeholder rows
		if (!folders.has(nodeId)) {
			const [, ...pathNames] = nodeId.split(SEP);
			loadFolder(activeVolume, pathNames);
		}
	};

	const handleSelect = (
		nodeId: string,
		_node: ClassicyTreeNode,
		e: unknown,
	) => {
		if (mode === "save" || isFlatFolder(nodeId)) {
			// Files are disabled in save mode and never fire selection, so any
			// id here is a folder (placeholder rows aside); a flat folder row is
			// picked alone.
			if (nodeId.includes(`${SEP}#`)) return;
			setSelectedIds([nodeId]);
			return;
		}
		if (!nodeIndex.current.has(nodeId)) return;
		if (selectionMode === "single") {
			setSelectedIds([nodeId]);
			return;
		}
		const ev = e as MouseEvent;
		if (ev?.metaKey || ev?.ctrlKey) {
			setSelectedIds((prev) =>
				prev.includes(nodeId)
					? prev.filter((x) => x !== nodeId)
					: [...prev, nodeId],
			);
		} else if (ev?.shiftKey && selectedIds.length > 0) {
			// range within the same parent folder
			const anchor = selectedIds[selectedIds.length - 1];
			const parentOf = (nid: string) => nid.slice(0, nid.lastIndexOf(SEP));
			if (parentOf(anchor) === parentOf(nodeId)) {
				const siblings = [...nodeIndex.current.keys()].filter(
					(nid) => parentOf(nid) === parentOf(nodeId),
				);
				const [a, b] = [siblings.indexOf(anchor), siblings.indexOf(nodeId)];
				const range = siblings.slice(Math.min(a, b), Math.max(a, b) + 1);
				setSelectedIds((prev) => [...new Set([...prev, ...range])]);
			} else {
				setSelectedIds([nodeId]);
			}
		} else {
			setSelectedIds([nodeId]);
		}
	};

	const commitOpen = (ids: string[]) => {
		if (props.mode !== "open") return;
		// Flat navigation: Open on a folder enters it.
		if (ids.length === 1 && isFlatFolder(ids[0])) {
			enterFolder(ids[0]);
			return;
		}
		const selections = ids
			.map((nid) => nodeIndex.current.get(nid))
			.filter((s): s is ClassicyFileOpenSelection => s !== undefined);
		if (selections.length > 0) {
			props.onOpenFunc(selections);
		}
	};

	// --- save mode -----------------------------------------------------------

	const trimmedName = fileName.trim();
	// Strip a user-typed copy of the extension once (case-insensitive) so the
	// committed name never doubles it, then re-append the canonical extension.
	const strippedBase =
		activeFormat &&
		trimmedName.toLowerCase().endsWith(activeFormat.extension.toLowerCase())
			? trimmedName.slice(0, trimmedName.length - activeFormat.extension.length)
			: trimmedName;
	const finalFileName = activeFormat
		? `${strippedBase}${activeFormat.extension}`
		: trimmedName;
	const canSave =
		mode === "save" &&
		strippedBase.trim().length > 0 &&
		!trimmedName.includes(":") &&
		activeVolume?.write !== undefined &&
		activeFormat !== undefined &&
		!saving;

	// The listing may be missing when a folder was selected without ever being
	// expanded — fetch it on demand for the collision check.
	const ensureListing = async (
		volume: ClassicyFileDialogVolume,
		path: string[],
	): Promise<ClassicyFileDialogEntry[]> => {
		const cached = folders.get(cacheKey(volume.id, path));
		if (Array.isArray(cached)) return cached;
		const entries = await volume.list(path);
		setFolder(cacheKey(volume.id, path), entries);
		return entries;
	};

	const commitSave = async (confirmedName?: string) => {
		if (props.mode !== "save") return;
		// Flat navigation, a folder selected: Save is Open, and enters it
		// (System 7.5's Standard File).
		if (confirmedName === undefined && saveFolderSelected) {
			enterFolder(selectedIds[0]);
			return;
		}
		if (!activeVolume?.write || !activeFormat) return;
		if (confirmedName === undefined && !canSave) return;
		const targetName = confirmedName ?? finalFileName;
		const path = selectedFolderPath;
		setSaving(true);
		try {
			if (confirmedName === undefined) {
				const entries = await ensureListing(activeVolume, path);
				const collision = entries.find((e) => e.name === targetName);
				// A folder collision is refused outright: the underlying write
				// would replace the directory subtree wholesale, destroying it.
				// Only a same-named file offers the existing Replace prompt.
				if (collision?.kind === "folder") {
					setErrorPrompt("folderCollision");
					return;
				}
				if (collision?.kind === "file") {
					setReplacePrompt(targetName);
					return;
				}
			}
			const data = await activeFormat.data();
			try {
				// overwrite only when the user already confirmed a replace. The
				// listing check above catches a collision that is already visible;
				// passing overwrite=false here makes the write itself reject (atomically,
				// inside the volume) a collision that appeared after that check — a
				// concurrent save to the same path — so it re-prompts instead of
				// silently clobbering.
				await activeVolume.write(
					path,
					targetName,
					{ data, fileType: activeFormat.fileType, icon: activeFormat.icon },
					{ overwrite: confirmedName !== undefined },
				);
			} catch (error) {
				if (error instanceof ClassicyFileExistsError) {
					if (error.entryKind === "folder") {
						setErrorPrompt("folderCollision");
					} else {
						setReplacePrompt(targetName);
					}
					return;
				}
				throw error;
			}
			loadFolder(activeVolume, path);
			props.onSaveFunc({
				volumeId: activeVolume.id,
				path,
				fileName: targetName,
				format: activeFormat,
			});
		} catch (error) {
			setErrorPrompt("save");
			props.onErrorFunc?.(error);
		} finally {
			setSaving(false);
		}
	};

	const handleCreateFolder = async (rawName: string) => {
		if (props.mode !== "save") return;
		if (!activeVolume?.mkDir) return;
		const name = rawName.trim();
		if (name.length === 0 || name.includes(":")) return;
		const path = selectedFolderPath;
		try {
			await activeVolume.mkDir(path, name);
			loadFolder(activeVolume, path);
			if (flat) enterFolder(cacheKey(activeVolume.id, [...path, name]));
			else setSelectedIds([cacheKey(activeVolume.id, [...path, name])]);
			setNewFolderOpen(false);
		} catch (error) {
			setErrorPrompt("folder");
			props.onErrorFunc?.(error);
		}
	};

	const switchVolume = (volumeId: string) => {
		const nextVolume = volumes.find((v) => v.id === volumeId);
		setActiveVolumeId(volumeId);
		setCurrentPath([]);
		setSelectedIds([]);
		if (nextVolume && !folders.has(cacheKey(nextVolume.id, []))) {
			loadFolder(nextVolume, []);
		}
	};

	const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
		if (mode === "open" && e.key === "Enter" && liveSelectedIds.length > 0) {
			e.preventDefault();
			commitOpen(liveSelectedIds);
			return;
		}
		// Save with a folder selected: Enter opens it, as the Open button
		// does; the name field's own Enter reaches commitSave, which does too.
		if (
			mode === "save" &&
			e.key === "Enter" &&
			saveFolderSelected &&
			!(e.target instanceof HTMLInputElement)
		) {
			e.preventDefault();
			enterFolder(selectedIds[0]);
		}
	};

	// Escape / Command-period cancel the dialog. Because this is a movable modal
	// with no close box (HIG Ch.3 p.59), the window's own onModalCancel would
	// just beep, so cancel is handled here: this inner listener is a descendant
	// of the window's, so it fires first and preventDefaults the beep. Scoped to
	// the dialog body and gated on `open` so a closed dialog binds nothing.
	useKeyboardEquivalents({
		enabled: open,
		onCancel: () => onCancelFunc?.(),
		targetRef: dialogBodyRef,
	});

	if (!open) {
		return null;
	}

	return (
		<>
			<ClassicyWindow
				id={id}
				className={className}
				style={style}
				appId={appId}
				title={title}
				modal={true}
				// HIGOS8 Ch.3 "Movable Modal Dialog Boxes" (p.59): a movable modal
				// dialog has no close box (nor zoom box). The standard file dialog is
				// dismissed only via its Cancel button or Escape / Command-period
				// (handled by the dialog-body useKeyboardEquivalents above).
				closable={false}
				zoomable={false}
				collapsable={false}
				resizable={false}
				scrollable={false}
				movable={!fixedFrame}
				initialSize={dialogSize}
				initialPosition={[180, 120]}
				analyticsExclude
			>
				{/* biome-ignore lint/a11y/noStaticElementInteractions: dialog-level keyboard shortcuts (Escape to cancel, Enter to open) */}
				<div
					ref={dialogBodyRef}
					className={classNames(
						"classicyFileOpenDialogBody",
						mode === "save" && "classicyFileDialogSaveBody",
					)}
					onKeyDown={handleKeyDown}
				>
					{flat && activeVolume ? (
						// The folder pop-up (System 7.5's Standard File): the folder
						// shown, then each level up to the volume, each by its small
						// icon, then the other volumes. Its name is the button's
						// `aria-label`, whether or not a package shows the label.
						<ClassicyPopUpMenu
							id={`${id}-volume`}
							label={"Folder"}
							labelPosition={"left"}
							options={[
								...[...currentPath.keys(), currentPath.length]
									.reverse()
									.map((depth) => ({
										value: `${SEP}level${SEP}${depth}`,
										label:
											depth === 0
												? activeVolume.label
												: (currentPath[depth - 1] ?? ""),
										icon:
											depth === 0
												? (activeVolume.icon ?? folderIcon)
												: depth === currentPath.length
													? (openFolderIcon ?? folderIcon)
													: folderIcon,
									})),
								...volumes
									.filter((v) => v.id !== activeVolume.id)
									.map((v) => ({
										value: v.id,
										label: v.label,
										icon: v.icon ?? folderIcon,
									})),
							]}
							selected={`${SEP}level${SEP}${currentPath.length}`}
							onChangeFunc={(e) => {
								const value = e.target.value;
								if (!value.startsWith(`${SEP}level${SEP}`)) {
									switchVolume(value);
									return;
								}
								const depth = Number(value.split(SEP)[2]);
								const path = currentPath.slice(0, depth);
								setCurrentPath(path);
								setSelectedIds([]);
								if (!folders.has(cacheKey(activeVolume.id, path)))
									loadFolder(activeVolume, path);
							}}
						/>
					) : (
						<ClassicyPopUpMenu
							id={`${id}-volume`}
							label={"Volume"}
							labelPosition={"left"}
							options={volumes.map((v) => ({ value: v.id, label: v.label }))}
							selected={activeVolumeId}
							onChangeFunc={(e) => switchVolume(e.target.value)}
						/>
					)}
					{/* The volume shown, by its small icon and name: System 7.5's
					    disk name at the top right. The base sheet hides it. */}
					<div className={"classicyFileOpenDialogVolume"}>
						{activeVolume?.icon && (
							<ClassicyIconImage
								src={activeVolume.icon}
								drawnAt={16}
								width={16}
								alt={""}
							/>
						)}
						<span>{activeVolume?.label}</span>
					</div>
					<ClassicyScrollArea
						className={"classicyFileOpenDialogWell"}
						viewportClassName={"classicyFileOpenDialogWellViewport"}
						vertical={wellVerticalPolicy}
					>
						<ClassicyTree
							nodes={nodes}
							selectionMode={selectionMode === "multi" ? "multi" : "single"}
							selectedIds={liveSelectedIds}
							onSelectNode={handleSelect}
							onActivateNode={
								flat
									? (nodeId) =>
											isFlatFolder(nodeId)
												? enterFolder(nodeId)
												: mode === "open" && commitOpen([nodeId])
									: mode === "open"
										? (nodeId) => commitOpen([nodeId])
										: undefined
							}
							onToggleNode={handleFolderToggle}
						/>
					</ClassicyScrollArea>
					{mode === "save" && activeFormat && (
						<div className={"classicyFileDialogNameRow"}>
							<ClassicyInput
								id={`${id}-name`}
								labelTitle={"Save As:"}
								labelPosition={"left"}
								prefillValue={fileName}
								// Flat navigation: the name field takes the default
								// button back, as 7.5's does. Focusing it or typing
								// deselects the list (a selected folder made the
								// button Open), so Enter saves into the folder shown.
								onFocusFunc={() => {
									if (flat && selectedIds.length > 0) setSelectedIds([]);
								}}
								onChangeFunc={(e) => {
									setFileName(e.target.value);
									if (flat && selectedIds.length > 0) setSelectedIds([]);
								}}
								onEnterFunc={() => void commitSave()}
							/>
							<span className={"classicyFileDialogExtension"}>
								{activeFormat.extension}
							</span>
						</div>
					)}
					<div className={"classicyFileOpenDialogFooter"}>
						{mode === "open" &&
							fileTypeFilters &&
							fileTypeFilters.length > 0 && (
								<ClassicyPopUpMenu
									id={`${id}-filter`}
									label={"Show"}
									labelPosition={"left"}
									options={fileTypeFilters.map((f, i) => ({
										value: String(i),
										label: f.label,
									}))}
									selected={String(filterIndex)}
									onChangeFunc={(e) => setFilterIndex(Number(e.target.value))}
								/>
							)}
						{mode === "save" && formats.length > 1 && (
							<ClassicyPopUpMenu
								id={`${id}-format`}
								label={"Format"}
								labelPosition={"left"}
								options={formats.map((f, i) => ({
									value: String(i),
									label: f.label,
								}))}
								selected={String(formatIndex)}
								onChangeFunc={(e) => setFormatIndex(Number(e.target.value))}
							/>
						)}
						<div className={"classicyFileOpenDialogActions"}>
							{/* System 7.5's Eject and Desktop buttons and the line
							    under them; the base sheet hides them. Eject is dimmed:
							    no volume here can be ejected. */}
							<ClassicyButton
								className={"classicyFileOpenDialogEject"}
								disabled
							>
								Eject
							</ClassicyButton>
							<ClassicyButton
								className={"classicyFileOpenDialogDesktop"}
								disabled={
									desktopVolumeOffered === undefined ||
									activeVolumeId === desktopVolumeOffered.id
								}
								onClickFunc={() =>
									desktopVolumeOffered && switchVolume(desktopVolumeOffered.id)
								}
							>
								Desktop
							</ClassicyButton>
							<hr className={"classicyFileOpenDialogDivider"} />
							{mode === "save" && (
								<ClassicyButton
									aria-label={"New Folder"}
									disabled={activeVolume?.mkDir === undefined}
									onClickFunc={() => setNewFolderOpen(true)}
								>
									{/* "New", the noun and a folder glyph, the glyph a part the
									    base sheet hides: a package may draw "New" and a folder
									    instead, as System 7.5's Standard File does. */}
									New
									<span className={"classicyFileDialogNewNoun"}> Folder</span>
									<span
										className={"classicyFileDialogNewGlyph"}
										aria-hidden={true}
									>
										<ClassicyPixelArt art={"newFolderGlyph"} />
									</span>
								</ClassicyButton>
							)}
							<ClassicyButton onClickFunc={() => onCancelFunc?.()}>
								Cancel
							</ClassicyButton>
							{mode === "open" ? (
								<ClassicyButton
									isDefault={true}
									disabled={liveSelectedIds.length === 0}
									onClickFunc={() => commitOpen(liveSelectedIds)}
								>
									Open
								</ClassicyButton>
							) : (
								<ClassicyButton
									isDefault={true}
									disabled={!canSave && !saveFolderSelected}
									onClickFunc={() => void commitSave()}
								>
									{saveFolderSelected ? "Open" : "Save"}
								</ClassicyButton>
							)}
						</div>
					</div>
				</div>
			</ClassicyWindow>
			{replacePrompt !== null && (
				<ClassicyAlert
					id={`${id}-replace`}
					appId={appId}
					alertType={"caution"}
					movable={true}
					title={"Save"}
					label={`Replace “${replacePrompt}”?`}
					message={
						"An item with this name already exists in this location. Replacing it will overwrite its contents."
					}
					buttons={[
						{ id: "cancel", label: "Cancel", role: "cancel" },
						{
							id: "replace",
							label: "Replace",
							onClick: () => void commitSave(replacePrompt),
						},
					]}
					defaultButtonId={"cancel"}
					onClose={() => setReplacePrompt(null)}
				/>
			)}
			{newFolderOpen && (
				// A name prompt is a dialog, not an alert (HIG Ch.3: alerts hold only
				// icon/text/buttons). The reusable movable-modal input dialog owns the
				// field and hands back the final name on confirm.
				<ClassicyInputDialog
					id={`${id}-new-folder`}
					appId={appId}
					title={"New Folder"}
					prompt={"Name of new folder:"}
					placeholder={"untitled folder"}
					confirmLabel={"Create"}
					validate={(name) => name.trim().length > 0 && !name.includes(":")}
					onConfirm={(name) => void handleCreateFolder(name)}
					onCancel={() => setNewFolderOpen(false)}
				/>
			)}
			{errorPrompt !== null && (
				<ClassicyAlert
					id={`${id}-error`}
					appId={appId}
					alertType={"stop"}
					label={
						errorPrompt === "save"
							? "The document could not be saved."
							: errorPrompt === "folderCollision"
								? "A folder with this name already exists in this location."
								: "The folder could not be created."
					}
					buttons={[{ id: "ok", label: "OK", role: "default" }]}
					onClose={() => setErrorPrompt(null)}
				/>
			)}
		</>
	);
};
