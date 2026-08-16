import "./ClassicyTable.scss";
import {
	type ColumnDef,
	type ExpandedState,
	flexRender,
	getCoreRowModel,
	getExpandedRowModel,
	getSortedRowModel,
	type Row,
	useReactTable,
} from "@tanstack/react-table";
import classNames from "classnames";
import {
	type KeyboardEvent,
	type ReactElement,
	type ReactNode,
	useCallback,
	useMemo,
	useRef,
	useState,
} from "react";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";

const arrowUpIcon = ClassicyIcons.ui.menuDropdownArrowUp;

/**
 * Expansion facts handed to every cell `render`, so a column (typically the
 * first) can draw its own disclosure affordance and depth indent. All-zero /
 * no-op when the table has no `getSubRows`.
 */
export type ClassicyTableCellContext = {
	depth: number;
	canExpand: boolean;
	isExpanded: boolean;
	toggle: () => void;
};

export type ClassicyTableColumn<T> = {
	id: string;
	title: string;
	/** Value used for sorting, type-select, and the default cell text. */
	accessor: (row: T) => string | number | null | undefined;
	/** Custom cell renderer; defaults to the accessor value as text. */
	render?: (row: T, expansion: ClassicyTableCellContext) => ReactNode;
	/** Default true. */
	sortable?: boolean;
	/** Default true. */
	resizable?: boolean;
	/** Initial column width in px. */
	width?: number;
	align?: "left" | "center" | "right";
};

export type ClassicyTableSelectionMode = "none" | "single" | "multi";

type ClassicyTableProps<T> = {
	columns: ClassicyTableColumn<T>[];
	rows: T[];
	getRowId: (row: T) => string;
	selectionMode?: ClassicyTableSelectionMode;
	/** Controlled selection. Omit for uncontrolled use with `onSelectionChange`. */
	selected?: string[];
	onSelectionChange?: (ids: string[]) => void;
	/** Double-click or Enter on a row — the "open it" gesture. */
	onActivateRow?: (id: string, row: T) => void;
	defaultSort?: { columnId: string; desc?: boolean };
	/** Default true: the header stays pinned while the container scrolls. */
	stickyHeader?: boolean;
	className?: string;
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
	onToggleRow?: (id: string, open: boolean) => void;
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
 * Home/End, Enter opens, type-selection on the first column).
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
	rowClassName,
	getSubRows,
	rowCanExpand,
	expanded,
	onToggleRow,
}: ClassicyTableProps<T>): ReactElement {
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
	const typeBuffer = useRef("");
	const typeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
		undefined,
	);

	const columnById = useMemo(
		() => new Map(columns.map((c) => [c.id, c])),
		[columns],
	);

	const columnDefs = useMemo<ColumnDef<T>[]>(
		() =>
			columns.map((c) => ({
				id: c.id,
				accessorFn: (row: T) => c.accessor(row),
				header: () => <span>{c.title}</span>,
				cell: (info) =>
					c.render ? (
						c.render(info.row.original, {
							depth: info.row.depth,
							canExpand: info.row.getCanExpand(),
							isExpanded: info.row.getIsExpanded(),
							toggle: () => toggleRow(info.row.id),
						})
					) : (
						<span>{`${info.getValue() ?? ""}`}</span>
					),
				enableSorting: c.sortable !== false,
				enableResizing: c.resizable !== false,
				...(c.width !== undefined ? { size: c.width } : {}),
			})),
		[columns, toggleRow],
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

	const commit = (ids: string[]) => {
		setInternalSelected(ids);
		onSelectionChange?.(ids);
	};

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
			case "Enter": {
				if (curIndex >= 0) {
					e.preventDefault();
					const row = visual[curIndex];
					onActivateRow?.(row.id, row.original);
				}
				return;
			}
			default: {
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
				const order = [
					...visual.slice(start + 1),
					...visual.slice(0, start + 1),
				];
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
			}
		}
	};

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: list box is a focusable scroll region driven by arrow keys and type-selection; rows remain the click targets
		<div
			ref={containerRef}
			tabIndex={selectionMode === "none" ? undefined : 0}
			onKeyDown={handleKeyDown}
			className={classNames("classicyTableContainer", className)}
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
											isSorted ? "classicyTableColumnHeaderSelected" : "",
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
											{!header.isPlaceholder &&
												flexRender(
													header.column.columnDef.header,
													header.getContext(),
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
								effectiveSelected.includes(row.id)
									? "classicyTableRowSelected"
									: null,
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
							{row.getVisibleCells().map((cell) => (
								<td
									key={cell.id}
									className="classicyTableCell"
									style={{
										width: cell.column.getSize(),
										textAlign: columnById.get(cell.column.id)?.align ?? "left",
									}}
								>
									{flexRender(cell.column.columnDef.cell, cell.getContext())}
								</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
