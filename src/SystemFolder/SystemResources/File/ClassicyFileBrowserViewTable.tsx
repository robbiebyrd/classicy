import {
	fileTypeDisplayName,
	iconImageByType,
} from "@/SystemFolder/SystemResources/File/ClassicyFileBrowserUtils";
import "./ClassicyFileBrowserViewTable.scss";
import classNames from "classnames";
import {
	type CSSProperties,
	type FC as FunctionalComponent,
	type MouseEvent,
	memo,
	type RefObject,
	useCallback,
	useEffect,
	useImperativeHandle,
	useMemo,
	useRef,
	useState,
} from "react";
import { useClassicyAppearanceLayout } from "@/Appearance/useClassicyAppearanceLayout";
import type { FinderListViewOptions } from "@/SystemFolder/Finder/FinderContext";
import {
	asFinderDate,
	formatFinderDate,
} from "@/SystemFolder/Finder/FinderViewOptions";
import type {
	ClassicyFileBrowserArrangeKey,
	ClassicyFileBrowserMoveItems,
	ClassicyFileBrowserViewCommands,
} from "@/SystemFolder/SystemResources/File/ClassicyFileBrowserViewIcons";
import {
	CLASSICY_DROP_FOLDER_ATTRIBUTE,
	CLASSICY_FILE_PATH_ATTRIBUTE,
	startClassicyFileDrag,
} from "@/SystemFolder/SystemResources/File/ClassicyFileDrag";
import {
	classicyFileDragAppearanceCallbacks,
	useClassicyFileDragEndOnUnmount,
} from "@/SystemFolder/SystemResources/File/ClassicyFileDragAppearance.internal";
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
import { ClassicyIconImage } from "@/SystemFolder/SystemResources/Icon/ClassicyIconImage.internal";
import { ClassicyRenameField } from "@/SystemFolder/SystemResources/Icon/ClassicyRenameField.internal";
import {
	ClassicyTable,
	type ClassicyTableCellContext,
	type ClassicyTableColumn,
	type ClassicyTableSelectionApi,
} from "@/SystemFolder/SystemResources/Table/ClassicyTable";
import { ClassicyTriangle } from "@/SystemFolder/SystemResources/Triangle/ClassicyTriangle";

/**
 * A directory-list row. Mirrors the file-system metadata but adds `subRows`,
 * which is populated only for directories the user has disclosed (expanded) so
 * the tree is materialized lazily rather than all at once.
 */
type FileRow = ClassicyFileSystemEntryMetadata & {
	subRows?: FileRow[];
};

/** Folders (and drives) 0, files 1: the list's groups under `foldersFirst`. */
const folderRowGroup = (row: FileRow): number =>
	row._type === ClassicyFileSystemEntryFileType.Directory ||
	row._type === ClassicyFileSystemEntryFileType.Drive
		? 0
		: 1;

// Hoisted so its identity is stable across renders: the columns useMemo below
// keys on this object, and a fresh literal on every render (the omitted-prop
// case, when the component still re-renders on every size resolution) would
// invalidate the memo constantly — the same DOM-remount hazard fixed for
// renderers by 99fc5dd2.
/** The list's column for each Arrange Icons order. */
const ARRANGE_COLUMNS: Record<ClassicyFileBrowserArrangeKey, string> = {
	name: "_name",
	kind: "_type",
	size: "_size",
	modified: "_modifiedOn",
};

/** Every row path listed, disclosed folders' rows included. */
const listedRowPaths = (rows: FileRow[], into = new Set<string>()) => {
	for (const row of rows) {
		if (row._path) into.add(row._path);
		if (row.subRows) listedRowPaths(row.subRows, into);
	}
	return into;
};

const DEFAULT_LIST_COLUMN_FLAGS: FinderListViewOptions["columns"] = {
	modified: false,
	created: false,
	size: true,
	kind: true,
	label: false,
	comments: false,
	version: false,
};

