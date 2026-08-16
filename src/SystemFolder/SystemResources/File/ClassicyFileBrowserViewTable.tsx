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
import type { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import {
	ClassicyFileSystemEntryFileType,
	type ClassicyFileSystemEntryMetadata,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import {
	ClassicyTable,
	type ClassicyTableColumn,
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

			const columns = useMemo<ClassicyTableColumn<FileRow>[]>(
				() => [
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
					{
						id: "_type",
						title: "File Type",
						accessor: (row) => row._type,
						render: (row) => <span>{fileTypeDisplayName(row._type)}</span>,
					},
					{
						id: "_size",
						title: "Size",
						accessor: (row) => row._size,
						render: (row) => (
							<span>
								{row._size === undefined
									? "Calculating…"
									: row._size === -1
										? "—"
										: fs.formatSize(row._size)}
							</span>
						),
					},
				],
				[fs, iconSize],
			);

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
				/>
			);
		},
	);

ClassicyFileBrowserViewTable.displayName = "ClassicyFileBrowserViewTable";
