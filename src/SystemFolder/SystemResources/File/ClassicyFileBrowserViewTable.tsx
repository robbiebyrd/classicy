import {
	fileTypeDisplayName,
	iconImageByType,
} from "@/SystemFolder/SystemResources/File/ClassicyFileBrowserUtils";
import "./ClassicyFileBrowserViewTable.scss";
import classNames from "classnames";
import {
	type FC as FunctionalComponent,
	memo,
	type RefObject,
	useEffect,
	useMemo,
	useState,
} from "react";
import type { FinderListViewOptions } from "@/SystemFolder/Finder/FinderContext";
import {
	asFinderDate,
	formatFinderDate,
} from "@/SystemFolder/Finder/FinderViewOptions";
import type { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import {
	ClassicyFileSystemEntryFileType,
	type ClassicyFileSystemEntryMetadata,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import {
	ClassicyTable,
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

// Hoisted so its identity is stable across renders: the columns useMemo below
// keys on this object, and a fresh literal on every render (the omitted-prop
// case, when the component still re-renders on every size resolution) would
// invalidate the memo constantly — the same DOM-remount hazard fixed for
// renderers by 99fc5dd2.
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
	holderRef?: RefObject<HTMLDivElement | null>;
	hideFilesCreatedAfter?: Date | string | number | null;
	listViewOptions?: FinderListViewOptions;
	/** The in-world "now" for relative dates, already converted to the
	 *  virtual clock's local frame. Omitted means real time. */
	now?: Date;
	selectionApiRef?: RefObject<ClassicyTableSelectionApi | null>;
	/** Controlled selection by row path. Omit for uncontrolled. */
	selectedPaths?: string[];
	onSelectionChange?: (paths: string[]) => void;
};

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
			listViewOptions,
			now,
			selectionApiRef,
			selectedPaths,
			onSelectionChange,
		}) => {
			// Derive the effective options once, so an omitted prop reproduces
			// today's rendering — three columns, sizes computed, no dates.
			const columnFlags = listViewOptions?.columns ?? DEFAULT_LIST_COLUMN_FLAGS;
			const computeFolderSizes = listViewOptions?.calculateFolderSizes ?? true;
			const relativeDates = listViewOptions?.useRelativeDate ?? true;
			// A fresh `Date` on every render (when `now` is omitted) would
			// invalidate the columns useMemo constantly — see 99fc5dd2. Guard it
			// to a stable Date keyed only on the caller-supplied instant.
			const nowMs = now?.getTime();
			// eslint-disable-next-line react-hooks/exhaustive-deps
			const effectiveNow = useMemo(
				() => (nowMs === undefined ? new Date() : new Date(nowMs)),
				[nowMs],
			);

			// Which directories are disclosed, keyed by full path. Controlled here
			// (not inside ClassicyTable) because the lazily-materialized `subRows`
			// below depend on it.
			const [expandedPaths, setExpandedPaths] = useState<string[]>([]);

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
							expandedPathSet.has(rowPath)
						) {
							row.subRows = buildRows(rowPath);
						}
						return row;
					});
				};
				return buildRows(path);
			}, [fs, path, sizes, expandedPathSet, hideFilesCreatedAfter]);

			// Resolve sizes for any visible row we don't have a size for yet, keyed by
			// path so newly-disclosed folders pick up their sizes too.
			useEffect(() => {
				if (!computeFolderSizes) return;
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
			}, [data, fs, sizes, computeFolderSizes]);

			const columns = useMemo<ClassicyTableColumn<FileRow>[]>(() => {
				const cols: ClassicyTableColumn<FileRow>[] = [
					{
						id: "_name",
						title: "Filename",
						accessor: (row) => row._name ?? "",
						render: (row, expansion) => (
							<div
								className={"classicyFileBrowserViewTableRowContainer"}
								style={{
									paddingLeft: `calc(var(--window-control-size) * ${expansion.depth})`,
								}}
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
										>
											<ClassicyTriangle
												direction={"right"}
												open={expansion.isExpanded}
												onToggle={expansion.toggle}
											/>
										</span>
									)}
								</span>
								<img
									src={row._icon || iconImageByType(row._type)}
									width={iconSize}
									alt={row._path}
									className={"classicyFileBrowserViewTableRowIcon"}
								/>
								<span className={"classicyFileBrowserViewTableRowIconLabel"}>
									{row._name}
								</span>
							</div>
						),
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
			]);

			return (
				<ClassicyTable<FileRow>
					key={`${appId}_filebrowser_${path}`}
					className={"classicyFileBrowserViewTableContainer"}
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
					onActivateRow={(_, row) => openFileOrFolder(row, row._path ?? "")}
					rowClassName={(_, isSelected) =>
						classNames(
							"classicyFileBrowserViewTableRow",
							isSelected ? "classicyFileBrowserViewTableRowSelected" : null,
						)
					}
					selectionMode={"multi"}
					selectionApiRef={selectionApiRef}
					selected={selectedPaths}
					onSelectionChange={onSelectionChange}
				/>
			);
		},
	);

ClassicyFileBrowserViewTable.displayName = "ClassicyFileBrowserViewTable";
