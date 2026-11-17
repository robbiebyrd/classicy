import {
	type CSSProperties,
	type RefObject,
	useCallback,
	useEffect,
	useLayoutEffect,
	useState,
} from "react";
import { flushSync } from "react-dom";
import {
	classicyMenuBounds,
	classicyMenuInkBox,
	classicyMenuPassesEnd,
	classicyMenuPinShift,
} from "@/SystemFolder/SystemResources/Menu/ClassicyMenuPlacement.internal";

// How far an open item's menu has been placed: `natural` where its package
// hangs it, then `flipped` when that passed the desktop's right edge, then
// `placed` once pinned.
type Phase = "closed" | "natural" | "flipped" | "placed";

type Placement = {
	phase: Phase;
	/** Fixed beside the item, when the item's own list scrolls. */
	at?: CSSProperties;
	flipLeft: boolean;
	/** Across (px, right positive), to pin it inside the desktop. */
	shift: number;
};

const CLOSED: Placement = { phase: "closed", flipLeft: false, shift: 0 };

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
 * measured, frame shadow included (`classicyMenuInkBox`), against its
 * desktop's box (`classicyMenuBounds`):
 *
 * - one that passes the right edge where its package hangs it is flipped:
 *   `flipLeft`, which the menu publishes as `classicySubMenuFlipLeft` for the
 *   stylesheets to place (a pull-down's right side under its title's right
 *   side, a submenu on its parent's left side);
 * - one that then passes an edge still is pinned inside: `style` moves its
 *   wrapper across by margins, equal and opposite, so the box moves whole
 *   whichever edge the package anchors its list to (no transform: it would
 *   become the containing block of a fixed submenu).
 *
 * All in layout effects, each placement re-rendering before paint, so no
 * frame shows a menu off the desktop. Measured each time the item opens,
 * and again when its desktop changes size while it is open. While the
 * item's own list scrolls, its menu is fixed beside the item (`style`
 * carries the place), out of the scrolling list's clip.
 */
export const useClassicySubmenuPlacement = (
	itemRef: RefObject<HTMLElement | null>,
	isOpen: boolean,
): { flipLeft: boolean; style: CSSProperties | undefined } => {
	const [placement, setPlacement] = useState<Placement>(CLOSED);

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
		setPlacement({ phase: "natural", at, flipLeft: false, shift: 0 });
	}, [itemRef]);

	useLayoutEffect(() => {
		if (isOpen) start();
		else setPlacement(CLOSED);
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
		if (!item || !ink) {
			setPlacement({ ...placement, phase: "placed" });
			return;
		}
		const bounds = classicyMenuBounds(item);
		if (placement.phase === "natural" && classicyMenuPassesEnd(ink, bounds)) {
			setPlacement({ ...placement, phase: "flipped", flipLeft: true });
			return;
		}
		setPlacement({
			...placement,
			phase: "placed",
			shift: classicyMenuPinShift(ink, bounds),
		});
	}, [placement, itemRef]);

	// The desktop resized while the menu is open: measured again from where
	// its package hangs it, synchronously, before the frame paints.
	useClassicyMenuDesktopResize(itemRef, isOpen, start);

	const style =
		placement.shift === 0
			? placement.at
			: {
					...placement.at,
					marginLeft: `${placement.shift}px`,
					marginRight: `${-placement.shift}px`,
				};
	return { flipLeft: placement.flipLeft, style };
};
