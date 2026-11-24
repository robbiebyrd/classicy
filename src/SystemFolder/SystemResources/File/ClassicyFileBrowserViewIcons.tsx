import "./ClassicyFileBrowserViewTable.scss";
import classNames from "classnames";
import {
	type CSSProperties,
	type FC as FunctionalComponent,
	memo,
	type RefObject,
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import type { ClassicyTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import type { FinderIconViewOptions } from "@/SystemFolder/Finder/FinderContext";
import {
	asFinderDate,
	finderEntryComparator,
	iconViewIconSize,
} from "@/SystemFolder/Finder/FinderViewOptions";
import type { ClassicyDesktopIconMetrics } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconContext";
import {
	classicyFileBrowserScroller,
	isClassicyFileBrowserBackground,
} from "@/SystemFolder/SystemResources/File/ClassicyFileBrowserMarquee.internal";
import {
	cleanupIcon,
	iconGridLattice,
	iconImageByType,
	readClassicyDesktopIconMetrics,
} from "@/SystemFolder/SystemResources/File/ClassicyFileBrowserUtils";
import {
	CLASSICY_FILE_PATH_ATTRIBUTE,
	type ClassicyFileDropDestination,
	type ClassicyFileDropTarget,
} from "@/SystemFolder/SystemResources/File/ClassicyFileDrag";
import type { ClassicyFileDragOutlinePart } from "@/SystemFolder/SystemResources/File/ClassicyFileDragOutline";
import type { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import type { ClassicyFileSystemEntryMetadata } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import { listClassicyTrashItems } from "@/SystemFolder/SystemResources/File/ClassicyTrash";
import {
	isClassicyTrashFolder,
	useClassicyTrashIcon,
} from "@/SystemFolder/SystemResources/File/ClassicyTrashIcon.internal";
import {
	type ClassicyMarqueeItem,
	openClassicyControlPressContextMenu,
	useClassicyMarqueeSelection,
} from "@/SystemFolder/SystemResources/File/useClassicyMarqueeSelection.internal";
import {
	ClassicyIcon,
	type ClassicyIconSelectionGesture,
} from "@/SystemFolder/SystemResources/Icon/ClassicyIcon";
import type { ClassicyTableSelectionApi } from "@/SystemFolder/SystemResources/Table/ClassicyTable";

// An icon re-renders only when its own props change: a selection change
// redraws the icons it changes, not every icon in the folder.
const ClassicyFileBrowserIcon = memo(ClassicyIcon);

/** One icon's handlers, kept for as long as its item is listed. */
type IconHandlers = {
	onSelectedChange: (selected: boolean) => void;
	onSelectionGesture: (gesture: ClassicyIconSelectionGesture) => void;
	fileDragParts: () => ClassicyFileDragOutlinePart[];
};

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
	 * Receives the view's selection handle (`{ selectAll, select }`), for
	 * menu commands such as Edit → Select All.
	 */
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
		travel: [number, number],
	) => boolean;
};

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
			selectionApiRef,
			className,
			style,
		}) => {
			const activeTheme = useAppManager(
				(s) => s.System.Manager.Appearance.activeTheme,
			);
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
			const itemsRef = useRef(items);
			itemsRef.current = items;

			// The selected items' paths. The view keeps the selection, not
			// each icon, so a selection rectangle can select many at once. The
			// ref is the selection as of the last change, ahead of the render
			// that shows it, so a press and the drag it starts read the same.
			const [selected, setSelected] = useState<ReadonlySet<string>>(
				() => new Set(),
			);
			const selectedRef = useRef(selected);
			const updateSelection = useCallback(
				(next: (prev: ReadonlySet<string>) => ReadonlySet<string>) => {
					const value = next(selectedRef.current);
					if (value === selectedRef.current) return;
					selectedRef.current = value;
					setSelected(value);
				},
				[],
			);
			const setItemSelected = useCallback(
				(itemPath: string, isSelected: boolean) =>
					updateSelection((prev) => {
						if (prev.has(itemPath) === isSelected) return prev;
						const next = new Set(prev);
						if (isSelected) next.add(itemPath);
						else next.delete(itemPath);
						return next;
					}),
				[updateSelection],
			);
			// Mac OS 8.1's Finder: a click selects the icon alone, and Shift
			// (or Command) toggles it; a press on an unselected icon selects it
			// alone at once, so its drag carries it alone, while a press on a
			// selected one keeps the selection for a drag of all of it.
			const onGesture = useCallback(
				(itemPath: string, gesture: ClassicyIconSelectionGesture) => {
					const toggles = gesture.shiftKey || gesture.metaKey;
					if (gesture.type === "press") {
						if (!toggles && !selectedRef.current.has(itemPath))
							updateSelection(() => new Set([itemPath]));
						return;
					}
					if (toggles)
						setItemSelected(itemPath, !selectedRef.current.has(itemPath));
					else
						updateSelection((prev) =>
							prev.size === 1 && prev.has(itemPath)
								? prev
								: new Set([itemPath]),
						);
				},
				[updateSelection, setItemSelected],
			);
			// An item that left the folder leaves the selection.
			useEffect(() => {
				updateSelection((prev) => {
					const paths = new Set(items.map((item) => item.filePath));
					const kept = [...prev].filter((p) => paths.has(p));
					return kept.length === prev.size ? prev : new Set(kept);
				});
			}, [items, updateSelection]);

			// Edit → Select All, and a selection made at once.
			useEffect(() => {
				if (!selectionApiRef) return;
				selectionApiRef.current = {
					selectAll: () =>
						updateSelection(
							() => new Set(itemsRef.current.map((item) => item.filePath)),
						),
					select: (paths) => updateSelection(() => new Set(paths)),
				};
				return () => {
					selectionApiRef.current = null;
				};
			}, [selectionApiRef, updateSelection]);

			// A drag of a selected icon carries the whole selection (Mac OS
			// 8.1, as on the desktop and in the list view): its outline traces
			// every selected icon, and a drop moves every selected item. The
			// selection as of the press: a press on an unselected icon has
			// already made it the selection alone.
			const draggedWith = useCallback(
				(itemPath: string): string[] =>
					selectedRef.current.has(itemPath)
						? [...selectedRef.current]
						: [itemPath],
				[],
			);
			const dragPartsOf = useCallback(
				(itemPath: string): ClassicyFileDragOutlinePart[] => {
					const holder = resolvedHolderRef.current;
					return draggedWith(itemPath).flatMap((p) => {
						const el = Array.from(
							holder?.querySelectorAll(
								`:scope > .classicyIcon[${CLASSICY_FILE_PATH_ATTRIBUTE}]`,
							) ?? [],
						).find(
							(icon) => icon.getAttribute(CLASSICY_FILE_PATH_ATTRIBUTE) === p,
						);
						return el
							? [
									{
										image: el.querySelector("img"),
										label: el.querySelector("p"),
									},
								]
							: [];
					});
				},
				[draggedWith, resolvedHolderRef],
			);
			// The other dragged icons moved as far as the dragged one, when a
			// group is let go in its own folder.
			const [groupMove, setGroupMove] = useState<{
				paths: ReadonlySet<string>;
				move: { id: number; dx: number; dy: number };
			} | null>(null);
			const groupMoveIdRef = useRef(0);

			// Each icon's handlers, the same functions for as long as it is
			// listed, so the memoized icons do not re-render for new ones.
			const handlersRef = useRef(new Map<string, IconHandlers>());
			const handlersFor = (itemPath: string): IconHandlers => {
				let handlers = handlersRef.current.get(itemPath);
				if (!handlers) {
					handlers = {
						onSelectedChange: (isSelected) =>
							setItemSelected(itemPath, isSelected),
						onSelectionGesture: (gesture) => onGesture(itemPath, gesture),
						fileDragParts: () => dragPartsOf(itemPath),
					};
					handlersRef.current.set(itemPath, handlers);
				}
				return handlers;
			};

			// Selection by dragging a rectangle from empty space, over the
			// icons' shapes and labels, scrolling the window past its edges.
			const { start: startMarquee, marquee } = useClassicyMarqueeSelection({
				surfaceRef: resolvedHolderRef,
				getItems: () =>
					Array.from(
						resolvedHolderRef.current?.querySelectorAll<HTMLElement>(
							":scope > .classicyIcon[data-classicy-file-path]",
						) ?? [],
						(el): ClassicyMarqueeItem => ({
							id: el.getAttribute("data-classicy-file-path") ?? "",
							image: el.querySelector<HTMLImageElement>(
								".classicyIconMask img",
							),
							label: el.querySelector("p"),
						}),
					),
				getSelection: () => [...selectedRef.current],
				onSelect: (paths) => updateSelection(() => new Set(paths)),
				getScroller: () =>
					classicyFileBrowserScroller(resolvedHolderRef.current),
			});
			// A press on empty space: the icons' holder, or the window
			// contents around it (below the holder once they scroll). A
			// Control-press there is the contextual-menu click: it deselects
			// and opens the menu, as in 8.1, and draws no rectangle.
			useEffect(() => {
				const holder = resolvedHolderRef.current;
				if (!holder) return;
				const area = classicyFileBrowserScroller(holder) ?? holder;
				const onDown = (e: MouseEvent) => {
					if (e.button !== 0 || e.defaultPrevented) return;
					const target = e.target;
					if (
						!(target instanceof Element) ||
						!isClassicyFileBrowserBackground(target, holder, area)
					)
						return;
					// The keyboard to the icons, as the desktop takes it on a
					// press on itself: Select All, Delete and the like act here.
					holder.focus({ preventScroll: true });
					if (e.ctrlKey) {
						updateSelection((prev) => (prev.size === 0 ? prev : new Set()));
						openClassicyControlPressContextMenu(e);
						return;
					}
					startMarquee(e);
				};
				area.addEventListener("mousedown", onDown);
				return () => area.removeEventListener("mousedown", onDown);
			}, [resolvedHolderRef, startMarquee, updateSelection]);

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
				const ordered =
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
						dropFolderPath:
							properties._type === "directory" ? itemPath : undefined,
						// Let go in this same folder: rearrange (return false). Over
						// another folder or the desktop: move it there. Anywhere
						// else: it stays put.
						onFileDrag: (
							target: ClassicyFileDropTarget | null,
							_point: [number, number],
							outlineTopLeft: [number, number],
							travel: [number, number],
						) => {
							const dragged = draggedWith(itemPath);
							if (
								target?.destination.kind === "folder" &&
								target.destination.path === path
							) {
								// The dragged icon moves itself; the rest of the
								// selection moves as far.
								const others = dragged.filter((p) => p !== itemPath);
								if (others.length > 0 && !positionLocked) {
									groupMoveIdRef.current += 1;
									setGroupMove({
										paths: new Set(others),
										move: {
											id: groupMoveIdRef.current,
											dx: travel[0],
											dy: travel[1],
										},
									});
								}
								return false;
							}
							if (target && onMoveItems) {
								onMoveItems(dragged, target.destination, outlineTopLeft);
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
						initialPosition: cleanupIcon(
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
				draggedWith,
			]);

			// Handlers of items no longer listed go.
			useEffect(() => {
				const listed = new Set(items.map((item) => item.filePath));
				for (const itemPath of handlersRef.current.keys())
					if (!listed.has(itemPath)) handlersRef.current.delete(itemPath);
			}, [items]);

			return (
				<div
					className={classNames("classicyFileBrowserFill", className)}
					style={style}
					ref={resolvedHolderRef}
					// Focusable from code only: a press on empty space puts the
					// keyboard here, for Select All and Delete.
					tabIndex={-1}
				>
					{items.map((item) => (
						<ClassicyFileBrowserIcon
							{...item}
							{...handlersFor(item.filePath)}
							key={item.name}
							selected={selected.has(item.filePath)}
							moveBy={
								groupMove?.paths.has(item.filePath) ? groupMove.move : undefined
							}
						/>
					))}
					{marquee}
				</div>
			);
		},
	);

ClassicyFileBrowserViewIcons.displayName = "ClassicyFileBrowserViewIcons";
