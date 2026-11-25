import { useSyncExternalStore } from "react";

/**
 * The documents the user opened most recently this session, the list the
 * Windows shell's Start ▸ Documents shows (plan 0020-w98 E2; Windows 98's
 * Recent folder, which the shell fills as a document is opened from the
 * Explorer, `SHAddToRecentDocs`). Finder's open records a document here
 * (`noteClassicyRecentDocument`, from its `ClassicyAppFinderOpenFile` case,
 * whoever dispatched it: a Finder window, a desktop icon, Start ▸ Documents,
 * Run), and a move renames it (`renameClassicyRecentDocuments`, from
 * `ClassicyAppFinderPathsMoved`), as Windows' shortcuts follow a moved
 * target.
 *
 * Store-free and never persisted: the list lives as long as the page, so no
 * saved state changes under any package, and only the Windows shell's Start
 * menu reads it. Internal: not exported from the package.
 */

/** The most documents the list keeps, as Windows 98's Documents menu did. */
export const CLASSICY_RECENT_DOCUMENTS_LIMIT = 15;

// Most recent first; a document opened again moves to the front.
let recent: readonly string[] = [];
const listeners = new Set<() => void>();

const publish = (next: readonly string[]): void => {
	recent = next;
	for (const listener of listeners) listener();
};

/**
 * Records `path` as opened now: first in the list, once, and the list cut to
 * `CLASSICY_RECENT_DOCUMENTS_LIMIT`. An empty path is ignored.
 */
export const noteClassicyRecentDocument = (path: string): void => {
	if (typeof path !== "string" || path === "") return;
	if (recent[0] === path) return;
	publish(
		[path, ...recent.filter((p) => p !== path)].slice(
			0,
			CLASSICY_RECENT_DOCUMENTS_LIMIT,
		),
	);
};

/**
 * Applies a set of moves (`{ from, to }`, as `ClassicyAppFinderPathsMoved`
 * carries them) to the list: a moved document, or one inside a moved folder
 * (`separator` between names), keeps its place under its new path.
 */
export const renameClassicyRecentDocuments = (
	moves: readonly { from: string; to: string }[],
	separator = ":",
): void => {
	if (moves.length === 0 || recent.length === 0) return;
	const rename = (path: string): string => {
		for (const { from, to } of moves) {
			if (path === from) return to;
			if (path.startsWith(`${from}${separator}`))
				return to + path.slice(from.length);
		}
		return path;
	};
	const next = recent.map(rename);
	if (next.every((path, i) => path === recent[i])) return;
	// Two documents can land on one path only if one replaced the other;
	// keep the more recent.
	publish(next.filter((path, i) => next.indexOf(path) === i));
};

/** The list now, most recent first. */
export const getClassicyRecentDocuments = (): readonly string[] => recent;

/** Calls `listener` on every change to the list; returns its unsubscribe. */
export const subscribeClassicyRecentDocuments = (
	listener: () => void,
): (() => void) => {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
};

/** The list, re-rendering on every change. */
export const useClassicyRecentDocuments = (): readonly string[] =>
	useSyncExternalStore(
		subscribeClassicyRecentDocuments,
		getClassicyRecentDocuments,
		getClassicyRecentDocuments,
	);

/** Empties the list (tests; a fresh session starts empty). */
export const resetClassicyRecentDocuments = (): void => {
	if (recent.length > 0) publish([]);
};
