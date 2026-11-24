import { useEffect, useSyncExternalStore } from "react";

// Whether a boot screen covers the desktop: the pre-boot (power-on) screen
// and the startup screen while they show, and a host's own `bootScreen` that
// says so. Things that must not happen unseen behind it wait for it: the
// desktop holds a theme link's alerts (ClassicyThemeLinkImport.internal.tsx)
// until the boot is over, since an alert under the boot screen would take
// keystrokes the user meant for the boot screen.
//
// A count, not a flag: the pre-boot screen hands over to the startup screen
// in one commit, and a page may hold several desktops.

let active = 0;
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
};

const snapshot = () => active > 0;

const change = (delta: number) => {
	active += delta;
	for (const listener of listeners) listener();
};

/**
 * Marks the calling boot screen as covering the desktop while `covering` is
 * true and it is mounted. `ClassicyBootSequence` and `ClassicyStartupScreen`
 * call it; a host's own `bootScreen` (`ClassicyDesktop`'s prop) should too,
 * with its own visibility, or the desktop cannot tell when it ends and
 * shows what it holds (a theme link's alerts) at once.
 */
export const useClassicyBootScreenActive = (covering: boolean): void => {
	useEffect(() => {
		if (!covering) return;
		change(1);
		return () => change(-1);
	}, [covering]);
};

/** True while a boot screen covers the desktop (`useClassicyBootScreenActive`). */
export const useClassicyBooting = (): boolean =>
	useSyncExternalStore(subscribe, snapshot, () => false);
