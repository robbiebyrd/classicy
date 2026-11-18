import classNames from "classnames";
import {
	type CSSProperties,
	type ReactNode,
	type RefObject,
	useCallback,
	useRef,
	useState,
} from "react";
import { useClassicyPressRepeat } from "@/SystemFolder/SystemResources/LittleArrows/useClassicyPressRepeat.internal";

type ScrollDirection = "up" | "down";

/**
 * Where an open menu list's scroll indicators go: the list's inside edges
 * (its border, padding and the first and last rows' margins, where a package
 * keeps its frame) and one row's height. Measured when the list opens, is
 * placed or changes its rows, never on a scroll.
 */
type ScrollArrowsBox = {
	left: number;
	width: number;
	top: number;
	bottom: number;
	row: number;
};

/** Which ends have items hidden past them: read on every scroll. */
type ScrollArrowsEnds = { up: boolean; down: boolean };

const px = (value: string | undefined) => Number.parseFloat(value ?? "") || 0;

/** How a list's indicators are found and stacked. */
export type ClassicyMenuScrollArrowsOptions = {
	/** A row of the list, whose height is the indicator's (and a scroll step). */
	rowSelector: string;
	/**
	 * The indicators' `z-index`: over the list in the stacking context they
	 * share with it (a pop-up's portal: 5001, over the list's 5000; a menu's
	 * wrapper: 1).
	 */
	zIndex: number;
};

/**
 * The scroll indicators of a scrolling menu list (`ClassicyPopUpMenu`,
 * `ClassicyComboBox`, a `ClassicyMenu` pull-down taller than the screen):
 * Mac OS menus scroll by an indicator at an end with items hidden past it,
 * never by a scroll bar (HIG7 p.78, "Scrolling Menus"; p.83, a pop-up menu
 * "scrolls like other menus"), and the menu scrolls a row at a time while
 * the pointer rests on one. The list hides the browser's own bar (its
 * stylesheet).
 *
 * The indicators are fixed-position siblings of the list, rendered after it
 * (`indicators`), over its first or last row: never inside it, so they
 * neither scroll nor change which rows are its first and last children.
 * They are `data-classicy-part` `menu-scroll-up` and `menu-scroll-down`
 * (`.classicyPopUpMenuScrollArrow`), `aria-hidden` (the keyboard scrolls by
 * moving the highlight), and the package draws them. The wheel over one
 * scrolls the list beneath it, by rows when the wheel counts lines.
 *
 * The caller calls `measure()` once the open list is placed and whenever
 * its rows may have changed (the box: a style and layout read), passes
 * `onListScroll` (which reads only the scroll extents) and `listStyle` (scroll
 * padding a row tall, so the keyboard's highlight stays clear of the
 * indicators) to the list, treats `contains(target)` as inside the menu, and
 * calls `reset()` when the menu closes.
 */
