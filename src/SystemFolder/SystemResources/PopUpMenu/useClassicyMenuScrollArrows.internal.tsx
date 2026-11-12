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
 * keeps its frame), one row tall, and which ends have items hidden past them.
 */
type ScrollArrows = {
	left: number;
	width: number;
	top: number;
	bottom: number;
	row: number;
	up: boolean;
	down: boolean;
};

const px = (value: string | undefined) => Number.parseFloat(value ?? "") || 0;

/**
 * The scroll indicators of a scrolling menu list (`ClassicyPopUpMenu`,
 * `ClassicyComboBox`): Mac OS menus scroll by an indicator at an end with
 * items hidden past it, never by a scroll bar (HIG7 p.78, "Scrolling
 * Menus"; p.83, a pop-up menu "scrolls like other menus"), and the menu
 * scrolls a row at a time while the pointer rests on one. The list hides
 * the browser's own bar (base stylesheet).
 *
 * The indicators are fixed-position siblings of the list, rendered in its
 * portal after it (`indicators`), over its first or last row: never inside
 * it, so they neither scroll nor change which rows are its first and last
 * children. They are `data-classicy-part` `menu-scroll-up` and
 * `menu-scroll-down` (`.classicyPopUpMenuScrollArrow`), `aria-hidden`
 * (the keyboard scrolls by moving the highlight), and the package draws
 * them. The wheel over one scrolls the list beneath it.
 *
 * The caller calls `measure()` once the open list is placed (and whenever
 * its rows may have changed), passes `onListScroll` and `listStyle` to the
 * list (scroll padding a row tall, so the keyboard's highlight stays clear
 * of the indicators), treats `contains(target)` as inside the menu, and
 * calls `reset()` when the menu closes.
 */
export const useClassicyMenuScrollArrows = (
	listRef: RefObject<HTMLElement | null>,
): {
	measure: () => void;
	reset: () => void;
	contains: (target: Node) => boolean;
	onListScroll: () => void;
	listStyle: CSSProperties;
	indicators: ReactNode;
} => {
	const [arrows, setArrows] = useState<ScrollArrows | null>(null);
	const upRef = useRef<HTMLDivElement>(null);
	const downRef = useRef<HTMLDivElement>(null);
	const repeat = useClassicyPressRepeat();

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
		const max = el.scrollHeight - el.clientHeight;
		const next: ScrollArrows = {
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
			row: el.querySelector<HTMLElement>('[role="option"]')?.offsetHeight ?? 0,
			up: el.scrollTop >= 1,
			down: max - el.scrollTop >= 1,
		};
		setArrows((prev) =>
			prev &&
			(Object.keys(next) as (keyof ScrollArrows)[]).every(
				(key) => prev[key] === next[key],
			)
				? prev
				: next,
		);
	}, [listRef]);

	const reset = useCallback(() => {
		repeat.stop();
		setArrows(null);
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
		const row = arrows?.row ?? 0;
		repeat.start(() => {
			const el = listRef.current;
			if (!el || row <= 0) return false;
			const before = el.scrollTop;
			el.scrollTop = before + (direction === "down" ? row : -row);
			measure();
			return el.scrollTop === before ? false : undefined;
		});
	};

	const indicators =
		arrows &&
		(["up", "down"] as const).map(
			(direction) =>
				arrows[direction] && (
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
							left: `${arrows.left}px`,
							width: `${arrows.width}px`,
							height: `${arrows.row}px`,
							top: `${direction === "up" ? arrows.top : arrows.bottom - arrows.row}px`,
							// Over the list (5000), as a menu's own row.
							zIndex: 5001,
						}}
						// A press keeps focus where it is (a combo box's field).
						onMouseDown={(e) => e.preventDefault()}
						onMouseEnter={() => startScroll(direction)}
						onMouseLeave={() => repeat.stop()}
						onWheel={(e) => {
							const el = listRef.current;
							if (!el) return;
							el.scrollTop += e.deltaY;
							measure();
						}}
					/>
				),
		);

	return {
		measure,
		reset,
		contains,
		onListScroll: measure,
		listStyle: arrows?.row
			? {
					scrollPaddingTop: `${arrows.row}px`,
					scrollPaddingBottom: `${arrows.row}px`,
				}
			: {},
		indicators,
	};
};
