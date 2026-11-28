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
 * A taskbar docks to any edge (plan 0020-w98 E4), so the band lies along
 * that edge: its height at the top or bottom, its width at a side
 * (`getClassicyTaskbarInsets`). It is 0 while no taskbar is mounted. Every reader defaults to 0 or reads 0
 * then, so a desktop without a taskbar (every package that declares no
 * `layout.taskbar`) computes exactly the numbers it computed before.
 */

/** The screen edge a taskbar is docked to (plan 0020-w98 E4). */
export type ClassicyTaskbarEdge = "top" | "right" | "bottom" | "left";

/** Every `ClassicyTaskbarEdge`. */
export const CLASSICY_TASKBAR_EDGES: readonly ClassicyTaskbarEdge[] = [
	"top",
	"right",
	"bottom",
	"left",
];

/** Whether `value` is a `ClassicyTaskbarEdge`. */
export const isClassicyTaskbarEdge = (
	value: unknown,
): value is ClassicyTaskbarEdge =>
	typeof value === "string" &&
	(CLASSICY_TASKBAR_EDGES as readonly string[]).includes(value);

/**
 * The bands taken along each edge of the desktop, in px (plan 0020-w98 E4):
 * a docked taskbar's thickness on its edge, 0 on the others. The work area
 * is what they leave.
 */
export type ClassicyTaskbarInsets = Readonly<
	Record<ClassicyTaskbarEdge, number>
>;

/** No band on any edge: the insets while no taskbar is mounted. */
export const CLASSICY_TASKBAR_NO_INSETS: ClassicyTaskbarInsets = Object.freeze({
	top: 0,
	right: 0,
	bottom: 0,
	left: 0,
});

/**
 * A band as the geometry functions take it: a number is the band along the
 * bottom (what every caller passed before a taskbar could dock elsewhere),
 * else the insets on every edge. Absent or invalid values are 0.
 */
export type ClassicyTaskbarBandArg = number | ClassicyTaskbarInsets;

const finitePx = (value: unknown): number =>
	typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;

/** `band` as insets on every edge (a number is the bottom's). */
export const classicyTaskbarInsetsOf = (
	band: ClassicyTaskbarBandArg | undefined,
): ClassicyTaskbarInsets => {
	if (band === undefined) return CLASSICY_TASKBAR_NO_INSETS;
	if (typeof band === "number")
		return finitePx(band) === 0
			? CLASSICY_TASKBAR_NO_INSETS
			: { ...CLASSICY_TASKBAR_NO_INSETS, bottom: finitePx(band) };
	return {
		top: finitePx(band.top),
		right: finitePx(band.right),
		bottom: finitePx(band.bottom),
		left: finitePx(band.left),
	};
};

/** Whether `band` takes anything on any edge. */
export const classicyTaskbarHasBand = (
	band: ClassicyTaskbarBandArg | undefined,
): boolean => {
	const insets = classicyTaskbarInsetsOf(band);
	return (
		insets.top > 0 || insets.right > 0 || insets.bottom > 0 || insets.left > 0
	);
};

// The publisher `setClassicyTaskbarBand` files a band under when its caller
// names none.
const DEFAULT_OWNER: unique symbol = Symbol("taskbar");

// Each publisher's band and the edge it lies on. A page may hold more than
// one desktop, each with its own taskbar (a Storybook docs page renders
// several stories), so one going must not clear another's: the band on each
// edge is the thickest one published there.
const bands = new Map<unknown, { px: number; edge: ClassicyTaskbarEdge }>();
const listeners = new Set<() => void>();
let insets: ClassicyTaskbarInsets = CLASSICY_TASKBAR_NO_INSETS;

const publish = () => {
	const next = { top: 0, right: 0, bottom: 0, left: 0 };
	for (const { px, edge } of bands.values())
		next[edge] = Math.max(next[edge], px);
	if (CLASSICY_TASKBAR_EDGES.every((edge) => next[edge] === insets[edge]))
		return;
	insets = classicyTaskbarHasBand(next)
		? Object.freeze(next)
		: CLASSICY_TASKBAR_NO_INSETS;
	for (const listener of listeners) listener();
};

/**
 * Publish the band a taskbar takes: its root's thickness, in px, along
 * `edge` (the bottom unless given: its height there, its width at a side).
 * The taskbar publishes it in a layout effect and on each resize or move,
 * and publishes 0 when it unmounts (or hides itself, auto-hide), which
 * withdraws it. `owner` keeps one taskbar's band apart from another's (each
 * may pass its own object or symbol; omitted, every caller shares one); the
 * band in effect on each edge is the thickest any owner has published there.
 * A value that is not a finite number of zero or more is logged and taken as
 * 0, as is an edge that is not one. Listeners hear only a change of the
 * bands in effect.
 */
export function setClassicyTaskbarBand(
	px: number,
	owner: object | symbol = DEFAULT_OWNER,
	edge: ClassicyTaskbarEdge = "bottom",
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
	if (!isClassicyTaskbarEdge(edge)) {
		classicyLog(
			"warn",
			"Taskbar",
			"A taskbar band must lie on top, right, bottom or left; taken as 0",
			{ edge },
		);
		value = 0;
	}
	if (value === 0) bands.delete(owner);
	else bands.set(owner, { px: value, edge });
	publish();
}

/**
 * The band in effect along the desktop's bottom, in px: the tallest one a
 * mounted taskbar docked there has published, 0 while none is (no taskbar,
 * or one docked to another edge; `getClassicyTaskbarInsets` has every
 * edge's).
 */
export const getClassicyTaskbarBand = (): number => insets.bottom;

/**
 * The bands in effect on every edge (`CLASSICY_TASKBAR_NO_INSETS` while no
 * taskbar is mounted). The object is replaced, never changed, when a band
 * changes, so it serves as a snapshot.
 */
export const getClassicyTaskbarInsets = (): ClassicyTaskbarInsets => insets;

/** Called after each change of the bands in effect. */
export function subscribeClassicyTaskbarBand(listener: () => void): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

// No taskbar is mounted on the server, so its band is 0 there.
const serverBand = () => 0;
const serverInsets = () => CLASSICY_TASKBAR_NO_INSETS;

/** The band in effect along the bottom; re-renders when it changes. */
export const useClassicyTaskbarBand = (): number =>
	useSyncExternalStore(
		subscribeClassicyTaskbarBand,
		getClassicyTaskbarBand,
		serverBand,
	);

/** The bands in effect on every edge; re-renders when one changes. */
export const useClassicyTaskbarInsets = (): ClassicyTaskbarInsets =>
	useSyncExternalStore(
		subscribeClassicyTaskbarBand,
		getClassicyTaskbarInsets,
		serverInsets,
	);

/** Tests only: withdraw every published band, so a test starts with none. */
export function resetClassicyTaskbarBandForTests(): void {
	bands.clear();
	publish();
}
