import {
	type MouseEvent,
	type RefObject,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { useClassicyPointerStreamLost } from "@/SystemFolder/SystemResources/File/ClassicyPointerStreamLost.internal";
import type { ClassicyTaskbarEdge } from "@/SystemFolder/SystemResources/Taskbar/ClassicyTaskbarBand.internal";

/**
 * Docking and Auto hide (plan 0020-w98 E4): the taskbar's moves to another
 * edge of the desktop, and its sliding off its edge while Taskbar
 * Properties' "Auto hide" is on. Internal.
 *
 * Windows 98's taskbar is an application desktop toolbar: "The user can
 * move the taskbar to any edge of the screen by dragging it", and its
 * properties "allow the user to ... set it to automatically hide" (WIG
 * Ch.3 "The Taskbar", p.15). The behavior is the shipped shell's, as
 * ReactOS's explorer (`traywnd.cpp`, `CTrayWindow`) rebuilds it.
 */

/**
 * How far, in px, the pointer travels from a press on the taskbar's empty
 * area before the press becomes a move of the taskbar: Windows' drag
 * rectangle (`SM_CXDRAG`/`SM_CYDRAG`, 4).
 */
export const CLASSICY_TASKBAR_DRAG_THRESHOLD_PX = 4;

/**
 * What an auto-hidden taskbar leaves on the screen, in px: the strip along
 * its edge that the pointer reaches it by (Windows 98's two-pixel strip;
 * ReactOS keeps the same two pixels, `AUTOHIDE_HIDDEN`).
 */
export const CLASSICY_TASKBAR_AUTOHIDE_STRIP_PX = 2;

/**
 * How long, in ms, an auto-hidden taskbar waits after the pointer reaches its
 * strip before it slides in (ReactOS `AUTOHIDE_DELAY_SHOW`, 50).
 */
export const CLASSICY_TASKBAR_AUTOHIDE_SHOW_DELAY_MS = 50;

/**
 * How long, in ms, a shown auto-hide taskbar waits after the pointer leaves
 * it, with nothing of it open or focused, before it slides away (ReactOS
 * `AUTOHIDE_DELAY_HIDE`, 2000).
 */
export const CLASSICY_TASKBAR_AUTOHIDE_HIDE_DELAY_MS = 2000;

/**
 * The slide's speed, in ms per px: ReactOS moves the bar every
 * `AUTOHIDE_INTERVAL_ANIMATING` (10 ms) by `AUTOHIDE_SPEED_HIDE` (1 px)
 * going and `AUTOHIDE_SPEED_SHOW` (10 px) coming, so a 28 px bar slides
 * away in 260 ms and back in 30.
 */
export const CLASSICY_TASKBAR_AUTOHIDE_HIDE_MS_PER_PX = 10;
export const CLASSICY_TASKBAR_AUTOHIDE_SHOW_PX_PER_STEP = 10;
const AUTOHIDE_STEP_MS = 10;

/**
 * The edge a taskbar dragged to `point` docks to, in the desktop's `rect`:
 * the one whose quarter of the desktop holds the point, the quarters cut by
 * the desktop's two diagonals (ReactOS `CTrayWindow::GetDraggingRectFromPt`
 * picks the edge the pointer is nearest relative to the screen's size). A
 * point on a diagonal goes to the bottom or top before a side. Pure.
 */
export function classicyTaskbarEdgeAt(
	point: readonly [number, number],
	rect: { left: number; top: number; width: number; height: number },
): ClassicyTaskbarEdge {
	if (!(rect.width > 0 && rect.height > 0)) return "bottom";
	const u = (point[0] - rect.left) / rect.width;
	const v = (point[1] - rect.top) / rect.height;
	const distances: [ClassicyTaskbarEdge, number][] = [
		["bottom", 1 - v],
		["top", v],
		["left", u],
		["right", 1 - u],
	];
	let best = distances[0];
	for (const candidate of distances)
		if (candidate[1] < best[1]) best = candidate;
	return best[0];
}

/** Whether a taskbar on `edge` stands at a side, its buttons stacked. */
export const isClassicyTaskbarVertical = (edge: ClassicyTaskbarEdge): boolean =>
	edge === "left" || edge === "right";

/**
 * The CSS `translate` that slides a taskbar `thickness` px thick off `edge`,
 * leaving `CLASSICY_TASKBAR_AUTOHIDE_STRIP_PX` of it on the screen. Pure.
 */
export function classicyTaskbarHiddenTranslate(
	edge: ClassicyTaskbarEdge,
	thickness: number,
): string {
	const away = Math.max(0, thickness - CLASSICY_TASKBAR_AUTOHIDE_STRIP_PX);
	switch (edge) {
		case "top":
			return `0 ${-away}px`;
		case "left":
			return `${-away}px 0`;
		case "right":
			return `${away}px 0`;
		default:
			return `0 ${away}px`;
	}
}

/**
 * How long, in ms, the slide off (`hiding`) or back of a taskbar `thickness`
 * px thick takes, at ReactOS's speeds. Pure.
 */
export function classicyTaskbarAutoHideDuration(
	thickness: number,
	hiding: boolean,
): number {
	const away = Math.max(0, thickness - CLASSICY_TASKBAR_AUTOHIDE_STRIP_PX);
	return hiding
		? away * CLASSICY_TASKBAR_AUTOHIDE_HIDE_MS_PER_PX
		: Math.ceil(away / CLASSICY_TASKBAR_AUTOHIDE_SHOW_PX_PER_STEP) *
				AUTOHIDE_STEP_MS;
}

const desktopRectOf = (root: HTMLElement | null) =>
	(
		root?.closest(".classicyDesktop") ??
		root?.ownerDocument?.documentElement ??
		null
	)?.getBoundingClientRect();

/**
 * Moving the taskbar (`ClassicyTaskbar`): a button-1 press on its empty area
 * (`isBackground` says which targets are) and a drag past
 * `CLASSICY_TASKBAR_DRAG_THRESHOLD_PX` carries it to the edge the pointer is
 * on (`classicyTaskbarEdgeAt`), drawn there live (`edge` is the edge to draw
 * it on while the drag lasts); the release, or a lost pointer stream, docks
 * it there (`onDock`, called only for another edge than `stored`), as
 * Windows 98's taskbar snaps from edge to edge under the pointer and stays
 * where it is let go.
 */
export function useClassicyTaskbarDock(
	rootRef: RefObject<HTMLElement | null>,
	stored: ClassicyTaskbarEdge,
	onDock: (edge: ClassicyTaskbarEdge) => void,
	isBackground: (target: EventTarget | null, root: HTMLElement) => boolean,
): {
	edge: ClassicyTaskbarEdge;
	dragging: boolean;
	onMouseDown: (e: MouseEvent<HTMLElement>) => void;
} {
	const [press, setPress] = useState<{
		start: [number, number];
		moved: boolean;
		edge: ClassicyTaskbarEdge;
	} | null>(null);
	const pressRef = useRef(press);
	pressRef.current = press;
	const onDockRef = useRef(onDock);
	onDockRef.current = onDock;
	const storedRef = useRef(stored);
	storedRef.current = stored;

	const end = useCallback(() => {
		const current = pressRef.current;
		setPress(null);
		if (current?.moved && current.edge !== storedRef.current)
			onDockRef.current(current.edge);
	}, []);

	const held = press !== null;
	useEffect(() => {
		if (!held) return;
		const onMove = (e: globalThis.MouseEvent) => {
			const current = pressRef.current;
			if (!current) return;
			const moved =
				current.moved ||
				Math.abs(e.clientX - current.start[0]) >=
					CLASSICY_TASKBAR_DRAG_THRESHOLD_PX ||
				Math.abs(e.clientY - current.start[1]) >=
					CLASSICY_TASKBAR_DRAG_THRESHOLD_PX;
			if (!moved) return;
			const rect = desktopRectOf(rootRef.current);
			const edge = rect
				? classicyTaskbarEdgeAt([e.clientX, e.clientY], rect)
				: current.edge;
			if (moved !== current.moved || edge !== current.edge)
				setPress({ ...current, moved, edge });
		};
		document.addEventListener("mousemove", onMove);
		document.addEventListener("mouseup", end);
		return () => {
			document.removeEventListener("mousemove", onMove);
			document.removeEventListener("mouseup", end);
		};
	}, [held, end, rootRef]);
	useClassicyPointerStreamLost(held, end);

	const onMouseDown = (e: MouseEvent<HTMLElement>) => {
		const root = rootRef.current;
		if (e.button !== 0 || !root || !isBackground(e.target, root)) return;
		// The press leaves the focus where it is, and selects no text.
		e.preventDefault();
		setPress({
			start: [e.clientX, e.clientY],
			moved: false,
			edge: storedRef.current,
		});
	};

	return {
		edge: press?.moved ? press.edge : stored,
		dragging: press?.moved === true,
		onMouseDown,
	};
}

// Something of the taskbar's is open or focused, so an auto-hide taskbar
// stays: the focus inside it, its Start menu or a tray pop-up (both bevel
// pop-ups, portaled out of it), or a contextual menu it opened.
const taskbarIsBusy = (root: HTMLElement): boolean => {
	const doc = root.ownerDocument;
	if (root.contains(doc.activeElement)) return true;
	return (
		doc.querySelector(
			".classicyStartMenu, .classicyTaskbarTrayPopup, .classicyContextMenuWrapper",
		) !== null
	);
};

/**
 * Auto hide (Taskbar Properties' "Auto hide", plan 0020-w98 E4): while
 * `enabled`, the taskbar is `hidden` (slid off its edge to a
 * `CLASSICY_TASKBAR_AUTOHIDE_STRIP_PX` strip) until the pointer reaches it,
 * when it slides in after `CLASSICY_TASKBAR_AUTOHIDE_SHOW_DELAY_MS`; it
 * slides away again `CLASSICY_TASKBAR_AUTOHIDE_HIDE_DELAY_MS` after the
 * pointer leaves it, unless something of it is open or focused then (its
 * Start menu, a tray pop-up, its menu, the keyboard focus), in which case it
 * waits as long again. `show` brings it in at once (the Start menu opening
 * from the keyboard, CTRL+ESC). Off, it is never hidden.
 */
export function useClassicyTaskbarAutoHide(
	rootRef: RefObject<HTMLElement | null>,
	enabled: boolean,
	keepShown: boolean,
): {
	hidden: boolean;
	onMouseEnter: () => void;
	onMouseLeave: () => void;
	onFocus: () => void;
} {
	const [hidden, setHidden] = useState(enabled);
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const over = useRef(false);
	const clear = useCallback(() => {
		if (timer.current !== null) clearTimeout(timer.current);
		timer.current = null;
	}, []);
	const scheduleHide = useCallback(() => {
		clear();
		timer.current = setTimeout(function hide() {
			timer.current = null;
			const root = rootRef.current;
			if (over.current) return;
			if (root && taskbarIsBusy(root)) {
				timer.current = setTimeout(
					hide,
					CLASSICY_TASKBAR_AUTOHIDE_HIDE_DELAY_MS,
				);
				return;
			}
			setHidden(true);
		}, CLASSICY_TASKBAR_AUTOHIDE_HIDE_DELAY_MS);
	}, [clear, rootRef]);

	// Turned on, it slides away (once the pointer is off it); turned off, it
	// comes back for good.
	useEffect(() => {
		if (enabled) {
			if (!over.current) scheduleHide();
		} else {
			clear();
			setHidden(false);
		}
		return clear;
	}, [enabled, scheduleHide, clear]);

	// Something it holds open (the Start menu) shows it at once and keeps it.
	useEffect(() => {
		if (!enabled) return;
		if (keepShown) {
			clear();
			setHidden(false);
		} else if (!over.current) scheduleHide();
	}, [enabled, keepShown, clear, scheduleHide]);

	const onMouseEnter = () => {
		over.current = true;
		if (!enabled) return;
		clear();
		timer.current = setTimeout(() => {
			timer.current = null;
			setHidden(false);
		}, CLASSICY_TASKBAR_AUTOHIDE_SHOW_DELAY_MS);
	};
	const onMouseLeave = () => {
		over.current = false;
		if (enabled) scheduleHide();
	};
	const onFocus = () => {
		if (!enabled) return;
		clear();
		setHidden(false);
		if (!over.current) scheduleHide();
	};

	return { hidden: enabled && hidden, onMouseEnter, onMouseLeave, onFocus };
}
