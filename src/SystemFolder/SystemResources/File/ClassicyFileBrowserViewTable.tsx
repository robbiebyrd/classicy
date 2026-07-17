import {
	fileTypeDisplayName,
	iconImageByType,
} from "@/SystemFolder/SystemResources/File/ClassicyFileBrowserUtils";
import "./ClassicyFileBrowserViewTable.scss";
import {
	createColumnHelper,
	flexRender,
	getCoreRowModel,
	getSortedRowModel,
	useReactTable,
} from "@tanstack/react-table";
import classNames from "classnames";
import type { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import type { ClassicyFileSystemEntryMetadata } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";

const columnHelper = createColumnHelper<ClassicyFileSystemEntryMetadata>();

import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";

const arrowUpIcon = ClassicyIcons.ui.menuDropdownArrowUp;

import {
	type FC as FunctionalComponent,
	type KeyboardEvent,
	memo,
	type RefObject,
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

			const [fileList, setFileList] = useState<
				ClassicyFileSystemEntryMetadata[]
			>([]);

			useEffect(() => {
				let cancelled = false;

				const directoryItems = fs.filterByType(
					path,
					undefined,
					true,
					hideFilesCreatedAfter,
				);
				const entriesWithMetadata = Object.entries(directoryItems).map(
					([filename, metadata]) => {
						const filtered = {} as Record<string, unknown>;
						for (const [key, value] of Object.entries(metadata)) {
							if (key.startsWith("_")) {
								filtered[key] = value;
							}
						}
						filtered._name = filename;
						filtered._path = `${path}:${filename}`;
						filtered._size =
							typeof metadata._size === "number" ? metadata._size : undefined;
						return {
							filtered: filtered as ClassicyFileSystemEntryMetadata,
							metadata,
						};
					},
				);
				const initial = entriesWithMetadata.map(({ filtered }) => filtered);
				setFileList(initial);

				entriesWithMetadata.forEach(({ filtered, metadata }, index) => {
					if (typeof filtered._size === "number") return;
					fs.size(metadata).then((resolvedSize) => {
						if (cancelled) return;
						setFileList((prev) => {
							const next = [...prev];
							if (next[index]?._path === filtered._path) {
								next[index] = { ...next[index], _size: resolvedSize };
							}
							return next;
						});
					});
				});

				return () => {
					cancelled = true;
				};
			}, [path, fs, hideFilesCreatedAfter]);

			const columns = useMemo(
				() => [
					columnHelper.accessor((row) => row._name, {
						id: "_name",
						cell: (info) => (
							<div className={"classicyFileBrowserViewTableRowContainer"}>
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
				[fs, iconSize],
			);

			const table = useReactTable({
				data: fileList,
				columns,
				getCoreRowModel: getCoreRowModel(),
				getSortedRowModel: getSortedRowModel(),
				state: {
					sorting,
				},
				onSortingChange: setSorting,
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
