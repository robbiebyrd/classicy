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
import type { FinderIconViewOptions } from "@/SystemFolder/Finder/FinderContext";
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
	type ClassicyFileBrowserIconPlace,
	type ClassicyFileBrowserIconSelection,
	classicyIconClickSelection,
	classicyIconInDirection,
	classicyIconPage,
	classicyIconRange,
	classicyIconTypeahead,
	classicyRectsIntersect,
} from "@/SystemFolder/SystemResources/File/ClassicyFileBrowserIconSelection";
import {
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
import { onClassicyPointerStreamLost } from "@/SystemFolder/SystemResources/File/ClassicyPointerStreamLost.internal";
import { listClassicyTrashItems } from "@/SystemFolder/SystemResources/File/ClassicyTrash";
import {
	isClassicyTrashFolder,
	useClassicyTrashIcon,
} from "@/SystemFolder/SystemResources/File/ClassicyTrashIcon.internal";
import { ClassicyIcon } from "@/SystemFolder/SystemResources/Icon/ClassicyIcon";
import type { ClassicyTableSelectionApi } from "@/SystemFolder/SystemResources/Table/ClassicyTable";

export type ClassicyFileBrowserViewIconsProps = {
	fs: ClassicyFileSystem;
	path: string;
	appId: string;
	dirOnClickFunc?: (path: string) => void;
	fileOnClickFunc?: (path: string) => void;
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
	/** Extra class names, merged onto the root element after the component's own. */
	className?: string;
	/** Inline style for the root element. */
	style?: CSSProperties;
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
	onFileDrag: (
		target: ClassicyFileDropTarget | null,
		point: [number, number],
		outlineTopLeft: [number, number],
	) => boolean;
	/** A folder or a drive: listed first under `fileList.foldersFirst`. */
	isFolder: boolean;
};

const ARROWS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);

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
			holderRef,
			hideFilesCreatedAfter = null,
			showInvisible = true,
			iconViewOptions,
			onMoveItems,
			onRenameItem,
			selectionApiRef,
			className,
			style,
		}) => {
			const activeTheme = useAppManager(
				(s) => s.System.Manager.Appearance.activeTheme,
			);
			const layout = useClassicyAppearanceLayout();
			// Windows' selection keys, or the Mac's (the default).
			const keys = layout.fileBrowser?.keys ?? "mac";
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
			// Where a renamed item's icon goes: where it was under its old name.
			const renamedPlacesRef = useRef(new Map<string, [number, number]>());

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
				const sorted =
					arrangement === "sorted" && keepArrangedBy
						? [...entries].sort((a, b) =>
								finderEntryComparator(keepArrangedBy)(
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

				const updatedIcons = ordered.map(([filename, properties], index) => {
					const itemPath = `${path}${fs.separator}${filename}`;
					return {
						filePath: itemPath,
						isFolder: isFolderEntry(properties),
						dropFolderPath:
							properties._type === "directory" ? itemPath : undefined,
						// Let go in this same folder: rearrange (return false). Over
						// another folder or the desktop: move it there. Anywhere
						// else: it stays put.
						onFileDrag: (
							target: ClassicyFileDropTarget | null,
							_point: [number, number],
							outlineTopLeft: [number, number],
						) => {
							if (
								target?.destination.kind === "folder" &&
								target.destination.path === path
							) {
								// Moved within the folder: the icon is selected, as
								// it was when it kept its own selection, unless it is
								// one of the selection already.
								setSelection((prev) =>
									prev.selected.includes(itemPath)
										? prev
										: { selected: [itemPath], anchor: itemPath },
								);
								cursorRef.current = itemPath;
								return false;
							}
							if (target && onMoveItems) {
								onMoveItems([itemPath], target.destination, outlineTopLeft);
							}
							return true;
						},
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
							cleanupIcon(
								activeTheme,
								index,
								ordered.length,
								containerMeasure,
								iconSize,
								iconMetrics,
							),
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
				onMoveItems,
				trashIcon,
				foldersFirst,
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
			// moved to).
			const cursorRef = useRef<string | undefined>(undefined);
			const [renaming, setRenaming] = useState<string | null>(null);
			const [marquee, setMarquee] = useState<{
				left: number;
				top: number;
				width: number;
				height: number;
			} | null>(null);

			const itemsRef = useRef(items);
			itemsRef.current = items;
			// Paths no longer listed leave the selection.
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
					if (!listed.has(key)) renamedPlacesRef.current.delete(key);
				}
			}, [items]);

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

			const selectFromClick = (
				itemPath: string,
				e: MouseEvent<HTMLElement>,
			) => {
				cancelRenameTimer();
				const before = selectionRef.current;
				const order = itemsRef.current.map((item) => item.filePath);
				const next = classicyIconClickSelection(
					keys,
					order,
					before,
					itemPath,
					e,
				);
				setSelection(next);
				cursorRef.current = itemPath;
				const press = pressRef.current;
				const still =
					press !== null &&
					Math.abs(press[0] - e.clientX) <= 4 &&
					Math.abs(press[1] - e.clientY) <= 4;
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

			const commitRename = (itemPath: string, name: string) => {
				setRenaming(null);
				const oldName = itemPath.split(fs.separator).pop() ?? "";
				if (name === oldName) return;
				const el = iconElement(itemPath);
				const place = el ? iconElementPlace(el) : undefined;
				const renamed = onRenameItem?.(itemPath, name);
				if (typeof renamed === "string" && renamed !== itemPath) {
					if (place) renamedPlacesRef.current.set(renamed, place);
					setSelection({ selected: [renamed], anchor: renamed });
					cursorRef.current = renamed;
				}
			};

			// Moves to `target` from the keyboard: selects it (from the anchor
			// with Shift, under Windows' keys) and focuses its icon.
			const moveTo = (target: string, extend: boolean) => {
				const order = itemsRef.current.map((item) => item.filePath);
				const anchor = selectionRef.current.anchor;
				setSelection(
					extend && keys === "windows" && anchor && order.includes(anchor)
						? { selected: classicyIconRange(order, anchor, target), anchor }
						: { selected: [target], anchor: target },
				);
				cursorRef.current = target;
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
			// it touches (added to the selection with a modifier).
			const marqueeEndRef = useRef<(() => void) | null>(null);
			useEffect(() => () => marqueeEndRef.current?.(), []);
			const onMouseDown = (e: MouseEvent<HTMLDivElement>) => {
				pressRef.current = [e.clientX, e.clientY];
				const holder = resolvedHolderRef.current;
				if (e.button !== 0 || !holder || e.target !== holder) return;
				cancelRenameTimer();
				// The keys go on from here: an arrow then selects the first icon.
				holder.focus({ preventScroll: true });
				const extend = e.shiftKey || e.metaKey || e.ctrlKey;
				const base = extend ? selectionRef.current.selected : [];
				if (!extend) setSelection({ selected: [] });
				const startRect = holder.getBoundingClientRect();
				const start: [number, number] = [
					e.clientX - startRect.left,
					e.clientY - startRect.top,
				];
				let moved = false;
				const move = (ev: globalThis.MouseEvent) => {
					const rect = holder.getBoundingClientRect();
					const now: [number, number] = [
						ev.clientX - rect.left,
						ev.clientY - rect.top,
					];
					if (
						!moved &&
						Math.abs(now[0] - start[0]) < 2 &&
						Math.abs(now[1] - start[1]) < 2
					) {
						return;
					}
					moved = true;
					const box = {
						left: Math.min(start[0], now[0]),
						top: Math.min(start[1], now[1]),
						width: Math.abs(now[0] - start[0]),
						height: Math.abs(now[1] - start[1]),
					};
					setMarquee(box);
					const client = {
						left: box.left + rect.left,
						top: box.top + rect.top,
						right: box.left + box.width + rect.left,
						bottom: box.top + box.height + rect.top,
					};
					const touched = itemsRef.current
						.map((item) => item.filePath)
						.filter((itemPath) => {
							const el = iconElement(itemPath);
							return (
								!!el &&
								classicyRectsIntersect(client, el.getBoundingClientRect())
							);
						});
					const selected = [...new Set([...base, ...touched])];
					setSelection((prev) => ({
						selected,
						anchor: prev.anchor ?? touched[0],
					}));
					cursorRef.current = touched[0] ?? cursorRef.current;
				};
				const end = () => {
					document.removeEventListener("mousemove", move);
					document.removeEventListener("mouseup", end);
					stopWatching();
					marqueeEndRef.current = null;
					setMarquee(null);
				};
				const stopWatching = onClassicyPointerStreamLost(end);
				marqueeEndRef.current = end;
				document.addEventListener("mousemove", move);
				document.addEventListener("mouseup", end);
			};

			const selectedSet = new Set(selection.selected);

			return (
				// biome-ignore lint/a11y/noStaticElementInteractions: keys bubble here from the focused icon; a press on empty space starts the selection rectangle
				<div
					className={classNames("classicyFileBrowserFill", className)}
					style={style}
					ref={resolvedHolderRef}
					// Focusable by a press on its empty space only, so the keys
					// reach the view with no icon focused.
					tabIndex={-1}
					onMouseDown={onMouseDown}
					onKeyDown={onKeyDown}
				>
					{items.map(({ isFolder: _isFolder, ...item }) => (
						<ClassicyIcon
							{...item}
							key={item.name}
							selected={selectedSet.has(item.filePath)}
							onSelectClick={(e) => selectFromClick(item.filePath, e)}
							renaming={renaming === item.filePath}
							onRenameCommit={(name) => commitRename(item.filePath, name)}
							onRenameCancel={() => setRenaming(null)}
						/>
					))}
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