type ClassicyFileBrowserViewTableProps = {
	fs: ClassicyFileSystem;
	path: string;
	appId: string;
	iconSize?: number;
	dirOnClickFunc?: (path: string) => void;
	fileOnClickFunc?: (path: string) => void;
	/**
	 * Opens every selected item at once, when a double-click opens the
	 * selection (ClassicyTable's `onActivateSelection`, under
	 * `layout.selection.modifiers: "windows"`). Omitted, a double-click
	 * opens its own row through `dirOnClickFunc` / `fileOnClickFunc`.
	 */
	openItemsFunc?: (paths: string[]) => void;
	holderRef?: RefObject<HTMLDivElement | null>;
	hideFilesCreatedAfter?: Date | string | number | null;
	/** List entries marked `_invisible`. Defaults to true. */
	showInvisible?: boolean;
	listViewOptions?: FinderListViewOptions;
	/** The in-world "now" for relative dates, already converted to the
	 *  virtual clock's local frame. Omitted means real time. */
	now?: Date;
	selectionApiRef?: RefObject<ClassicyTableSelectionApi | null>;
	/** Controlled selection by row path. Omit for uncontrolled. */
	selectedPaths?: string[];
	onSelectionChange?: (paths: string[]) => void;
	/** Receives the list's focusable keyboard target (see ClassicyTable's
	 *  `containerRef`), e.g. for a window's `initialFocusRef`. */
	focusTargetRef?: RefObject<HTMLDivElement | null>;
	/** Move items dragged out of the list (see `ClassicyFileBrowser`). */
	onMoveItems?: ClassicyFileBrowserMoveItems;
	/**
	 * Rename an item: called with its path and the name typed when a rename
	 * begun through `viewCommandsRef` (Explorer's Rename, New, F2) is
	 * committed. Return the item's new path when it was renamed, so the
	 * list keeps it selected. Without it, names are not editable.
	 */
	onRenameItem?: (path: string, name: string) => string | undefined;
	/**
	 * Receives the list's commands (`ClassicyFileBrowserViewCommands`):
	 * select, rename in place, and sort by a column (Arrange Icons); it
	 * places nothing and lines nothing up.
	 */
	viewCommandsRef?: RefObject<ClassicyFileBrowserViewCommands | null>;
	/** Extra class names, merged onto the table's root after the component's own. */
	className?: string;
	/** Inline style for the table's root. */
	style?: CSSProperties;
};

// Marks a row's name cell with its path, so a drag can find every dragged
// row's icon and name to outline them.

