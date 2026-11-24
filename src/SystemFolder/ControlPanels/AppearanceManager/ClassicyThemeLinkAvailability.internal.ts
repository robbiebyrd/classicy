import { useEffect, useSyncExternalStore } from "react";

// Whether this page opens theme links: true while a mounted ClassicyDesktop
// has `themeLinks` on. The Themes tab offers Copy Theme Link only then, since
// a link to a page that ignores it would open nothing. A count, not a flag,
// so a page with several desktops (a Storybook docs page) stays on until the
// last one that opens links unmounts.

let openers = 0;
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
};

const snapshot = () => openers > 0;

const changeOpeners = (delta: number) => {
	openers += delta;
	for (const listener of listeners) listener();
};

/** Counts the calling component as a desktop that opens theme links while it
 * is mounted with `enabled` on. */
export const useClassicyThemeLinkOpener = (enabled: boolean): void => {
	useEffect(() => {
		if (!enabled) return;
		changeOpeners(1);
		return () => changeOpeners(-1);
	}, [enabled]);
};

/** True while a mounted desktop opens theme links (`themeLinks`). */
export const useClassicyThemeLinksEnabled = (): boolean =>
	useSyncExternalStore(subscribe, snapshot, () => false);
