/**
 * What a file drag's drop does, and the feedback it gives on the way, for
 * `startClassicyFileDrag` (WIG Ch.5 "Direct Manipulation Method",
 * pp.62-64; "Direct Manipulation Transfers", p.67; "Shortcut Keys for
 * Transfer Operations", pp.67-68): the effect the keys ask for under the
 * package's `layout.transfer.copyModifier`, the effects a destination
 * takes, the `data-classicy-drop` attribute on the desktop root, and the
 * browser `contextmenu` a button-2 drag's release is followed by.
 *
 * @internal
 */

import type { ClassicyAppearanceLayout } from "@/Appearance/ClassicyAppearancePackage";
import type {
	ClassicyFileDropDestination,
	ClassicyFileDropEffect,
} from "@/SystemFolder/SystemResources/File/ClassicyFileDrag";
import { CLASSICY_TRASH_PATH } from "@/SystemFolder/SystemResources/File/ClassicyTrash";
import { isClassicyMacPlatform } from "@/SystemFolder/SystemResources/Menu/ClassicyKeyboardShortcut";

/**
 * The attribute a file drag sets on the `.classicyDesktop` root while its
 * outline is shown, Windows' drop effect under the pointer: `"none"` while
 * nothing there takes the drop (WIG Ch.4 Table 4.1, the unavailable
 * pointer; Ch.5 Figure 5.17), else `"move"`, `"copy"` or `"link"`, what
 * the drop there would do (Figure 5.16); absent before the drag starts
 * and once it ends. The core sets it under every package; only a
 * package's stylesheet reads it (Windows 98's pointers), and its presence
 * marks the drag on the desktop root, inside the package's scope.
 */
export const CLASSICY_FILE_DROP_FEEDBACK_ATTRIBUTE = "data-classicy-drop";

/** The values `CLASSICY_FILE_DROP_FEEDBACK_ATTRIBUTE` takes. */
export type ClassicyFileDropFeedback = "none" | ClassicyFileDropEffect;

/** Every effect, in the order Windows 98 SE's transfer menu lists them. */
export const CLASSICY_FILE_DROP_EFFECTS: readonly ClassicyFileDropEffect[] = [
	"move",
	"copy",
	"link",
];

const MOVE_ONLY: readonly ClassicyFileDropEffect[] = ["move"];

/**
 * The effects `destination` takes, whatever is dropped: a move alone into
 * the Trash (Windows 98 SE's Recycle Bin, whose transfer menu is
 * shell32.dll's menu 201, Move Here and Cancel), every effect anywhere
 * else.
 */
export const classicyFileDropDestinationEffects = (
	destination: ClassicyFileDropDestination,
): readonly ClassicyFileDropEffect[] =>
	destination.kind === "folder" && destination.path === CLASSICY_TRASH_PATH
		? MOVE_ONLY
		: CLASSICY_FILE_DROP_EFFECTS;

/** The keys a file drag reads for its effect. */
export type ClassicyFileDragKeys = { ctrlKey: boolean; shiftKey: boolean };

/**
 * The effect the keys ask for under `layout.transfer.copyModifier`
 * "ctrl": Control and Shift make shortcuts, Control alone copies, and
 * anything else moves (WIG Ch.5 "Shortcut Keys for Transfer Operations",
 * pp.67-68: "CTRL+drag ... a copy operation"; Control with Shift as the
 * shell's drop targets take it, ReactOS `CFSDropTarget::DragEnter`). A
 * press that began with Control on a Mac host is its secondary click
 * (`pressCtrlOnMac`), so the drag it starts moves throughout. Without the
 * key every drag moves.
 */
export const classicyFileDragRequestedEffect = (
	layout: ClassicyAppearanceLayout,
	keys: ClassicyFileDragKeys,
	pressCtrlOnMac: boolean,
): ClassicyFileDropEffect => {
	if (layout.transfer?.copyModifier !== "ctrl" || pressCtrlOnMac) return "move";
	if (!keys.ctrlKey) return "move";
	return keys.shiftKey ? "link" : "copy";
};

/**
 * The effect a drop makes where `allowed` are the effects taken: the one
 * asked for when it is taken ("provided the destination can support the
 * copy operation", WIG p.67), else a move when that is, else the first
 * taken.
 */
export const classicyFileDropEffectFor = (
	requested: ClassicyFileDropEffect,
	allowed: readonly ClassicyFileDropEffect[],
): ClassicyFileDropEffect => {
	if (allowed.includes(requested)) return requested;
	if (allowed.includes("move")) return "move";
	return allowed[0] ?? "move";
};

/** Whether a press began with Control on a Mac host (its secondary click). */
export const classicyFileDragPressCtrlOnMac = (ctrlKey?: boolean): boolean =>
	ctrlKey === true && isClassicyMacPlatform();

/**
 * The element a drag's feedback attribute goes on: the `.classicyDesktop`
 * around `source`, else the page's desktop (`#classicyDesktop`, else the
 * first `.classicyDesktop`), else none.
 */
export const classicyFileDragFeedbackRoot = (
	source?: Element | null,
): Element | null => {
	if (typeof document === "undefined") return null;
	return (
		source?.closest(".classicyDesktop") ??
		document.getElementById("classicyDesktop") ??
		document.querySelector(".classicyDesktop")
	);
};

/**
 * Sets the feedback attribute on `root` to `value`, or removes it for
 * `null`; nothing without a root.
 */
export const setClassicyFileDropFeedback = (
	root: Element | null,
	value: ClassicyFileDropFeedback | null,
): void => {
	if (!root) return;
	if (value === null) {
		root.removeAttribute(CLASSICY_FILE_DROP_FEEDBACK_ATTRIBUTE);
		return;
	}
	if (root.getAttribute(CLASSICY_FILE_DROP_FEEDBACK_ATTRIBUTE) !== value)
		root.setAttribute(CLASSICY_FILE_DROP_FEEDBACK_ATTRIBUTE, value);
};

/**
 * How long a button-2 drag's release waits for the browser's own
 * `contextmenu` (a Windows host raises it after the release, others at
 * the press), in ms: past it, or at the next press or key, a
 * `contextmenu` is no longer the release's.
 */
export const CLASSICY_FILE_DRAG_CONTEXT_MENU_WAIT_MS = 500;

/**
 * Swallows the `contextmenu` that follows a button-2 drag's release on a
 * Windows host, so the item's own menu does not replace the transfer menu
 * (or open over a drop that needed none): one capture-phase listener,
 * removed by that event, the next press or key press, or
 * `CLASSICY_FILE_DRAG_CONTEXT_MENU_WAIT_MS`, whichever comes first.
 */
export const swallowClassicyFileDragContextMenu = (): void => {
	if (typeof document === "undefined") return;
	let timer: ReturnType<typeof setTimeout> | null = null;
	const stop = () => {
		document.removeEventListener("contextmenu", onContextMenu, true);
		document.removeEventListener("mousedown", stop, true);
		document.removeEventListener("keydown", stop, true);
		if (timer !== null) clearTimeout(timer);
		timer = null;
	};
	function onContextMenu(e: Event) {
		e.preventDefault();
		e.stopPropagation();
		stop();
	}
	document.addEventListener("contextmenu", onContextMenu, true);
	document.addEventListener("mousedown", stop, true);
	document.addEventListener("keydown", stop, true);
	timer = setTimeout(stop, CLASSICY_FILE_DRAG_CONTEXT_MENU_WAIT_MS);
};
