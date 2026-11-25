import { onClassicyPointerStreamLost } from "@/SystemFolder/SystemResources/File/ClassicyPointerStreamLost.internal";
import type {
	ClassicyWindowRect,
	ClassicyWindowSizingEdges,
} from "@/SystemFolder/SystemResources/Window/ClassicyWindowResize";

/**
 * The keyboard Move and Size modes (plan 0020-w98 §5 "Keyboard Move and
 * Size"): the window registry's `move` and `size` commands, which the
 * Windows shell's window pop-up menu runs. WIG Ch.6 "Moving Windows" and
 * "Sizing Borders" (p.83): "After choosing the Move command, the user can
 * move the window with the keyboard interface by using arrow keys and
 * pressing the ENTER key to end the operation"; "the user can size the
 * window by choosing the Size command, using the arrow keys, and pressing
 * the ENTER key". The loop is Windows' `SC_MOVE`/`SC_SIZE` tracking loop
 * (Wine's `WINPOS_SysCommandSizeMove` and `start_size_move`, ReactOS's
 * `DefWndDoSizeMove` and `DefWndStartSizeMove`): each arrow moves the
 * pointer 8 px, the mouse moves the window with no button held, a button-1
 * release or ENTER ends it where it is, and ESC puts the window back.
 *
 * This module holds the pure parts (the step, the edge selection, the
 * sizing border's hit test) and the input capture; `ClassicyWindow` owns
 * the geometry. Internal: not exported from the package.
 */

/**
 * Pixels one arrow key moves the window (Move) or the edges being sized
 * (Size): the 8 px both Wine and ReactOS step the tracking point by
 * (`case VK_UP: pt.y -= 8`).
 */
export const CLASSICY_WINDOW_KEYBOARD_STEP = 8;

/** Which keyboard mode a window is in. */
export type ClassicyWindowKeyboardMode = "move" | "size";

/** An arrow key, by its `KeyboardEvent.key`. */
export type ClassicyWindowArrowKey =
	| "ArrowUp"
	| "ArrowDown"
	| "ArrowLeft"
	| "ArrowRight";

const ARROW_EDGES: Readonly<
	Record<ClassicyWindowArrowKey, "top" | "bottom" | "left" | "right">
> = Object.freeze({
	ArrowUp: "top",
	ArrowDown: "bottom",
	ArrowLeft: "left",
	ArrowRight: "right",
});

/** Whether `key` (a `KeyboardEvent.key`) is one of the four arrow keys. */
export const isClassicyWindowArrowKey = (
	key: string,
): key is ClassicyWindowArrowKey => Object.hasOwn(ARROW_EDGES, key);

/**
 * The travel one arrow key adds, `[dx, dy]`: `CLASSICY_WINDOW_KEYBOARD_STEP`
 * up, down, left or right.
 */
export const classicyWindowKeyboardStep = (
	key: ClassicyWindowArrowKey,
): [number, number] => {
	const step = CLASSICY_WINDOW_KEYBOARD_STEP;
	if (key === "ArrowUp") return [0, -step];
	if (key === "ArrowDown") return [0, step];
	if (key === "ArrowLeft") return [-step, 0];
	return [step, 0];
};

/**
 * Size mode's edge selection, for an arrow pressed while `edges` are chosen
 * (`null` before the first):
 * - With none chosen, the arrow picks its edge: Up the top, Down the
 *   bottom, Left the left, Right the right, as Wine's and ReactOS's
 *   `start_size_move` pick `HTTOP`, `HTBOTTOM`, `HTLEFT` and `HTRIGHT`. That
 *   press moves nothing.
 * - With one edge chosen, an arrow across it adds its own edge, making the
 *   corner of the two (top, then Left: `top-left`), as Windows as shipped
 *   does (the pointer jumps to the corner); Wine and ReactOS keep the one
 *   edge there, which the owner's rule (the OS as shipped wins) sets aside.
 *   That press moves nothing either.
 * - Otherwise (an arrow along the chosen edge's axis, or a corner already
 *   chosen) the edges stay, and the arrow moves them.
 */
