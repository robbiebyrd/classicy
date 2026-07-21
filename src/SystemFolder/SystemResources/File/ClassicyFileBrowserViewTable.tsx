import {
	fileTypeDisplayName,
	iconImageByType,
} from "@/SystemFolder/SystemResources/File/ClassicyFileBrowserUtils";
import "./ClassicyFileBrowserViewTable.scss";
import {
	createColumnHelper,
	type ExpandedState,
	flexRender,
	getCoreRowModel,
	getExpandedRowModel,
	getSortedRowModel,
	useReactTable,
} from "@tanstack/react-table";
import classNames from "classnames";
import type { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import {
	ClassicyFileSystemEntryFileType,
	type ClassicyFileSystemEntryMetadata,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import { ClassicyTriangle } from "@/SystemFolder/SystemResources/Triangle/ClassicyTriangle";

/**
 * A directory-list row. Mirrors the file-system metadata but adds `subRows`,
 * which is populated only for directories the user has disclosed (expanded) so
 * the tree is materialized lazily rather than all at once.
 */
type FileRow = ClassicyFileSystemEntryMetadata & {
	subRows?: FileRow[];
};

const columnHelper = createColumnHelper<FileRow>();

import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";

const arrowUpIcon = ClassicyIcons.ui.menuDropdownArrowUp;

import {
	type FC as FunctionalComponent,
	type KeyboardEvent,
	memo,
	type RefObject,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";

type ClassicyFileBrowserViewTableProps = {
	fs: ClassicyFileSystem;
	path: string;
	appId: string;
	iconSize?: number;
	dirOnClickFunc?: (path: string) => void;
	fileOnClickFunc?: (path: string) => void;
	holderRef?: RefObject<HTMLDivElement | null>;
	hideFilesCreatedAfter?: Date | string | number | null;
};

type ColumnSort = {
	id: string;
	desc: boolean;
};
type SortingState = ColumnSort[];

export const ClassicyFileBrowserViewTable: FunctionalComponent<ClassicyFileBrowserViewTableProps> =
	memo(
		({
			fs,
			path,
			iconSize = 64,
			appId,
			dirOnClickFunc = () => {},
			fileOnClickFunc = () => {},
			hideFilesCreatedAfter = null,
		}) => {
			const [selectedRow, setSelectedRow] = useState<string>();
			const [sorting, setSorting] = useState<SortingState>([
				{ id: "_name", desc: false },
			]);
			// Which directories are disclosed, keyed by full path. Drives both the
			// disclosure triangle state and which sub-folders are materialized below.
			const [expanded, setExpanded] = useState<ExpandedState>({});
			const containerRef = useRef<HTMLDivElement>(null);
			const typeBuffer = useRef("");
			const typeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
				undefined,
			);

			const openFileOrFolder = (
				properties: ClassicyFileSystemEntryMetadata,
				path: string,
				filename: string,
			) => {
				if (properties._type === "directory") {
					return dirOnClickFunc(`${path}:${filename}`);
				}
				return fileOnClickFunc(`${path}:${filename}`);
			};

			// Folder sizes resolve asynchronously; cache them by path so a rebuild of
			// the (lazily materialized) tree keeps the sizes we've already computed.
			const [sizes, setSizes] = useState<Map<string, number>>(new Map());

			const expandedPaths = useMemo(
				() =>
					expanded === true
						? new Set<string>()
						: new Set(
								Object.entries(expanded)
									.filter(([, open]) => open)
									.map(([id]) => id),
							),
				[expanded],
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
						true,
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
						filtered._size = sizes.has(rowPath)
							? sizes.get(rowPath)
							: typeof metadata._size === "number"
								? metadata._size
								: undefined;
						const row = filtered as FileRow;
						if (
							metadata._type === ClassicyFileSystemEntryFileType.Directory &&
							expandedPaths.has(rowPath)
						) {
							row.subRows = buildRows(rowPath);
						}
						return row;
					});
				};
				return buildRows(path);
			}, [fs, path, sizes, expandedPaths, hideFilesCreatedAfter]);

			// Resolve sizes for any visible row we don't have a size for yet, keyed by
			// path so newly-disclosed folders pick up their sizes too.
			useEffect(() => {
				let cancelled = false;
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
						if (cancelled) return;
						setSizes((prev) => {
							if (prev.has(rowPath)) return prev;
							const next = new Map(prev);
							next.set(rowPath, resolvedSize);
							return next;
						});
					});
				});

				return () => {
					cancelled = true;
				};
			}, [data, fs, sizes]);

			const toggleExpanded = useCallback((rowPath: string) => {
				setExpanded((prev) => {
					const prevMap = prev === true ? {} : prev;
					const next = { ...prevMap };
					if (next[rowPath]) {
						delete next[rowPath];
					} else {
						next[rowPath] = true;
					}
					return next;
				});
			}, []);

			// Reserve enough width in the disclosure column for the deepest disclosed
			// level so the indented triangles are never clipped.
			const maxDepth = useMemo(() => {
				let deepest = 0;
				const walk = (rows: FileRow[], depth: number) => {
					rows.forEach((row) => {
						if (depth > deepest) deepest = depth;
						if (row.subRows) walk(row.subRows, depth + 1);
					});
				};
				walk(data, 0);
				return deepest;
			}, [data]);

			const columns = useMemo(
				() => [
					columnHelper.display({
						id: "_disclosure",
						enableResizing: false,
						enableSorting: false,
						size: 28 + maxDepth * 12,
						header: () => null,
						cell: ({ row }) => {
							const isDirectory =
								row.original._type ===
								ClassicyFileSystemEntryFileType.Directory;
							return (
								<div
									className={"classicyFileBrowserViewTableDisclosure"}
									style={{
										paddingLeft: `calc(var(--window-control-size) * ${row.depth})`,
									}}
								>
									{isDirectory && (
										// biome-ignore lint/a11y/noStaticElementInteractions: swallows the click so toggling disclosure never doubles as a row selection
										// biome-ignore lint/a11y/useKeyWithClickEvents: the triangle itself owns keyboard toggling; this wrapper only stops mouse bubbling
										<span
											className={
												"classicyFileBrowserViewTableDisclosureTriangle"
											}
											onClick={(e) => e.stopPropagation()}
										>
											<ClassicyTriangle
												direction={"right"}
												open={expandedPaths.has(row.original._path ?? "")}
												onToggle={() =>
													toggleExpanded(row.original._path ?? "")
												}
											/>
										</span>
									)}
								</div>
							);
						},
					}),
					columnHelper.accessor((row) => row._name, {
						id: "_name",
						cell: (info) => (
							<div
								className={"classicyFileBrowserViewTableRowContainer"}
								style={{
									paddingLeft: `calc(var(--window-control-size) * ${info.row.depth})`,
								}}
							>
								<img
									src={
										info.row.original._icon ||
										iconImageByType(info.row.original._type)
									}
									width={iconSize}
									alt={info.row.original._path}
									className={"classicyFileBrowserViewTableRowIcon"}
								/>
								<span className={"classicyFileBrowserViewTableRowIconLabel"}>
									{info.getValue()}
								</span>
							</div>
						),
						header: () => <span>Filename</span>,
						enableResizing: true,
					}),
					columnHelper.accessor((row) => row._type, {
						id: "_type",
						cell: (info) => <span>{fileTypeDisplayName(info.getValue())}</span>,
						header: () => <span>File Type</span>,
						enableResizing: true,
					}),
					columnHelper.accessor((row) => row._size, {
						id: "_size",
						cell: (info) => {
							const value = info.getValue();
							return (
								<span>
									{value === undefined
										? "Calculating…"
										: value === -1
											? "—"
											: fs.formatSize(value)}
								</span>
							);
						},
						header: () => <span>Size</span>,
						enableResizing: true,
					}),
				],
				[fs, iconSize, maxDepth, expandedPaths, toggleExpanded],
			);

			const table = useReactTable({
				data,
				columns,
				getRowId: (row) => row._path ?? "",
				getSubRows: (row) => row.subRows,
				getCoreRowModel: getCoreRowModel(),
				getSortedRowModel: getSortedRowModel(),
				getExpandedRowModel: getExpandedRowModel(),
				state: {
					sorting,
					expanded,
				},
				onSortingChange: setSorting,
				onExpandedChange: setExpanded,
				columnResizeMode: "onChange",
			});

			const selectRowById = (rowId: string) => {
				setSelectedRow(rowId);
				// Keep the newly selected row within the scrolling list box.
				requestAnimationFrame(() => {
					const el = containerRef.current?.querySelector(
						`[data-row-id="${rowId}"]`,
					);
					try {
						el?.scrollIntoView({ block: "nearest" });
					} catch {
						// scrollIntoView is not implemented in some test environments.
					}
				});
			};

			// HIG list-box keyboard behavior: Up/Down move the selection one item,
			// Enter opens the selected item, and typing leading characters selects
			// the first matching row (type-selection).
			const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
				const rows = table.getRowModel().rows;
				if (rows.length === 0) return;
				const curIndex = rows.findIndex((r) => r.id === selectedRow);

				switch (e.key) {
					case "ArrowDown": {
						e.preventDefault();
						const ni = Math.min(curIndex + 1, rows.length - 1);
						selectRowById(rows[ni < 0 ? 0 : ni].id);
						return;
					}
					case "ArrowUp": {
						e.preventDefault();
						const ni = curIndex < 0 ? 0 : Math.max(curIndex - 1, 0);
						selectRowById(rows[ni].id);
						return;
					}
					case "Home": {
						e.preventDefault();
						selectRowById(rows[0].id);
						return;
					}
					case "End": {
						e.preventDefault();
						selectRowById(rows[rows.length - 1].id);
						return;
					}
					case "Enter": {
						if (curIndex >= 0) {
							e.preventDefault();
							const row = rows[curIndex];
							openFileOrFolder(row.original, path, row.original._name ?? "");
						}
						return;
					}
					default: {
						if (
							e.key.length === 1 &&
							e.key !== " " &&
							!e.metaKey &&
							!e.ctrlKey &&
							!e.altKey
						) {
							if (typeTimer.current) clearTimeout(typeTimer.current);
							typeBuffer.current += e.key.toLowerCase();
							typeTimer.current = setTimeout(() => {
								typeBuffer.current = "";
							}, 700);
							const buf = typeBuffer.current;
							const start = curIndex < 0 ? 0 : curIndex;
							const order = [
								...rows.slice(start + 1),
								...rows.slice(0, start + 1),
							];
							const match = order.find((r) =>
								(r.original._name ?? "").toLowerCase().startsWith(buf),
							);
							if (match) selectRowById(match.id);
						}
					}
				}
			};

			return (
				// biome-ignore lint/a11y/noStaticElementInteractions: list box is a focusable scroll region driven by arrow keys and type-selection; rows remain the click targets
				<div
					key={`${appId}_filebrowser_${path}`}
					ref={containerRef}
					// biome-ignore lint/a11y/noNoninteractiveTabindex: the list box is a single roving tab stop for keyboard navigation of its rows
					tabIndex={0}
					onKeyDown={handleKeyDown}
					className={"classicyFileBrowserViewTableContainer"}
				>
					<table className={"classicyFileBrowserViewTable"}>
						<thead className={classNames("classicyFileBrowserViewTableHeader")}>
							{table.getHeaderGroups().map((headerGroup) => (
								<tr
									key={headerGroup.id}
									className={"classicyFileBrowserViewTableColumnHeaderGroup"}
								>
									{headerGroup.headers.map((header) => (
										<th
											key={header.id}
											align={"left"}
											style={{ width: header.getSize() }}
											className={classNames(
												"classicyFileBrowserViewTableColumnHeader",
												header.column.getIsResizing() ? "isResizing" : "",
												sorting.length > 0 && header.id === sorting[0].id
													? "classicyFileBrowserViewTableColumnHeaderSelected"
													: "",
											)}
											onClick={() => {
												if (!header.column.getCanSort()) {
													return;
												}
												if (
													header.column.getIsSorted() === false ||
													header.column.getIsSorted() === "desc"
												) {
													header.column.toggleSorting(false, false);
												} else {
													header.column.toggleSorting(true, false);
												}
											}}
										>
											<div
												className={
													"classicyFileBrowserViewTableHeaderCellContent"
												}
											>
												{!header.isPlaceholder &&
													flexRender(
														header.column.columnDef.header,
														header.getContext(),
													)}
												{sorting.length > 0 && header.id === sorting[0].id && (
													<img
														src={`${arrowUpIcon}`}
														alt={"Up Arrow"}
														className={classNames(
															"classicyFileBrowserViewTableSortArrow",
															!sorting[0].desc
																? "classicyFileBrowserViewTableSortArrowAscending"
																: "",
														)}
													/>
												)}
												{header.column.getCanResize() && (
													// biome-ignore lint/a11y/noStaticElementInteractions: resize handle requires mouse events only; no keyboard equivalent
													<div
														onMouseDown={header.getResizeHandler()}
														onTouchStart={header.getResizeHandler()}
														className={classNames(
															"resizer",
															header.column.getIsResizing() ? "isResizing" : "",
														)}
													></div>
												)}
											</div>
										</th>
									))}
								</tr>
							))}
						</thead>
						<tbody className={"classicyFileBrowserViewTableContent"}>
							{table.getRowModel().rows.map((row) => (
								<tr
									key={row.id}
									data-row-id={row.id}
									className={classNames(
										"classicyFileBrowserViewTableRow",
										selectedRow === row.id
											? "classicyFileBrowserViewTableRowSelected"
											: null,
									)}
									onDoubleClick={() =>
										openFileOrFolder(
											row.original,
											path,
											row.original._name ?? "",
										)
									}
									onClick={() => setSelectedRow(row.id)}
								>
									{row.getVisibleCells().map((cell) => (
										<td
											key={cell.id}
											className={"classicyFileBrowserViewTableCell"}
											style={{ width: cell.column.getSize() }}
										>
											{flexRender(
												cell.column.columnDef.cell,
												cell.getContext(),
											)}
										</td>
									))}
								</tr>
							))}
						</tbody>
						<tfoot>
							{table.getFooterGroups().map((footerGroup) => (
								<tr key={footerGroup.id}>
									{footerGroup.headers.map((header) => (
										<th key={header.id}>
											{header.isPlaceholder
												? null
												: flexRender(
														header.column.columnDef.footer,
														header.getContext(),
													)}
										</th>
									))}
								</tr>
							))}
						</tfoot>
					</table>
				</div>
			);
		},
	);

ClassicyFileBrowserViewTable.displayName = "ClassicyFileBrowserViewTable";
