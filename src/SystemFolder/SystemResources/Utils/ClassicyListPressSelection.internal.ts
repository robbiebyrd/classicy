import { onClassicyPointerStreamLost } from "@/SystemFolder/SystemResources/File/ClassicyPointerStreamLost.internal";
import { classicyScrollViewportOf } from "@/SystemFolder/SystemResources/ScrollArea/ClassicyScrollViewportRegistry.internal";

/**
 * Selection at the press and across a drag, for the lists that take it
 * under the active package's layout (`layout.selection.selectOn` `"press"`
 * and `dragRange`; `ClassicyListBox` and `ClassicyTable`). The rules are
 * WIG Ch.5 "Mouse Selection", "Selection with the Mouse" (p.37) and
 * "Selection Adjustment" (pp.38-39), as user32's list box and comctl32's
 * list view track the pointer. Pure, but for the drag's document
 * listeners, so the lists share one implementation.
 */

/**
 * `base` with every id of `range` set to `selected`: an id `base` holds
 * keeps its place, and the ids it gains follow in `range`'s order. A new
 * array; neither input is changed.
 */
export const classicyRangeSetTo = (
	base: readonly string[],
	range: readonly string[],
	selected: boolean,
): string[] => {
	if (!selected) {
		const out = new Set(range);
		return base.filter((id) => !out.has(id));
	}
	const held = new Set(base);
	return [...base, ...range.filter((id) => !held.has(id))];
};

/**
 * The selection a drag across a multiple selection list gives with the
 * pointer over `row`: the rows from `anchor` to `row` in `order` (the
 * list's selectable rows, in the order shown), either alone (no `base`: a
 * plain or Shift drag) or set to `anchorState` in `base`, the selection the
 * press found (a Control or ⌘ drag, which toggled the anchor first, or a
 * Control-Shift drag under Windows' modifiers, which keeps it). `null` when
 * either row is not in `order` (a dimmed row), which changes nothing.
 */
export const classicyListDragSelection = ({
	order,
	anchor,
	row,
	base,
	anchorState = true,
}: {
	order: readonly string[];
	anchor: string;
	row: string;
	base?: readonly string[];
	anchorState?: boolean;
}): string[] | null => {
	const a = order.indexOf(anchor);
	const b = order.indexOf(row);
	if (a < 0 || b < 0) return null;
	const range = order.slice(Math.min(a, b), Math.max(a, b) + 1);
	return base ? classicyRangeSetTo(base, range, anchorState) : range;
};

/** Whether `a` and `b` hold the same ids, in any order. */
export const classicySameSelection = (
	a: readonly string[],
	b: readonly string[],
): boolean => {
	if (a.length !== b.length) return false;
	const held = new Set(a);
	return b.every((id) => held.has(id));
};

export type ClassicyListRangeDragOptions = {
	/** The list's root; its rows are searched under it. */
	root: HTMLElement;
	/** What matches a row: `'[role="option"]'`, `"tr[data-row-id]"`. */
	rowSelector: string;
	/** A row element's id, `null` for none. */
	rowIdOf: (row: Element) => string | null;
	/** The row pressed: moving within it calls nothing. */
	startId: string;
	/** Called with the row the pointer is over, each time it changes. */
	onRow: (id: string) => void;
};

/**
 * Follows the pointer from a press on a list's row until the button comes
 * up (a document `mouseup`) or the pointer stream is lost
 * (`onClassicyPointerStreamLost`), calling `onRow` with each new row under
 * it. Outside the list the pointer is brought to its scroll viewport's
 * nearest edge, so the row counted is the first or last one shown, and,
 * while it is above or below the viewport, the viewport scrolls toward it
 * by its scroll area's line step each animation frame (user32's list box
 * scrolls a row per timer tick there), the row at the edge counted again
 * after each step. Returns the function that stops it early (the list
 * unmounting); stopping twice is harmless.
 */
export function startClassicyListRangeDrag({
	root,
	rowSelector,
	rowIdOf,
	startId,
	onRow,
}: ClassicyListRangeDragOptions): () => void {
	let current = startId;
	let pointer: [number, number] | null = null;
	let frame: number | null = null;
	let stopped = false;

	// The registered scroll viewport the rows scroll in, if any.
	const viewportOf = () =>
		classicyScrollViewportOf(root.querySelector(rowSelector));

	const rowAt = (x: number, y: number): string | null => {
		const r = (viewportOf()?.element ?? root).getBoundingClientRect();
		const cx = Math.max(r.left, Math.min(x, r.right - 1));
		const cy = Math.max(r.top, Math.min(y, r.bottom - 1));
		const hit =
			typeof document.elementFromPoint === "function"
				? document.elementFromPoint(cx, cy)?.closest(rowSelector)
				: null;
		if (hit && root.contains(hit)) return rowIdOf(hit);
		// Under the list's header, in its empty space, or covered: the first
		// row reaching below the point, else the last.
		const rows = Array.from(root.querySelectorAll(rowSelector));
		const row =
			rows.find((el) => cy < el.getBoundingClientRect().bottom) ?? rows.at(-1);
		return row ? rowIdOf(row) : null;
	};

	// -1 above the viewport, 1 below it, 0 beside or within it.
	const outside = (y: number): -1 | 0 | 1 => {
		const viewport = viewportOf()?.element;
		if (!viewport) return 0;
		const r = viewport.getBoundingClientRect();
		if (y < r.top) return -1;
		if (y >= r.bottom) return 1;
		return 0;
	};

	const follow = () => {
		if (!pointer) return;
		const id = rowAt(pointer[0], pointer[1]);
		if (id === null || id === current) return;
		current = id;
		onRow(id);
	};

	const tick = () => {
		frame = null;
		if (!pointer) return;
		const found = viewportOf();
		const direction = outside(pointer[1]);
		if (!found || direction === 0) return;
		found.entry.scrollBy(0, direction * found.entry.lineStep());
		follow();
		frame = requestAnimationFrame(tick);
	};

	function onMove(e: MouseEvent) {
		pointer = [e.clientX, e.clientY];
		follow();
		if (frame === null && outside(e.clientY) !== 0) {
			frame = requestAnimationFrame(tick);
		}
	}

	let stopWatchingPointerStream = () => {};
	const stop = () => {
		if (stopped) return;
		stopped = true;
		document.removeEventListener("mousemove", onMove, true);
		document.removeEventListener("mouseup", stop, true);
		stopWatchingPointerStream();
		if (frame !== null) cancelAnimationFrame(frame);
		frame = null;
		pointer = null;
	};
	document.addEventListener("mousemove", onMove, true);
	document.addEventListener("mouseup", stop, true);
	stopWatchingPointerStream = onClassicyPointerStreamLost(stop);
	return stop;
}
