import { useMemo, useSyncExternalStore } from "react";
import { shortcutMatchesEvent } from "@/SystemFolder/SystemResources/Menu/ClassicyKeyboardShortcut";

// The file clipboard: what Explorer's Cut and Copy of files hold until a
// Paste (WIG Ch.5 "Command Method", pp.59-61; "Command Method Transfers",
// p.66; Finder's and the desktop's, under `layout.finder.commands`
// "windows"). It lives in the page, apart from the system clipboard, which
// holds no Classicy file: one per page, keyed by the file system's storage
// key, so a paste into another tree takes nothing.

/** Which command filled the file clipboard. */
export type ClassicyFileClipboardOperation = "cut" | "copy";

/** A file clipboard command a key asks for (`classicyFileClipboardKey`). */
export type ClassicyFileClipboardCommand = "cut" | "copy" | "paste";

/**
 * The clipboard command a key press asks for in a folder view or on the
 * desktop (WIG Ch.5 "Shortcut Keys for Transfer Operations", pp.67-68):
 * Ctrl+X Cut, Ctrl+C Copy, Ctrl+V Paste, matched as the active package
 * matches a Command equivalent (`shortcutMatchesEvent`: Command or Control
 * on Mac OS, Control alone under `layout.keyboard.command` "ctrl"), with
 * no Shift or Alt; undefined for any other key.
 */
export const classicyFileClipboardKey = (
	e: KeyboardEvent,
): ClassicyFileClipboardCommand | undefined =>
	shortcutMatchesEvent("⌘X", e)
		? "cut"
		: shortcutMatchesEvent("⌘C", e)
			? "copy"
			: shortcutMatchesEvent("⌘V", e)
				? "paste"
				: undefined;

/** What the file clipboard holds (`getClassicyFileClipboard`). */
export type ClassicyFileClipboardContents = {
	/** Cut (a paste moves the items, then empties it) or Copy (a paste copies them, and repeats). */
	readonly op: ClassicyFileClipboardOperation;
	/** The items' paths, as they were cut or copied, in the selection's order. */
	readonly paths: readonly string[];
	/** The storage key of the file system the paths are in (`ClassicyFileSystem.storageKey`). */
	readonly storageKey: string;
};

/** The default storage key, Finder's (`ClassicyFileSystem`'s default). */
const DEFAULT_STORAGE_KEY = "classicyStorage";

let contents: ClassicyFileClipboardContents | null = null;
const listeners = new Set<() => void>();

const notify = () => {
	for (const listener of [...listeners]) listener();
};

/** Whether a key or clipboard event's target is a text field (its own Cut, Copy and Paste). */
const isEditableTarget = (target: EventTarget | null): boolean =>
	target instanceof Element &&
	target.closest("input, textarea, select, [contenteditable='true']") !== null;

/**
 * Escape cancels a pending Cut (Explorer: the items drawn as they were,
 * nothing to paste), pressed in a folder view, on a desktop icon or on the
 * desktop itself, not in a text field and not taken by anything before it
 * (an open menu, a dialog, a gesture, each of which takes its Escape first).
 */
const onEscape = (e: KeyboardEvent) => {
	if (
		contents?.op !== "cut" ||
		e.key !== "Escape" ||
		e.defaultPrevented ||
		e.altKey ||
		e.ctrlKey ||
		e.metaKey ||
		e.shiftKey ||
		isEditableTarget(e.target)
	)
		return;
	const target = e.target;
	const inFileView =
		target === document.body ||
		target === document.documentElement ||
		(target instanceof Element &&
			(target.id === "classicyDesktop" ||
				target.closest(".classicyFileBrowserFill, .classicyDesktopIcon") !==
					null));
	if (inFileView) clearClassicyFileClipboard();
};

/**
 * One clipboard, as Windows keeps it: text cut or copied in a field (the
 * browser's own `cut` and `copy` events) replaces what the file clipboard
 * held.
 */
const onNativeTransfer = () => clearClassicyFileClipboard();

let listening = false;
const syncDocumentListeners = () => {
	if (typeof document === "undefined") return;
	const want = contents !== null;
	if (want === listening) return;
	listening = want;
	if (want) {
		document.addEventListener("keydown", onEscape);
		document.addEventListener("cut", onNativeTransfer, true);
		document.addEventListener("copy", onNativeTransfer, true);
	} else {
		document.removeEventListener("keydown", onEscape);
		document.removeEventListener("cut", onNativeTransfer, true);
		document.removeEventListener("copy", onNativeTransfer, true);
	}
};

/**
 * Fill the file clipboard: Cut or Copy of the items at `paths` (in the file
 * system stored under `storageKey`, Finder's by default), replacing what it
 * held. No paths empties it. Subscribers hear of it, so cut items' look
 * (`classicyFileCut`) and the Paste commands follow.
 */
export function setClassicyFileClipboard(
	op: ClassicyFileClipboardOperation,
	paths: readonly string[],
	storageKey: string = DEFAULT_STORAGE_KEY,
): void {
	const kept = [...new Set(paths)];
	contents =
		kept.length > 0
			? Object.freeze({ op, paths: Object.freeze(kept), storageKey })
			: null;
	syncDocumentListeners();
	notify();
}

/**
 * Empty the file clipboard (a Cut pasted, Escape after a Cut, text cut or
 * copied in a field). Nothing happens, and no one is told, when it is
 * already empty.
 */
export function clearClassicyFileClipboard(): void {
	if (contents === null) return;
	contents = null;
	syncDocumentListeners();
	notify();
}

/** What the file clipboard holds, or null when it is empty. */
export function getClassicyFileClipboard(): ClassicyFileClipboardContents | null {
	return contents;
}

/**
 * Be told whenever the file clipboard changes. Returns an unsubscribe
 * function. Shaped for `useSyncExternalStore`, with
 * `getClassicyFileClipboard` as the snapshot.
 */
export function subscribeClassicyFileClipboard(
	listener: () => void,
): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

/** The file clipboard's contents, live: a component re-renders when it changes. */
export function useClassicyFileClipboard(): ClassicyFileClipboardContents | null {
	return useSyncExternalStore(
		subscribeClassicyFileClipboard,
		getClassicyFileClipboard,
		getClassicyFileClipboard,
	);
}

/** Whether the item at `path` (of the tree under `storageKey`) is cut, waiting for a Paste. */
export function isClassicyFileCut(
	path: string,
	storageKey: string = DEFAULT_STORAGE_KEY,
): boolean {
	return (
		contents?.op === "cut" &&
		contents.storageKey === storageKey &&
		contents.paths.includes(path)
	);
}

const NONE: ReadonlySet<string> = new Set();

/**
 * The cut items' paths in the tree under `storageKey`, live (empty unless the
 * clipboard holds a Cut there): a folder view draws each as cut.
 */
export function useClassicyFileCutPaths(
	storageKey: string = DEFAULT_STORAGE_KEY,
): ReadonlySet<string> {
	const clipboard = useClassicyFileClipboard();
	return useMemo(
		() =>
			clipboard?.op === "cut" && clipboard.storageKey === storageKey
				? new Set(clipboard.paths)
				: NONE,
		[clipboard, storageKey],
	);
}

/**
 * Whether the item at `path` is cut, live: a desktop icon draws itself as
 * cut while it is. False without a path.
 */
export function useClassicyFileCut(
	path: string | undefined,
	storageKey: string = DEFAULT_STORAGE_KEY,
): boolean {
	const cut = useClassicyFileCutPaths(storageKey);
	return path !== undefined && cut.has(path);
}
