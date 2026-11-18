import {
	type CSSProperties,
	createContext,
	type RefObject,
	useCallback,
	useContext,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { flushSync } from "react-dom";
import {
	type ClassicyMenuBox,
	classicyMenuBounds,
	classicyMenuInkBox,
	classicyMenuPassesEnd,
	classicyMenuPinShift,
	classicyMenuPinShiftDown,
} from "@/SystemFolder/SystemResources/Menu/ClassicyMenuPlacement.internal";

// How far an open item's menu has been placed: `natural` where its package
// hangs it, then `flipped` when that passed the bounds' right edge, then
// `placed` once pinned.
type Phase = "closed" | "natural" | "flipped" | "placed";

type Placement = {
	phase: Phase;
	/** Fixed beside the item, when the item's own list scrolls. */
	at?: CSSProperties;
	flipLeft: boolean;
	/** Across (px, right positive), to pin it inside the bounds. */
	shift: number;
	/** Down (px, down positive), to pin it inside the bounds. */
	shiftDown: number;
	/**
	 * Where it lay on its natural side, kept while it is tried flipped: how
	 * far it passed the bounds there and the pin that side would take.
	 */
	natural?: { overflow: number; shift: number; shiftDown: number };
	/** How many times it has been placed: its submenus' cue to follow. */
	placed: number;
};

const CLOSED: Placement = {
	phase: "closed",
	flipLeft: false,
	shift: 0,
	shiftDown: 0,
	placed: 0,
};

/**
 * Bumped each time the menu an item sits in is placed (its parent item's,
 * or a contextual menu's root); null outside any placed menu (a menu bar's
 * titles). An open item in a placed menu measures its own menu again when
 * it changes, so a submenu is always measured after its parent has moved,
 * and only the outermost open menu watches the desktop's size.
 */
export const ClassicyMenuPlacementEpoch = createContext<number | null>(null);

/** How far `ink` passes `bounds` across, on either side. */
const overflowAcross = (ink: ClassicyMenuBox, bounds: ClassicyMenuBox) =>
	Math.max(bounds.left - ink.left, 0) + Math.max(ink.right - bounds.right, 0);

const sizeOf = (el: Element) => {
	const r = el.getBoundingClientRect();
	return `${r.width}x${r.height}`;
};

/**
 * Calls `onResize` inside `flushSync` whenever the desktop around `ref`
 * (`.classicyDesktop`, else the page's root) changes size while `active`:
 * an open menu placed against the desktop's box is measured again, and
 * re-placed before the frame paints. Nothing where `ResizeObserver` is
 * missing.
 */
export const useClassicyMenuDesktopResize = (
	ref: RefObject<Element | null>,
	active: boolean,
	onResize: () => void,
) => {
	useEffect(() => {
		if (!active || typeof ResizeObserver === "undefined") return;
		const target =
			ref.current?.closest(".classicyDesktop") ?? document.documentElement;
		let last = sizeOf(target);
		const observer = new ResizeObserver(() => {
			const size = sizeOf(target);
			if (size === last) return;
			last = size;
			flushSync(onResize);
		});
		observer.observe(target);
		return () => observer.disconnect();
	}, [active, onResize, ref]);
};

/**
 * Where an open menu item's menu goes: a menu bar title's pull-down (the
 * screen bar's, a window's own bar's) or a submenu beside its item. Each is
 * measured, frame shadow included (`classicyMenuInkBox`), against the
 * bounds (`classicyMenuBounds`: what shows of the desktop, on both axes):
 *
 * - one that passes the right edge where its package hangs it is flipped:
 *   `flipLeft`, which the menu publishes as `classicySubMenuFlipLeft` for the
 *   stylesheets to place (a pull-down's right side under its title's right
 *   side, a submenu on its parent's left side);
 * - a submenu that passes an edge on both sides goes back to the side it
 *   passes by less (a pull-down stays flipped, as the Menu Manager hangs it);
 * - one that then passes an edge still is pinned inside, across and down:
 *   `style` moves its wrapper by margins, equal and opposite, so the box
 *   moves whole whichever edge the package anchors its list to (no
 *   transform: it would become the containing block of a fixed submenu).
 *   Down, a pull-down's scroll cap (ClassicyMenu) already ends it at the
 *   bounds' bottom; one whose cap's floor still passes it moves up.
 *
 * All in layout effects, each placement re-rendering before paint, so no
 * frame shows a menu off the desktop. Measured each time the item opens;
 * for the outermost open menu, again when its desktop changes size while it
 * is open; for a submenu, again each time the menu it sits in is placed
 * (`epoch`, which the item provides to its submenu's items through
 * `ClassicyMenuPlacementEpoch`). While the item's own list scrolls, its
 * menu is fixed beside the item (`style` carries the place), out of the
 * scrolling list's clip.
 */
export const useClassicySubmenuPlacement = (
	itemRef: RefObject<HTMLElement | null>,
	isOpen: boolean,
): {
	flipLeft: boolean;
	style: CSSProperties | undefined;
	epoch: number;
} => {
	const [placement, setPlacement] = useState<Placement>(CLOSED);
	const parentEpoch = useContext(ClassicyMenuPlacementEpoch);

	// Back to where the package hangs it, to be measured again.
	const start = useCallback(() => {
		const item = itemRef.current;
		let at: CSSProperties | undefined;
		if (item?.closest("ul")?.classList.contains("classicyMenuListScrolls")) {
			const r = item.getBoundingClientRect();
			at = {
				position: "fixed",
				top: `${r.top}px`,
				left: `${r.left}px`,
				width: `${r.width}px`,
				height: 0,
			};
		}
		setPlacement((prev) => ({
			phase: "natural",
			at,
			flipLeft: false,
			shift: 0,
			shiftDown: 0,
			placed: prev.placed,
		}));
	}, [itemRef]);

	useLayoutEffect(() => {
		if (isOpen) start();
		else
			setPlacement((prev) =>
				prev.phase === "closed" ? prev : { ...CLOSED, placed: prev.placed },
			);
	}, [isOpen, start]);

	// After the menu's own layout effects (child first): its scroll cap and
	// its wrapper's pixel-grid nudge are in place when it is measured.
	useLayoutEffect(() => {
		if (placement.phase !== "natural" && placement.phase !== "flipped") return;
		const item = itemRef.current;
		const wrapper = item?.querySelector<HTMLElement>(
			":scope > .classicyMenuWrapper",
		);
		const ink = classicyMenuInkBox(
			wrapper?.querySelector(":scope > ul"),
			// A scrolling list's frame shadow is drawn on this sibling.
			wrapper?.querySelector(":scope > .classicyMenuScrollShadow"),
		);
		const placed = (next: Partial<Placement>) =>
			setPlacement({
				...placement,
				...next,
				phase: "placed",
				natural: undefined,
				placed: placement.placed + 1,
			});
		if (!item || !ink) {
			placed({});
			return;
		}
		const bounds = classicyMenuBounds(item);
		const shift = classicyMenuPinShift(ink, bounds);
		const shiftDown = classicyMenuPinShiftDown(ink, bounds);
		if (placement.phase === "natural") {
			if (classicyMenuPassesEnd(ink, bounds)) {
				setPlacement({
					...placement,
					phase: "flipped",
					flipLeft: true,
					natural: { overflow: overflowAcross(ink, bounds), shift, shiftDown },
				});
				return;
			}
			placed({ shift, shiftDown });
			return;
		}
		// Flipped. A submenu that passes the bounds by more on this side than
		// on its natural one goes back there, pinned from that side. A
		// pull-down keeps the Menu Manager's hang: flipped, then pinned.
		const pullDown = item
			.closest("ul")
			?.classList.contains("classicyDesktopMenu");
		const natural = placement.natural;
		if (
			!pullDown &&
			natural &&
			overflowAcross(ink, bounds) > natural.overflow
		) {
			placed({
				flipLeft: false,
				shift: natural.shift,
				shiftDown: natural.shiftDown,
			});
			return;
		}
		placed({ shift, shiftDown });
	}, [placement, itemRef]);

	// The menu this item sits in was placed again (its parent moved): this
	// one, open, is measured again beside it. Not on its first render.
	const seenParentEpoch = useRef(parentEpoch);
	useLayoutEffect(() => {
		if (seenParentEpoch.current === parentEpoch) return;
		seenParentEpoch.current = parentEpoch;
		if (isOpen) start();
	}, [parentEpoch, isOpen, start]);

	// The desktop resized while the menu is open: the outermost open menu
	// is measured again from where its package hangs it, synchronously,
	// before the frame paints; its submenus follow it (above).
	useClassicyMenuDesktopResize(itemRef, isOpen && parentEpoch === null, start);

	const margins: CSSProperties = {
		...(placement.shift === 0
			? {}
			: {
					marginLeft: `${placement.shift}px`,
					marginRight: `${-placement.shift}px`,
				}),
		...(placement.shiftDown === 0
			? {}
			: {
					marginTop: `${placement.shiftDown}px`,
					marginBottom: `${-placement.shiftDown}px`,
				}),
	};
	const style =
		placement.shift === 0 && placement.shiftDown === 0
			? placement.at
			: { ...placement.at, ...margins };
	return { flipLeft: placement.flipLeft, style, epoch: placement.placed };
};
