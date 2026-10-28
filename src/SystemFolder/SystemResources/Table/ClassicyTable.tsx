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
	useMemo,
	useRef,
	useState,
} from "react";
import { useClassicyAsset } from "@/Appearance/ClassicyAssetRegistry";
import { classicyStateClasses } from "@/Appearance/vocabulary/ClassicyVocabulary";

/**
 * Expansion facts handed to every cell `render`, so a column (typically the
 * first) can draw its own disclosure affordance and depth indent. All-zero /
 * no-op when the table has no `getSubRows`.
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

	// Selection semantics over the CURRENT visual (sorted) order.
	const applySelection = (rowId: string, mods: SelectionModifiers) => {
		if (selectionMode === "none") return;
		const visual = table.getRowModel().rows;
		if (selectionMode === "multi") {
			if (mods.shiftKey && anchorId.current) {
				const ai = visual.findIndex((r) => r.id === anchorId.current);
				const bi = visual.findIndex((r) => r.id === rowId);
				if (ai >= 0 && bi >= 0) {
					const [from, to] = ai <= bi ? [ai, bi] : [bi, ai];
					commit(visual.slice(from, to + 1).map((r) => r.id));
					return; // the anchor survives so the range can keep pivoting
				}
			}
			if (mods.metaKey || mods.ctrlKey) {
				anchorId.current = rowId;
				commit(
					effectiveSelected.includes(rowId)
						? effectiveSelected.filter((v) => v !== rowId)
						: [...effectiveSelected, rowId],
				);
				return;
			}
		}
		anchorId.current = rowId;
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

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: list box is a focusable scroll region driven by arrow keys and type-selection; rows remain the click targets
		<div
			ref={setContainerRef}
			tabIndex={selectionMode === "none" ? undefined : 0}
			onKeyDown={handleKeyDown}
			className={classNames("classicyTableContainer", className)}
			style={style}
		>
			<table className="classicyTable">
				<thead
					className={classNames(
						"classicyTableHeader",
						stickyHeader && "classicyTableHeaderSticky",
					)}
				>
					{table.getHeaderGroups().map((headerGroup) => (
						<tr key={headerGroup.id} className="classicyTableHeaderGroup">
							{headerGroup.headers.map((header) => {
								const isSorted =
									sorting.length > 0 && header.id === sorting[0].id;
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
														!sorting[0].desc
															? "classicyTableSortArrowAscending"
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
								);
							})}
						</tr>
					))}
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
								rowClassName?.(
									row.original,
									effectiveSelected.includes(row.id),
								),
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
										className="classicyTableCell"
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
		</div>
	);
}
