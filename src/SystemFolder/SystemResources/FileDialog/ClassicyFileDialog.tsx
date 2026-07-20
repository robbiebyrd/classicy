import "./ClassicyFileOpenDialog.scss";
import {
	type FC as FunctionalComponent,
	type KeyboardEvent,
	type MouseEvent,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { ClassicyAlert } from "@/SystemFolder/SystemResources/Alert/ClassicyAlert";
import { ClassicyButton } from "@/SystemFolder/SystemResources/Button/ClassicyButton";
import { ClassicyInput } from "@/SystemFolder/SystemResources/Input/ClassicyInput";
import { ClassicyPopUpMenu } from "@/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu";
import {
	ClassicyTree,
	type ClassicyTreeNode,
} from "@/SystemFolder/SystemResources/Tree/ClassicyTree";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";
import type {
	ClassicyFileDialogEntry,
	ClassicyFileDialogVolume,
} from "./ClassicyFileDialogVolume";

export type ClassicyFileOpenSelection = {
	volumeId: string;
	path: string[];
	entry: ClassicyFileDialogEntry;
};

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

export type ClassicyFileSaveResult = {
	volumeId: string;
	path: string[];
	/** Includes the extension. */
	fileName: string;
	format: ClassicyFileSaveFormat;
};

type ClassicyFileDialogSharedProps = {
	id: string;
	appId: string;
	open: boolean;
	title?: string;
	volumes: ClassicyFileDialogVolume[];
	onCancelFunc?: () => void;
};

export type ClassicyFileDialogOpenProps = ClassicyFileDialogSharedProps & {
	mode: "open";
	selectionMode?: "single" | "multi";
	fileTypeFilters?: { label: string; types: string[] | null }[];
	onOpenFunc: (selections: ClassicyFileOpenSelection[]) => void;
};

export type ClassicyFileDialogSaveProps = ClassicyFileDialogSharedProps & {
	mode: "save";
	/** At least one; the first is the default selection. */
	formats: ClassicyFileSaveFormat[];
	/** Pre-filled name, extension NOT included. */
	defaultFileName?: string;
	onSaveFunc: (saved: ClassicyFileSaveResult) => void;
	onErrorFunc?: (error: unknown) => void;
};

export type ClassicyFileDialogProps =
	| ClassicyFileDialogOpenProps
	| ClassicyFileDialogSaveProps;

const SEP = "\u0000";
type FolderState = ClassicyFileDialogEntry[] | "loading" | "error";

const cacheKey = (volumeId: string, path: string[]) =>
	[volumeId, ...path].join(SEP);

export const ClassicyFileDialog: FunctionalComponent<
	ClassicyFileDialogProps
> = (props) => {
	const { id, appId, open, volumes, onCancelFunc } = props;
	const mode = props.mode;
	const title = props.title ?? (mode === "open" ? "Open" : "Save");
	const selectionMode =
		props.mode === "open" ? (props.selectionMode ?? "single") : "single";
	const fileTypeFilters =
		props.mode === "open" ? props.fileTypeFilters : undefined;
	const formats = props.mode === "save" ? props.formats : [];

	const [activeVolumeId, setActiveVolumeId] = useState(volumes[0]?.id);
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
	const [newFolderName, setNewFolderName] = useState("");
	const [errorPrompt, setErrorPrompt] = useState<"save" | "folder" | null>(
		null,
	);
	// node id → selection payload, rebuilt whenever buildNodes actually runs
	const nodeIndex = useRef(new Map<string, ClassicyFileOpenSelection>());

	const activeVolume = volumes.find((v) => v.id === activeVolumeId);
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

	// biome-ignore lint/correctness/useExhaustiveDependencies: buildNodes/isEntryDisabled are recreated each render and close over folders/activeTypes already; activeVolume/folders/filterIndex are the actual invalidation keys
	const nodes = useMemo(() => {
		// Only clear/repopulate the index when buildNodes actually runs for
		// these deps — resetting it unconditionally on every render would wipe
		// it out on renders that reuse the memoized node tree (e.g. a pure
		// selection change), breaking lookups for the next interaction.
		nodeIndex.current = new Map();
		return activeVolume ? buildNodes(activeVolume, []) : [];
	}, [activeVolume, folders, filterIndex]);

	// Open mode prunes selections the filter disabled or a reload removed; in
	// save mode the selection is a folder, which is never in the file index.
	const liveSelectedIds =
		mode === "save"
			? selectedIds
			: selectedIds.filter((sid) => nodeIndex.current.has(sid));

	// In save mode the single selected id is always a folder node (files are
	// disabled); its id is the cache key, i.e. volume id + path segments.
	const selectedFolderPath =
		mode === "save" && selectedIds[0] ? selectedIds[0].split(SEP).slice(1) : [];

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
		if (mode === "save") {
			// Files are disabled and never fire selection, so any id here is a
			// folder (placeholder rows aside).
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
		if (!activeVolume?.write || !activeFormat) return;
		if (confirmedName === undefined && !canSave) return;
		const targetName = confirmedName ?? finalFileName;
		const path = selectedFolderPath;
		setSaving(true);
		try {
			if (confirmedName === undefined) {
				const entries = await ensureListing(activeVolume, path);
				if (entries.some((e) => e.kind === "file" && e.name === targetName)) {
					setReplacePrompt(targetName);
					return;
				}
			}
			const data = await activeFormat.data();
			await activeVolume.write(path, targetName, {
				data,
				fileType: activeFormat.fileType,
				icon: activeFormat.icon,
			});
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

	const handleCreateFolder = async () => {
		if (props.mode !== "save") return;
		if (!activeVolume?.mkDir) return;
		const name = newFolderName.trim();
		if (name.length === 0 || name.includes(":")) return;
		const path = selectedFolderPath;
		try {
			await activeVolume.mkDir(path, name);
			loadFolder(activeVolume, path);
			setSelectedIds([cacheKey(activeVolume.id, [...path, name])]);
			setNewFolderName("");
		} catch (error) {
			setErrorPrompt("folder");
			props.onErrorFunc?.(error);
		}
	};

	// Escape-to-cancel is handled by ClassicyWindow itself for modal windows
	// (see #194/#197's onModalCancel/useKeyboardEquivalents) — handling it here
	// too would fire onCancelFunc twice for a single Escape keypress.
	const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
		if (mode === "open" && e.key === "Enter" && liveSelectedIds.length > 0) {
			e.preventDefault();
			commitOpen(liveSelectedIds);
		}
	};

	if (!open) {
		return null;
	}

	return (
		<>
			<ClassicyWindow
				id={id}
				appId={appId}
				title={title}
				modal={true}
				closable={true}
				zoomable={false}
				collapsable={false}
				resizable={false}
				scrollable={false}
				initialSize={[440, 400]}
				initialPosition={[180, 120]}
				onCloseFunc={() => onCancelFunc?.()}
			>
				{/* biome-ignore lint/a11y/noStaticElementInteractions: dialog-level keyboard shortcuts (Escape to cancel, Enter to open) */}
				<div className={"classicyFileOpenDialogBody"} onKeyDown={handleKeyDown}>
					<ClassicyPopUpMenu
						id={`${id}-volume`}
						label={"Volume"}
						labelPosition={"left"}
						options={volumes.map((v) => ({ value: v.id, label: v.label }))}
						selected={activeVolumeId}
						onChangeFunc={(e) => {
							const nextVolume = volumes.find((v) => v.id === e.target.value);
							setActiveVolumeId(e.target.value);
							setSelectedIds([]);
							if (nextVolume && !folders.has(cacheKey(nextVolume.id, []))) {
								loadFolder(nextVolume, []);
							}
						}}
					/>
					<div className={"classicyFileOpenDialogWell"}>
						<ClassicyTree
							nodes={nodes}
							selectionMode={selectionMode === "multi" ? "multi" : "single"}
							selectedIds={liveSelectedIds}
							onSelectNode={handleSelect}
							onActivateNode={
								mode === "open" ? (nodeId) => commitOpen([nodeId]) : undefined
							}
							onToggleNode={handleFolderToggle}
						/>
					</div>
					{mode === "save" && activeFormat && (
						<div className={"classicyFileDialogNameRow"}>
							<ClassicyInput
								id={`${id}-name`}
								labelTitle={"Save As:"}
								labelPosition={"left"}
								prefillValue={fileName}
								onChangeFunc={(e) => setFileName(e.target.value)}
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
							{mode === "save" && (
								<ClassicyButton
									disabled={activeVolume?.mkDir === undefined}
									onClickFunc={() => setNewFolderOpen(true)}
								>
									New Folder
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
									disabled={!canSave}
									onClickFunc={() => void commitSave()}
								>
									Save
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
					label={`Replace "${replacePrompt}"?`}
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
				<ClassicyAlert
					id={`${id}-new-folder`}
					appId={appId}
					alertType={"note"}
					movable={true}
					title={"New Folder"}
					label={"Name of new folder:"}
					message={
						<ClassicyInput
							id={`${id}-new-folder-name`}
							placeholder={"untitled folder"}
							prefillValue={newFolderName}
							onChangeFunc={(e) => setNewFolderName(e.target.value)}
						/>
					}
					buttons={[
						{
							id: "cancel",
							label: "Cancel",
							role: "cancel",
							onClick: () => setNewFolderName(""),
						},
						{
							id: "create",
							label: "Create",
							role: "default",
							disabled:
								newFolderName.trim().length === 0 ||
								newFolderName.includes(":"),
							onClick: () => void handleCreateFolder(),
						},
					]}
					onClose={() => setNewFolderOpen(false)}
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
							: "The folder could not be created."
					}
					buttons={[{ id: "ok", label: "OK", role: "default" }]}
					onClose={() => setErrorPrompt(null)}
				/>
			)}
		</>
	);
};
