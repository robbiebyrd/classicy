import { useEffect, useRef } from "react";
import type { ClassicyAppearanceLayout } from "@/Appearance/ClassicyAppearancePackage";
import {
	getClassicyAppearanceLayout,
	useClassicyAppearanceLayout,
} from "@/Appearance/useClassicyAppearanceLayout";

/**
 * Escape takes back a direct manipulation in progress (WIG Ch.4 "Shortcut
 * Keys", p.27: "Use the ESC key to stop a function in process or to cancel
 * a direct manipulation operation"; Ch.1 "Forgiveness", pp.2-3), under a package
 * whose layout declares `input.escapeCancels` (Windows 98). A file drag, an
 * on-release thumb drag, a pop-up and a combo list cancel on Escape under
 * every package already; these are for the gestures that otherwise end only
 * at a release or a lost pointer stream (a split view's divider, a slider's
 * thumb, a non-file icon, a table's column edge; the window's move and
 * resize and the desktop's rectangle, wired by the shell).
 *
 * What "take back" means is the gesture's own call, made in its `onCancel`:
 * it puts back the state the press found and ends the gesture, removing
 * what the press attached, as its `onClassicyPointerStreamLost` path ends
 * it (that one keeps the state on screen; this one restores it).
 */

/** Whether the layout lets Escape take a gesture back. */
export const classicyEscapeCancels = (
	layout: Pick<ClassicyAppearanceLayout, "input">,
): boolean => layout.input?.escapeCancels === true;

const isEscape = (e: KeyboardEvent) => e.key === "Escape" || e.key === "Esc";

/**
 * Calls `onCancel` at the first Escape keydown, heard on the document in
 * the capture phase (so a focused control's own Escape handling never sees
 * it), preventing the key and stopping it there, when `layout` (by default
 * the active package's, read now) declares `input.escapeCancels`; else does
 * nothing. Once: the listener goes after it fires. Returns the function
 * that stops watching, which a gesture calls however it ends (released,
 * lost, or canceled), so no listener outlives it. For a gesture held in a
 * closure (document listeners attached at the press); one held in React
 * state uses `useClassicyEscapeCancel`.
 */
export function onClassicyEscapeCancel(
	onCancel: () => void,
	layout: Pick<
		ClassicyAppearanceLayout,
		"input"
	> = getClassicyAppearanceLayout(),
): () => void {
	if (!classicyEscapeCancels(layout) || typeof document === "undefined") {
		return () => {};
	}
	const onKeyDown = (e: KeyboardEvent) => {
		if (!isEscape(e)) return;
		e.preventDefault();
		e.stopPropagation();
		stop();
		onCancel();
	};
	const stop = () => document.removeEventListener("keydown", onKeyDown, true);
	document.addEventListener("keydown", onKeyDown, true);
	return stop;
}

/**
 * `onClassicyEscapeCancel` for a gesture held in React state: while
 * `active` is true and the active package's layout declares
 * `input.escapeCancels`, a capture-phase document `keydown` for Escape
 * calls `onCancel`, prevents the key and stops it there; once per stretch
 * of `active`. `onCancel` is read when the key comes, so it may close over
 * the render's state without re-subscribing; it restores what the press
 * found and ends the gesture (see the module note). Absent the key, nothing
 * listens.
 */
export function useClassicyEscapeCancel(
	active: boolean,
	onCancel: () => void,
): void {
	const onCancelRef = useRef(onCancel);
	onCancelRef.current = onCancel;
	const enabled = classicyEscapeCancels(useClassicyAppearanceLayout());
	useEffect(() => {
		if (!active || !enabled) return;
		return onClassicyEscapeCancel(() => onCancelRef.current(), {
			input: { escapeCancels: true },
		});
	}, [active, enabled]);
}
