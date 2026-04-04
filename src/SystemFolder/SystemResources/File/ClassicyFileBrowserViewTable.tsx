import {
	capitalizeFirst,
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
	memo,
	type RefObject,
	useMemo,
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
		}) => {
			const [selectedRow, setSelectedRow] = useState<string>();
			const [sorting, setSorting] = useState<SortingState>([
				{ id: "_name", desc: false },
			]);

			const openFileOrFolder = (
				properties: ClassicyFileSystemEntryMetadata,
				path: string,
				filename: string,
			) => {
				switch (properties._type) {
					case "directory": {
						return dirOnClickFunc(`${path}:${filename}`);
					}
					case "file": {
						return fileOnClickFunc(`${path}:${filename}`);
					}
					default: {
						return () => {};
					}
				}
			};

			const fileList = useMemo<ClassicyFileSystemEntryMetadata[]>(() => {
				const directoryItems = fs.filterByType(path, ["file", "directory"]);
				return Object.entries(directoryItems).map(([filename, metadata]) => {
					const filtered = {} as Record<string, unknown>;
					for (const [key, value] of Object.entries(metadata)) {
						if (key.startsWith("_")) {
							filtered[key] = value;
						}
					}
					filtered._name = filename;
					filtered._path = `${path}:${filename}`;
					return filtered as ClassicyFileSystemEntryMetadata;
				});
			}, [path, fs]);

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
						cell: (info) => <span>{capitalizeFirst(info.getValue())}</span>,
						header: () => <span>File Type</span>,
						enableResizing: true,
					}),
					columnHelper.accessor((row) => row._size, {
						id: "_size",
						cell: (info) => (
							<span>
								{info.getValue() !== undefined
									? fs.formatSize(info.getValue() ?? 0)
									: ""}
							</span>
						),
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

			return (
				<div
					key={`${appId}_filebrowser_${path}`}
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
														className={"classicyFileBrowserViewTableSortArrow"}
														style={{
															transform: `rotate(${sorting[0].desc ? "0deg" : "180deg"})`,
														}}
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
