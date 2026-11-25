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
	type MouseEvent as ReactMouseEvent,
	type ReactNode,
	type RefObject,
	useCallback,
	useContext,
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
import { useClassicyAppearanceLayout } from "@/Appearance/useClassicyAppearanceLayout";
import { classicyStateClasses } from "@/Appearance/vocabulary/ClassicyVocabulary";
import { onClassicyPointerStreamLost } from "@/SystemFolder/SystemResources/File/ClassicyPointerStreamLost.internal";
import { useClassicyEscapeCancel } from "@/SystemFolder/SystemResources/Keyboard/useClassicyEscapeCancel.internal";
import { ClassicyScrollArea } from "@/SystemFolder/SystemResources/ScrollArea/ClassicyScrollArea";
import { useClassicyScrollAreaHead } from "@/SystemFolder/SystemResources/ScrollArea/ClassicyScrollAreaHead.internal";
import {
	classicyListDragSelection,
	classicyRangeSetTo,
	classicySameSelection,
	startClassicyListRangeDrag,
} from "@/SystemFolder/SystemResources/Utils/ClassicyListPressSelection.internal";
import {
	classicyDragSelectsRange,
	classicySecondaryButtonSelects,
	classicySelectsOnPress,
	classicyWindowsSelectionModifiers,
	isClassicyGestureButton,
} from "@/SystemFolder/SystemResources/Utils/ClassicyMousePolicy";
import { ClassicyWindowActiveContext } from "@/SystemFolder/SystemResources/Window/ClassicyWindowActiveContext";

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
	/**
	 * A double-click's "open it" for the whole selection, under a package
	 * whose layout says `selection.modifiers: "windows"` (WIG App. A Tables
	 * A.2, pp.352-353, and A.3, p.356: a modified double-click adjusts the
	 * selection, then runs the default command on the set): called, in
	 * place of `onActivateRow`, with the ids of the selected rows shown, in
	 * the visual order, as the double-click's own clicks left them (not
	 * called when they left none). Absent, under any other layout, or with
	 * `selectionMode="none"`, a double-click calls `onActivateRow` with its
	 * row. Enter still calls `onActivateRow`.
	 */
	onActivateSelection?: (ids: string[]) => void;
	/**
	 * Whether the rows start drags of their own (the file browser's list
	 * view drags them as Finder items): a press dragged across them then
	 * never selects a range, under any layout (`selection.dragRange` is for
	 * lists whose rows stay put). Defaults to `false`.
	 */
	rowsDrag?: boolean;
	/** Initial sort column (ascending unless `desc`). Unsorted when omitted. */
	defaultSort?: { columnId: string; desc?: boolean };
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
	/**
	 * Groups the sort keeps together: each level's rows go lowest group
	 * first, each group sorted in itself, and a descending sort reverses the
	 * whole order, groups included, as a sort on a compare that puts the
	 * group first does (Windows Explorer's: folders first, last when the sort
	 * runs down). The file browser's list groups folders this way under a
	 * package whose `layout.fileList.foldersFirst` says so. Omitted, the rows
	 * sort as one.
	 */
	sortGroup?: (row: T) => number;
};

type SortingState = { id: string; desc: boolean }[];

type SelectionModifiers = {
	shiftKey: boolean;
	metaKey: boolean;
	ctrlKey: boolean;
};