export const classicyKeyboardSizingEdges = (
	edges: ClassicyWindowSizingEdges | null,
	key: ClassicyWindowArrowKey,
): ClassicyWindowSizingEdges => {
	const picked = ARROW_EDGES[key];
	if (edges === null) return picked;
	if (edges.includes("-")) return edges;
	const chosenVertical = edges === "top" || edges === "bottom";
	const keyVertical = picked === "top" || picked === "bottom";
	if (chosenVertical === keyVertical) return edges;
	const [row, column] = chosenVertical ? [edges, picked] : [picked, edges];
	return `${row}-${column}` as ClassicyWindowSizingEdges;
};

/**
 * Size mode's mouse selection: the sizing-border edges under `pointer`, as
 * Windows picks them before an arrow has (Wine's and ReactOS's
 * `start_size_move` clamp the pointer to the window's rect and hit-test it,
 * keeping only `HTLEFT` to `HTBOTTOMRIGHT`). `rect` is the window's
 * bounding rect, `frame` the sizing border's thickness (`SM_CXFRAME`,
 * `--window-frame-inset`) and `reach` how far a corner extends past the
 * inside of the frame along each of its edges (`SM_CXSIZE`, the caption's
 * height, `--window-title-bar-height`; Wine's `NC_HandleNCHitTest`). `null`
 * while the clamped pointer is inside the frame (the caption or the client
 * area), so a mouse resting over the window picks nothing until it crosses
 * the border.
 */
export const classicyWindowSizingEdgesAt = (
	rect: ClassicyWindowRect,
	pointer: [number, number],
	frame: number,
	reach: number,
): ClassicyWindowSizingEdges | null => {
	const x = Math.min(Math.max(pointer[0], rect.left), rect.right - 1);
	const y = Math.min(Math.max(pointer[1], rect.top), rect.bottom - 1);
	const left = rect.left + frame;
	const top = rect.top + frame;
	const right = rect.right - frame;
	const bottom = rect.bottom - frame;
	if (x >= left && x < right && y >= top && y < bottom) return null;
	const column = x < left + reach ? "left" : x >= right - reach ? "right" : "";
	const row = y < top + reach ? "top" : y >= bottom - reach ? "bottom" : "";
	if (y < top)
		return (column ? `top-${column}` : "top") as ClassicyWindowSizingEdges;
	if (y >= bottom)
		return (
			column ? `bottom-${column}` : "bottom"
		) as ClassicyWindowSizingEdges;
	if (x < left)
		return (row ? `${row}-left` : "left") as ClassicyWindowSizingEdges;
	return (row ? `${row}-right` : "right") as ClassicyWindowSizingEdges;
};

/** How a keyboard mode ended. */
export type ClassicyWindowKeyboardModeEnd = {
	/**
	 * `true` (ENTER, a button-1 release, a lost pointer stream): the window
	 * stays where the mode left it. `false` (ESC): it goes back to where the
	 * mode started, as Windows restores `origRect`.
	 */
	commit: boolean;
	/** Ended because the pointer stream was lost, not by a key or a release. */
	lost: boolean;
};

/** What a keyboard mode reports while it lasts. */
export type ClassicyWindowKeyboardModeHandlers = {
	/** An arrow key went down (key repeat included). */
	onArrow: (key: ClassicyWindowArrowKey) => void;
	/** The pointer moved, to `[clientX, clientY]`, with or without a button held. */
	onPointerMove: (pointer: [number, number]) => void;
	/** The mode ended; its listeners are already gone. Called once. */
	onEnd: (end: ClassicyWindowKeyboardModeEnd) => void;
};

// The one keyboard mode in effect on the page, if any: Windows' tracking
// loop owns the input while it runs, so a second window cannot start one.
let activeMode: { stop: () => void } | null = null;

/** Whether a keyboard Move or Size mode is in effect on the page. */
export const isClassicyWindowKeyboardModeActive = (): boolean =>
	activeMode !== null;

