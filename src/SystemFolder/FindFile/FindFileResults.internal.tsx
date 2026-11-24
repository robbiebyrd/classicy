import {
	type FC as FunctionalComponent,
	memo,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { formatFinderDate } from "@/SystemFolder/Finder/FinderViewOptions";
import { classicyFindDisks } from "@/SystemFolder/FindFile/ClassicyFindFileSearch";
import {
	type ClassicyFindLookupMemory,
	classicyFindKnownSize,
	classicyFindReadSize,
} from "@/SystemFolder/FindFile/ClassicyFindLookups.internal";
import type { ClassicyFindSourceResult } from "@/SystemFolder/FindFile/ClassicyFindSources";
import {
	FIND_FILE_APP_ID,
	FIND_FILE_RESULTS_WINDOW_ID,
} from "@/SystemFolder/FindFile/FindFileContext";
import { iconImageByType } from "@/SystemFolder/SystemResources/File/ClassicyFileBrowserUtils";
import { useClassicyFileSystemAccessor } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemContext";
import { CLASSICY_TRASH_PATH } from "@/SystemFolder/SystemResources/File/ClassicyTrash";
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
	/** Bytes, for a file whose size has been read. */
	size?: number;
	modified?: Date;
	/** The item's path, for the file system's results. */
	path?: string;
	/** Whether the item is a folder (no size). */
	folder?: boolean;
	/**
	 * What a file's size follows (its type, data, recorded size, URL and
	 * date): a size read under another stamp is read again.
	 */
	stamp?: string;
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
	/**
	 * The signal of the search that found these rows: the sizes read for
	 * them stop when it aborts (a later search's results, the window closed,
	 * Find File quit).
	 */
	signal?: AbortSignal;
	/** What the session remembers between reads. */
	memory: ClassicyFindLookupMemory;
	/** The results' site column title (Sherlock's "Site", or a host's word). */
	siteLabel: string;
	/** Minutes east of UTC: Last Modified shows Classicy's clock, as rows compare. */
	timeZoneOffsetMinutes: number;
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

/** `date` moved so its local fields read Classicy's clock zone. */
const onClassicyClock = (date: Date, offsetMinutes: number): Date =>
	new Date(
		date.getTime() + (offsetMinutes + date.getTimezoneOffset()) * 60_000,
	);

type SizeRead = { stamp: string; size: number };

const NO_ROWS: readonly string[] = [];

/**
 * The sizes Items Found shows: a file's size is read as its row is drawn,
 * or, sorted by size, for every row; at most a few reads at a time, under
 * `signal`. A row scrolled away before its read began is not read.
 */
const useFindFileRowSizes = (
	rows: readonly FindFileResultRow[],
	wantedIds: readonly string[] | "all",
	signal: AbortSignal | undefined,
	memory: ClassicyFindLookupMemory,
): ReadonlyMap<string, SizeRead> => {
	const getFs = useClassicyFileSystemAccessor();
	const [sizes, setSizes] = useState<ReadonlyMap<string, SizeRead>>(
		() => new Map(),
	);
	const sizesRef = useRef(sizes);
	sizesRef.current = sizes;
	const reading = useRef(new Set<string>());
	const buffer = useRef<[string, SizeRead][]>([]);
	const flushTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
		undefined,
	);
	useEffect(
		() => () => {
			if (flushTimer.current !== undefined) clearTimeout(flushTimer.current);
		},
		[],
	);
	const keep = useCallback((found: [string, SizeRead][]) => {
		if (found.length === 0) return;
		setSizes((prev) => {
			const next = new Map(prev);
			for (const [id, read] of found) next.set(id, read);
			return next;
		});
	}, []);
	// Reads that answer together are drawn together.
	const keepLater = useCallback(
		(id: string, read: SizeRead) => {
			buffer.current.push([id, read]);
			if (flushTimer.current !== undefined) return;
			flushTimer.current = setTimeout(() => {
				flushTimer.current = undefined;
				const found = buffer.current;
				buffer.current = [];
				keep(found);
			}, 0);
		},
		[keep],
	);

	useEffect(() => {
		const fs = getFs();
		const byId = new Map(rows.map((row) => [row.id, row]));
		const ids = wantedIds === "all" ? rows.map((row) => row.id) : wantedIds;
		const now: [string, SizeRead][] = [];
		const later: FindFileResultRow[] = [];
		for (const id of ids) {
			const row = byId.get(id);
			if (!row || row.path === undefined || row.folder) continue;
			const stamp = row.stamp ?? "";
			if (sizesRef.current.get(id)?.stamp === stamp) continue;
			if (reading.current.has(`${id}\n${stamp}`)) continue;
			const entry = fs.resolve(row.path);
			if (!entry) continue;
			const known = classicyFindKnownSize(entry);
			if (known !== undefined) now.push([id, { stamp, size: known }]);
			else later.push(row);
		}
		keep(now);
		if (later.length === 0 || signal?.aborted) return;
		// Each waits for one of the session's few places; a row no longer
		// wanted by then (scrolled away, re-asked) is not read.
		let wanted = true;
		for (const row of later) {
			const stamp = row.stamp ?? "";
			const key = `${row.id}\n${stamp}`;
			const entry = fs.resolve(row.path ?? "");
			if (!entry) continue;
			void classicyFindReadSize(getFs(), entry, {
				signal,
				memory,
				stillWanted: () => {
					if (!wanted || reading.current.has(key)) return false;
					reading.current.add(key);
					return true;
				},
			}).then((size) => {
				if (size === undefined) return;
				reading.current.delete(key);
				if (!signal?.aborted) keepLater(row.id, { stamp, size });
			});
		}
		return () => {
			wanted = false;
		};
	}, [rows, wantedIds, signal, memory, getFs, keep, keepLater]);

	return sizes;
};

