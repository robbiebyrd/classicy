import "./ClassicyTable.scss";
import {
	type ColumnDef,
	type ExpandedState,
	getCoreRowModel,
	getExpandedRowModel,
	getSortedRowModel,
	type Row,
	useReactTable,
} from "@tanstack/react-table";
import classNames from "classnames";
import {
	type CSSProperties,
	type KeyboardEvent,
	type ReactElement,
	type ReactNode,
	type RefObject,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { createPortal } from "react-dom";
import type {
	ClassicyAppearanceEmitDetail,
	ClassicyAppearanceEvent,
} from "@/Appearance/ClassicyAppearancePackage";
import { useClassicyAsset } from "@/Appearance/ClassicyAssetRegistry";
import { useClassicyAppearance } from "@/Appearance/useClassicyAppearance";
import { withClassicyAppearanceInput } from "@/Appearance/useClassicyAppearanceInput.internal";
import { classicyStateClasses } from "@/Appearance/vocabulary/ClassicyVocabulary";
import { onClassicyPointerStreamLost } from "@/SystemFolder/SystemResources/File/ClassicyPointerStreamLost.internal";
import { ClassicyScrollArea } from "@/SystemFolder/SystemResources/ScrollArea/ClassicyScrollArea";
import { useClassicyScrollAreaHead } from "@/SystemFolder/SystemResources/ScrollArea/ClassicyScrollAreaHead.internal";

/**
 * Expansion facts handed to every cell `render`, so a column (typically the
 * first) can draw its own disclosure affordance and depth indent. All-zero /
 * no-op when the table has no `getSubRows`. Also carries `emitDrag`, for a
 * cell that starts a drag of its own.
 */
export type ClassicyTableCellContext = {
	/** Nesting level of the row; 0 for top-level rows. */
	depth: number;
	/** Whether the row has (or, per `rowCanExpand`, may have) children. */
	canExpand: boolean;
	/** Whether the row is currently expanded. */
	isExpanded: boolean;
	/** Expand or collapse the row (fires `onToggleRow`). */
	toggle: () => void;
	/**
	 * Whether the row is selected, for a cell that draws its own selected
	 * look (the file browser's list view draws a selected item's icon
	 * selected). Always set by `ClassicyTable`; optional so a context built
	 * by hand need not supply it.
	 */
	selected?: boolean;
	/**
	 * Reports a drag the cell starts (the file browser's list view drags rows
	 * as Finder items) to the active Appearance Package: the table emits
	 * `dragStart` or `dragEnd` with `detail` from its own root. Pair every
	 * `dragStart` with exactly one `dragEnd`, and keep user data (paths,
	 * names) out of `detail`. A `dragEnd` must say whether the pointer stream
	 * was lost (`ClassicyAppearanceDragEnd`), as every package `dragEnd` does.
	 * Always set by `ClassicyTable`; optional so a context built by hand (a
	 * column's `render` under test) need not supply it.
	 */
	emitDrag?: <
		E extends Extract<ClassicyAppearanceEvent, "dragStart" | "dragEnd">,
	>(
		event: E,
		...detail: ClassicyAppearanceEmitDetail<E>
	) => void;
};

export type ClassicyTableColumn<T> = {
	/** Stable column id; also what `defaultSort.columnId` names. */
	id: string;
	/** Header label. */
	title: string;
	/** Value used for sorting, type-select, and the default cell text. */
	accessor: (row: T) => string | number | null | undefined;
	/** Custom cell renderer; defaults to the accessor value as text. */
	render?: (row: T, expansion: ClassicyTableCellContext) => ReactNode;
	/** Whether clicking the header sorts by this column. Defaults to `true`. */
	sortable?: boolean;
	/** Whether the header shows a drag handle to resize the column. Defaults to `true`. */
	resizable?: boolean;
	/** Initial column width in px. */
	width?: number;
	/** Horizontal alignment of the header and cells. Defaults to `"left"`. */
	align?: "left" | "center" | "right";
};

export type ClassicyTableSelectionMode = "none" | "single" | "multi";

/** Imperative operations a menu command needs, e.g. Edit → Select All. */
export type ClassicyTableSelectionApi = { selectAll: () => void };

type ClassicyTableProps<T> = {
	/** Column definitions, left to right. The first column drives type-select. */
	columns: ClassicyTableColumn<T>[];
	/** Row data, in unsorted order (top-level rows only when using `getSubRows`). */
	rows: T[];
	/** Stable, unique id for a row; selection, expansion and callbacks use it. */
	getRowId: (row: T) => string;
	/**
	 * `"none"` disables selection and keyboard handling (the list box is not
	 * focusable; double-click still activates), `"single"` selects one row, `"multi"` adds ⌘/Ctrl-click toggle,
	 * Shift-click/Shift-arrow ranges and ⌘A. Defaults to `"single"`.
	 */
	selectionMode?: ClassicyTableSelectionMode;
	/** Controlled selection. Omit for uncontrolled use with `onSelectionChange`. */
	selected?: string[];
	/** Fired with the full new list of selected row ids after every change. */
	onSelectionChange?: (ids: string[]) => void;
	/** Double-click or Enter on a row — the "open it" gesture. */
	onActivateRow?: (id: string, row: T) => void;
	/** Initial sort column (ascending unless `desc`). Unsorted when omitted. */
	defaultSort?: { columnId: string; desc?: boolean };
	/**
	 * Called with the sort after a header click changes it (`undefined` when
	 * unsorted), so a menu can show it (Find File's View menu).
	 */
	onSortChange?: (
		sort: { columnId: string; desc: boolean } | undefined,
	) => void;
	/** The header stays pinned while the container scrolls. Defaults to `true`. */
	stickyHeader?: boolean;
	/** Extra class(es) for the scrolling container. */
	className?: string;
	/** Inline style for the scrolling container. */
	style?: CSSProperties;
	/** Extra class(es) for a row — e.g. legacy class names a consumer's CSS keys on. */
	rowClassName?: (row: T, isSelected: boolean) => string | undefined;
	/**
	 * Enables tree rows: children of an expanded row render beneath it,
	 * depth-first, and keyboard navigation walks them in visual order.
	 * Materializing children lazily is fine — pair with `rowCanExpand` so
	 * collapsed rows still show as expandable.
	 */
	getSubRows?: (row: T) => T[] | undefined;
	/** Whether a row can expand even before its children are materialized. */
	rowCanExpand?: (row: T) => boolean;
	/** Controlled expansion, by row id. Omit for uncontrolled. */
	expanded?: string[];
	/** Fired when a row is expanded or collapsed (via `toggle` or ⌘→ / ⌘←). */
	onToggleRow?: (id: string, open: boolean) => void;
	/** Imperative hooks a menu command needs. Prop-shaped rather than a
	 *  forwardRef because this component is generic and forwardRef would
	 *  erase the type parameter. */
	selectionApiRef?: RefObject<ClassicyTableSelectionApi | null>;
	/** Receives the focusable list-box element (the keyboard target), e.g. so
	 *  a hosting window can give it initial focus. Prop-shaped for the same
	 *  reason as `selectionApiRef`. */
	containerRef?: RefObject<HTMLDivElement | null>;
	/**
	 * Whether the table scrolls its own rows, in a `ClassicyScrollArea` with
	 * Classicy's scroll bars. Defaults to `true`. `false` leaves the scrolling
	 * to an ancestor (the Finder's list view grows with its rows inside its
	 * window's scroll area): no bars, and the sticky header pins to that
	 * ancestor.
	 */
	scrollable?: boolean;
	/**
	 * Where the column titles go. `"inList"` (the default, Mac OS 8): the
	 * list's first row, pinned while it scrolls (`stickyHeader`), beside the
	 * vertical bar. `"aboveList"` (System 7's Finder, HIG p.218): above the
	 * list's scrolling region, in its scroll area's head
	 * (`classicyScrollAreaHead`: its own, or, when `scrollable` is false, the
	 * scrolling ancestor's), the area's full width, so the vertical bar starts
	 * under them; they scroll sideways with the rows. There they are a copy,
	 * `classicyTableDetachedHeader` (a `<div>` holding a `<table>` of the
	 * header row alone, `aria-hidden`, its table and each column as wide as
	 * the list's), while the table's own header stays for assistive
	 * technology and to size the columns, laid out but no height
	 * (`classicyTableHeaderHidden`). The copy takes the container's custom
	 * properties (`style`'s `--` keys, and the sorted column's place), never
	 * its other styles. With no scroll area to put them above, they stay in
	 * the list.
	 */
	headerPlacement?: "inList" | "aboveList";
};

type SortingState = { id: string; desc: boolean }[];

type SelectionModifiers = {
	shiftKey: boolean;
	metaKey: boolean;
	ctrlKey: boolean;
};

/**
 * The general-purpose `<table>` equivalent: a Platinum list view (the same
 * look as the Finder's list mode) over arbitrary row data. Sortable,
 * resizable columns; single or multi row selection with the Mac conventions
 * (plain click replaces, ⌘/Ctrl-click toggles, Shift extends a range over
 * the current visual order); HIG list-box keyboard behavior (arrows,
 * Home/End, Enter opens, type-selection on the first column). Use it for
 * interactive data tables; purely presentational tables can stay raw
 * `<table>` styled with theme variables.
 *
 * Built on `@tanstack/react-table` and rendered as a semantic `<table>` with
 * `aria-sort`. Selection and expansion are each controlled when `selected` /
 * `expanded` are passed, otherwise uncontrolled. With `getSubRows` it shows
 * tree rows: each cell `render` receives `{ depth, canExpand, isExpanded,
 * toggle }` so a column draws its own disclosure triangle and indent (this is
 * how the Finder list view is built), and ⌘→ / ⌘← expand and collapse the
 * keyboard row.
 *
 * ```tsx
 * <ClassicyTable
 *     columns={[{ id: "name", title: "Name", accessor: (f) => f.name }]}
 *     rows={files}
 *     getRowId={(f) => f.path}
 *     selectionMode="multi"
 *     onActivateRow={(id) => open(id)}
 * />
 * ```
 *
 * The sticky header keeps an explicit z-index and nothing in the scroll
 * container is transformed — transformed descendants create stacking
 * contexts that would paint over a z-index-less sticky header.
 */
export function ClassicyTable<T>({
	columns,
	rows,
	getRowId,
	selectionMode = "single",
	selected,
	onSelectionChange,
	onActivateRow,
	defaultSort,
	onSortChange,
	stickyHeader = true,
	className,
	style,
	rowClassName,
	getSubRows,
	rowCanExpand,
	expanded,
	onToggleRow,
	selectionApiRef,
	containerRef: externalContainerRef,
	scrollable = true,
	headerPlacement = "inList",
}: ClassicyTableProps<T>): ReactElement {
	const arrowUpIcon = useClassicyAsset("icons", "ui.menuDropdownArrowUp") ?? "";
	const [sorting, setSorting] = useState<SortingState>(
		defaultSort ? [{ id: defaultSort.columnId, desc: !!defaultSort.desc }] : [],
	);
	// Reported after the change commits, never for the sort it starts with.
	const onSortChangeRef = useRef(onSortChange);
	onSortChangeRef.current = onSortChange;
	const reportedSortingRef = useRef(sorting);
	useEffect(() => {
		if (reportedSortingRef.current === sorting) return;
		reportedSortingRef.current = sorting;
		const first = sorting[0];
		onSortChangeRef.current?.(
			first ? { columnId: first.id, desc: first.desc } : undefined,
		);
	}, [sorting]);
	const [internalExpanded, setInternalExpanded] = useState<string[]>([]);
	const expandedIds = expanded ?? internalExpanded;
	const expandedState = useMemo<ExpandedState>(
		() => Object.fromEntries(expandedIds.map((id) => [id, true])),
		[expandedIds],
	);

	const toggleRow = useCallback(
		(id: string) => {
			const open = !expandedIds.includes(id);
			setInternalExpanded(
				open ? [...expandedIds, id] : expandedIds.filter((v) => v !== id),
			);
			onToggleRow?.(id, open);
		},
		[expandedIds, onToggleRow],
	);
	const [internalSelected, setInternalSelected] = useState<string[]>([]);
	// The keyboard cursor row — where arrows continue from. Kept separate from
	// the selection so a controlled `selected` never has to round-trip it.
	const [cursorId, setCursorId] = useState<string>();
	const effectiveSelected = selected ?? internalSelected;

	// The Shift-range anchor: the id of the last plain (non-Shift) selection.
	// An id (not an index) so re-sorting between clicks keeps it meaningful.
	const anchorId = useRef<string | undefined>(undefined);
	const containerRef = useRef<HTMLDivElement>(null);
	// Attached in the commit phase (not an effect), so an ancestor's effect
	// that focuses `externalContainerRef` on the same commit already sees it.
	const setContainerRef = useCallback(
		(el: HTMLDivElement | null) => {
			containerRef.current = el;
			if (externalContainerRef) externalContainerRef.current = el;
		},
		[externalContainerRef],
	);
	// The container had no state class; `selected` stays on rows and headers.
	const appearance = useClassicyAppearance("Table", {}, containerRef);
	const tableRef = useRef<HTMLTableElement>(null);
	// Titles above the list: in a scrolling ancestor's head (lent while
	// asked for), or this table's own scroll area's (given as its `head`).
	const aboveList = headerPlacement === "aboveList";
	const lentHead = useClassicyScrollAreaHead(aboveList && !scrollable);
	const detached = aboveList && (scrollable || lentHead !== null);
	const detachedRef = useRef<HTMLDivElement>(null);
	const detachedTableRef = useRef<HTMLTableElement>(null);
	// The sorted column's header, from the container's left edge: its start
	// and width in px, both 0 with no sorted column. Published on the
	// container as `--classicy-table-sorted-start` / `-width`, so a package
	// can draw the sorted column below the last row as well (HIGOS8 Figs.
	// 2-24 and 2-43), where its cells carry `classicyTableCellSorted`.
	const [sortedPlace, setSortedPlace] = useState<readonly [number, number]>([
		0, 0,
	]);
	const typeBuffer = useRef("");
	const typeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
		undefined,
	);

	const columnById = useMemo(
		() => new Map(columns.map((c) => [c.id, c])),
		[columns],
	);

	// Column definitions carry only the table model (values, sorting, sizing) —
	// never the header/cell renderers. TanStack's flexRender treats a renderer
	// function as a COMPONENT TYPE, and React reconciles types by identity, so a
	// renderer re-created on any render would unmount and rebuild every cell's
	// DOM. The renderers live below instead, called for their returned nodes.
	const columnDefs = useMemo<ColumnDef<T>[]>(
		() =>
			columns.map((c) => ({
				id: c.id,
				accessorFn: (row: T) => c.accessor(row),
				enableSorting: c.sortable !== false,
				enableResizing: c.resizable !== false,
				...(c.width !== undefined ? { size: c.width } : {}),
			})),
		[columns],
	);

	const table = useReactTable({
		data: rows,
		columns: columnDefs,
		getRowId,
		getSubRows,
		...(rowCanExpand
			? { getRowCanExpand: (row: Row<T>) => rowCanExpand(row.original) }
			: {}),
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getExpandedRowModel: getExpandedRowModel(),
		state: { sorting, expanded: expandedState },
		onSortingChange: setSorting,
		columnResizeMode: "onChange",
	});

	// A column resize runs inside TanStack, on its own document listeners,
	// with no cancel API: a lost pointer stream (blur, pointercancel, a hidden
	// page) would leave the column following the pointer with no button held.
	// It is ended through TanStack's own release path instead, a `mouseup` or
	// `touchend` on the document, which detaches its listeners and resets
	// `columnSizingInfo`. The release carries no position, so TanStack skips
	// its final offset update and the column keeps the width the last move
	// gave it (onChange mode has already applied it): it ends where it is, as
	// a window resize or a split view divider does.
	const resizeInputRef = useRef<"mouse" | "touch" | undefined>(undefined);
	const endColumnResize = useCallback(() => {
		const input = resizeInputRef.current;
		// One loss can fire more than one event (hiding a tab also blurs).
		if (!input) return;
		resizeInputRef.current = undefined;
		const release = new Event(input === "touch" ? "touchend" : "mouseup");
		if (input === "touch") {
			Object.defineProperty(release, "touches", { value: [] });
		}
		document.dispatchEvent(release);
	}, []);
	const resizingColumn = table.getState().columnSizingInfo.isResizingColumn;
	useEffect(() => {
		if (!resizingColumn) return;
		const stopWatchingPointerStream =
			onClassicyPointerStreamLost(endColumnResize);
		return () => {
			stopWatchingPointerStream();
			// Still resizing here means the table is unmounting mid-resize:
			// end TanStack's gesture too, so its listeners do not outlive it.
			// After a release, the render that ran this already reads false.
			if (table.getState().columnSizingInfo.isResizingColumn) {
				endColumnResize();
			}
		};
	}, [resizingColumn, table, endColumnResize]);

	// Wrapped in useCallback (rather than left as a plain function) so
	// `selectAll` below gets a stable dependency — otherwise the effect that
	// assigns `selectionApiRef` would re-run on every render.
	const commit = useCallback(
		(ids: string[]) => {
			setInternalSelected(ids);
			onSelectionChange?.(ids);
		},
		[onSelectionChange],
	);

	const selectAll = useCallback(() => {
		if (selectionMode !== "multi") return;
		commit(table.getRowModel().rows.map((r) => r.id));
	}, [selectionMode, commit, table]);

	// Assigned in an effect rather than during render so a parent that reads
	// the handle in its own effect always sees the current closure.
	useEffect(() => {
		if (!selectionApiRef) return;
		selectionApiRef.current = { selectAll };
		return () => {
			selectionApiRef.current = null;
		};
	}, [selectionApiRef, selectAll]);

	// Selection semantics over the CURRENT visual (sorted) order. Clicks and
	// the keyboard (arrows, Home/End, type-select) all select through here.
	const applySelection = (rowId: string, mods: SelectionModifiers) => {
		if (selectionMode === "none") return;
		const visual = table.getRowModel().rows;
		const emitSelect = (selected: boolean) =>
			appearance.emit(
				"select",
				withClassicyAppearanceInput({ rowId, selected }),
			);
		if (selectionMode === "multi") {
			if (mods.shiftKey && anchorId.current) {
				const ai = visual.findIndex((r) => r.id === anchorId.current);
				const bi = visual.findIndex((r) => r.id === rowId);
				if (ai >= 0 && bi >= 0) {
					const [from, to] = ai <= bi ? [ai, bi] : [bi, ai];
					emitSelect(true);
					commit(visual.slice(from, to + 1).map((r) => r.id));
					return; // the anchor survives so the range can keep pivoting
				}
			}
			if (mods.metaKey || mods.ctrlKey) {
				anchorId.current = rowId;
				emitSelect(!effectiveSelected.includes(rowId));
				commit(
					effectiveSelected.includes(rowId)
						? effectiveSelected.filter((v) => v !== rowId)
						: [...effectiveSelected, rowId],
				);
				return;
			}
		}
		anchorId.current = rowId;
		emitSelect(true);
		commit([rowId]);
	};

	const moveCursorTo = (rowId: string, mods: SelectionModifiers) => {
		setCursorId(rowId);
		applySelection(rowId, mods);
		// Keep the row within the scrolling list box.
		requestAnimationFrame(() => {
			const el = containerRef.current?.querySelector(
				`[data-row-id="${CSS.escape(rowId)}"]`,
			);
			try {
				el?.scrollIntoView({ block: "nearest" });
			} catch {
				// scrollIntoView is not implemented in some test environments.
			}
		});
	};

	// HIG list-box keyboard behavior, matching the Finder list view: Up/Down
	// move the selection one row, Enter opens it, typing leading characters of
	// the first column selects the first matching row.
	const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
		if (selectionMode === "none") return;
		const visual = table.getRowModel().rows;
		if (visual.length === 0) return;
		const curIndex = visual.findIndex((r) => r.id === cursorId);
		const shiftMods: SelectionModifiers = {
			shiftKey: e.shiftKey && selectionMode === "multi",
			metaKey: false,
			ctrlKey: false,
		};

		switch (e.key) {
			case "ArrowDown": {
				e.preventDefault();
				const ni = Math.min(curIndex + 1, visual.length - 1);
				moveCursorTo(visual[ni < 0 ? 0 : ni].id, shiftMods);
				return;
			}
			case "ArrowUp": {
				e.preventDefault();
				const ni = curIndex < 0 ? 0 : Math.max(curIndex - 1, 0);
				moveCursorTo(visual[ni].id, shiftMods);
				return;
			}
			case "Home": {
				e.preventDefault();
				moveCursorTo(visual[0].id, shiftMods);
				return;
			}
			case "End": {
				e.preventDefault();
				moveCursorTo(visual[visual.length - 1].id, shiftMods);
				return;
			}
			case "ArrowRight": {
				// Command-Right: expand the cursor row (HIG list-view
				// equivalent, matching ClassicyTree).
				if ((e.metaKey || e.ctrlKey) && curIndex >= 0) {
					const row = visual[curIndex];
					if (row.getCanExpand() && !row.getIsExpanded()) {
						e.preventDefault();
						toggleRow(row.id);
					}
				}
				return;
			}
			case "ArrowLeft": {
				// Command-Left: collapse it.
				if ((e.metaKey || e.ctrlKey) && curIndex >= 0) {
					const row = visual[curIndex];
					if (row.getCanExpand() && row.getIsExpanded()) {
						e.preventDefault();
						toggleRow(row.id);
					}
				}
				return;
			}
			case "Enter": {
				if (curIndex >= 0) {
					e.preventDefault();
					const row = visual[curIndex];
					onActivateRow?.(row.id, row.original);
				}
				return;
			}
			case "a":
			case "A": {
				if ((e.metaKey || e.ctrlKey) && selectionMode === "multi") {
					e.preventDefault();
					selectAll();
					return;
				}
				break; // fall out of the switch into type-select below
			}
			default:
				break;
		}

		// Type-select: typing leading characters of the first column's value
		// jumps to the first matching row. Lives after the switch (rather than
		// only in `default`) so an unmodified "a" — which the switch above
		// intercepts to check for ⌘A — still reaches it via `break`.
		const isPrintable =
			e.key.length === 1 &&
			e.key !== " " &&
			!e.metaKey &&
			!e.ctrlKey &&
			!e.altKey;
		if (!isPrintable) return;
		if (typeTimer.current) clearTimeout(typeTimer.current);
		typeBuffer.current += e.key.toLowerCase();
		typeTimer.current = setTimeout(() => {
			typeBuffer.current = "";
		}, 700);
		const buf = typeBuffer.current;
		const first = columns[0];
		if (!first) return;
		const start = curIndex < 0 ? 0 : curIndex;
		const order = [...visual.slice(start + 1), ...visual.slice(0, start + 1)];
		const match = order.find((r) =>
			`${first.accessor(r.original) ?? ""}`.toLowerCase().startsWith(buf),
		);
		if (match) {
			moveCursorTo(match.id, {
				shiftKey: false,
				metaKey: false,
				ctrlKey: false,
			});
		}
	};

	const sortedColumnId = sorting[0]?.id;
	const columnSizing = table.getState().columnSizing;
	// biome-ignore lint/correctness/useExhaustiveDependencies: the sort, the columns and their sizes are what move the sorted header; the measure reads the DOM
	useLayoutEffect(() => {
		const measure = () => {
			const container = containerRef.current;
			// Above the list, the titles drawn are the detached copy's.
			const th = (
				detachedTableRef.current ?? tableRef.current
			)?.tHead?.querySelector<HTMLElement>(":scope > tr > th[aria-sort]");
			let next: readonly [number, number] = [0, 0];
			if (container && th) {
				const box = th.getBoundingClientRect();
				next = [
					Math.round(box.left - container.getBoundingClientRect().left),
					Math.round(box.width),
				];
			}
			setSortedPlace((prev) =>
				prev[0] === next[0] && prev[1] === next[1] ? prev : next,
			);
		};
		measure();
		const tableEl = tableRef.current;
		if (!tableEl || typeof ResizeObserver === "undefined") return;
		const observer = new ResizeObserver(measure);
		observer.observe(tableEl);
		return () => observer.disconnect();
	}, [sortedColumnId, columnSizing, columns]);
	const containerStyle: CSSProperties = {
		"--classicy-table-sorted-start": `${sortedPlace[0]}px`,
		"--classicy-table-sorted-width": `${sortedPlace[1]}px`,
		...appearance.style,
		...style,
	} as CSSProperties;
	// The detached titles' copy takes the container's custom properties (its
	// sorted column's place, a caller's own), so a package can place its
	// titles by them out there too; never the container's other styles.
	const detachedStyle = Object.fromEntries(
		Object.entries(containerStyle).filter(([key]) => key.startsWith("--")),
	) as CSSProperties;

	// The header row, drawn in the table's own header and, above the list,
	// in the detached copy too.
	const headerRows = table.getHeaderGroups().map((headerGroup) => (
		<tr key={headerGroup.id} className="classicyTableHeaderGroup">
			{headerGroup.headers.map((header) => {
				const isSorted = sorting.length > 0 && header.id === sorting[0].id;
				return (
					<th
						key={header.id}
						align={columnById.get(header.id)?.align ?? "left"}
						aria-sort={
							isSorted
								? sorting[0].desc
									? "descending"
									: "ascending"
								: undefined
						}
						style={{ width: header.getSize() }}
						className={classNames(
							"classicyTableColumnHeader",
							header.column.getIsResizing() ? "isResizing" : "",
							classicyStateClasses({ selected: !!isSorted }),
						)}
						onClick={() => {
							if (!header.column.getCanSort()) {
								return;
							}
							// First click sorts ascending; clicking the sorted
							// column flips it (same cycle as the Finder view).
							const desc = !(
								header.column.getIsSorted() === false ||
								header.column.getIsSorted() === "desc"
							);
							header.column.toggleSorting(desc, false);
							appearance.emit("change", {
								columnId: header.id,
								desc,
							});
						}}
					>
						<div className="classicyTableHeaderCellContent">
							{!header.isPlaceholder && (
								<span>{columnById.get(header.id)?.title ?? ""}</span>
							)}
							{isSorted && (
								<img
									src={`${arrowUpIcon}`}
									alt="Up Arrow"
									className={classNames(
										"classicyTableSortArrow",
										!sorting[0].desc ? "classicyTableSortArrowAscending" : "",
									)}
								/>
							)}
							{header.column.getCanResize() && (
								// biome-ignore lint/a11y/noStaticElementInteractions: resize handle requires mouse events only; no keyboard equivalent
								<div
									onMouseDown={(e) => {
										resizeInputRef.current = "mouse";
										header.getResizeHandler()(e);
									}}
									onTouchStart={(e) => {
										resizeInputRef.current = "touch";
										header.getResizeHandler()(e);
									}}
									className={classNames(
										"resizer",
										header.column.getIsResizing() ? "isResizing" : "",
									)}
								></div>
							)}
						</div>
					</th>
				);
			})}
		</tr>
	));

	const tableElement = (
		<table ref={tableRef} className="classicyTable">
			<thead
				className={classNames(
					"classicyTableHeader",
					// Above the list the titles drawn are the detached copy;
					// this header stays for assistive technology, unseen.
					detached
						? "classicyTableHeaderHidden"
						: stickyHeader && "classicyTableHeaderSticky",
				)}
			>
				{headerRows}
			</thead>
			<tbody className="classicyTableContent">
				{table.getRowModel().rows.map((row) => (
					<tr
						key={row.id}
						data-row-id={row.id}
						data-selected={effectiveSelected.includes(row.id) || undefined}
						className={classNames(
							"classicyTableRow",
							classicyStateClasses({
								selected: effectiveSelected.includes(row.id),
							}),
							rowClassName?.(row.original, effectiveSelected.includes(row.id)),
						)}
						onClick={(e) => {
							setCursorId(row.id);
							applySelection(row.id, e);
						}}
						onDoubleClick={() => onActivateRow?.(row.id, row.original)}
					>
						{row.getVisibleCells().map((cell) => {
							const column = columnById.get(cell.column.id);
							return (
								<td
									key={cell.id}
									className={classNames(
										"classicyTableCell",
										cell.column.id === sortedColumnId &&
											"classicyTableCellSorted",
									)}
									style={{
										width: cell.column.getSize(),
										textAlign: column?.align ?? "left",
									}}
								>
									{column?.render ? (
										column.render(row.original, {
											depth: row.depth,
											canExpand: row.getCanExpand(),
											isExpanded: row.getIsExpanded(),
											toggle: () => toggleRow(row.id),
											selected: effectiveSelected.includes(row.id),
											emitDrag: appearance.emit,
										})
									) : (
										<span>{`${cell.getValue() ?? ""}`}</span>
									)}
								</td>
							);
						})}
					</tr>
				))}
			</tbody>
		</table>
	);

	// The titles above the list: the header row in a table of its own, as
	// wide as the list's, so its columns fall on the list's; and as much
	// room after it as the head is wider than the viewport (the vertical
	// bar's column), so the head can scroll as far sideways as the rows.
	const detachedHeader = detached ? (
		<div
			ref={detachedRef}
			className="classicyTableDetachedHeader"
			style={detachedStyle}
			aria-hidden="true"
		>
			<table ref={detachedTableRef} className="classicyTable">
				<colgroup>
					{table.getVisibleLeafColumns().map((column) => (
						<col key={column.id} />
					))}
				</colgroup>
				<thead className="classicyTableHeader">{headerRows}</thead>
			</table>
		</div>
	) : null;
	// What the fitting observes: the copy (with its head and the head's
	// viewport) and the list's header cells, one per visible column.
	const visibleColumnKey = table
		.getVisibleLeafColumns()
		.map((column) => column.id)
		.join("\n");
	// biome-ignore lint/correctness/useExhaustiveDependencies: the copy's mount (detached, the lent head, the table scrolling itself) and the visible columns are what the observer watches; sizes after that come from it, not from renders
	useLayoutEffect(() => {
		const wrapper = detachedRef.current;
		const copy = detachedTableRef.current;
		const list = tableRef.current;
		const head = wrapper?.parentElement;
		if (!wrapper || !copy || !list || !head) return;
		const viewport = head.parentElement?.querySelector<HTMLElement>(
			":scope > .classicyScrollAreaBody > .classicyScrollAreaViewport",
		);
		const fitHeader = () => {
			const width = `${list.getBoundingClientRect().width}px`;
			if (copy.style.width !== width) copy.style.width = width;
			// Each column as wide as the list's: its own header, unseen but
			// laid out, sets them as it does without a copy.
			const own = list.tHead?.rows[0]?.cells;
			const cols = copy.querySelectorAll<HTMLElement>(
				":scope > colgroup > col",
			);
			cols.forEach((col, i) => {
				const cell = own?.[i];
				if (!cell) return;
				const w = `${cell.getBoundingClientRect().width}px`;
				if (col.style.width !== w) col.style.width = w;
			});
			const room = viewport
				? `${Math.max(0, head.clientWidth - viewport.clientWidth)}px`
				: "0px";
			if (wrapper.style.paddingRight !== room) {
				wrapper.style.paddingRight = room;
			}
		};
		fitHeader();
		if (typeof ResizeObserver === "undefined") return;
		const observer = new ResizeObserver(fitHeader);
		observer.observe(list);
		for (const cell of Array.from(list.tHead?.rows[0]?.cells ?? [])) {
			observer.observe(cell);
		}
		observer.observe(head);
		if (viewport) observer.observe(viewport);
		return () => observer.disconnect();
	}, [detached, lentHead, scrollable, visibleColumnKey]);

	// The focusable list box: the keyboard target, scrolling its rows (in a
	// ClassicyScrollArea, which scrolls its viewport for the keys a focused
	// scroller takes, Page Up and Page Down, that the table leaves alone).
	const tabIndex = selectionMode === "none" ? undefined : 0;
	if (!scrollable) {
		return (
			// biome-ignore lint/a11y/noStaticElementInteractions: list box is a focusable scroll region driven by arrow keys and type-selection; rows remain the click targets
			<div
				{...appearance.attrs}
				ref={setContainerRef}
				tabIndex={tabIndex}
				onKeyDown={handleKeyDown}
				className={classNames(
					"classicyTableContainer",
					appearance.className,
					className,
				)}
				style={containerStyle}
			>
				{tableElement}
				{detachedHeader && lentHead && createPortal(detachedHeader, lentHead)}
			</div>
		);
	}
	return (
		<ClassicyScrollArea
			{...appearance.attrs}
			className={classNames(
				"classicyTableContainer",
				appearance.className,
				className,
			)}
			style={containerStyle}
			ref={setContainerRef}
			tabIndex={tabIndex}
			onKeyDown={handleKeyDown}
			head={detachedHeader ?? undefined}
		>
			{tableElement}
		</ClassicyScrollArea>
	);
}
