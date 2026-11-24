/**
 * A long table drawn a window at a time (`ClassicyTable`'s `windowed`, story
 * 0227-815 fix round 1): only the rows in its scroll viewport are rendered,
 * a few more either side, and two spacer rows hold the height of the rest,
 * so the list scrolls as if every row were there. Rows must share one
 * height, measured from the first row drawn.
 *
 * Until the viewport and a row can be measured (the first render, a layout
 * engine without boxes), the first `CLASSICY_TABLE_WINDOW_FIRST_ROWS` rows are
 * drawn.
 */
import {
	type RefObject,
	useCallback,
	useLayoutEffect,
	useRef,
	useState,
} from "react";

/** Rows drawn before the list can be measured. */
export const CLASSICY_TABLE_WINDOW_FIRST_ROWS = 60;
/** Rows drawn beyond each edge of the viewport. */
export const CLASSICY_TABLE_WINDOW_OVERSCAN = 10;

export type ClassicyTableWindow = {
	/** The first row drawn (an index in the visual order). */
	start: number;
	/** One past the last row drawn. */
	end: number;
	/** The height the spacer before the rows holds, in px. */
	before: number;
	/** The height the spacer after the rows holds, in px. */
	after: number;
	/** Call from the viewport's scroll event. */
	onScroll: () => void;
	/** Scroll the viewport the least needed to show the row at `index`. */
	reveal: (index: number) => void;
};

type Measure = { rowHeight: number; rowsTop: number; viewHeight: number };

/** The window of rows `[start, end)` that a viewport showing `measure` needs. */
export const classicyTableWindowRange = (
	rowCount: number,
	scrollTop: number,
	measure: Measure | undefined,
): [number, number] => {
	if (
		!measure ||
		measure.rowHeight <= 0 ||
		measure.viewHeight <= 0 ||
		!Number.isFinite(scrollTop)
	) {
		return [0, Math.min(rowCount, CLASSICY_TABLE_WINDOW_FIRST_ROWS)];
	}
	const first = Math.floor(
		Math.max(0, scrollTop - measure.rowsTop) / measure.rowHeight,
	);
	const shown = Math.ceil(measure.viewHeight / measure.rowHeight) + 1;
	const start = Math.max(
		0,
		Math.min(first, rowCount) - CLASSICY_TABLE_WINDOW_OVERSCAN,
	);
	const end = Math.min(
		rowCount,
		first + shown + CLASSICY_TABLE_WINDOW_OVERSCAN,
	);
	return [start, Math.max(start, end)];
};

/**
 * The window of `rowCount` rows that the scroll viewport `viewportRef`
 * shows; `bodyRef` is the table's `<tbody>`. Off (`enabled` false), every
 * row is drawn.
 */
export function useClassicyTableWindow(
	enabled: boolean,
	rowCount: number,
	viewportRef: RefObject<HTMLElement | null>,
	bodyRef: RefObject<HTMLTableSectionElement | null>,
): ClassicyTableWindow | undefined {
	const measureRef = useRef<Measure | undefined>(undefined);
	const [range, setRange] = useState<[number, number]>(() => [
		0,
		Math.min(rowCount, CLASSICY_TABLE_WINDOW_FIRST_ROWS),
	]);
	const frameRef = useRef<number | undefined>(undefined);

	/** Read the row height, where rows start and the viewport's height. */
	const measure = useCallback((): Measure | undefined => {
		const viewport = viewportRef.current;
		const body = bodyRef.current;
		if (!viewport || !body) return undefined;
		const row = body.querySelector<HTMLElement>(":scope > tr[data-row-id]");
		const rowHeight = row?.getBoundingClientRect().height ?? 0;
		const viewHeight = viewport.clientHeight;
		if (rowHeight <= 0 || viewHeight <= 0) return measureRef.current;
		const rowsTop =
			body.getBoundingClientRect().top -
			viewport.getBoundingClientRect().top +
			viewport.scrollTop;
		const next = { rowHeight, rowsTop, viewHeight };
		measureRef.current = next;
		return next;
	}, [viewportRef, bodyRef]);

	const update = useCallback(() => {
		if (!enabled) return;
		const next = classicyTableWindowRange(
			rowCount,
			viewportRef.current?.scrollTop ?? 0,
			measure(),
		);
		setRange((prev) =>
			prev[0] === next[0] && prev[1] === next[1] ? prev : next,
		);
	}, [enabled, rowCount, viewportRef, measure]);

	// After each commit (new rows, a new sort, the first draw): measure again.
	useLayoutEffect(() => {
		update();
	});

	// A viewport resized (the window grown or shrunk) shows more or fewer rows.
	useLayoutEffect(() => {
		const viewport = viewportRef.current;
		if (!enabled || !viewport || typeof ResizeObserver === "undefined") {
			return;
		}
		const observer = new ResizeObserver(() => update());
		observer.observe(viewport);
		return () => observer.disconnect();
	}, [enabled, viewportRef, update]);

	useLayoutEffect(
		() => () => {
			if (frameRef.current !== undefined) {
				cancelAnimationFrame(frameRef.current);
			}
		},
		[],
	);

	const onScroll = useCallback(() => {
		if (!enabled || frameRef.current !== undefined) return;
		frameRef.current = requestAnimationFrame(() => {
			frameRef.current = undefined;
			update();
		});
	}, [enabled, update]);

	const reveal = useCallback(
		(index: number) => {
			const viewport = viewportRef.current;
			const m = measure();
			if (!viewport || !m) return;
			const top = m.rowsTop + index * m.rowHeight;
			const bottom = top + m.rowHeight;
			// Under a sticky header, the rows start below it.
			const visibleTop = viewport.scrollTop + m.rowsTop;
			if (top < visibleTop) viewport.scrollTop = top - m.rowsTop;
			else if (bottom > viewport.scrollTop + m.viewHeight) {
				viewport.scrollTop = bottom - m.viewHeight;
			}
			update();
		},
		[viewportRef, measure, update],
	);

	if (!enabled) return undefined;
	const start = Math.min(range[0], rowCount);
	const end = Math.min(Math.max(range[1], start), rowCount);
	const rowHeight = measureRef.current?.rowHeight ?? 0;
	return {
		start,
		end,
		before: start * rowHeight,
		after: (rowCount - end) * rowHeight,
		onScroll,
		reveal,
	};
}