const NO_MODIFIERS: SelectionModifiers = {
	shiftKey: false,
	metaKey: false,
	ctrlKey: false,
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
 * keyboard row. Drawn in a window that is not the active one, the container
 * carries the `inactive` state (`ClassicyWindowActiveContext`): a scrolling
 * table's container is its scroll area's root, which carries it already;
 * with `scrollable={false}` (the Finder's list) the table adds it itself.
 *
 * Under the active package's layout: `selection.secondaryButton: "select"`
 * (Windows 98) selects an unselected row alone at a button-2 press, before
 * its `contextmenu`, and leaves a selected row's selection as it is;
 * `mouse: "windows"` lets only button 1 resize a column; and
 * `input.escapeCancels` makes Escape mid-resize put the column back as the
 * press found it. `selection.selectOn: "press"` selects a row at the
 * button-1 press (an unselected row, or any modified press; a plain press
 * on a selected row waits for its click to reset the selection to it, as
 * comctl32's list view does), and `selection.dragRange` then selects the
 * rows a press drags across, unless `rowsDrag`; `selection.modifiers:
 * "windows"` makes Control (or ⌘) with Shift set the anchor's range to the
 * anchor's state, keeping the rest, and hands a double-click's selection to
 * `onActivateSelection`.
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
	onActivateSelection,
	rowsDrag = false,
	defaultSort,
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
	sortGroup,
}: ClassicyTableProps<T>): ReactElement {
	const arrowUpIcon = useClassicyAsset("icons", "ui.menuDropdownArrowUp") ?? "";
	const [sorting, setSorting] = useState<SortingState>(
		defaultSort ? [{ id: defaultSort.columnId, desc: !!defaultSort.desc }] : [],
	);
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
	// The selection as it last stood (a commit's, else the render's), for a
	// drag and a double-click that read it between renders.
	const selectionRef = useRef(effectiveSelected);
	selectionRef.current = effectiveSelected;

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
	// Button 2's selection, the buttons that resize a column, Escape's
	// cancel, when button 1 selects, the drag across rows and Windows'
	// modified clicks: the active package's layout.
	const layout = useClassicyAppearanceLayout();
	const selectsOnPress = classicySelectsOnPress(layout);
	const dragsRange = classicyDragSelectsRange(layout) && !rowsDrag;
	const windowsModifiers = classicyWindowsSelectionModifiers(layout);
	// The row a button-1 press last landed on under `selectOn: "press"`, and
	// whether it left the selection for the click to reset (a plain press
	// on a selected row: comctl32's `nLButtonDownItem`).
	const pressRef = useRef<{ id: string; deferred: boolean } | null>(null);
	// The drag across rows in progress, stopped if the table unmounts.
	const stopRangeDragRef = useRef<(() => void) | null>(null);
	useEffect(() => () => stopRangeDragRef.current?.(), []);
	// `inactive` while the window it is drawn in is not the active one (as
	// ClassicyScrollArea reads it; outside a window, never), so a package can
	// draw the selection as an inactive window's (Windows 98: ButtonFace, as
	// LVS_SHOWSELALWAYS draws it). A scrolling table's container is the scroll
	// area's root, which emits it; the unscrolled container emits it here.
	const inactive = useContext(ClassicyWindowActiveContext) === false;
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

	// The rows in their visual order: TanStack's (sorted, the expanded rows'
	// children under them), or, with `sortGroup`, each level's rows grouped,
	// the sort kept within each group (Array#sort is stable): lowest group
	// first, or last while the sort runs down.
	const descending = sorting[0]?.desc === true;
	const visualRowsOf = useCallback((): Row<T>[] => {
		if (!sortGroup) return table.getRowModel().rows;
		const visual: Row<T>[] = [];
		const walk = (level: Row<T>[]) => {
			const grouped = [...level].sort((a, b) =>
				descending
					? sortGroup(b.original) - sortGroup(a.original)
					: sortGroup(a.original) - sortGroup(b.original),
			);
			for (const row of grouped) {
				visual.push(row);
				if (row.subRows?.length && row.getIsExpanded()) walk(row.subRows);
			}
		};
		walk(table.getSortedRowModel().rows);
		return visual;
	}, [table, sortGroup, descending]);

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

	// Escape mid-resize, under a package whose layout says
	// `input.escapeCancels` (Windows 98; WIG Ch.4 "Shortcut Keys", p.27):
	// the column goes back to the width the press found, and the resize
	// ends, through TanStack's own release path as a lost stream ends it.
	const sizingAtPressRef = useRef<Record<string, number>>({});
	useClassicyEscapeCancel(!!resizingColumn, () => {
		endColumnResize();
		table.setColumnSizing(sizingAtPressRef.current);
	});

	// Wrapped in useCallback (rather than left as a plain function) so
	// `selectAll` below gets a stable dependency — otherwise the effect that
	// assigns `selectionApiRef` would re-run on every render.
	const commit = useCallback(
		(ids: string[]) => {
			selectionRef.current = ids;
			setInternalSelected(ids);
			onSelectionChange?.(ids);
		},
		[onSelectionChange],
	);

	const selectAll = useCallback(() => {
		if (selectionMode !== "multi") return;
		commit(visualRowsOf().map((r) => r.id));
	}, [selectionMode, commit, visualRowsOf]);

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
		const visual = visualRowsOf();
		const emitSelect = (selected: boolean) =>
			appearance.emit(
				"select",
				withClassicyAppearanceInput({ rowId, selected }),
			);
		if (selectionMode === "multi") {
			// Windows' Control-Shift (`selection.modifiers` "windows"; WIG
			// Ch.5 "Selection Adjustment", p.39; comctl32's
			// LISTVIEW_AddGroupSelection keeps the anchor too): the other
			// selections stay, and the anchor's range takes the anchor's
			// state, as p.39 has it (Wine's reimplementation selects it
			// whatever that state); the anchor stays.
			if (
				windowsModifiers &&
				mods.shiftKey &&
				(mods.metaKey || mods.ctrlKey) &&
				anchorId.current
			) {
				const anchor = anchorId.current;
				const ai = visual.findIndex((r) => r.id === anchor);
				const bi = visual.findIndex((r) => r.id === rowId);
				if (ai >= 0 && bi >= 0) {
					const [from, to] = ai <= bi ? [ai, bi] : [bi, ai];
					const state = effectiveSelected.includes(anchor);
					emitSelect(state);
					commit(
						classicyRangeSetTo(
							effectiveSelected,
							visual.slice(from, to + 1).map((r) => r.id),
							state,
						),
					);
					return;
				}
			}
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

	// A drag from a press across the rows (`selection.dragRange`, rows that
	// do not drag): the row under the pointer, the first or last shown
	// outside the list, is the range's other end, the modifiers held at the
	// press governing until the release (WIG Ch.5 "Selection Adjustment",
	// p.39). `before` is the selection the press found; the press has
	// already selected.
	const startRangeDrag = (
		e: ReactMouseEvent,
		rowId: string,
		before: string[],
		deferred: boolean,
	) => {
		const root = containerRef.current;
		if (!root) return;
		stopRangeDragRef.current?.();
		const multi = selectionMode === "multi";
		const shift = multi && e.shiftKey;
		const toggle = multi && (e.metaKey || e.ctrlKey);
		// A Control (or ⌘) drag, and a Control-Shift one under Windows'
		// modifiers, keep the selection the press found and set the range
		// to the anchor's state; a plain or Shift drag selects the range.
		const keep = toggle && (!shift || windowsModifiers);
		const anchor = deferred ? rowId : (anchorId.current ?? rowId);
		const anchorState = selectionRef.current.includes(anchor);
		stopRangeDragRef.current = startClassicyListRangeDrag({
			root,
			rowSelector: "tr[data-row-id]",
			rowIdOf: (el) => el.getAttribute("data-row-id"),
			startId: rowId,
			onRow: (id) => {
				const order = visualRowsOf().map((r) => r.id);
				const next = multi
					? classicyListDragSelection({
							order,
							anchor,
							row: id,
							base: keep ? before : undefined,
							anchorState,
						})
					: order.includes(id)
						? [id]
						: null;
				if (!next) return;
				if (multi) anchorId.current = anchor;
				setCursorId(id);
				if (classicySameSelection(next, selectionRef.current)) return;
				appearance.emit(
					"select",
					withClassicyAppearanceInput({
						rowId: id,
						selected: next.includes(id),
					}),
				);
				commit(next);
			},
		});
	};

	// A button-1 press on a row under `selection.selectOn: "press"` (WIG
	// Ch.5 "Selection with the Mouse", pp.37-38; comctl32's
	// LISTVIEW_LButtonDown): an unselected row, or any modified press,
	// selects at once and sets the anchor, so a drag that follows (the
	// Finder's file drag reads the selection when it starts) carries what
	// is drawn selected; a plain press on a selected row leaves it for the
	// click to reset the selection to that row; the second press of a
	// double-click changes nothing (Win32's WM_LBUTTONDBLCLK). With
	// `dragRange`, and rows that do not drag, a drag across the rows
	// follows.
	const pressRow = (e: ReactMouseEvent, rowId: string) => {
		if (!selectsOnPress || selectionMode === "none") return;
		if (e.detail > 1) {
			pressRef.current = { id: rowId, deferred: false };
			return;
		}
		const before = selectionRef.current;
		const modified = e.shiftKey || e.metaKey || e.ctrlKey;
		const deferred = !modified && before.includes(rowId);
		pressRef.current = { id: rowId, deferred };
		setCursorId(rowId);
		if (!deferred) applySelection(rowId, e);
		if (dragsRange) startRangeDrag(e, rowId, before, deferred);
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
		const visual = visualRowsOf();
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
										// Under `layout.mouse` "windows" only button 1 resizes
										// (WIG Ch.4 "Mouse Actions", pp.24-25).
										if (!isClassicyGestureButton(e, layout)) return;
										resizeInputRef.current = "mouse";
										sizingAtPressRef.current = table.getState().columnSizing;
										header.getResizeHandler()(e);
									}}
									onTouchStart={(e) => {
										resizeInputRef.current = "touch";
										sizingAtPressRef.current = table.getState().columnSizing;
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

	// The focus row, Windows' focus item and the Mac list's cursor: the row the
	// keyboard continues from (`cursorId`) while it is listed, else the first
	// selected row (a controlled `selected` with no cursor yet), else the
	// first row, so a focused list always has one. Emitted as the vocabulary
	// state `focused` on its row, whether or not the list has focus; a
	// package keys the dotted focus rectangle on it under the list's
	// `:focus` (Windows 98 does; Platinum and System 7 read it not at all).
	const visualRows = visualRowsOf();
	const focusRowId =
		(cursorId !== undefined && visualRows.some((r) => r.id === cursorId)
			? cursorId
			: undefined) ??
		visualRows.find((r) => effectiveSelected.includes(r.id))?.id ??
		visualRows[0]?.id;
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
				{visualRows.map((row) => (
					<tr
						key={row.id}
						data-row-id={row.id}
						data-selected={effectiveSelected.includes(row.id) || undefined}
						className={classNames(
							"classicyTableRow",
							classicyStateClasses({
								selected: effectiveSelected.includes(row.id),
								focused: row.id === focusRowId,
							}),
							rowClassName?.(row.original, effectiveSelected.includes(row.id)),
						)}
						onMouseDown={(e) => {
							if (e.button === 0) {
								pressRow(e, row.id);
								return;
							}
							// Button 2 on an unselected row, under a package whose
							// layout says `selection.secondaryButton: "select"`
							// (Windows; WIG Ch.5 "Selection with the Mouse",
							// pp.37-38): the row alone is selected before the
							// `contextmenu` asks for its menu, which then acts on
							// it; on a selected row the selection stays.
							if (
								e.button !== 2 ||
								!classicySecondaryButtonSelects(layout) ||
								effectiveSelected.includes(row.id)
							) {
								return;
							}
							setCursorId(row.id);
							applySelection(row.id, {
								shiftKey: false,
								metaKey: false,
								ctrlKey: false,
							});
						}}
						onClick={(e) => {
							// The click ending a press that selected (`selectOn`
							// "press") adds nothing, unless the press left it to
							// reset the selection to this row.
							const press = pressRef.current;
							pressRef.current = null;
							if (press?.id === row.id) {
								if (press.deferred) {
									setCursorId(row.id);
									applySelection(row.id, NO_MODIFIERS);
								}
								return;
							}
							// Windows' second click of a double-click adjusts
							// nothing (the double-click acts on the set).
							if (windowsModifiers && e.detail > 1) return;
							setCursorId(row.id);
							applySelection(row.id, e);
						}}
						onDoubleClick={() => {
							if (
								windowsModifiers &&
								onActivateSelection &&
								selectionMode !== "none"
							) {
								const held = new Set(selectionRef.current);
								const ids = visualRowsOf()
									.map((r) => r.id)
									.filter((id) => held.has(id));
								if (ids.length > 0) onActivateSelection(ids);
								return;
							}
							onActivateRow?.(row.id, row.original);
						}}
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
					classicyStateClasses({ inactive }),
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
