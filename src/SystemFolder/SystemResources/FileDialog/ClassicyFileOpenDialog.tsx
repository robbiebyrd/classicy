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
import { ClassicyButton } from "@/SystemFolder/SystemResources/Button/ClassicyButton";
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

export type ClassicyFileOpenDialogProps = {
	id: string;
	appId: string;
	open: boolean;
	title?: string;
	volumes: ClassicyFileDialogVolume[];
	selectionMode?: "single" | "multi";
	fileTypeFilters?: { label: string; types: string[] | null }[];
	onOpenFunc: (selections: ClassicyFileOpenSelection[]) => void;
	onCancelFunc?: () => void;
};

const SEP = "\u0000";
type FolderState = ClassicyFileDialogEntry[] | "loading" | "error";

const cacheKey = (volumeId: string, path: string[]) =>
	[volumeId, ...path].join(SEP);

export const ClassicyFileOpenDialog: FunctionalComponent<
	ClassicyFileOpenDialogProps
> = ({
	id,
	appId,
	open,
	title = "Open",
	volumes,
	selectionMode = "single",
	fileTypeFilters,
	onOpenFunc,
	onCancelFunc,
}) => {
	const [activeVolumeId, setActiveVolumeId] = useState(volumes[0]?.id);
	const [folders, setFolders] = useState<Map<string, FolderState>>(new Map());
	const [selectedIds, setSelectedIds] = useState<string[]>([]);
	const [filterIndex, setFilterIndex] = useState(0);
	// node id → selection payload, rebuilt whenever buildNodes actually runs
	const nodeIndex = useRef(new Map<string, ClassicyFileOpenSelection>());

	const activeVolume = volumes.find((v) => v.id === activeVolumeId);
	const activeTypes = fileTypeFilters?.[filterIndex]?.types ?? null;

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
		setActiveVolumeId(volumes[0].id);
		loadFolder(volumes[0], []);
	}, [open]);

	// load a volume root on first switch to it
	// biome-ignore lint/correctness/useExhaustiveDependencies: intentionally re-runs only on volume switch / open — folders/loadFolder are read fresh, not tracked as invalidation keys
	useEffect(() => {
		if (!open || !activeVolume) return;
		if (!folders.has(cacheKey(activeVolume.id, []))) {
			loadFolder(activeVolume, []);
		}
	}, [activeVolumeId, open]);

	const isEntryDisabled = (entry: ClassicyFileDialogEntry) =>
		entry.kind === "file" &&
		activeTypes !== null &&
		!activeTypes.includes(entry.fileType ?? "");

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

	// prune selections that the current filter disabled or a reload removed
	const liveSelectedIds = selectedIds.filter((sid) =>
		nodeIndex.current.has(sid),
	);

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
		const selections = ids
			.map((nid) => nodeIndex.current.get(nid))
			.filter((s): s is ClassicyFileOpenSelection => s !== undefined);
		if (selections.length > 0) {
			onOpenFunc(selections);
		}
	};

	const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
		if (e.key === "Escape") {
			e.preventDefault();
			onCancelFunc?.();
		} else if (e.key === "Enter" && liveSelectedIds.length > 0) {
			e.preventDefault();
			commitOpen(liveSelectedIds);
		}
	};

	if (!open) {
		return null;
	}

	return (
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
						setActiveVolumeId(e.target.value);
						setSelectedIds([]);
					}}
				/>
				<div className={"classicyFileOpenDialogWell"}>
					<ClassicyTree
						nodes={nodes}
						selectionMode={selectionMode === "multi" ? "multi" : "single"}
						selectedIds={liveSelectedIds}
						onSelectNode={handleSelect}
						onActivateNode={(nodeId) => commitOpen([nodeId])}
						onToggleNode={handleFolderToggle}
					/>
				</div>
				<div className={"classicyFileOpenDialogFooter"}>
					{fileTypeFilters && fileTypeFilters.length > 0 && (
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
					<div className={"classicyFileOpenDialogActions"}>
						<ClassicyButton onClickFunc={() => onCancelFunc?.()}>
							Cancel
						</ClassicyButton>
						<ClassicyButton
							isDefault={true}
							disabled={liveSelectedIds.length === 0}
							onClickFunc={() => commitOpen(liveSelectedIds)}
						>
							Open
						</ClassicyButton>
					</div>
				</div>
			</div>
		</ClassicyWindow>
	);
};