/**
 * Items Found (Mac OS 8.1): the list, sorted by name to start, and below it
 * the path pane, where the selected item sits under its disk and folders
 * (double-click one to open it). A source's result sits under its site.
 *
 * Memoized: it draws again only when its own rows, selection or menus
 * change, never for a keystroke in the Find window or a write elsewhere in
 * the file system. The list draws only the rows in view (`windowed`), and
 * reads a file's size only when its row is drawn.
 */
export const FindFileResults: FunctionalComponent<FindFileResultsProps> = memo(
	function FindFileResults({
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
		signal,
		memory,
		siteLabel,
		timeZoneOffsetMinutes,
	}) {
		const getFs = useClassicyFileSystemAccessor();
		const now = useMemo(() => new Date(), []);
		// The list takes the keyboard when the window comes to the front (8.1
		// framed it as the focus), so its selection draws as the focused one's
		// and the arrows and Return work at once.
		const listRef = useRef<HTMLDivElement | null>(null);

		const [drawnIds, setDrawnIds] = useState<readonly string[]>([]);
		const sizes = useFindFileRowSizes(
			rows,
			kind !== "file" ? NO_ROWS : sortKey === "size" ? "all" : drawnIds,
			signal,
			memory,
		);
		// Each row with the size read for it; a row whose size is unchanged
		// keeps its object, so the table draws only what changed.
		const sizedCache = useRef(
			new Map<
				string,
				{ base: FindFileResultRow; size: number; row: FindFileResultRow }
			>(),
		);
		const shownRows = useMemo((): FindFileResultRow[] => {
			if (kind !== "file") return rows as FindFileResultRow[];
			const cache = sizedCache.current;
			const next = new Map<
				string,
				{ base: FindFileResultRow; size: number; row: FindFileResultRow }
			>();
			const list = rows.map((base) => {
				const read = sizes.get(base.id);
				if (!read || read.stamp !== (base.stamp ?? "")) return base;
				const kept = cache.get(base.id);
				const sized =
					kept && kept.base === base && kept.size === read.size
						? kept
						: { base, size: read.size, row: { ...base, size: read.size } };
				next.set(base.id, sized);
				return sized.row;
			});
			sizedCache.current = next;
			return list;
		}, [rows, sizes, kind]);
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
						title: siteLabel,
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
								: getFs().formatSize(row.size)}
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
						<span>
							{formatFinderDate(
								row.modified
									? onClassicyClock(row.modified, timeZoneOffsetMinutes)
									: undefined,
								now,
								false,
							)}
						</span>
					),
					width: 130,
				},
			];
		}, [kind, getFs, now, siteLabel, timeZoneOffsetMinutes]);

		// The path pane: the selected item under its disk and folders. An item
		// in the Trash sits under its disk's Trash, as on the Mac ("Macintosh
		// HD › Trash › item", 8.1), though Classicy keeps one Trash beside the
		// disks.
		const pathOptions = useMemo((): ClassicyListBoxOption[] => {
			if (!selected) return [];
			if (selected.path === undefined) {
				return [
					{
						value: "site",
						label: selected.site ?? "",
						icon: selected.siteIcon,
					},
					{
						value: "result",
						label: selected.name,
						icon: selected.icon,
						depth: 1,
					},
				];
			}
			const fs = getFs();
			const parts = selected.path.split(fs.separator);
			const option = (path: string, label: string, depth: number) => {
				const entry = fs.resolve(path);
				return {
					value: path,
					label,
					icon:
						entry?._icon || (entry ? iconImageByType(entry._type) : undefined),
					depth,
				};
			};
			const lead: ClassicyListBoxOption[] = [];
			if (parts[0] === CLASSICY_TRASH_PATH) {
				const top =
					parts.length > 1
						? fs.resolve(`${CLASSICY_TRASH_PATH}${fs.separator}${parts[1]}`)
						: undefined;
				const from =
					typeof top?._trashedFrom === "string" ? top._trashedFrom : "";
				const disk = from.split(fs.separator)[0] || classicyFindDisks(fs)[0];
				if (disk) lead.push(option(disk, disk, 0));
			}
			return [
				...lead,
				...parts.map((part, depth) =>
					option(
						parts.slice(0, depth + 1).join(fs.separator),
						part,
						depth + lead.length,
					),
				),
			];
		}, [selected, getFs]);

		const count = rows.length;
		return (
			<ClassicyWindow
				id={FIND_FILE_RESULTS_WINDOW_ID}
				title="Items Found"
				// 8.1's Items Found has no title-bar icon.
				hideIcon={true}
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
							rows={shownRows}
							getRowId={(row) => row.id}
							selectionMode="single"
							containerRef={listRef}
							rowClassName={() => "classicyFileBrowserViewTableRow"}
							selected={selectedId ? [selectedId] : []}
							onSelectionChange={(ids) => onSelect(ids[0])}
							onActivateRow={(_id, row) => onOpen(row)}
							defaultSort={{ columnId: SORT_COLUMNS[sortKey] }}
							onSortChange={(sort) => {
								const key = (
									Object.keys(SORT_COLUMNS) as FindFileSortKey[]
								).find((k) => SORT_COLUMNS[k] === sort?.columnId);
								// A click on a column title drops the selection (8.1,
								// `81-sort-by-header-no-selection.png`).
								onSelect(undefined);
								if (key && key !== sortKey) onSortKeyChange(key);
							}}
							windowed
							onRowsShown={setDrawnIds}
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
	},
);
