import "./ClassicyFileBrowserViewTable.scss";
import classNames from "classnames";
import {
	type CSSProperties,
	type FC as FunctionalComponent,
	type KeyboardEvent,
	type MouseEvent,
	memo,
	type RefObject,
	useCallback,
	useEffect,
	useImperativeHandle,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { useClassicyAppearanceLayout } from "@/Appearance/useClassicyAppearanceLayout";
import type { ClassicyTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import type {
	FinderIconViewOptions,
	FinderSortKey,
} from "@/SystemFolder/Finder/FinderContext";
import {
	asFinderDate,
	finderEntryComparator,
	iconViewIconSize,
} from "@/SystemFolder/Finder/FinderViewOptions";
import type { ClassicyDesktopIconMetrics } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconContext";
import type { ArrowDirection } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopKeyNav";
import {
	CLASSICY_FILE_BROWSER_RENAME_DELAY_MS,
	CLASSICY_FILE_BROWSER_TYPEAHEAD_MS,
	type ClassicyFileBrowserIconBox,
	type ClassicyFileBrowserIconPlace,
	type ClassicyFileBrowserIconSelection,
	classicyFileBrowserRegionSelect,
	classicyIconClickSelection,
	classicyIconInDirection,
	classicyIconMarqueeSelection,
	classicyIconPage,
	classicyIconRectRange,
	classicyIconTypeahead,
	classicyIconViewDragsSelection,
} from "@/SystemFolder/SystemResources/File/ClassicyFileBrowserIconSelection";
import {
	type ClassicyFileBrowserMarqueeBox,
	startClassicyFileBrowserMarquee,
} from "@/SystemFolder/SystemResources/File/ClassicyFileBrowserMarquee.internal";
import {
	classicyFreeIconCell,
	classicyLineUpIconPlaces,
	cleanupIcon,
	iconGridLattice,
	iconImageByType,
	readClassicyDesktopIconMetrics,
} from "@/SystemFolder/SystemResources/File/ClassicyFileBrowserUtils";
import type {
	ClassicyFileDropDestination,
	ClassicyFileDropTarget,
} from "@/SystemFolder/SystemResources/File/ClassicyFileDrag";
import type { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import {
	ClassicyFileSystemEntryFileType,
	type ClassicyFileSystemEntryMetadata,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import { listClassicyTrashItems } from "@/SystemFolder/SystemResources/File/ClassicyTrash";
import {
	isClassicyTrashFolder,
	useClassicyTrashIcon,
} from "@/SystemFolder/SystemResources/File/ClassicyTrashIcon.internal";
import { useClassicyDisplayFileName } from "@/SystemFolder/SystemResources/File/useClassicyDisplayFileName";
import { ClassicyIcon } from "@/SystemFolder/SystemResources/Icon/ClassicyIcon";
import {
	classicyIconsRoveFocus,
	classicyWindowsSelectionKeys,
} from "@/SystemFolder/SystemResources/Keyboard/ClassicyListKeys.internal";
import type { ClassicyTableSelectionApi } from "@/SystemFolder/SystemResources/Table/ClassicyTable";
import {
	classicySecondaryButtonSelects,
	classicySelectsOnPress,
	classicyWindowsSelectionModifiers,
} from "@/SystemFolder/SystemResources/Utils/ClassicyMousePolicy";

export type ClassicyFileBrowserViewIconsProps = {
	fs: ClassicyFileSystem;
	path: string;
	appId: string;
	dirOnClickFunc?: (path: string) => void;
	fileOnClickFunc?: (path: string) => void;
	/**
	 * Opens every selected item at once: under `layout.selection.modifiers`
	 * "windows", a double-click (or Return) on a selected icon hands it the
	 * whole selection, in the view's order (WIG App. A Tables A.2,
	 * pp.352-353, and A.3, p.356). Omitted, or under any other layout, the
	 * icon opens alone through `dirOnClickFunc` / `fileOnClickFunc`.
	 */
	openItemsFunc?: (paths: string[]) => void;
	/**
	 * Called with the selected paths, in the view's order, in the commit
	 * that draws a change of the selection (and the first): the browser
	 * (`ClassicyFileBrowser`) reads its icon selection from it.
	 */
	onSelectionChange?: (paths: string[]) => void;
	holderRef?: RefObject<HTMLDivElement | null>;
	hideFilesCreatedAfter?: Date | string | number | null;
	/** List entries marked `_invisible` (drawn dimmed). Defaults to true. */
	showInvisible?: boolean;
	iconViewOptions?: FinderIconViewOptions;
	/**
	 * Move dragged items into another folder or the desktop (see
	 * `ClassicyFileBrowser`). Without it, icons can only be rearranged here.
	 */
	onMoveItems?: ClassicyFileBrowserMoveItems;
	/**
	 * Rename an item: called with its path and the name typed when a rename
	 * the view began (a slow second click on a selected icon's name) is
	 * committed. Return the item's new path when it was renamed, so the view
	 * keeps it selected where it was. Without it, names are not editable.
	 */
	onRenameItem?: (path: string, name: string) => string | undefined;
	/** Receives `{ selectAll }`, for Edit ▸ Select All. */
	selectionApiRef?: RefObject<ClassicyTableSelectionApi | null>;
	/**
	 * Receives the view's commands (`ClassicyFileBrowserViewCommands`): the
	 * browser's `commandsRef` runs Explorer's New, Rename, Arrange Icons and
	 * Line Up Icons through them.
	 */
	viewCommandsRef?: RefObject<ClassicyFileBrowserViewCommands | null>;
	/** Extra class names, merged onto the root element after the component's own. */
	className?: string;
	/** Inline style for the root element. */
	style?: CSSProperties;
};

/**
 * What Arrange Icons orders a folder's icons by (Windows 98 SE Explorer's
 * "by Name", "by Type", "by Size", "by Date"; the Finder's sort keys
 * `name`, `kind`, `size` and `modified`).
 */
export type ClassicyFileBrowserArrangeKey = Extract<
	FinderSortKey,
	"name" | "kind" | "size" | "modified"
>;

/**
 * A file browser view's commands, behind `ClassicyFileBrowserCommands`.
 * Each acts on an item once it is listed, so a caller may run it right
 * after the change to the tree that makes the item (Explorer's New).
 */
export type ClassicyFileBrowserViewCommands = {
	/** Makes `paths` the selection, alone, the first the anchor. */
	select(paths: string[]): void;
	/**
	 * Begins editing `path`'s name in place, as a slow click on a selected
	 * name does, when the item may be renamed (and the view was given
	 * `onRenameItem`).
	 */
	rename(path: string): void;
	/**
	 * Where a new item's icon goes (the icon view): at the client point
	 * `at` (the point a white-space menu was opened at), else the folder's
	 * first free cell. The list view places nothing.
	 */
	place(path: string, at?: [number, number]): void;
	/**
	 * Arranges the items once by `key` (the icon view lays its icons out
	 * afresh in that order; the list view sorts by that column).
	 */
	arrange(key: ClassicyFileBrowserArrangeKey): void;
	/** Moves every icon to its nearest free grid cell (the icon view). */
	lineUp(): void;
};

/**
 * Called when items are dragged out of a file browser and let go over another
 * folder or the desktop. `outlineTopLeft` is where their outline was released
 * (client px), for placing them on the desktop.
 */
export type ClassicyFileBrowserMoveItems = (
	paths: string[],
	destination: ClassicyFileDropDestination,
	outlineTopLeft: [number, number],
) => void;

type iconType = {
	appId: string;
	name: string;
	invisible: boolean;
	icon: string;
	onClickFunc: () => void;
	holder: RefObject<HTMLDivElement | null>;
	initialPosition: [number, number];
	size?: number;
	snapTo?: [number, number];
	snapOrigin?: [number, number];
	positionLocked?: boolean;
	dropFolderPath?: string;
	filePath: string;
	/** A folder or a drive: listed first under `fileList.foldersFirst`. */
	isFolder: boolean;
	/** The entry's type: whether its name's extension is shown. */
	fileType: string;
	/**
	 * The icon's React key: its name, and the layout epoch once Arrange
	 * Icons or Line Up Icons has laid the view out (remounting the icon at
	 * its new place).
	 */
	mountKey: string;
};

const ARROWS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);
const NO_MODIFIERS = { shiftKey: false, metaKey: false, ctrlKey: false };

/** Where an icon element sits in its holder: its inline left and top. */
const iconElementPlace = (el: HTMLElement): [number, number] => [
	Number.parseFloat(el.style.left) || 0,
	Number.parseFloat(el.style.top) || 0,
];

export const ClassicyFileBrowserViewIcons: FunctionalComponent<ClassicyFileBrowserViewIconsProps> =
	memo(
		({
			fs,
			path,
			appId,
			dirOnClickFunc,
			fileOnClickFunc,
			openItemsFunc,
			onSelectionChange,
			holderRef,
			hideFilesCreatedAfter = null,
			showInvisible = true,
			iconViewOptions,
			onMoveItems,
			onRenameItem,
			selectionApiRef,
			viewCommandsRef,
			className,
			style,
		}) => {
			// How names are shown (`layout.files.extensions`).
			const shownNames = useClassicyDisplayFileName();
			const activeTheme = useAppManager(
				(s) => s.System.Manager.Appearance.activeTheme,
			);
			const layout = useClassicyAppearanceLayout();
			// Windows' selection keys, or the Mac's (the default).
			const keys = layout.fileBrowser?.keys ?? "mac";
			// Under Windows' layout (WIG Ch.5 "Selection with the Mouse",
			// pp.37-38; App. A Tables A.1-A.3): a press selects; button 2
			// selects what it presses on; a drag carries the selection; the
			// rectangle scrolls the window; Space selects, the view a list
			// box of options; one Tab stop; a double-click opens the
			// selection.
			const selectsOnPress = classicySelectsOnPress(layout);
			const secondarySelects = classicySecondaryButtonSelects(layout);
			const dragsSelection = classicyIconViewDragsSelection(layout);
			const regionScrolls = classicyFileBrowserRegionSelect(layout);
			const selectKeys = classicyWindowsSelectionKeys(layout);
			const roveFocus = classicyIconsRoveFocus(layout);
			const windowsModifiers = classicyWindowsSelectionModifiers(layout);
			const opensSelection = windowsModifiers && !!openItemsFunc;
			// Folders before files (Windows Explorer), or together (the Finder).
			const foldersFirst = layout.fileList?.foldersFirst === true;
			// A listing of the root shows the Trash (when invisibles show):
			// drawn with the active package's art, not its stored `_icon`
			// (the fallback when no package has Trash art).
			const trashIcon = useClassicyTrashIcon(
				listClassicyTrashItems(fs).length > 0,
			);

			// Falls back to an internally-owned ref when the caller does not pass
			// one (e.g. rendering this view standalone in tests), so the layout
			// effect below always has a DOM node to measure and attach icons to.
			const internalHolderRef = useRef<HTMLDivElement>(null);
			const resolvedHolderRef = holderRef ?? internalHolderRef;

			const [items, setItems] = useState<iconType[]>([]);
			// Where a renamed item's icon goes: where it was under its old
			// name. And where a new item's goes (`place`), and every icon
			// after Line Up Icons.
			const renamedPlacesRef = useRef(new Map<string, [number, number]>());
			// Arrange Icons and Line Up Icons: the order chosen (kept for the
			// view's life, as Explorer keeps a folder's), and each request,
			// which lays the icons out afresh (remounting them, since an icon
			// keeps its own place once drawn).
			const [arrangedBy, setArrangedBy] = useState<
				ClassicyFileBrowserArrangeKey | undefined
			>(undefined);
			const [layoutRequest, setLayoutRequest] = useState<{
				kind: "arrange" | "lineUp";
				id: number;
			} | null>(null);
			const appliedLayoutRequestRef = useRef(0);
			const layoutEpochRef = useRef(0);
			// The lattice and measures the last layout used, for `place`.
			const latticeRef = useRef<{
				cells: (count: number) => [number, number][];
				pitch: [number, number];
				origin: [number, number];
			} | null>(null);

			// The desktop-icon metrics, read from the desktop once per active
			// theme rather than once per icon: the layout effect re-runs on every
			// file-system change, and each read forces a style read. Read in the
			// layout effect, after the commit that applies a new theme's
			// variables to #classicyDesktop.
			const iconMetricsRef = useRef<{
				theme: ClassicyTheme;
				metrics: ClassicyDesktopIconMetrics;
			} | null>(null);

			// Destructured rather than depended on as `iconViewOptions` itself:
			// it is a fresh object on every render of the parent, and depending
			// on its identity would either re-run every render (defeating the
			// memoization) or, if a caller memoizes it, silently miss changes to
			// individual fields. Depending on the primitives keeps the effect
			// keyed on the values that actually drive layout.
			const arrangement = iconViewOptions?.arrangement;
			const keepArrangedBy = iconViewOptions?.keepArrangedBy;
			const iconSizeStep = iconViewOptions?.iconSize;

			useLayoutEffect(() => {
				if (!resolvedHolderRef.current) {
					return;
				}

				const openFileOrFolder = (
					properties: ClassicyFileSystemEntryMetadata,
					path: string,
					filename: string,
				) => {
					if (properties._type === "directory") {
						if (dirOnClickFunc) {
							return dirOnClickFunc(`${path}:${filename}`);
						}
						return;
					}
					if (fileOnClickFunc) {
						return fileOnClickFunc(`${path}:${filename}`);
					}
				};

				const containerMeasure: [number, number] = [
					resolvedHolderRef.current.getBoundingClientRect().width,
					resolvedHolderRef.current.getBoundingClientRect().height,
				];
				const directoryListing: ClassicyFileSystemEntryMetadata | object =
					fs.filterByType(
						path,
						undefined,
						showInvisible,
						hideFilesCreatedAfter,
					);

				const entries = Object.entries(directoryListing);
				// Arrange Icons' order, else the view options' kept order.
				const sortKey: FinderSortKey | undefined =
					arrangedBy ?? (arrangement === "sorted" ? keepArrangedBy : undefined);
				const sorted = sortKey
					? [...entries].sort((a, b) =>
							finderEntryComparator(sortKey)(
								{
									name: a[0],
									// asFinderDate, not the raw field: the tree round-trips
									// through JSON, so these are ISO strings at runtime and
									// .getTime() inside the comparator would throw.
									modifiedOn: asFinderDate(a[1]._modifiedOn),
									createdOn: asFinderDate(a[1]._createdOn),
									size: a[1]._size,
									kind: a[1]._type,
									label: a[1]._label,
								},
								{
									name: b[0],
									modifiedOn: asFinderDate(b[1]._modifiedOn),
									createdOn: asFinderDate(b[1]._createdOn),
									size: b[1]._size,
									kind: b[1]._type,
									label: b[1]._label,
								},
							),
						)
					: entries;
				// Folders (and drives) first, each group in its own order, under
				// a package that lists them so (Windows Explorer).
				const isFolderEntry = (properties: ClassicyFileSystemEntryMetadata) =>
					properties._type === ClassicyFileSystemEntryFileType.Directory ||
					properties._type === ClassicyFileSystemEntryFileType.Drive;
				const ordered = foldersFirst
					? [
							...sorted.filter(([, properties]) => isFolderEntry(properties)),
							...sorted.filter(([, properties]) => !isFolderEntry(properties)),
						]
					: sorted;

				if (iconMetricsRef.current?.theme !== activeTheme) {
					iconMetricsRef.current = {
						theme: activeTheme,
						metrics: readClassicyDesktopIconMetrics(activeTheme),
					};
				}
				const iconMetrics = iconMetricsRef.current.metrics;
				const iconSize = iconSizeStep
					? iconViewIconSize(iconMetrics.size, iconSizeStep)
					: undefined;
				// Same lattice `cleanupIcon` lays the icons out on — pitch AND origin
				// both come from `iconGridLattice`, so a snapped icon lands exactly
				// where the layout would have put it. Passing only the pitch (or
				// passing `iconSize` instead of the full cell width) puts drops on
				// half-rows that overlap the row above.
				const lattice = iconGridLattice(activeTheme, iconSize, iconMetrics);
				const snapTo = arrangement === "grid" ? lattice.pitch : undefined;
				// "sorted" ("Keep arranged by…") derives both order and position from
				// the sort key, so dragging is disabled entirely. "grid" ("Snap to
				// grid") still allows free dragging; it only rounds the drop point
				// via `snapTo`. "none" is unrestricted, exactly as today.
				const positionLocked = arrangement === "sorted";

				const cellAt = (index: number, count: number) =>
					cleanupIcon(
						activeTheme,
						index,
						count,
						containerMeasure,
						iconSize,
						iconMetrics,
					);
				latticeRef.current = {
					cells: (count) =>
						Array.from({ length: count }, (_, i) => cellAt(i, count)),
					pitch: lattice.pitch,
					origin: lattice.origin,
				};
				// A layout request not yet applied: Arrange Icons drops every
				// kept place (the icons go to the cells of the new order), Line
				// Up Icons keeps each icon at the free cell nearest where it is.
				if (
					layoutRequest &&
					layoutRequest.id !== appliedLayoutRequestRef.current
				) {
					appliedLayoutRequestRef.current = layoutRequest.id;
					layoutEpochRef.current = layoutRequest.id;
					if (layoutRequest.kind === "arrange") {
						renamedPlacesRef.current.clear();
					} else {
						const drawn = new Map<string, HTMLElement>();
						for (const el of resolvedHolderRef.current.querySelectorAll<HTMLElement>(
							".classicyIcon[data-classicy-file-path]",
						)) {
							const at = el.getAttribute("data-classicy-file-path");
							if (at) drawn.set(at, el);
						}
						const current = ordered.map(([filename], index) => {
							const itemPath = `${path}${fs.separator}${filename}`;
							const el = drawn.get(itemPath);
							return el
								? iconElementPlace(el)
								: (renamedPlacesRef.current.get(itemPath) ??
										cellAt(index, ordered.length));
						});
						const lined = classicyLineUpIconPlaces(
							current,
							lattice.pitch,
							lattice.origin,
						);
						ordered.forEach(([filename], index) => {
							renamedPlacesRef.current.set(
								`${path}${fs.separator}${filename}`,
								lined[index],
							);
						});
					}
				}
				const epoch = layoutEpochRef.current;

				const updatedIcons = ordered.map(([filename, properties], index) => {
					const itemPath = `${path}${fs.separator}${filename}`;
					return {
						mountKey: epoch > 0 ? `${filename}\u0000${epoch}` : filename,
						filePath: itemPath,
						isFolder: isFolderEntry(properties),
						fileType: properties._type,
						dropFolderPath:
							properties._type === "directory" ? itemPath : undefined,
						appId: appId,
						name: filename,
						invisible: properties._invisible,
						// The Trash draws the active package's art; with none
						// registered, its stored `_icon`, as every entry does.
						icon:
							(isClassicyTrashFolder(fs, path, filename) && trashIcon) ||
							properties._icon ||
							iconImageByType(properties._type),
						onClickFunc: () => openFileOrFolder(properties, path, filename),
						holder: resolvedHolderRef,
						// A renamed icon stays where it was (its old name's place).
						initialPosition:
							renamedPlacesRef.current.get(itemPath) ??
							cellAt(index, ordered.length),
						size: iconSize,
						snapTo,
						snapOrigin: lattice.origin,
						positionLocked,
					};
				});
				setItems(updatedIcons);
			}, [
				appId,
				path,
				fs,
				dirOnClickFunc,
				fileOnClickFunc,
				activeTheme,
				resolvedHolderRef.current,
				resolvedHolderRef,
				hideFilesCreatedAfter,
				showInvisible,
				arrangement,
				keepArrangedBy,
				iconSizeStep,
				trashIcon,
				foldersFirst,
				arrangedBy,
				layoutRequest,
			]);

			// --- Selection --------------------------------------------------
			// One selection for the view's icons (each icon draws what it is
			// told): a click selects an icon, a modified click adds it or takes
			// it out, an arrow selects the nearest icon its way, typing the icon
			// named so, a drag across empty space the icons it touches.
			const [selection, setSelection] =
				useState<ClassicyFileBrowserIconSelection>({ selected: [] });
			const selectionRef = useRef(selection);
			selectionRef.current = selection;
			// The icon the keyboard continues from (the last one clicked or
			// moved to), and, under `selection.iconNavigation` "roving", the
			// view's one Tab stop.
			const cursorRef = useRef<string | undefined>(undefined);
			const [focusPath, setFocusPath] = useState<string | undefined>();
			const setCursor = (itemPath: string | undefined) => {
				cursorRef.current = itemPath;
				if (roveFocus) setFocusPath(itemPath);
			};
			const [renaming, setRenaming] = useState<string | null>(null);
			const [marquee, setMarquee] =
				useState<ClassicyFileBrowserMarqueeBox | null>(null);
			// The other icons a drag of the selection let go in this folder
			// moves, as far as the pointer went (`fileBrowser.iconSelection`
			// "view"); each drop a new id.
			const [groupMove, setGroupMove] = useState<{
				paths: Set<string>;
				by: [number, number];
				id: number;
			} | null>(null);

			const itemsRef = useRef(items);
			itemsRef.current = items;
			// Paths no longer listed leave the selection; a command waiting for
			// an item now listed runs.
			// biome-ignore lint/correctness/useExhaustiveDependencies: the listing is the trigger; the pending commands are read from refs
			useEffect(() => {
				const listed = new Set(items.map((item) => item.filePath));
				setSelection((prev) => {
					const selected = prev.selected.filter((p) => listed.has(p));
					return selected.length === prev.selected.length &&
						(prev.anchor === undefined || listed.has(prev.anchor))
						? prev
						: {
								selected,
								anchor:
									prev.anchor && listed.has(prev.anchor)
										? prev.anchor
										: undefined,
							};
				});
				if (cursorRef.current && !listed.has(cursorRef.current)) {
					cursorRef.current = undefined;
				}
				for (const key of renamedPlacesRef.current.keys()) {
					// A new item's place waits for the item (`place`).
					if (!listed.has(key) && !pendingPlacesRef.current.has(key))
						renamedPlacesRef.current.delete(key);
					if (listed.has(key)) pendingPlacesRef.current.delete(key);
				}
				applyPendingCommands();
			}, [items]);

			// The selection in the view's order: what a drag, a double-click
			// opening the selection and the browser's commands act on.
			const orderedSelection = (): string[] => {
				const held = new Set(selectionRef.current.selected);
				return itemsRef.current
					.map((item) => item.filePath)
					.filter((p) => held.has(p));
			};
			// Reported in the commit that draws it, so a contextual menu or a
			// key the next event brings reads the selection as drawn.
			const onSelectionChangeRef = useRef(onSelectionChange);
			onSelectionChangeRef.current = onSelectionChange;
			// biome-ignore lint/correctness/useExhaustiveDependencies: the selection and the listing are the triggers; the order is read from the refs they set
			useLayoutEffect(() => {
				onSelectionChangeRef.current?.(orderedSelection());
			}, [selection, items]);

			useImperativeHandle(
				selectionApiRef,
				() => ({
					selectAll: () =>
						setSelection({
							selected: itemsRef.current.map((item) => item.filePath),
							anchor: itemsRef.current[0]?.filePath,
						}),
				}),
				[],
			);

			// Explorer's commands (`viewCommandsRef`): a selection or a rename
			// asked for an item not listed yet (New makes it, then asks) waits
			// for the listing that shows it; so does a new item's place.
			const pendingCommandsRef = useRef<{
				select?: string[];
				rename?: string;
			}>({});
			const pendingPlacesRef = useRef(new Set<string>());
			const applyPendingCommands = () => {
				const listed = new Set(itemsRef.current.map((item) => item.filePath));
				const pending = pendingCommandsRef.current;
				if (pending.select?.every((p) => listed.has(p))) {
					const paths = pending.select;
					pending.select = undefined;
					setSelection({ selected: paths, anchor: paths[0] });
					setCursor(paths[0]);
				}
				if (pending.rename !== undefined && listed.has(pending.rename)) {
					const target = pending.rename;
					pending.rename = undefined;
					if (renamable(target)) {
						cancelRenameTimer();
						setRenaming(target);
					}
				}
			};
			useImperativeHandle(viewCommandsRef, () => ({
				select: (paths) => {
					pendingCommandsRef.current.select = [...paths];
					applyPendingCommands();
				},
				rename: (itemPath) => {
					pendingCommandsRef.current.rename = itemPath;
					applyPendingCommands();
				},
				place: (itemPath, at) => {
					const holder = resolvedHolderRef.current;
					const lattice = latticeRef.current;
					// Kept arranged, every icon's place is its order's.
					if (!holder || !lattice || arrangement === "sorted") return;
					let place: [number, number] | undefined;
					if (at) {
						const rect = holder.getBoundingClientRect();
						place = [
							Math.round(at[0] - rect.left),
							Math.round(at[1] - rect.top),
						];
					} else {
						const taken = itemsRef.current.map((item) => {
							const el = iconElement(item.filePath);
							return el ? iconElementPlace(el) : item.initialPosition;
						});
						place = classicyFreeIconCell(
							taken,
							lattice.cells(taken.length + 1),
							lattice.pitch,
						);
					}
					if (!place) return;
					renamedPlacesRef.current.set(itemPath, place);
					if (!itemsRef.current.some((item) => item.filePath === itemPath))
						pendingPlacesRef.current.add(itemPath);
				},
				arrange: (key) => {
					setArrangedBy(key);
					setLayoutRequest((prev) => ({
						kind: "arrange",
						id: (prev?.id ?? 0) + 1,
					}));
				},
				lineUp: () =>
					setLayoutRequest((prev) => ({
						kind: "lineUp",
						id: (prev?.id ?? 0) + 1,
					})),
			}));

			const iconElement = (itemPath: string): HTMLElement | undefined => {
				const holder = resolvedHolderRef.current;
				if (!holder) return undefined;
				for (const el of holder.querySelectorAll<HTMLElement>(
					".classicyIcon[data-classicy-file-path]",
				)) {
					if (el.getAttribute("data-classicy-file-path") === itemPath)
						return el;
				}
				return undefined;
			};
			// Every icon in the view's order, where it is now (dragged icons
			// included).
			const places = (): ClassicyFileBrowserIconPlace[] =>
				itemsRef.current.map((item) => {
					const el = iconElement(item.filePath);
					return {
						path: item.filePath,
						name: item.name,
						location: el ? iconElementPlace(el) : item.initialPosition,
					};
				});
			// Every icon in the view's order and the box it covers on screen,
			// for Windows' range, the rectangle two icons span.
			const boxes = (): ClassicyFileBrowserIconBox[] =>
				itemsRef.current.flatMap((item) => {
					const el = iconElement(item.filePath);
					if (!el) return [];
					const r = el.getBoundingClientRect();
					return [
						{
							path: item.filePath,
							left: r.left,
							top: r.top,
							right: r.right,
							bottom: r.bottom,
						},
					];
				});
			const clickSelection = (
				itemPath: string,
				mods: { shiftKey: boolean; metaKey: boolean; ctrlKey: boolean },
			) =>
				classicyIconClickSelection(
					keys,
					itemsRef.current.map((item) => item.filePath),
					selectionRef.current,
					itemPath,
					mods,
					keys === "windows" ? boxes() : undefined,
				);

			// A slow second click on a selected icon's name renames it: armed
			// by the click, canceled by a second click (a double-click), any
			// other click or key, or a drag.
			const renameTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
			const cancelRenameTimer = useCallback(() => {
				if (renameTimerRef.current !== null) {
					clearTimeout(renameTimerRef.current);
					renameTimerRef.current = null;
				}
			}, []);
			useEffect(() => cancelRenameTimer, [cancelRenameTimer]);
			const pressRef = useRef<[number, number] | null>(null);

			const renamable = (itemPath: string): boolean => {
				if (!onRenameItem) return false;
				const entry = fs.resolve(itemPath);
				const parent = fs.resolve(path);
				return (
					!!entry &&
					entry._type !== ClassicyFileSystemEntryFileType.Drive &&
					entry._system !== true &&
					entry._readOnly !== true &&
					entry._derived !== true &&
					parent?._readOnly !== true
				);
			};

			// The press a click on an icon ends, when it selected at the press
			// (`selection.selectOn` "press"), or left the click to reset the
			// selection to its icon (`deferred`: an unmodified press on a
			// selected icon, comctl32's `nLButtonDownItem`, so a drag from it
			// carries the selection); `before` is the selection it found.
			const iconPressRef = useRef<{
				path: string;
				deferred: boolean;
				before: ClassicyFileBrowserIconSelection;
			} | null>(null);
			// The icon a drag of the selection was let go from: the click that
			// ends the drag (released over it) changes nothing.
			const draggedRef = useRef<string | null>(null);

			// A press on an icon (any button), before any drag it starts. Under
			// `selection.secondaryButton` "select", button 2 on an unselected
			// icon selects it alone (with no Shift or Control, as comctl32's
			// LISTVIEW_RButtonDown), and on a selected one keeps the selection,
			// so the menu its release shows acts on what is drawn selected
			// (WIG Ch.5 "Selection with the Mouse", pp.37-38). Under
			// `selection.selectOn` "press", button 1 selects here (pp.37-38;
			// App. A Table A.1, p.349; comctl32's LISTVIEW_LButtonDown): an
			// unselected icon, or any modified press, at once; the second
			// press of a double-click changes nothing.
			const selectFromPress = (
				itemPath: string,
				e: MouseEvent<HTMLElement>,
			) => {
				iconPressRef.current = null;
				if (e.button === 2) {
					if (!secondarySelects) return;
					cancelRenameTimer();
					setCursor(itemPath);
					if (
						selectionRef.current.selected.includes(itemPath) ||
						e.shiftKey ||
						e.metaKey ||
						e.ctrlKey
					) {
						return;
					}
					setSelection({ selected: [itemPath], anchor: itemPath });
					return;
				}
				if (e.button !== 0 || !selectsOnPress) return;
				cancelRenameTimer();
				const before = selectionRef.current;
				if (e.detail > 1) {
					iconPressRef.current = { path: itemPath, deferred: false, before };
					return;
				}
				const modified = e.shiftKey || e.metaKey || e.ctrlKey;
				const deferred = !modified && before.selected.includes(itemPath);
				iconPressRef.current = { path: itemPath, deferred, before };
				setCursor(itemPath);
				if (!deferred) setSelection(clickSelection(itemPath, e));
			};

			const selectFromClick = (
				itemPath: string,
				e: MouseEvent<HTMLElement>,
			) => {
				cancelRenameTimer();
				const press = iconPressRef.current;
				iconPressRef.current = null;
				if (draggedRef.current === itemPath) {
					draggedRef.current = null;
					return;
				}
				let before = selectionRef.current;
				if (press?.path === itemPath) {
					// The press selected: the click adds nothing.
					if (!press.deferred) return;
					before = press.before;
				} else if (windowsModifiers && e.detail > 1) {
					// Windows' second click of a double-click adjusts nothing (the
					// double-click acts on the set).
					return;
				}
				const next = clickSelection(itemPath, e);
				setSelection(next);
				setCursor(itemPath);
				const click = pressRef.current;
				const still =
					click !== null &&
					Math.abs(click[0] - e.clientX) <= 4 &&
					Math.abs(click[1] - e.clientY) <= 4;
				const onName =
					e.target instanceof Element && e.target.closest("p") !== null;
				if (
					e.detail === 1 &&
					still &&
					onName &&
					!e.shiftKey &&
					!e.metaKey &&
					!e.ctrlKey &&
					!e.altKey &&
					before.selected.length === 1 &&
					before.selected[0] === itemPath &&
					renamable(itemPath)
				) {
					renameTimerRef.current = setTimeout(() => {
						renameTimerRef.current = null;
						setRenaming(itemPath);
					}, CLASSICY_FILE_BROWSER_RENAME_DELAY_MS);
				}
			};

			// What a drag from `itemPath` carries: the selection, when the icon
			// is in it and the package's drags carry it (`fileBrowser.iconSelection`
			// "view"), else the icon alone. Read when the drag begins and ends,
			// after any selection its press made.
			const draggedPaths = (itemPath: string): string[] => {
				if (!dragsSelection) return [itemPath];
				const selected = orderedSelection();
				return selected.includes(itemPath) ? selected : [itemPath];
			};
			const dragParts = (itemPath: string) =>
				draggedPaths(itemPath).map((p) => {
					const el = iconElement(p);
					return {
						image: el?.querySelector("img"),
						label: el?.querySelector("p"),
					};
				});
			const groupMoveIdRef = useRef(0);
			// Let go in this same folder: rearrange (return false), the other
			// icons it carried moving as far. Over another folder or the
			// desktop: move them there. Anywhere else: they stay put.
			const dropIcon = (
				itemPath: string,
				target: ClassicyFileDropTarget | null,
				outlineTopLeft: [number, number],
				moved: [number, number],
			): boolean => {
				const dragged = draggedPaths(itemPath);
				if (dragsSelection) draggedRef.current = itemPath;
				if (
					target?.destination.kind === "folder" &&
					target.destination.path === path
				) {
					// Moved within the folder: the icon is selected, as it was
					// when it kept its own selection, unless it is one of the
					// selection already.
					setSelection((prev) =>
						prev.selected.includes(itemPath)
							? prev
							: { selected: [itemPath], anchor: itemPath },
					);
					setCursor(itemPath);
					if (dragged.length > 1) {
						groupMoveIdRef.current += 1;
						setGroupMove({
							paths: new Set(dragged.filter((p) => p !== itemPath)),
							by: moved,
							id: groupMoveIdRef.current,
						});
					}
					return false;
				}
				if (target && onMoveItems) {
					onMoveItems(dragged, target.destination, outlineTopLeft);
				}
				return true;
			};

			// Opens an icon (a double-click, or Return): under Windows'
			// modifiers with `openItemsFunc`, the whole selection it is in.
			const openIcon = (item: Pick<iconType, "filePath" | "onClickFunc">) => {
				if (opensSelection) {
					const selected = orderedSelection();
					if (selected.includes(item.filePath)) {
						openItemsFunc?.(selected);
						return;
					}
				}
				item.onClickFunc();
			};

			const commitRename = (itemPath: string, typed: string) => {
				setRenaming(null);
				const oldName = itemPath.split(fs.separator).pop() ?? "";
				// A hidden extension (`layout.files.extensions`) stays on.
				const name =
					typed + shownNames.hiddenExtension(oldName, fs.resolve(itemPath));
				if (name === oldName) return;
				const el = iconElement(itemPath);
				const place = el ? iconElementPlace(el) : undefined;
				const renamed = onRenameItem?.(itemPath, name);
				if (typeof renamed === "string" && renamed !== itemPath) {
					if (place) renamedPlacesRef.current.set(renamed, place);
					setSelection({ selected: [renamed], anchor: renamed });
					setCursor(renamed);
				}
			};

			// Moves to `target` from the keyboard: selects it (from the anchor
			// with Shift, under Windows' keys: the rectangle the anchor's icon
			// and its span, as Explorer's icon view takes it) and focuses its
			// icon.
			const moveTo = (target: string, extend: boolean) => {
				const order = itemsRef.current.map((item) => item.filePath);
				const anchor = selectionRef.current.anchor;
				setSelection(
					extend && keys === "windows" && anchor && order.includes(anchor)
						? {
								selected: classicyIconRectRange(boxes(), anchor, target),
								anchor,
							}
						: { selected: [target], anchor: target },
				);
				setCursor(target);
				iconElement(target)?.focus({ preventScroll: false });
			};

			const typeBufferRef = useRef("");
			const typeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
			useEffect(
				() => () => {
					if (typeTimerRef.current !== null) clearTimeout(typeTimerRef.current);
				},
				[],
			);

			const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
				cancelRenameTimer();
				if (e.defaultPrevented || renaming !== null) return;
				const target = e.target as HTMLElement;
				if (target.closest("input, textarea, [contenteditable='true']")) return;
				const order = itemsRef.current.map((item) => item.filePath);
				if (order.length === 0) return;
				const from =
					cursorRef.current && order.includes(cursorRef.current)
						? cursorRef.current
						: selectionRef.current.selected.find((p) => order.includes(p));
				const modified = e.metaKey || e.ctrlKey || e.altKey;

				if (ARROWS.has(e.key) && !modified) {
					e.preventDefault();
					if (!from) {
						moveTo(order[0], false);
						return;
					}
					const next = classicyIconInDirection(
						places(),
						from,
						e.key as ArrowDirection,
					);
					if (next) moveTo(next, e.shiftKey);
					return;
				}
				// Windows' paging keys select; the Mac's scroll the window.
				if (
					keys === "windows" &&
					!modified &&
					(e.key === "Home" ||
						e.key === "End" ||
						e.key === "PageUp" ||
						e.key === "PageDown")
				) {
					e.preventDefault();
					let next: string | null = null;
					if (e.key === "Home") next = order[0];
					else if (e.key === "End") next = order[order.length - 1];
					else if (from) {
						const viewport = resolvedHolderRef.current?.closest(
							".classicyScrollAreaViewport",
						);
						next = classicyIconPage(
							places(),
							from,
							e.key === "PageUp",
							viewport?.clientHeight ?? 0,
						);
					} else next = order[0];
					if (next) moveTo(next, e.shiftKey);
					return;
				}
				// Windows: F2 renames the selected item (Explorer's Rename).
				if (keys === "windows" && e.key === "F2" && !modified && !e.shiftKey) {
					const only = selectionRef.current.selected;
					if (only.length === 1 && renamable(only[0])) {
						e.preventDefault();
						setRenaming(only[0]);
					}
					return;
				}
				// Space is the Select key under `selection.keyboard` "windows"
				// (WIG Ch.5 "Keyboard Selection", p.43; App. B Table B.2, p.358;
				// comctl32's LISTVIEW_KeySelection): the keyboard's icon (the
				// first, with none) alone, Control (or ⌘) toggling it and
				// making it the anchor, Shift ranging from the anchor.
				if (e.key === " " && selectKeys && !e.altKey) {
					e.preventDefault();
					const at = from ?? order[0];
					if (e.ctrlKey || e.metaKey) {
						setSelection(
							clickSelection(at, { ...NO_MODIFIERS, ctrlKey: true }),
						);
						setCursor(at);
						iconElement(at)?.focus({ preventScroll: false });
						return;
					}
					moveTo(at, e.shiftKey);
					return;
				}
				if (e.key.length === 1 && e.key !== " " && !modified) {
					e.preventDefault();
					if (typeTimerRef.current !== null) clearTimeout(typeTimerRef.current);
					typeBufferRef.current += e.key;
					typeTimerRef.current = setTimeout(() => {
						typeBufferRef.current = "";
						typeTimerRef.current = null;
					}, CLASSICY_FILE_BROWSER_TYPEAHEAD_MS);
					const next = classicyIconTypeahead(
						keys,
						places(),
						typeBufferRef.current,
						from,
					);
					if (next) moveTo(next, false);
				}
			};

			// A press on empty space: deselects (unless a modifier is held)
			// and, dragged, draws the selection rectangle, selecting the icons
			// it touches (`classicyIconMarqueeSelection`: added to the
			// selection with a modifier, or under Windows' keys added with
			// Shift and toggled with Control). Button 2 does the same under
			// `selection.secondaryButton` "select", clearing whatever is held
			// (comctl32's LISTVIEW_RButtonDown). Under `fileBrowser.regionSelect`
			// the window scrolls toward an edge the pointer is near or past.
			const marqueeEndRef = useRef<(() => void) | null>(null);
			useEffect(() => () => marqueeEndRef.current?.(), []);
			const onMouseDown = (e: MouseEvent<HTMLDivElement>) => {
				pressRef.current = [e.clientX, e.clientY];
				// A new press: a drag's last release is long gone.
				draggedRef.current = null;
				const holder = resolvedHolderRef.current;
				if (!holder || e.target !== holder) return;
				const secondary = e.button === 2 && secondarySelects;
				if (e.button !== 0 && !secondary) return;
				cancelRenameTimer();
				// The keys go on from here: an arrow then selects the first icon.
				holder.focus({ preventScroll: true });
				const mods = secondary
					? NO_MODIFIERS
					: { shiftKey: e.shiftKey, metaKey: e.metaKey, ctrlKey: e.ctrlKey };
				const extend = mods.shiftKey || mods.metaKey || mods.ctrlKey;
				const before = selectionRef.current;
				const base = extend ? before.selected : [];
				if (!extend) setSelection({ selected: [] });
				marqueeEndRef.current?.();
				marqueeEndRef.current = startClassicyFileBrowserMarquee({
					holder,
					start: e,
					items: () =>
						holder.querySelectorAll(".classicyIcon[data-classicy-file-path]"),
					onBox: setMarquee,
					onTouched: (touched) => {
						const selected = classicyIconMarqueeSelection(
							keys,
							base,
							touched,
							mods,
						);
						setSelection((prev) => ({
							selected,
							anchor: prev.anchor ?? touched[0],
						}));
						if (touched[0] !== undefined) setCursor(touched[0]);
					},
					autoScroll: regionScrolls,
					// Escape (`input.escapeCancels`): the selection the press found.
					onCancel: () => setSelection(before),
					onEnd: () => {
						marqueeEndRef.current = null;
					},
				});
			};

			const selectedSet = new Set(selection.selected);
			// The view's Tab stop, when it keeps one: the keyboard's icon,
			// else the first.
			const tabStopPath =
				focusPath !== undefined &&
				items.some((item) => item.filePath === focusPath)
					? focusPath
					: items[0]?.filePath;

			return (
				// biome-ignore lint/a11y/noStaticElementInteractions: keys bubble here from the focused icon; a press on empty space starts the selection rectangle
				<div
					className={classNames("classicyFileBrowserFill", className)}
					style={style}
					ref={resolvedHolderRef}
					// Focusable by a press on its empty space only, so the keys
					// reach the view with no icon focused.
					tabIndex={-1}
					// A list box of options under Windows' selection keys.
					{...(selectKeys
						? { role: "listbox", "aria-multiselectable": true }
						: {})}
					onMouseDown={onMouseDown}
					onKeyDown={onKeyDown}
				>
					{items.map(({ isFolder: _isFolder, fileType, mountKey, ...item }) => {
						// The name as the package shows it (a registered type's
						// extension hidden under `layout.files.extensions`).
						const shown = shownNames.display(item.name, { _type: fileType });
						return (
							<ClassicyIcon
								{...item}
								{...(shown !== item.name
									? { label: shown, renameText: shown }
									: {})}
								key={mountKey}
								onClickFunc={() => openIcon(item)}
								onFileDrag={(target, _point, outlineTopLeft, moved) =>
									dropIcon(item.filePath, target, outlineTopLeft, moved)
								}
								fileDragParts={
									dragsSelection ? () => dragParts(item.filePath) : undefined
								}
								moveBy={
									groupMove?.paths.has(item.filePath)
										? { by: groupMove.by, id: groupMove.id }
										: undefined
								}
								selected={selectedSet.has(item.filePath)}
								onSelectPress={(e) => selectFromPress(item.filePath, e)}
								onSelectClick={(e) => selectFromClick(item.filePath, e)}
								listOption={selectKeys}
								tabStop={!roveFocus || item.filePath === tabStopPath}
								renaming={renaming === item.filePath}
								onRenameCommit={(name) => commitRename(item.filePath, name)}
								onRenameCancel={() => setRenaming(null)}
							/>
						);
					})}
					{marquee && (
						<div
							className={"classicyFileBrowserSelect"}
							aria-hidden={true}
							style={{
								left: marquee.left,
								top: marquee.top,
								width: marquee.width,
								height: marquee.height,
							}}
						/>
					)}
				</div>
			);
		},
	);

ClassicyFileBrowserViewIcons.displayName = "ClassicyFileBrowserViewIcons";
