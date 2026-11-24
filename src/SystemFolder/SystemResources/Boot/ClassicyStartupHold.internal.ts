import { useSyncExternalStore } from "react";

// Whether a startup screen of Classicy's own covers the desktop: the
// default startup screen, or the power-on overlay before it. The
// Notification Manager waits for it (Inside Macintosh: Processes, p. 5-10:
// "The system notifies the user after the startup process completes").
let holds = 0;
const listeners = new Set<() => void>();

const publish = () => {
	for (const listener of listeners) listener();
};

/**
 * Mark a startup screen as showing; returns the function that marks it
 * gone (call it once, from the effect's cleanup).
 */
export function holdClassicyStartup(): () => void {
	holds += 1;
	publish();
	let released = false;
	return () => {
		if (released) return;
		released = true;
		holds -= 1;
		publish();
	};
}

const subscribe = (listener: () => void) => {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
};

const isShowing = () => holds > 0;

/** Whether a startup screen of Classicy's own is showing; re-renders on change. */
export const useClassicyStartupShowing = (): boolean =>
	useSyncExternalStore(subscribe, isShowing, () => false);
