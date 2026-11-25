import { useSyncExternalStore } from "react";

// The desktop icon whose name is being edited in place (Explorer's Rename
// and New on the desktop, under `layout.finder.commands` "windows"; F2 under
// `layout.fileBrowser.keys` "windows"). One at a time, as Explorer's one edit
// control; session state, outside the store, so nothing is persisted and
// the desktop's state bytes never change for it.

let renamingIconId: string | null = null;
const listeners = new Set<() => void>();

const notify = () => {
	for (const listener of listeners) listener();
};

/**
 * Begins editing the name of the desktop icon `iconId` (its `appId`). The
 * icon need not be drawn yet: a Desktop Folder item New just made starts
 * its edit once its icon mounts. Starting another ends this one's (the
 * field's blur commits it).
 */
export const startClassicyDesktopIconRename = (iconId: string): void => {
	if (renamingIconId === iconId) return;
	renamingIconId = iconId;
	notify();
};

/** Ends the edit of `iconId`'s name (any icon's when omitted). */
export const stopClassicyDesktopIconRename = (iconId?: string): void => {
	if (renamingIconId === null) return;
	if (iconId !== undefined && renamingIconId !== iconId) return;
	renamingIconId = null;
	notify();
};

/** The icon whose name is being edited, if any. */
export const classicyDesktopIconRenaming = (): string | null => renamingIconId;

const subscribe = (listener: () => void) => {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
};

/** Whether `iconId`'s name is being edited; re-renders when that changes. */
export const useClassicyDesktopIconRenaming = (iconId: string): boolean =>
	useSyncExternalStore(
		subscribe,
		() => renamingIconId === iconId,
		() => false,
	);

/** Ends any edit: test isolation. */
export const resetClassicyDesktopIconRenameForTests = (): void => {
	renamingIconId = null;
	notify();
};
