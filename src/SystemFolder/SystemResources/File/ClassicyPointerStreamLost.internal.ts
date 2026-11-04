/**
 * A gesture that follows the pointer with document-level listeners (a file
 * drag, a window move or resize, a split view's divider, the Control Strip's
 * tab) waits for a release that may never come: the window loses focus
 * (Alt-Tab, a system dialog mid-drag), the browser takes the pointer over
 * (`pointercancel`: a touch scroll, an OS gesture), or the page is hidden.
 * Left live, the gesture follows the pointer on return with no button held,
 * or a later release lands it in the wrong place. These end it instead.
 *
 * What "end" means is the gesture's own call, made in its `onLost`: a file
 * drag ends as canceled (as Escape ends it), while a window, divider or strip
 * ends where it is, as a release there would.
 */

import { useCallback, useEffect, useMemo, useRef } from "react";

/**
 * Calls `onLost` whenever the pointer stream is lost: the window blurs, the
 * document sees a `pointercancel` (in the capture phase, so an element that
 * stops it cannot hide it), or the page becomes hidden. Returns the function
 * that stops watching; a gesture calls it however it ends, released or lost,
 * so no listener outlives it. A single loss can fire more than one of these
 * (hiding a tab also blurs the window), so `onLost` must be idempotent, or
 * stop watching when it runs.
 */
export function onClassicyPointerStreamLost(onLost: () => void): () => void {
	if (typeof window === "undefined" || typeof document === "undefined") {
		return () => {};
	}
	const lost = () => onLost();
	const onVisibilityChange = () => {
		if (document.visibilityState === "hidden") onLost();
	};
	window.addEventListener("blur", lost);
	document.addEventListener("pointercancel", lost, true);
	document.addEventListener("visibilitychange", onVisibilityChange);
	return () => {
		window.removeEventListener("blur", lost);
		document.removeEventListener("pointercancel", lost, true);
		document.removeEventListener("visibilitychange", onVisibilityChange);
	};
}

/**
 * `onClassicyPointerStreamLost` for a gesture held in React state: watches
 * while `active` is true, and stops when it turns false or the component
 * unmounts. `onLost` is read when the loss happens, so it may close over the
 * render's state without re-subscribing.
 */
export function useClassicyPointerStreamLost(
	active: boolean,
	onLost: () => void,
): void {
	const onLostRef = useRef(onLost);
	onLostRef.current = onLost;
	useEffect(() => {
		if (!active) return;
		return onClassicyPointerStreamLost(() => onLostRef.current());
	}, [active]);
}

/** What `useClassicyPointerPress` watches a press with. */
export type ClassicyPointerPressWatch = {
	/**
	 * Whether a mouseup on `target` is a release over the control: the
	 * element (or elements) whose own mouseup handler would hear it.
	 */
	isOver: (target: EventTarget | null) => boolean;
	/**
	 * The press ended at a mouseup: over the control (`canceled` false) or
	 * anywhere else (`canceled` true: dragged off, let go over a menu item).
	 */
	onRelease: (canceled: boolean) => void;
	/** The pointer stream was lost before any mouseup. */
	onLost: () => void;
};

/**
 * Watches a press on a control (its mousedown) until the press ends, so a
 * package `press` meets exactly one end: the next mouseup anywhere calls
 * `onRelease` (heard in the capture phase, so a target that stops it cannot
 * hide it, and before any of that mouseup's own handlers run), and the
 * pointer stream being lost calls `onLost`; whichever comes first, once.
 * `watchPress` starts watching a press; a new press replaces the one before,
 * and unmounting stops watching. `releasedOver(event)` is true when `event`
 * already reported a press's release over the control, so the control's own
 * mouseup handler reports only a release with no press of its own behind it
 * (one pressed elsewhere and let go here).
 */
export function useClassicyPointerPress(): {
	watchPress: (watch: ClassicyPointerPressWatch) => void;
	releasedOver: (event: Event) => boolean;
} {
	const stopRef = useRef<(() => void) | null>(null);
	const releasedOverRef = useRef<Event | null>(null);
	useEffect(() => () => stopRef.current?.(), []);
	const watchPress = useCallback(
		({ isOver, onRelease, onLost }: ClassicyPointerPressWatch) => {
			stopRef.current?.();
			const stop = () => {
				stopWatchingPointerStream();
				document.removeEventListener("mouseup", onUp, true);
				if (stopRef.current === stop) stopRef.current = null;
			};
			const onUp = (e: MouseEvent) => {
				stop();
				const canceled = !isOver(e.target);
				if (!canceled) releasedOverRef.current = e;
				onRelease(canceled);
			};
			const stopWatchingPointerStream = onClassicyPointerStreamLost(() => {
				stop();
				onLost();
			});
			document.addEventListener("mouseup", onUp, true);
			stopRef.current = stop;
		},
		[],
	);
	const releasedOver = useCallback(
		(event: Event) => releasedOverRef.current === event,
		[],
	);
	return useMemo(
		() => ({ watchPress, releasedOver }),
		[watchPress, releasedOver],
	);
}