export const ClassicyFileBrowserViewTable: FunctionalComponent<ClassicyFileBrowserViewTableProps> =
	memo(
		({
			fs,
			path,
			iconSize = 64,
			appId,
			dirOnClickFunc = () => {},
			fileOnClickFunc = () => {},
			openItemsFunc,
			hideFilesCreatedAfter = null,
			showInvisible = true,
			listViewOptions,
			now,
			selectionApiRef,
			selectedPaths,
			onSelectionChange,
			focusTargetRef,
			onMoveItems,
			onRenameItem,
			viewCommandsRef,
			className,
			style,
		}) => {
			// The latest selection, so a drag that starts on a selected row
			// carries every selected row (Mac OS 8 list views did).
			const selectionRef = useRef<string[]>(selectedPaths ?? []);
			useEffect(() => {
				if (selectedPaths) selectionRef.current = selectedPaths;
			}, [selectedPaths]);
			const trackSelection = useCallback(
				(paths: string[]) => {
					selectionRef.current = paths;
					onSelectionChange?.(paths);
				},
				[onSelectionChange],
			);

			// A row drag in progress ends (canceled) before the list unmounts.
			const endFileDragOnUnmount = useClassicyFileDragEndOnUnmount();
			const startRowDrag = useCallback(
				(
					e: MouseEvent<HTMLDivElement>,
					rowPath: string,
					emitDrag: ClassicyTableCellContext["emitDrag"],
				) => {
					if (e.button !== 0 || !onMoveItems) return;
					const table = (e.currentTarget as HTMLElement).closest(
						".classicyFileBrowserViewTableContainer",
					);
					// What the drag carries: the selection when the row is in it,
					// else the row alone, read once, when the drag begins (the
					// pointer past the threshold) or ends, rather than at this
					// press, which the table's own handler (below this cell's)
					// may still select with (`selection.selectOn` "press";
					// comctl32 begins a drag from the selection the press made).
					// Under a package that selects at the click the press changes
					// nothing, so it is the selection the press found either way.
					let dragged: string[] | null = null;
					const draggedPaths = () => {
						if (!dragged) {
							const selection = selectionRef.current;
							dragged = selection.includes(rowPath) ? selection : [rowPath];
						}
						return dragged;
					};
					const cellsOf = (paths: string[]) =>
						paths
							.map((p) =>
								Array.from(
									table?.querySelectorAll(
										`[${CLASSICY_FILE_PATH_ATTRIBUTE}]`,
									) ?? [],
								).find(
									(el) => el.getAttribute(CLASSICY_FILE_PATH_ATTRIBUTE) === p,
								),
							)
							.filter((el): el is Element => el !== undefined);
					const abandon = startClassicyFileDrag({
						start: { clientX: e.clientX, clientY: e.clientY },
						// Read when the outline is first drawn.
						get parts() {
							return cellsOf(draggedPaths()).map((cell) => ({
								image: cell.querySelector("img"),
								label: cell.querySelector(
									".classicyFileBrowserViewTableRowIconLabel",
								),
							}));
						},
						source: e.currentTarget,
						...(emitDrag && classicyFileDragAppearanceCallbacks(emitDrag)),
						onDrop: (target, _point, outlineTopLeft) => {
							if (!target) return;
							if (
								target.destination.kind === "folder" &&
								target.destination.path === path
							) {
								return;
							}
							onMoveItems(draggedPaths(), target.destination, outlineTopLeft);
						},
					});
					endFileDragOnUnmount(abandon);
				},
				[onMoveItems, path, endFileDragOnUnmount],
			);
			// Derive the effective options once, so an omitted prop reproduces
			// today's rendering — three columns, sizes computed, no dates.
			// Where the package draws the column titles: in the list (Mac OS 8)
			// or above it, over the window's scroll bar (System 7).
			const layout = useClassicyAppearanceLayout();
			const headerPlacement = layout.fileBrowser?.listColumnTitles ?? "inList";
			// Folders before files, whatever the sort (Windows Explorer), under
			// a package that says so; else sorted together (the Finder).
			const foldersFirst = layout.fileList?.foldersFirst === true;
			const columnFlags = listViewOptions?.columns ?? DEFAULT_LIST_COLUMN_FLAGS;
			const computeFolderSizes = listViewOptions?.calculateFolderSizes ?? true;
			const relativeDates = listViewOptions?.useRelativeDate ?? true;
			// A fresh `Date` on every render (when `now` is omitted) would
			// invalidate the columns useMemo constantly — see 99fc5dd2. Guard it
			// to a stable Date keyed only on the caller-supplied instant.
			const nowMs = now?.getTime();
			const effectiveNow = useMemo(
				() => (nowMs === undefined ? new Date() : new Date(nowMs)),
				[nowMs],
			);

			// Which directories are disclosed, keyed by full path. Controlled here
			// (not inside ClassicyTable) because the lazily-materialized `subRows`
			// below depend on it.
			const [expandedPaths, setExpandedPaths] = useState<string[]>([]);
			// The active package's Trash art, for a listing of the root.
			const trashIcon = useClassicyTrashIcon(
				listClassicyTrashItems(fs).length > 0,
			);

			// Takes the row's own full path rather than rebuilding one from the
			// table's `path` prop: disclosed rows can sit several levels below it,
			// and rebuilding would drop the intervening directories.
			const openFileOrFolder = (
				properties: ClassicyFileSystemEntryMetadata,
				entryPath: string,
			) => {
				if (properties._type === "directory") {
					return dirOnClickFunc(entryPath);
				}
				return fileOnClickFunc(entryPath);
			};

			// Folder sizes resolve asynchronously; cache them by path so a rebuild of
			// the (lazily materialized) tree keeps the sizes we've already computed.
			const [sizes, setSizes] = useState<Map<string, number>>(new Map());

			const expandedPathSet = useMemo(
				() => new Set(expandedPaths),
				[expandedPaths],
			);

			// Build the currently-visible rows for a directory. A disclosed directory
			// recursively contributes its children as `subRows`, one depth deeper.
			const data = useMemo(() => {
				const buildRows = (dirPath: string): FileRow[] => {
					// Thread the virtual-clock cutoff through every level so files
					// "created in the future" stay hidden in disclosed subfolders too.
					const directoryItems = fs.filterByType(
						dirPath,
						undefined,
						showInvisible,
						hideFilesCreatedAfter,
					);
					return Object.entries(directoryItems).map(([filename, metadata]) => {
						const rowPath = `${dirPath}:${filename}`;
						const filtered = {} as Record<string, unknown>;
						for (const [key, value] of Object.entries(metadata)) {
							if (key.startsWith("_")) {
								filtered[key] = value;
							}
						}
						filtered._name = filename;
						filtered._path = rowPath;
						// A listing of the root shows the Trash (when invisibles
						// show): drawn with the active package's art, not its
						// stored `_icon` (kept when no package has Trash art).
						if (trashIcon && isClassicyTrashFolder(fs, dirPath, filename)) {
							filtered._icon = trashIcon;
						}
						filtered._size = sizes.has(rowPath)
							? sizes.get(rowPath)
							: typeof metadata._size === "number"
								? metadata._size
								: undefined;
						const row = filtered as FileRow;
						if (
							metadata._type === ClassicyFileSystemEntryFileType.Directory &&
							expandedPathSet.has(rowPath)
						) {
							row.subRows = buildRows(rowPath);
						}
						return row;
					});
				};
				return buildRows(path);
			}, [
				fs,
				path,
				sizes,
				expandedPathSet,
				hideFilesCreatedAfter,
				showInvisible,
				trashIcon,
			]);

			// Resolve sizes for any visible row we don't have a size for yet, keyed by
			// path so newly-disclosed folders pick up their sizes too.
			useEffect(() => {
				if (!computeFolderSizes) return;
				let canceled = false;
				const pending: string[] = [];
				const collect = (rows: FileRow[]) => {
					rows.forEach((row) => {
						if (
							typeof row._size !== "number" &&
							row._path &&
							!sizes.has(row._path)
						) {
							pending.push(row._path);
						}
						if (row.subRows) collect(row.subRows);
					});
				};
				collect(data);

				pending.forEach((rowPath) => {
					fs.size(rowPath).then((resolvedSize) => {
						if (canceled) return;
						setSizes((prev) => {
							if (prev.has(rowPath)) return prev;
							const next = new Map(prev);
							next.set(rowPath, resolvedSize);
							return next;
						});
					});
				});

				return () => {
					canceled = true;
				};
			}, [data, fs, sizes, computeFolderSizes]);

			// Explorer's commands (`viewCommandsRef`): the table's own selection
			// and sort, through a handle forwarded to the caller's
			// `selectionApiRef`; a selection or a rename asked for a row not
			// listed yet (New makes the item, then asks) waits for the listing
			// that shows it.
			const tableApiRef = useRef<ClassicyTableSelectionApi | null>(null);
			useImperativeHandle(
				selectionApiRef,
				() => ({
					selectAll: () => tableApiRef.current?.selectAll(),
					select: (ids) => tableApiRef.current?.select?.(ids),
					sortBy: (columnId, desc) =>
						tableApiRef.current?.sortBy?.(columnId, desc),
				}),
				[],
			);
			const [renaming, setRenaming] = useState<string | null>(null);
			const pendingCommandsRef = useRef<{
				select?: string[];
				rename?: string;
			}>({});
			const renamable = (rowPath: string): boolean => {
				if (!onRenameItem) return false;
				const entry = fs.resolve(rowPath);
				const parent = fs.resolve(
					rowPath.split(fs.separator).slice(0, -1).join(fs.separator),
				);
				return (
					!!entry &&
					entry._type !== ClassicyFileSystemEntryFileType.Drive &&
					entry._system !== true &&
					entry._readOnly !== true &&
					entry._derived !== true &&
					parent?._readOnly !== true
				);
			};
			const applyPendingCommands = () => {
				const listed = listedRowPaths(data);
				const pending = pendingCommandsRef.current;
				if (pending.select?.every((p) => listed.has(p))) {
					const paths = pending.select;
					pending.select = undefined;
					tableApiRef.current?.select?.(paths);
				}
				if (pending.rename !== undefined && listed.has(pending.rename)) {
					const target = pending.rename;
					pending.rename = undefined;
					if (renamable(target)) setRenaming(target);
				}
			};
			// biome-ignore lint/correctness/useExhaustiveDependencies: the listing is the trigger; the pending commands are read from a ref
			useEffect(() => {
				applyPendingCommands();
			}, [data]);
			useImperativeHandle(viewCommandsRef, () => ({
				select: (paths) => {
					pendingCommandsRef.current.select = [...paths];
					applyPendingCommands();
				},
				rename: (rowPath) => {
					pendingCommandsRef.current.rename = rowPath;
					applyPendingCommands();
				},
				place: () => {},
				arrange: (key) =>
					tableApiRef.current?.sortBy?.(ARRANGE_COLUMNS[key], false),
				lineUp: () => {},
			}));
			const commitRename = useCallback(
				(rowPath: string, name: string) => {
					setRenaming(null);
					const oldName = rowPath.split(fs.separator).pop() ?? "";
					if (name === oldName) return;
					const renamed = onRenameItem?.(rowPath, name);
					if (typeof renamed === "string" && renamed !== rowPath) {
						pendingCommandsRef.current.select = [renamed];
					}
				},
				[fs, onRenameItem],
			);

			const columns = useMemo<ClassicyTableColumn<FileRow>[]>(() => {
				const cols: ClassicyTableColumn<FileRow>[] = [
					{
						id: "_name",
						title: "Filename",
						accessor: (row) => row._name ?? "",
						render: (row, expansion) => {
							const iconSrc = row._icon || iconImageByType(row._type);
							return (
								// biome-ignore lint/a11y/noStaticElementInteractions: a press here may start a drag; keyboard users move items through the table's own selection
								<div
									className={"classicyFileBrowserViewTableRowContainer"}
									{...{ [CLASSICY_FILE_PATH_ATTRIBUTE]: row._path }}
									{...(row._type ===
										ClassicyFileSystemEntryFileType.Directory && row._path
										? { [CLASSICY_DROP_FOLDER_ATTRIBUTE]: row._path }
										: {})}
									onMouseDown={(e) =>
										row._path && startRowDrag(e, row._path, expansion.emitDrag)
									}
									style={
										{
											paddingLeft: `calc(var(--window-control-size) * ${expansion.depth})`,
											// The row's icon as a mask, for a package that draws
											// a selected icon through its own shape (Windows 98's
											// dither), as ClassicyIcon publishes its own.
											"--classicy-icon-mask": `url("${iconSrc}")`,
										} as CSSProperties
									}
								>
									{/* Fixed-width gutter so files line up with folders at the
								    same depth; only folders put a triangle in it. */}
									<span className={"classicyFileBrowserViewTableDisclosure"}>
										{expansion.canExpand && (
											// biome-ignore lint/a11y/noStaticElementInteractions: swallows the click so toggling disclosure never doubles as a row selection
											// biome-ignore lint/a11y/useKeyWithClickEvents: the triangle itself owns keyboard toggling; this wrapper only stops mouse bubbling
											<span
												className={
													"classicyFileBrowserViewTableDisclosureTriangle"
												}
												onClick={(e) => e.stopPropagation()}
												// A press on the triangle toggles; it never starts a drag.
												onMouseDown={(e) => e.stopPropagation()}
											>
												<ClassicyTriangle
													direction={"right"}
													open={expansion.isExpanded}
													onToggle={expansion.toggle}
												/>
											</span>
										)}
									</span>
									{/* The Finder draws a selected item's icon selected: the
									active package's selected image when it has one,
									else the stylesheet's darkening. */}
									<ClassicyIconImage
										src={iconSrc}
										drawnAt={iconSize}
										width={iconSize}
										alt={row._path}
										className={"classicyFileBrowserViewTableRowIcon"}
										selectable
										selected={expansion.selected === true}
									/>
									{renaming !== null && row._path === renaming ? (
										<ClassicyRenameField
											className={"classicyFileBrowserViewTableRename"}
											name={row._name ?? ""}
											onCommit={(name) => commitRename(renaming, name)}
											onCancel={() => setRenaming(null)}
										/>
									) : (
										<span
											className={"classicyFileBrowserViewTableRowIconLabel"}
										>
											{row._name}
										</span>
									)}
								</div>
							);
						},
					},
				];
				if (columnFlags.modified) {
					cols.push({
						id: "_modifiedOn",
						title: "Date Modified",
						// asFinderDate on BOTH paths: the tree round-trips through JSON,
						// so this field is an ISO string at runtime, not a Date.
						accessor: (row) => asFinderDate(row._modifiedOn)?.getTime() ?? 0,
						render: (row) => (
							<span>
								{formatFinderDate(
									asFinderDate(row._modifiedOn),
									effectiveNow,
									relativeDates,
								)}
							</span>
						),
					});
				}
				if (columnFlags.created) {
					cols.push({
						id: "_createdOn",
						title: "Date Created",
						accessor: (row) => asFinderDate(row._createdOn)?.getTime() ?? 0,
						render: (row) => (
							<span>
								{formatFinderDate(
									asFinderDate(row._createdOn),
									effectiveNow,
									relativeDates,
								)}
							</span>
						),
					});
				}
				if (columnFlags.size) {
					cols.push({
						id: "_size",
						title: "Size",
						accessor: (row) => row._size,
						render: (row) => (
							<span>
								{row._size === undefined
									? computeFolderSizes
										? "Calculating…"
										: "—"
									: row._size === -1
										? "—"
										: fs.formatSize(row._size)}
							</span>
						),
					});
				}
				if (columnFlags.kind) {
					cols.push({
						id: "_type",
						title: "Kind",
						accessor: (row) => row._type,
						render: (row) => <span>{fileTypeDisplayName(row._type)}</span>,
					});
				}
				if (columnFlags.label) {
					cols.push({
						id: "_label",
						title: "Label",
						accessor: (row) => row._label ?? "",
						render: (row) => <span>{row._label ?? "—"}</span>,
					});
				}
				if (columnFlags.comments) {
					cols.push({
						id: "_comments",
						title: "Comments",
						accessor: (row) => row._comments ?? "",
						render: (row) => <span>{row._comments ?? "—"}</span>,
					});
				}
				if (columnFlags.version) {
					cols.push({
						id: "_version",
						title: "Version",
						accessor: (row) => row._version ?? "",
						render: (row) => <span>{row._version ?? "—"}</span>,
					});
				}
				return cols;
			}, [
				fs,
				iconSize,
				columnFlags,
				effectiveNow,
				relativeDates,
				computeFolderSizes,
				startRowDrag,
				renaming,
				commitRename,
			]);

			return (
				<ClassicyTable<FileRow>
					key={`${appId}_filebrowser_${path}`}
					className={classNames(
						"classicyFileBrowserViewTableContainer",
						className,
					)}
					// The rows' icon size, for a package that places the name
					// column's title over the names (System 7's, above the list).
					style={
						{
							"--classicy-file-browser-icon-size": `${iconSize}px`,
							...style,
						} as CSSProperties
					}
					columns={columns}
					rows={data}
					getRowId={(row) => row._path ?? ""}
					getSubRows={(row) => row.subRows}
					rowCanExpand={(row) =>
						row._type === ClassicyFileSystemEntryFileType.Directory
					}
					expanded={expandedPaths}
					onToggleRow={(rowPath, open) =>
						setExpandedPaths((prev) =>
							open ? [...prev, rowPath] : prev.filter((p) => p !== rowPath),
						)
					}
					defaultSort={{ columnId: "_name" }}
					headerPlacement={headerPlacement}
					sortGroup={foldersFirst ? folderRowGroup : undefined}
					onActivateRow={(_, row) => openFileOrFolder(row, row._path ?? "")}
					onActivateSelection={openItemsFunc}
					// Rows drag as Finder items when they can be moved, so a
					// press dragged across them never selects a range.
					rowsDrag={onMoveItems !== undefined}
					// ClassicyTable puts `selected` on a selected row itself.
					rowClassName={() => "classicyFileBrowserViewTableRow"}
					selectionMode={"multi"}
					selectionApiRef={tableApiRef}
					selected={selectedPaths}
					onSelectionChange={trackSelection}
					containerRef={focusTargetRef}
					// The window is the list's only scroller (#271; see the
					// stylesheet).
					scrollable={false}
				/>
			);
		},
	);

ClassicyFileBrowserViewTable.displayName = "ClassicyFileBrowserViewTable";