// Key and button events the mode takes for itself: nothing under it sees
// them, and their default actions (typing, focus, text selection, the
// browser's menu) are prevented, as Windows' loop eats every WM_KEYDOWN and
// holds the mouse's capture. A key's release still reaches the page, as the
// loop dispatches WM_KEYUP, so a press begun before the mode can end.
const HELD_EVENTS = [
	"keydown",
	"keypress",
	"mousedown",
	"mouseup",
	"click",
	"dblclick",
	"auxclick",
	"contextmenu",
] as const;

// Pointer events the mode keeps from everything under it without preventing
// their defaults: a touch's compatibility mouse events still follow, so a
// tap ends the mode as a click does.
const STOPPED_EVENTS = ["pointerdown", "pointerup", "pointermove"] as const;

/**
 * Starts a keyboard mode: until it ends, capture-phase listeners on the
 * document take the key presses and the mouse buttons, so menu shortcuts,
 * dialog keys and the controls under the pointer never see them (the
 * screen saver's earlier listeners still hear the activity; key releases
 * pass):
 * - an arrow key reports `onArrow`; ENTER ends it committed, ESC ends it
 *   canceled; every other key does nothing;
 * - each pointer move reports `onPointerMove` (and reaches nothing else);
 * - a button-1 release ends it committed (Windows ends on `WM_LBUTTONUP`),
 *   and the click that follows it is swallowed too; other presses and
 *   releases do nothing;
 * - a lost pointer stream (`onClassicyPointerStreamLost`) ends it committed,
 *   `lost: true`, as a lost drag ends where it is.
 *
 * Returns the function that ends it without reporting `onEnd` (the owner
 * ending it itself, say on unmount), or `null`, starting nothing, when a
 * mode is already in effect or there is no document.
 */
export function startClassicyWindowKeyboardMode(
	handlers: ClassicyWindowKeyboardModeHandlers,
): (() => void) | null {
	if (typeof document === "undefined" || activeMode) return null;

	let ended = false;
	let stopWatchingPointerStream: () => void = () => {};

	const stop = () => {
		if (ended) return;
		ended = true;
		for (const type of HELD_EVENTS)
			document.removeEventListener(type, hold, true);
		for (const type of STOPPED_EVENTS)
			document.removeEventListener(type, stopEvent, true);
		document.removeEventListener("mousemove", onMouseMove, true);
		stopWatchingPointerStream();
		if (activeMode === mode) activeMode = null;
	};

	const end = (result: ClassicyWindowKeyboardModeEnd) => {
		if (ended) return;
		stop();
		handlers.onEnd(result);
	};

	// The click a committing release produces comes right after it, in the
	// same task: swallowed, so the release does not also press what lies
	// under the pointer; the swallower goes with the task if none comes.
	const swallowNextClick = () => {
		const swallow = (e: Event) => {
			e.preventDefault();
			e.stopImmediatePropagation();
			done();
		};
		const timer = setTimeout(() => done(), 0);
		const done = () => {
			clearTimeout(timer);
			document.removeEventListener("click", swallow, true);
		};
		document.addEventListener("click", swallow, true);
	};

	function hold(e: Event) {
		e.preventDefault();
		e.stopImmediatePropagation();
		if (e.type === "keydown") {
			const { key } = e as KeyboardEvent;
			if (key === "Enter") end({ commit: true, lost: false });
			else if (key === "Escape") end({ commit: false, lost: false });
			else if (isClassicyWindowArrowKey(key)) handlers.onArrow(key);
			return;
		}
		if (e.type === "mouseup" && (e as MouseEvent).button === 0) {
			swallowNextClick();
			end({ commit: true, lost: false });
		}
	}

	function stopEvent(e: Event) {
		e.stopImmediatePropagation();
	}

	function onMouseMove(e: MouseEvent) {
		e.stopImmediatePropagation();
		handlers.onPointerMove([e.clientX, e.clientY]);
	}

	for (const type of HELD_EVENTS) document.addEventListener(type, hold, true);
	for (const type of STOPPED_EVENTS)
		document.addEventListener(type, stopEvent, true);
	document.addEventListener("mousemove", onMouseMove, true);
	stopWatchingPointerStream = onClassicyPointerStreamLost(() =>
		end({ commit: true, lost: true }),
	);
	const mode = { stop };
	activeMode = mode;
	return stop;
}