export const useClassicyMenuScrollArrows = (
	listRef: RefObject<HTMLElement | null>,
	{ rowSelector, zIndex }: ClassicyMenuScrollArrowsOptions,
): {
	measure: () => void;
	reset: () => void;
	contains: (target: Node) => boolean;
	onListScroll: () => void;
	listStyle: CSSProperties;
	indicators: ReactNode;
} => {
	const [box, setBox] = useState<ScrollArrowsBox | null>(null);
	const [ends, setEnds] = useState<ScrollArrowsEnds>({
		up: false,
		down: false,
	});
	const upRef = useRef<HTMLDivElement>(null);
	const downRef = useRef<HTMLDivElement>(null);
	const repeat = useClassicyPressRepeat();

	// The ends, from the scroll extents alone (no style or layout read).
	const readEnds = useCallback(() => {
		const el = listRef.current;
		if (!el) return;
		const max = el.scrollHeight - el.clientHeight;
		const up = el.scrollTop >= 1;
		const down = max - el.scrollTop >= 1;
		setEnds((prev) =>
			prev.up === up && prev.down === down ? prev : { up, down },
		);
	}, [listRef]);

	const measure = useCallback(() => {
		const el = listRef.current;
		if (!el) return;
		const rect = el.getBoundingClientRect();
		const style = getComputedStyle(el);
		const rows = el.children;
		const first = rows[0];
		const last = rows[rows.length - 1];
		const firstStyle = first ? getComputedStyle(first) : undefined;
		const lastStyle = last ? getComputedStyle(last) : undefined;
		const insetLeft =
			el.clientLeft + px(style.paddingLeft) + px(firstStyle?.marginLeft);
		const insetRight = px(style.paddingRight) + px(firstStyle?.marginRight);
		const inside = rect.top + el.clientTop;
		const next: ScrollArrowsBox = {
			left: rect.left + insetLeft,
			width: Math.max(
				el.clientWidth + el.clientLeft - insetLeft - insetRight,
				0,
			),
			top: inside + px(style.paddingTop) + px(firstStyle?.marginTop),
			bottom:
				inside +
				el.clientHeight -
				px(style.paddingBottom) -
				px(lastStyle?.marginBottom),
			row: el.querySelector<HTMLElement>(rowSelector)?.offsetHeight ?? 0,
		};
		setBox((prev) =>
			prev &&
			(Object.keys(next) as (keyof ScrollArrowsBox)[]).every(
				(key) => prev[key] === next[key],
			)
				? prev
				: next,
		);
		readEnds();
	}, [listRef, rowSelector, readEnds]);

	const reset = useCallback(() => {
		repeat.stop();
		setBox(null);
		setEnds({ up: false, down: false });
	}, [repeat]);

	const contains = useCallback(
		(target: Node) =>
			Boolean(
				upRef.current?.contains(target) || downRef.current?.contains(target),
			),
		[],
	);

	// While the pointer rests on an indicator the list scrolls a row at a
	// time toward it, until the pointer leaves, the pointer stream is lost or
	// that end is reached (HIG7 p.78: "When the user drags past the last
	// visible item, the menu scrolls").
	const startScroll = (direction: ScrollDirection) => {
		const row = box?.row ?? 0;
		repeat.start(() => {
			const el = listRef.current;
			if (!el || row <= 0) return false;
			const before = el.scrollTop;
			el.scrollTop = before + (direction === "down" ? row : -row);
			readEnds();
			return el.scrollTop === before ? false : undefined;
		});
	};

	// The wheel over an indicator scrolls the list beneath it: by pixels,
	// rows (a wheel that counts lines) or pages.
	const onWheel = (e: { deltaY: number; deltaMode: number }) => {
		const el = listRef.current;
		if (!el) return;
		const unit =
			e.deltaMode === 1
				? box?.row || 1
				: e.deltaMode === 2
					? el.clientHeight
					: 1;
		el.scrollTop += e.deltaY * unit;
		readEnds();
	};

	const indicators =
		box &&
		(["up", "down"] as const).map(
			(direction) =>
				ends[direction] && (
					<div
						key={direction}
						ref={direction === "up" ? upRef : downRef}
						className={classNames(
							"classicyPopUpMenuScrollArrow",
							direction === "up"
								? "classicyPopUpMenuScrollArrowUp"
								: "classicyPopUpMenuScrollArrowDown",
						)}
						data-classicy-part={`menu-scroll-${direction}`}
						aria-hidden="true"
						style={{
							position: "fixed",
							left: `${box.left}px`,
							width: `${box.width}px`,
							height: `${box.row}px`,
							top: `${direction === "up" ? box.top : box.bottom - box.row}px`,
							zIndex,
						}}
						// A press keeps focus where it is (a combo box's field).
						onMouseDown={(e) => e.preventDefault()}
						onMouseEnter={() => startScroll(direction)}
						onMouseLeave={() => repeat.stop()}
						onWheel={onWheel}
					/>
				),
		);

	return {
		measure,
		reset,
		contains,
		onListScroll: readEnds,
		listStyle: box?.row
			? {
					scrollPaddingTop: `${box.row}px`,
					scrollPaddingBottom: `${box.row}px`,
				}
			: {},
		indicators,
	};
};
