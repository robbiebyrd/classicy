import { useSyncExternalStore } from "react";
import { classicyLog } from "@/SystemFolder/SystemResources/Log/ClassicyLog";

/**
 * The taskbar's band (plan 0020-w98 §2, "The band"): the height, in px, that
 * a mounted `ClassicyTaskbar` takes along the bottom of its desktop. What is
 * left above it is the work area, which Windows keeps windows, icons and menus
 * to: a maximized window is "as large as the display, excluding the space used
 * by the taskbar" (WIG Ch.6 "Maximizing Windows", p.84); Wine's popup menus
 * keep to the monitor's work area (`MENU_ShowPopup`, `rcWork`), and so does
 * the pointer while a window moves or sizes (`WINPOS_SysCommandSizeMove`);
 * the desktop's icon view fills it, and an icon starts a new column unless
 * it fits whole (comctl32 `LISTVIEW_NextIconPosLeft`).
 *
 * The band is the taskbar's own measured height, not a theme knob: the core
 * reads no taskbar metric, so no package's desktop root carries a new
 * variable. Store-free, so the reducers (the desktop icon grid's Clean Up)
 * read it as they read `window.innerHeight`.
 *
 * It is 0 while no taskbar is mounted. Every reader defaults to 0 or reads 0
 * then, so a desktop without a taskbar (every package that declares no
 * `layout.taskbar`) computes exactly the numbers it computed before.
 */

// The publisher `setClassicyTaskbarBand` files a band under when its caller
// names none.
const DEFAULT_OWNER: unique symbol = Symbol("taskbar");

// Each publisher's band. A page may hold more than one desktop, each with its
// own taskbar (a Storybook docs page renders several stories), so one going
// must not clear another's: the band is the tallest one published.
const bands = new Map<unknown, number>();
const listeners = new Set<() => void>();
let band = 0;

const publish = () => {
	let next = 0;
	for (const value of bands.values()) next = Math.max(next, value);
	if (next === band) return;
	band = next;
	for (const listener of listeners) listener();
};

/**
 * Publish the band a taskbar takes: its root's height, in px. The taskbar
 * publishes it in a layout effect and on each resize, and publishes 0 when it
 * unmounts, which withdraws it. `owner` keeps one taskbar's band apart from
 * another's (each may pass its own object or symbol; omitted, every caller
 * shares one); the band in effect is the tallest any owner has published.
 * A value that is not a finite number of zero or more is logged and taken as
 * 0. Listeners hear only a change of the band in effect.
 */
export function setClassicyTaskbarBand(
	px: number,
	owner: object | symbol = DEFAULT_OWNER,
): void {
	let value = px;
	if (!(typeof value === "number" && Number.isFinite(value) && value >= 0)) {
		classicyLog(
			"warn",
			"Taskbar",
			"A taskbar band must be a finite number of pixels, zero or more; taken as 0",
			{ px },
		);
		value = 0;
	}
	if (value === 0) bands.delete(owner);
	else bands.set(owner, value);
	publish();
}

/**
 * The band in effect, in px: the tallest one a mounted taskbar has published,
 * 0 while none is mounted.
 */
export const getClassicyTaskbarBand = (): number => band;

/** Called after each change of the band in effect. */
export function subscribeClassicyTaskbarBand(listener: () => void): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

// No taskbar is mounted on the server, so its band is 0 there.
const serverBand = () => 0;

/** The band in effect; re-renders when it changes. */
export const useClassicyTaskbarBand = (): number =>
	useSyncExternalStore(
		subscribeClassicyTaskbarBand,
		getClassicyTaskbarBand,
		serverBand,
	);

/** Tests only: withdraw every published band, so a test starts with none. */
export function resetClassicyTaskbarBandForTests(): void {
	bands.clear();
	publish();
}
