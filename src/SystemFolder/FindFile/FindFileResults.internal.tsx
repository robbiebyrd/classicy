import { type FC as FunctionalComponent, useMemo, useRef } from "react";
import { formatFinderDate } from "@/SystemFolder/Finder/FinderViewOptions";
import type { ClassicyFindSourceResult } from "@/SystemFolder/FindFile/ClassicyFindSources";
import {
	FIND_FILE_APP_ID,
	FIND_FILE_RESULTS_WINDOW_ID,
} from "@/SystemFolder/FindFile/FindFileContext";
import { iconImageByType } from "@/SystemFolder/SystemResources/File/ClassicyFileBrowserUtils";
import { useClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemContext";
import { ClassicyIconImage } from "@/SystemFolder/SystemResources/Icon/ClassicyIconImage.internal";
import {
	ClassicyListBox,
	type ClassicyListBoxOption,
} from "@/SystemFolder/SystemResources/ListBox/ClassicyListBox";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import { ClassicySplitView } from "@/SystemFolder/SystemResources/SplitView/ClassicySplitView";
import {
	ClassicyTable,
	type ClassicyTableCellContext,
	type ClassicyTableColumn,
} from "@/SystemFolder/SystemResources/Table/ClassicyTable";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

/** One row of Items Found: an item of the file system, or a source's result. */
export type FindFileResultRow = {
	id: string;
	name: string;
	icon?: string;
	kind: string;
	/** Bytes, for a file. */
	size?: number;
	modified?: Date;
	/** The item's path, for the file system's results. */
	path?: string;
	/** The source's name and icon, for a source's result. */
	site?: string;
	siteIcon?: string;
	result?: ClassicyFindSourceResult;
};

/** The View menu's orders, and the column each sorts. */
export type FindFileSortKey = "name" | "size" | "kind" | "date";
const SORT_COLUMNS: Record<FindFileSortKey, string> = {
	name: "name",
	size: "size",
	kind: "kind",
	date: "modified",
};

export type FindFileResultsProps = {
	appMenu: ClassicyMenuItem[];
	rows: readonly FindFileResultRow[];
	kind: "file" | "channels";
	selectedId?: string;
	onSelect: (id: string | undefined) => void;
	onOpen: (row: FindFileResultRow | undefined) => void;
	onOpenPath: (path: string) => void;
	sortKey: FindFileSortKey;
	onSortKeyChange: (key: FindFileSortKey) => void;
	onClose: () => void;
};

/**
 * The name cell, drawn as the Finder's list view draws one (its row classes,
 * so each package's Finder look applies): the icon, then the name, which
 * alone is highlighted when the row is selected (Items Found on Mac OS 8.1
 * and System 7.5.3).
 */
const nameCell = (
	row: { name: string; icon?: string },
	{ selected }: ClassicyTableCellContext,
) => (
	<div className="classicyFileBrowserViewTableRowContainer classicyFindFileResultName">
		{row.icon && (
			<ClassicyIconImage
				className="classicyFileBrowserViewTableRowIcon classicyFindFileResultIcon"
				src={row.icon}
				alt=""
				aria-hidden={true}
				selectable
				selected={selected === true}
			/>
		)}
		<span className="classicyFileBrowserViewTableRowIconLabel">{row.name}</span>
	</div>
);

/**
 * Items Found (Mac OS 8.1): the list, sorted by name to start, and below it
 * the path pane, where the selected item sits under its disk and folders
 * (double-click one to open it). A source's result sits under its site.
 */
export const FindFileResults: FunctionalComponent<FindFileResultsProps> = ({
	appMenu,
	rows,
	kind,
	selectedId,
	onSelect,
	onOpen,
	onOpenPath,
	sortKey,
	onSortKeyChange,
	onClose,
}) => {
	const fs = useClassicyFileSystem();
	const now = useMemo(() => new Date(), []);
	// The list takes the keyboard when the window comes to the front (8.1
	// framed it as the focus), so its selection draws as the focused one's
	// and the arrows and Return work at once.
	const listRef = useRef<HTMLDivElement | null>(null);
	const selected = rows.find((r) => r.id === selectedId);

	const columns = useMemo((): ClassicyTableColumn<FindFileResultRow>[] => {
		const name: ClassicyTableColumn<FindFileResultRow> = {
			id: "name",
			title: "Name",
			accessor: (row) => row.name.toLocaleLowerCase(),
			render: nameCell,
			width: 200,
		};
		const kindColumn: ClassicyTableColumn<FindFileResultRow> = {
			id: "kind",
			title: "Kind",
			accessor: (row) => row.kind,
			render: (row) => <span>{row.kind}</span>,
			width: 110,
		};
		if (kind === "channels") {
			return [
				name,
				kindColumn,
				{
					id: "site",
					title: "Site",
					accessor: (row) => row.site ?? "",
					render: (row) => <span>{row.site}</span>,
					width: 150,
				},
			];
		}
		return [
			name,
			{
				id: "size",
				title: "Size",
				accessor: (row) => row.size ?? -1,
				render: (row) => (
					<span>
						{row.size === undefined || row.size < 0
							? "—"
							: fs.formatSize(row.size)}
					</span>
				),
				align: "right",
				width: 64,
			},
			kindColumn,
			{
				id: "modified",
				title: "Last Modified",
				accessor: (row) => row.modified?.getTime() ?? 0,
				render: (row) => (
					<span>{formatFinderDate(row.modified, now, false)}</span>
				),
				width: 130,
			},
		];
	}, [kind, fs, now]);

	// The path pane: the selected item under its disk and folders.
	const pathOptions = useMemo((): ClassicyListBoxOption[] => {
		if (!selected) return [];
		if (selected.path === undefined) {
			return [
				{ value: "site", label: selected.site ?? "", icon: selected.siteIcon },
				{
					value: "result",
					label: selected.name,
					icon: selected.icon,
					depth: 1,
				},
			];
		}
		const parts = selected.path.split(fs.separator);
		return parts.map((part, depth) => {
			const path = parts.slice(0, depth + 1).join(fs.separator);
			const entry = fs.resolve(path);
			return {
				value: path,
				label: part,
				icon:
					entry?._icon || (entry ? iconImageByType(entry._type) : undefined),
				depth,
			};
		});
	}, [selected, fs]);

	const count = rows.length;
	return (
		<ClassicyWindow
			id={FIND_FILE_RESULTS_WINDOW_ID}
			title="Items Found"
			appId={FIND_FILE_APP_ID}
			closable={true}
			resizable={true}
			zoomable={true}
			collapsable={true}
			scrollable={false}
			initialSize={[560, 340]}
			minimumSize={[320, 220]}
			initialPosition={[110, 240]}
			appMenu={appMenu}
			onCloseFunc={onClose}
			initialFocusRef={listRef}
		>
			<div className="classicyFindFileResults">
				<ClassicySplitView
					direction="vertical"
					defaultSizes={[68, 32]}
					className="classicyFindFileResultsSplit"
				>
					<ClassicyTable<FindFileResultRow>
						// A View menu choice starts the list afresh in that order.
						key={sortKey}
						className="classicyFindFileResultsList"
						columns={columns}
						rows={rows as FindFileResultRow[]}
						getRowId={(row) => row.id}
						selectionMode="single"
						containerRef={listRef}
						rowClassName={() => "classicyFileBrowserViewTableRow"}
						selected={selectedId ? [selectedId] : []}
						onSelectionChange={(ids) => onSelect(ids[0])}
						onActivateRow={(_id, row) => onOpen(row)}
						defaultSort={{ columnId: SORT_COLUMNS[sortKey] }}
						onSortChange={(sort) => {
							const key = (Object.keys(SORT_COLUMNS) as FindFileSortKey[]).find(
								(k) => SORT_COLUMNS[k] === sort?.columnId,
							);
							if (key && key !== sortKey) onSortKeyChange(key);
						}}
					/>
					<ClassicyListBox
						id="classicy-find-file-path"
						className="classicyFindFilePath"
						options={pathOptions}
						selectionMode="single"
						onActivateFunc={(value) => {
							if (selected?.path === undefined) {
								if (value === "result") onOpen(selected);
								return;
							}
							onOpenPath(value);
						}}
					/>
				</ClassicySplitView>
				<div className="classicyFindFileStatus">
					{count === 1 ? "Found 1 Item" : `Found ${count} Items`}
				</div>
			</div>
		</ClassicyWindow>
	);
};
