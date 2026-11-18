import { useCallback, useEffect, useMemo, useRef } from "react";
import { onClassicyPointerStreamLost } from "@/SystemFolder/SystemResources/File/ClassicyPointerStreamLost.internal";

/** Delay between repeats while a control is held, in ms. */
export const CLASSICY_PRESS_REPEAT_INTERVAL_MS = 120;

/**
 * One step of a held control. Called once at the press (`heldMs` 0) and then
 * every interval while held, with the time since the press. Returning
 * `false` ends the repeat (a scroll bar's track stops paging once the thumb
 * reaches the pointer).
 */
export type ClassicyPressRepeatStep = (heldMs: number) => boolean | undefined;

/**
 * The press-and-hold repeat of the little arrows (HIGOS8 Ch.2 "Little
 * Arrows", p.35) and of the scroll bars' arrows and track: `start(step)`
 * steps at once and then every `intervalMs` until `stop()`, the step
 * returning `false`, a new `start`, the pointer stream being lost (the
 * window blurs, a `pointercancel`, the page is hidden: the release that
 * would stop it may never come; `onClassicyPointerStreamLost`) or unmount.
 * `onStop` runs once whenever a repeat ends.
 */
export function useClassicyPressRepeat(
	intervalMs: number = CLASSICY_PRESS_REPEAT_INTERVAL_MS,
): {
	start: (step: ClassicyPressRepeatStep, onStop?: () => void) => void;
	stop: () => void;
} {
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const stopWatchingRef = useRef<(() => void) | null>(null);
	const onStopRef = useRef<(() => void) | null>(null);

	const stop = useCallback(() => {
		stopWatchingRef.current?.();
		stopWatchingRef.current = null;
		if (intervalRef.current !== null) {
			clearInterval(intervalRef.current);
			intervalRef.current = null;
		}
		const onStop = onStopRef.current;
		onStopRef.current = null;
		onStop?.();
	}, []);

	useEffect(() => stop, [stop]);

	const start = useCallback(
		(step: ClassicyPressRepeatStep, onStop?: () => void) => {
			stop();
			if (step(0) === false) {
				onStop?.();
				return;
			}
			onStopRef.current = onStop ?? null;
			const pressedAt = Date.now();
			intervalRef.current = setInterval(() => {
				if (step(Date.now() - pressedAt) === false) stop();
			}, intervalMs);
			stopWatchingRef.current = onClassicyPointerStreamLost(stop);
		},
		[intervalMs, stop],
	);

	return useMemo(() => ({ start, stop }), [start, stop]);
}
