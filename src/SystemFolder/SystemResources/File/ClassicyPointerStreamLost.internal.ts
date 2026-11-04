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

import { type RefObject, useCallback, useEffect, useMemo, useRef } from "react";

/**
 * Calls `onLost` whenever the window's focus is lost: the window blurs, or
 * the page becomes hidden. Returns the function that stops watching. Both
 * can fire for a single loss (hiding a tab also blurs the window), so
 * `onLost` must be idempotent, or stop watching when it runs. A keyboard
 * press ends on these alone; a pointer gesture adds `pointercancel`
 * (`onClassicyPointerStreamLost`).
 */
export function onClassicyWindowFocusLost(onLost: () => void): () => void {
	if (typeof window === "undefined" || typeof document === "undefined") {
		return () => {};
	}
	const lost = () => onLost();
	const onVisibilityChange = () => {
		if (document.visibilityState === "hidden") onLost();
	};
	window.addEventListener("blur", lost);
	document.addEventListener("visibilitychange", onVisibilityChange);
	return () => {
		window.removeEventListener("blur", lost);
		document.removeEventListener("visibilitychange", onVisibilityChange);
	};
}

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
	const stopWatchingFocus = onClassicyWindowFocusLost(onLost);
	document.addEventListener("pointercancel", lost, true);
	return () => {
		stopWatchingFocus();
		document.removeEventListener("pointercancel", lost, true);
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

/**
 * Watches a control's keyboard presses (Return or Space held on it) until
 * each ends, so a package `press` from the keyboard meets exactly one end
 * too. The control calls `watchKeyPress(key, onCancel)` at the key's
 * keydown and `releaseKey(event)` at every keyup. A press normally ends at
 * its keyup, where `releaseKey` returns true and the control reports its
 * release as it always has (a keyup with no press behind it returns true as
 * well). A press whose keyup has not come ends early instead, in
 * `onCancel(lost)`, once:
 *
 * - `lost` true: the window lost focus or the page was hidden (the
 *   control's own blur counts when it stays the document's active element,
 *   which is how a browser blurs it as the window loses focus). The keyup
 *   goes to another window, or comes back late.
 * - `lost` false: focus moved off the control (a script focused something
 *   else, or blurred it). Nothing is lost, as with a mouse press let go
 *   elsewhere: the keyup will come, but to another element.
 *
 * Either way the press is canceled: its key's keyup, if it still reaches
 * the control (the key held through a return, or focus coming back), is
 * prevented, so the browser does not turn it into a click, and `releaseKey`
 * returns false so the control reports nothing. Every key held is its own
 * press. Unmounting stops watching, reporting nothing.
 */
export function useClassicyKeyPress(
	elementRef: RefObject<HTMLElement | null>,
): {
	watchKeyPress: (key: string, onCancel: (lost: boolean) => void) => void;
	releaseKey: (event: { key: string; preventDefault: () => void }) => boolean;
} {
	// The presses under way, by key, and the keys whose press ended early.
	const pressesRef = useRef(new Map<string, (lost: boolean) => void>());
	const canceledRef = useRef(new Set<string>());
	const stopRef = useRef<(() => void) | null>(null);
	const stop = useCallback(() => {
		stopRef.current?.();
		stopRef.current = null;
	}, []);
	useEffect(
		() => () => {
			stop();
			pressesRef.current.clear();
		},
		[stop],
	);
	const cancelPresses = useCallback(
		(lost: boolean) => {
			stop();
			const presses = [...pressesRef.current];
			pressesRef.current.clear();
			for (const [key, onCancel] of presses) {
				canceledRef.current.add(key);
				onCancel(lost);
			}
		},
		[stop],
	);
	const watchKeyPress = useCallback(
		(key: string, onCancel: (lost: boolean) => void) => {
			canceledRef.current.delete(key);
			pressesRef.current.set(key, onCancel);
			if (stopRef.current) return;
			const element = elementRef.current;
			const onBlur = () => cancelPresses(document.activeElement === element);
			const stopWatchingFocus = onClassicyWindowFocusLost(() =>
				cancelPresses(true),
			);
			element?.addEventListener("blur", onBlur);
			stopRef.current = () => {
				stopWatchingFocus();
				element?.removeEventListener("blur", onBlur);
			};
		},
		[elementRef, cancelPresses],
	);
	const releaseKey = useCallback(
		(event: { key: string; preventDefault: () => void }) => {
			if (canceledRef.current.delete(event.key)) {
				event.preventDefault();
				return false;
			}
			pressesRef.current.delete(event.key);
			if (pressesRef.current.size === 0) stop();
			return true;
		},
		[stop],
	);
	return useMemo(
		() => ({ watchKeyPress, releaseKey }),
		[watchKeyPress, releaseKey],
	);
}
